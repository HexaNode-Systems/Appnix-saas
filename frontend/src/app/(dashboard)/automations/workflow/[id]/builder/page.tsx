"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Zap,
  Plus,
  Layers,
  Settings,
  Sparkles,
  MessageSquare,
  Webhook,
  Clock,
  CheckCircle2,
  Tag as TagIcon,
  Sliders,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagNodeConfig } from "@/types/workflow-tag-node";
import { TagActionNodeDrawer } from "@/components/automations/workflow/TagActionNodeDrawer";
import { TagBadge } from "@/components/crm/tags/TagBadge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";

export default function WorkflowCanvasBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params?.id as string;

  const [workflow, setWorkflow] = useState<any | null>(null);
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // CRM Tag Action Node Configuration State
  const [tagNodeConfig, setTagNodeConfig] = useState<TagNodeConfig>({
    id: "node_crm_tag_1",
    name: "CRM Tag Action: Assign & Create",
    actionType: "ASSIGN_AND_CREATE",
    targetContactMapping: "{{webhook.data.contact_id}}",
    identificationMode: "NAME",
    tagValues: ["VIP Customer", "Priority Support"],
    rawTagString: "VIP Customer, Priority Support",
    defaultFallbackColor: "blue",
    defaultFallbackIcon: "tag",
  });

  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);

  // Fetch real workflow data from database
  const fetchWorkflow = useCallback(async () => {
    if (!workflowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/automations/workflows/${workflowId}`);
      if (res.data?.success && res.data.data) {
        const wf = res.data.data;
        setWorkflow(wf);
        setWorkflowTitle(wf.title);
        setIsActive(wf.status);
        if (wf.tags && wf.tags.length > 0) {
          setTagNodeConfig((prev) => ({
            ...prev,
            tagValues: wf.tags,
            rawTagString: wf.tags.join(", "),
          }));
        }
      } else {
        setError("Workflow not found");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load workflow");
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  // Save Canvas to backend API
  const handleSaveCanvas = async () => {
    if (!workflowId) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        title: workflowTitle.trim() || workflow?.title,
        status: isActive,
        tags: tagNodeConfig.tagValues,
      };
      const res = await api.put(`/automations/workflows/${workflowId}`, payload);
      if (res.data?.success) {
        setWorkflow(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      console.error("Failed to save canvas:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle & Publish status
  const handlePublish = async () => {
    if (!workflowId) return;
    setIsSaving(true);
    try {
      const res = await api.post(`/automations/workflows/${workflowId}/toggle`);
      if (res.data?.success && res.data.data) {
        setIsActive(res.data.data.status);
        setWorkflow(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to publish workflow:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading workflow canvas from database...</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <div>
          <h2 className="text-base font-bold text-foreground">Workflow Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {error || "The requested workflow does not exist or has been removed from this workspace."}
          </p>
        </div>
        <Link href="/automations/workflow">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Workflows
          </Button>
        </Link>
      </div>
    );
  }

  const nodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as any[];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] space-y-3 animate-in fade-in duration-200">
      {/* Top Builder Navigation Bar */}
      <div className="flex items-center justify-between border-b pb-3 bg-card px-4 py-2.5 rounded-xl border shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/automations/workflow"
            className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <Input
                  value={workflowTitle}
                  onChange={(e) => setWorkflowTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="h-7 text-sm font-bold w-64 bg-background"
                />
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit workflow title"
                  className="text-base font-bold text-foreground cursor-pointer hover:underline"
                >
                  {workflowTitle || "Untitled Workflow"}
                </h1>
              )}
              <Badge
                className={cn(
                  "text-[10px]",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}
              >
                {isActive ? "Active" : "Paused"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">({workflowId.slice(0, 8)})</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Visual Canvas Builder • Folder: {workflow.folder?.name || "All"} • Trigger: {workflow.triggerType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Flow Node</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">
                CRM & Tag Operations
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsTagDrawerOpen(true)}>
                <TagIcon className="h-3.5 w-3.5 mr-2 text-primary" />
                <span>CRM Tag Action Node</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/crm/super-fields")}>
                <Sliders className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                <span>Super Field Schema Update</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">
                Messaging & Webhooks
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <MessageSquare className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                <span>WhatsApp Template Dispatch</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Webhook className="h-3.5 w-3.5 mr-2 text-amber-600" />
                <span>External HTTP Webhook</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveCanvas}
            disabled={isSaving}
            className="text-xs h-8 gap-1"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Canvas"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isSaving}
            className={cn(
              "text-white text-xs h-8 gap-1 shadow-sm",
              isActive
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isActive ? "Pause Flow" : "Publish & Activate"}</span>
          </Button>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="flex-1 rounded-2xl border bg-slate-50/60 dark:bg-slate-950/40 relative overflow-y-auto flex items-center justify-center p-8">
        {/* Canvas Background Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Interactive Flow Nodes Pipeline */}
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-lg w-full py-6">
          {/* Dynamic Nodes from Database */}
          {nodes.length > 0 ? (
            nodes.map((node, idx) => (
              <div key={node.id || idx} className="w-full space-y-4">
                <div className="w-full p-4 rounded-2xl border bg-card shadow-sm flex items-center gap-3 border-emerald-500/30 hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    {node.type === "trigger" ? (
                      <Zap className="h-5 w-5" />
                    ) : node.type === "condition" ? (
                      <Sliders className="h-5 w-5" />
                    ) : (
                      <MessageSquare className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                        {node.type || "Action Node"}
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Step {idx + 1}
                      </Badge>
                    </div>
                    <h3 className="text-xs font-bold text-foreground mt-0.5 truncate">
                      {node.data?.label || `Node ${idx + 1}`}
                    </h3>
                    {node.data?.details && (
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {node.data.details}
                      </p>
                    )}
                  </div>
                </div>

                {idx < nodes.length - 1 && (
                  <div className="h-6 w-0.5 bg-border mx-auto flex items-center justify-center relative">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  </div>
                )}
              </div>
            ))
          ) : (
            /* Fallback single trigger node if workflow has no custom nodes */
            <div className="w-full p-4 rounded-2xl border bg-card shadow-sm flex items-center gap-3 border-emerald-500/30 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    Trigger Event
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {workflow.triggerType}
                  </Badge>
                </div>
                <h3 className="text-xs font-bold text-foreground mt-0.5">
                  {workflow.title}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  Configured trigger: {workflow.triggerType}
                </p>
              </div>
            </div>
          )}

          {/* CRM Tag Action Node */}
          <div className="h-6 w-0.5 bg-border flex items-center justify-center relative">
            <div className="h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
          </div>

          <div
            onClick={() => setIsTagDrawerOpen(true)}
            className="w-full p-4 rounded-2xl border bg-card shadow-sm space-y-2.5 border-primary/40 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <TagIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                      CRM Tag Action Node
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
                      {tagNodeConfig.actionType === "ASSIGN_AND_CREATE"
                        ? "Assign & Auto-Create"
                        : tagNodeConfig.actionType === "ASSIGN_EXISTING"
                        ? "Assign Existing"
                        : "Remove Tags"}
                    </Badge>
                  </div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {tagNodeConfig.name}
                  </h3>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground group-hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Target Contact Mapping Display */}
            <div className="p-2 rounded-lg bg-muted/40 text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">Target Contact:</span>
              <code className="font-mono font-bold text-foreground">
                {tagNodeConfig.targetContactMapping}
              </code>
            </div>

            {/* Configured Tag Badges */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {tagNodeConfig.tagValues.map((t, idx) => (
                <TagBadge key={idx} name={t} size="xs" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CRM Tag Action Node Configuration Drawer */}
      <TagActionNodeDrawer
        isOpen={isTagDrawerOpen}
        onClose={() => setIsTagDrawerOpen(false)}
        initialConfig={tagNodeConfig}
        onSaveNode={(newConfig) => {
          setTagNodeConfig(newConfig);
          setIsTagDrawerOpen(false);
        }}
      />
    </div>
  );
}
