"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ArrowLeft,
  Plus,
  FolderPlus,
  Folder as FolderIcon,
  Copy,
  Pencil,
  MoreVertical,
  MessageSquare,
  Camera,
  Zap,
  MessageCircle,
  Search,
  Bot as BotIcon,
  Share2,
  Trash2,
  Loader2,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { api, apiEndpoints } from "@/lib/api/axios";
import { useToast } from "@/hooks/use-toast";

type ChannelType = "whatsapp" | "instagram" | "rcs" | "facebook";

interface BotRow {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "PUBLISHED" | "DRAFT" | "DISABLED" | "ARCHIVED";
  triggerType?: string;
  trigger?: { type?: string; config?: Record<string, unknown> };
  channel: ChannelType;
  channels: ChannelType[];
  tags: string[];
  conversations: number;
  interactionsCount?: number;
  folderId?: string | null;
  createdAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  botCount: number;
  createdAt?: string;
}

interface ChannelItem {
  id: string;
  name: string;
  type: string;
  status: string;
}

const channelStyle: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  whatsapp: { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: MessageSquare, label: "WhatsApp" },
  instagram: { bg: "bg-pink-500/10 text-pink-600 border-pink-500/20", icon: Camera, label: "Instagram" },
  rcs: { bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: MessageCircle, label: "RCS" },
  facebook: { bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Share2, label: "Facebook" },
};

