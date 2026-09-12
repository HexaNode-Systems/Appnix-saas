import { PartnerService } from '../backend/dist/modules/partner/partner.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dns = require('dns/promises');

async function testDomainVerificationEngine() {
  console.log('Testing Task 2.4 Custom Domain Verification Engine...\n');

  let passed = 0;
  let total = 0;

  const createdMappings = {};
  const tenants = {
    'tenant-reseller-1': { id: 'tenant-reseller-1', name: 'Acme Media', customDomain: null },
  };

  const mockPrisma = {
    domainMapping: {
      findFirst: async ({ where }) => {
        if (where.id) return createdMappings[where.id] || null;
        if (where.domain) {
          const m = Object.values(createdMappings).find((item) => item.domain === where.domain);
          if (m && where.tenantId && where.tenantId.not && m.tenantId === where.tenantId.not) {
            return null;
          }
          return m || null;
        }
        return null;
      },
      upsert: async ({ where, create, update }) => {
        const id = create.id;
        const mapping = {
          ...create,
          id,
        };
        createdMappings[id] = mapping;
        return mapping;
      },
      update: async ({ where, data }) => {
        const m = createdMappings[where.id];
        if (!m) throw new Error('Not found');
        Object.assign(m, data);
        return m;
      },
      findMany: async ({ where }) => {
        return Object.values(createdMappings).filter((m) => m.tenantId === where.tenantId);
      },
      delete: async ({ where }) => {
        delete createdMappings[where.id];
        return { id: where.id };
      },
    },
    tenant: {
      update: async ({ where, data }) => {
        const t = tenants[where.id];
        if (t) Object.assign(t, data);
        return t;
      },
      findUnique: async ({ where }) => tenants[where.id] || null,
    },
  };

  const partnerService = new PartnerService(mockPrisma);

  // Test 1: Register custom domain generates expected CNAME target and TXT token
  total++;
  try {
    const res = await partnerService.registerDomain('tenant-reseller-1', {
      domain: 'portal.acmemedia.com',
      recordType: 'CNAME',
    });

    if (
      res.expectedDnsTarget === 'cname.appnix.co.in' &&
      res.verificationToken &&
      res.expectedTxtToken.startsWith('appnix-verify=') &&
      res.status === 'PENDING'
    ) {
      console.log('[PASS] Domain registration generates expected CNAME target and TXT token');
      passed++;
    } else {
      console.error('[FAIL] Registration output mismatch:', res);
    }
  } catch (err) {
    console.error('[FAIL] Registration threw error:', err.message);
  }

  // Test 2: System domain registration is blocked
  total++;
  try {
    await partnerService.registerDomain('tenant-reseller-1', {
      domain: 'hacker.appnix.co.in',
    });
    console.error('[FAIL] Allowed registration of system domain name!');
  } catch (err) {
    if (err.message.includes('native Appnix system domain')) {
      console.log('[PASS] Blocks registration of native Appnix system domains');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 3: DNS verification with failing DNS returns meaningful diagnostics
  total++;
  const domainId = Object.keys(createdMappings)[0];
  try {
    const result = await partnerService.verifyDomain('tenant-reseller-1', domainId);
    if (result.success === false && result.status === 'FAILED' && result.message) {
      console.log('[PASS] DNS verification on unpropagated domain returns actionable failure diagnostics');
      passed++;
    } else {
      console.error('[FAIL] Unexpected verification result:', result);
    }
  } catch (err) {
    console.error('[FAIL] verifyDomain threw error:', err.message);
  }

  // Test 4: Mocking valid DNS resolution transitions status to VERIFIED
  total++;
  const origResolveCname = dns.resolveCname;
  try {
    dns.resolveCname = async (domain) => {
      if (domain === 'portal.acmemedia.com') {
        return ['cname.appnix.co.in'];
      }
      throw new Error('ENOTFOUND');
    };

    const verifySuccess = await partnerService.verifyDomain('tenant-reseller-1', domainId);
    if (
      verifySuccess.success === true &&
      verifySuccess.verified === true &&
      verifySuccess.status === 'VERIFIED' &&
      verifySuccess.sslStatus === 'PENDING'
    ) {
      console.log('[PASS] Valid CNAME match sets status = VERIFIED and sslStatus = PENDING');
      passed++;
    } else {
      console.error('[FAIL] Verification match failed:', verifySuccess);
    }
  } finally {
    dns.resolveCname = origResolveCname;
  }

  console.log(`\nResults: ${passed}/${total} tests passed successfully.`);
  if (passed !== total) {
    process.exit(1);
  }
}

testDomainVerificationEngine().catch((err) => {
  console.error('Fatal error in domain engine tests:', err);
  process.exit(1);
});
