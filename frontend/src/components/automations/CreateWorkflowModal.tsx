"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  ArrowRight,
  MessageSquare,
  Webhook,
  Clock,
  FileText,
  Folder,
  FolderPlus,
  Tag,
  Sparkles,
  Layers,
  CheckCircle2,
  Loader2,
  Zap,
  ShoppingBag,
  UserCheck,
  Bot,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";

export type TriggerType =
  | "INBOUND_MESSAGE"
  | "WEBHOOK_EVENT"
  | "SCHEDULED_CRON"
  | "FORM_SUBMISSION";

export interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newWorkflow: any) => void;
  folders?: Array<{ id: string; name: string }>;
  onFolderCreated?: (folderName: string) => void;
}

const TRIGGER_OPTIONS = [
  {
    id: "INBOUND_MESSAGE" as TriggerType,
    title: "Inbound Message / Keyword",
    description: "WhatsApp, Instagram, Messenger, RCS triggers on incoming customer texts.",
    icon: MessageSquare,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "WEBHOOK_EVENT" as TriggerType,
    title: "Webhook / API Event",
    description: "External CRM, Shopify, or payment webhook triggers from outside APIs.",
    icon: Webhook,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "SCHEDULED_CRON" as TriggerType,
    title: "Scheduled / Recurring",
    description: "Time-based cron trigger for scheduled campaigns, broadcasts, and check-ins.",
    icon: Clock,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconBg: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "FORM_SUBMISSION" as TriggerType,
    title: "Form Submission",
    description: "Triggers automatically when a customer submits a lead capture form or survey.",
    icon: FileText,
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
];

const PREBUILT_TEMPLATES = [
  {
    id: "abandoned_cart",
    title: "Abandoned Cart Auto-Recovery",
    description: "Shopify Webhook -> Cart Value Filter -> WhatsApp Discount Promo -> CRM Tag.",
    icon: ShoppingBag,
    color: "text-emerald-600 bg-emerald-500/10",
    trigger: "WEBHOOK_EVENT" as TriggerType,
    defaultTags: ["E-Commerce", "Marketing", "Shopify"],
  },
  {
    id: "welcome_kyc",
    title: "Welcome & KYC Onboarding Sequence",
    description: "Keyword 'START' -> Interactive Reply Menu -> KYC Document Collector.",
    icon: UserCheck,
    color: "text-blue-600 bg-blue-500/10",
    trigger: "INBOUND_MESSAGE" as TriggerType,
    defaultTags: ["Onboarding", "Support", "KYC"],
  },
  {
    id: "lead_qualifier",
    title: "AI Lead Qualification & Agent Handover",
    description: "Incoming Query -> AI Intent Analysis -> Assign to Sales Rep Desk.",
    icon: Bot,
    color: "text-purple-600 bg-purple-500/10",
    trigger: "INBOUND_MESSAGE" as TriggerType,
    defaultTags: ["AI Bot", "Sales Pipeline", "VIP"],
  },
  {
    id: "review_request",
    title: "Post-Purchase Review & NPS Collector",
    description: "Order Delivered -> Delay 2 Days -> WhatsApp Rating Card with Offer.",
    icon: Star,
    color: "text-amber-600 bg-amber-500/10",
    trigger: "SCHEDULED_CRON" as TriggerType,
    defaultTags: ["Retention", "Feedback"],
  },
];

export function CreateWorkflowModal({
  isOpen,
  onClose,
  onSuccess,
  folders = [{ id: "all", name: "All" }],
  onFolderCreated,
}: CreateWorkflowModalProps) {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [triggerType, setTriggerType] = useState<TriggerType>("INBOUND_MESSAGE");
  const [startMode, setStartMode] = useState<"scratch" | "template">("scratch");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("abandoned_cart");

  // Inline New Folder State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderList, setFolderList] = useState(folders);

  // Sync folderList when folders prop changes
  useState(() => {
    setFolderList(folders);
  });

  // Tags State
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["Marketing", "Automation"]);

  // Validation & Loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Tag Handlers
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Inline Folder Create Handler (Persisted in DB)
  const handleCreateFolderInline = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      const res = await api.post("/automations/workflows/folders", { name: trimmed });
      const newFolderObj = res.data?.data || { id: `folder_${Date.now()}`, name: trimmed };
      setFolderList((prev) => [...prev, newFolderObj]);
      setSelectedFolder(newFolderObj.id);
      if (onFolderCreated) {
        onFolderCreated(trimmed);
      }
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to create folder");
    }
  };

  // Select Template Handler
  const handleSelectTemplate = (template: typeof PREBUILT_TEMPLATES[0]) => {
    setSelectedTemplateId(template.id);
    setTriggerType(template.trigger);
    if (!title || PREBUILT_TEMPLATES.some((t) => t.title === title)) {
      setTitle(template.title);
    }
    setTags(template.defaultTags);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Workflow Title is required");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const folderObj = folderList.find((f) => f.id === selectedFolder);
      const payload = {
        title: title.trim(),
        folderId: selectedFolder === "all" ? undefined : selectedFolder,
        folderName: folderObj?.name || "All",
        triggerType,
        tags,
        templateId: startMode === "template" ? selectedTemplateId : undefined,
      };

      // Call real backend API
      const response = await api.post("/automations/workflows", payload);
      const created = response.data?.data;
      if (!created || !created.id) {
        throw new Error(response.data?.message || "Failed to create workflow");
      }

      if (onSuccess) {
        onSuccess(created);
      }

      onClose();
      // Redirect to visual workflow canvas builder
      router.push(`/automations/workflow/${created.id}/builder`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to create workflow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create New Automation Workflow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set up triggers, conditions, and automated messaging actions.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* 1. Workflow Title Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="workflow-title" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Workflow Title <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400 font-mono">{title.length} / 80</span>
            </div>
            <Input
              id="workflow-title"
              maxLength={80}
              placeholder="e.g. Abandoned Cart Auto-Recovery"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 text-xs sm:text-sm bg-background border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* 2. Folder Selection & Inline Creator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Folder Assignment
              </Label>
              {!isCreatingFolder ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                >
                  <FolderPlus className="h-3 w-3" />
                  <span>+ New Folder</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  Cancel
                </button>
              )}
            </div>

            {!isCreatingFolder ? (
              <div className="relative">
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-background text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-500"
                >
                  {folderList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} Folder
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter new folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-9 text-xs bg-background"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateFolderInline}
                  className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  Add Folder
                </Button>
              </div>
            )}
          </div>

          {/* 3. Start Mode Selector (Scratch vs Template) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Creation Mode
            </Label>
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStartMode("scratch")}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold transition-all",
                  startMode === "scratch"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Start from Scratch
              </button>
              <button
                type="button"
                onClick={() => setStartMode("template")}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  startMode === "template"
                    ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>Use Pre-built Template</span>
              </button>
            </div>
          </div>

          {/* Mode A: Start from Scratch -> Trigger Type Selector Cards */}
          {startMode === "scratch" ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Entry Trigger Type
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TRIGGER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = triggerType === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setTriggerType(opt.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 relative",
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", opt.iconBg)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{opt.title}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Mode B: Pre-built Template Cards */
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Choose a Pre-configured Template
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PREBUILT_TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedTemplateId === tmpl.id;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 relative",
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", tmpl.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{tmpl.title}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Tags Multi-Pill Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Workflow Tags (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Type tag (e.g. VIP, E-Commerce) & press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                className="h-9 text-xs shrink-0"
              >
                Add Tag
              </Button>
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-slate-600 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 -mx-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Canvas...</span>
                </>
              ) : (
                <>
                  <span>Create & Open Canvas</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
