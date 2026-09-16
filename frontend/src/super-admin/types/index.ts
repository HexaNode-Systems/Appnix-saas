export type ClientStatus = "Active" | "Suspended" | "Trial" | "Inactive";
export type WhatsAppStatus = "Connected" | "Disconnected" | "Pending";

export interface Client {
  id: string;
  name: string;
  slug?: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: "Starter" | "Growth" | "Pro" | "Enterprise";
  status: ClientStatus;
  whatsappStatus: WhatsAppStatus;
  walletBalance: number; // e.g. 4250.00 or -120.00
  signupDate: string;
  mrr: number;
  totalUsers: number;
  lastActive: string;
  isInsideClient?: boolean;
  subdomain?: string;
}

export interface PlanTier {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  userLimit: number | "Unlimited";
  apiLimit: string;
  storageLimit: string;
  supportSla: string;
  features: string[];
  isPopular?: boolean;
  customDomain: boolean;
  sso: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type AdminTicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting for Customer"
  | "Resolved"
  | "Closed";

export interface TicketMessage {
  id: string;
  sender: "customer" | "support" | "system";
  senderName: string;
  senderRole: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
  isInternalNote?: boolean;
  attachments?: string[];
}

export interface AdminTicket {
  id: string; // e.g. TKT-8902
  subject: string;
  priority: TicketPriority;
  status: AdminTicketStatus;
  clientId: string;
  clientName: string;
  clientTier: string;
  clientMrr: number;
  clientSuccessScore: number;
  clientTotalTickets: number;
  clientOpenTickets: number;
  openedBy: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export type StaffRole =
  | "Super Admin"
  | "Admin"
  | "Support Agent"
  | "Billing Manager"
  | "Developer"
  | "Analyst";

export type StaffStatus = "Active" | "Inactive" | "Suspended";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  avatarUrl?: string;
  lastActive: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  description: string;
  actor: string;
  actorEmail?: string;
  actorRole?: string;
  timestamp: string;
  ip: string;
  category: "Configuration" | "User" | "Security" | "FeatureFlag" | "Billing";
  status: "Success" | "Warning" | "Failed";
}

export type FlagEnvironment = "Production" | "Staging" | "Beta" | "All";

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  environment: FlagEnvironment;
  updatedBy: string;
  lastUpdated: string;
  impactLevel: "Low" | "Medium" | "High";
}

export type HealthStatus = "Operational" | "Degraded" | "Down";

export interface ServiceHealth {
  id: string;
  name: string;
  category: "Core API" | "Database" | "Channel Gateway" | "Workers" | "Storage";
  status: HealthStatus;
  uptimePercentage: number;
  responseTimeMs: number;
  errorRate: number;
  lastIncident?: string;
}
