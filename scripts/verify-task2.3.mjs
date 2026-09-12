import { HierarchyGuard } from '../backend/dist/common/guards/hierarchy.guard.js';
const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APP_ADMIN: 'APP_ADMIN',
  RESELLER_ADMIN: 'RESELLER_ADMIN',
  CLIENT_USER: 'CLIENT_USER',
  MEMBER: 'MEMBER',
  TENANT_ADMIN: 'TENANT_ADMIN',
};

async function runIsolationTests() {
  console.log('Testing Task 2.3: Reseller Data Isolation Guard & Scoping...\n');

  const mockTenants = {
    'root': { id: 'root', path: 'root', parentId: null },
    'direct-client-1': { id: 'direct-client-1', path: 'root.t_direct1', parentId: 'root' },
    'reseller-1': { id: 'reseller-1', path: 'root.t_reseller1', parentId: 'root' },
    'reseller-client-1': { id: 'reseller-client-1', path: 'root.t_reseller1.t_rc1', parentId: 'reseller-1' },
    'reseller-2': { id: 'reseller-2', path: 'root.t_reseller2', parentId: 'root' },
    'reseller-client-2': { id: 'reseller-client-2', path: 'root.t_reseller2.t_rc2', parentId: 'reseller-2' },
  };

  const mockPrisma = {
    tenant: {
      findUnique: async ({ where }) => mockTenants[where.id] || null,
    },
  };

  const guard = new HierarchyGuard(mockPrisma);

  const testCases = [
    {
      name: 'Super Admin can access any tenant platform-wide',
      user: { userId: 'u-super', tenantId: 'root', role: Role.SUPER_ADMIN, orgPath: 'root' },
      targetTenantId: 'direct-client-1',
      shouldAllow: true,
    },
    {
      name: 'Direct App Admin can access any tenant platform-wide',
      user: { userId: 'u-admin', tenantId: 'root', role: Role.APP_ADMIN, orgPath: 'root' },
      targetTenantId: 'reseller-client-1',
      shouldAllow: true,
    },
    {
      name: 'Reseller Admin can access self workspace',
      user: { userId: 'u-reseller1', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN, orgPath: 'root.t_reseller1' },
      targetTenantId: 'reseller-1',
      shouldAllow: true,
    },
    {
      name: 'Reseller Admin can access their own child client',
      user: { userId: 'u-reseller1', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN, orgPath: 'root.t_reseller1' },
      targetTenantId: 'reseller-client-1',
      shouldAllow: true,
    },
    {
      name: 'Reseller Admin is BLOCKED from accessing platform root',
      user: { userId: 'u-reseller1', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN, orgPath: 'root.t_reseller1' },
      targetTenantId: 'root',
      shouldAllow: false,
    },
    {
      name: 'Reseller Admin is BLOCKED from accessing direct Appnix clients',
      user: { userId: 'u-reseller1', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN, orgPath: 'root.t_reseller1' },
      targetTenantId: 'direct-client-1',
      shouldAllow: false,
    },
    {
      name: 'Reseller Admin is BLOCKED from accessing rival reseller child client',
      user: { userId: 'u-reseller1', tenantId: 'reseller-1', role: Role.RESELLER_ADMIN, orgPath: 'root.t_reseller1' },
      targetTenantId: 'reseller-client-2',
      shouldAllow: false,
    },
    {
      name: 'Direct Client User is BLOCKED from accessing another tenant',
      user: { userId: 'u-client1', tenantId: 'direct-client-1', role: Role.CLIENT_USER, orgPath: 'root.t_direct1' },
      targetTenantId: 'reseller-client-1',
      shouldAllow: false,
    },
    {
      name: 'Active impersonation allows target tenant access',
      user: {
        userId: 'u-super',
        tenantId: 'root',
        role: Role.SUPER_ADMIN,
        orgPath: 'root',
        impersonatedWorkspaceId: 'reseller-client-1',
      },
      targetTenantId: 'reseller-client-1',
      shouldAllow: true,
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: tc.user,
          params: { tenantId: tc.targetTenantId },
        }),
      }),
    };

    let allowed = false;
    let error = null;
    try {
      allowed = await guard.canActivate(mockContext);
    } catch (err) {
      error = err;
      allowed = false;
    }

    if (allowed === tc.shouldAllow) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`, { expected: tc.shouldAllow, got: allowed, error: error?.message });
    }
  }

  console.log(`\nResults: ${passed}/${testCases.length} tests passed successfully.`);
  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runIsolationTests().catch((err) => {
  console.error('Fatal error in isolation tests:', err);
  process.exit(1);
});
