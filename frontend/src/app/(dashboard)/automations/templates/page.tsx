"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Plus,
  Zap,
  Sparkles,
  Crown,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Webhook,
  ShoppingBag,
  Bot,
  UserCheck,
  Star,
  FileText,
  ShieldCheck,
  Download,
  Filter,
  Check,
  X,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";

// Icons mapping for channels and apps
import {
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  RCSIcon,
} from "@/components/landing/channel-icons";

export interface TemplateItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: "E-Commerce" | "Customer Support" | "Lead Generation" | "Marketing & Broadcasts" | "Utility / OTP";
  channels: string[];
  apps: string[];
  badge: "Official" | "Community" | "Premium";
  isPremium: boolean;
  installCount: number;
  stepsCount: number;
  setupMinutes: number;
  requiredConnections: string[];
  pipelineSteps: {
    number: number;
    type: "trigger" | "condition" | "action" | "crm";
    title: string;
    description: string;
  }[];
}

// ---------- Storage Persistence & Helpers ----------
const WORKFLOW_TEMPLATES_STORAGE_KEY = "appnix_workflow_templates";

const LEGACY_DUMMY_IDS = new Set([
  "tmpl_1",
  "tmpl_2",
  "tmpl_3",
  "tmpl_4",
  "tmpl_5",
  "tmpl_6",
  "tmpl_7",
  "tmpl_8",
  "tmpl_9",
]);

const LEGACY_DUMMY_SLUGS = new Set([
  "shopify_abandoned_cart_recovery",
  "ai_lead_qualification_crm_handover",
  "order_confirmation_tracking",
  "support_auto_responder_faq",
  "review_nps_collector",
  "instant_otp_verification",
  "birthday_anniversary_wishes",
  "event_reminder_sequence",
  "instagram_story_reply_dm",
]);

function getStoredWorkflowTemplates(): TemplateItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKFLOW_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (t) => t && !LEGACY_DUMMY_IDS.has(t.id) && !LEGACY_DUMMY_SLUGS.has(t.slug)
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(WORKFLOW_TEMPLATES_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch (err) {
    console.error("Failed to load workflow templates from storage:", err);
    return [];
  }
}

const TEMPLATES_DATA: TemplateItem[] = [];

const CATEGORIES = [
  "All",
  "E-Commerce",
  "Customer Support",
  "Lead Generation",
  "Marketing & Broadcasts",
  "Utility / OTP",
];

const CHANNELS = ["All Channels", "WhatsApp", "Instagram", "Facebook", "RCS"];

