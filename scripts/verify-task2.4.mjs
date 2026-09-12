import { SuperAdminService } from '../backend/dist/modules/super-admin/super-admin.service.js';
import { SessionContextResolver } from '../backend/dist/lib/auth/session-context.js';
import { TenantContextStore } from '../backend/dist/lib/auth/tenant-context.store.js';
const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APP_ADMIN: 'APP_ADMIN',
  RESELLER_ADMIN: 'RESELLER_ADMIN',
  CLIENT_USER: 'CLIENT_USER',
  MEMBER: 'MEMBER',
};

async function runImpersonationTests() {
  console.log('Testing Task 2.4: Super Admin Impersonation Flow & Audit Logging...\n');

  const auditLogs = [];
  const mockTenants = {
    'root': { id: 'root', name: 'Platform Root', path: 'root', tier: 'PLATFORM_ROOT', parentId: null },
    'direct-client': { id: 'direct-client', name: 'Direct Client Co', path: 'root.t_dc', tier: 'END_CLIENT', parentId: 'root' },
    'partner-1': { id: 'partner-1', name: 'Acme Reseller', path: 'root.t_p1', tier: 'PRIMARY_RESELLER', parentId: 'root' },
    'partner-1-client': { id: 'partner-1-client', name: 'Acme Sub Client', path: 'root.t_p1.t_c1', tier: 'END_CLIENT', parentId: 'partner-1' },
    'partner-2': { id: 'partner-2', name: 'Rival Reseller', path: 'root.t_p2', tier: 'PRIMARY_RESELLER', parentId: 'root' },
  };

  const mockPrisma = {
    tenant: {
      findUnique: async ({ where }) => mockTenants[where.id] || null,
      findFirst: async () => null,
    },
    auditLog: {
      create: async ({ data }) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  const mockConfig = {
    get: (k) => {
      if (k === 'IMPERSONATION_JWT_SECRET' || k === 'JWT_ACCESS_SECRET' || k === 'JWT_SECRET') {
        return 'test-super-secret-key-32-chars-long!';
      }
      if (k === 'IMPERSONATION_JWT_EXPIRY') return '15m';
      return null;
    },
  };

  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const realJwt = require('../backend/node_modules/jsonwebtoken');
  const mockJwt = {
    signAsync: async (payload, opts) => realJwt.sign(payload, opts.secret, { expiresIn: opts.expiresIn }),
    verify: (token, opts) => realJwt.verify(token, opts.secret),
  };

  const superAdminService = new SuperAdminService(
    mockPrisma,
    mockJwt,
    mockConfig,
    null, // authService
    null, // dnsService
    null, // mailService
    null, // emailOtpService
  );

  let passed = 0;
  let total = 0;

  // Test 1: Super Admin impersonates Partner
  total++;
  try {
    const res = await superAdminService.beginWorkspaceInspection(
      { userId: 'super-user-1', email: 'admin@appnix.co.in', role: Role.SUPER_ADMIN, tenantId: 'root', orgPath: 'root' },
      'partner-1',
    );
    if (res.impersonationToken && res.expiresIn === '15m') {
      const decoded = mockJwt.verify(res.impersonationToken, { secret: 'test-super-secret-key-32-chars-long!' });
      if (
        decoded.sub === 'super-user-1' &&
        decoded.targetWorkspaceId === 'partner-1' &&
        decoded.purpose === 'super_admin_impersonation'
      ) {
        console.log('[PASS] Super Admin successfully generated partner impersonation token');
        passed++;
      } else {
        console.error('[FAIL] Decoded claims mismatch:', decoded);
      }
    }
  } catch (err) {
    console.error('[FAIL] Super Admin partner impersonation failed:', err.message);
  }

  // Test 2: Audit log was recorded for IMPERSONATION_STARTED
  total++;
  const startAudit = auditLogs.find((l) => l.action === 'IMPERSONATION_STARTED' && l.targetWorkspaceId === 'partner-1');
  if (startAudit && startAudit.superAdminId === 'super-user-1') {
    console.log('[PASS] IMPERSONATION_STARTED audit log appended');
    passed++;
  } else {
    console.error('[FAIL] Audit log not found for IMPERSONATION_STARTED');
  }

  // Test 3: Reseller Admin can impersonate child client
  total++;
  let resellerToken = null;
  try {
    const res = await superAdminService.beginWorkspaceInspection(
      { userId: 'reseller-user-1', email: 'reseller@acme.com', role: Role.RESELLER_ADMIN, tenantId: 'partner-1', orgPath: 'root.t_p1' },
      'partner-1-client',
    );
    if (res.impersonationToken) {
      resellerToken = res.impersonationToken;
      const decoded = mockJwt.verify(res.impersonationToken, { secret: 'test-super-secret-key-32-chars-long!' });
      if (decoded.purpose === 'reseller_impersonation' && decoded.targetWorkspaceId === 'partner-1-client') {
        console.log('[PASS] Reseller Admin successfully generated child client impersonation token');
        passed++;
      }
    }
  } catch (err) {
    console.error('[FAIL] Reseller child impersonation failed:', err.message);
  }

  // Test 4: Reseller Admin is BLOCKED from impersonating platform root
  total++;
  try {
    await superAdminService.beginWorkspaceInspection(
      { userId: 'reseller-user-1', email: 'reseller@acme.com', role: Role.RESELLER_ADMIN, tenantId: 'partner-1', orgPath: 'root.t_p1' },
      'root',
    );
    console.error('[FAIL] Reseller Admin was able to impersonate platform root!');
  } catch (err) {
    if (err.message.includes('platform root') || err.message.includes('outside your reseller tree')) {
      console.log('[PASS] Reseller Admin BLOCKED from inspecting platform root');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 5: Reseller Admin is BLOCKED from impersonating rival partner
  total++;
  try {
    await superAdminService.beginWorkspaceInspection(
      { userId: 'reseller-user-1', email: 'reseller@acme.com', role: Role.RESELLER_ADMIN, tenantId: 'partner-1', orgPath: 'root.t_p1' },
      'partner-2',
    );
    console.error('[FAIL] Reseller Admin was able to impersonate rival partner!');
  } catch (err) {
    if (err.message.includes('outside your reseller tree')) {
      console.log('[PASS] Reseller Admin BLOCKED from inspecting rival partner');
      passed++;
    } else {
      console.error('[FAIL] Unexpected error:', err.message);
    }
  }

  // Test 6: SessionContextResolver re-scopes tenantId with X-Impersonation-Token
  total++;
  const store = new TenantContextStore();
  const resolver = new SessionContextResolver(mockJwt, mockConfig, store);

  // Generate Super Admin token inspecting partner-1-client
  const inspectRes = await superAdminService.beginWorkspaceInspection(
    { userId: 'super-user-1', email: 'admin@appnix.co.in', role: Role.SUPER_ADMIN, tenantId: 'root', orgPath: 'root' },
    'partner-1-client',
  );

  const mockReq = {
    user: {
      userId: 'super-user-1',
      email: 'admin@appnix.co.in',
      tenantId: 'root',
      role: Role.SUPER_ADMIN,
      orgPath: 'root',
    },
    header: (name) => {
      if (name.toLowerCase() === 'x-impersonation-token') {
        return inspectRes.impersonationToken;
      }
      return null;
    },
  };

  const resolved = resolver.resolve(mockReq);
  const inStore = store.get();

  if (
    resolved.tenantId === 'partner-1-client' &&
    resolved.impersonatedWorkspaceId === 'partner-1-client' &&
    resolved.userId === 'super-user-1' &&
    inStore?.tenantId === 'partner-1-client' &&
    inStore?.impersonatedWorkspaceId === 'partner-1-client'
  ) {
    console.log('[PASS] SessionContextResolver re-scopes tenantId to impersonated workspace in AsyncLocalStorage');
    passed++;
  } else {
    console.error('[FAIL] SessionContextResolver failed to re-scope context:', { resolved, inStore });
  }

  console.log(`\nResults: ${passed}/${total} tests passed successfully.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runImpersonationTests().catch((err) => {
  console.error('Fatal error in impersonation tests:', err);
  process.exit(1);
});
