import axios from "axios";
import { config } from "@/lib/config";

// Dedicated Super Admin Axios Instance
const api = axios.create({
  baseURL: `${config.api.proxyPrefix}/super-admin`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Automatically inject Super Admin Token
api.interceptors.request.use((req) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("appnix_superadmin_token") ||
      localStorage.getItem(config.auth.tokenKey);
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
  }
  return req;
});

// Flag to prevent cascading redirect loops on multiple failed requests
let isLoggingOut = false;

/**
 * Completely clears all Super Admin local storage, session storage,
 * and client-side cookies across potential root and subdomain scopes.
 */
export function clearSuperAdminAuthSession() {
  if (typeof window === "undefined") return;

  // 1. Clear LocalStorage keys
  const keysToRemove = [
    "appnix_superadmin_token",
    "appnix_superadmin_user",
    "appnix_superadmin_refresh_token",
    config.auth.superAdminTokenKey,
    config.auth.superAdminUserKey,
    config.auth.superAdminRefreshTokenKey,
    config.auth.tokenKey,
    config.auth.userKey,
    config.auth.refreshTokenKey,
    "appnix_access_token",
    "appnix_auth_token",
    "appnix_admin_token",
    "appnix_admin_user",
    "appnix_admin_refresh_token",
  ];
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });

  // 2. Clear SessionStorage completely
  try {
    sessionStorage.clear();
  } catch {
    // Ignore
  }

  // 3. Clear all client-writable cookies across standard paths and domain variations
  const cookiesToClear = [
    "appnix_superadmin_token",
    "appnix_superadmin_refresh_token",
    "appnix_access_token",
    "appnix_auth_token",
    "appnix_refresh_token",
    "appnix_admin_token",
    "appnix_admin_refresh_token",
  ];

  const host = window.location.hostname;
  const hostParts = host.split(".");
  const domains = ["", host, `.${host}`];
  if (hostParts.length >= 2) {
    domains.push(`.${hostParts.slice(-2).join(".")}`);
  }

  cookiesToClear.forEach((name) => {
    domains.forEach((d) => {
      const domainAttr = d ? `; domain=${d}` : "";
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0${domainAttr}`;
    });
  });
}

/**
 * Returns the appropriate login URL for the current host (subdomain vs root domain).
 */
export function getSuperAdminLoginUrl(returnUrl?: string): string {
  if (typeof window === "undefined") return "/super-admin/login";
  const host = window.location.hostname;
  const isSuperAdminSubdomain =
    host.startsWith("superadmin.") ||
    host === "superadmin.local" ||
    host.includes("superadmin");

  const base = isSuperAdminSubdomain ? "/login" : "/super-admin/login";
  if (returnUrl) {
    return `${base}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return base;
}

/**
 * Full logout routine for Super Admin:
 * 1. Invokes backend `/auth/logout` endpoint to expire httpOnly cookies.
 * 2. Clears all client-side sessions and cookies.
 * 3. Navigates to proxy logout route to trigger server Set-Cookie: Max-Age=0 response headers.
 */
export async function executeAdminLogout(isSuperAdmin: boolean = false, customReturnUrl?: string) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
    await api.post("/auth/logout", {}, { withCredentials: true }).catch(() => {});
  } catch (err) {
    console.warn("Backend logout notification notice:", err);
  } finally {
    clearSuperAdminAuthSession();

    const host = window.location.hostname;
    const isSuperAdminSubdomain =
      host.startsWith("superadmin.") ||
      host === "superadmin.local" ||
      host.includes("superadmin");
    const isAdminSubdomain =
      host.startsWith("admin.") ||
      host === "admin.local" ||
      host.includes("admin");

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const domains = ["", `.${rootDomain}`, host];

    const cookiesToClear = [
      "appnix_admin_token",
      "appnix_admin_refresh_token",
      "appnix_access_token",
      "appnix_auth_token",
      "appnix_refresh_token",
      "appnix_superadmin_token",
      "appnix_superadmin_refresh_token",
    ];

    cookiesToClear.forEach((c) => {
      domains.forEach((d) => {
        const domainAttr = d ? `; domain=${d}` : "";
        document.cookie = `${c}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttr}`;
      });
    });

    if (customReturnUrl) {
      window.location.href = customReturnUrl;
      return;
    }

    if (isAdminSubdomain) {
      window.location.href = "/login";
    } else if (isSuperAdminSubdomain || isSuperAdmin) {
      window.location.href = "/super-admin/login";
    } else {
      window.location.href = "/admin/login";
    }
  }
}

export async function executeSuperAdminLogout(customReturnUrl?: string) {
  return executeAdminLogout(true, customReturnUrl);
}

// Response interceptor for auth errors (401 Unauthorized / 403 Forbidden)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (
      typeof window !== "undefined" &&
      (err.response?.status === 401 || err.response?.status === 403)
    ) {
      const currentPath = window.location.pathname;
      const isLoginPage =
        currentPath === "/login" ||
        currentPath === "/signin" ||
        currentPath.startsWith("/super-admin/login");

      if (!isLoginPage && !isLoggingOut) {
        isLoggingOut = true;
        clearSuperAdminAuthSession();

        const host = window.location.hostname;
        const isSuperAdminSubdomain =
          host.startsWith("superadmin.") ||
          host === "superadmin.local" ||
          host.includes("superadmin");

        const logoutPath = isSuperAdminSubdomain ? "/logout" : "/super-admin/logout";
        const returnUrl = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `${logoutPath}?returnUrl=${returnUrl}`;
      }
    }
    return Promise.reject(err);
  }
);

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  summary?: any;
}

