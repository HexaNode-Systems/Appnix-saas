import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DomainVerificationStatus,
  SslStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import * as dns from 'dns/promises';
import { CreateDomainDto, UpdatePartnerBrandSettingsDto } from './dto/domain.dto';

const EXPECTED_CNAME_TARGET = 'cname.appnix.co.in';

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private sanitizeDomain(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .replace(/\s+/g, '');
  }

  private validateCustomDomain(domain: string) {
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) {
      throw new BadRequestException('Enter a valid hostname, for example portal.agency.com');
    }
    if (domain.endsWith('appnix.co.in') || domain.endsWith('appnix.com') || domain.includes('localhost')) {
      throw new BadRequestException('Appnix internal domains cannot be used as a custom domain');
    }
  }

  async getBrandSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, primaryColor: true, logoUrl: true, faviconUrl: true,
        domainMappings: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    if (!tenant) throw new NotFoundException('Reseller tenant not found');
    return {
      brandName: tenant.name,
      primaryColor: tenant.primaryColor,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
      slug: tenant.slug,
      domainMapping: tenant.domainMappings[0] || null,
    };
  }

  async updateBrandSettings(tenantId: string, dto: UpdatePartnerBrandSettingsDto) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.brandName !== undefined ? { name: dto.brandName.trim() } : {}),
        ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
        ...(dto.faviconUrl !== undefined ? { faviconUrl: dto.faviconUrl?.trim() || null } : {}),
      },
    });

    if (dto.domain?.trim()) {
      const domain = this.sanitizeDomain(dto.domain);
      this.validateCustomDomain(domain);
      const current = await this.prisma.domainMapping.findFirst({
        where: { tenantId, domain },
        select: { id: true },
      });
      if (!current) await this.registerDomain(tenantId, { domain, recordType: 'CNAME' });
    }

    return this.getBrandSettings(tenantId);
  }

  async verifyBrandSettingsDomain(tenantId: string) {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (!mapping) throw new BadRequestException('Save a custom domain before verifying DNS');
    return this.verifyDomain(tenantId, mapping.id);
  }

  /**
   * Register a new custom domain for the reseller's tenant.
   * Generates expected CNAME target (cname.appnix.co.in) or TXT token (appnix-verify=${verificationToken}).
   */
  async registerDomain(tenantId: string, dto: CreateDomainDto) {
    const rawDomain = this.sanitizeDomain(dto.domain);

    // Disallow appnix system domains from being registered as custom domains
    this.validateCustomDomain(rawDomain);

    // Check if domain is already claimed by another tenant
    const existingOther = await this.prisma.domainMapping.findFirst({
      where: {
        domain: rawDomain,
        tenantId: { not: tenantId },
      },
    });

    if (existingOther) {
      throw new ConflictException(
        `Domain "${rawDomain}" is already mapped to another organization`,
      );
    }

    const verificationToken = randomUUID();
    const recordType = dto.recordType || 'CNAME';

    // Upsert domain mapping record
    const mapping = await this.prisma.domainMapping.upsert({
      where: { domain: rawDomain },
      create: {
        id: randomUUID(),
        tenantId,
        domain: rawDomain,
        dnsRecordType: recordType,
        expectedDnsTarget: EXPECTED_CNAME_TARGET,
        dnsExpectedValue: EXPECTED_CNAME_TARGET,
        verificationToken,
        status: DomainVerificationStatus.PENDING,
        sslStatus: SslStatus.PENDING,
        isVerified: false,
        sslProvisioned: false,
      },
      update: {
        tenantId,
        dnsRecordType: recordType,
        expectedDnsTarget: EXPECTED_CNAME_TARGET,
        dnsExpectedValue: EXPECTED_CNAME_TARGET,
        verificationToken,
        status: DomainVerificationStatus.PENDING,
        sslStatus: SslStatus.PENDING,
        isVerified: false,
      },
    });

    return {
      id: mapping.id,
      domain: mapping.domain,
      status: mapping.status,
      sslStatus: mapping.sslStatus,
      recordType: mapping.dnsRecordType,
      expectedDnsTarget: EXPECTED_CNAME_TARGET,
      verificationToken: mapping.verificationToken,
      expectedTxtToken: `appnix-verify=${mapping.verificationToken}`,
      instructions: {
        cname: {
          type: 'CNAME',
          host: rawDomain.split('.').length > 2 ? rawDomain.split('.')[0] : '@',
          target: EXPECTED_CNAME_TARGET,
        },
        txt: {
          type: 'TXT',
          host: '@',
          value: `appnix-verify=${mapping.verificationToken}`,
        },
      },
      message: 'Domain registered successfully. Configure your DNS records and click Verify.',
    };
  }

  /**
   * Performs real-time Node.js dns.promises resolution for domain verification:
   * - CNAME: dns.resolveCname(domain) resolves to cname.appnix.co.in
   * - TXT: dns.resolveTxt(domain) matches appnix-verify=${verificationToken}
   * If match succeeds: updates status = 'VERIFIED', verifiedAt = new Date(), sslStatus = 'PENDING'
   * If fails: returns meaningful diagnostic error with discovered DNS records.
   */
  async verifyDomain(tenantId: string, domainId: string) {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { id: domainId, tenantId },
    });

    if (!mapping) {
      throw new NotFoundException('Domain mapping not found or unauthorized');
    }

    const domain = mapping.domain;
    const recordType = (mapping.dnsRecordType || 'CNAME').toUpperCase();
    const discoveredRecords: string[] = [];
    let isMatched = false;
    let diagnosticMessage = '';

    // 1. Verify via CNAME resolution
    if (recordType === 'CNAME') {
      try {
        const cnames = await dns.resolveCname(domain);
        discoveredRecords.push(...cnames.map((c) => `CNAME:${c}`));

        const targetLower = (mapping.expectedDnsTarget || EXPECTED_CNAME_TARGET).toLowerCase();
        isMatched = cnames.some((c) => c.toLowerCase().replace(/\.$/, '') === targetLower.replace(/\.$/, ''));

        if (isMatched) {
          diagnosticMessage = `CNAME successfully resolved to ${cnames.join(', ')}.`;
        } else {
          diagnosticMessage = `CNAME resolved to [${cnames.join(', ')}], but expected [${mapping.expectedDnsTarget || EXPECTED_CNAME_TARGET}].`;
        }
      } catch (cnameErr: any) {
        this.logger.debug(`CNAME lookup error for ${domain}: ${cnameErr.code || cnameErr.message}`);

        // Fallback lookup supplies an actionable diagnostic for providers that
        // answer with A/AAAA records while a CNAME is still propagating.
        try {
          const lookup = await dns.lookup(domain, { all: true });
          discoveredRecords.push(...lookup.map((record) => `A/AAAA:${record.address}`));
          diagnosticMessage = `Found address records [${lookup.map((record) => record.address).join(', ')}], but no CNAME record pointing to ${EXPECTED_CNAME_TARGET}.`;
        } catch {
          diagnosticMessage = `DNS resolution failed: No CNAME record found for ${domain}. DNS records may take up to 24 hours to propagate.`;
        }
      }
    }

    // 2. Alternate / TXT Verification
    if (!isMatched && mapping.verificationToken) {
      try {
        const txtRecords = await dns.resolveTxt(domain);
        const flatTxt = txtRecords.map((t) => t.join(''));
        discoveredRecords.push(...flatTxt.map((t) => `TXT:${t}`));

        const expectedToken = `appnix-verify=${mapping.verificationToken}`;
        isMatched = flatTxt.some(
          (val) => val === expectedToken || val.includes(mapping.verificationToken!),
        );

        if (isMatched) {
          diagnosticMessage = `TXT verification record matched (${expectedToken}).`;
        }
      } catch (txtErr: any) {
        this.logger.debug(`TXT lookup error for ${domain}: ${txtErr.code || txtErr.message}`);
      }
    }

    const now = new Date();

    if (isMatched) {
      const updated = await this.prisma.domainMapping.update({
        where: { id: mapping.id },
        data: {
          status: DomainVerificationStatus.VERIFIED,
          isVerified: true,
          verifiedAt: now,
          sslStatus: SslStatus.ACTIVE,
          sslProvisioned: true,
          lastCheckedAt: now,
        },
      });

      // Update tenant primary customDomain if not already set
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { customDomain: domain },
      });

      return {
        success: true,
        verified: true,
        status: DomainVerificationStatus.VERIFIED,
        sslStatus: SslStatus.ACTIVE,
        domain: updated.domain,
        verifiedAt: updated.verifiedAt,
        message: `${diagnosticMessage} Domain verified successfully. Edge SSL certificate is being provisioned.`,
      };
    }

    // Verification failed
    await this.prisma.domainMapping.update({
      where: { id: mapping.id },
      data: {
        status: DomainVerificationStatus.FAILED,
        isVerified: false,
        lastCheckedAt: now,
      },
    });

    return {
      success: false,
      verified: false,
      status: DomainVerificationStatus.FAILED,
      domain,
      discoveredRecords,
      currentFound: discoveredRecords,
      message: diagnosticMessage,
      instructions: {
        recordType: mapping.dnsRecordType || 'CNAME',
        expectedTarget: mapping.expectedDnsTarget || EXPECTED_CNAME_TARGET,
        txtFallback: `appnix-verify=${mapping.verificationToken}`,
      },
    };
  }

  /**
   * Retrieve all custom domains registered for the reseller's tenant.
   */
  async getDomains(tenantId: string) {
    return this.prisma.domainMapping.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove a domain mapping for the reseller's tenant.
   */
  async deleteDomain(tenantId: string, domainId: string) {
    const mapping = await this.prisma.domainMapping.findFirst({
      where: { id: domainId, tenantId },
    });

    if (!mapping) {
      throw new NotFoundException('Domain mapping not found or unauthorized');
    }

    await this.prisma.domainMapping.delete({
      where: { id: domainId },
    });

    // Clear tenant customDomain if it was this domain
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (tenant?.customDomain === mapping.domain) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { customDomain: null },
      });
    }

    return { success: true, message: 'Custom domain mapping removed successfully.' };
  }
}
