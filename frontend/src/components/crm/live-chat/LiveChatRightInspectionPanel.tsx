"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  Tag as TagIcon,
  Sliders,
  Flag,
  FileText,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api/axios";
import { SuperField } from "@/types/super-field";
import {
  CustomerSentimentRemark,
  LiveChatConversation,
} from "@/types/live-chat";
import { TagBadge } from "../tags/TagBadge";
import { cn } from "@/lib/utils";

interface LiveChatRightInspectionPanelProps {
  conversation: LiveChatConversation;
  onClose: () => void;
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateRemarks: (remarks: CustomerSentimentRemark) => void;
  onUpdateSuperField: (key: string, value: any) => void;
}

export function LiveChatRightInspectionPanel({
  conversation,
  onClose,
  onAddNote,
  onDeleteNote,
  onUpdateRemarks,
  onUpdateSuperField,
}: LiveChatRightInspectionPanelProps) {
  const [activeTab, setActiveTab] = useState<"crm" | "notes" | "remarks" | "scheduled">("crm");
  const [newNoteContent, setNewNoteContent] = useState("");

  // Dynamic Super Fields state
  const [superFields, setSuperFields] = useState<SuperField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadFields = async () => {
      setIsLoadingFields(true);
      try {
        const res = await api.get("/crm/super-fields");
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (isMounted) setSuperFields(list);
      } catch (err) {
        console.error("Failed to load super fields in live chat sidebar", err);
      } finally {
        if (isMounted) setIsLoadingFields(false);
      }
    };
    loadFields();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSidebarFields = useMemo(() => {
    return superFields.filter(
      (f) => f.status === "ACTIVE" && (f.placement?.chatInboxSidebar ?? true)
    );
  }, [superFields]);

  // Remarks state
  const [sentiment, setSentiment] = useState<CustomerSentimentRemark["sentiment"]>(
    conversation.remarks.sentiment || "positive"
  );
  const [leadStage, setLeadStage] = useState<CustomerSentimentRemark["leadStage"]>(
    conversation.remarks.leadStage || "Negotiation"
  );
  const [remarksNotes, setRemarksNotes] = useState(conversation.remarks.notes || "");
  const [isSavedRemarks, setIsSavedRemarks] = useState(false);

  const handleSaveRemarks = () => {
    onUpdateRemarks({
      sentiment,
      leadStage,
      notes: remarksNotes.trim(),
      lastUpdated: new Date().toISOString(),
    });
    setIsSavedRemarks(true);
    setTimeout(() => setIsSavedRemarks(false), 2000);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent.trim());
    setNewNoteContent("");
  };

  return (
    <div className="w-80 lg:w-88 flex flex-col border-l bg-card shrink-0 h-full overflow-hidden text-xs shadow-xs animate-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <User className="h-4 w-4 text-primary" />
          <span>Customer CRM Profile</span>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sub Tabs: CRM Super Fields | Notes | Remarks | Scheduled */}
      <div className="grid grid-cols-4 gap-0.5 p-1 bg-muted/30 border-b text-[11px]">
        {[
          { id: "crm", label: "Fields" },
          { id: "notes", label: `Notes (${conversation.internalNotes.length})` },
          { id: "remarks", label: "Remarks" },
          { id: "scheduled", label: `Schedule (${conversation.scheduledMessages.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "py-1 rounded font-semibold text-center transition-colors truncate px-1",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: CRM & SUPER FIELDS                                                 */}
        {/* ========================================================================= */}
        {activeTab === "crm" && (
          <div className="space-y-4">
            {/* Contact Avatar Header */}
            <div className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-xl bg-muted/20 border">
              {conversation.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conversation.avatarUrl}
                  alt={conversation.name}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20 shadow-xs"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {conversation.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-sm text-foreground">{conversation.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {conversation.identifier}
                </p>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap justify-center pt-1">
                {conversation.tags.map((t) => (
                  <TagBadge key={t.id} name={t.name} color={t.color} icon={t.icon} size="xs" />
                ))}
              </div>
            </div>

            {/* Super Fields (CRM Dynamic Attributes) */}
            <div className="rounded-xl border p-3.5 space-y-3 bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Sliders className="h-3 w-3 text-primary" />
                  CRM Dynamic Super Fields
                </span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  {isLoadingFields ? "Loading..." : `${activeSidebarFields.length} Active`}
                </Badge>
              </div>

              {isLoadingFields ? (
                <div className="py-4 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                  <span className="text-[10px]">Loading fields...</span>
                </div>
              ) : activeSidebarFields.length === 0 ? (
                <div className="p-3 text-center rounded-lg border border-dashed text-muted-foreground bg-muted/10 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">No Super Fields</p>
                  <p className="text-[10px] leading-relaxed">
                    Custom attributes will appear here once defined in the Super Fields directory.
                  </p>
                  <Link
                    href="/crm/super-fields"
                    className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline pt-0.5"
                  >
                    <span>Configure Fields</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {activeSidebarFields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`sf-input-${field.key}`}
                          className="text-[10px] font-medium text-muted-foreground block truncate"
                        >
                          {field.label}
                          {field.validation?.isRequired && (
                            <span className="text-rose-500 font-bold ml-0.5">*</span>
                          )}
                        </label>
                        {field.helperText && (
                          <span className="text-[9px] text-muted-foreground/70 truncate max-w-[120px]">
                            {field.helperText}
                          </span>
                        )}
                      </div>

                      {field.dataType === "DROPDOWN" ? (
                        <select
                          id={`sf-input-${field.key}`}
                          value={conversation.superFields?.[field.key] ?? ""}
                          onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                          className="w-full h-7 rounded-md border bg-background px-2 text-xs font-medium"
                        >
                          <option value="">{field.placeholder || "Select an option..."}</option>
                          {field.options?.map((opt) => (
                            <option key={opt.id || opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.dataType === "BOOLEAN" ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Checkbox
                            id={`sf-input-${field.key}`}
                            checked={Boolean(conversation.superFields?.[field.key])}
                            onCheckedChange={(checked) =>
                              onUpdateSuperField(field.key, Boolean(checked))
                            }
                          />
                          <label
                            htmlFor={`sf-input-${field.key}`}
                            className="text-xs text-muted-foreground cursor-pointer font-medium"
                          >
                            {field.placeholder || "Yes / Active"}
                          </label>
                        </div>
                      ) : field.dataType === "DATE" ? (
                        <Input
                          id={`sf-input-${field.key}`}
                          type="date"
                          value={conversation.superFields?.[field.key] ?? ""}
                          onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                          className="h-7 text-xs bg-background"
                        />
                      ) : field.dataType === "DATETIME" ? (
                        <Input
                          id={`sf-input-${field.key}`}
                          type="datetime-local"
                          value={conversation.superFields?.[field.key] ?? ""}
                          onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                          className="h-7 text-xs bg-background"
                        />
                      ) : field.dataType === "NUMERIC" ||
                        field.dataType === "DECIMAL" ||
                        field.dataType === "AMOUNT" ? (
                        <div className="relative">
                          {field.dataType === "AMOUNT" && (
                            <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground font-mono">
                              {field.currencySymbol || "₹"}
                            </span>
                          )}
                          <Input
                            id={`sf-input-${field.key}`}
                            type="number"
                            placeholder={field.placeholder || "0"}
                            value={conversation.superFields?.[field.key] ?? ""}
                            onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                            className={cn(
                              "h-7 text-xs bg-background",
                              field.dataType === "AMOUNT" && "pl-5"
                            )}
                          />
                        </div>
                      ) : field.dataType === "TEXTAREA" ? (
                        <textarea
                          id={`sf-input-${field.key}`}
                          rows={2}
                          placeholder={field.placeholder || "Enter notes..."}
                          value={conversation.superFields?.[field.key] ?? ""}
                          onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                          className="w-full rounded-md border bg-background p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      ) : (
                        <Input
                          id={`sf-input-${field.key}`}
                          placeholder={field.placeholder || `Enter ${field.label}...`}
                          value={conversation.superFields?.[field.key] ?? ""}
                          onChange={(e) => onUpdateSuperField(field.key, e.target.value)}
                          className="h-7 text-xs bg-background"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INTERNAL AGENT NOTES                                               */}
        {/* ========================================================================= */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
              <p className="text-[11px] font-bold text-foreground">
                Private Agent Comments
              </p>
              <p className="text-[10px] text-muted-foreground">
                Internal notes are private to your workspace and never visible to the customer.
              </p>

              <form onSubmit={handleAddNoteSubmit} className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  required
                  placeholder="Type internal note (e.g. customer requested callback tomorrow at 3pm)..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full rounded-lg border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newNoteContent.trim()}
                  className="w-full text-xs h-7 font-semibold gap-1 bg-primary"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Internal Note</span>
                </Button>
              </form>
            </div>

            {/* Notes Feed */}
            <div className="space-y-2">
              {conversation.internalNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-xs italic">
                  No internal notes yet. Add your first note above.
                </p>
              ) : (
                conversation.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl border bg-card shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-[11px]">
                        {note.authorName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="text-muted-foreground hover:text-rose-600"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {note.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: OUTCOME REMARKS & SENTIMENT                                       */}
        {/* ========================================================================= */}
        {activeTab === "remarks" && (
          <div className="space-y-4">
            <div className="rounded-xl border p-3.5 space-y-3 bg-card shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Conversation Outcome & Sentiment:
              </span>

              {/* Sentiment Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  Customer Sentiment:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "positive", label: "🟢 Positive" },
                    { id: "neutral", label: "⚪ Neutral" },
                    { id: "urgent", label: "🟠 Urgent" },
                    { id: "at_risk", label: "🔴 At Risk" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSentiment(s.id as any)}
                      className={cn(
                        "p-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all",
                        sentiment === s.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-2xs text-foreground"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Stage Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  Pipeline Stage:
                </label>
                <select
                  value={leadStage}
                  onChange={(e) => setLeadStage(e.target.value as any)}
                  className="w-full h-8 rounded-lg border bg-background px-2 text-xs font-semibold"
                >
                  <option value="Discovery">Discovery</option>
                  <option value="Demo">Demo Scheduled</option>
                  <option value="Proposal">Proposal Submitted</option>
                  <option value="Negotiation">Negotiation / Review</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              {/* Remarks Text */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  Outcome Remarks:
                </label>
                <textarea
                  rows={3}
                  value={remarksNotes}
                  onChange={(e) => setRemarksNotes(e.target.value)}
                  className="w-full rounded-lg border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Record customer objections, deal blockers, or next steps..."
                />
              </div>

              <Button
                size="sm"
                onClick={handleSaveRemarks}
                className="w-full h-8 text-xs font-semibold bg-primary gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isSavedRemarks ? "Saved!" : "Save Outcome Remarks"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SCHEDULED MESSAGES                                                 */}
        {/* ========================================================================= */}
        {activeTab === "scheduled" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Upcoming Automations:
              </span>
              <Badge variant="outline" className="text-[10px]">
                {conversation.scheduledMessages.length} Queued
              </Badge>
            </div>

            {conversation.scheduledMessages.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground rounded-xl border bg-muted/10 space-y-1">
                <Calendar className="h-6 w-6 mx-auto text-muted-foreground/40" />
                <p className="font-bold text-foreground text-xs">No Scheduled Messages</p>
                <p className="text-[10px]">
                  Automated drip follow-ups will appear here when scheduled.
                </p>
              </div>
            ) : (
              conversation.scheduledMessages.map((sch) => (
                <div
                  key={sch.id}
                  className="p-3 rounded-xl border bg-card shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">
                      {sch.templateName}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      {sch.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    <span>{new Date(sch.scheduledFor).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
