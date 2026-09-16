"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import { SuperAdminClientDetailsModal } from "@/super-admin/components/clients/SuperAdminClientDetailsModal";
import { InsideClientsSection } from "@/super-admin/components/clients/InsideClientsSection";
import { executeGuestLogin } from "@/super-admin/services";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  Calendar,
  LogIn,
  Sparkles,
} from "lucide-react";

export default function SuperAdminClientsPage() {
  const [activeSubTab, setActiveSubTab] = useState<"all" | "inside">("all");
  const [clients, setClients] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Client Details Modal state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [summary, setSummary] = useState<{ total: number; active: number; suspended: number } | null>(null);

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const [clientsData, partnersData] = await Promise.all([
        superAdminApi.getClients({
          partnerId: partnerFilter || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          plan: planFilter !== "ALL" ? planFilter : undefined,
          search: search.trim() || undefined,
          page: targetPage,
          limit: targetLimit,
        }),
        superAdminApi.getPartners({ limit: 200 }),
      ]);

      if (clientsData && "data" in clientsData && Array.isArray(clientsData.data)) {
        setClients(clientsData.data);
        setPage(clientsData.page || targetPage);
        setLimit(clientsData.limit || targetLimit);
        setTotal(clientsData.total || 0);
        setTotalPages(clientsData.totalPages || 1);
        setHasNext(Boolean(clientsData.hasNext));
        setHasPrevious(Boolean(clientsData.hasPrevious));
        if (clientsData.summary) {
          setSummary(clientsData.summary);
        }
      } else {
        setClients(Array.isArray(clientsData) ? clientsData : []);
      }

      const partnersList = Array.isArray(partnersData) ? partnersData : partnersData?.data || [];
      setPartners(partnersList);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData(1, limit);
  }, [partnerFilter, statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData(1, limit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadData(1, newLimit);
  };

  const handleToggleStatus = async (client: any) => {
    const newStatus = client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Set client ${client.name} status to ${newStatus}?`)) return;

    try {
      await superAdminApi.updateClientStatus(client.id, newStatus);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleOpenDetails = (client: any) => {
    setSelectedClientId(client.id);
    setIsDetailsOpen(true);
  };

  const [guestLoadingId, setGuestLoadingId] = useState<string | null>(null);

  const handleLoginAsGuest = async (client: any) => {
    setGuestLoadingId(client.id);
    try {
      await executeGuestLogin(client, "/super-admin/clients");
    } catch (err: any) {
      console.error("Guest login failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to log in as guest");
    } finally {
      setGuestLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Bar: All Clients vs My Inside Clients */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          onClick={() => setActiveSubTab("all")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "all"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" />
          <span>All Clients (Wholesale & Partners)</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeSubTab === "all" ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
            )}
          >
            {total}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("inside")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "inside"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span>My Inside Clients</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.2 text-[9px] font-bold",
              activeSubTab === "inside" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
            )}
          >
            app. & admin.
          </span>
        </button>
      </div>

      {activeSubTab === "inside" ? (
        <InsideClientsSection isSuperAdmin={true} />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
       
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Platform Client Accounts
          </h1>
       
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

      {/* Real Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total End Clients
            </span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-foreground font-mono">
            {loading ? "..." : (summary?.total ?? total).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across all White-Label partners</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Active End Clients
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
            {loading ? "..." : (summary?.active ?? clients.filter((c) => c.status === "ACTIVE").length).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Operational active accounts</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Suspended Accounts
            </span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-700 dark:text-rose-400 font-mono">
            {loading ? "..." : (summary?.suspended ?? clients.filter((c) => c.status === "SUSPENDED").length).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Restricted or delinquent</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Active Resellers
            </span>
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
            {loading ? "..." : partners.length.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">White-Label distributor network</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-card p-3.5 rounded-xl border shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by client name, slug, owner, email, phone, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Partner Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium hidden sm:inline">Partner:</span>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium max-w-[180px] truncate"
            >
              <option value="">All Partners</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium hidden sm:inline">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium"
            >
              <option value="ALL">All Plans</option>
              <option value="Starter">Starter</option>
              <option value="Growth">Growth</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5 text-xs">
            {["ALL", "ACTIVE", "SUSPENDED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading end-clients from database...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-sm text-foreground">No clients found</p>
            <p className="max-w-sm text-muted-foreground">
              No client businesses match the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-3.5">Client Organization</th>
                  <th className="py-3 px-3.5">Parent White-Label Partner</th>
                  <th className="py-3 px-3.5">Owner / Contact</th>
                  <th className="py-3 px-3.5">Subscribed Plan</th>
                  <th className="py-3 px-3.5">Usage</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Created Date</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    {/* 1. Client Org */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-foreground text-xs">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">slug: {c.slug}</div>
                    </td>

                    {/* 2. Parent Partner */}
                    <td className="py-3.5 px-3.5">
                      {c.partner ? (
                        <Link
                          href={`/super-admin/partners/${c.partner.id}`}
                          className="font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" />
                          <span>{c.partner.name}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Platform Direct</span>
                      )}
                    </td>

                    {/* 3. Owner / Contact */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-medium text-foreground">
                        {c.ownerName || c.adminUser?.name || "Account Admin"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {c.ownerEmail || c.adminUser?.email || "No email"}
                      </div>
                      {(c.ownerPhone || c.adminUser?.phone) && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {c.ownerPhone || c.adminUser?.phone}
                        </div>
                      )}
                    </td>

                    {/* 4. Plan */}
                    <td className="py-3.5 px-3.5">
                      <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                        {c.plan || c.subscription?.planName || "Standard"}
                      </Badge>
                      {c.subscription?.price && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {c.subscription.price}
                        </div>
                      )}
                    </td>

                    {/* 5. Usage */}
                    <td className="py-3.5 px-3.5 font-mono text-[11px]">
                      <div>{c.stats?.users || 1} users</div>
                      <div className="text-muted-foreground">{c.stats?.contacts || 0} contacts</div>
                    </td>

                    {/* 6. Status */}
                    <td className="py-3.5 px-3.5">
                      <Badge
                        className={
                          c.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[10px]"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>

                    {/* 7. Created Date */}
                    <td className="py-3.5 px-3.5 text-muted-foreground font-mono text-[11px]">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }) : "N/A"}
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoginAsGuest(c)}
                          disabled={guestLoadingId === c.id}
                          title={`Login as Guest to ${c.name}`}
                          className="h-7 px-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer gap-1"
                        >
                          {guestLoadingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                          ) : (
                            <LogIn className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span className="hidden sm:inline">Guest Login</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(c)}
                          title="Inspect Client Details"
                          className="h-7 px-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer gap-1"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(c)}
                          className={`h-7 px-2.5 text-xs font-semibold cursor-pointer ${
                            c.status === "ACTIVE"
                              ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </Button>
                      </div>
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
      </>
      )}

      {/* Client Details Modal */}
      <SuperAdminClientDetailsModal
        clientId={selectedClientId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedClientId(null);
        }}
        onStatusChanged={() => loadData()}
      />
    </div>
  );
}
