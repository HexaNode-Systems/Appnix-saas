"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";
import {
  Plus,
  ArrowLeft,
  Lock,
  FolderPlus,
  Folder,
  Eye,
  History,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Webhook,
  Zap,
  MessageSquare,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Play,
  Layers,
  AlertCircle,
} from "lucide-react";
import { CreateWorkflowModal } from "@/components/automations/CreateWorkflowModal";
import { UnlockWorkflowModal } from "@/components/automations/UnlockWorkflowModal";

// ---------- Types ----------
interface FolderItem {
  id: string;
  name: string;
  count: number | null;
}

interface WorkflowDbRecord {
  id: string;
  title: string;
  status: boolean;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  triggerType: string;
  tags: string[];
  nodes: any;
  edges: any;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WorkflowPage() {
  const router = useRouter();

  // State
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [workflows, setWorkflows] = useState<WorkflowDbRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Add Folder Inline
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // Delete Confirmation Dialog
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowDbRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // History Drawer/Modal
  const [historyWorkflow, setHistoryWorkflow] = useState<WorkflowDbRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Inline Tag Editing
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [editingTagsText, setEditingTagsText] = useState("");

  // Fetch Folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await api.get("/automations/workflows/folders");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setFolders(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch folders:", err);
    }
  }, []);

  // Fetch Workflows
  const fetchWorkflows = useCallback(
    async (folderId: string, pageNum: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = {
          page: pageNum,
          limit: 10,
        };
        if (folderId && folderId !== "all") {
          params.folderId = folderId;
        }

        const res = await api.get("/automations/workflows", { params });
        if (res.data?.success) {
          setWorkflows(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          } else {
            setPagination({
              page: pageNum,
              limit: 10,
              total: res.data.data?.length || 0,
              totalPages: 1,
            });
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load workflows");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchWorkflows(activeFolder, page);
  }, [activeFolder, page, fetchWorkflows]);

  // Toggle Workflow status
  const handleToggle = async (wf: WorkflowDbRecord) => {
    setIsActionLoading(wf.id);
    try {
      const res = await api.post(`/automations/workflows/${wf.id}/toggle`);
      if (res.data?.success && res.data.data) {
        setWorkflows((prev) =>
          prev.map((item) =>
            item.id === wf.id ? { ...item, status: res.data.data.status } : item
          )
        );
      }
    } catch (err: any) {
      console.error("Failed to toggle workflow status:", err);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Create Folder handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    setIsSubmittingFolder(true);
    try {
      const res = await api.post("/automations/workflows/folders", { name: trimmed });
      if (res.data?.success) {
        setNewFolderName("");
        setIsCreatingFolder(false);
        await fetchFolders();
      }
    } catch (err: any) {
      console.error("Failed to create folder:", err);
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Delete Workflow handler
  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/automations/workflows/${workflowToDelete.id}`);
      if (res.data?.success) {
        setWorkflowToDelete(null);
        await fetchFolders();
        await fetchWorkflows(activeFolder, page);
      }
    } catch (err: any) {
      console.error("Failed to delete workflow:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open History Drawer
  const handleOpenHistory = async (wf: WorkflowDbRecord) => {
    setHistoryWorkflow(wf);
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/automations/workflows/${wf.id}/history`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setHistoryLogs(res.data.data);
      } else {
        setHistoryLogs([]);
      }
    } catch (err: any) {
      console.error("Failed to load workflow history:", err);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Test Run Workflow
  const handleExecuteWorkflow = async (wf: WorkflowDbRecord) => {
    setIsActionLoading(`exec_${wf.id}`);
    try {
      const res = await api.post(`/automations/workflows/${wf.id}/execute`);
      if (res.data?.success) {
        // Refresh history if drawer is open for this workflow
        if (historyWorkflow?.id === wf.id) {
          handleOpenHistory(wf);
        }
      }
    } catch (err: any) {
      console.error("Failed to execute workflow:", err);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Inline Tag Editing Submit
  const handleSaveTags = async (wfId: string) => {
    const tagsArray = editingTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await api.patch(`/automations/workflows/${wfId}`, { tags: tagsArray });
      if (res.data?.success) {
        setWorkflows((prev) =>
          prev.map((item) => (item.id === wfId ? { ...item, tags: tagsArray } : item))
        );
      }
    } catch (err: any) {
      console.error("Failed to update tags:", err);
    } finally {
      setEditingTagsId(null);
    }
  };

  // Derive app icons dynamically based on workflow nodes and triggerType
  const getAppIcons = (wf: WorkflowDbRecord) => {
    const nodes = (Array.isArray(wf.nodes) ? wf.nodes : []) as any[];
    const nodeLabels = nodes.map((n) => (n.data?.label || "").toLowerCase()).join(" ");

    const icons: Array<{ icon: React.ElementType; bg: string; color: string; label: string }> = [];

    // Trigger icon
    if (wf.triggerType === "WEBHOOK_EVENT" || nodeLabels.includes("webhook")) {
      icons.push({ icon: Webhook, bg: "bg-blue-500", color: "text-white", label: "Webhook" });
    } else if (wf.triggerType === "SCHEDULED_CRON" || nodeLabels.includes("cron") || nodeLabels.includes("schedule")) {
      icons.push({ icon: Clock, bg: "bg-amber-500", color: "text-white", label: "Cron" });
    } else {
      icons.push({ icon: MessageSquare, bg: "bg-emerald-600", color: "text-white", label: "Inbound" });
    }

    // Action icons
    if (nodeLabels.includes("shopify") || wf.tags.some((t) => t.toLowerCase().includes("shopify"))) {
      icons.push({ icon: Zap, bg: "bg-green-600", color: "text-white", label: "Shopify" });
    } else if (nodeLabels.includes("crm") || wf.tags.some((t) => t.toLowerCase().includes("crm"))) {
      icons.push({ icon: Layers, bg: "bg-purple-600", color: "text-white", label: "CRM" });
    } else {
      icons.push({ icon: Sparkles, bg: "bg-indigo-600", color: "text-white", label: "Flow" });
    }

    return icons;
  };

  // Format created date
  const formatCreatedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/automations"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Automations</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="text-foreground font-medium">Workflow</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold tracking-wide text-foreground">
            WORKFLOW
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your workspace automation flows and channel execution pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Workflow
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsUnlockModalOpen(true)}
            className="font-medium shadow-2xs"
          >
            <Lock className="h-4 w-4 mr-1" />
            Unlock Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Folders sidebar */}
        <div className="h-fit rounded-lg border bg-background p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Folders</h2>
            <button
              type="button"
              aria-label="Add folder"
              onClick={() => setIsCreatingFolder(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>

          {/* Inline Folder Creation */}
          {isCreatingFolder && (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 pt-1">
              <Input
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="h-8 text-xs bg-muted/20"
                disabled={isSubmittingFolder}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingFolder || !newFolderName.trim()}
                className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                {isSubmittingFolder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="h-8 px-2 text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}

          {/* Folder List */}
          <div className="space-y-1">
            {folders.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setActiveFolder("all");
                  setPage(1);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeFolder === "all"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="h-4 w-4" />
                  <span>All</span>
                </div>
              </button>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setPage(1);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeFolder === folder.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {folder.count !== null && (
                    <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-full ml-2 shrink-0">
                      {folder.count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Workflows Table Card */}
        <div className="overflow-hidden rounded-lg border bg-background shadow-2xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading workspace workflows from database...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-medium text-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWorkflows(activeFolder, page)}
                className="text-xs h-8"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            </div>
          ) : workflows.length === 0 ? (
            /* Proper Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mb-3 border">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Workflows Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                {activeFolder !== "all"
                  ? "No workflows are assigned to this folder yet. Create a workflow or switch to another folder."
                  : "You haven't created any workflows in this workspace yet. Get started by creating your first automated journey."}
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-medium shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Workflow
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 text-xs font-bold tracking-wide">
                      STATUS
                    </TableHead>
                    <TableHead className="text-xs font-bold tracking-wide">
                      APPS
                    </TableHead>
                    <TableHead className="text-xs font-bold tracking-wide">
                      TITLE
                    </TableHead>
                    <TableHead className="text-xs font-bold tracking-wide">
                      TAGS
                    </TableHead>
                    <TableHead className="text-xs font-bold tracking-wide">
                      FOLDER
                    </TableHead>
                    <TableHead className="text-xs font-bold tracking-wide">
                      CREATED ON
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold tracking-wide">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((row) => {
                    const appIcons = getAppIcons(row);
                    const isEditingTags = editingTagsId === row.id;

                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        {/* Status Toggle Switch */}
                        <TableCell>
                          <Switch
                            checked={row.status}
                            disabled={isActionLoading === row.id}
                            onCheckedChange={() => handleToggle(row)}
                          />
                        </TableCell>

                        {/* Apps / Channels */}
                        <TableCell>
                          <div className="flex items-center">
                            {appIcons.map((app, i) => (
                              <div
                                key={i}
                                title={app.label}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full shadow-2xs",
                                  app.bg,
                                  i !== 0 && "-ml-2 ring-2 ring-background"
                                )}
                              >
                                <app.icon className={cn("h-3.5 w-3.5", app.color)} />
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        {/* Workflow Title -> Link to Canvas Builder */}
                        <TableCell>
                          <Link
                            href={`/automations/workflow/${row.id}/builder`}
                            className="font-semibold text-primary hover:underline transition-all block max-w-xs truncate"
                          >
                            {row.title}
                          </Link>
                        </TableCell>

                        {/* Tags with Double-Click Inline Editing */}
                        <TableCell>
                          {isEditingTags ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingTagsText}
                                onChange={(e) => setEditingTagsText(e.target.value)}
                                autoFocus
                                className="h-7 text-xs w-36 bg-background"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveTags(row.id);
                                  if (e.key === "Escape") setEditingTagsId(null);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveTags(row.id)}
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTagsId(null)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingTagsId(row.id);
                                setEditingTagsText(row.tags?.join(", ") || "");
                              }}
                              title="Double click to edit tags"
                              className="text-xs italic text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                            >
                              {row.tags && row.tags.length > 0
                                ? row.tags.join(", ")
                                : "--Double Click to Edit--"}
                            </span>
                          )}
                        </TableCell>

                        {/* Folder Name */}
                        <TableCell className="text-xs text-foreground">
                          {row.folder?.name || "All"}
                        </TableCell>

                        {/* Created On Date */}
                        <TableCell className="whitespace-nowrap text-xs text-foreground font-mono">
                          {formatCreatedDate(row.createdAt)}
                        </TableCell>

                        {/* Row Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 text-muted-foreground">
                            {/* View / Open Builder */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-foreground"
                              title="View & Edit Canvas"
                              onClick={() => router.push(`/automations/workflow/${row.id}/builder`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* View History */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-foreground"
                              title="View Execution History"
                              onClick={() => handleOpenHistory(row)}
                            >
                              <History className="h-4 w-4" />
                            </Button>

                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:text-foreground"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/automations/workflow/${row.id}/builder`)}
                                  className="text-xs cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5 mr-2" />
                                  Edit Canvas
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExecuteWorkflow(row)}
                                  className="text-xs cursor-pointer text-emerald-600 focus:text-emerald-700"
                                >
                                  <Play className="h-3.5 w-3.5 mr-2" />
                                  Test Run Flow
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenHistory(row)}
                                  className="text-xs cursor-pointer"
                                >
                                  <History className="h-3.5 w-3.5 mr-2" />
                                  Audit History
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setWorkflowToDelete(row)}
                                  className="text-xs cursor-pointer text-rose-600 focus:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete Workflow
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer / pagination */}
          {!isLoading && !error && workflows.length > 0 && (
            <div className="flex flex-col gap-3 border-t bg-secondary/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Showing {workflows.length} of {pagination.total} results
              </p>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-colors",
                      page === n
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {n}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating actions */}
      <div className="fixed bottom-7 right-7 flex flex-col gap-3">
        <Button
          size="icon"
          className="h-11 w-11 rounded-full bg-green-600 shadow-lg hover:bg-green-700"
          aria-label="Quick actions"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Zap className="h-5 w-5" />
        </Button>
        <Link href="/crm/live-chat">
          <Button
            size="icon"
            className="h-11 w-11 rounded-full shadow-lg"
            aria-label="Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Create Workflow Modal */}
      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async () => {
          await fetchFolders();
          await fetchWorkflows(activeFolder, 1);
        }}
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
        onFolderCreated={async () => {
          await fetchFolders();
        }}
      />

      {/* Unlock Workflow Modal */}
      <UnlockWorkflowModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onWorkflowUnlocked={async () => {
          await fetchFolders();
          await fetchWorkflows(activeFolder, 1);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">Delete Workflow</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">&quot;{workflowToDelete.title}&quot;</span>?
              This action cannot be undone and will stop any scheduled or incoming executions for this flow.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setWorkflowToDelete(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteWorkflow}
                className="text-xs h-8 gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Execution / Activity History Modal */}
      {historyWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">{historyWorkflow.title}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Audit History & Execution Logs • {historyWorkflow.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryWorkflow(null)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Recent Activity Logs
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExecuteWorkflow(historyWorkflow)}
                  disabled={isActionLoading === `exec_${historyWorkflow.id}`}
                  className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                >
                  {isActionLoading === `exec_${historyWorkflow.id}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Run Test Execution
                </Button>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/10">
                  No execution or activity history recorded for this workflow yet. Click &quot;Run Test Execution&quot; to test.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border bg-muted/15 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{log.action}</span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              log.status === "Success"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            )}
                          >
                            {log.status}
                          </span>
                        </div>
                        {log.metadata?.durationMs && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Duration: {log.metadata.durationMs} ms
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                        {new Date(log.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryWorkflow(null)}
                className="text-xs h-8"
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