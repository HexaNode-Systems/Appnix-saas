import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError, type AxiosResponse } from "axios";
import { config } from "@/lib/config";

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: config.api.proxyPrefix,
    timeout: config.api.timeout,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  instance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("appnix_superadmin_token") ||
          localStorage.getItem(config.auth.superAdminTokenKey) ||
          localStorage.getItem(config.auth.tokenKey) ||
          localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem("appnix_admin_token");
        if (token && requestConfig.headers) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }

        if (requestConfig.headers && !requestConfig.headers["x-forwarded-host"]) {
          requestConfig.headers["x-forwarded-host"] = window.location.host;
        }

        const url = requestConfig.url || "";
        const isAuthOrImpersonateEndpoint =
          url.includes("/guest-login") ||
          url.includes("/impersonate") ||
          url.includes("/auth/");

        const impersonationToken =
          sessionStorage.getItem("appnix_impersonation_token") ||
          localStorage.getItem("appnix_impersonation_token");

        if (impersonationToken && !isAuthOrImpersonateEndpoint && requestConfig.headers) {
          let isExpired = false;
          try {
            const parts = impersonationToken.split(".");
            if (parts.length >= 2) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
              if (payload.exp && typeof payload.exp === "number") {
                isExpired = payload.exp * 1000 < Date.now();
              }
            } else {
              isExpired = true;
            }
          } catch {
            isExpired = true;
          }

          if (isExpired) {
            sessionStorage.removeItem("appnix_impersonation_token");
            localStorage.removeItem("appnix_impersonation_token");
          } else {
            requestConfig.headers["X-Impersonation-Token"] = impersonationToken;
          }
        }
      }
      return requestConfig;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/login") ||
        originalRequest?.url?.includes("/auth/session-login") ||
        originalRequest?.url?.includes("/auth/signup") ||
        originalRequest?.url?.includes("/auth/forgot-password") ||
        originalRequest?.url?.includes("/auth/reset-password") ||
        originalRequest?.url?.includes("/auth/verify-otp") ||
        originalRequest?.url?.includes("/auth/google");

      if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem(config.auth.refreshTokenKey);
          if (refreshToken) {
            const response = await axios.post(
              `${config.api.proxyPrefix}/auth/refresh`,
              { refreshToken },
              {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
                withCredentials: true,
              }
            );

            const refreshData = response.data?.data || response.data;
            const accessToken = refreshData?.accessToken;
            const newRefreshToken = refreshData?.refreshToken;

            if (accessToken) {
              localStorage.setItem(config.auth.tokenKey, accessToken);
              if (newRefreshToken) {
                localStorage.setItem(config.auth.refreshTokenKey, newRefreshToken);
              }
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return instance(originalRequest);
            }
          }
        } catch {
          if (typeof window !== "undefined") {
            localStorage.removeItem(config.auth.tokenKey);
            const secure = window.location.protocol === "https:" ? "; Secure" : "";
            document.cookie = `appnix_access_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
            localStorage.removeItem(config.auth.refreshTokenKey);
            localStorage.removeItem(config.auth.userKey);
            window.location.href = "/signin";
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const api = createAxiosInstance();

export const apiEndpoints = {
  auth: {
    login: "/auth/login",
    sessionLogin: "/auth/session-login",
    signup: "/auth/signup",
    register: "/auth/signup",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    verifyOtp: "/auth/verify-otp",
    resendOtp: "/auth/resend-otp",
    me: "/auth/me",
  },
  user: {
    profile: "/user/profile",
    update: "/user/profile",
    avatar: "/user/avatar",
  },
  dashboard: {
    stats: "/dashboard/stats",
    activity: "/dashboard/activity",
  },
  inbox: {
    conversations: "/inbox/conversations",
    messages: "/inbox/messages",
    send: "/inbox/send",
  },
  campaigns: {
    list: "/api/campaigns",
    create: "/api/campaigns",
    get: (id: string) => `/api/campaigns/${id}`,
    update: (id: string) => `/api/campaigns/${id}`,
    delete: (id: string) => `/api/campaigns/${id}`,
    audiences: "/api/campaigns/audiences",
    channels: "/api/campaigns/channels",
    templates: "/api/campaigns/templates",
    templatesRefresh: "/api/campaigns/templates/refresh",
    selectAudience: (id: string) => `/api/campaigns/${id}/audience`,
    selectChannel: (id: string) => `/api/campaigns/${id}/channel`,
    selectTemplate: (id: string) => `/api/campaigns/${id}/template`,
    configureTemplate: (id: string) => `/api/campaigns/${id}/configure-template`,
    sendTest: (id: string) => `/api/campaigns/${id}/test`,
    validate: (id: string) => `/api/campaigns/${id}/validate`,
    launch: (id: string) => `/api/campaigns/${id}/launch`,
    schedule: (id: string) => `/api/campaigns/${id}/schedule`,
  },
  contacts: {
    list: "/contacts",
    create: "/contacts",
    get: (id: string) => `/contacts/${id}`,
    update: (id: string) => `/contacts/${id}`,
    delete: (id: string) => `/contacts/${id}`,
    import: "/contacts/import",
    export: "/contacts/export",
  },
  bots: {
    list: "/bots",
    create: "/bots",
    get: (id: string) => `/bots/${id}`,
    update: (id: string) => `/bots/${id}`,
    delete: (id: string) => `/bots/${id}`,
    test: (id: string) => `/bots/${id}/test`,
    publish: (id: string) => `/bots/${id}/publish`,
    duplicate: (id: string) => `/bots/${id}/duplicate`,
    folders: "/bots/folders",
    createFolder: "/bots/folders",
    deleteFolder: (id: string) => `/bots/folders/${id}`,
  },
  automations: {
    list: "/automations",
    create: "/automations",
    get: (id: string) => `/automations/${id}`,
    update: (id: string) => `/automations/${id}`,
    delete: (id: string) => `/automations/${id}`,
    toggle: (id: string) => `/automations/${id}/toggle`,
  },
  appCredentials: {
    catalog: "/automations/app-credentials/catalog",
    summary: "/automations/app-credentials/summary",
    list: "/automations/app-credentials",
    create: "/automations/app-credentials",
    get: (id: string) => `/automations/app-credentials/${id}`,
    update: (id: string) => `/automations/app-credentials/${id}`,
    delete: (id: string) => `/automations/app-credentials/${id}`,
    test: (id: string) => `/automations/app-credentials/${id}/test`,
    validateLive: "/automations/app-credentials/validate-live",
  },
  analytics: {
    overview: "/analytics/overview",
    conversations: "/analytics/conversations",
    campaigns: "/analytics/campaigns",
    bots: "/analytics/bots",
    revenue: "/analytics/revenue",
  },
  team: {
    members: "/team/members",
    invite: "/team/invite",
    remove: (id: string) => `/team/members/${id}`,
    updateRole: (id: string) => `/team/members/${id}/role`,
  },
  billing: {
    plans: "/billing/plans",
    subscription: "/billing/subscription",
    invoices: "/billing/invoices",
    wallet: "/billing/wallet",
    checkout: "/billing/checkout",
  },
  whitelabel: {
    settings: "/whitelabel/settings",
    domains: "/whitelabel/domains",
    branding: "/whitelabel/branding",
  },
} as const;