export default function WorkflowTemplatesPage() {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<TemplateItem[]>(() => getStoredWorkflowTemplates());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedChannel, setSelectedChannel] = useState("All Channels");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState<string>("All");

  // Modal States
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Custom Template State
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<TemplateItem["category"]>("E-Commerce");
  const [customDesc, setCustomDesc] = useState("");

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => {
      // Category filter
      if (selectedCategory !== "All" && tmpl.category !== selectedCategory) {
        return false;
      }
      // Channel filter
      if (
        selectedChannel !== "All Channels" &&
        !tmpl.channels.includes(selectedChannel)
      ) {
        return false;
      }
      // Badge filter
      if (selectedBadgeFilter !== "All" && tmpl.badge !== selectedBadgeFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tmpl.title.toLowerCase().includes(q);
        const matchDesc = tmpl.description.toLowerCase().includes(q);
        const matchApps = tmpl.apps.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchApps) return false;
      }
      return true;
    });
  }, [templates, selectedCategory, selectedChannel, selectedBadgeFilter, searchQuery]);

  // Clone Template Action
  const handleUseTemplate = async (template: TemplateItem) => {
    setIsCloning(true);
    try {
      let newId = `wf_${Date.now()}`;
      try {
        const res = await api.post(`/api/automations/workflows/templates/${template.id}/clone`, {
          customTitle: template.title,
        });
        if (res.data?.data?.id) {
          newId = res.data.data.id;
        }
      } catch (err) {
        // Continue locally
      }

      setPreviewTemplate(null);
      router.push(`/automations/workflow/${newId}/builder`);
    } finally {
      setIsCloning(false);
    }
  };

  // Create Custom Template Action
  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newTmpl: TemplateItem = {
      id: `tmpl_${Date.now()}`,
      title: customTitle.trim(),
      slug: customTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      description: customDesc.trim() || "Custom organization automation template.",
      category: customCategory,
      channels: ["WhatsApp", "RCS"],
      apps: ["Webhook", "WhatsApp"],
      badge: "Community",
      isPremium: false,
      installCount: 0,
      stepsCount: 3,
      setupMinutes: 2,
      requiredConnections: ["WhatsApp Cloud API"],
      pipelineSteps: [
        { number: 1, type: "trigger", title: "Custom Webhook Trigger", description: "Listens for incoming custom payload" },
        { number: 2, type: "condition", title: "Condition: Validate Input Data", description: "Filters matching rules" },
        { number: 3, type: "action", title: "Action: Automated Message Dispatch", description: "Delivers message to recipient" },
      ],
    };

    const updated = [newTmpl, ...templates];
    setTemplates(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(WORKFLOW_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    }
    setCustomTitle("");
    setCustomDesc("");
    setIsCustomModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
          <Link
            href="/automations/workflow"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Automations</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-primary font-semibold">Templates</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Workflow Templates
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                Library ({templates.length})
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Browse and install ready-to-use automation workflows across WhatsApp, RCS, and social channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/automations/workflow">
              <Button variant="outline" size="sm" className="text-xs h-9 font-medium gap-1.5 shadow-xs">
                <Layers className="h-3.5 w-3.5" />
                <span>My Workflows</span>
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => setIsCustomModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Create Custom Template</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Filters & Categories Section */}
      <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs">
        {/* Search & Channel Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, app..."
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

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Channel Filter Selector */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="h-9 px-3 rounded-lg border bg-background text-xs font-medium text-foreground cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-500"
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            {/* Badge Type Selector */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg text-xs font-medium">
              {["All", "Official", "Premium"].map((badgeType) => (
                <button
                  key={badgeType}
                  type="button"
                  onClick={() => setSelectedBadgeFilter(badgeType)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                    selectedBadgeFilter === badgeType
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {badgeType}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs whitespace-nowrap scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? templates.length
                : templates.filter((t) => t.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5",
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{cat}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Template Cards Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.length === 0 ? (
          <div className="col-span-full rounded-2xl border bg-card p-12 text-center text-muted-foreground space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 border flex items-center justify-center text-muted-foreground/60 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground text-base">No Workflow Templates Found</h3>
            <p className="text-xs max-w-md mx-auto text-muted-foreground leading-relaxed">
              No automation templates have been created yet. You can create your own custom workflow template blueprint or build a workflow from scratch.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link href="/automations/workflow">
                <Button variant="outline" size="sm" className="text-xs h-8.5 font-medium">
                  Go to My Workflows
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => setIsCustomModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8.5 font-semibold gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Custom Template</span>
              </Button>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground space-y-2">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No Templates Found</p>
            <p className="text-xs text-muted-foreground">
              No templates match your selected filters. Try adjusting your search query or channel filter.
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-emerald-500/40 relative overflow-hidden"
            >
              {/* Top Row: Category & Badges */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] font-semibold bg-muted/20 text-muted-foreground">
                    {template.category}
                  </Badge>

                  <div className="flex items-center gap-1">
                    {template.isPremium ? (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold gap-1">
                        <Crown className="h-3 w-3" />
                        <span>Premium</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium">
                        {template.badge}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                  {template.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                  {template.description}
                </p>

                {/* Channel / App Icons Stack */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Apps:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {template.apps.map((app) => (
                      <span
                        key={app}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted/40 text-foreground border border-border"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social Proof & Steps */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{template.stepsCount} Steps</span>
                  </span>
                  <span>{template.installCount > 0 ? `Used by ${template.installCount.toLocaleString("en-IN")} teams` : "Ready to use"}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplate(template)}
                  className="text-xs h-8.5 font-medium"
                >
                  Preview Flow
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8.5 font-semibold gap-1 shadow-xs"
                >
                  <span>Use Template</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TEMPLATE PREVIEW MODAL                           */}
      {/* ========================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border bg-card text-card-foreground shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 pb-4 border-b flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {previewTemplate.title}
                  </h2>
                  {previewTemplate.isPremium && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold gap-1">
                      <Crown className="h-3 w-3" />
                      <span>Premium</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {previewTemplate.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewTemplate(null)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-6 space-y-5">
              {/* Visual Pipeline Steps */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Flow Architecture & Step Sequence ({previewTemplate.stepsCount} Nodes):
                </span>
                <div className="space-y-2.5">
                  {previewTemplate.pipelineSteps.map((step, idx) => (
                    <div
                      key={step.number}
                      className="p-3 rounded-xl border bg-muted/20 flex items-start gap-3 relative"
                    >
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {step.number}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">{step.title}</h4>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono py-0">
                            {step.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Connections Checklist */}
              <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
                <span className="text-xs font-bold text-foreground block">
                  Required Channel & API Integrations:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewTemplate.requiredConnections.map((conn) => (
                    <div key={conn} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{conn}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-muted/20 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Avg. setup time: <strong>~{previewTemplate.setupMinutes} minutes</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isCloning}
                  onClick={() => handleUseTemplate(previewTemplate)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
                >
                  {isCloning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Cloning Workflow...</span>
                    </>
                  ) : (
                    <>
                      <span>Clone & Customize Workflow</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CREATE CUSTOM TEMPLATE MODAL                      */}
      {/* ========================================================= */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Create Custom Template</h3>
                  <p className="text-xs text-muted-foreground">Save an automation pattern as a reusable blueprint</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCustomModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="custom-title" className="text-xs font-bold text-foreground">
                  Template Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custom-title"
                  placeholder="e.g. VIP Concierge & Payment Dispatch"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 text-xs bg-background"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Category</Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full h-9 rounded-lg border bg-background px-3 text-xs text-foreground cursor-pointer"
                >
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Lead Generation">Lead Generation</option>
                  <option value="Marketing & Broadcasts">Marketing & Broadcasts</option>
                  <option value="Utility / OTP">Utility / OTP</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-desc" className="text-xs font-bold text-foreground">
                  Description
                </Label>
                <Input
                  id="custom-desc"
                  placeholder="Brief summary of the flow and triggers"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!customTitle.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-sm"
                >
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}