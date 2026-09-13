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
 * Checks if the authenticated user/workspace currently has an ACTIVE subscription
 * verified directly against the backend/database.
 * Returns true ONLY if the subscription status is currently active or trialing.
 */
export async function hasActiveSubscription(
  explicitWorkspaceId?: string,
  explicitToken?: string
): Promise<boolean> {
  try {
    const result = await verifySubscriptionStatus(explicitWorkspaceId, explicitToken);
    return Boolean(result && result.hasActiveSubscription);
  } catch {
    return false;
  }
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

        clearSubscriptionCache();
        const isExp = Boolean(subData.isExpired);
        const isCanc = Boolean(subData.isCancelled);
        const isSusp = Boolean(subData.isSuspended);
        const resolvedSt: SubscriptionStatusResult["status"] = isCanc
          ? "CANCELLED"
          : isSusp
          ? "SUSPENDED"
          : isExp
          ? "EXPIRED"
          : subData.data?.status || "NONE";

        return {
          hasActiveSubscription: false,
          isExpired: isExp,
          isCancelled: isCanc,
          isSuspended: isSusp,
          status: resolvedSt,
          activePlan: subData.data || null,
          message: subData.message || (isCanc
            ? "Subscription has been cancelled."
            : isSusp
            ? "Workspace is currently suspended."
            : isExp
            ? "Subscription has expired."
            : "No active subscription found for workspace."),
        };
      }
    } catch (err) {
      console.warn("[Subscription] Backend subscription endpoint error, attempting check fallback:", err);
    }
  }

  // ================= SOURCE 2: Backend Direct Check Endpoint =================
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

        clearSubscriptionCache();
        const isExp = Boolean(json.isExpired);
        const isCanc = Boolean(json.isCancelled);
        const isSusp = Boolean(json.isSuspended);
        const resolvedSt: SubscriptionStatusResult["status"] = isCanc
          ? "CANCELLED"
          : isSusp
          ? "SUSPENDED"
          : isExp
          ? "EXPIRED"
          : json.data?.status || "NONE";

        return {
          hasActiveSubscription: false,
          isExpired: isExp,
          isCancelled: isCanc,
          isSuspended: isSusp,
          status: resolvedSt,
          activePlan: json.data || null,
          message: json.message || "No active subscription found for workspace.",
        };
      }
    } catch {
      // Backend unreachable
    }
  }

  // If unauthenticated or backend unreachable: clear active cache
  clearSubscriptionCache();

  return {
    hasActiveSubscription: false,
    isExpired: isExpiredFound,
    isCancelled: isCancelledFound,
    isSuspended: isSuspendedFound,
    status: "NONE",
    activePlan: null,
    message: "No active subscription found for workspace.",
  };
}
