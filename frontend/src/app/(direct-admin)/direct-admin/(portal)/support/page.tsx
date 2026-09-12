"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Search, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { config } from "@/lib/config";

interface SupportTicketItem {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

export default function DirectAdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const res = await fetch(`${config.api.proxyPrefix}/support`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          setTickets(items);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  const filtered = tickets.filter(
    (t) =>
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Staff Support Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            Universal resolution queue for escalated customer issues and inquiries
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Loading Support Tickets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No open support tickets. All customer inquiries are resolved.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Subject</th>
                  <th className="px-6 py-3.5 font-semibold">Category</th>
                  <th className="px-6 py-3.5 font-semibold">Priority</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {ticket.category || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                        {ticket.priority || "NORMAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-medium">
                        {ticket.status || "OPEN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      {new Date(ticket.createdAt).toLocaleDateString()}
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