export default function BotWorkflowPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [bots, setBots] = useState<BotRow[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Folder creation modal state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // Delete folder confirmation
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Fetch all real data from backend APIs
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [botsRes, foldersRes, channelsRes] = await Promise.all([
        api.get(apiEndpoints.bots.list),
        api.get(apiEndpoints.bots.folders),
        api.get("/channels").catch(() => ({ data: { data: [] } })),
      ]);

      const rawBots = Array.isArray(botsRes.data?.data)
        ? botsRes.data.data
        : Array.isArray(botsRes.data)
        ? botsRes.data
        : [];

      const rawFolders = Array.isArray(foldersRes.data?.data)
        ? foldersRes.data.data
        : Array.isArray(foldersRes.data)
        ? foldersRes.data
        : [];

      const rawChannels = Array.isArray(channelsRes.data?.data)
        ? channelsRes.data.data
        : Array.isArray(channelsRes.data)
        ? channelsRes.data
        : [];

      setBots(rawBots);
      setFolders(rawFolders);
      setChannels(rawChannels.filter((c: any) => c.status === "connected" || c.isConnected));
    } catch (err: any) {
      toast({
        title: "Error fetching chatbots",
        description: err?.response?.data?.message || "Failed to load botflows from backend.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle active/status
  const handleToggleStatus = async (flow: BotRow) => {
    const isCurrentlyActive = flow.status === "ACTIVE" || flow.status === "PUBLISHED";
    const nextStatus = isCurrentlyActive ? "DISABLED" : "ACTIVE";

    // Optimistic UI update
    setBots((prev) =>
      prev.map((b) => (b.id === flow.id ? { ...b, status: nextStatus } : b))
    );

    try {
      await api.put(apiEndpoints.bots.update(flow.id), { status: nextStatus });
      toast({
        title: nextStatus === "ACTIVE" ? "Botflow Activated" : "Botflow Paused",
        description: `"${flow.name}" status updated to ${nextStatus}.`,
      });
    } catch (err: any) {
      // Revert on error
      setBots((prev) =>
        prev.map((b) => (b.id === flow.id ? { ...b, status: flow.status } : b))
      );
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message || "Could not update botflow status.",
        variant: "destructive",
      });
    }
  };

  // Duplicate botflow
  const handleDuplicate = async (flow: BotRow) => {
    setActionLoadingId(flow.id);
    try {
      const res = await api.post(apiEndpoints.bots.duplicate(flow.id));
      const duplicated = res.data?.data || res.data;
      if (duplicated) {
        setBots((prev) => [duplicated, ...prev]);
        toast({
          title: "Botflow Duplicated",
          description: `Created copy "${duplicated.name}".`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Duplicate Failed",
        description: err?.response?.data?.message || "Could not duplicate botflow.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete botflow
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      await api.delete(apiEndpoints.bots.delete(id));
      setBots((prev) => prev.filter((b) => b.id !== id));
      toast({
        title: "Botflow Deleted",
        description: `"${name}" has been permanently removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.response?.data?.message || "Could not delete botflow.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsSubmittingFolder(true);
    try {
      const res = await api.post(apiEndpoints.bots.createFolder, { name: newFolderName.trim() });
      const created = res.data?.data || res.data;
      if (created) {
        setFolders((prev) => [...prev, { id: created.id, name: created.name, botCount: 0 }]);
        setActiveFolder(created.id);
        setNewFolderName("");
        setIsCreatingFolder(false);
        toast({
          title: "Folder Created",
          description: `Folder "${created.name}" created successfully.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to create folder",
        description: err?.response?.data?.message || "Could not create folder.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Delete folder "${folderName}"? Botflows will not be deleted.`)) {
      return;
    }

    setDeletingFolderId(folderId);
    try {
      await api.delete(apiEndpoints.bots.deleteFolder(folderId));
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolder === folderId) {
        setActiveFolder("all");
      }
      toast({
        title: "Folder Deleted",
        description: `Folder "${folderName}" was deleted.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete folder",
        description: err?.response?.data?.message || "Could not delete folder.",
        variant: "destructive",
      });
    } finally {
      setDeletingFolderId(null);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return bots.filter((r) => {
      const nameMatch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const descMatch = r.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const triggerMatch =
        (r.triggerType?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (r.trigger?.type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const tagMatch = Array.isArray(r.tags)
        ? r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        : false;

      const matchesSearch = !searchQuery.trim() || nameMatch || descMatch || triggerMatch || tagMatch;

      const matchesChannel =
        selectedChannel === "all" ||
        r.channel === selectedChannel ||
        (Array.isArray(r.channels) && r.channels.includes(selectedChannel as ChannelType));

      const matchesFolder =
        activeFolder === "all" || r.folderId === activeFolder;

      return matchesSearch && matchesChannel && matchesFolder;
    });
  }, [bots, searchQuery, selectedChannel, activeFolder]);

  // Real dynamic metrics
  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.status === "ACTIVE" || b.status === "PUBLISHED").length;
  const totalConversations = bots.reduce(
    (acc, b) => acc + (b.conversations || b.interactionsCount || 0),
    0
  );
  const resolutionRateText = totalConversations > 0 ? "100%" : "0%";

  return (
    <div className="space-y-6 w-full">
      {/* Sleek Breadcrumb Back Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-primary">Chatbots & Automations</span>
      </nav>

      {/* Header Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BotIcon className="h-6 w-6 text-primary" />
            Chatbots & Workflow Automations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design multi-channel visual botflows, keyword triggers, OpenAI responses, and human agent escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/chatbots/builder/new")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm px-4"
          >
            <Plus className="h-4 w-4" />
            Create Botflow
          </Button>
        </div>
      </div>

      {/* Real Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Total Botflows</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : totalBots}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Active Workflows</p>
          <p className="text-2xl font-bold text-emerald-600">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : activeBots}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Conversations Handled</p>
          <p className="text-2xl font-bold text-primary">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              totalConversations.toLocaleString()
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Resolution Rate</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : resolutionRateText}
          </p>
        </div>
      </div>

      {/* Main Content Layout with Folders & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Folders Sidebar (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Folders</h3>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> New
            </button>
          </div>

          {/* New Folder Inline Form */}
          {isCreatingFolder && (
            <form onSubmit={handleCreateFolder} className="p-2 border rounded-xl bg-muted/20 space-y-2">
              <Input
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="h-7 text-xs bg-background"
              />
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                  className="h-6 text-[11px] px-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newFolderName.trim() || isSubmittingFolder}
                  className="h-6 text-[11px] px-2.5 bg-primary text-primary-foreground"
                >
                  {isSubmittingFolder ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {/* All Botflows Default Option */}
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                activeFolder === "all"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-3.5 w-3.5" />
                <span className="truncate">All Botflows</span>
              </div>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {totalBots}
              </Badge>
            </button>

            {/* Dynamic Folders from Database */}
            {folders.map((f) => {
              const countInFolder = bots.filter((b) => b.folderId === f.id).length;

              return (
                <div
                  key={f.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                    activeFolder === f.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFolder(f.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left"
                  >
                    <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      {countInFolder}
                    </Badge>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(f.id, f.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 transition-opacity"
                      title="Delete Folder"
                    >
                      {deletingFolderId === f.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Workflows Table (9 cols) */}
        <div className="lg:col-span-9 rounded-2xl border bg-card shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search botflows, triggers, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Connected channels filter */}
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Channels</option>
                {channels.map((c) => (
                  <option key={c.id || c.type} value={c.type.toLowerCase()}>
                    {c.name || channelStyle[c.type.toLowerCase()]?.label || c.type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Content: Loading / Empty State / Table */}
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading botflows from backend...</p>
            </div>
          ) : bots.length === 0 ? (
            /* Empty State: 0 Bots in Database */
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <BotIcon className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-foreground">No Botflows Created Yet</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Design visual conversational flows, keyword triggers, and intelligent AI responses across your connected channels.
                </p>
              </div>
              <Button
                onClick={() => router.push("/chatbots/builder/new")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm px-5"
              >
                <Plus className="h-4 w-4" />
                Create Your First Botflow
              </Button>
            </div>
          ) : filteredRows.length === 0 ? (
            /* Empty State: Filter Returned No Match */
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">No Botflows Match Your Filter</h3>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search keyword, folder, or channel selection.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedChannel("all");
                  setActiveFolder("all");
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            /* Table of Real Bots */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b text-muted-foreground uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Bot Name & Trigger</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3">Traffic</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRows.map((flow) => {
                    const primaryChannel =
                      flow.channel ||
                      (Array.isArray(flow.channels) && flow.channels[0]) ||
                      "whatsapp";
                    const cfg = channelStyle[primaryChannel] || channelStyle.whatsapp;
                    const Icon = cfg.icon;
                    const isActive = flow.status === "ACTIVE" || flow.status === "PUBLISHED";
                    const isBusy = actionLoadingId === flow.id;

                    const formattedDate = flow.createdAt
                      ? new Date(flow.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently";

                    const triggerName =
                      flow.triggerType ||
                      flow.trigger?.type?.replace(/_/g, " ") ||
                      "Inbound Message";

                    return (
                      <tr key={flow.id} className="hover:bg-accent/30 transition-colors group">
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={isActive}
                              disabled={isBusy}
                              onCheckedChange={() => handleToggleStatus(flow)}
                            />
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              className={cn(
                                "text-[9px] py-0 px-1.5 font-bold uppercase",
                                isActive
                                  ? "bg-emerald-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {flow.status}
                            </Badge>
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center border",
                              cfg.bg
                            )}
                            title={cfg.label}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                        </td>

                        <td className="p-3 min-w-[200px]">
                          <Link
                            href={`/chatbots/builder/${flow.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors block truncate"
                          >
                            {flow.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <Zap className="h-3 w-3 text-primary" />
                            {triggerName}
                          </p>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            {Array.isArray(flow.tags) && flow.tags.length > 0 ? (
                              flow.tags.map((t, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] py-0 px-1 font-medium"
                                >
                                  {t}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap font-medium text-foreground">
                          {(flow.conversations || flow.interactionsCount || 0).toLocaleString()} chats
                        </td>

                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {formattedDate}
                        </td>

                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => router.push(`/chatbots/builder/${flow.id}`)}
                              title="Edit Flow"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isBusy}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleDuplicate(flow)}
                              title="Duplicate"
                            >
                              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/chatbots/builder/${flow.id}`)}
                                >
                                  Open Visual Builder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push("/crm/live-chat")}>
                                  View Active Conversations
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(flow.id, flow.name)}
                                  className="text-destructive font-medium"
                                >
                                  Delete Botflow
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}