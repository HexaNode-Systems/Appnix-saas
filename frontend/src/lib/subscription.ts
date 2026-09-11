/**
 * Workspace Subscription Verification & State Management
 * Single source of truth for subscription status checks across Appnix SaaS.
 */

export interface SubscriptionStatusResult {
  hasActiveSubscription: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  isSuspended: boolean;
  status: "ACTIVE" | "TRIALING" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "NONE";
  activePlan?: {
    id: string;
    name: string;
    price: string;
    status: string;
    currentPeriodEnd?: string;
    remainingDays?: number;
  } | null;
  message?: string;
}

const STORAGE_ACTIVE_KEY = "appnix_has_active_subscription";
const STORAGE_PLAN_KEY = "appnix_active_plan";

/**
 * Fast synchronous check if local cache indicates an active subscription.
 */
export function hasCachedActiveSubscription(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark workspace subscription active locally.
 */
export function markSubscriptionActive(planId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_KEY, "true");
    if (planId) {
      localStorage.setItem(STORAGE_PLAN_KEY, planId);
    }
  } catch {}
}

/**
 * Clear subscription cache when expired, cancelled, suspended, or logged out.
 */
export function clearSubscriptionCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_ACTIVE_KEY);
  } catch {}
}

/**
 * Robustly verifies workspace subscription status against:
 * 1. Backend direct check endpoint (/api/v1/billing/check?tenantId=...)
 * 2. Backend authenticated endpoint (/api/v1/billing/subscription)
 * 3. Next.js Cashfree history endpoint (/api/v1/payments/cashfree/history?workspace_id=...)
 */
export async function verifySubscriptionStatus(
  explicitWorkspaceId?: string,
  explicitToken?: string
): Promise<SubscriptionStatusResult> {
  // 1. Resolve workspace ID and JWT token
  let workspaceId = explicitWorkspaceId;
  let token = explicitToken;

  if (typeof window !== "undefined") {
    if (!workspaceId) {
      try {
        const storedUser = localStorage.getItem("appnix_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          workspaceId = parsed.workspaceId || parsed.tenantId;
        }
      } catch {}
    }

    if (!token) {
      try {
        token =
          localStorage.getItem("appnix_auth_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("appnix_token") ||
          undefined;
      } catch {}
    }
  }

  const resolvedWorkspaceId = workspaceId && workspaceId !== "default" ? workspaceId : undefined;

  // Track the most descriptive inactive state encountered
  let isExpiredFound = false;
  let isCancelledFound = false;
  let isSuspendedFound = false;
  let lastStatus: "ACTIVE" | "TRIALING" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "NONE" = "NONE";
  let lastActivePlan: any = null;

  const isBrowser = typeof window !== "undefined";
  const proxyPrefix = "/api/proxy";
  const directApiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://api.appnix.co.in/api/v1";

  const backendUrl = isBrowser ? proxyPrefix : directApiUrl;

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // ================= SOURCE 1: Backend Authenticated Subscription Endpoint =================
  if (token) {
    try {
      const subRes = await fetch(`${backendUrl}/billing/subscription`, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.hasActiveSubscription && subData.data) {
          markSubscriptionActive(subData.data.planId || subData.data.id);
          return {
            hasActiveSubscription: true,
            isExpired: false,
            isCancelled: false,
            isSuspended: false,
            status: subData.data.isTrial ? "TRIALING" : "ACTIVE",
            activePlan: subData.data,
            message: "Active subscription verified via backend authentication.",
          };
        }
        if (subData.isExpired) isExpiredFound = true;
        if (subData.isCancelled) isCancelledFound = true;
        if (subData.isSuspended) isSuspendedFound = true;
        if (subData.data?.status) lastStatus = subData.data.status;
        if (subData.data) lastActivePlan = subData.data;
      }
    } catch {
      // Continue to next check
    }
  }

  // ================= SOURCE 2: Next.js Payments & Subscription DB Endpoint =================
  try {
    const historyQuery = resolvedWorkspaceId ? `?workspace_id=${encodeURIComponent(resolvedWorkspaceId)}` : "";
    const res = await fetch(`/api/v1/payments/cashfree/history${historyQuery}`, {
      headers: authHeaders,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.hasActiveSubscription && data.activePlan) {
        markSubscriptionActive(data.activePlan.id);
        return {
          hasActiveSubscription: true,
          isExpired: false,
          isCancelled: false,
          isSuspended: false,
          status: data.status || "ACTIVE",
          activePlan: data.activePlan,
          message: "Active subscription verified via workspace payments.",
        };
      }
      if (data.isExpired) isExpiredFound = true;
      if (data.isCancelled) isCancelledFound = true;
      if (data.isSuspended) isSuspendedFound = true;
      if (data.status) lastStatus = data.status;
      if (data.activePlan) lastActivePlan = data.activePlan;
    }
  } catch {
    // Continue to next check
  }

  // ================= SOURCE 3: Backend Direct Check Endpoint =================
  if (token || resolvedWorkspaceId) {
    try {
      const checkUrl = `${backendUrl}/billing/check${
        resolvedWorkspaceId ? `?tenantId=${encodeURIComponent(resolvedWorkspaceId)}` : ""
      }`;
      const apiRes = await fetch(checkUrl, {
        headers: authHeaders,
        cache: "no-store",
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.hasActiveSubscription && json.data) {
          markSubscriptionActive(json.data.planId || json.data.id);
          return {
            hasActiveSubscription: true,
            isExpired: false,
            isCancelled: false,
            isSuspended: false,
            status: json.data.isTrial ? "TRIALING" : "ACTIVE",
            activePlan: json.data,
            message: "Active subscription verified.",
          };
        }
        if (json.isExpired) isExpiredFound = true;
        if (json.isCancelled) isCancelledFound = true;
        if (json.isSuspended) isSuspendedFound = true;
        if (json.data?.status) lastStatus = json.data.status;
      }
    } catch {
      // All checks exhausted
    }
  }

  // If none verified active: clear active cache
  clearSubscriptionCache();

  const resolvedStatus: SubscriptionStatusResult["status"] = isCancelledFound
    ? "CANCELLED"
    : isSuspendedFound
    ? "SUSPENDED"
    : isExpiredFound
    ? "EXPIRED"
    : lastStatus !== "ACTIVE" && lastStatus !== "TRIALING"
    ? lastStatus
    : "NONE";

  return {
    hasActiveSubscription: false,
    isExpired: isExpiredFound,
    isCancelled: isCancelledFound,
    isSuspended: isSuspendedFound,
    status: resolvedStatus,
    activePlan: lastActivePlan,
    message: isCancelledFound
      ? "Subscription has been cancelled."
      : isSuspendedFound
      ? "Workspace is currently suspended."
      : isExpiredFound
      ? "Subscription has expired."
      : "No active subscription found for workspace.",
  };
}
