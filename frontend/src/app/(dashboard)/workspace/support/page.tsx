"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/axios";
import {
  ChevronRight,
  ArrowLeft,
  Headset,
  Plus,
  Search,
  Ticket,
  Clock,
  CircleDot,
  RefreshCw,
  CheckCircle2,
  Archive,
  Paperclip,
  Send,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react";

// ---------- Types ----------
export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting for Customer"
  | "Resolved"
  | "Closed";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface TicketReply {
  id: string;
  sender?: "customer" | "agent" | string;
  senderName?: string;
  senderRole?: string;
  message: string;
  timestamp?: string;
  createdAt?: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  ticketId?: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assignedAgent?: {
    name?: string;
    role?: string;
    email?: string;
    avatarUrl?: string;
  };
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

// ---------- Style Maps ----------
const priorityStyles: Record<TicketPriority, { badge: string; dot: string }> = {
  Low: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
    dot: "bg-slate-500",
  },
  Medium: {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    dot: "bg-blue-500",
  },
  High: {
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
    dot: "bg-amber-500",
  },
  Urgent: {
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
    dot: "bg-rose-500 animate-pulse",
  },
};

const statusStyles: Record<TicketStatus, { badge: string; icon: React.ElementType }> = {
  Open: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
    icon: CircleDot,
  },
  "In Progress": {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
    icon: RefreshCw,
  },
  "Waiting for Customer": {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
    icon: Clock,
  },
  Resolved: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
    icon: CheckCircle2,
  },
  Closed: {
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
    icon: Archive,
  },
};

// ---------- Normalization Helpers ----------
function normalizeStatus(status?: string): TicketStatus {
  if (!status) return "Open";
  const s = status.toLowerCase();
  if (s.includes("progress")) return "In Progress";
  if (s.includes("waiting")) return "Waiting for Customer";
  if (s.includes("resolved")) return "Resolved";
  if (s.includes("closed")) return "Closed";
  return "Open";
}

