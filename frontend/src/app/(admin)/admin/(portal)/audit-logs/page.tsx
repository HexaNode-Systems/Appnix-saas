"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuditLogEntry } from "@/super-admin/types";
import { auditService } from "@/super-admin/services";
import {
  History,
  ArrowLeft,
  ChevronRight,
  Search,
  Filter,
  Shield,
  Sliders,
  UserMinus,
  Key,
  Flag,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    auditService.getAll().then(setLogs);
  }, []);

  const getActionIcon = (category: AuditLogEntry["category"]) => {
    switch (category) {
      case "Configuration":
        return <Sliders className="h-4 w-4 text-primary" />;
      case "User":
        return <UserMinus className="h-4 w-4 text-rose-600" />;
      case "Security":
        return <Key className="h-4 w-4 text-amber-500" />;
      case "FeatureFlag":
        return <Flag className="h-4 w-4 text-indigo-600" />;
      case "Billing":
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== "All" && log.category !== categoryFilter) return false;
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
        <span className="font-semibold text-foreground">Audit Logs</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-600" />
            Audit Log & System Events
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Immutable chronicle of administrative interventions, permission shifts, and security events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => alert("Exporting tamper-evident JSON/CSV audit ledger...")}
          className="text-xs font-semibold gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export Audit Trail
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl bg-card p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {["All", "Configuration", "Security", "FeatureFlag", "Billing", "User"].map((tab) => {
            const isSelected = categoryFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setCategoryFilter(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search action or actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8.5 text-xs bg-background"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4 text-left">Action & Summary</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Actor</th>
                <th className="p-4 text-left">Timestamp</th>
                <th className="p-4 text-left">IP / Origin</th>
                <th className="p-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors text-xs"
                >
                  {/* Action & Description */}
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {getActionIcon(log.category)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{log.action}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-md">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-4 whitespace-nowrap">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {log.category}
                    </Badge>
                  </td>

                  {/* Actor */}
                  <td className="p-4 whitespace-nowrap">
                    <p className="font-semibold text-foreground">{log.actor}</p>
                    {log.actorEmail && (
                      <p className="text-[10px] text-muted-foreground">{log.actorEmail}</p>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  {/* IP */}
                  <td className="p-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {log.ip}
                  </td>

                  {/* Status Result */}
                  <td className="p-4 text-right whitespace-nowrap">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-bold",
                        log.status === "Success" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        log.status === "Warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        log.status === "Failed" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      )}
                    >
                      {log.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
