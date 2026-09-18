import { AuthService } from '../backend/dist/modules/auth/auth.service.js';
import { AuthController } from '../backend/dist/modules/auth/auth.controller.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('../backend/node_modules/jsonwebtoken');
const bcrypt = require('../backend/node_modules/bcryptjs');

const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APP_ADMIN: 'APP_ADMIN',
  RESELLER_ADMIN: 'RESELLER_ADMIN',
  CLIENT_USER: 'CLIENT_USER',
  TENANT_ADMIN: 'TENANT_ADMIN',
  MEMBER: 'MEMBER',
};

const TenantTier = {
  PLATFORM_ROOT: 'PLATFORM_ROOT',
  PRIMARY_RESELLER: 'PRIMARY_RESELLER',
  SUB_RESELLER: 'SUB_RESELLER',
  END_CLIENT: 'END_CLIENT',
};

async function runDomainAuthBoundaryTests() {
  console.log('================================================================');
  console.log('Testing Task: Strict Domain-Scoped Auth & Elimination of Cross-Panel Bleed');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long!';

  // In-memory data store
  const tenants = {
    'APPNIX_DIRECT': {
      id: 'APPNIX_DIRECT',
      name: 'Appnix Direct Operations',
      slug: 'appnix-direct',
      tier: TenantTier.END_CLIENT,
      status: 'ACTIVE',
      path: 'root.appnix_direct',
      depth: 1,
      parentId: null,
    },
    'tenant-reseller-1': {
      id: 'tenant-reseller-1',
      name: 'Alpha Partners',
      slug: 'alpha-partners',
      tier: TenantTier.PRIMARY_RESELLER,
      status: 'ACTIVE',
      path: 'root.alpha_partners',
      depth: 1,
      parentId: null,
    },
    'tenant-partner-child-1': {
      id: 'tenant-partner-child-1',
      name: 'Alpha Client 1',
      slug: 'alpha-client-1',
      tier: TenantTier.END_CLIENT,
      status: 'ACTIVE',
      path: 'root.alpha_partners.client_1',
      depth: 2,
      parentId: 'tenant-reseller-1',
    },
  };

  const users = {};
  const partnerConfigs = [];
  const subscriptions = [];

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Prepopulate test users
  users['direct-client@test.com'] = {
    id: 'usr-direct-1',
    email: 'direct-client@test.com',
    name: 'Direct Client User',
    passwordHash,
    role: Role.CLIENT_USER,
    tenantId: 'APPNIX_DIRECT',
    tenant: tenants['APPNIX_DIRECT'],
  };

  users['reseller-admin@test.com'] = {
    id: 'usr-reseller-1',
    email: 'reseller-admin@test.com',
    name: 'Reseller Admin User',
    passwordHash,
    role: Role.RESELLER_ADMIN,
    tenantId: 'tenant-reseller-1',
    tenant: tenants['tenant-reseller-1'],
  };

  users['staff-admin@test.com'] = {
    id: 'usr-staff-1',
    email: 'staff-admin@test.com',
    name: 'Staff App Admin',
    passwordHash,
    role: Role.APP_ADMIN,
    tenantId: 'APPNIX_DIRECT',
    tenant: tenants['APPNIX_DIRECT'],
  };

  users['partner-child-user@test.com'] = {
    id: 'usr-child-1',
    email: 'partner-child-user@test.com',
    name: 'Downstream Child Client',
    passwordHash,
    role: Role.CLIENT_USER,
    tenantId: 'tenant-partner-child-1',
    tenant: tenants['tenant-partner-child-1'],
  };

  users['superadmin@test.com'] = {
    id: 'usr-super-1',
    email: 'superadmin@test.com',
    name: 'Super Admin',
    passwordHash,
    role: Role.SUPER_ADMIN,
    tenantId: 'root',
    tenant: { id: 'root', name: 'Platform Root', path: 'root', tier: 'PLATFORM_ROOT' },
  };

  const mockPrisma = {
    tenant: {
      findFirst: async ({ where }) => {
        if (where?.OR) {
          for (const cond of where.OR) {
            if (cond.id && tenants[cond.id]) return tenants[cond.id];
            if (cond.slug) {
              const found = Object.values(tenants).find(t => t.slug === cond.slug);
              if (found) return found;
            }
          }
        }
        if (where?.id) return tenants[where.id] || null;
        return null;
      },
      create: async ({ data }) => {
        const t = { id: data.id || `tenant-${Date.now()}`, ...data };
        tenants[t.id] = t;
        return t;
      },
    },
    user: {
      findFirst: async ({ where }) => {
        if (where?.email) return users[where.email.toLowerCase()] || null;
        return null;
      },
      create: async ({ data, include }) => {
        const u = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          ...data,
          tenant: tenants[data.tenantId] || null,
        };
        users[u.email.toLowerCase()] = u;
        return u;
      },
      update: async ({ where, data }) => {
        const u = Object.values(users).find(x => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
    },
    subscription: {
      findFirst: async ({ where }) => {
        return subscriptions.find(s => s.tenantId === where.tenantId && s.status === where.status) || null;
      },
      create: async ({ data }) => {
        subscriptions.push(data);
        return data;
      },
    },
    partnerConfig: {
      create: async ({ data }) => {
        partnerConfigs.push(data);
        return data;
      },
    },
    domainMapping: {
      findFirst: async ({ where }) => null,
    },
  };

  const mockUsersService = {
    findByEmail: async (email) => {
      const u = users[email?.toLowerCase()];
      return u || null;
    },
    updateRefreshToken: async () => {},
    createTenantWithAdmin: async (tenantName, email, pHash, name, opts = {}) => {
      const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const tier = opts.tier || TenantTier.END_CLIENT;
      const role = opts.role || Role.CLIENT_USER;
      const parentId = opts.parentId || null;

      const tenant = {
        id: tenantId,
        name: tenantName,
        slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        tier,
        status: 'ACTIVE',
        path: parentId ? `root.${parentId}.${tenantId}` : `root.${tenantId}`,
        depth: parentId ? 2 : 1,
        parentId,
      };
      tenants[tenantId] = tenant;

      const user = {
        id: `usr-${Date.now()}`,
        email: email.toLowerCase(),
        passwordHash: pHash,
        name: name || 'User',
        role,
        tenantId,
        tenant,
      };
      users[email.toLowerCase()] = user;

      return { tenant, user };
    },
  };

  const mockConfigService = {
    get: (key) => {
      if (key === 'JWT_ACCESS_SECRET' || key === 'JWT_SECRET') return JWT_SECRET;
      if (key === 'JWT_REFRESH_SECRET') return JWT_SECRET + '-refresh';
      if (key === 'JWT_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return null;
    },
  };

  const mockJwtService = {
    signAsync: async (payload, opts) => {
      return jwt.sign(payload, opts?.secret || JWT_SECRET, { expiresIn: opts?.expiresIn || '15m' });
    },
  };

  const mockMailService = {
    sendWelcomeEmail: async () => {},
  };

  const mockRecaptchaService = {
    verifyToken: async () => true,
  };

  const authService = new AuthService(
    mockUsersService,
    mockJwtService,
    mockConfigService,
    mockMailService,
    mockRecaptchaService,
    mockPrisma,
  );

  const authController = new AuthController(
    authService,
    mockUsersService,
    mockConfigService,
    mockMailService,
    mockJwtService,
  );

  function createMockResponse() {
    const cookies = {};
    return {
      cookies,
      cookie: (name, val, opts) => {
        cookies[name] = { val, opts };
      },
    };
  }

  // Helper to create mock request with headers
  function createMockReq(headers = {}) {
    return {
      headers: {
        host: 'app.localhost:3000',
        ...headers,
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
  }

  // =========================================================================
  // TEST 1: Direct Client Signup on app.appnix.co.in / app.localhost
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'app.appnix.co.in' });

    const result = await authController.signup(
      {
        email: 'new-client@directco.com',
        password: 'Password123!',
        name: 'New Direct Client',
        workspaceName: 'Direct Client Store',
      },
      mockReq,
      mockRes,
    );

    const data = result.data;
    const isClientRole = data.user.rawRole === Role.CLIENT_USER;
    const isDirectTenant = data.user.tenantId === 'APPNIX_DIRECT';
    const isDashboardRedirect = data.redirectUrl === '/dashboard';
    const noAdminCookie = mockRes.cookies['appnix_admin_token'] === undefined;
    const isHostOnlyCookie = mockRes.cookies['appnix_access_token']?.opts?.domain === undefined;

    if (isClientRole && isDirectTenant && isDashboardRedirect && noAdminCookie && isHostOnlyCookie) {
      console.log('[PASS] Test 1: Direct client signup on app.appnix.co.in forces CLIENT_USER, APPNIX_DIRECT, /dashboard redirect, and host-only cookies (no admin token).');
      passed++;
    } else {
      console.error('[FAIL] Test 1: Direct client signup failed validations:', {
        rawRole: data.user.rawRole,
        tenantId: data.user.tenantId,
        redirectUrl: data.redirectUrl,
        hasAdminCookie: !noAdminCookie,
        cookieDomain: mockRes.cookies['appnix_access_token']?.opts?.domain,
      });
    }
  } catch (err) {
    console.error('[FAIL] Test 1 Exception:', err.message);
  }

  // =========================================================================
  // TEST 2: Direct Client Login on app.appnix.co.in / app.localhost
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'app.localhost:3000' });

    const result = await authController.login(
      {
        email: 'direct-client@test.com',
        password: 'Password123!',
      },
      mockReq,
      mockRes,
    );

    const data = result.data;
    const isSuccess = !!data.accessToken;
    const isDashboardRedirect = data.redirectUrl === '/dashboard';
    const hasAccessToken = !!mockRes.cookies['appnix_access_token'];
    const noAdminCookie = mockRes.cookies['appnix_admin_token'] === undefined;
    const isHostOnly = mockRes.cookies['appnix_access_token']?.opts?.domain === undefined;

    if (isSuccess && isDashboardRedirect && hasAccessToken && noAdminCookie && isHostOnly) {
      console.log('[PASS] Test 2: Direct client login on app.localhost:3000 succeeds with redirectUrl=/dashboard, auth cookies set, and no admin cookie bleed.');
      passed++;
    } else {
      console.error('[FAIL] Test 2: Direct client login unexpected result:', {
        isSuccess,
        redirectUrl: data.redirectUrl,
        hasAccessToken,
        noAdminCookie,
        isHostOnly,
      });
    }
  } catch (err) {
    console.error('[FAIL] Test 2 Exception:', err.message);
  }

  // =========================================================================
  // TEST 3: Cross-Panel Block: Direct Client attempting to log into partners.appnix.co.in
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'partners.appnix.co.in' });

    await authController.login(
      {
        email: 'direct-client@test.com',
        password: 'Password123!',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 3: Direct client login on partners portal should have thrown 403 Forbidden but succeeded.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Client accounts cannot access partner console')) {
      console.log('[PASS] Test 3: Cross-panel block verified: Direct client attempting to access partners.appnix.co.in rejected with 403 Forbidden: "Client accounts cannot access partner console".');
      passed++;
    } else {
      console.error('[FAIL] Test 3: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 4: Cross-Panel Block: Reseller Admin attempting to log into app.appnix.co.in
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'app.appnix.co.in' });

    await authController.login(
      {
        email: 'reseller-admin@test.com',
        password: 'Password123!',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 4: Reseller Admin login on app portal should have thrown 403 Forbidden but succeeded.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Reseller accounts cannot log in to the direct client portal')) {
      console.log('[PASS] Test 4: Cross-panel block verified: Reseller admin attempting to access app.appnix.co.in rejected with 403 Forbidden: "Reseller accounts cannot log in to the direct client portal".');
      passed++;
    } else {
      console.error('[FAIL] Test 4: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 5: Cross-Panel Block: Staff APP_ADMIN attempting to log into app.appnix.co.in
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'app.localhost:3000' });

    await authController.login(
      {
        email: 'staff-admin@test.com',
        password: 'Password123!',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 5: Staff login on app portal should have thrown 403 Forbidden but succeeded.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Staff accounts cannot log in to the direct client portal')) {
      console.log('[PASS] Test 5: Cross-panel block verified: Staff admin attempting to access app portal rejected with 403 Forbidden: "Staff accounts cannot log in to the direct client portal".');
      passed++;
    } else {
      console.error('[FAIL] Test 5: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 6: Cross-Panel Block: Downstream child client of reseller on app.appnix.co.in
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'app.appnix.co.in' });

    await authController.login(
      {
        email: 'partner-child-user@test.com',
        password: 'Password123!',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 6: Partner child client login on direct app portal should have thrown 403 Forbidden but succeeded.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Partner workspace accounts cannot log in to the direct client portal')) {
      console.log('[PASS] Test 6: Cross-panel block verified: Partner child client rejected on direct client app portal with 403 Forbidden: "Partner workspace accounts cannot log in to the direct client portal".');
      passed++;
    } else {
      console.error('[FAIL] Test 6: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 7: Reseller Onboarding & Login on partners.appnix.co.in
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'partners.appnix.co.in' });

    const regResult = await authController.signup(
      {
        email: 'new-agency-partner@agency.com',
        password: 'Password123!',
        name: 'Agency Founder',
        workspaceName: 'Agency Media Group',
      },
      mockReq,
      mockRes,
    );

    const isResellerRole = regResult.data.user.rawRole === Role.RESELLER_ADMIN;
    const isResellerTier = regResult.data.user.tier === TenantTier.PRIMARY_RESELLER;
    const isPartnerRedirect = regResult.data.redirectUrl === '/admin/dashboard';
    const hasAdminCookie = !!mockRes.cookies['appnix_admin_token'];
    const hasPartnerConfig = partnerConfigs.some(pc => pc.tenantId === regResult.data.user.tenantId);

    // Now test login for this new reseller
    const loginRes = createMockResponse();
    const loginResult = await authController.login(
      {
        email: 'new-agency-partner@agency.com',
        password: 'Password123!',
      },
      mockReq,
      loginRes,
    );

    const loginRedirect = loginResult.data.redirectUrl === '/admin/dashboard';
    const loginAdminCookie = !!loginRes.cookies['appnix_admin_token'];

    if (isResellerRole && isResellerTier && isPartnerRedirect && hasAdminCookie && hasPartnerConfig && loginRedirect && loginAdminCookie) {
      console.log('[PASS] Test 7: Reseller onboarding on partners.appnix.co.in creates RESELLER_ADMIN, PRIMARY_RESELLER tier, partnerConfig, /admin/dashboard redirect, and admin cookies.');
      passed++;
    } else {
      console.error('[FAIL] Test 7: Reseller onboarding failed validations:', {
        isResellerRole,
        isResellerTier,
        isPartnerRedirect,
        hasAdminCookie,
        hasPartnerConfig,
        loginRedirect,
        loginAdminCookie,
      });
    }
  } catch (err) {
    console.error('[FAIL] Test 7 Exception:', err.message);
  }

  // =========================================================================
  // TEST 8: Administrative Portals Self-Registration Disabled
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'admin.appnix.co.in' });

    await authController.signup(
      {
        email: 'intruder@rogue.com',
        password: 'Password123!',
        name: 'Rogue Admin',
        workspaceName: 'Rogue Admin Org',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 8: Public self-registration on admin.appnix.co.in should have failed with 403 Forbidden.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Public self-registration is disabled on the administrative portal')) {
      console.log('[PASS] Test 8: Public self-registration on admin.appnix.co.in rejected with 403 Forbidden.');
      passed++;
    } else {
      console.error('[FAIL] Test 8: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 9: Super Admin Portal Self-Registration Disabled
  // =========================================================================
  total++;
  try {
    const mockRes = createMockResponse();
    const mockReq = createMockReq({ host: 'superadmin.appnix.co.in' });

    await authController.signup(
      {
        email: 'intruder@rogue.com',
        password: 'Password123!',
        name: 'Rogue Super Admin',
        workspaceName: 'Rogue Super Admin Org',
      },
      mockReq,
      mockRes,
    );
    console.error('[FAIL] Test 9: Public self-registration on superadmin.appnix.co.in should have failed with 403 Forbidden.');
  } catch (err) {
    if (err.status === 403 && err.message.includes('Public self-registration is disabled on the platform super-admin portal')) {
      console.log('[PASS] Test 9: Public self-registration on superadmin.appnix.co.in rejected with 403 Forbidden.');
      passed++;
    } else {
      console.error('[FAIL] Test 9: Unexpected error thrown:', err.status, err.message);
    }
  }

  // =========================================================================
  // TEST 10: Request Host Extraction via x-forwarded-host & origin headers
  // =========================================================================
  total++;
  try {
    // Check x-forwarded-host override
    const xfReq = {
      headers: {
        'x-forwarded-host': 'partners.appnix.co.in:443, proxy.internal',
        host: 'internal-lb:4000',
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const parsedXf = authService.parseDomainTopology(authController['extractRequestHost'](xfReq));
    const isXfPartners = parsedXf.isPartnersDomain;

    // Check origin fallback when host is localhost/gateway
    const originReq = {
      headers: {
        host: 'localhost:4000',
        origin: 'https://app.appnix.co.in',
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const parsedOrigin = authService.parseDomainTopology(authController['extractRequestHost'](originReq));
    const isOriginApp = parsedOrigin.isAppDomain;

    if (isXfPartners && isOriginApp) {
      console.log('[PASS] Test 10: extractRequestHost properly inspects x-forwarded-host, origin, and referer headers behind proxies.');
      passed++;
    } else {
      console.error('[FAIL] Test 10: extractRequestHost failed:', { isXfPartners, isOriginApp });
    }
  } catch (err) {
    console.error('[FAIL] Test 10 Exception:', err.message);
  }

  // =========================================================================
  // TEST 11: Safety Directive Check: Super Admin Guest Impersonation Operational
  // =========================================================================
  total++;
  try {
    const { SuperAdminService } = await import('../backend/dist/modules/super-admin/super-admin.service.js');
    const auditLogs = [];
    const mockImpersonationPrisma = {
      user: {
        findUnique: async ({ where }) => users['reseller-admin@test.com'],
      },
      auditLog: {
        create: async ({ data }) => {
          auditLogs.push(data);
          return data;
        },
      },
    };
    const saService = new SuperAdminService(
      mockImpersonationPrisma,
      mockJwtService,
      mockConfigService,
      {}, {}, {}, {}
    );
    const impRes = await saService.impersonateUser(
      { userId: 'usr-super-1', email: 'superadmin@test.com', role: Role.SUPER_ADMIN, tenantId: 'root' },
      'usr-reseller-1',
      'Verifying boundary safety',
      '127.0.0.1',
    );

    if (impRes && impRes.token && impRes.redirectUrl.includes('partners.') && auditLogs.length > 0) {
      console.log('[PASS] Test 11: Safety Directive confirmed: Super Admin Guest Impersonation remains 100% operational with telemetry audit logging.');
      passed++;
    } else {
      console.error('[FAIL] Test 11: Super Admin Guest Impersonation failed:', impRes);
    }
  } catch (err) {
    console.error('[FAIL] Test 11 Exception:', err.message);
  }

  console.log('\n================================================================');
  console.log(`Results: ${passed}/${total} tests passed successfully.`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runDomainAuthBoundaryTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