function normalizePriority(priority?: string): TicketPriority {
  if (!priority) return "Medium";
  const p = priority.toLowerCase();
  if (p === "urgent") return "Urgent";
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [replyInput, setReplyInput] = useState("");

  // New Ticket Form State
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("Technical Support");
  const [newPriority, setNewPriority] = useState<TicketPriority>("Medium");
  const [newDescription, setNewDescription] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");

  // Fetch tickets from live backend API
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/support/tickets");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const mappedTickets: SupportTicket[] = data.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber || t.ticketId || `SUP-${t.id?.slice(0, 5)}`,
        ticketId: t.ticketNumber || t.ticketId || `SUP-${t.id?.slice(0, 5)}`,
        subject: t.subject,
        category: t.category || "Technical Support",
        priority: normalizePriority(t.priority),
        status: normalizeStatus(t.status),
        description: t.description,
        assignedAgent: t.assignedAgent || {
          name: "Tier 1 Specialist",
          role: "Support Engineer",
        },
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        replies: Array.isArray(t.replies) ? t.replies : [],
      }));

      setTickets(mappedTickets);

      if (activeTicket) {
        const found = mappedTickets.find(
          (t) => t.id === activeTicket.id || t.ticketNumber === activeTicket.ticketNumber
        );
        if (found) setActiveTicket(found);
      }
    } catch (err: any) {
      console.error("Failed to load tickets:", err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load support tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTicket, toast]);

  useEffect(() => {
    loadTickets();
  }, []);

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus =
      selectedStatus === "All" || t.status === selectedStatus;
    const ticketNum = t.ticketNumber || t.id;
    const matchesSearch =
      ticketNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle raise ticket via live API
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: {
        subject: string;
        category: string;
        priority: string;
        description: string;
        attachments?: string[];
      } = {
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        description: newDescription.trim(),
      };

      if (newAttachmentName.trim()) {
        payload.attachments = [newAttachmentName.trim()];
      }

      const res = await api.post("/support/tickets", payload);
      const created = res.data?.data || res.data;

      const newTicketNumber = created?.ticketNumber || created?.ticketId || "SUP";
      toast({
        title: "Ticket Created Successfully",
        description: `Ticket #${newTicketNumber} received. Confirmation email sent!`,
      });

      setIsRaiseModalOpen(false);
      setNewSubject("");
      setNewDescription("");
      setNewAttachmentName("");

      await loadTickets();
      if (created) {
        setActiveTicket({
          id: created.id,
          ticketNumber: newTicketNumber,
          ticketId: newTicketNumber,
          subject: created.subject,
          category: created.category || newCategory,
          priority: normalizePriority(created.priority),
          status: normalizeStatus(created.status),
          description: created.description,
          assignedAgent: created.assignedAgent || {
            name: "Support Routing Engine",
            role: "Assigned Specialist",
          },
          attachments: created.attachments || [],
          createdAt: created.createdAt || new Date().toISOString(),
          updatedAt: created.updatedAt || new Date().toISOString(),
          replies: created.replies || [],
        });
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message
        ? Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message
        : err?.message || "An error occurred while creating ticket.";
      toast({
        title: "Failed to Create Ticket",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle send reply via live API
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeTicket) return;

    setIsReplying(true);
    try {
      const targetId = activeTicket.id || activeTicket.ticketNumber;
      await api.post(`/support/tickets/${targetId}/reply`, {
        message: replyInput.trim(),
      });

      setReplyInput("");
      toast({
        title: "Reply Sent",
        description: "Your response has been added to the ticket thread.",
      });

      // Reload single ticket thread
      try {
        const refreshed = await api.get(`/support/tickets/${targetId}`);
        const data = refreshed.data?.data || refreshed.data;
        if (data) {
          const updatedTicket: SupportTicket = {
            id: data.id,
            ticketNumber: data.ticketNumber || data.ticketId || activeTicket.ticketNumber,
            ticketId: data.ticketNumber || data.ticketId || activeTicket.ticketNumber,
            subject: data.subject,
            category: data.category,
            priority: normalizePriority(data.priority),
            status: normalizeStatus(data.status),
            description: data.description,
            assignedAgent: data.assignedAgent || activeTicket.assignedAgent,
            attachments: data.attachments || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            replies: Array.isArray(data.replies) ? data.replies : [],
          };
          setActiveTicket(updatedTicket);
          setTickets((prev) =>
            prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
          );
        } else {
          await loadTickets();
        }
      } catch {
        await loadTickets();
      }
    } catch (err: any) {
      toast({
        title: "Failed to Send Reply",
        description: err?.response?.data?.message || "Could not dispatch reply.",
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  };

  // Handle status update via live API
  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!activeTicket) return;
    const targetId = activeTicket.id || activeTicket.ticketNumber;
    try {
      await api.patch(`/support/tickets/${targetId}/status`, {
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `Ticket status set to ${newStatus}.`,
      });

      setActiveTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === targetId || t.ticketNumber === targetId
            ? { ...t, status: newStatus }
            : t
        )
      );
    } catch (err: any) {
      toast({
        title: "Status Update Failed",
        description: err?.response?.data?.message || "Could not update status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/workspace"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Workspace</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-primary">Support</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Headset className="h-6 w-6 text-primary" />
            Support Helpdesk & Tickets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raise new technical support inquiries, track resolution tickets, and communicate directly with engineering support.
          </p>
        </div>

        <Button
          onClick={() => setIsRaiseModalOpen(true)}
          className="bg-primary text-primary-foreground gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Raise New Ticket
        </Button>
      </div>

      {/* Ticket Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Ticket className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Total Tickets Raised</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">{tickets.length}</p>
          <p className="text-xs text-muted-foreground mt-1">All time history</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center mb-3">
            <RefreshCw className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground">In Progress & Open</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">
            {tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length}
          </p>
          <p className="text-xs text-amber-600 font-medium mt-1">Active priority queue</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center mb-3">
            <Clock className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-xs text-muted-foreground">Waiting for You</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">
            {tickets.filter((t) => t.status === "Waiting for Customer").length}
          </p>
          <p className="text-xs text-purple-600 font-medium mt-1">Response requested</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground">Resolved Tickets</p>
          <p className="text-2xl font-bold mt-0.5 text-foreground">
            {tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">100% SLA compliance</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl bg-card p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {["All", "Open", "In Progress", "Waiting for Customer", "Resolved", "Closed"].map(
            (st) => {
              const isSelected = selectedStatus === st;
              const count =
                st === "All"
                  ? tickets.length
                  : tickets.filter((t) => t.status === st).length;

              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{st}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px]",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tickets by ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* My Support Tickets Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3.5 text-left">Ticket ID</th>
                <th className="p-3.5 text-left min-w-56">Subject</th>
                <th className="p-3.5 text-left">Category</th>
                <th className="p-3.5 text-left">Priority</th>
                <th className="p-3.5 text-left">Status</th>
                <th className="p-3.5 text-left">Created Date</th>
                <th className="p-3.5 text-left">Last Updated</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs">Loading support tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Headset className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">No support tickets found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? "No tickets match your search filters."
                          : "You have not raised any support inquiries yet. Click 'Raise New Ticket' to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const pStyle = priorityStyles[ticket.priority];
                  const sStyle = statusStyles[ticket.status];
                  const StatusIcon = sStyle.icon;
                  const displayTicketId = ticket.ticketNumber || ticket.ticketId || ticket.id;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setActiveTicket(ticket)}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-mono text-xs font-bold text-primary whitespace-nowrap">
                        #{displayTicketId}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground text-xs line-clamp-1 hover:text-primary">
                          {ticket.subject}
                        </p>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {ticket.category}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                            pStyle.badge
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", pStyle.dot)} />
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[11px] font-medium", sStyle.badge)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {ticket.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(ticket.updatedAt)}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTicket(ticket);
                          }}
                          className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 cursor-pointer"
                        >
                          View & Reply
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Conversation Modal / Drawer */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl animate-in max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-primary">
                    #{activeTicket.ticketNumber || activeTicket.ticketId || activeTicket.id}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold",
                      statusStyles[activeTicket.status].badge
                    )}
                  >
                    {activeTicket.status}
                  </Badge>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                      priorityStyles[activeTicket.priority].badge
                    )}
                  >
                    {activeTicket.priority} Priority
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {activeTicket.subject}
                </h2>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ticket Info & Status Tracker Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b bg-muted/20 text-xs shrink-0 px-2 rounded-md my-2">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">
                  Category
                </p>
                <p className="font-medium text-foreground">{activeTicket.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">
                  Assigned Specialist
                </p>
                <p className="font-medium text-foreground">
                  {activeTicket.assignedAgent?.name || "Support Team"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">
                  Created Date
                </p>
                <p className="font-medium text-foreground">{formatDate(activeTicket.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">
                  Status Tracking
                </p>
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                  className="mt-0.5 rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold text-primary cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Customer">Waiting for Customer</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Attachments Section if present */}
            {activeTicket.attachments && activeTicket.attachments.length > 0 && (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground shrink-0 border-b">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Attached files:</span>
                {activeTicket.attachments.map((file, idx) => (
                  <span
                    key={idx}
                    className="bg-muted px-2 py-0.5 rounded font-mono text-[11px] text-foreground flex items-center gap-1"
                  >
                    {file}
                  </span>
                ))}
              </div>
            )}

            {/* Conversation Replies Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Conversation Thread ({activeTicket.replies?.length || 0})
              </p>

              {activeTicket.replies?.map((reply) => {
                const isCustomer =
                  reply.sender === "customer" ||
                  (reply.senderRole && !reply.senderRole.toLowerCase().includes("support") && !reply.senderRole.toLowerCase().includes("agent"));

                const senderName =
                  reply.senderName ||
                  (isCustomer ? user?.name || user?.email || "You" : "Support Specialist");

                const senderRole =
                  reply.senderRole ||
                  (isCustomer ? (user?.role || "Workspace Admin") : "Tier 2 Specialist");

                return (
                  <div
                    key={reply.id}
                    className={cn(
                      "p-3.5 rounded-xl border space-y-1.5",
                      isCustomer ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            isCustomer
                              ? "bg-primary text-primary-foreground"
                              : "bg-emerald-600 text-white"
                          )}
                        >
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">
                          {senderName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({senderRole})
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(reply.timestamp || reply.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pl-7.5">
                      {reply.message}
                    </p>

                    {reply.attachments && reply.attachments.length > 0 && (
                      <div className="flex items-center gap-1.5 pl-7.5 pt-1 text-[11px] text-primary">
                        <Paperclip className="h-3 w-3" />
                        <span>{reply.attachments.join(", ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="pt-3 border-t shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type your response to the support team..."
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  disabled={isReplying}
                  className="text-xs h-9"
                />
                <Button
                  type="submit"
                  disabled={!replyInput.trim() || isReplying}
                  className="bg-primary text-primary-foreground text-xs gap-1.5 shrink-0 cursor-pointer"
                >
                  {isReplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isReplying ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise New Ticket Modal */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Headset className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Raise Support Ticket</h2>
              </div>
              <button
                onClick={() => setIsRaiseModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseTicket} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Subject / Summary *
                </label>
                <Input
                  required
                  placeholder="e.g. Need assistance with WhatsApp Webhook 504 error"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Category *
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Channel Verification">Channel Verification</option>
                    <option value="Billing & Invoices">Billing & Invoices</option>
                    <option value="Bot Automation">Bot Automation</option>
                    <option value="Account & 2FA">Account & 2FA</option>
                    <option value="Other">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Priority Level *
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    disabled={isSubmitting}
                  >
                    <option value="Low">Low (General guidance)</option>
                    <option value="Medium">Medium (Standard request)</option>
                    <option value="High">High (Production issue)</option>
                    <option value="Urgent">Urgent (Service outage)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain what happened, steps to reproduce, or details of your request..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Attachment Name / Log Reference (Optional)
                </label>
                <div className="relative">
                  <Paperclip className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. error_screenshot.png or payload_dump.json"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-8.5 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Tier-Based SLA Protection & Email Alerts
                </p>
                <p>
                  Your ticket will automatically generate a confirmation email to your account and alert our on-call support team.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRaiseModalOpen(false)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
