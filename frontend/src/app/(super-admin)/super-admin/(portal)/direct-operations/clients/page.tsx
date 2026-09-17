"use client";

import { useEffect, useState } from "react";
import { LogIn, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminApi } from "@/super-admin/services/superAdminApi";

export default function DirectClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const load = async () => { setLoading(true); try { const result = await superAdminApi.getDirectOperationsClients({ page, limit: 25 }); setClients(result.data || []); setPagination(result); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [page]);
  const guestLogin = async (userId: string) => { setOpeningId(userId); try { const result = await superAdminApi.directOperationsGuestLogin("DIRECT_CLIENT", userId); if (result.redirectUrl) window.open(result.redirectUrl, "_blank", "noopener,noreferrer"); } finally { setOpeningId(null); } };

  return <div className="space-y-6">
    <div className="flex items-center justify-between border-b pb-5"><div><h1 className="text-2xl font-extrabold">Direct Clients</h1><p className="mt-1 text-sm text-muted-foreground">Direct app.appnix.co.in workspaces only. Reseller children are excluded.</p></div><Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button></div>
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="p-3">Client Name / Business</th><th className="p-3">Email / Phone</th><th className="p-3">Subscription Plan</th><th className="p-3">Wallet Balance</th><th className="p-3">Joined Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading direct clients…</td></tr> : clients.map((client) => <tr key={client.id} className="border-t"><td className="p-3"><div className="font-semibold">{client.name || "Unnamed client"}</div><div className="text-xs text-muted-foreground">{client.businessName}</div></td><td className="p-3"><div>{client.email}</div><div className="text-xs text-muted-foreground">{client.phone || "—"}</div></td><td className="p-3">{client.subscriptionTier || "No subscription"}</td><td className="p-3">{client.walletCurrency} {Number(client.walletBalance).toLocaleString("en-IN")}</td><td className="p-3 text-muted-foreground">{new Date(client.createdAt).toLocaleDateString()}</td><td className="p-3">{client.status}</td><td className="p-3 text-right"><Button size="sm" onClick={() => guestLogin(client.id)} disabled={openingId === client.id} className="gap-1.5 bg-violet-600 hover:bg-violet-700"><LogIn className="h-3.5 w-3.5" />{openingId === client.id ? "Opening…" : "Guest Login"}</Button></td></tr>)}
      {!loading && !clients.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-5 w-5" />No direct client workspaces found.</td></tr>}
    </tbody></table><div className="flex items-center justify-between border-t p-3 text-sm"><span className="text-muted-foreground">{pagination?.total || 0} direct clients</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!pagination?.hasPrevious} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!pagination?.hasNext} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></div>
  </div>;
}
