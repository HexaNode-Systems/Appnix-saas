"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  History,
  Search,
  RefreshCw,
  Shield,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const loadLogs = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getAuditLogs({ page: targetPage, limit: targetLimit, search });
      if (res && "data" in res && Array.isArray(res.data)) {
        setLogs(res.data);
        setPage(res.page || targetPage);
        setLimit(res.limit || targetLimit);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setHasNext(Boolean(res.hasNext));
        setHasPrevious(Boolean(res.hasPrevious));
      } else {
        setLogs(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1, limit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadLogs(newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadLogs(1, newLimit);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Append-Only Security Ledger
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Audit Logs & Super Admin Activity
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable security ledger tracking platform-level administrative mutations, partner activations, and inspection sessions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadLogs()}
          disabled={loading}
          className="h-9 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-card p-3.5 rounded-xl border shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search action, endpoint, or operator email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </form>

        <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
          Showing {logs.length} latest entries
        </span>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Reading immutable audit trail from database...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-bold text-sm text-foreground">No Audit Logs Found</p>
            <p className="max-w-sm text-muted-foreground">
              Administrative actions and security events will be automatically recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold font-sans">
                <tr>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">API Route / Endpoint</th>
                  <th className="py-3 px-4">Operator Email</th>
                  <th className="py-3 px-4">Target Workspace</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{log.action}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {log.endpoint}
                    </td>

                    <td className="py-3 px-4 font-sans text-foreground">
                      {log.actorEmail || "Platform Super Admin"}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {log.targetWorkspaceId}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {log.ipAddress || "Internal"}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SuperAdminPagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          loading={loading}
        />
      </div>
    </div>
  );
}
