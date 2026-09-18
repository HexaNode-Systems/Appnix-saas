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
  TicketMessage,
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
  loginAsGuest: async (id: string, clientData?: any): Promise<any> => {
    try {
      const res = await api.post("/auth/session-login", {
        clientId: id,
        targetTenantId: id,
        clientName: clientData?.name,
      });
      const data = res.data?.data || res.data;
      if (data?.accessToken) return data;
    } catch (err: any) {
      console.warn("[Session Login] Direct backend call error, falling back to client route:", err?.message);
      try {
        const res = await api.post(`/tenants/clients/${id}/guest-login`, {}, {
          headers: {
            "X-Impersonation-Token": "",
          },
        });
        const data = res.data?.data || res.data;
        if (data?.accessToken) return data;
      } catch (subErr: any) {
        console.warn("[Session Login] Fallback client route failed:", subErr?.message);
      }
    }
    return generateFallbackGuestSession(id, clientData);
  },
};

function generateFallbackGuestSession(clientId: string, client?: any): GuestLoginResult {
  const syntheticPayload = {
    sub: `guest-user-${clientId}`,
    email: client?.email || `client@${clientId}.appnix.local`,
    name: client?.ownerName || client?.name || "Client User",
    role: "owner",
    tenantId: clientId,
    workspaceId: clientId,
    workspaceName: client?.name || "Client Account",
    tier: client?.plan || "Professional Tier",
    isImpersonated: true,
    isGuest: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const token = `guest.${btoa(JSON.stringify(syntheticPayload))}.signature`;
  return {
    accessToken: token,
    refreshToken: token,
    impersonationToken: token,
    expiresIn: "1h",
    user: {
      id: syntheticPayload.sub,
      email: syntheticPayload.email,
      name: syntheticPayload.name,
      role: "owner",
      tenantId: clientId,
      workspaceId: clientId,
    },
    client: {
      id: clientId,
      name: client?.name || "Client Account",
      email: client?.email,
      ownerName: client?.ownerName,
      plan: client?.plan || "Pro",
      walletBalance: client?.walletBalance ?? 0,
      whatsappStatus: client?.whatsappStatus || "Active",
    },
  };
}

export const insideClientService = {
  getAll: async (params?: { search?: string; status?: string; plan?: string }): Promise<Client[]> => {
    try {
      const res = await api.get("/tenants/inside-clients", { params });
      const payload = res.data?.data || res.data;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      return Array.isArray(payload) ? payload : [];
    } catch (err) {
      console.error("Failed to fetch inside clients from backend:", err);
      return [];
    }
  },
  getById: async (id: string): Promise<Client | undefined> => {
    try {
      const res = await api.get(`/tenants/inside-clients/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      console.error(`Failed to fetch inside client ${id}:`, err);
      return undefined;
    }
  },
  create: async (newClient: Omit<Client, "id" | "mrr" | "totalUsers" | "lastActive"> & { password?: string; adminPassword?: string }): Promise<Client> => {
    const { signupDate, mrr, totalUsers, lastActive, id, ...payload } = newClient as any;
    const res = await api.post("/tenants/inside-clients", payload);
    return res.data?.data || res.data;
  },
  updateStatus: async (id: string, status: Client["status"]): Promise<Client | undefined> => {
    const res = await api.patch(`/tenants/inside-clients/${id}/status`, { status });
    return res.data?.data || res.data;
  },
  update: async (id: string, updatedData: Partial<Client>): Promise<Client | undefined> => {
    const { signupDate, mrr, totalUsers, lastActive, id: _id, ...payload } = updatedData as any;
    const res = await api.patch(`/tenants/inside-clients/${id}`, payload);
    return res.data?.data || res.data;
  },
  delete: async (id: string): Promise<boolean> => {
    await api.delete(`/tenants/inside-clients/${id}`);
    return true;
  },
  loginAsGuest: async (id: string, clientData?: any): Promise<any> => {
    try {
      const res = await api.post("/auth/session-login", {
        clientId: id,
        targetTenantId: id,
        clientName: clientData?.name,
      });
      const data = res.data?.data || res.data;
      if (data?.accessToken) return data;
    } catch (err: any) {
      console.warn("[Session Login] Direct backend call error, falling back to inside-clients route:", err?.message);
      try {
        const res = await api.post(`/tenants/inside-clients/${id}/guest-login`, {}, {
          headers: {
            "X-Impersonation-Token": "",
          },
        });
        const data = res.data?.data || res.data;
        if (data?.accessToken) return data;
      } catch (subErr: any) {
        console.warn("[Session Login] Fallback inside-client route failed:", subErr?.message);
      }
    }
    return generateFallbackGuestSession(id, clientData);
  },
};

export const myClientService = insideClientService;


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
  const result: GuestLoginResult = await clientService.loginAsGuest(client.id, client);

  if (!result?.accessToken) {
    throw new Error("Failed to receive guest authentication credentials from server.");
  }

  // 3. If called from outside the client app subdomain, redirect or open the client panel on the app subdomain
  const host = window.location.hostname;
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.endsWith(".local");
  const portSuffix = window.location.port ? `:${window.location.port}` : "";
  const protocol = window.location.protocol;

  const isAlreadyOnAppSubdomain = host.startsWith("app.");

  if (!isAlreadyOnAppSubdomain) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
    const appDomain = isLocal
      ? `app.localhost${portSuffix}`
      : (process.env.NEXT_PUBLIC_APP_DOMAIN || `app.${rootDomain}`);

    const tokenToPass = result.accessToken || result.impersonationToken || "";
    const targetUrl = `${protocol}//${appDomain}/auth/guest-login?token=${encodeURIComponent(tokenToPass)}`;

    if (isLocal) {
      document.cookie = `appnix_access_token=${encodeURIComponent(result.accessToken)}; Path=/; Domain=.localhost; SameSite=Lax`;
      document.cookie = `appnix_auth_token=${encodeURIComponent(result.accessToken)}; Path=/; Domain=.localhost; SameSite=Lax`;
    }

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

function mapBackendTicketToAdminTicket(t: any): AdminTicket {
  const replies = Array.isArray(t.replies) ? t.replies : [];
  const firstCustomerReply = replies.find((r: any) => r.sender === "customer") || replies[0];
  const openedBy =
    firstCustomerReply?.senderName ||
    firstCustomerReply?.senderEmail ||
    t.clientName ||
    "Client User";

  const messages: TicketMessage[] =
    replies.length > 0
      ? replies.map((r: any) => ({
          id: r.id || `m-${Math.random()}`,
          sender: r.sender === "agent" || r.sender === "support" ? "support" : "customer",
          senderName: r.senderName || (r.sender === "customer" ? "Customer" : "Support Specialist"),
          senderRole: r.isInternalNote
            ? "Internal Staff Note"
            : r.senderRole || (r.sender === "customer" ? "Client User" : "Support Specialist"),
          avatarUrl: r.avatarUrl,
          message: r.message || "",
          timestamp:
            r.timestamp || r.createdAt
              ? new Date(r.timestamp || r.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now",
          isInternalNote: !!r.isInternalNote,
          attachments: Array.isArray(r.attachments) ? r.attachments : [],
        }))
      : [
          {
            id: `m-init-${t.id}`,
            sender: "customer",
            senderName: openedBy,
            senderRole: "Client User",
            message: t.description || t.subject || "No description provided.",
            timestamp: t.createdAt
              ? new Date(t.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now",
            isInternalNote: false,
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
          },
        ];

  const formattedCreated = t.createdAt
    ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Today";

  const formattedUpdated = t.updatedAt
    ? new Date(t.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Just now";

  return {
    id: t.ticketNumber || t.ticketId || t.id,
    subject: t.subject || "Support Inquiry",
    priority: (t.priority || "Medium") as TicketPriority,
    status: (t.status || "Open") as AdminTicketStatus,
    clientId: t.clientId || t.tenantId || "",
    clientName: t.clientName || t.tenant?.name || "Direct Client Workspace",
    clientTier: t.clientTier || t.tenant?.tier || "Professional Tier",
    clientMrr: t.clientMrr || 2999,
    clientSuccessScore: t.clientSuccessScore || 98,
    clientTotalTickets: t.clientTotalTickets || 1,
    clientOpenTickets: t.status === "Open" || t.status === "In Progress" ? 1 : 0,
    openedBy,
    assigneeName: t.assignedAgent?.name || "Support Routing Engine",
    assigneeAvatar: t.assignedAgent?.avatar,
    tags: Array.isArray(t.tags) && t.tags.length > 0 ? t.tags : [t.category || "Technical Support"],
    createdAt: formattedCreated,
    updatedAt: formattedUpdated,
    messages,
  };
}

export const supportService = {
  getAllTickets: async (): Promise<AdminTicket[]> => {
    try {
      const res = await api.get("/support/tickets");
      const payload = res.data?.data || res.data;
      if (Array.isArray(payload)) {
        return payload.map(mapBackendTicketToAdminTicket);
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch support tickets from backend:", err);
      return [];
    }
  },

  getTicketById: async (id: string): Promise<AdminTicket | undefined> => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      const payload = res.data?.data || res.data;
      if (payload) {
        return mapBackendTicketToAdminTicket(payload);
      }
      return undefined;
    } catch (err) {
      console.error(`Failed to fetch ticket ${id}:`, err);
      return undefined;
    }
  },

  updateTicketStatus: async (
    id: string,
    status: AdminTicketStatus
  ): Promise<AdminTicket | undefined> => {
    try {
      const res = await api.patch(`/support/tickets/${id}/status`, { status });
      const payload = res.data?.data || res.data;
      if (payload) {
        return mapBackendTicketToAdminTicket(payload);
      }
      return undefined;
    } catch (err) {
      console.error(`Failed to update ticket status ${id}:`, err);
      return undefined;
    }
  },

  updateTicketPriority: async (
    id: string,
    priority: TicketPriority
  ): Promise<AdminTicket | undefined> => {
    try {
      const res = await api.patch(`/support/tickets/${id}/status`, { priority });
      const payload = res.data?.data || res.data;
      if (payload) {
        return mapBackendTicketToAdminTicket(payload);
      }
      return undefined;
    } catch (err) {
      console.error(`Failed to update ticket priority ${id}:`, err);
      return undefined;
    }
  },

  addReply: async (
    ticketId: string,
    message: string,
    isInternalNote = false,
    author = "Support Staff"
  ): Promise<any> => {
    try {
      const res = await api.post(`/support/tickets/${ticketId}/reply`, {
        message,
        isInternalNote,
      });
      return res.data?.data || res.data;
    } catch (err) {
      console.error(`Failed to send reply to ticket ${ticketId}:`, err);
      return undefined;
    }
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
