import { api } from "@/lib/api/axios";
import { config } from "@/lib/config";
import {
  mockPlans,
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
  create: async (newClient: Omit<Client, "id" | "mrr" | "totalUsers" | "lastActive">): Promise<Client> => {
    const res = await api.post("/tenants/clients", newClient);
    return res.data?.data || res.data;
  },
  updateStatus: async (id: string, status: Client["status"]): Promise<Client | undefined> => {
    const res = await api.patch(`/tenants/clients/${id}/status`, { status });
    return res.data?.data || res.data;
  },
  update: async (id: string, updatedData: Partial<Client>): Promise<Client | undefined> => {
    const res = await api.patch(`/tenants/clients/${id}`, updatedData);
    return res.data?.data || res.data;
  },
  delete: async (id: string): Promise<boolean> => {
    await api.delete(`/tenants/clients/${id}`);
    return true;
  },
  loginAsGuest: async (id: string): Promise<any> => {
    const res = await api.post(`/tenants/clients/${id}/guest-login`);
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

  // 1. Back up current administrative session credentials
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

  // 3. Store active guest session info
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

  // 4. Update access tokens for the guest session
  localStorage.setItem(config.auth.tokenKey, result.accessToken);
  if (result.refreshToken) {
    localStorage.setItem(config.auth.refreshTokenKey, result.refreshToken);
  }
  if (result.user) {
    localStorage.setItem(config.auth.userKey, JSON.stringify(result.user));
  }
  if (result.impersonationToken) {
    sessionStorage.setItem("appnix_impersonation_token", result.impersonationToken);
    localStorage.setItem("appnix_impersonation_token", result.impersonationToken);
  }

  // 5. Update auth cookie so Next.js Proxy allows dashboard navigation
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `appnix_access_token=${encodeURIComponent(result.accessToken)}; Path=/; SameSite=Lax${secure}`;

  // 6. Hard redirect to load fresh client context and state
  window.location.href = "/dashboard";
}

export const billingService = {
  getPlans: async (): Promise<PlanTier[]> => {
    return [...mockPlans];
  },
  savePlan: async (plan: PlanTier): Promise<PlanTier> => {
    const index = mockPlans.findIndex((p) => p.id === plan.id);
    if (index !== -1) {
      mockPlans[index] = plan;
    } else {
      mockPlans.push(plan);
    }
    return plan;
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
