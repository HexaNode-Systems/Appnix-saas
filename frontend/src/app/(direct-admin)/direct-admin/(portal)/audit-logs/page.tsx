"use client";

import { useEffect, useState } from "react";
import { History, Search, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { config } from "@/lib/config";

interface AuditLogItem {
  id: string;
  superAdminId: string;
  targetWorkspaceId: string;
  action: string;
  endpoint: string;
  actorEmail?: string;
  createdAt: string;
}

export default function DirectAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch(`${config.api.proxyPrefix}/super-admin/audit-logs`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.data)
            ? json.data
            : [];
          setLogs(items);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.endpoint?.toLowerCase().includes(search.toLowerCase()) ||
      l.actorEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Platform Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of administrative operations, inspections, and platform changes
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or email..."
            className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Fetching Audit Events...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No audit log entries recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Action</th>
                  <th className="px-6 py-3.5 font-semibold">Actor</th>
                  <th className="px-6 py-3.5 font-semibold">Target Workspace</th>
                  <th className="px-6 py-3.5 font-semibold">Endpoint</th>
                  <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-semibold text-indigo-400">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-sans">
                      {log.actorEmail || "staff@appnix.co.in"}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {log.targetWorkspaceId || "root"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {log.endpoint}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
