"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FeatureFlag } from "@/super-admin/types";
import { featureFlagService } from "@/super-admin/services";
import { FlagModal } from "@/super-admin/components/feature-flags/FlagModal";
import {
  Flag,
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Edit2,
  Trash2,
} from "lucide-react";

export default function SuperAdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const fetchFlags = () => {
    featureFlagService.getAll().then(setFlags);
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = (flag: FeatureFlag) => {
    const actionName = flag.isEnabled ? "DISABLE" : "ENABLE";
    if (
      flag.impactLevel === "High" &&
      !confirm(`Are you sure you want to ${actionName} high-impact flag "${flag.name}"?`)
    ) {
      return;
    }

    featureFlagService.toggle(flag.id).then(() => {
      fetchFlags();
    });
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingFlag(null);
    setIsModalOpen(true);
  };

  const filteredFlags = flags.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "Enabled") return f.isEnabled;
    if (activeFilter === "Disabled") return !f.isEnabled;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/super-admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Feature Flags</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6 text-emerald-600" />
            Feature Flags & Capabilities
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Control platform capabilities, experimental rollouts, and multi-tenant feature gating.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Feature Flag
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl bg-card p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {["All", "Enabled", "Disabled"].map((tab) => {
            const isSelected = activeFilter === tab;
            const count =
              tab === "All"
                ? flags.length
                : tab === "Enabled"
                ? flags.filter((f) => f.isEnabled).length
                : flags.filter((f) => !f.isEnabled).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search feature flags by key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8.5 text-xs bg-background"
          />
        </div>
      </div>

      {/* Feature Flags Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4 text-left">Feature Name & Key</th>
                <th className="p-4 text-left min-w-64">Description</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-left">Environment</th>
                <th className="p-4 text-left">Impact</th>
                <th className="p-4 text-left">Updated By</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.map((flag) => (
                <tr
                  key={flag.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors text-xs"
                >
                  {/* Name & Key */}
                  <td className="p-4">
                    <p className="font-bold text-foreground">{flag.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {flag.key}
                    </p>
                  </td>

                  {/* Description */}
                  <td className="p-4 text-muted-foreground text-xs leading-relaxed">
                    {flag.description}
                  </td>

                  {/* Status Toggle */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={flag.isEnabled}
                        onCheckedChange={() => handleToggle(flag)}
                      />
                      <span
                        className={cn(
                          "font-bold text-[11px]",
                          flag.isEnabled ? "text-emerald-600" : "text-muted-foreground"
                        )}
                      >
                        {flag.isEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                  </td>

                  {/* Environment */}
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        flag.environment === "Production" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                        flag.environment === "Beta" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                        flag.environment === "Staging" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                      )}
                    >
                      {flag.environment}
                    </Badge>
                  </td>

                  {/* Impact */}
                  <td className="p-4">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-semibold",
                        flag.impactLevel === "High" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                        flag.impactLevel === "Medium" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        flag.impactLevel === "Low" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {flag.impactLevel} Impact
                    </Badge>
                  </td>

                  {/* Updated By */}
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    <p className="font-medium text-foreground">{flag.updatedBy}</p>
                    <p className="text-[10px]">{flag.lastUpdated}</p>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(flag)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flag Modal */}
      <FlagModal
        isOpen={isModalOpen}
        flag={editingFlag}
        onClose={() => setIsModalOpen(false)}
        onSaveFlag={(saved) => {
          featureFlagService.save(saved).then(() => {
            fetchFlags();
            alert(`Flag ${saved.name} saved successfully!`);
          });
        }}
      />
    </div>
  );
}
