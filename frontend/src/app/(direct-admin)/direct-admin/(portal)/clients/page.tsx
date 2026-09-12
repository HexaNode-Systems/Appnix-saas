"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Building2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { config } from "@/lib/config";

interface ClientTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  createdAt: string;
  users?: { email: string; role: string }[];
}

export default function DirectAdminClientsPage() {
  const [clients, setClients] = useState<ClientTenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch(`${config.api.proxyPrefix}/tenants`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          setClients(list);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Direct Appnix Clients</h1>
          <p className="text-xs text-slate-400 mt-1">
            Workspaces registered directly on app.appnix.co.in (isolated from reseller trees)
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Loading Direct Clients...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No direct clients matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Workspace Name</th>
                  <th className="px-6 py-3.5 font-semibold">Slug Identifier</th>
                  <th className="px-6 py-3.5 font-semibold">Tier</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{c.slug}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {c.tier || "END_CLIENT"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {c.status === "ACTIVE" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
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
