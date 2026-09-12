import { TenantContextMiddleware } from '../backend/dist/common/middleware/tenant-context.middleware.js';
import { TenantContextStore } from '../backend/dist/lib/auth/tenant-context.store.js';

async function runTests() {
  console.log('Testing TenantContextMiddleware Resolution Priority and Domain Verification...\n');

  const store = new TenantContextStore();
  const mockPrisma = {
    domainMapping: {
      findFirst: async ({ where }) => {
        if (where.domain === 'verified-partner.com') {
          return {
            id: 'map-123',
            tenantId: 'partner-tenant-456',
            domain: 'verified-partner.com',
            status: 'VERIFIED',
            isVerified: true,
            tenant: {
              id: 'partner-tenant-456',
              name: 'Acme Agency',
              slug: 'acme',
              tier: 'PRIMARY_RESELLER',
              path: 'root.acme',
              depth: 1,
              status: 'ACTIVE',
              primaryColor: '#6366f1',
              logoUrl: 'https://acme.com/logo.png',
              customDomain: 'verified-partner.com',
            },
          };
        }
        return null;
      },
    },
    tenant: {
      findUnique: async () => null,
      findFirst: async () => null,
    },
  };

  const mockConfig = {
    get: (k) => 'test-secret',
  };

  const mockJwt = {
    verify: () => null,
  };

  const middleware = new TenantContextMiddleware(mockPrisma, mockConfig, mockJwt, store);

  const testCases = [
    {
      name: 'www.appnix.co.in -> MARKETING',
      host: 'www.appnix.co.in:443',
      expectedContext: 'MARKETING',
      expectedTenantId: 'marketing',
    },
    {
      name: 'appnix.co.in -> MARKETING',
      host: 'appnix.co.in',
      expectedContext: 'MARKETING',
      expectedTenantId: 'marketing',
    },
    {
      name: 'app.appnix.co.in -> DIRECT_CLIENT',
      host: 'app.appnix.co.in',
      expectedContext: 'DIRECT_CLIENT',
      expectedTenantId: 'APPNIX_DIRECT',
      expectedIsDirect: true,
    },
    {
      name: 'admin.appnix.co.in -> DIRECT_ADMIN',
      host: 'admin.appnix.co.in',
      expectedContext: 'DIRECT_ADMIN',
      expectedTenantId: 'root',
      expectedIsDirect: true,
    },
    {
      name: 'superadmin.appnix.co.in -> SUPER_ADMIN',
      host: 'superadmin.appnix.co.in',
      expectedContext: 'SUPER_ADMIN',
      expectedTenantId: 'root',
    },
    {
      name: 'partners.appnix.co.in -> PARTNER_ADMIN',
      host: 'partners.appnix.co.in',
      expectedContext: 'PARTNER_ADMIN',
      expectedTenantId: 'partners',
    },
    {
      name: 'verified-partner.com -> CUSTOM_DOMAIN with isWhiteLabel: true & partnerId',
      host: 'verified-partner.com',
      expectedContext: 'CUSTOM_DOMAIN',
      expectedTenantId: 'partner-tenant-456',
      expectedPartnerId: 'partner-tenant-456',
      expectedIsWhiteLabel: true,
    },
  ];

  let passed = 0;

  for (const tc of testCases) {
    const req = {
      headers: { host: tc.host },
      query: {},
      cookies: {},
      path: '/api/v1/some-endpoint',
    };
    const res = {
      setHeader: () => {},
    };

    let nextCalled = false;
    let nextError = null;
    let capturedCtx = null;

    await middleware.use(req, res, (err) => {
      nextCalled = true;
      nextError = err;
      capturedCtx = store.get();
    });

    const ctx = capturedCtx || store.get();
    const isCtxMatch = ctx?.domainContext === tc.expectedContext;
    const isTenantMatch = ctx?.tenantId === tc.expectedTenantId;
    const isDirectMatch = tc.expectedIsDirect ? ctx?.isDirect === true : true;
    const isWhiteLabelMatch = tc.expectedIsWhiteLabel ? ctx?.isWhiteLabel === true : true;
    const isPartnerMatch = tc.expectedPartnerId ? ctx?.partnerId === tc.expectedPartnerId : true;

    if (isCtxMatch && isTenantMatch && isDirectMatch && isWhiteLabelMatch && isPartnerMatch && !nextError) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`, { ctx, nextError });
    }
  }

  // Test unverified custom domain -> throws NotFoundException
  console.log('\nTesting unverified custom domain rejection...');
  const reqUnverified = {
    headers: { host: 'unverified-agency.com' },
    query: {},
    cookies: {},
    path: '/api/v1/workspace',
  };
  const res = { setHeader: () => {} };
  let caughtError = null;

  await middleware.use(reqUnverified, res, (err) => {
    caughtError = err;
  });

  if (caughtError && (caughtError.status === 404 || caughtError.message?.includes('not verified'))) {
    console.log('[PASS] unverified-agency.com throws NotFoundException: "Custom domain not verified or inactive."');
    passed++;
  } else {
    console.error('[FAIL] unverified-agency.com did not throw NotFoundException:', caughtError);
  }

  console.log(`\nResults: ${passed}/${testCases.length + 1} tests passed successfully.`);
  if (passed === testCases.length + 1) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
