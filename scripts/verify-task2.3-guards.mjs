import { DirectAdminGuard } from '../backend/dist/common/guards/direct-admin.guard.js';
import { ResellerPortalGuard } from '../backend/dist/common/guards/reseller-portal.guard.js';
import { SuperAdminGuard } from '../backend/dist/common/guards/super-admin.guard.js';
import { TenantWorkspaceGuard } from '../backend/dist/common/guards/tenant-workspace.guard.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('../backend/node_modules/jsonwebtoken');

const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APP_ADMIN: 'APP_ADMIN',
  RESELLER_ADMIN: 'RESELLER_ADMIN',
  CLIENT_USER: 'CLIENT_USER',
  MEMBER: 'MEMBER',
};

async function testGuards() {
  console.log('Testing Task 2.3 Access Control Guards (backend/src/common/guards/)...\n');

  let passed = 0;
  let total = 0;

  function mockContext(req) {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    };
  }

  // =========================================================================
  // 1. DirectAdminGuard Tests
  // =========================================================================
  console.log('--- 1. Testing DirectAdminGuard ---');
  const directAdminGuard = new DirectAdminGuard();

  // Test 1.1: Allows SUPER_ADMIN
  total++;
  try {
    const allowed = directAdminGuard.canActivate(mockContext({ user: { userId: 'u1', role: Role.SUPER_ADMIN } }));
    if (allowed) {
      console.log('[PASS] DirectAdminGuard allows SUPER_ADMIN');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] DirectAdminGuard rejected SUPER_ADMIN:', err.message);
  }

  // Test 1.2: Allows APP_ADMIN
  total++;
  try {
    const allowed = directAdminGuard.canActivate(mockContext({ user: { userId: 'u2', role: Role.APP_ADMIN } }));
    if (allowed) {
      console.log('[PASS] DirectAdminGuard allows APP_ADMIN');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] DirectAdminGuard rejected APP_ADMIN:', err.message);
  }

  // Test 1.3: Rejects RESELLER_ADMIN with 403 "Resellers cannot access internal admin"
  total++;
  try {
    directAdminGuard.canActivate(mockContext({ user: { userId: 'u3', role: Role.RESELLER_ADMIN } }));
    console.error('[FAIL] DirectAdminGuard allowed RESELLER_ADMIN!');
  } catch (err) {
    if (err.status === 403 && err.message === 'Resellers cannot access internal admin') {
      console.log('[PASS] DirectAdminGuard rejects RESELLER_ADMIN with 403: "Resellers cannot access internal admin"');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 1.4: Rejects CLIENT_USER
  total++;
  try {
    directAdminGuard.canActivate(mockContext({ user: { userId: 'u4', role: Role.CLIENT_USER } }));
    console.error('[FAIL] DirectAdminGuard allowed CLIENT_USER!');
  } catch (err) {
    if (err.status === 403) {
      console.log('[PASS] DirectAdminGuard rejects CLIENT_USER with 403');
      passed++;
    }
  }

  // Test 1.5: Rejects unauthenticated with 401
  total++;
  try {
    directAdminGuard.canActivate(mockContext({ user: null }));
    console.error('[FAIL] DirectAdminGuard allowed unauthenticated!');
  } catch (err) {
    if (err.status === 401) {
      console.log('[PASS] DirectAdminGuard rejects unauthenticated with 401');
      passed++;
    }
  }

  // =========================================================================
  // 2. ResellerPortalGuard Tests
  // =========================================================================
  console.log('\n--- 2. Testing ResellerPortalGuard ---');
  const resellerGuard = new ResellerPortalGuard();

  // Test 2.1: Allows RESELLER_ADMIN
  total++;
  try {
    const allowed = resellerGuard.canActivate(mockContext({ user: { userId: 'u-res', role: Role.RESELLER_ADMIN } }));
    if (allowed) {
      console.log('[PASS] ResellerPortalGuard allows RESELLER_ADMIN');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] ResellerPortalGuard rejected RESELLER_ADMIN:', err.message);
  }

  // Test 2.2: Rejects APP_ADMIN
  total++;
  try {
    resellerGuard.canActivate(mockContext({ user: { userId: 'u-app', role: Role.APP_ADMIN } }));
    console.error('[FAIL] ResellerPortalGuard allowed APP_ADMIN!');
  } catch (err) {
    if (err.status === 403 && err.message.toLowerCase().includes('platform staff cannot access')) {
      console.log('[PASS] ResellerPortalGuard rejects APP_ADMIN with 403');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error for APP_ADMIN:', err.message);
    }
  }

  // Test 2.3: Rejects direct client (CLIENT_USER)
  total++;
  try {
    resellerGuard.canActivate(mockContext({ user: { userId: 'u-cli', role: Role.CLIENT_USER } }));
    console.error('[FAIL] ResellerPortalGuard allowed CLIENT_USER!');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Direct clients cannot access')) {
      console.log('[PASS] ResellerPortalGuard rejects direct clients with 403');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error for CLIENT_USER:', err.message);
    }
  }

  // =========================================================================
  // 3. SuperAdminGuard Tests
  // =========================================================================
  console.log('\n--- 3. Testing SuperAdminGuard ---');
  const mockConfig = {
    get: (k) => 'test-jwt-secret-key-32-chars-long!',
  };
  const mockJwt = {
    verify: (token, opts) => jwt.verify(token, opts.secret),
  };

  const superAdminGuard = new SuperAdminGuard(mockJwt, mockConfig);

  // Test 3.1: Allows verified SUPER_ADMIN on request.user
  total++;
  try {
    const allowed = superAdminGuard.canActivate(mockContext({ user: { userId: 'u-sup', role: Role.SUPER_ADMIN } }));
    if (allowed) {
      console.log('[PASS] SuperAdminGuard allows verified SUPER_ADMIN on request.user');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] SuperAdminGuard rejected verified user:', err.message);
  }

  // Test 3.2: Verifies and allows from cookie/bearer token
  total++;
  const superToken = jwt.sign(
    { sub: 'u-super-cookie', email: 'owner@appnix.co.in', role: 'SUPER_ADMIN', tenantId: 'root' },
    'test-jwt-secret-key-32-chars-long!',
    { expiresIn: '15m' },
  );
  try {
    const req = {
      headers: { authorization: `Bearer ${superToken}` },
      cookies: {},
    };
    const allowed = superAdminGuard.canActivate(mockContext(req));
    if (allowed && req.user?.userId === 'u-super-cookie') {
      console.log('[PASS] SuperAdminGuard verifies bearer token and attaches user principal');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] SuperAdminGuard bearer token verification failed:', err.message);
  }

  // Test 3.3: Rejects RESELLER_ADMIN token with 403
  total++;
  const resellerToken = jwt.sign(
    { sub: 'u-res-jwt', email: 'res@partner.com', role: 'RESELLER_ADMIN', tenantId: 'p1' },
    'test-jwt-secret-key-32-chars-long!',
    { expiresIn: '15m' },
  );
  try {
    superAdminGuard.canActivate(mockContext({
      headers: { authorization: `Bearer ${resellerToken}` },
      cookies: {},
    }));
    console.error('[FAIL] SuperAdminGuard allowed RESELLER_ADMIN!');
  } catch (err) {
    if (err.status === 403) {
      console.log('[PASS] SuperAdminGuard rejects RESELLER_ADMIN token with 403');
      passed++;
    }
  }

  // =========================================================================
  // 4. TenantWorkspaceGuard Tests
  // =========================================================================
  console.log('\n--- 4. Testing TenantWorkspaceGuard ---');

  const mockDb = {
    'direct-client-1': { id: 'direct-client-1', path: 'root.t_dc1', parentId: 'root', tier: 'END_CLIENT' },
    'reseller-1': { id: 'reseller-1', path: 'root.t_res1', parentId: 'root', tier: 'PRIMARY_RESELLER' },
    'reseller-client-1': { id: 'reseller-client-1', path: 'root.t_res1.t_rc1', parentId: 'reseller-1', tier: 'END_CLIENT' },
    'foreign-client': { id: 'foreign-client', path: 'root.t_other.t_fc', parentId: 'other-reseller', tier: 'END_CLIENT' },
  };

  const mockDomainMappings = {
    'agency.com': {
      id: 'map-1',
      domain: 'agency.com',
      status: 'VERIFIED',
      isVerified: true,
      tenantId: 'reseller-1',
      tenant: mockDb['reseller-1'],
    },
  };

  const mockPrismaService = {
    tenant: {
      findUnique: async ({ where }) => mockDb[where.id] || null,
    },
    domainMapping: {
      findFirst: async ({ where }) => mockDomainMappings[where.domain] || null,
    },
  };

  const workspaceGuard = new TenantWorkspaceGuard(mockPrismaService);

  // Test 4.1: app.appnix.co.in allows direct client target tenant
  total++;
  try {
    const allowed = await workspaceGuard.canActivate(mockContext({
      headers: { host: 'app.appnix.co.in' },
      user: { userId: 'u-dir', tenantId: 'direct-client-1', role: Role.CLIENT_USER },
      params: { tenantId: 'direct-client-1' },
    }));
    if (allowed) {
      console.log('[PASS] TenantWorkspaceGuard allows direct client target on app.appnix.co.in');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] TenantWorkspaceGuard rejected direct client on app:', err.message);
  }

  // Test 4.2: app.appnix.co.in REJECTS reseller client target tenant
  total++;
  try {
    await workspaceGuard.canActivate(mockContext({
      headers: { host: 'app.appnix.co.in' },
      user: { userId: 'u-res-cli', tenantId: 'reseller-client-1', role: Role.CLIENT_USER },
      params: { tenantId: 'reseller-client-1' },
    }));
    console.error('[FAIL] TenantWorkspaceGuard allowed reseller client on app.appnix.co.in!');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Reseller clients must access via their custom partner domain')) {
      console.log('[PASS] TenantWorkspaceGuard rejects reseller client target on app.appnix.co.in');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 4.3: app.appnix.co.in REJECTS RESELLER_ADMIN user
  total++;
  try {
    await workspaceGuard.canActivate(mockContext({
      headers: { host: 'app.appnix.co.in' },
      user: { userId: 'u-res-adm', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN },
      params: { tenantId: 'direct-client-1' },
    }));
    console.error('[FAIL] TenantWorkspaceGuard allowed RESELLER_ADMIN on app.appnix.co.in!');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Reseller administrators must use the partner administration console')) {
      console.log('[PASS] TenantWorkspaceGuard rejects RESELLER_ADMIN on app.appnix.co.in');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 4.4: Custom Domain (agency.com) allows partner client user
  total++;
  try {
    const allowed = await workspaceGuard.canActivate(mockContext({
      headers: { host: 'agency.com' },
      user: { userId: 'u-rc', tenantId: 'reseller-client-1', orgPath: 'root.t_res1.t_rc1', role: Role.CLIENT_USER },
      params: { tenantId: 'reseller-client-1' },
    }));
    if (allowed) {
      console.log('[PASS] TenantWorkspaceGuard allows child client user on custom domain agency.com');
      passed++;
    }
  } catch (err) {
    console.error('[FAIL] TenantWorkspaceGuard rejected child client on custom domain:', err.message);
  }

  // Test 4.5: Custom Domain (agency.com) REJECTS foreign user
  total++;
  try {
    await workspaceGuard.canActivate(mockContext({
      headers: { host: 'agency.com' },
      user: { userId: 'u-foreign', tenantId: 'foreign-client', orgPath: 'root.t_other.t_fc', role: Role.CLIENT_USER },
      params: { tenantId: 'reseller-client-1' },
    }));
    console.error('[FAIL] TenantWorkspaceGuard allowed foreign client on custom domain!');
  } catch (err) {
    if (err.status === 403 && err.message.includes('User does not belong to the partner organization')) {
      console.log('[PASS] TenantWorkspaceGuard rejects foreign user on custom domain');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 4.6: Unverified custom domain throws 404
  total++;
  try {
    await workspaceGuard.canActivate(mockContext({
      headers: { host: 'unknown-fake.com' },
      user: { userId: 'u1', tenantId: 't1' },
    }));
    console.error('[FAIL] TenantWorkspaceGuard allowed unverified domain!');
  } catch (err) {
    if (err.status === 404 && err.message.includes('Custom domain not verified or inactive')) {
      console.log('[PASS] TenantWorkspaceGuard rejects unverified custom domain with 404');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Task 2.3 Access Control Guards: ${passed}/${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

testGuards().catch((err) => {
  console.error('Fatal error in guard tests:', err);
  process.exit(1);
});
