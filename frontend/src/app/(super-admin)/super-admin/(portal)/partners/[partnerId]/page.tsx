"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function PartnerDetailsPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const resolvedParams = use(params);
  const partnerId = resolvedParams.partnerId;
  const router = useRouter();

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state for client subtree
  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(10);

  const loadPartner = async (targetPage = clientPage, targetLimit = clientLimit) => {
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getPartnerById(partnerId, {
        clientPage: targetPage,
        clientLimit: targetLimit,
      });
      setPartner(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load partner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartner();
  }, [partnerId]);

  const handlePageChange = (newPage: number) => {
    setClientPage(newPage);
    loadPartner(newPage, clientLimit);
  };

  const handleLimitChange = (newLimit: number) => {
    setClientLimit(newLimit);
    setClientPage(1);
    loadPartner(1, newLimit);
  };

  const handleToggleStatus = async () => {
    if (!partner) return;
    const newStatus = partner.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Set partner status to ${newStatus}?`)) return;

    try {
      await superAdminApi.updatePartnerStatus(partner.id, newStatus);
      loadPartner();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleTogglePaymentStatus = async () => {
    if (!partner) return;
    const currentPaid =
      partner.metrics?.lifetimeFeePaid ?? (partner.partnerConfig?.setupFeePaid ?? true);
    const newPaid = !currentPaid;
    const actionText = newPaid
      ? `Mark ${partner.name}'s Lifetime White-Label Fee as PAID?`
      : `Mark ${partner.name}'s Lifetime White-Label Fee as PENDING?`;
    if (!confirm(actionText)) return;

    try {
      await superAdminApi.updatePartner(partner.id, { setupFeePaid: newPaid });
      loadPartner();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update payment status");
    }
  };

  const handleImpersonate = async () => {
    try {
      const res = await superAdminApi.impersonatePartner(partnerId);
      if (res.impersonationToken) {
        sessionStorage.setItem("appnix_impersonation_token", res.impersonationToken);
        alert(`Impersonation session started for ${partner.name}.`);
        window.open(`/admin/dashboard?impersonate=${partnerId}`, "_blank");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Impersonation failed");
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <span>Loading partner architecture & client subtree...</span>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="space-y-4">
        <Link href="/super-admin/partners">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Partners</span>
          </Button>
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error || "Partner not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="space-y-3">
        <Link href="/super-admin/partners">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Partners</span>
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0"
              style={{ backgroundColor: partner.branding?.primaryColor || "#0f172a" }}
            >
              {partner.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">{partner.name}</h1>
                <Badge
                  className={
                    partner.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  }
                >
                  {partner.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                slug: {partner.slug} • id: {partner.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImpersonate}
              className="h-9 text-xs gap-1.5 border-amber-500/40 text-amber-900 dark:text-amber-200"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Inspect Workspace</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className={`h-9 text-xs font-semibold ${
                partner.status === "ACTIVE"
                  ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              {partner.status === "ACTIVE" ? "Suspend Partner" : "Activate Partner"}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Lifetime White-Label Fee */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Lifetime License Fee
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            ₹{Number(partner.metrics?.lifetimeFee ?? partner.partnerConfig?.setupFee ?? 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={handleTogglePaymentStatus}
              title="Click to toggle Paid / Pending"
              className="cursor-pointer group"
            >
              <Badge
                className={
                  (partner.metrics?.lifetimeFeePaid ?? (partner.partnerConfig?.setupFeePaid ?? true))
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] group-hover:opacity-80"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] group-hover:opacity-80"
                }
              >
                {(partner.metrics?.lifetimeFeePaid ?? (partner.partnerConfig?.setupFeePaid ?? true)) ? "PAID" : "PENDING"}
              </Badge>
            </button>
            <span className="text-[10px] text-muted-foreground">No Expiry</span>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active End-Clients
            </span>
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {partner.metrics?.activeClientCount} / {partner.metrics?.maxClients}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">Tenant subtree capacity</p>
        </div>

        {/* Card 3: Commission Rate */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Commission / Client
            </span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
            ₹{partner.metrics?.commissionPerClient ?? partner.metrics?.perClientRate ?? 499}
            <span className="text-xs font-normal text-muted-foreground">/cl/mo</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">Super Admin controlled</p>
        </div>

        {/* Card 4: Monthly Commission Revenue */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Commission
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            ₹{Number(partner.metrics?.monthlyCommissionRevenue ?? partner.metrics?.recurringWholesaleRevenue ?? 0).toLocaleString("en-IN")}
            <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
            Total: ₹{Number(partner.metrics?.totalCommissionRevenue || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* Card 5: Partner Margin */}
        <div className="rounded-xl border bg-amber-500/10 border-amber-500/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Partner Net Margin
            </span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono mt-2">
            ₹{Number(partner.metrics?.partnerMargin ?? 0).toLocaleString("en-IN")}
            <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
            {partner.metrics?.partnerMarginPercentage || 75}% margin retained
          </p>
        </div>
      </div>

      {/* Two Column Layout: Partner Config & Client Subtree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Partner Configuration & Domain */}
        <div className="space-y-6">
          {/* Custom Domain Card */}
          <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              White-Label Custom Domain
            </h3>

            {partner.customDomain ? (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {partner.customDomain}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      CNAME
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Points to: <strong className="font-mono">cname.appnix.co.in</strong>
                  </p>
                </div>
                <Link href="/super-admin/domains">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8">
                    Inspect Real DNS Verification →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">
                No custom domain configured. Using Appnix default routing.
              </div>
            )}
          </div>

          {/* Reseller Admin Contact */}
          <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Reseller Admin Credentials
            </h3>
            <div className="space-y-2 text-xs">
              {partner.adminUsers?.map((u: any) => (
                <div key={u.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-0.5">
                  <p className="font-bold text-foreground">{u.name || "Administrator"}</p>
                  <p className="font-mono text-muted-foreground text-[11px]">{u.email}</p>
                  {u.phone && <p className="font-mono text-muted-foreground text-[11px]">{u.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Client Subtree List */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Managed End-Client Accounts</h3>
              <p className="text-[11px] text-muted-foreground">
                Client tenants created under {partner.name}&apos;s subtree
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
              {partner?.clients?.total ?? (Array.isArray(partner?.clients) ? partner.clients.length : partner?.metrics?.activeClientCount || 0)} Clients
            </span>
          </div>

          {!(partner?.clients?.data?.length || (Array.isArray(partner?.clients) && partner.clients.length)) ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No clients onboarded by this partner yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold">
                    <th className="pb-2.5">Client Business Name</th>
                    <th className="pb-2.5">Slug</th>
                    <th className="pb-2.5">Users</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(partner?.clients?.data || (Array.isArray(partner?.clients) ? partner.clients : [])).map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-semibold text-foreground">
                        {c.name}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground text-[11px]">
                        {c.slug}
                      </td>
                      <td className="py-3 font-mono">
                        {c.userCount} users
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            c.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SuperAdminPagination
            page={partner?.clients?.page || clientPage}
            limit={partner?.clients?.limit || clientLimit}
            total={partner?.clients?.total || 0}
            totalPages={partner?.clients?.totalPages || 1}
            hasNext={Boolean(partner?.clients?.hasNext)}
            hasPrevious={Boolean(partner?.clients?.hasPrevious)}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            loading={loading}
          />
        </div>
      </div>

      {/* Commission History & Monthly Revenue Ledger Card */}
      <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Commission History & Monthly Revenue Ledger</h3>
              <p className="text-[11px] text-muted-foreground">
                One-time lifetime White-Label license + monthly per-client commission tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-mono">
              {(partner.commissionHistory || []).length} billing cycles tracked
            </Badge>
          </div>
        </div>

        {/* Revenue Model Explainer Banner */}
        <div className="p-3.5 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">
              Lifetime White-Label License & Recurring Commission Model
            </p>
            <p className="text-[11px] leading-relaxed">
              This partner paid a <strong>one-time lifetime White-Label fee</strong> of{" "}
              <strong className="font-mono text-foreground">
                ₹{Number(partner.metrics?.lifetimeFee ?? partner.partnerConfig?.setupFee ?? 0).toLocaleString("en-IN")}
              </strong>{" "}
              giving them permanent White-Label platform access with no annual renewal or expiration date. Appnix separately earns a monthly recurring commission of{" "}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                ₹{partner.metrics?.commissionPerClient ?? partner.metrics?.perClientRate ?? 499}/client/month
              </strong>{" "}
              for each active end-client. The partner sets their own retail pricing and retains 100% of their margin.
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        {!(partner.commissionHistory && partner.commissionHistory.length > 0) ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No monthly commission history records available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Billing Period</th>
                  <th className="py-2.5 px-3.5">Active Clients</th>
                  <th className="py-2.5 px-3.5">Commission Rate</th>
                  <th className="py-2.5 px-3.5">Appnix Commission</th>
                  <th className="py-2.5 px-3.5">Partner Retail Gross</th>
                  <th className="py-2.5 px-3.5">Partner Retained Margin</th>
                  <th className="py-2.5 px-3.5">Ledger Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {partner.commissionHistory.map((item: any) => (
                  <tr key={item.period} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold text-foreground font-sans">
                      {item.label}
                      <span className="block text-[10px] text-muted-foreground font-mono">
                        {item.period}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-foreground font-bold">
                      {item.activeClients}
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      ₹{item.commissionRate}/cl
                    </td>
                    <td className="py-2.5 px-3.5 text-emerald-700 dark:text-emerald-400 font-bold">
                      ₹{Number(item.commissionEarned || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      ₹{Number(item.retailRevenue || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-amber-700 dark:text-amber-300">
                      ₹{Number(item.partnerMargin || 0).toLocaleString("en-IN")}
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">
                        ({item.marginPercentage}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <Badge
                        className={
                          item.status === "CURRENT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]"
                            : item.status === "SETTLED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
                            : "bg-muted text-muted-foreground text-[10px]"
                        }
                      >
                        {item.status}
                      </Badge>
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
