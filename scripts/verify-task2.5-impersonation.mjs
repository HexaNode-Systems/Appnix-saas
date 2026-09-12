import { SuperAdminService } from '../backend/dist/modules/super-admin/super-admin.service.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('../backend/node_modules/jsonwebtoken');

const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APP_ADMIN: 'APP_ADMIN',
  RESELLER_ADMIN: 'RESELLER_ADMIN',
  CLIENT_USER: 'CLIENT_USER',
};

const TenantTier = {
  PLATFORM_ROOT: 'PLATFORM_ROOT',
  PRIMARY_RESELLER: 'PRIMARY_RESELLER',
  SUB_RESELLER: 'SUB_RESELLER',
  END_CLIENT: 'END_CLIENT',
};

async function testSuperAdminImpersonation() {
  console.log('Testing Task 2.5 Super Admin Impersonation (Guest Mode)...\n');

  let passed = 0;
  let total = 0;

  const auditLogs = [];
  const JWT_SECRET = 'super-admin-test-secret-32-chars-long!';

  const mockUsers = {
    'user-reseller-admin': {
      id: 'user-reseller-admin',
      email: 'owner@growthagency.com',
      name: 'Agency Admin',
      role: Role.RESELLER_ADMIN,
      tenantId: 'tenant-reseller-1',
      tenant: {
        id: 'tenant-reseller-1',
        name: 'Growth Agency',
        path: 'root.reseller1',
        tier: TenantTier.PRIMARY_RESELLER,
        customDomain: 'growthagency.com',
        parent: null,
        domainMappings: [{ domain: 'growthagency.com', status: 'VERIFIED', isVerified: true }],
      },
    },
    'user-reseller-client': {
      id: 'user-reseller-client',
      email: 'client@dentalclinic.com',
      name: 'Dental Client',
      role: Role.CLIENT_USER,
      tenantId: 'tenant-child-client-1',
      tenant: {
        id: 'tenant-child-client-1',
        name: 'Dental Clinic',
        path: 'root.reseller1.client1',
        tier: TenantTier.END_CLIENT,
        customDomain: null,
        parent: {
          id: 'tenant-reseller-1',
          name: 'Growth Agency',
          slug: 'growth-agency',
          tier: TenantTier.PRIMARY_RESELLER,
          customDomain: 'portal.growthagency.com',
        },
        domainMappings: [],
      },
    },
    'user-direct-client': {
      id: 'user-direct-client',
      email: 'direct@directshop.com',
      name: 'Direct Shop Owner',
      role: Role.CLIENT_USER,
      tenantId: 'tenant-direct-1',
      tenant: {
        id: 'tenant-direct-1',
        name: 'Direct Shop',
        path: 'root.direct1',
        tier: TenantTier.END_CLIENT,
        customDomain: null,
        parent: null,
        domainMappings: [],
      },
    },
    'user-no-tenant': {
      id: 'user-no-tenant',
      email: 'orphan@nowhere.com',
      name: 'Orphan User',
      role: Role.CLIENT_USER,
      tenantId: null,
      tenant: null,
    },
  };

  const mockPrisma = {
    user: {
      findUnique: async ({ where }) => mockUsers[where.id] || null,
    },
    auditLog: {
      create: async ({ data }) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  const mockConfig = {
    get: (key) => {
      if (key === 'IMPERSONATION_JWT_SECRET') return JWT_SECRET;
      return null;
    },
  };

  const mockJwt = {
    signAsync: async (payload, opts) => {
      return jwt.sign(payload, opts.secret || JWT_SECRET, { expiresIn: opts.expiresIn || '1h' });
    },
  };

  const superAdminService = new SuperAdminService(
    mockPrisma,
    mockJwt,
    mockConfig,
    {}, // authService
    {}, // dnsService
    {}, // mailService
    {}, // emailOtpService
  );

  const actor = {
    userId: 'super-admin-001',
    email: 'ops@appnix.co.in',
    role: Role.SUPER_ADMIN,
    tenantId: 'root',
  };

  // Test 1: Impersonating RESELLER_ADMIN generates token with correct claims & routes to partners domain
  total++;
  try {
    process.env.NODE_ENV = 'production';
    const res = await superAdminService.impersonateUser(
      actor,
      'user-reseller-admin',
      'Diagnosing partner billing config',
      '192.168.1.50',
    );

    const decoded = jwt.verify(res.token, JWT_SECRET);

    if (
      decoded.sub === 'user-reseller-admin' &&
      decoded.email === 'owner@growthagency.com' &&
      decoded.role === Role.RESELLER_ADMIN &&
      decoded.tenantId === 'tenant-reseller-1' &&
      decoded.isImpersonated === true &&
      decoded.impersonatorId === 'super-admin-001' &&
      decoded.purpose === 'super_admin_impersonation' &&
      res.redirectUrl.startsWith('https://partners.appnix.co.in/auth/guest-login?token=')
    ) {
      console.log('[PASS] Impersonating Reseller Admin generates verified token and redirects to partners.appnix.co.in');
      passed++;
    } else {
      console.error('[FAIL] Reseller admin impersonation output mismatch:', { res, decoded });
    }
  } catch (err) {
    console.error('[FAIL] Reseller admin impersonation threw error:', err.message);
  }

  // Test 2: Verify AuditLog entry for IMPERSONATION_STARTED
  total++;
  try {
    const startedLog = auditLogs.find((l) => l.action === 'IMPERSONATION_STARTED');
    if (
      startedLog &&
      startedLog.superAdminId === 'super-admin-001' &&
      startedLog.targetWorkspaceId === 'tenant-reseller-1' &&
      startedLog.endpoint === 'POST /super-admin/impersonate' &&
      startedLog.actorEmail === 'ops@appnix.co.in' &&
      startedLog.details?.reason === 'Diagnosing partner billing config'
    ) {
      console.log('[PASS] AuditLog records IMPERSONATION_STARTED with complete telemetry');
      passed++;
    } else {
      console.error('[FAIL] AuditLog missing or incorrect for IMPERSONATION_STARTED:', startedLog);
    }
  } catch (err) {
    console.error('[FAIL] Error checking audit log:', err.message);
  }

  // Test 3: Impersonating child client of a reseller redirects to the partner white-label domain
  total++;
  try {
    process.env.NODE_ENV = 'production';
    const res = await superAdminService.impersonateUser(
      actor,
      'user-reseller-client',
      'Support ticket: WhatsApp template sync check',
      '192.168.1.50',
    );

    const decoded = jwt.verify(res.token, JWT_SECRET);

    if (
      decoded.sub === 'user-reseller-client' &&
      decoded.role === Role.CLIENT_USER &&
      decoded.tenantId === 'tenant-child-client-1' &&
      decoded.isImpersonated === true &&
      res.redirectUrl.startsWith('https://portal.growthagency.com/auth/guest-login?token=')
    ) {
      console.log('[PASS] Impersonating reseller client resolves custom partner domain URL');
      passed++;
    } else {
      console.error('[FAIL] Reseller client impersonation redirect mismatch:', res.redirectUrl);
    }
  } catch (err) {
    console.error('[FAIL] Reseller client impersonation threw error:', err.message);
  }

  // Test 4: Impersonating Direct Appnix Client redirects to app.appnix.co.in
  total++;
  try {
    process.env.NODE_ENV = 'production';
    const res = await superAdminService.impersonateUser(
      actor,
      'user-direct-client',
      'Direct customer live chat inspection',
      '192.168.1.50',
    );

    if (res.redirectUrl.startsWith('https://app.appnix.co.in/auth/guest-login?token=')) {
      console.log('[PASS] Impersonating direct client redirects to app.appnix.co.in');
      passed++;
    } else {
      console.error('[FAIL] Direct client impersonation redirect mismatch:', res.redirectUrl);
    }
  } catch (err) {
    console.error('[FAIL] Direct client impersonation threw error:', err.message);
  }

  // Test 5: Rejects missing targetUserId
  total++;
  try {
    await superAdminService.impersonateUser(actor, '');
    console.error('[FAIL] Allowed empty targetUserId!');
  } catch (err) {
    if (err.status === 400 && err.message.includes('targetUserId is required')) {
      console.log('[PASS] Rejects empty targetUserId with 400 Bad Request');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error for empty targetUserId:', err.message);
    }
  }

  // Test 6: Rejects non-existent user with 404
  total++;
  try {
    await superAdminService.impersonateUser(actor, 'non-existent-user-id');
    console.error('[FAIL] Allowed non-existent user!');
  } catch (err) {
    if (err.status === 404 && err.message.includes('not found')) {
      console.log('[PASS] Rejects non-existent user with 404 Not Found');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error for non-existent user:', err.message);
    }
  }

  // Test 7: Rejects user without active tenant
  total++;
  try {
    await superAdminService.impersonateUser(actor, 'user-no-tenant');
    console.error('[FAIL] Allowed user without tenant!');
  } catch (err) {
    if (err.status === 404 && err.message.includes('not associated with an active workspace')) {
      console.log('[PASS] Rejects user without active tenant with 404');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error for user without tenant:', err.message);
    }
  }

  // Test 8: Terminate impersonation writes IMPERSONATION_TERMINATED and returns superadmin redirect
  total++;
  try {
    process.env.NODE_ENV = 'production';
    const termRes = await superAdminService.terminateImpersonation(actor, '192.168.1.50');

    const termLog = auditLogs.find((l) => l.action === 'IMPERSONATION_TERMINATED');

    if (
      termRes.success === true &&
      termRes.redirectUrl === 'https://superadmin.appnix.co.in' &&
      termLog &&
      termLog.superAdminId === 'super-admin-001' &&
      termLog.endpoint === 'POST /super-admin/impersonate/terminate'
    ) {
      console.log('[PASS] Terminate impersonation writes audit log and redirects to superadmin.appnix.co.in');
      passed++;
    } else {
      console.error('[FAIL] Terminate impersonation result mismatch:', { termRes, termLog });
    }
  } catch (err) {
    console.error('[FAIL] Terminate impersonation threw error:', err.message);
  }

  console.log(`\n========================================`);
  console.log(`Task 2.5 Impersonation: ${passed}/${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

testSuperAdminImpersonation().catch((err) => {
  console.error('Fatal error in impersonation tests:', err);
  process.exit(1);
});
