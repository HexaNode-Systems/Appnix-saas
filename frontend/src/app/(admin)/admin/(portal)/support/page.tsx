"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AdminTicket, AdminTicketStatus, TicketPriority } from "@/super-admin/types";
import { supportService } from "@/super-admin/services";
import {
  LifeBuoy,
  ArrowLeft,
  ChevronRight,
  Search,
  Filter,
  Paperclip,
  Send,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  Building2,
  Lock,
  Plus,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("TKT-8902");
  const [activeTabFilter, setActiveTabFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const fetchTickets = () => {
    supportService.getAllTickets().then((tList) => {
      setTickets(tList);
      if (tList.length > 0 && !selectedTicketId) {
        setSelectedTicketId(tList[0].id);
      }
    });
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    supportService.addReply(activeTicket.id, replyText.trim(), isInternalNote).then(() => {
      setReplyText("");
      fetchTickets();
    });
  };

  const handleStatusChange = (newStatus: AdminTicketStatus) => {
    if (!activeTicket) return;
    supportService.updateTicketStatus(activeTicket.id, newStatus).then(() => {
      fetchTickets();
    });
  };

  const handlePriorityChange = (newPriority: TicketPriority) => {
    if (!activeTicket) return;
    supportService.updateTicketPriority(activeTicket.id, newPriority).then(() => {
      fetchTickets();
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !activeTicket) return;
    if (!activeTicket.tags.includes(newTagInput.trim())) {
      activeTicket.tags.push(newTagInput.trim());
      setNewTagInput("");
      setIsAddingTag(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTabFilter === "Urgent") return t.priority === "Urgent";
    if (activeTabFilter === "Open") return t.status === "Open" || t.status === "In Progress";
    if (activeTabFilter === "Resolved") return t.status === "Resolved" || t.status === "Closed";

    return true;
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5 shrink-0">
        <Link
          href="/super-admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Support Triage</span>
      </div>

      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 border-b pb-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-emerald-600" />
            Support Tickets Triage
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage, triage, and resolve mission-critical tenant escalations.
          </p>
        </div>
      </div>

      {/* 3-Column Support Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        {/* ================= COLUMN 1: TICKET LIST (4 cols) ================= */}
        <div className="lg:col-span-4 rounded-2xl border bg-card flex flex-col overflow-hidden shadow-xs">
          {/* List Header & Search */}
          <div className="p-3 border-b space-y-2.5 bg-muted/20">
            <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
              {["All", "Urgent", "Open", "Resolved"].map((tab) => {
                const isSelected = activeTabFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTabFilter(tab)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer",
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ticket # or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Ticket List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredTickets.map((t) => {
              const isSelected = activeTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={cn(
                    "p-3.5 transition-all cursor-pointer space-y-1.5",
                    isSelected
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-emerald-600 pl-3"
                      : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      #{t.id}
                    </span>
                    <Badge
                      className={cn(
                        "text-[9px] font-extrabold px-1.5 py-0 uppercase",
                        t.priority === "Urgent" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                        t.priority === "High" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        t.priority === "Medium" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                        t.priority === "Low" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {t.priority}
                    </Badge>
                  </div>

                  <p className="font-bold text-xs text-foreground line-clamp-1">
                    {t.subject}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {t.clientName}
                    </span>
                    <span>{t.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= COLUMN 2: CONVERSATION PANEL (5 cols) ================= */}
        <div className="lg:col-span-5 rounded-2xl border bg-card flex flex-col overflow-hidden shadow-xs">
          {activeTicket ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b space-y-1 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    Ticket #{activeTicket.id}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-background"
                  >
                    {activeTicket.status}
                  </Badge>
                </div>
                <h2 className="text-sm font-extrabold text-foreground leading-snug">
                  {activeTicket.subject}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Opened by <span className="font-semibold text-foreground">{activeTicket.openedBy}</span> ({activeTicket.clientName})
                </p>
              </div>

              {/* Message Thread Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {activeTicket.messages.map((msg) => {
                  const isCustomer = msg.sender === "customer";
                  const isNote = msg.isInternalNote;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-xl p-3.5 text-xs space-y-1.5 border",
                        isNote
                          ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900"
                          : isCustomer
                          ? "bg-muted/30 border-border"
                          : "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white",
                              isNote ? "bg-amber-600" : isCustomer ? "bg-primary" : "bg-emerald-600"
                            )}
                          >
                            {msg.senderName.charAt(0)}
                          </div>
                          <span className="font-bold text-foreground">{msg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            ({msg.senderRole})
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                      </div>

                      <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap pl-8">
                        {msg.message}
                      </p>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-8 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          <Paperclip className="h-3 w-3" />
                          <span>{msg.attachments.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <form onSubmit={handleSendReply} className="p-3 border-t bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer",
                        !isInternalNote ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Public Reply to Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer",
                        isInternalNote ? "bg-amber-600 text-white" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      🔒 Internal Staff Note
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder={
                      isInternalNote
                        ? "Add private note for support engineering team..."
                        : "Type reply to client..."
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                  <Button
                    type="submit"
                    disabled={!replyText.trim()}
                    className={cn(
                      "text-xs font-semibold gap-1.5 shrink-0 text-white",
                      isInternalNote ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isInternalNote ? "Post Note" : "Send Reply"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted-foreground">
              Select a ticket from the left list to view conversation.
            </div>
          )}
        </div>

        {/* ================= COLUMN 3: PROPERTIES & CLIENT INFO (3 cols) ================= */}
        <div className="lg:col-span-3 rounded-2xl border bg-card flex flex-col overflow-y-auto p-4 space-y-4 shadow-xs">
          {activeTicket ? (
            <>
              {/* Properties Section */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Ticket Properties
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value as AdminTicketStatus)}
                      className="w-full mt-1 h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting for Customer">Waiting for Customer</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Priority</label>
                    <select
                      value={activeTicket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className="w-full mt-1 h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Assignee</label>
                    <div className="mt-1 flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                      <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {activeTicket.assigneeName?.charAt(0) || "D"}
                      </div>
                      <span className="font-bold text-foreground text-xs">
                        {activeTicket.assigneeName || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Tags</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(!isAddingTag)}
                        className="text-emerald-600 hover:underline text-[10px] font-bold"
                      >
                        + Add Tag
                      </button>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {activeTicket.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-mono px-2 py-0">
                          #{tag}
                        </Badge>
                      ))}
                    </div>

                    {isAddingTag && (
                      <form onSubmit={handleAddTag} className="flex items-center gap-1.5 mt-2">
                        <Input
                          placeholder="tag name"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          className="h-7 text-[11px]"
                        />
                        <Button type="submit" size="sm" className="h-7 text-[10px] px-2 bg-emerald-600 text-white">
                          Add
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Information Card */}
              <div className="border-t pt-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Client Information
                </h3>

                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">{activeTicket.clientName}</p>
                      <p className="text-[11px] text-muted-foreground">{activeTicket.clientTier}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                      Enterprise
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Account MRR</span>
                      <p className="font-bold text-foreground">${activeTicket.clientMrr.toLocaleString()}/mo</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success Score</span>
                      <p className="font-bold text-emerald-600">{activeTicket.clientSuccessScore}/100</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Tickets</span>
                      <p className="font-bold text-foreground">
                        {activeTicket.clientTotalTickets} ({activeTicket.clientOpenTickets} open)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tenant Health</span>
                      <p className="font-bold text-emerald-600">Optimal</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
