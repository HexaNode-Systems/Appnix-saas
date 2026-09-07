"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import {
  Building2,
  Users,
  CreditCard,
  Layers,
  Globe,
  Activity,
  Shield,
  ArrowUpRight,
  Plus,
  RefreshCw,
  TrendingUp,
  Radio,
  Server,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getDashboardOverview();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load platform telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Tier-0 Hardware Clearance Active
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Platform Infrastructure & Super Admin Console
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Root multitenant control plane, white-label wholesale economics, and channel telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/super-admin/partners">
            <Button size="sm" className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              <Plus className="h-3.5 w-3.5" />
              <span>New Partner</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* 5 Core Platform Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1: Partners */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              White-Label Partners
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">
              {loading ? "..." : data?.partners?.total || 0}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-semibold">{data?.partners?.active || 0} Active</span>
              <span>•</span>
              <span className="text-rose-600 font-medium">{data?.partners?.suspended || 0} Suspended</span>
            </div>
          </div>
        </div>

        {/* Metric 2: End-Clients */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Managed End-Clients
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">
              {loading ? "..." : data?.clients?.total || 0}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-semibold">{data?.clients?.active || 0} Active Accounts</span>
              <span>•</span>
              <span>{data?.users?.total || 0} Users</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Lifetime License Fees Collected */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lifetime License Fees
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">
              {loading ? "..." : `₹${Number(data?.revenue?.lifetimeFeesCollected || 0).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span>One-time partner licenses (Permanent)</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Monthly Recurring Commission Revenue */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Commission MRR
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono text-emerald-700 dark:text-emerald-400">
              {loading ? "..." : `₹${Number(data?.revenue?.monthlyCommissionRevenue ?? data?.revenue?.wholesaleMrr ?? 0).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span>From active end-clients</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Partner Retained Margin */}
        <div className="rounded-xl border bg-amber-500/10 border-amber-500/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Partner Margin
            </span>
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {loading ? "..." : `₹${Number(data?.revenue?.estimatedPartnerMargin || 0).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span>Retained by partners</span>
            </div>
          </div>
        </div>
      </div>

      {/* White-Label Wholesale Business Model Explainer Card */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold">
                WHITE-LABEL LIFETIME LICENSE MODEL
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">Permanent Access • No Expiration</span>
            </div>
            <h3 className="text-sm font-bold text-foreground">
              One-Time Lifetime White-Label License + Recurring Per-Client Commission
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              White-Label Partners pay a <strong>one-time lifetime White-Label fee</strong> (e.g. ₹49,999) for permanent platform access without any yearly or monthly renewal or expiry date.
              Separately, Appnix earns a recurring commission for every active end-client onboarded (e.g. <strong>₹499/client/month</strong>).
              Partners set their own retail prices and retain 100% of their margin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/super-admin/wholesale-plans">
              <Button size="sm" variant="outline" className="h-8.5 text-xs gap-1.5 border-amber-500/40 text-amber-900 dark:text-amber-200">
                <Layers className="h-3.5 w-3.5" />
                <span>Configure Wholesale Plans</span>
              </Button>
            </Link>
            <Link href="/super-admin/partners">
              <Button size="sm" className="h-8.5 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium">
                <span>Manage Partners</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Partners & Platform Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Partners */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">White-Label Partners / Admins</h3>
              <p className="text-[11px] text-muted-foreground">Recently registered reseller partners and per-client commission</p>
            </div>
            <Link
              href="/super-admin/partners"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              Loading partners from database...
            </div>
          ) : !data?.recentPartners?.length ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No White-Label Partners registered yet. Click &quot;New Partner&quot; to provision your first reseller.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="pb-2.5">Partner Name</th>
                    <th className="pb-2.5">Admin Contact</th>
                    <th className="pb-2.5">Custom Domain</th>
                    <th className="pb-2.5">Clients</th>
                    <th className="pb-2.5">Commission / Client</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentPartners.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 font-semibold text-foreground">
                        <Link href={`/super-admin/partners/${p.id}`} className="hover:text-amber-600 transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground font-mono text-[11px]">
                        {p.adminEmail}
                      </td>
                      <td className="py-3">
                        {p.customDomain ? (
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                            {p.customDomain}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 font-mono font-bold">
                        {p.clientCount}
                      </td>
                      <td className="py-3 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        ₹{p.perClientRate}/cl
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            p.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Links & Channel Summary */}
        <div className="space-y-6">
          {/* Channel Traffic Summary */}
          <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Platform Channels</h3>
                <p className="text-[11px] text-muted-foreground">Omnichannel volume across all tenants</p>
              </div>
              <Link
                href="/super-admin/channels"
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Details</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">WhatsApp Cloud API</span>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-medium">RCS Business Messaging</span>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-medium">Instagram Graph Direct</span>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="font-medium">Facebook Messenger</span>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Active
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Platform Actions */}
          <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-foreground border-b pb-2.5">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/super-admin/domains">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>Verify Custom Domain DNS</span>
                </Button>
              </Link>

              <Link href="/super-admin/clients">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span>Audit All End-Clients</span>
                </Button>
              </Link>

              <Link href="/super-admin/health">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <Server className="h-4 w-4 text-amber-500" />
                  <span>Inspect System & Webhook Health</span>
                </Button>
              </Link>

              <Link href="/super-admin/audit-logs">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  <span>Inspect Security Audit Trail</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
