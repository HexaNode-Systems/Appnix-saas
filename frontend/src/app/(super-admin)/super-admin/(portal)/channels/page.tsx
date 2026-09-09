"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  Radio,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Wallet,
  Activity,
  Loader2,
} from "lucide-react";

export default function SuperAdminChannelsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getChannelUsage({ page: targetPage, limit: targetLimit });
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load channel telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadData(1, newLimit);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Omnichannel Gateway Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Platform-Wide Channel & Usage Monitoring
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated traffic across WhatsApp Cloud API, RCS Business Messaging, Instagram Direct, and Wallets.
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
          <span>Refresh Telemetry</span>
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
            Total Broadcast Messages
          </span>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : (data?.overview?.totalMessagesSent || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Platform-wide outbound traffic</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Average Delivery Rate
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
            {loading
              ? "..."
              : data?.overview?.deliveryRatePercentage !== null &&
                data?.overview?.deliveryRatePercentage !== undefined
              ? `${data.overview.deliveryRatePercentage}%`
              : "N/A"}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Delivered & Read across carriers
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Failed Invocations
          </span>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : (data?.overview?.failedMessagesCount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-rose-600 mt-1">Under carrier failure threshold</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Aggregated Wallet Balances
          </span>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : `₹${Number(data?.overview?.totalWalletBalance || 0).toLocaleString("en-IN")}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {data?.overview?.activeWalletsCount || 0} active wallets
          </p>
        </div>
      </div>

      {/* Channel Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">WhatsApp Cloud API</span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Meta Graph API v21.0 Official Business Solution</p>
          <div className="rounded-lg bg-muted/20 p-2.5 font-mono text-xs flex justify-between">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-bold text-foreground">
              {data?.channelBreakdown?.find((c: any) => c.channel === "whatsapp")?.count || 0} msgs
            </span>
          </div>
        </div>

        {/* RCS */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">RCS Business Messaging</span>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Carrier-verified rich card and carousel messaging</p>
          <div className="rounded-lg bg-muted/20 p-2.5 font-mono text-xs flex justify-between">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-bold text-foreground">
              {data?.channelBreakdown?.find((c: any) => c.channel === "rcs")?.count || 0} msgs
            </span>
          </div>
        </div>

        {/* Instagram */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">Instagram Graph DM</span>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Direct message automations and story replies</p>
          <div className="rounded-lg bg-muted/20 p-2.5 font-mono text-xs flex justify-between">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-bold text-foreground">
              {data?.channelBreakdown?.find((c: any) => c.channel === "instagram")?.count || 0} msgs
            </span>
          </div>
        </div>

        {/* Facebook */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">Facebook Messenger</span>
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Page messaging, lead ads, and persistent menus</p>
          <div className="rounded-lg bg-muted/20 p-2.5 font-mono text-xs flex justify-between">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-bold text-foreground">
              {data?.channelBreakdown?.find((c: any) => c.channel === "facebook")?.count || 0} msgs
            </span>
          </div>
        </div>
      </div>

      {/* Recent Channel Transactions */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="text-sm font-bold text-foreground">Recent Channel Ledger Transactions</h3>
          <p className="text-xs text-muted-foreground">Real-time channel billing ledger entries from channel_transactions</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading channel transactions...</span>
          </div>
        ) : !(data?.recentTransactions?.data?.length || (Array.isArray(data?.recentTransactions) && data.recentTransactions.length)) ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No channel ledger records found. Outbound broadcasts will appear here in real-time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold font-sans">
                <tr>
                  <th className="py-3 px-4">Workspace</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.recentTransactions?.data || (Array.isArray(data?.recentTransactions) ? data.recentTransactions : [])).map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-foreground">{t.tenantName}</td>
                    <td className="py-3 px-4 uppercase">{t.channel}</td>
                    <td className="py-3 px-4">{t.category}</td>
                    <td className="py-3 px-4 text-muted-foreground">{t.recipientPhone || "—"}</td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-bold">
                      ₹{t.amount}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {t.deliveryStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SuperAdminPagination
          page={data?.recentTransactions?.page || page}
          limit={data?.recentTransactions?.limit || limit}
          total={data?.recentTransactions?.total || 0}
          totalPages={data?.recentTransactions?.totalPages || 1}
          hasNext={Boolean(data?.recentTransactions?.hasNext)}
          hasPrevious={Boolean(data?.recentTransactions?.hasPrevious)}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          loading={loading}
        />
      </div>
    </div>
  );
}