export const superAdminApi = {
  // Auth
  login: async (credentials: { email: string; password: string; mfaCode?: string }) => {
    const res = await api.post("/auth/login", credentials);
    return res.data?.data || res.data;
  },

  logout: async () => {
    return executeSuperAdminLogout();
  },

  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data?.data || res.data;
  },

  // Dashboard
  getDashboardOverview: async () => {
    const res = await api.get("/dashboard/overview");
    return res.data?.data || res.data;
  },

  // Partners (White-Label Admins)
  getPartners: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<any>> => {
    const res = await api.get("/partners", { params });
    return res.data?.data || res.data;
  },

  getPartnerById: async (
    id: string,
    params?: { clientPage?: number; clientLimit?: number },
  ) => {
    const res = await api.get(`/partners/${id}`, { params });
    return res.data?.data || res.data;
  },

  getPartnerCommissionHistory: async (id: string) => {
    const res = await api.get(`/partners/${id}/commission-history`);
    return res.data?.data || res.data;
  },

  checkPartnerSlug: async (
    slug: string,
    excludeId?: string
  ): Promise<{ available: boolean; slug: string; reason?: string }> => {
    const res = await api.get("/partners/check-slug", { params: { slug, excludeId } });
    return res.data;
  },

  sendPartnerEmailOtp: async (email: string) => {
    const res = await api.post("/partners/send-otp", { email });
    return res.data?.data || res.data;
  },

  verifyPartnerEmailOtp: async (email: string, otp: string) => {
    const res = await api.post("/partners/verify-otp", { email, otp });
    return res.data?.data || res.data;
  },

  createPartner: async (data: any) => {
    const res = await api.post("/partners", data);
    return res.data?.data || res.data;
  },

  updatePartner: async (id: string, data: any) => {
    const res = await api.patch(`/partners/${id}`, data);
    return res.data?.data || res.data;
  },

  updatePartnerStatus: async (id: string, status: "ACTIVE" | "SUSPENDED" | "CANCELLED", reason?: string) => {
    const res = await api.patch(`/partners/${id}/status`, { status, reason });
    return res.data?.data || res.data;
  },

  impersonatePartner: async (id: string) => {
    const res = await api.post(`/partners/${id}/impersonate`);
    return res.data?.data || res.data;
  },

  // End Clients
  getClients: async (params?: {
    partnerId?: string;
    status?: string;
    plan?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<any>> => {
    const res = await api.get("/clients", { params });
    return res.data?.data || res.data;
  },

  getClientById: async (id: string) => {
    const res = await api.get(`/clients/${id}`);
    return res.data?.data || res.data;
  },

  updateClientStatus: async (id: string, status: "ACTIVE" | "SUSPENDED" | "CANCELLED", reason?: string) => {
    const res = await api.patch(`/clients/${id}/status`, { status, reason });
    return res.data?.data || res.data;
  },

  // Wholesale Plans
  getWholesalePlans: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<any>> => {
    const res = await api.get("/wholesale-plans", { params });
    return res.data?.data || res.data;
  },

  createWholesalePlan: async (data: any) => {
    const res = await api.post("/wholesale-plans", data);
    return res.data?.data || res.data;
  },

  updateWholesalePlan: async (id: string, data: any) => {
    const res = await api.patch(`/wholesale-plans/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteWholesalePlan: async (id: string) => {
    const res = await api.delete(`/wholesale-plans/${id}`);
    return res.data?.data || res.data;
  },

  // Subscriptions & Revenue
  getSubscriptions: async (params?: {
    subPage?: number;
    subLimit?: number;
    orderPage?: number;
    orderLimit?: number;
    search?: string;
  }) => {
    const res = await api.get("/subscriptions", { params });
    return res.data?.data || res.data;
  },

  // Channels & Usage
  getChannelUsage: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get("/channels/usage", { params });
    return res.data?.data || res.data;
  },

  // Health
  getSystemHealth: async () => {
    const res = await api.get("/health");
    return res.data?.data || res.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<any>> => {
    const res = await api.get("/audit-logs", { params });
    return res.data?.data || res.data;
  },
};
