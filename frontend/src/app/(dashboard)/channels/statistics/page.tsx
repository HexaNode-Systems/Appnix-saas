"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api/axios";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  MessageSquare,
  Users,
  Send,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Bot,
  Headphones,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  RCSIcon,
} from "@/components/landing/channel-icons";
import { downloadCsv, escapeCsvField } from "@/components/crm/csv-utils";

// ---------- Types ----------
export type DatePreset = "today" | "7d" | "30d" | "custom";
export type ChannelFilter = "all" | "whatsapp" | "instagram" | "facebook" | "rcs";
export type MetricType = "total" | "user" | "business" | "cost";

export interface ChannelStatRow {
  id: string;
  name: string;
  identifier: string;
  channelType: "whatsapp" | "instagram" | "facebook" | "rcs";
  status: "connected" | "disconnected";
  totalConversations: number;
  userInitiated: number;
  businessInitiated: number;
  inboundMessages: number;
  outboundMessages: number;
  avgResponseTime: string;
  resolutionRate: number; // percentage
  botHandoverRate: number; // percentage
  costInr: number;
  marketingConvs: number;
  utilityConvs: number;
  authConvs: number;
  serviceConvs: number;
}

export interface SessionLog {
  id: string;
  userIdentifier: string;
  category: "Service" | "Marketing" | "Utility" | "Authentication";
  startedAt: string;
  duration: string;
  messagesIn: number;
  messagesOut: number;
  handledBy: string;
  cost: string;
  status: "Active" | "Closed" | "Handed Over";
}

// ---------- Initial Data Structures ----------
const emptyTimeTrends: Record<
  DatePreset,
  Array<{ date: string; whatsapp: number; instagram: number; facebook: number; rcs: number; cost: number }>
> = {
  "30d": [],
  "7d": [],
  today: [],
  custom: [],
};

const sessionLogs: Record<string, SessionLog[]> = {};

const CHANNEL_COLORS = {
  whatsapp: "#10b981", // emerald-500
  instagram: "#ec4899", // pink-500
  facebook: "#3b82f6", // blue-500
  rcs: "#8b5cf6", // violet-500
};

const CATEGORY_COLORS = {
  marketing: "#10b981",
  utility: "#f59e0b",
  authentication: "#8b5cf6",
  service: "#0ea5e9",
};

