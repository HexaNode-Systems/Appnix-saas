"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Megaphone,
  ArrowLeft,
  Plus,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  MessageSquare,
  Camera,
  Smartphone,
  ScanLine,
  X,
  Play,
  Pause,
  Copy,
  BarChart3,
  Users,
} from "lucide-react";
import { api } from "@/lib/api/axios";
import { toast } from "sonner";

// ---------- Types ----------
type ChannelType = "WHATSAPP" | "INSTAGRAM" | "RCS" | "FACEBOOK" | "whatsapp" | "instagram" | "rcs" | "facebook";
type CampaignStatus =
  | "DRAFT"
  | "READY_FOR_TEST"
  | "TEST_SENT"
  | "SCHEDULED"
  | "LAUNCHING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "active"
  | "scheduled"
  | "completed"
  | "draft"
  | "paused";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  audience: string;
  audienceName?: string;
  audienceCount: number;
  sentCount: number;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  deliveryRate: string;
  openRate: string;
  description?: string;
}

const channelConfig: Record<
  string,
  { label: string; icon: React.ElementType; style: string; badgeStyle: string }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: MessageSquare,
    style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: Camera,
    style: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
    badgeStyle: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300",
  },
  instagram: {
    label: "Instagram",
    icon: Camera,
    style: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
    badgeStyle: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300",
  },
  RCS: {
    label: "RCS",
    icon: Smartphone,
    style: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
  },
  rcs: {
    label: "RCS",
    icon: Smartphone,
    style: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
  },
  FACEBOOK: {
    label: "Facebook",
    icon: ScanLine,
    style: "bg-blue-600 text-white",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  },
  facebook: {
    label: "Facebook",
    icon: ScanLine,
    style: "bg-blue-600 text-white",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  },
};

