"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  CreditCard,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Receipt,
  Loader2,
} from "lucide-react";

export default function SuperAdminSubscriptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states for both tables
  const [subPage, setSubPage] = useState(1);
  const [subLimit, setSubLimit] = useState(10);

  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit, setOrderLimit] = useState(10);

  const loadData = async (
    targetSubPage = subPage,
    targetSubLimit = subLimit,
    targetOrderPage = orderPage,
    targetOrderLimit = orderLimit,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getSubscriptions({
        subPage: targetSubPage,
        subLimit: targetSubLimit,
        orderPage: targetOrderPage,
        orderLimit: targetOrderLimit,
      });
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load subscriptions data");
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
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Financial Infrastructure
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Subscriptions, Plans & Platform Revenue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit recurring customer subscriptions, retail plan allocations, and payment gateway order ledgers.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Subscriptions
          </span>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : data?.overview?.activeSubscriptions || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {data?.overview?.totalSubscriptions || 0} total tenant accounts
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active 7-Day Trials
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
            {loading ? "..." : data?.overview?.activeTrialsCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.overview?.expiredTrialsCount ?? 0} expired • {data?.overview?.trialEnabledPartnersCount ?? 0} partners enabled
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Gateway Payments Collected
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
            {loading ? "..." : `₹${Number(data?.overview?.totalRevenue || 0).toLocaleString("en-IN")}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.overview?.successOrdersCount || 0} successful transactions
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Payment Orders Total
          </span>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : data?.overview?.paymentOrdersCount || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cashfree payment webhooks</p>
        </div>
      </div>

      {/* Plans Distribution */}
      <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">Standard Retail SaaS Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.plans?.map((p: any) => (
            <div key={p.id} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">{p.name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  ₹{p.price}/mo
                </Badge>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                <strong className="text-foreground">{p.activeSubscribers}</strong> active subscribers
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="text-sm font-bold text-foreground">Active Tenant Subscriptions</h3>
          <p className="text-xs text-muted-foreground">Current recurring subscriptions active in PostgreSQL</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading subscriptions from database...</span>
          </div>
        ) : !(data?.subscriptions?.data?.length || (Array.isArray(data?.subscriptions) && data.subscriptions.length)) ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No active tenant subscriptions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Tenant Workspace</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.subscriptions?.data || (Array.isArray(data?.subscriptions) ? data.subscriptions : [])).map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {s.tenantName}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {s.planName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {s.price}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                      {new Date(s.currentPeriodStart).toLocaleDateString()} – {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        className={
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SuperAdminPagination
          page={data?.subscriptions?.page || subPage}
          limit={data?.subscriptions?.limit || subLimit}
          total={data?.subscriptions?.total || 0}
          totalPages={data?.subscriptions?.totalPages || 1}
          hasNext={Boolean(data?.subscriptions?.hasNext)}
          hasPrevious={Boolean(data?.subscriptions?.hasPrevious)}
          onPageChange={(newPage) => {
            setSubPage(newPage);
            loadData(newPage, subLimit, orderPage, orderLimit);
          }}
          onLimitChange={(newLimit) => {
            setSubLimit(newLimit);
            setSubPage(1);
            loadData(1, newLimit, orderPage, orderLimit);
          }}
          loading={loading}
        />
      </div>

      {/* Payment Orders Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="text-sm font-bold text-foreground">Recent Payment Gateway Orders</h3>
          <p className="text-xs text-muted-foreground">Order transactions recorded via Cashfree payment webhooks</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading payment ledgers...</div>
        ) : !(data?.recentPaymentOrders?.data?.length || (Array.isArray(data?.recentPaymentOrders) && data.recentPaymentOrders.length)) ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No payment orders processed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.recentPaymentOrders?.data || (Array.isArray(data?.recentPaymentOrders) ? data.recentPaymentOrders : [])).map((o: any) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors font-mono">
                    <td className="py-3 px-4 text-foreground font-bold">{o.orderId}</td>
                    <td className="py-3 px-4 font-sans text-foreground">{o.planName}</td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-bold">
                      ₹{o.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-sans text-muted-foreground">{o.paymentMethod}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          o.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SuperAdminPagination
          page={data?.recentPaymentOrders?.page || orderPage}
          limit={data?.recentPaymentOrders?.limit || orderLimit}
          total={data?.recentPaymentOrders?.total || 0}
          totalPages={data?.recentPaymentOrders?.totalPages || 1}
          hasNext={Boolean(data?.recentPaymentOrders?.hasNext)}
          hasPrevious={Boolean(data?.recentPaymentOrders?.hasPrevious)}
          onPageChange={(newPage) => {
            setOrderPage(newPage);
            loadData(subPage, subLimit, newPage, orderLimit);
          }}
          onLimitChange={(newLimit) => {
            setOrderLimit(newLimit);
            setOrderPage(1);
            loadData(subPage, subLimit, 1, newLimit);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
