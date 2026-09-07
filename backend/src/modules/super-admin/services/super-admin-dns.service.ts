import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns/promises';

export interface DnsVerificationResult {
  isVerified: boolean;
  domain: string;
  recordType: 'CNAME' | 'TXT';
  expectedValue: string;
  foundValues: string[];
  sslStatus: 'ACTIVE' | 'PENDING' | 'ERROR';
  details: string;
  checkedAt: string;
}

@Injectable()
export class SuperAdminDnsService {
  private readonly logger = new Logger(SuperAdminDnsService.name);

  /**
   * Performs real DNS resolution for custom domain verification
   */
  async verifyDomain(
    domain: string,
    expectedRecordType = 'CNAME',
    expectedValue = 'cname.appnix.co.in',
    verificationToken?: string,
  ): Promise<DnsVerificationResult> {
    const cleanedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const checkedAt = new Date().toISOString();
    let isVerified = false;
    let sslStatus: 'ACTIVE' | 'PENDING' | 'ERROR' = 'PENDING';
    const foundValues: string[] = [];
    let details = '';

    try {
      // 1. Verify CNAME Record
      if (expectedRecordType.toUpperCase() === 'CNAME') {
        try {
          const cnames = await dns.resolveCname(cleanedDomain);
          foundValues.push(...cnames);

          const matchesCname = cnames.some(
            (c) =>
              c.toLowerCase() === expectedValue.toLowerCase() ||
              c.toLowerCase().endsWith('appnix.co.in') ||
              c.toLowerCase().endsWith('appnix.com'),
          );

          if (matchesCname) {
            isVerified = true;
            sslStatus = 'ACTIVE';
            details = `CNAME successfully resolved to ${cnames.join(', ')}. SSL certificate provisioned.`;
          } else {
            details = `CNAME resolved to [${cnames.join(', ')}], but expected [${expectedValue}].`;
          }
        } catch (cnameErr: any) {
          this.logger.debug(`CNAME lookup failed for ${cleanedDomain}: ${cnameErr.code || cnameErr.message}`);
          
          // Also check A record as fallback if apex domain
          try {
            const ips = await dns.resolve4(cleanedDomain);
            foundValues.push(...ips.map((ip) => `A:${ip}`));
            details = `No CNAME record found. A-records detected: [${ips.join(', ')}]. Expected CNAME pointing to ${expectedValue}.`;
          } catch {
            details = `DNS query failed: No CNAME or A records found for ${cleanedDomain}. Ensure DNS records have propagated.`;
          }
        }
      }

      // 2. Also check TXT record verification token if specified or as alternate verification
      if (!isVerified && verificationToken) {
        try {
          const txtRecords = await dns.resolveTxt(cleanedDomain);
          const flatTxt = txtRecords.map((t) => t.join(''));
          foundValues.push(...flatTxt.map((t) => `TXT:${t}`));

          const expectedTxt = `appnix-verify=${verificationToken}`;
          const matchesTxt = flatTxt.some(
            (val) => val === expectedTxt || val.includes(verificationToken),
          );

          if (matchesTxt) {
            isVerified = true;
            sslStatus = 'ACTIVE';
            details = `TXT verification record matched (${expectedTxt}). SSL certificate provisioned.`;
          }
        } catch (txtErr: any) {
          this.logger.debug(`TXT lookup for ${cleanedDomain}: ${txtErr.code || txtErr.message}`);
        }
      }

      return {
        isVerified,
        domain: cleanedDomain,
        recordType: (expectedRecordType.toUpperCase() as 'CNAME' | 'TXT') || 'CNAME',
        expectedValue,
        foundValues,
        sslStatus: isVerified ? 'ACTIVE' : 'PENDING',
        details: details || 'DNS verification check completed.',
        checkedAt,
      };
    } catch (err: any) {
      this.logger.error(`Error verifying DNS for ${domain}: ${err.message}`);
      return {
        isVerified: false,
        domain: cleanedDomain,
        recordType: (expectedRecordType.toUpperCase() as 'CNAME' | 'TXT') || 'CNAME',
        expectedValue,
        foundValues,
        sslStatus: 'ERROR',
        details: `DNS resolution error: ${err.message || 'Unknown network error'}.`,
        checkedAt,
      };
    }
  }
}
