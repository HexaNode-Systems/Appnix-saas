"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
} from "lucide-react";

export interface FeatureItem {
  id: string;
  featureId?: string;
  code: string;
  label: string;
  createdAt?: string;
}

interface ManageFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeaturesUpdated?: (features: FeatureItem[]) => void;
}

export function ManageFeaturesModal({
  isOpen,
  onClose,
  onFeaturesUpdated,
}: ManageFeaturesModalProps) {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // New feature form state
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getFeatures();
      const list = Array.isArray(data) ? data : [];
      setFeatures(list);
      if (onFeaturesUpdated) {
        onFeaturesUpdated(list);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load features."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFeatures();
      setError(null);
      setSuccessMsg(null);
      setIsAdding(false);
      setNewLabel("");
      setNewCode("");
      setCodeManuallyEdited(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLabelChange = (val: string) => {
    setNewLabel(val);
    if (!codeManuallyEdited) {
      const autoCode = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setNewCode(autoCode);
    }
  };

  const handleCodeChange = (val: string) => {
    setCodeManuallyEdited(true);
    const formatted = val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    setNewCode(formatted);
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanLabel = newLabel.trim();
    const cleanCode = (newCode || newLabel)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!cleanLabel) {
      setError("Feature display label is required.");
      return;
    }
    if (!cleanCode) {
      setError("Feature code is required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await superAdminApi.createFeature({
        code: cleanCode,
        label: cleanLabel,
      });

      setSuccessMsg(`Feature '${cleanLabel}' created successfully!`);
      setNewLabel("");
      setNewCode("");
      setCodeManuallyEdited(false);
      setIsAdding(false);

      // Refresh features list
      await loadFeatures();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create feature. Code may already exist."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeature = async (feature: FeatureItem) => {
    const confirmMsg = `Are you sure you want to remove feature '${feature.label}' (${feature.code}) from the features table?`;
    if (!confirm(confirmMsg)) return;

    setError(null);
    setSuccessMsg(null);
    setDeletingId(feature.code);

    try {
      await superAdminApi.deleteFeature(feature.featureId || feature.code);
      setSuccessMsg(`Feature '${feature.label}' removed successfully.`);
      await loadFeatures();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to delete feature."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFeatures = features.filter((f) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      f.label.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Manage Platform Features
                <Badge variant="outline" className="text-[10px] font-mono">
                  {features.length} Total
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Features available across wholesale packages and partner plans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notifications */}
        <div className="px-6 pt-4 space-y-2">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Action bar (Search & Add Toggle) */}
        <div className="px-6 py-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search features by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setIsAdding(!isAdding);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`h-9 text-xs gap-1.5 font-medium cursor-pointer ${
              isAdding
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
          >
            {isAdding ? (
              <>
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>Add Feature</span>
              </>
            )}
          </Button>
        </div>

        {/* Collapsible Add Feature Form */}
        {isAdding && (
          <div className="mx-6 mb-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 animate-in fade-in duration-150 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                New Feature Details
              </span>
              <span className="text-[10px] text-muted-foreground">
                Saved directly to database features table
              </span>
            </div>

            <form onSubmit={handleCreateFeature} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Display Label <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. AI Workflow Agent"
                    value={newLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    User-friendly name displayed in wholesale plan cards
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    System Code <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. ai_workflow_agent"
                    value={newCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Unique identifier (snake_case, lowercase)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  disabled={submitting}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !newLabel.trim() || !newCode.trim()}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Save Feature</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Feature List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 divide-y divide-border/60">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Loading features from database...</span>
            </div>
          ) : filteredFeatures.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground">
                {search ? "No matching features found" : "No features found in database"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                {search
                  ? "Try adjusting your search query."
                  : "Click 'Add Feature' above to create your first platform feature."}
              </p>
            </div>
          ) : (
            filteredFeatures.map((f) => {
              const isDeleting = deletingId === f.code;
              return (
                <div
                  key={f.code}
                  className="pt-2.5 pb-2.5 first:pt-0 flex items-center justify-between gap-3 group hover:bg-muted/30 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {f.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono px-1.5 py-0 h-4 bg-muted text-muted-foreground"
                      >
                        {f.code}
                      </Badge>
                    </div>
                    {f.createdAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Created {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => handleDeleteFeature(f)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title={`Delete feature '${f.label}'`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t bg-muted/10 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Changes are immediately applied to wholesale plan creation and editing.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
