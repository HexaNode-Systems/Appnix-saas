"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { api } from "@/lib/api/axios";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Wallet,
  Zap,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronRight,
  MoreVertical,
  Link2,
  FileText,
  CreditCard,
  Bot,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  ScanLine,
  MessageCircle,
  Users,
  Smartphone,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
} from "lucide-react";
import { ConnectFacebookModal } from "@/components/channels/ConnectFacebookModal";
import { ConnectWhatsAppModal } from "@/components/channels/ConnectWhatsAppModal";
import { ConnectInstagramModal } from "@/components/channels/ConnectInstagramModal";




function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.32 4.86L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.19h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.18.83.85-3.1-.2-.32a8.14 8.14 0 0 1-1.26-4.36c0-4.51 3.68-8.19 8.2-8.19 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 0 1 2.4 5.8c0 4.51-3.68 8.27-8.1 8.27Zm4.49-6.13c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}


function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 320 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}

// ---------- Types ----------
export type ChannelType = "whatsapp" | "instagram" | "facebook" | "rcs";

export interface ChannelField {
  label: string;
  value: string;
  icon: React.ElementType;
}

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  subtitle: string;
  status: "connected" | "disconnected";
  topRight?: { label: string; sub?: string };
  fields: ChannelField[];
  actions: React.ElementType[];
}

