"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function SuperAdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const [clientsData, partnersData] = await Promise.all([
        superAdminApi.getClients({
          partnerId: partnerFilter || undefined,
          status: statusFilter,
          search,
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
  }, [partnerFilter, statusFilter]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Multitenant Hierarchy
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Platform Client Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit and manage all end-client businesses onboarded across every White-Label partner.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3.5 rounded-xl border shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search client business name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Partner Filter */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium"
          >
            <option value="">All Partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

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
                  <th className="py-3 px-4">Client Business</th>
                  <th className="py-3 px-4">Parent White-Label Partner</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Subscribed Tier</th>
                  <th className="py-3 px-4">Users / Contacts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground text-xs">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">slug: {c.slug}</div>
                    </td>

                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {c.adminUser?.email || "N/A"}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.subscription ? (
                        <span className="font-medium text-xs text-foreground">
                          {c.subscription.planName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Standard</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {c.stats?.users || 0} users • {c.stats?.contacts || 0} contacts
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        className={
                          c.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(c)}
                        className={`h-7 px-2.5 text-xs font-semibold ${
                          c.status === "ACTIVE"
                            ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        }`}
                      >
                        {c.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
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
    </div>
  );
}
