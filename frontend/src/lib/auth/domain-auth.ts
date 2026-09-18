/**
 * Helper to identify if an account belongs to a reseller partner vs Appnix direct
 */
export function isDirectClientAccount(
  tenantPath?: string | null,
  tenantParentId?: string | null
): boolean {
  if (!tenantPath) {
    return tenantParentId === "APPNIX_DIRECT" || !tenantParentId;
  }

  // Direct client paths ALWAYS start with root.appnix_direct
  if (tenantPath.startsWith("root.appnix_direct")) {
    return true;
  }

  // Or if parentId is APPNIX_DIRECT or null
  if (tenantParentId === "APPNIX_DIRECT" || !tenantParentId) {
    return true;
  }

  return false;
}

/**
 * Checks if a tenant/user is a downstream child of a reseller partner
 */
export function isPartnerChildAccount(
  tenantPath?: string | null,
  tenantParentId?: string | null
): boolean {
  if (!tenantPath) return false;
  const parts = tenantPath.split(".");
  if (parts.length <= 2) return false;
  return !isDirectClientAccount(tenantPath, tenantParentId);
}
