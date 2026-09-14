import { api } from "@/lib/api/axios";
import { config } from "@/lib/config";
import {
  mockTickets,
  mockStaff,
  mockAuditLogs,
  mockFeatureFlags,
  mockServiceHealth,
  clientGrowthChartData,
} from "../mock";
import {
  Client,
  PlanTier,
  AdminTicket,
  StaffMember,
  AuditLogEntry,
  FeatureFlag,
  ServiceHealth,
  AdminTicketStatus,
  TicketPriority,
} from "../types";

export const clientService = {
  getAll: async (params?: { search?: string; status?: string; plan?: string }): Promise<Client[]> => {
    try {
      const res = await api.get("/tenants/clients", { params });
      const payload = res.data?.data || res.data;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return Array.isArray(payload) ? payload : [];
    } catch (err) {
      console.error("Failed to fetch clients from backend:", err);
      return [];
    }
  },
  getById: async (id: string): Promise<Client | undefined> => {
    try {
      const res = await api.get(`/tenants/clients/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      console.error(`Failed to fetch client ${id}:`, err);
      return undefined;
    }
  },
  create: async (newClient: Omit<Client, "id" | "mrr" | "totalUsers" | "lastActive"> & { password?: string }): Promise<Client> => {
    const { signupDate, mrr, totalUsers, lastActive, id, ...payload } = newClient as any;
    const res = await api.post("/tenants/clients", payload);
    return res.data?.data || res.data;
  },
  updateStatus: async (id: string, status: Client["status"]): Promise<Client | undefined> => {
    const res = await api.patch(`/tenants/clients/${id}/status`, { status });
    return res.data?.data || res.data;
  },
  update: async (id: string, updatedData: Partial<Client>): Promise<Client | undefined> => {
    const { signupDate, mrr, totalUsers, lastActive, id: _id, ...payload } = updatedData as any;
    const res = await api.patch(`/tenants/clients/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: string): Promise<boolean> => {
    await api.delete(`/tenants/clients/${id}`);
    return true;
  },
  loginAsGuest: async (id: string): Promise<any> => {
    const res = await api.post(`/tenants/clients/${id}/guest-login`, {}, {
      headers: {
        "X-Impersonation-Token": "",
      },
    });
    return res.data?.data || res.data;
  },
};

export interface GuestLoginResult {
  accessToken: string;
  refreshToken: string;
  impersonationToken?: string;
  expiresIn?: string;
  user: any;
  client: any;
}

export async function executeGuestLogin(client: any, returnUrl: string): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Clear any stale support impersonation token from previous inspection sessions
  sessionStorage.removeItem("appnix_impersonation_token");
  localStorage.removeItem("appnix_impersonation_token");

  // 2. Back up current administrative session credentials
  const backup = {
    authToken: localStorage.getItem(config.auth.tokenKey),
    refreshToken: localStorage.getItem(config.auth.refreshTokenKey),
    user: localStorage.getItem(config.auth.userKey),
    adminToken: localStorage.getItem(config.auth.adminTokenKey) || localStorage.getItem("appnix_admin_token"),
    adminRefreshToken: localStorage.getItem(config.auth.adminRefreshTokenKey) || localStorage.getItem("appnix_admin_refresh_token"),
    adminUser: localStorage.getItem(config.auth.adminUserKey) || localStorage.getItem("appnix_admin_user"),
    superAdminToken: localStorage.getItem(config.auth.superAdminTokenKey),
    superAdminRefreshToken: localStorage.getItem(config.auth.superAdminRefreshTokenKey),
    superAdminUser: localStorage.getItem(config.auth.superAdminUserKey),
    returnUrl: returnUrl || "/admin/clients",
  };
  localStorage.setItem("appnix_guest_backup", JSON.stringify(backup));

  // 2. Call backend guest login endpoint
  const result: GuestLoginResult = await clientService.loginAsGuest(client.id);

  if (!result?.accessToken) {
    throw new Error("Failed to receive guest authentication credentials from server.");
  }

  // 3. If called from an admin portal subdomain (e.g. superadmin or partners), open the client panel on the app subdomain
  const host = window.location.hostname;
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.endsWith(".local");
  const portSuffix = window.location.port ? `:${window.location.port}` : "";
  const protocol = window.location.protocol;

  const isCrossDomain =
    host.startsWith("superadmin.") ||
    host.startsWith("partners.") ||
    host.startsWith("admin.");

  if (isCrossDomain) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const appDomain = isLocal
      ? `app.localhost${portSuffix}`
      : (process.env.NEXT_PUBLIC_APP_DOMAIN || `app.${rootDomain}`);

    const targetUrl = `${protocol}//${appDomain}/auth/guest-login?token=${encodeURIComponent(result.accessToken)}`;
    const newWin = window.open(targetUrl, "_blank");
    if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
      window.location.href = targetUrl;
    }
    return;
  }

  // 4. Store active guest session info (for same-domain context)
  const guestSession = {
    isGuest: true,
    clientId: client.id,
    clientName: result.client?.name || client.name,
    clientEmail: result.client?.email || client.email || result.user?.email,
    ownerName: result.client?.ownerName || client.ownerName || result.user?.name,
    plan: result.client?.plan || client.plan || "Pro",
    walletBalance: result.client?.walletBalance ?? client.walletBalance ?? 0,
    whatsappStatus: result.client?.whatsappStatus || client.whatsappStatus || "Active",
    loginTime: new Date().toISOString(),
    returnUrl: returnUrl || "/admin/clients",
    impersonationToken: result.impersonationToken,
  };
  localStorage.setItem("appnix_guest_impersonation", JSON.stringify(guestSession));

  // 5. Update access tokens for the guest session
  localStorage.setItem(config.auth.tokenKey, result.accessToken);
  localStorage.setItem("appnix_auth_token", result.accessToken);
  localStorage.setItem("appnix_access_token", result.accessToken);
  if (result.refreshToken) {
    localStorage.setItem(config.auth.refreshTokenKey, result.refreshToken);
  }
  if (result.user) {
    localStorage.setItem(config.auth.userKey, JSON.stringify(result.user));
    localStorage.setItem("appnix_user", JSON.stringify(result.user));
  }
  if (result.impersonationToken) {
    sessionStorage.setItem("appnix_impersonation_token", result.impersonationToken);
    localStorage.setItem("appnix_impersonation_token", result.impersonationToken);
  }

  // 6. Update auth cookie so Next.js Proxy allows dashboard navigation
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `appnix_access_token=${encodeURIComponent(result.accessToken)}; Path=/; SameSite=Lax${secure}`;
  document.cookie = `appnix_auth_token=${encodeURIComponent(result.accessToken)}; Path=/; SameSite=Lax${secure}`;

  // 7. Hard redirect to load fresh client context and state
  window.location.href = "/dashboard";
}

