"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Plus,
  Search,
  RefreshCw,
  Zap,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Edit3,
  Copy,
  Check,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Filter,
  Layers,
  Bot,
  Play,
  Flame,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Building,
  MoreVertical,
  Activity,
  Radio,
  FileCode,
  Terminal,
  ChevronRight,
  HelpCircle,
  Hash,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectInstagramModal } from "@/components/channels/ConnectInstagramModal";
import {
  InstagramRuleModal,
  InstagramRuleItem,
} from "@/components/channels/InstagramRuleModal";
import { InstagramLogsModal } from "@/components/channels/InstagramLogsModal";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";

// Types
export interface InstagramChannel {
  id: string;
  tenantId: string;
  instagramId: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  facebookPageId: string | null;
  facebookPageName: string | null;
  status: "CONNECTED" | "EXPIRED" | "DISCONNECTED";
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  rules?: InstagramRule[];
  _count?: {
    rules: number;
    logs: number;
  };
}

export interface InstagramRule {
  id: string;
  tenantId: string;
  instagramChannelId: string;
  name: string;
  isActive: boolean;
  postScope: "ALL_POSTS" | "SPECIFIC_POST";
  specificMediaId: string | null;
  matchType?: string;
  triggerKeywords: string[];
  publicReplyTemplate: string | null;
  privateDmTemplate: string;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  channel?: {
    id: string;
    username: string;
    name: string | null;
  };
}

export interface InstagramLog {
  id: string;
  tenantId: string;
  instagramChannelId: string;
  ruleId: string | null;
  postMediaId: string | null;
  commentId: string;
  senderInstagramId: string;
  senderUsername: string | null;
  commentText: string | null;
  publicReplySent: boolean;
  privateDmSent: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  errorMessage: string | null;
  createdAt: string;
  channel?: {
    id: string;
    username: string;
  };
  rule?: {
    id: string;
    name: string;
  } | null;
}