export const channelIconStyles: Record<ChannelType, string> = {
  whatsapp: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  instagram:
    "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
  facebook: "bg-blue-600 text-white",
  rcs: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export const channelIcons: Record<ChannelType, React.ElementType> = {
  whatsapp: WhatsAppIcon,
  instagram: Camera,
  facebook: FacebookIcon,
  rcs: Smartphone,
};

export const channelTitles: Record<ChannelType | "all", { title: string; subtitle: string }> = {
  all: {
    title: "All Channels",
    subtitle: "Manage your integrated communication channels, numbers, and bots.",
  },
  whatsapp: {
    title: "WhatsApp Channels",
    subtitle: "Connect and monitor your official WhatsApp Business numbers and API limits.",
  },
  instagram: {
    title: "Instagram Channels",
    subtitle: "Manage connected Instagram professional accounts and direct message bots.",
  },
  facebook: {
    title: "Facebook Channels",
    subtitle: "Manage Facebook Pages and Messenger automation workflows.",
  },
  rcs: {
    title: "RCS Business Channels",
    subtitle: "Configure carrier-verified Google RCS agents and rich card templates.",
  },
};

// Map real API / database channel data to UI Channel object
function mapApiChannelToUi(item: any): Channel {
  const type = ((item.type || item.channel || "").toLowerCase()) as ChannelType;
  const fields: ChannelField[] = [];

  if (type === "whatsapp") {
    if (item.phoneNumber) {
      fields.push({ label: "Phone Number", value: item.phoneNumber, icon: MessageCircle });
    }
    if (item.qualityRating) {
      fields.push({ label: "Quality Rating", value: item.qualityRating, icon: ScanLine });
    }
    if (item.messagingLimitTier || item.tierLimit) {
      fields.push({
        label: "Messaging Limit",
        value: item.messagingLimitTier || item.tierLimit,
        icon: MessageSquare,
      });
    }
    if (item.wabaId) {
      fields.push({ label: "WABA ID", value: item.wabaId, icon: Link2 });
    }
    if (item.phoneNumberId) {
      fields.push({ label: "Phone ID", value: item.phoneNumberId, icon: Smartphone });
    }
    if (item.codeVerificationStatus) {
      fields.push({ label: "Number Status", value: item.codeVerificationStatus, icon: CheckCircle2 });
    }
    if (item.webhookSubscribed !== undefined) {
      fields.push({
        label: "Webhook Sync",
        value: item.webhookSubscribed ? "Active & Live" : "Pending",
        icon: Zap,
      });
    }

    return {
      id: item.id || "whatsapp",
      type: "whatsapp",
      name: item.name || item.displayName || item.wabaName || "WhatsApp Cloud API",
      subtitle: item.phoneNumber || (item.wabaId ? `WABA: ${item.wabaId}` : "Connected Number"),
      status: "connected",
      topRight: { label: "Verified & Live", sub: "Cloud API" },
      fields,
      actions: [Link2, FileText, CreditCard, BarChart3, Bot, Zap, MessageSquare],
    };
  }

  if (type === "facebook") {
    if (item.pageId) {
      fields.push({ label: "Page ID", value: item.pageId, icon: Link2 });
    }
    if (item.category) {
      fields.push({ label: "Category", value: item.category, icon: ScanLine });
    }
    if (item.botEnabled !== undefined) {
      fields.push({
        label: "Messenger Bot",
        value: item.botEnabled ? "Active (Auto-Reply)" : "Manual Live Chat",
        icon: Bot,
      });
    }
    if (item.connectedAt) {
      fields.push({
        label: "Connected Date",
        value: new Date(item.connectedAt).toLocaleDateString(),
        icon: CheckCircle2,
      });
    }
    fields.push({ label: "Messenger Sync", value: "Direct Sync Enabled", icon: MessageSquare });

    return {
      id: item.id || `fb_${item.pageId || "page"}`,
      type: "facebook",
      name: item.name || item.pageName || "Facebook Page",
      subtitle: item.pageId ? `Page ID: ${item.pageId}` : (item.subtitle || "Connected Page"),
      status: "connected",
      topRight: { label: "Page Connected", sub: "Facebook Messenger" },
      fields,
      actions: [Link2, FileText, BarChart3, Bot],
    };
  }

  if (type === "instagram") {
    if (item.accountHandle) {
      fields.push({
        label: "Account Handle",
        value: item.accountHandle.startsWith("@") ? item.accountHandle : `@${item.accountHandle}`,
        icon: Camera,
      });
    }
    if (item.pageId) {
      fields.push({ label: "Connected Page ID", value: item.pageId, icon: Link2 });
    }
    if (item.autoReplyEnabled !== undefined) {
      fields.push({
        label: "Story Auto-Reply",
        value: item.autoReplyEnabled ? "Enabled" : "Disabled",
        icon: Bot,
      });
    }
    if (item.connectedAt) {
      fields.push({
        label: "Connected Date",
        value: new Date(item.connectedAt).toLocaleDateString(),
        icon: CheckCircle2,
      });
    }
    fields.push({ label: "Direct Sync", value: "Active", icon: ScanLine });

    return {
      id: item.id || "instagram",
      type: "instagram",
      name: item.name || item.accountName || "Instagram Professional",
      subtitle: item.accountHandle
        ? (item.accountHandle.startsWith("@") ? item.accountHandle : `@${item.accountHandle}`)
        : (item.subtitle || "Instagram Channel"),
      status: "connected",
      topRight: { label: "Professional Account", sub: "Direct Messages" },
      fields,
      actions: [Link2, BarChart3, Bot, Camera],
    };
  }

  if (type === "rcs") {
    if (item.agentId) {
      fields.push({ label: "Agent ID", value: item.agentId, icon: Smartphone });
    }
    if (item.carriers && (Array.isArray(item.carriers) ? item.carriers.length > 0 : Boolean(item.carriers))) {
      fields.push({
        label: "Carriers",
        value: Array.isArray(item.carriers) ? item.carriers.join(", ") : String(item.carriers),
        icon: CheckCircle2,
      });
    }
    if (item.throughput) {
      fields.push({ label: "Throughput", value: item.throughput, icon: Zap });
    }
    if (item.connectedAt) {
      fields.push({
        label: "Connected Date",
        value: new Date(item.connectedAt).toLocaleDateString(),
        icon: ScanLine,
      });
    }
    fields.push({ label: "Rich Cards", value: "Supported", icon: FileText });

    return {
      id: item.id || "rcs",
      type: "rcs",
      name: item.name || item.agentName || "Google RCS Agent",
      subtitle: item.agentId ? `Agent: ${item.agentId}` : (item.subtitle || "RCS Channel"),
      status: "connected",
      topRight: { label: "Carrier Verified", sub: "Google RCS" },
      fields,
      actions: [Link2, FileText, BarChart3, Bot, Zap, Smartphone],
    };
  }

  return {
    id: item.id || String(Date.now()),
    type: type || "whatsapp",
    name: item.name || "Connected Channel",
    subtitle: item.subtitle || "",
    status: "connected",
    fields,
    actions: [Link2, FileText, BarChart3, Bot],
  };
}

interface ChannelManagerProps {
  filterType?: ChannelType | "all";
}

export function ChannelManager({ filterType = "all" }: ChannelManagerProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ChannelType>(
    filterType === "all" ? "whatsapp" : filterType
  );
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelSubtitle, setNewChannelSubtitle] = useState("");

  const pageInfo = channelTitles[filterType];

  // Fetch real channels from database via backend API
  const fetchChannels = useCallback(async () => {
    try {
      setIsLoadingChannels(true);
      const res = await api.get("/channels");
      const list = res.data?.data;
      if (Array.isArray(list)) {
        const mapped = list
          .filter((c: any) => c.status === "connected" || c.isConnected === true)
          .map(mapApiChannelToUi);
        setChannels(mapped);
      } else {
        setChannels([]);
      }
    } catch (err) {
      console.error("Failed to fetch channels from server:", err);
      setChannels([]);
    } finally {
      setIsLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const displayedChannels = channels.filter((channel) => {
    const matchesType = filterType === "all" || channel.type === filterType;
    const matchesSearch =
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDisconnect = async (id: string, type: ChannelType) => {
    try {
      await api.post(`/channels/disconnect/${type.toUpperCase()}`);
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      fetchChannels();
    }
  };

  const handleRemove = async (id: string, type: ChannelType) => {
    try {
      await api.post(`/channels/disconnect/${type.toUpperCase()}`);
    } catch (err) {
      console.error("Remove channel error:", err);
    } finally {
      fetchChannels();
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelType === "whatsapp") {
      setIsAddModalOpen(false);
      setIsWhatsAppModalOpen(true);
      return;
    }
    if (newChannelType === "facebook") {
      setIsAddModalOpen(false);
      setIsFacebookModalOpen(true);
      return;
    }
    if (newChannelType === "instagram") {
      setIsAddModalOpen(false);
      setIsInstagramModalOpen(true);
      return;
    }

    if (!newChannelName.trim()) return;

    try {
      const channelEnum = newChannelType.toUpperCase();
      const configPayload: any = {
        name: newChannelName.trim(),
        subtitle: newChannelSubtitle.trim(),
      };
      if (newChannelType === "rcs") {
        configPayload.agentName = newChannelName.trim();
        configPayload.agentId = newChannelSubtitle.trim();
      }

      await api.post("/channels/connect", {
        channel: channelEnum,
        config: configPayload,
      });

      setNewChannelName("");
      setNewChannelSubtitle("");
      setIsAddModalOpen(false);
      fetchChannels();
    } catch (err) {
      console.error("Failed to connect channel:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          {filterType !== "all" && (
            <>
              <Link
                href="/channels"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Channels</span>
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            </>
          )}
          <span>Channels</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-foreground font-medium">{pageInfo.title}</span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
              {pageInfo.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pageInfo.subtitle}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
            <Button
              onClick={() => {
                if (filterType === "whatsapp") {
                  setIsWhatsAppModalOpen(true);
                } else if (filterType === "facebook") {
                  setIsFacebookModalOpen(true);
                } else if (filterType === "instagram") {
                  setIsInstagramModalOpen(true);
                } else {
                  setNewChannelType(filterType === "all" ? "whatsapp" : filterType);
                  setIsAddModalOpen(true);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm"
            >
              <Plus className="h-4 w-4 sm:mr-1" />
              <span>Add New Channel</span>
            </Button>
            {filterType === "rcs" && (
              <Link href="/channels/rcs/templates">
                <Button variant="outline" className="shrink-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                  <FileText className="h-4 w-4 sm:mr-1" />
                  <span>RCS Message Templates</span>
                </Button>
              </Link>
            )}
            {filterType === "whatsapp" && (
              <Link href="/channels/whatsapp/templates">
                <Button variant="outline" className="shrink-0 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
                  <FileText className="h-4 w-4 sm:mr-1" />
                  <span>WhatsApp Templates</span>
                </Button>
              </Link>
            )}
            <Link href="/channels/statistics">
              <Button variant="outline" className="shrink-0">
                <BarChart3 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Conversation Statistics</span>
              </Button>
            </Link>
           
           
          </div>
        </div>
      </div>

      {/* View toggle + Search + Sort toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-xl bg-card p-3 gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              size="icon"
              variant={view === "grid" ? "default" : "ghost"}
              className="h-7 w-7 rounded-md"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={view === "list" ? "default" : "ghost"}
              className="h-7 w-7 rounded-md"
              onClick={() => setView("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${filterType === "all" ? "all" : filterType} channels...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-8 text-xs bg-background"
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
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
          <span>
            Showing {displayedChannels.length} channel
            {displayedChannels.length !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <span>Sort</span>
          </Button>
        </div>
      </div>

      {/* Channel Cards Grid / List */}
      {isLoadingChannels ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-3 shadow-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
          <p className="text-xs text-muted-foreground">Loading connected channels...</p>
        </div>
      ) : displayedChannels.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground space-y-4 shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            {filterType === "whatsapp" ? (
              <WhatsAppIcon className="h-8 w-8" />
            ) : filterType === "facebook" ? (
              <FacebookIcon className="h-8 w-8" />
            ) : filterType === "instagram" ? (
              <Camera className="h-8 w-8" />
            ) : filterType === "rcs" ? (
              <Smartphone className="h-8 w-8" />
            ) : (
              <ScanLine className="h-8 w-8" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-lg">
              {searchQuery
                ? "No Channels Found"
                : filterType === "whatsapp"
                ? "No WhatsApp channels connected yet"
                : filterType === "facebook"
                ? "No Facebook channels connected yet"
                : filterType === "instagram"
                ? "No Instagram channels connected yet"
                : filterType === "rcs"
                ? "No RCS channels connected yet"
                : "No channels connected yet"}
            </h3>
            <p className="text-xs max-w-md mx-auto text-muted-foreground leading-relaxed">
              {searchQuery
                ? "No channels matched your search query. Try clearing your search."
                : filterType === "whatsapp"
                ? "Connect your official WhatsApp Business Account via Meta Embedded Signup to start broadcasting campaigns and automating conversations with the WhatsApp Cloud API."
                : filterType === "all"
                ? "You haven't connected any communication channels yet. Click below to connect your WhatsApp, Facebook, Instagram, or RCS accounts."
                : `You have not connected any ${pageInfo.title.toLowerCase()} yet. Click below to connect your first account.`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (filterType === "whatsapp") {
                setIsWhatsAppModalOpen(true);
              } else if (filterType === "facebook") {
                setIsFacebookModalOpen(true);
              } else {
                setNewChannelType(filterType === "all" ? "whatsapp" : filterType);
                setIsAddModalOpen(true);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
          >
            {filterType === "whatsapp" ? (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Connect via Meta Embedded Signup</span>
              </>
            ) : filterType === "facebook" ? (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Connect Facebook Page</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Add New Channel</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            view === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          )}
        >
          {displayedChannels.map((channel) => {
            const Icon = channelIcons[channel.type];
            return (
              <div
                key={channel.id}
                className="rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Card Header */}
                <div className="flex items-start sm:items-center justify-between gap-2 p-4 border-b bg-muted/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs",
                        channelIconStyles[channel.type]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            channel.status === "connected"
                              ? "bg-emerald-500 shadow-xs"
                              : "bg-rose-500"
                          )}
                        />
                        <p className="font-semibold text-sm text-foreground truncate">
                          {channel.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {channel.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {channel.topRight && (
                      <Link
                        href={
                          channel.type === "whatsapp"
                            ? "/channels/whatsapp/balance"
                            : "/channels/balance"
                        }
                        className="text-right shrink-0 block group/bal hover:opacity-85 transition-opacity mr-1"
                      >
                        <p className="text-xs font-semibold flex items-center gap-1 justify-end whitespace-nowrap text-foreground group-hover/bal:text-emerald-600 dark:group-hover/bal:text-emerald-400">
                          <Wallet className="h-3.5 w-3.5 text-primary" />
                          {channel.topRight.label}
                        </p>
                        {channel.topRight.sub && (
                          <p className="text-[11px] text-primary flex items-center gap-1 justify-end mt-0.5 whitespace-nowrap group-hover/bal:underline">
                            <RefreshCw className="h-2.5 w-2.5" />
                            {channel.topRight.sub}
                          </p>
                        )}
                      </Link>
                    )}

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
                        <DropdownMenuItem onClick={() => alert(`Configuring ${channel.name}`)}>
                          Edit Configuration
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDisconnect(channel.id, channel.type)}>
                          {channel.status === "connected" ? "Disconnect" : "Reconnect"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemove(channel.id, channel.type)}
                          className="text-destructive"
                        >
                          Remove Channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Stats Fields */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 p-4 bg-card">
                  {channel.fields.map((field) => (
                    <div key={field.label} className="min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                        {field.label}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs font-medium mt-1 truncate text-foreground">
                        <field.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{field.value}</span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Icons toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 border-t bg-muted/20 overflow-x-auto">
                  {channel.actions.map((ActionIcon, idx) => {
                    let title = "Channel Action";
                    let href = "";

                    if (ActionIcon === FileText) {
                      title =
                        channel.type === "whatsapp"
                          ? "WhatsApp Templates (Meta Approval)"
                          : channel.type === "rcs"
                          ? "RCS Message Templates (Carrier Approval)"
                          : "Message Templates";
                      href =
                        channel.type === "whatsapp"
                          ? "/channels/whatsapp/templates"
                          : channel.type === "rcs"
                          ? "/channels/rcs/templates"
                          : "/automations/templates";
                    } else if (ActionIcon === Bot) {
                      title = "Chatbot Automation Builder";
                      href = "/chatbots";
                    } else if (ActionIcon === MessageSquare) {
                      title = "Live Chat & Broadcast";
                      href = "/crm/live-chat";
                    } else if (ActionIcon === BarChart3) {
                      title = "Conversation Statistics";
                      href = "/automations/analytics";
                    } else if (ActionIcon === Link2) {
                      title = "Webhook & API Integration";
                    } else if (ActionIcon === CreditCard) {
                      title =
                        channel.type === "whatsapp"
                          ? "WhatsApp Balance & Micro-Deduction Ledger"
                          : "Channel Balance & Wallet";
                      href =
                        channel.type === "whatsapp"
                          ? "/channels/whatsapp/balance"
                          : "/channels/balance";
                    } else if (ActionIcon === Zap) {
                      title = "Workflow Automation";
                      href = "/automations/workflow";
                    }

                    if (href) {
                      return (
                        <Link key={idx} href={href} title={title}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                              ActionIcon === FileText && channel.type === "whatsapp" && "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60",
                              ActionIcon === FileText && channel.type === "rcs" && "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60",
                              ActionIcon === CreditCard && channel.type === "whatsapp" && "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                            )}
                          >
                            <ActionIcon className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      );
                    }

                    return (
                      <Button
                        key={idx}
                        size="icon"
                        variant="ghost"
                        title={title}
                        onClick={() => alert(`${title} for ${channel.name}`)}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ActionIcon className="h-3.5 w-3.5" />
                      </Button>
                    );
                  })}

                  <div className="ml-auto">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider",
                        channel.status === "connected"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                      )}
                    >
                      {channel.status}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Channel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-foreground">
                Connect New Channel
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {newChannelType === "whatsapp" ? (
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Select Channel Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["whatsapp", "instagram", "facebook", "rcs"] as ChannelType[]).map(
                      (type) => {
                        const Icon = channelIcons[type];
                        const isSelected = newChannelType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              if (type === "whatsapp") {
                                setIsAddModalOpen(false);
                                setIsWhatsAppModalOpen(true);
                              } else if (type === "facebook") {
                                setIsAddModalOpen(false);
                                setIsFacebookModalOpen(true);
                              } else {
                                setNewChannelType(type);
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <div
                              className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center mb-1",
                                channelIconStyles[type]
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[11px] font-semibold capitalize text-foreground">
                              {type}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                        <WhatsAppIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Official WhatsApp Cloud API</h4>
                        <p className="text-[11px] text-muted-foreground">Direct Meta Graph API Integration</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold">
                      Meta Official
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect your official WhatsApp Business Account (WABA) and phone number directly through Meta&apos;s verified Embedded Signup flow. No manual tokens, dummy data, or external webhooks required.
                  </p>

                  <div className="rounded-lg bg-background/60 border p-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Automatic Phone Number & OTP Verification</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Encrypted System User Tokens & Webhook Subscription</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-medium text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Real-time Sync with Appnix CRM & Bot Workflows</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsWhatsAppModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm flex items-center gap-1.5"
                  >
                    <span>Continue with Facebook / Meta</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddChannel} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Select Channel Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["whatsapp", "instagram", "facebook", "rcs"] as ChannelType[]).map(
                      (type) => {
                        const Icon = channelIcons[type];
                        const isSelected = newChannelType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              if (type === "whatsapp") {
                                setIsAddModalOpen(false);
                                setIsWhatsAppModalOpen(true);
                              } else if (type === "facebook") {
                                setIsAddModalOpen(false);
                                setIsFacebookModalOpen(true);
                              } else if (type === "instagram") {
                                setIsAddModalOpen(false);
                                setIsInstagramModalOpen(true);
                              } else {
                                setNewChannelType(type);
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <div
                              className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center mb-1",
                                channelIconStyles[type]
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[11px] font-semibold capitalize text-foreground">
                              {type}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Channel / Account Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Sales Support Number / @brand_instagram"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Identifier (Phone / Handle / ID)
                  </label>
                  <Input
                    placeholder="e.g. +91 98765 43210 or @myhandle"
                    value={newChannelSubtitle}
                    onChange={(e) => setNewChannelSubtitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Instant Webhook & Cloud API Sync
                  </p>
                  <p>
                    Connecting this channel will enable live chats, bulk campaigns, and automated bot workflows.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Connect Channel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Connect Facebook Page Modal */}
      <ConnectFacebookModal
        isOpen={isFacebookModalOpen}
        onClose={() => {
          setIsFacebookModalOpen(false);
          fetchChannels();
        }}
        onChannelCreated={(newCh) => {
          setChannels((prev) => [newCh, ...prev.filter((c) => c.id !== newCh.id)]);
        }}
        existingChannels={channels}
      />

      {/* Connect WhatsApp Cloud API Modal (Meta Embedded Signup) */}
      <ConnectWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          fetchChannels();
        }}
        onChannelCreated={(newCh) => {
          setChannels((prev) => [newCh, ...prev.filter((c) => c.type !== "whatsapp")]);
        }}
      />

      {/* Connect Instagram Professional Account Modal */}
      <ConnectInstagramModal
        isOpen={isInstagramModalOpen}
        onClose={() => {
          setIsInstagramModalOpen(false);
          fetchChannels();
        }}
        onConnected={() => {
          fetchChannels();
        }}
        onChannelCreated={(newCh) => {
          setChannels((prev) => [newCh, ...prev.filter((c) => c.id !== newCh.id)]);
        }}
        existingChannels={channels}
      />
    </div>
  );
}