const CUSTOM_PLANS_COOKIE = "appnix_custom_plans";
const CUSTOM_PLANS_STORAGE = "appnix_custom_plans";

export function getSharedCustomPlans(): PlanTier[] {
  if (typeof window === "undefined") return [];
  try {
    // 1. Try cookie first (shared across .appnix.co.in subdomains)
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CUSTOM_PLANS_COOKIE}=([^;]+)`));
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // 2. Try localStorage
    const stored = localStorage.getItem(CUSTOM_PLANS_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveSharedCustomPlan(plan: PlanTier): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSharedCustomPlans();
    const idx = existing.findIndex((p) => p.id === plan.id || p.name.toLowerCase() === plan.name.toLowerCase());
    if (idx !== -1) {
      existing[idx] = plan;
    } else {
      existing.push(plan);
    }
    const jsonStr = JSON.stringify(existing);
    localStorage.setItem(CUSTOM_PLANS_STORAGE, jsonStr);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const domains = ["", `.${rootDomain}`, window.location.hostname];
    domains.forEach((d) => {
      const domainAttr = d ? `; domain=${d}` : "";
      document.cookie = `${CUSTOM_PLANS_COOKIE}=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;
    });
  } catch {}
}

export function removeSharedCustomPlan(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSharedCustomPlans().filter((p) => p.id !== id);
    const jsonStr = JSON.stringify(existing);
    localStorage.setItem(CUSTOM_PLANS_STORAGE, jsonStr);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const domains = ["", `.${rootDomain}`, window.location.hostname];
    domains.forEach((d) => {
      const domainAttr = d ? `; domain=${d}` : "";
      document.cookie = `${CUSTOM_PLANS_COOKIE}=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;
    });
  } catch {}
}

export const billingService = {
  getPlans: async (): Promise<PlanTier[]> => {
    try {
      const res = await api.get("/billing/plans");
      const payload = res.data?.data || res.data;
      if (Array.isArray(payload)) {
        return payload;
      }
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return [];
    } catch (err) {
      console.error("[BillingService] Failed to load plans:", err);
      return [];
    }
  },

  savePlan: async (plan: PlanTier): Promise<PlanTier> => {
    const isExisting = plan.id && !plan.id.startsWith("mock-") && !plan.id.startsWith("plan_new");
    if (isExisting) {
      try {
        const res = await api.patch(`/billing/plans/${encodeURIComponent(plan.id)}`, plan);
        return res.data?.data || res.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          // If not found in reseller scope, create as a new tenant plan
          const res = await api.post("/billing/plans", plan);
          return res.data?.data || res.data;
        }
        throw err;
      }
    } else {
      const res = await api.post("/billing/plans", plan);
      return res.data?.data || res.data;
    }
  },
  deletePlan: async (id: string): Promise<void> => {
    removeSharedCustomPlan(id);
    await api.delete(`/billing/plans/${encodeURIComponent(id)}`);
  },
};

export const supportService = {
  getAllTickets: async (): Promise<AdminTicket[]> => {
    return [...mockTickets];
  },
  getTicketById: async (id: string): Promise<AdminTicket | undefined> => {
    return mockTickets.find((t) => t.id === id);
  },
  updateTicketStatus: async (id: string, status: AdminTicketStatus): Promise<AdminTicket | undefined> => {
    const ticket = mockTickets.find((t) => t.id === id);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = "Just now";
    }
    return ticket;
  },
  updateTicketPriority: async (id: string, priority: TicketPriority): Promise<AdminTicket | undefined> => {
    const ticket = mockTickets.find((t) => t.id === id);
    if (ticket) {
      ticket.priority = priority;
      ticket.updatedAt = "Just now";
    }
    return ticket;
  },
  addReply: async (
    ticketId: string,
    message: string,
    isInternalNote = false,
    author = "Super Admin"
  ): Promise<AdminTicket | undefined> => {
    const ticket = mockTickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.messages.push({
        id: `m-${Date.now()}`,
        sender: "support",
        senderName: author,
        senderRole: isInternalNote ? "Internal Staff Note" : "Super Admin",
        avatarUrl: "https://i.pravatar.cc/56?img=47",
        message,
        timestamp: "Just now",
        isInternalNote,
      });
      ticket.updatedAt = "Just now";
      if (!isInternalNote && ticket.status === "Waiting for Customer") {
        ticket.status = "In Progress";
      }
    }
    return ticket;
  },
};

export const staffService = {
  getAll: async (): Promise<StaffMember[]> => {
    return [...mockStaff];
  },
  create: async (newStaff: Omit<StaffMember, "id" | "lastActive" | "createdAt">): Promise<StaffMember> => {
    const created: StaffMember = {
      ...newStaff,
      id: `st-${Date.now()}`,
      lastActive: "Just now",
      createdAt: "Today",
    };
    mockStaff.unshift(created);
    return created;
  },
};

export const auditService = {
  getAll: async (): Promise<AuditLogEntry[]> => {
    return [...mockAuditLogs];
  },
};

export const featureFlagService = {
  getAll: async (): Promise<FeatureFlag[]> => {
    return [...mockFeatureFlags];
  },
  toggle: async (id: string): Promise<FeatureFlag | undefined> => {
    const flag = mockFeatureFlags.find((f) => f.id === id);
    if (flag) {
      flag.isEnabled = !flag.isEnabled;
      flag.lastUpdated = "Just now";
      flag.updatedBy = "Super Admin";
    }
    return flag;
  },
  save: async (flag: FeatureFlag): Promise<FeatureFlag> => {
    const index = mockFeatureFlags.findIndex((f) => f.id === flag.id);
    if (index !== -1) {
      mockFeatureFlags[index] = flag;
    } else {
      mockFeatureFlags.unshift(flag);
    }
    return flag;
  },
};

export const systemHealthService = {
  getHealth: async (): Promise<ServiceHealth[]> => {
    return [...mockServiceHealth];
  },
};

export const analyticsService = {
  getGrowthChartData: async () => {
    return [...clientGrowthChartData];
  },
};