export default function InstagramChannelsPage() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"accounts" | "rules" | "logs" | "setup">("accounts");

  // Data states
  const [channels, setChannels] = useState<InstagramChannel[]>([]);
  const [rules, setRules] = useState<InstagramRule[]>([]);
  const [logs, setLogs] = useState<InstagramLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleScopeFilter, setRuleScopeFilter] = useState<string>("ALL");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("ALL");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<InstagramRuleItem | null>(null);
  const [activeChannelForModal, setActiveChannelForModal] = useState<{ id: string; username: string }>({
    id: "",
    username: "",
  });

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logsModalChannel, setLogsModalChannel] = useState<{ id: string; username: string }>({
    id: "",
    username: "",
  });

  // Simulator Drawer State
  const [simulatorRule, setSimulatorRule] = useState<InstagramRule | null>(null);
  const [simulatorComment, setSimulatorComment] = useState("");
  const [simulatorResult, setSimulatorResult] = useState<{
    matched: boolean;
    keywordMatched?: string;
    publicReply?: string;
    privateDm?: string;
  } | null>(null);

  // Webhook copy states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin.replace(":3000", ":4000")}/api/v1/webhooks/instagram`
    : "https://api.appnix.co.in/api/v1/webhooks/instagram";
  const verifyToken = "c90e38e2e8de0224bcfa6fd6aa7b6b123c96104a95bbec834b20b2b55f06a332";

  // Fetch all Instagram channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await api.get("/channels/instagram");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setChannels(list);
        if (list.length > 0 && !activeChannelForModal.id) {
          setActiveChannelForModal({
            id: list[0].id,
            username: list[0].username,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load Instagram channels:", err);
    }
  }, [activeChannelForModal.id]);

  // Fetch all rules
  const fetchRules = useCallback(async () => {
    try {
      const res = await api.get("/channels/instagram/rules");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setRules(list);
      }
    } catch (err) {
      console.error("Failed to load Instagram automation rules:", err);
    }
  }, []);

  // Fetch recent logs
  const fetchLogs = useCallback(async (channelId?: string) => {
    try {
      const endpoint = channelId && channelId !== "ALL"
        ? `/channels/instagram/logs?channelId=${channelId}&limit=50`
        : `/channels/instagram/logs?limit=50`;
      const res = await api.get(endpoint);
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setLogs(list);
      }
    } catch (err) {
      console.error("Failed to load Instagram automation logs:", err);
    }
  }, []);

  // Initial load
  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      await Promise.all([fetchChannels(), fetchRules(), fetchLogs()]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchChannels, fetchRules, fetchLogs]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // When switching to logs tab, load logs
  useEffect(() => {
    if (activeTab === "logs" && channels.length > 0) {
      fetchLogs(selectedChannelFilter !== "ALL" ? selectedChannelFilter : channels[0]?.id);
    }
  }, [activeTab, channels, selectedChannelFilter, fetchLogs]);

  // Handle rule toggle
  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextStatus } : r))
    );

    try {
      await api.patch(`/channels/instagram/rules/${ruleId}/toggle`, {
        isActive: nextStatus,
      });
    } catch (err) {
      console.error("Failed to toggle rule:", err);
      // Revert on error
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: currentStatus } : r))
      );
    }
  };

  // Handle rule delete
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this Comment-to-DM automation rule?")) {
      return;
    }
    try {
      await api.delete(`/channels/instagram/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error("Failed to delete rule:", err);
      alert("Failed to delete rule. Please try again.");
    }
  };

  // Handle channel disconnect
  const handleDisconnectChannel = async (channelId: string, username: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect @${username}? Automation rules for this account will be paused.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/channels/instagram/${channelId}`);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setRules((prev) => prev.filter((r) => r.instagramChannelId !== channelId));
    } catch (err) {
      console.error("Failed to disconnect Instagram channel:", err);
      alert("Failed to disconnect account.");
    }
  };

  // Handle channel sync / re-verification with Meta Graph API
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null);

  const handleSyncChannel = async (channelId: string) => {
    try {
      setSyncingChannelId(channelId);
      const res = await api.post(`/channels/instagram/${channelId}/sync`);
      if (res.data?.data) {
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, ...res.data.data } : c))
        );
      }
    } catch (err: any) {
      console.error("Sync failed:", err);
      alert(err.response?.data?.message || "Failed to sync channel status with Meta Graph API.");
    } finally {
      setSyncingChannelId(null);
    }
  };

  // Open rule modal for create
  const handleOpenCreateRule = (channel?: InstagramChannel) => {
    const targetChannel = channel || channels[0];
    if (!targetChannel) {
      setIsConnectModalOpen(true);
      return;
    }
    setActiveChannelForModal({
      id: targetChannel.id,
      username: targetChannel.username,
    });
    setEditingRule(null);
    setIsRuleModalOpen(true);
  };

  // Open rule modal for edit
  const handleOpenEditRule = (rule: InstagramRule) => {
    const channel = channels.find((c) => c.id === rule.instagramChannelId);
    setActiveChannelForModal({
      id: rule.instagramChannelId,
      username: channel?.username || rule.channel?.username || "instagram_account",
    });
    setEditingRule({
      id: rule.id,
      name: rule.name,
      postScope: rule.postScope,
      specificMediaId: rule.specificMediaId,
      triggerKeywords: rule.triggerKeywords,
      publicReplyTemplate: rule.publicReplyTemplate,
      privateDmTemplate: rule.privateDmTemplate,
      isActive: rule.isActive,
    });
    setIsRuleModalOpen(true);
  };

  // Test / Simulate Rule
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateRule = (rule: InstagramRule) => {
    setSimulatorRule(rule);
    const firstKeyword = rule.triggerKeywords[0] || "demo";
    setSimulatorComment(`Can you send me the ${firstKeyword} please?`);
    setSimulatorResult(null);
  };

  const runSimulation = async () => {
    if (!simulatorRule || !simulatorComment.trim()) return;
    setIsSimulating(true);
    try {
      const res = await api.post("/channels/instagram/rules/simulate", {
        ruleId: simulatorRule.id,
        commentText: simulatorComment.trim(),
        username: "customer_user",
      });
      setSimulatorResult(res.data?.data || null);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.triggerKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesChannel =
      selectedChannelFilter === "ALL" || r.instagramChannelId === selectedChannelFilter;
    const matchesScope =
      ruleScopeFilter === "ALL" ||
      (ruleScopeFilter === "ACTIVE" && r.isActive) ||
      (ruleScopeFilter === "INACTIVE" && !r.isActive);
    return matchesSearch && matchesChannel && matchesScope;
  });

  // Calculate top KPI statistics based strictly on real DB records
  const totalConnected = channels.filter((c) => c.status === "CONNECTED").length;
  const activeRulesCount = rules.filter((r) => r.isActive).length;
  const totalTriggers = rules.reduce((acc, r) => acc + (r.triggerCount || 0), 0);
  const successfulLogs = logs.filter((l) => l.status === "SUCCESS").length;
  const successRate =
    logs.length > 0 ? ((successfulLogs / logs.length) * 100).toFixed(1) : null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Channels</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span>Channels</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-foreground font-medium">Instagram</span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
              INSTAGRAM
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and monitor all your communication channels in one unified platform.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
            <Button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm"
            >
              <Plus className="h-4 w-4 sm:mr-1" />
              <span>Add New Channel</span>
            </Button>

            {channels.length > 0 && (
              <Button
                variant="outline"
                onClick={() => handleOpenCreateRule()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span>Add Rule</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className="shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4 sm:mr-1", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link href="/channels/statistics">
              <Button variant="outline" className="shrink-0">
                <BarChart3 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Conversation Statistics</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Connected Accounts */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Connected Accounts</span>
            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center text-foreground">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalConnected}</span>
            <span className="text-xs text-muted-foreground">
              {totalConnected === 1 ? "account connected" : "accounts connected"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {totalConnected > 0 ? "Webhook Subscriptions Active" : "No accounts connected yet"}
          </p>
        </div>

        {/* Metric 2: Active Comment-to-DM Rules */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Comment-to-DM Rules</span>
            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center text-foreground">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{activeRulesCount}</span>
            <span className="text-xs text-muted-foreground">
              active ({rules.length} configured)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <Bot className="h-3 w-3 text-muted-foreground" />
            {rules.length > 0 ? "Real-time keyword triggers" : "No active rules created"}
          </p>
        </div>

        {/* Metric 3: Total DMs Dispatched */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Automated DMs Sent</span>
            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center text-foreground">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalTriggers.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">delivered</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {totalTriggers > 0 ? "Automated delivery active" : "Triggers increment upon delivery"}
          </p>
        </div>

        {/* Metric 4: Success Delivery Rate */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Delivery Success Rate</span>
            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center text-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {successRate !== null ? `${successRate}%` : "—"}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                successRate && parseFloat(successRate) >= 95
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              )}
            >
              {logs.length > 0
                ? parseFloat(successRate || "0") >= 95
                  ? "Optimal"
                  : `${successfulLogs}/${logs.length} sent`
                : "No dispatches yet"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {logs.length > 0
              ? "24h duplicate suppression active"
              : "Live telemetry logs update on events"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="border-b flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "accounts"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Connected Accounts</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {channels.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "rules"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Comment-to-DM Rules</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {rules.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "logs"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Activity Logs</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {logs.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === "setup"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Webhook Configuration</span>
          </button>
        </div>

        {activeTab === "rules" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSimulatorRule(rules[0] || null)}
            disabled={rules.length === 0}
            className="h-7 text-xs gap-1 mr-1"
          >
            <Play className="h-3 w-3" />
            <span>Test Simulator</span>
          </Button>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CONNECTED ACCOUNTS */}
      {/* ========================================================= */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-3 shadow-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs text-muted-foreground">Loading connected channels...</p>
            </div>
          ) : channels.length === 0 ? (
            /* Empty State: Matching Facebook exact pattern */
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-4 shadow-xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <Camera className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-lg">
                  No Instagram channels connected yet
                </h3>
                <p className="text-xs max-w-md mx-auto text-muted-foreground leading-relaxed">
                  Connect your Instagram Professional (Business or Creator) account via Meta Graph API to automate Comment-to-DM responses and manage live chat messaging.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsConnectModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Connect Instagram Account</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => {
                const channelRules = rules.filter((r) => r.instagramChannelId === channel.id);

                return (
                  <div
                    key={channel.id}
                    className="rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    {/* Card Header */}
                    <div className="flex items-start sm:items-center justify-between gap-2 p-4 border-b bg-muted/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs bg-pink-500/10 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-500/20">
                          {channel.profilePictureUrl ? (
                            <img
                              src={channel.profilePictureUrl}
                              alt={channel.username}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Camera className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                channel.status === "CONNECTED"
                                  ? "bg-emerald-500 shadow-xs"
                                  : channel.status === "EXPIRED"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <p className="font-semibold text-sm text-foreground truncate">
                              @{channel.username}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {channel.name || channel.facebookPageName || "Instagram Professional"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right shrink-0 block mr-1">
                          <p className="text-xs font-semibold flex items-center gap-1 justify-end whitespace-nowrap text-foreground">
                            <Camera className="h-3.5 w-3.5 text-primary" />
                            Professional
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5 whitespace-nowrap">
                            {channel.status === "CONNECTED" ? (
                              <span className="text-emerald-600 font-medium">Active & Verified</span>
                            ) : (
                              <span className="text-amber-600 font-medium">{channel.status}</span>
                            )}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSyncChannel(channel.id)}>
                              Sync with Meta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenCreateRule(channel)}>
                              Add Comment Rule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setLogsModalChannel({ id: channel.id, username: channel.username });
                                setIsLogsModalOpen(true);
                              }}
                            >
                              View Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDisconnectChannel(channel.id, channel.username)}
                              className="text-destructive"
                            >
                              Disconnect Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Stats Fields */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 p-4 bg-card">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          ACCOUNT HANDLE
                        </p>
                        <p className="flex items-center gap-1.5 text-xs font-medium mt-1 truncate text-foreground">
                          <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">@{channel.username}</span>
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          LINKED PAGE
                        </p>
                        <p className="flex items-center gap-1.5 text-xs font-medium mt-1 truncate text-foreground">
                          <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{channel.facebookPageName || "Facebook Page"}</span>
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          COMMENT-TO-DM
                        </p>
                        <p className="flex items-center gap-1.5 text-xs font-medium mt-1 truncate text-foreground">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {channelRules.filter((r) => r.isActive).length} Active Rules
                          </span>
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          DIRECT SYNC
                        </p>
                        <p className="flex items-center gap-1.5 text-xs font-medium mt-1 truncate text-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">AES-256 Encrypted</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Icons toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateRule(channel)}
                          className="h-7 text-xs font-medium gap-1"
                        >
                          <Zap className="h-3 w-3 text-primary" />
                          <span>+ Add Rule</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncChannel(channel.id)}
                          disabled={syncingChannelId === channel.id}
                          className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3 w-3",
                              syncingChannelId === channel.id && "animate-spin"
                            )}
                          />
                          <span>Sync</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogsModalChannel({
                              id: channel.id,
                              username: channel.username,
                            });
                            setIsLogsModalOpen(true);
                          }}
                          className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Activity className="h-3 w-3" />
                          <span>Logs</span>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDisconnectChannel(channel.id, channel.username)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Disconnect Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: COMMENT-TO-DM RULES */}
      {/* ========================================================= */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search rules, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {/* Scope filter */}
              <select
                value={ruleScopeFilter}
                onChange={(e) => setRuleScopeFilter(e.target.value)}
                className="h-8 text-xs rounded-md border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Paused Only</option>
              </select>

              {/* Channel filter */}
              {channels.length > 1 && (
                <select
                  value={selectedChannelFilter}
                  onChange={(e) => setSelectedChannelFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Accounts</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      @{c.username}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenCreateRule()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium h-8 text-xs gap-1.5 w-full sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Rule</span>
            </Button>
          </div>

          {/* Rules List */}
          {filteredRules.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-4 shadow-xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <Bot className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-lg">
                  {searchQuery ? "No matching rules found" : "No Comment-to-DM Rules Created"}
                </h3>
                <p className="text-xs max-w-md mx-auto text-muted-foreground leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search query or filters."
                    : "Create automation rules to automatically reply to comments and send direct messages with links."}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => handleOpenCreateRule()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Create First Rule</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRules.map((rule) => {
                const channel = channels.find((c) => c.id === rule.instagramChannelId);

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 transition-all hover:shadow-xs shadow-xs space-y-3",
                      !rule.isActive && "opacity-75 bg-muted/20"
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs transition-colors",
                            rule.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-foreground">{rule.name}</h4>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-muted/40 font-mono text-muted-foreground"
                            >
                              @{channel?.username || rule.channel?.username || "instagram"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold",
                                rule.postScope === "ALL_POSTS"
                                  ? "border-blue-300 text-blue-600 dark:border-blue-900 dark:text-blue-400"
                                  : "border-purple-300 text-purple-600 dark:border-purple-900 dark:text-purple-400"
                              )}
                            >
                              {rule.postScope === "ALL_POSTS" ? "All Posts & Reels" : "Specific Post"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Triggered {rule.triggerCount || 0} times
                            {rule.lastTriggeredAt && (
                              <span> • Last active {new Date(rule.lastTriggeredAt).toLocaleString()}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 mr-2">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {rule.isActive ? "Active" : "Paused"}
                          </span>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleRule(rule.id, rule.isActive)}
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSimulateRule(rule)}
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Play className="h-3 w-3" />
                          <span>Test</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditRule(rule)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Keywords row */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        Trigger Keywords:
                      </span>
                      {rule.triggerKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted/60 border px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          "{kw}"
                        </span>
                      ))}
                    </div>

                    {/* Message Preview Panels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Public Reply Bubble */}
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-blue-500" />
                            Public Comment Reply
                          </span>
                          {rule.publicReplyTemplate ? (
                            <Badge variant="outline" className="text-[9px] text-emerald-600">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              Skipped
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground italic bg-background/80 p-2 rounded border text-[11px]">
                          {rule.publicReplyTemplate || "(No public reply configured — DM only)"}
                        </p>
                      </div>

                      {/* Private DM Bubble */}
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3 text-primary" />
                            Private Instagram Direct Message (DM)
                          </span>
                          <Badge variant="outline" className="text-[9px] text-emerald-600">
                            Required
                          </Badge>
                        </div>
                        <p className="text-foreground bg-background/80 p-2 rounded border text-[11px] whitespace-pre-wrap">
                          {rule.privateDmTemplate}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TELEMETRY & ACTIVITY LOGS */}
      {/* ========================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search commenter, text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {/* Status filter */}
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="h-8 text-xs rounded-md border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed / Skipped</option>
              </select>

              {/* Channel filter */}
              {channels.length > 1 && (
                <select
                  value={selectedChannelFilter}
                  onChange={(e) => setSelectedChannelFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="ALL">All Accounts</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      @{c.username}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchLogs(selectedChannelFilter !== "ALL" ? selectedChannelFilter : undefined)
              }
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Logs
            </Button>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/40 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Commenter</th>
                    <th className="py-3 px-4">Comment Text</th>
                    <th className="py-3 px-4">Matched Rule</th>
                    <th className="py-3 px-4">Public Reply</th>
                    <th className="py-3 px-4">Private DM</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs
                    .filter((log) => {
                      const matchesStatus =
                        logStatusFilter === "ALL" || log.status === logStatusFilter;
                      const matchesSearch =
                        !searchQuery ||
                        (log.senderUsername &&
                          log.senderUsername.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (log.commentText &&
                          log.commentText.toLowerCase().includes(searchQuery.toLowerCase()));
                      return matchesStatus && matchesSearch;
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                          @{log.senderUsername || log.senderInstagramId.slice(-6)}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-muted-foreground" title={log.commentText || ""}>
                          "{log.commentText || "—"}"
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.rule?.name ? (
                            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              {log.rule.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.publicReplySent ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Sent
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.privateDmSent ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Sent
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="h-3 w-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold",
                              log.status === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                : log.status === "SKIPPED"
                                ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                            )}
                          >
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                        No automation logs recorded yet. Once users comment on your posts, live triggers will appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: WEBHOOK & SETUP GUIDE */}
      {/* ========================================================= */}
      {activeTab === "setup" && (
        <div className="space-y-6 max-w-4xl">
          {/* Card 1: Webhook Endpoints */}
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Meta Webhook Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Paste these credentials into your Meta App Dashboard under <strong>Instagram &gt; Webhooks</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Callback URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Callback URL (Hub Webhook Ingestion)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="font-mono text-xs h-9 bg-muted/30"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="h-9 gap-1 text-xs shrink-0"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Verify Token (Hub Challenge Token)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={showVerifyToken ? "text" : "password"}
                    value={verifyToken}
                    className="font-mono text-xs h-9 bg-muted/30"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                    className="h-9 w-9 p-0 shrink-0 text-muted-foreground"
                    title={showVerifyToken ? "Hide Token" : "Show Token"}
                  >
                    {showVerifyToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(verifyToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="h-9 gap-1 text-xs shrink-0"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Token
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Subscribed Fields */}
            <div className="rounded-lg bg-muted/30 p-3 border space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                Required Subscribed Fields in Meta App:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {["comments", "mentions", "messages"].map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="bg-background text-foreground font-mono text-xs px-2.5 py-1"
                  >
                    {field}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to <strong>comments</strong> on the <strong>Instagram</strong> object to trigger Comment-to-DM flows.
              </p>
            </div>
          </div>

          {/* Card 2: Permissions Checklist */}
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Meta Graph API Required Permissions</h3>
                <p className="text-xs text-muted-foreground">
                  The following permissions are configured in our Meta App OAuth scopes:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { perm: "instagram_basic", desc: "Read profile info & linked accounts" },
                { perm: "instagram_manage_messages", desc: "Send automated direct messages (DMs)" },
                { perm: "instagram_manage_comments", desc: "Read & reply to comments on posts" },
                { perm: "pages_show_list", desc: "Discover Facebook Pages linked to Instagram" },
                { perm: "pages_read_engagement", desc: "Read post engagement telemetry" },
                { perm: "pages_manage_metadata", desc: "Auto-subscribe webhook events" },
              ].map((item, idx) => (
                <div key={idx} className="rounded-lg border p-2.5 bg-muted/10 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    {item.perm}
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Step-by-Step Meta Developer Guide */}
          <div className="rounded-xl border bg-card p-5 space-y-3 shadow-sm text-xs">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Instagram Business Account Requirements
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>
                Your Instagram account must be a <strong>Professional Account</strong> (Creator or Business), not a personal profile.
              </li>
              <li>
                The Instagram account must be linked to a <strong>Facebook Page</strong> that your Meta user has Admin access to.
              </li>
              <li>
                In your Meta Developer App, ensure the app type is set to <strong>Business</strong>.
              </li>
              <li>
                In Instagram App Settings &gt; Messages and Story Replies &gt; Message Controls &gt; Connected Tools, ensure <strong>"Allow Access to Messages"</strong> is enabled.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SIMULATOR RUNNER DRAWER / MODAL */}
      {/* ========================================================= */}
      {simulatorRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Test Automation Rule Simulator
                  </h3>
                  <p className="text-xs text-muted-foreground">Rule: {simulatorRule.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSimulatorRule(null)}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Simulated Inbound Comment
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={simulatorComment}
                    onChange={(e) => setSimulatorComment(e.target.value)}
                    placeholder="e.g. Can you send the demo link?"
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className="h-9 bg-rose-600 hover:bg-rose-700 text-white shrink-0 text-xs gap-1"
                  >
                    {isSimulating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span>{isSimulating ? "Simulating..." : "Simulate"}</span>
                  </Button>
                </div>
              </div>

              {simulatorResult && (
                <div className="space-y-3 pt-2">
                  {simulatorResult.matched ? (
                    <div className="space-y-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        Trigger Matched! Keyword: "{simulatorResult.keywordMatched}"
                      </div>

                      {/* Public reply */}
                      {simulatorResult.publicReply && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            Simulated Public Reply:
                          </span>
                          <div className="p-2 rounded bg-card border text-xs text-foreground italic">
                            💬 "{simulatorResult.publicReply}"
                          </div>
                        </div>
                      )}

                      {/* Private DM */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Simulated Instagram Direct Message (DM):
                        </span>
                        <div className="p-2 rounded bg-card border text-xs text-foreground font-sans whitespace-pre-wrap">
                          ✉️ {simulatorResult.privateDm}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      No trigger keywords matched this comment. DM would be skipped.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimulatorRule(null)}
                className="text-xs"
              >
                Close Simulator
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* Connect Account Modal */}
      <ConnectInstagramModal
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          loadAllData(true);
        }}
        onConnected={() => {
          loadAllData(true);
        }}
      />

      {/* Rule Builder Modal */}
      <InstagramRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setEditingRule(null);
          loadAllData(true);
        }}
        channelId={activeChannelForModal.id}
        channelUsername={activeChannelForModal.username}
        existingRule={editingRule}
        onSaved={() => {
          loadAllData(true);
        }}
      />

      {/* Logs Modal */}
      <InstagramLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        channelId={logsModalChannel.id}
        channelUsername={logsModalChannel.username}
      />
    </div>
  );
}