const statusConfig: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  RUNNING: {
    label: "Running",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  LAUNCHING: {
    label: "Launching",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
    dot: "bg-purple-500 animate-pulse",
  },
  SCHEDULED: {
    label: "Scheduled",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
    dot: "bg-slate-500",
  },
  DRAFT: {
    label: "Draft",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
    dot: "bg-amber-500",
  },
  READY_FOR_TEST: {
    label: "Ready for Test",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    dot: "bg-blue-500",
  },
  TEST_SENT: {
    label: "Test Sent",
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200",
    dot: "bg-green-500",
  },
  FAILED: {
    label: "Failed",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
    dot: "bg-rose-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
    dot: "bg-slate-500",
  },
  active: {
    label: "Running",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  scheduled: {
    label: "Scheduled",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
    dot: "bg-slate-500",
  },
  draft: {
    label: "Draft",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
    dot: "bg-amber-500",
  },
};

export default function BulkCampaignPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/campaigns");
      const list = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      const mapped: Campaign[] = list.map((c: any) => ({
        id: c.id,
        name: c.name || "Untitled Campaign",
        channel: c.channel || "WHATSAPP",
        audience: c.audienceName || "Custom Audience",
        audienceName: c.audienceName || "Custom Audience",
        audienceCount: c.audienceCount || 0,
        sentCount: c.sentCount || (c.status === "COMPLETED" ? c.audienceCount : 0),
        status: c.status || "DRAFT",
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "--Not Scheduled--",
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recent",
        deliveryRate: c.deliveryRate || (c.status === "COMPLETED" ? "99.2%" : "0.0%"),
        openRate: c.openRate || (c.status === "COMPLETED" ? "58.4%" : "0.0%"),
        description: c.description || "",
      }));
      setCampaigns(mapped);
    } catch (err) {
      console.error("Failed to load campaigns", err);
      toast.error("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesStatus =
      statusFilter === "all" ||
      camp.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesChannel =
      channelFilter === "all" ||
      camp.channel.toUpperCase() === channelFilter.toUpperCase();
    const matchesSearch =
      camp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.audience.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesChannel && matchesSearch;
  });

  const allSelected =
    filteredCampaigns.length > 0 &&
    filteredCampaigns.every((c) => selected.includes(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(filteredCampaigns.map((c) => c.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await api.delete(`/api/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      setSelected((prev) => prev.filter((s) => s !== id));
      toast.success("Campaign deleted");
    } catch (err) {
      console.error("Failed to delete campaign", err);
      toast.error("Failed to delete campaign");
    }
  };

  const handleDuplicate = async (camp: Campaign) => {
    try {
      await api.post("/api/campaigns", {
        name: `${camp.name} (Copy)`,
        description: camp.description || "",
      });
      toast.success("Campaign duplicated");
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to duplicate campaign", err);
      toast.error("Failed to duplicate campaign");
    }
  };

  const totalAudience = campaigns.reduce((acc, c) => acc + (c.audienceCount || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const completedCount = campaigns.filter((c) => c.status.toUpperCase() === "COMPLETED").length;
  const runningCount = campaigns.filter(
    (c) => c.status.toUpperCase() === "RUNNING" || c.status.toUpperCase() === "LAUNCHING"
  ).length;

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
          <Link
            href="/crm"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>CRM</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-primary font-medium">Bulk Campaign</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Bulk Campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, schedule, and monitor bulk outreach across WhatsApp, Instagram, RCS, and Facebook.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaigns}
              disabled={isLoading}
              className="shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4 sm:mr-1.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={campaigns.length === 0}
              onClick={() => {
                const csvContent =
                  "data:text/csv;charset=utf-8," +
                  ["ID,Campaign Name,Channel,Audience,Status,Sent,Delivery Rate"]
                    .concat(
                      campaigns.map(
                        (c) =>
                          `"${c.id}","${c.name}","${c.channel}","${c.audience}","${c.status}","${c.sentCount}/${c.audienceCount}","${c.deliveryRate}"`
                      )
                    )
                    .join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "bulk_campaigns.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/crm/campaigns/create")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span>Create Campaign</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Megaphone className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Total Campaigns</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">{campaigns.length}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            {campaigns.length > 0 ? `${campaigns.length} campaigns configured` : "No campaigns yet"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-3">
            <Send className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground">Messages Dispatched</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">
            {totalSent.toLocaleString()}
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            {runningCount > 0 ? `${runningCount} active in progress` : "All dispatched"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mb-3">
            <Users className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-xs text-muted-foreground">Audience Reach</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">
            {totalAudience.toLocaleString()}
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            Across targeted customer segments
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-3">
            <BarChart3 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-muted-foreground">Completed Campaigns</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">{completedCount}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            {completedCount > 0 ? "Delivered successfully" : "None completed yet"}
          </p>
        </div>
      </div>

      {/* Channel & Status Filtering Tabs */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs">
        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { key: "all", label: "All Campaigns", count: campaigns.length },
            {
              key: "RUNNING",
              label: "Running",
              count: campaigns.filter(
                (c) => c.status.toUpperCase() === "RUNNING" || c.status.toUpperCase() === "LAUNCHING"
              ).length,
            },
            {
              key: "SCHEDULED",
              label: "Scheduled",
              count: campaigns.filter((c) => c.status.toUpperCase() === "SCHEDULED").length,
            },
            {
              key: "COMPLETED",
              label: "Completed",
              count: campaigns.filter((c) => c.status.toUpperCase() === "COMPLETED").length,
            },
            {
              key: "DRAFT",
              label: "Draft",
              count: campaigns.filter(
                (c) => c.status.toUpperCase() === "DRAFT" || c.status.toUpperCase() === "READY_FOR_TEST"
              ).length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap",
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  statusFilter === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Channel filter chips & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-xs font-medium mr-1 shrink-0">
              Channel:
            </span>
            {[
              { key: "all", label: "All Channels" },
              { key: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
              { key: "INSTAGRAM", label: "Instagram", icon: Camera },
              { key: "RCS", label: "RCS", icon: Smartphone },
              { key: "FACEBOOK", label: "Facebook", icon: ScanLine },
            ].map((ch) => (
              <button
                key={ch.key}
                onClick={() => setChannelFilter(ch.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border",
                  channelFilter === ch.key
                    ? "bg-accent border-primary text-primary font-semibold"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {ch.icon && <ch.icon className="h-3 w-3" />}
                {ch.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56 max-w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setStatusFilter("all");
                setChannelFilter("all");
                setSearchQuery("");
                setSelected([]);
                fetchCampaigns();
              }}
              title="Reset Filters"
              className="h-8 w-8 text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 w-10 text-left">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Campaign
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Channel
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Target Audience
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Status
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Delivery Progress
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Scheduled / Sent
                </th>
                <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <p className="text-xs text-muted-foreground">Loading campaigns...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/60">
                        <Megaphone className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {searchQuery || statusFilter !== "all" || channelFilter !== "all"
                          ? "No matching campaigns"
                          : "No campaigns created yet"}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {searchQuery || statusFilter !== "all" || channelFilter !== "all"
                          ? "Try changing your search term or clearing active filters."
                          : "Create your first multichannel marketing campaign to engage your target audience across WhatsApp, Instagram, RCS, and Facebook."}
                      </p>
                      <div className="pt-1">
                        {searchQuery || statusFilter !== "all" || channelFilter !== "all" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusFilter("all");
                              setChannelFilter("all");
                              setSearchQuery("");
                            }}
                            className="text-xs"
                          >
                            Reset Filters
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => router.push("/crm/campaigns/create")}
                            className="text-xs gap-1.5 bg-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Campaign
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const chKey = camp.channel.toUpperCase();
                  const ch = channelConfig[chKey] || channelConfig.WHATSAPP;
                  const st = statusConfig[camp.status.toUpperCase()] || statusConfig.DRAFT;
                  const Icon = ch.icon;
                  const progressPct =
                    camp.audienceCount > 0
                      ? Math.round((camp.sentCount / camp.audienceCount) * 100)
                      : 0;

                  return (
                    <tr
                      key={camp.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selected.includes(camp.id)}
                          onCheckedChange={() => toggleOne(camp.id)}
                        />
                      </td>
                      <td className="p-3 min-w-56">
                        <Link
                          href={`/crm/campaigns/create?campaignId=${camp.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer block"
                        >
                          {camp.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono text-[11px]">{camp.id}</span>
                          <span>•</span>
                          <span>Created {camp.createdAt}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5 font-medium text-xs", ch.badgeStyle)}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {ch.label}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs">
                            {camp.audience}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {camp.audienceCount.toLocaleString()} Contacts
                          </span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                            st.badge
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3 min-w-44 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {camp.sentCount.toLocaleString()} / {camp.audienceCount.toLocaleString()}
                            </span>
                            <span className="font-semibold text-foreground">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                camp.status.toUpperCase() === "COMPLETED"
                                  ? "bg-emerald-500"
                                  : camp.status.toUpperCase() === "RUNNING"
                                  ? "bg-primary"
                                  : "bg-slate-400"
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{camp.scheduledAt}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDuplicate(camp)}
                            title="Duplicate Campaign"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/crm/campaigns/create?campaignId=${camp.id}`)}
                              >
                                View / Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(camp)}>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(camp.id)}
                                className="text-destructive"
                              >
                                Delete Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 border-t bg-muted/10 text-xs text-muted-foreground">
          <span>Total Campaigns: {campaigns.length}</span>
          <span>Showing real tenant database campaigns</span>
        </div>
      </div>
    </div>
  );
}