export default function ConversationStatisticsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [metricView, setMetricView] = useState<MetricType>("total");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelForLogs, setSelectedChannelForLogs] = useState<ChannelStatRow | null>(null);
  const [channelRows, setChannelRows] = useState<ChannelStatRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  // Fetch real connected channels from API
  useEffect(() => {
    let isMounted = true;
    async function loadChannels() {
      try {
        setIsLoading(true);
        const res = await api.get("/channels");
        const list = res.data?.data;
        if (Array.isArray(list) && isMounted) {
          const mapped: ChannelStatRow[] = list
            .filter((c: any) => c.status === "connected" || c.isConnected === true)
            .map((c: any) => {
              const rawType = ((c.type || c.channel || "").toLowerCase()) as string;
              const channelType: ChannelStatRow["channelType"] =
                rawType === "whatsapp" || rawType === "instagram" || rawType === "facebook" || rawType === "rcs"
                  ? rawType
                  : "whatsapp";

              return {
                id: c.id || String(Math.random()),
                name: c.name || c.displayName || c.pageName || c.accountName || "Connected Channel",
                identifier: c.phoneNumber || c.accountHandle || c.pageId || c.agentId || c.subtitle || "Connected",
                channelType,
                status: "connected",
                totalConversations: c.totalConversations || 0,
                userInitiated: c.userInitiated || 0,
                businessInitiated: c.businessInitiated || 0,
                inboundMessages: c.inboundMessages || 0,
                outboundMessages: c.outboundMessages || 0,
                avgResponseTime: c.avgResponseTime || "--",
                resolutionRate: c.resolutionRate || 0,
                botHandoverRate: c.botHandoverRate || 0,
                costInr: c.costInr || 0,
                marketingConvs: c.marketingConvs || 0,
                utilityConvs: c.utilityConvs || 0,
                authConvs: c.authConvs || 0,
                serviceConvs: c.serviceConvs || 0,
              };
            });
          setChannelRows(mapped);
        } else if (isMounted) {
          setChannelRows([]);
        }
      } catch {
        if (isMounted) setChannelRows([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadChannels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered channel rows for the breakdown table
  const filteredChannels = useMemo(() => {
    return channelRows.filter((ch) => {
      const matchesChannel =
        channelFilter === "all" || ch.channelType === channelFilter;
      const matchesSearch =
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.channelType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [channelRows, channelFilter, searchQuery]);

  // Aggregate KPI Calculations
  const kpis = useMemo(() => {
    let totalConvs = 0;
    let userConvs = 0;
    let bizConvs = 0;
    let totalCost = 0;

    filteredChannels.forEach((ch) => {
      totalConvs += ch.totalConversations;
      userConvs += ch.userInitiated;
      bizConvs += ch.businessInitiated;
      totalCost += ch.costInr;
    });

    const userSharePercent = totalConvs > 0 ? ((userConvs / totalConvs) * 100).toFixed(1) : "0";
    const bizSharePercent = totalConvs > 0 ? ((bizConvs / totalConvs) * 100).toFixed(1) : "0";
    const avgCostPerConv = totalConvs > 0 ? (totalCost / totalConvs).toFixed(2) : "0.00";

    return {
      totalConversations: totalConvs,
      userInitiated: userConvs,
      userSharePercent,
      businessInitiated: bizConvs,
      bizSharePercent,
      totalCostInr: totalCost,
      avgCostPerConv,
    };
  }, [filteredChannels]);

  // Traffic Share by Channel computed dynamically from channelRows
  const channelShareData = useMemo(() => {
    const counts: Record<string, number> = {
      whatsapp: 0,
      instagram: 0,
      facebook: 0,
      rcs: 0,
    };

    channelRows.forEach((ch) => {
      if (counts[ch.channelType] !== undefined) {
        counts[ch.channelType] += ch.totalConversations;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return [
      {
        name: "WhatsApp",
        value: counts.whatsapp,
        color: CHANNEL_COLORS.whatsapp,
        percentage: total > 0 ? `${((counts.whatsapp / total) * 100).toFixed(1)}%` : "0%",
      },
      {
        name: "Instagram",
        value: counts.instagram,
        color: CHANNEL_COLORS.instagram,
        percentage: total > 0 ? `${((counts.instagram / total) * 100).toFixed(1)}%` : "0%",
      },
      {
        name: "Facebook",
        value: counts.facebook,
        color: CHANNEL_COLORS.facebook,
        percentage: total > 0 ? `${((counts.facebook / total) * 100).toFixed(1)}%` : "0%",
      },
      {
        name: "RCS",
        value: counts.rcs,
        color: CHANNEL_COLORS.rcs,
        percentage: total > 0 ? `${((counts.rcs / total) * 100).toFixed(1)}%` : "0%",
      },
    ].filter((item) => {
      if (channelFilter === "all") return true;
      return item.name.toLowerCase() === channelFilter;
    });
  }, [channelRows, channelFilter]);

  // Category Breakdown Stacked Bar Chart Data
  const categoryBreakdownData = useMemo(() => {
    return channelRows
      .filter((ch) => channelFilter === "all" || ch.channelType === channelFilter)
      .map((ch) => ({
        name: ch.channelType.toUpperCase(),
        Marketing: ch.marketingConvs,
        Utility: ch.utilityConvs,
        Authentication: ch.authConvs,
        Service: ch.serviceConvs,
      }));
  }, [channelRows, channelFilter]);

  const activeTrendData = emptyTimeTrends[datePreset] || [];

  // Export CSV Report Action
  const handleExportCsvReport = () => {
    const headers = [
      "Channel Name",
      "Identifier",
      "Channel Type",
      "Status",
      "Total Conversations",
      "User Initiated (Service)",
      "Business Initiated",
      "Inbound Messages",
      "Outbound Messages",
      "Avg Response Time",
      "Resolution Rate (%)",
      "Cost (INR)",
    ];

    const rows = filteredChannels.map((ch) => [
      ch.name,
      ch.identifier,
      ch.channelType.toUpperCase(),
      ch.status,
      ch.totalConversations,
      ch.userInitiated,
      ch.businessInitiated,
      ch.inboundMessages,
      ch.outboundMessages,
      ch.avgResponseTime,
      `${ch.resolutionRate}%`,
      `₹${ch.costInr.toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\r\n");

    downloadCsv(`conversation_statistics_${datePreset}.csv`, csvContent);
  };

  const getChannelBadge = (type: ChannelStatRow["channelType"]) => {
    switch (type) {
      case "whatsapp":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[11px] font-semibold">
            <WhatsAppIcon className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </Badge>
        );
      case "instagram":
        return (
          <Badge className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 gap-1 text-[11px] font-semibold">
            <InstagramIcon className="h-3.5 w-3.5" />
            <span>Instagram</span>
          </Badge>
        );
      case "facebook":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1 text-[11px] font-semibold">
            <FacebookIcon className="h-3.5 w-3.5" />
            <span>Facebook</span>
          </Badge>
        );
      case "rcs":
        return (
          <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 gap-1 text-[11px] font-semibold">
            <RCSIcon className="h-3.5 w-3.5" />
            <span>Google RCS</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Breadcrumb & Action Controls */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Channels</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <Link
            href="/channels"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            All Channels
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-primary font-semibold">Conversation Statistics</span>
        </div>

        {/* Title Bar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Conversation Statistics & Analytics
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-semibold">
                Omnichannel Live
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Monitor messaging volumes, active sessions, platform breakdown, and conversation costs across channels.
            </p>
          </div>

          {/* Action Controls (Top Right) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Date Range Preset Selector */}
            <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-xs text-xs font-medium">
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  datePreset === "today"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("7d")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  datePreset === "7d"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("30d")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  datePreset === "30d"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatePreset("custom");
                  setIsCustomDateOpen(!isCustomDateOpen);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors flex items-center gap-1",
                  datePreset === "custom"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>Custom</span>
              </button>
            </div>

            {/* Channel Filter Dropdown */}
            <div className="relative">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                className="h-8 rounded-lg border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="rcs">Google RCS</option>
              </select>
            </div>

            {/* Export Report Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 shadow-xs shrink-0">
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Report</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={handleExportCsvReport} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export as CSV (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.print()}
                  className="gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  <span>Print / Save as PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Custom Date Range Popover */}
        {datePreset === "custom" && isCustomDateOpen && (
          <div className="rounded-xl border bg-card p-3 shadow-md flex items-center gap-3 flex-wrap text-xs animate-in fade-in">
            <span className="font-medium text-muted-foreground">Select Custom Date Range:</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-7 text-xs w-36 bg-background"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-7 text-xs w-36 bg-background"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setIsCustomDateOpen(false)}
              className="h-7 text-xs bg-primary text-primary-foreground font-medium"
            >
              Apply Filter
            </Button>
          </div>
        )}
      </div>

      {/* 2. Top Summary KPI Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Conversations */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold gap-1">
              <TrendingUp className="h-3 w-3" />
              Live Telemetry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Total Conversations</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            {kpis.totalConversations.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across {filteredChannels.length} connected channel{filteredChannels.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* KPI 2: User-Initiated (Service) */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold">
              {kpis.userSharePercent}% share
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">User-Initiated (Service)</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            {kpis.userInitiated.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Headphones className="h-3 w-3 text-blue-500" />
            Inbound customer service queries
          </p>
        </div>

        {/* KPI 3: Business-Initiated */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px] font-semibold">
              {kpis.bizSharePercent}% share
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Business-Initiated</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            {kpis.businessInitiated.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Marketing • Utility • Authentication outbound
          </p>
        </div>

        {/* KPI 4: Total Cost / Consumed Balance */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
              ₹{kpis.avgCostPerConv} / avg
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Total Cost / Consumed</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            ₹{kpis.totalCostInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Within projected monthly budget
          </p>
        </div>
      </div>

      {/* 3. Analytics & Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Main Trend Area Chart (Col-span 8) */}
        <div className="lg:col-span-8 rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Conversation Volume Trend Over Time</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily messaging sessions by platform ({datePreset === "today" ? "24 Hours" : datePreset === "7d" ? "Past Week" : "Past 30 Days"})
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMetricView("total")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  metricView === "total" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                )}
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setMetricView("cost")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  metricView === "cost" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                )}
              >
                Cost (₹)
              </button>
            </div>
          </div>

          {/* Area Chart Container */}
          {activeTrendData.length === 0 ? (
            <div className="h-72 w-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground border rounded-xl border-dashed">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No trend data recorded</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                Daily conversation volume and cost trends will appear automatically as inbound and outbound messages occur.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {metricView === "cost" ? (
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} unit="₹" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(val: any) => [`₹${val ?? 0}`, "Daily Cost"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      name="Cost (INR)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#costGradient)"
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHANNEL_COLORS.whatsapp} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHANNEL_COLORS.whatsapp} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="igGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHANNEL_COLORS.instagram} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CHANNEL_COLORS.instagram} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    {(channelFilter === "all" || channelFilter === "whatsapp") && (
                      <Area
                        type="monotone"
                        dataKey="whatsapp"
                        name="WhatsApp"
                        stroke={CHANNEL_COLORS.whatsapp}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#waGradient)"
                      />
                    )}
                    {(channelFilter === "all" || channelFilter === "instagram") && (
                      <Area
                        type="monotone"
                        dataKey="instagram"
                        name="Instagram"
                        stroke={CHANNEL_COLORS.instagram}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#igGradient)"
                      />
                    )}
                    {(channelFilter === "all" || channelFilter === "facebook") && (
                      <Line
                        type="monotone"
                        dataKey="facebook"
                        name="Facebook"
                        stroke={CHANNEL_COLORS.facebook}
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    {(channelFilter === "all" || channelFilter === "rcs") && (
                      <Line
                        type="monotone"
                        dataKey="rcs"
                        name="RCS"
                        stroke={CHANNEL_COLORS.rcs}
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart Legend Footer */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-pink-500" />
              <span className="font-medium text-foreground">Instagram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="font-medium text-foreground">Facebook</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-violet-500" />
              <span className="font-medium text-foreground">Google RCS</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Channel Share Donut Chart (Col-span 4) */}
        <div className="lg:col-span-4 rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-foreground">Traffic Share by Channel</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution of conversation volume</p>
          </div>

          {channelShareData.every((item) => item.value === 0) ? (
            <div className="h-52 w-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground border rounded-xl border-dashed">
              <PieChart className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No conversation traffic</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                Share distribution will display once channels have active conversations.
              </p>
            </div>
          ) : (
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={channelShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {channelShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${Number(val || 0).toLocaleString()} convos`, "Volume"]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown List */}
          <div className="space-y-2 pt-2 border-t text-xs">
            {channelShareData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{item.value.toLocaleString()}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.percentage}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Category Breakdown Stacked Bar Chart (Col-span 12) */}
        <div className="lg:col-span-12 rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Conversation Category Breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Marketing vs Utility vs Authentication vs Service sessions per channel
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Session Billing Rules: Meta / RCS Standard</span>
            </div>
          </div>

          {categoryBreakdownData.length === 0 ||
          categoryBreakdownData.every(
            (c) => c.Marketing === 0 && c.Utility === 0 && c.Authentication === 0 && c.Service === 0
          ) ? (
            <div className="h-64 w-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground border rounded-xl border-dashed">
              <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No category breakdown data</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                Categorized sessions (Marketing, Utility, Authentication, Service) will appear as messages are processed.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={categoryBreakdownData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar dataKey="Marketing" stackId="a" fill={CATEGORY_COLORS.marketing} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Utility" stackId="a" fill={CATEGORY_COLORS.utility} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Authentication" stackId="a" fill={CATEGORY_COLORS.authentication} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Service" stackId="a" fill={CATEGORY_COLORS.service} radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 4. Detailed Channel Breakdown Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-muted/10 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-72 max-w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channel name, phone, handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 h-9 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  channelFilter === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                All Channels
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("whatsapp")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  channelFilter === "whatsapp" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("instagram")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  channelFilter === "instagram" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                Instagram
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("rcs")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  channelFilter === "rcs" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                RCS
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
            <span>Showing {filteredChannels.length} channel records</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsvReport}
              className="h-8 text-xs gap-1 shadow-xs"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Channel Name & Identifier
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Total Conversations
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Inbound vs Outbound
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Response
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Resolution / Bot Handover
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Cost (INR)
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading channel statistics...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-1" />
                      <p className="font-semibold text-foreground">No channel statistics available</p>
                      <p className="text-muted-foreground">Connect a channel or start conversations to view live telemetry.</p>
                      <Link href="/channels" className="mt-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                          <span>Manage Channels</span>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredChannels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-muted/20 transition-colors">
                    {/* Channel Name & Identifier */}
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div>
                        <p className="text-xs font-bold text-foreground">{channel.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{channel.identifier}</p>
                      </div>
                    </td>

                    {/* Channel Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getChannelBadge(channel.channelType)}
                    </td>

                    {/* Total Conversations with volume progress */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <p className="font-bold text-foreground text-xs">
                        {channel.totalConversations.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {kpis.totalConversations > 0
                          ? `${((channel.totalConversations / kpis.totalConversations) * 100).toFixed(1)}% of total`
                          : "0.0% of total"}
                      </span>
                    </td>

                    {/* Inbound vs Outbound Messages */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {channel.inboundMessages.toLocaleString()} In
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {channel.outboundMessages.toLocaleString()} Out
                        </span>
                      </div>
                      <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden mt-1 flex">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${
                              channel.inboundMessages + channel.outboundMessages > 0
                                ? (channel.inboundMessages / (channel.inboundMessages + channel.outboundMessages)) * 100
                                : 50
                            }%`,
                          }}
                        />
                        <div
                          className="bg-emerald-500 h-full"
                          style={{
                            width: `${
                              channel.inboundMessages + channel.outboundMessages > 0
                                ? (channel.outboundMessages / (channel.inboundMessages + channel.outboundMessages)) * 100
                                : 50
                            }%`,
                          }}
                        />
                      </div>
                    </td>

                    {/* Avg Response Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{channel.avgResponseTime}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {channel.resolutionRate > 0 ? `${channel.resolutionRate}% SLA met` : "SLA on track"}
                      </span>
                    </td>

                    {/* Resolution Rate / Bot Handover */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                          {channel.resolutionRate}% Resolved
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Bot: {channel.botHandoverRate}%
                        </span>
                      </div>
                    </td>

                    {/* Cost INR */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground text-xs whitespace-nowrap">
                      ₹{channel.costInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions: View Detailed Logs */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedChannelForLogs(channel)}
                        className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Logs</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border-t bg-muted/10 text-xs text-muted-foreground gap-3">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select className="h-7 text-xs rounded border bg-background px-1.5">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled className="h-7 text-xs px-2.5">
              Previous
            </Button>
            <Button size="sm" className="h-7 w-7 p-0 bg-primary text-primary-foreground font-semibold">
              1
            </Button>
            <Button variant="outline" size="sm" disabled className="h-7 text-xs px-2.5">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Detailed Channel Conversation Logs Modal / Drawer */}
      {selectedChannelForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    Detailed Conversation Telemetry
                  </h2>
                  {getChannelBadge(selectedChannelForLogs.channelType)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Channel: <strong className="text-foreground">{selectedChannelForLogs.name}</strong> ({selectedChannelForLogs.identifier})
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedChannelForLogs(null)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-muted-foreground">Total Sessions</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {selectedChannelForLogs.totalConversations.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border bg-emerald-500/10 p-3">
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">Service Queries</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedChannelForLogs.serviceConvs.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border bg-purple-500/10 p-3">
                <p className="text-purple-700 dark:text-purple-400 font-medium">Marketing Outbound</p>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {selectedChannelForLogs.marketingConvs.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border bg-blue-500/10 p-3">
                <p className="text-blue-700 dark:text-blue-400 font-medium">Total Cost</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  ₹{selectedChannelForLogs.costInr.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Live Session Log Samples */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Session Logs
                </h3>
                {(sessionLogs[selectedChannelForLogs.id] || []).length > 0 ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync Active
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    No Active Sessions
                  </span>
                )}
              </div>

              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Session ID & User</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Category</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Started / Duration</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Handled By</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Cost</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(sessionLogs[selectedChannelForLogs.id] || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                          No recent session logs recorded for this channel.
                        </td>
                      </tr>
                    ) : (
                      (sessionLogs[selectedChannelForLogs.id] || []).map((ses) => (
                      <tr key={ses.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          <p className="font-mono text-xs">{ses.userIdentifier}</p>
                          <span className="text-[10px] text-muted-foreground">{ses.id}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              ses.category === "Marketing" && "border-emerald-500/30 text-emerald-600",
                              ses.category === "Service" && "border-blue-500/30 text-blue-600",
                              ses.category === "Utility" && "border-amber-500/30 text-amber-600",
                              ses.category === "Authentication" && "border-purple-500/30 text-purple-600"
                            )}
                          >
                            {ses.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <p className="text-foreground">{ses.startedAt}</p>
                          <span className="text-[10px]">{ses.duration}</span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <div className="flex items-center gap-1 text-foreground">
                            <Bot className="h-3 w-3 text-primary" />
                            <span>{ses.handledBy}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          {ses.cost}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0 font-medium",
                              ses.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {ses.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t text-xs">
              <span className="text-muted-foreground">
                Pricing tier: Standard Enterprise Plan (₹0.00 Service Window)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChannelForLogs(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
