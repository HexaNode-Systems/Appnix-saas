"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, IndianRupee, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminApi } from "@/super-admin/services/superAdminApi";

const metricCards = [
  { key: "directClientsCount", label: "Direct Clients", icon: Users, color: "text-violet-600" },
  { key: "activeStaffCount", label: "Active Staff", icon: ShieldCheck, color: "text-sky-600" },
  { key: "directMrr", label: "Direct MRR", icon: IndianRupee, color: "text-emerald-600" },
  { key: "messageVolume", label: "Message Volume", icon: MessageSquare, color: "text-amber-600" },
] as const;

export default function DirectOperationsPage() {
  const [launching, setLaunching] = useState(false);
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["super-admin", "direct-operations", "overview"],
    queryFn: superAdminApi.getDirectOperationsOverview,
  });
  const launchDirectAdmin = async () => {
    setLaunching(true);
    try {
      const result = await superAdminApi.directOperationsGuestLogin("DIRECT_ADMIN");
      if (result?.redirectUrl) {
        window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Failed to generate guest session");
      }
    } catch (err: any) {
      console.error("Launch direct admin error:", err);
      toast.error(err?.response?.data?.message || "Error launching direct admin guest session");
    } finally { setLaunching(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Direct Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Appnix staff and clients on admin.appnix.co.in and app.appnix.co.in only.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Unable to load direct operations.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}<Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums">
              {loading ? "…" : key === "directMrr" ? `₹${Number(data?.[key] || 0).toLocaleString("en-IN")}` : Number(data?.[key] || 0).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-sky-600" />
          <h2 className="mt-3 font-bold">Direct Staff</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inspect internal Appnix admin accounts and start an audited guest session.</p>
          <div className="mt-4 flex gap-2"><Button onClick={launchDirectAdmin} disabled={launching}>{launching ? "Launching…" : "Launch Direct Admin (Guest Mode)"}</Button><Button asChild variant="outline"><Link href="/super-admin/direct-operations/staff">Manage staff</Link></Button></div>
        </div>
        <Link href="/super-admin/direct-operations/clients" className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40">
          <Activity className="h-5 w-5 text-violet-600" />
          <h2 className="mt-3 font-bold">Direct Clients</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review direct workspaces, subscriptions, balances, and guest-login access.</p>
        </Link>
      </div>
    </div>
  );
}
