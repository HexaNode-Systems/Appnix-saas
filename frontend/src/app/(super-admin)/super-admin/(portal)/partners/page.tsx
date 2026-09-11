"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { PartnerConfirmModal } from "@/super-admin/components/partners/PartnerConfirmModal";
import { PartnerCommissionHistoryModal } from "@/super-admin/components/partners/PartnerCommissionHistoryModal";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  Building2,
  Users,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  Settings2,
  Pencil,
  CheckCircle2,
  Clock,
  XCircle,
  Globe,
  DollarSign,
  TrendingUp,
  KeyRound,
  Loader2,
  History,
  X,
} from "lucide-react";

const availableFeatures = [
  { id: "whatsapp", label: "WhatsApp Cloud API" },
  { id: "instagram", label: "Instagram Direct & Automation" },
  { id: "rcs", label: "RCS Business Messaging" },
  { id: "facebook", label: "Facebook Messenger" },
  { id: "crm", label: "Omnichannel CRM Contacts" },
  { id: "chatbots", label: "Visual Botflow Builder" },
  { id: "automations", label: "Workflow Automations & Webhooks" },
  { id: "custom_domains", label: "White-Label Custom Domains" },
  { id: "voice_ai_agent", label: "Voice AI Agent" },
];

export default function SuperAdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Commission History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyPartner, setHistoryPartner] = useState<any>(null);

  const openHistoryModal = (p: any) => {
    setHistoryPartner(p);
    setIsHistoryOpen(true);
  };

  const handleTogglePaymentStatus = async (p: any) => {
    const currentPaid = p.lifetimeFeePaid ?? (p.paymentStatus === "PAID");
    const newPaid = !currentPaid;
    const confirmMsg = newPaid
      ? `Mark ${p.name}'s Lifetime White-Label Fee as PAID?`
      : `Mark ${p.name}'s Lifetime White-Label Fee as PENDING?`;
    if (!confirm(confirmMsg)) return;

    try {
      await superAdminApi.updatePartner(p.id, { setupFeePaid: newPaid });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update payment status");
    }
  };

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    perClientRate: 0,
    setupFee: 0,
    clientLimit: 50,
    primaryColor: "#0f172a",
    logoUrl: "",
    customDomain: "",
    featureAccess: [] as string[],
    trialEnabled: false,
    trialMaxUsers: 5,
  });

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getPartners({
        search,
        status: statusFilter,
        page: targetPage,
        limit: targetLimit,
      });

      if (res && "data" in res && Array.isArray(res.data)) {
        setPartners(res.data);
        setPage(res.page || targetPage);
        setLimit(res.limit || targetLimit);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setHasNext(Boolean(res.hasNext));
        setHasPrevious(Boolean(res.hasPrevious));
        if (res.summary) {
          setSummary(res.summary);
        }
      } else {
        setPartners(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData(1, limit);
  }, [statusFilter]);

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

  const openEditModal = (p: any) => {
    setSelectedPartner(p);
    setEditForm({
      name: p.name,
      perClientRate: p.pricing?.perClientRate || p.commissionPerClient || 0,
      setupFee: p.pricing?.setupFee || p.lifetimeFee || 0,
      clientLimit: p.maxClients || 50,
      primaryColor: p.branding?.primaryColor || "#0f172a",
      logoUrl: p.branding?.logoUrl || "",
      customDomain: p.customDomain || "",
      featureAccess: p.featureAccess || [],
      trialEnabled: Boolean(p.trialEnabled ?? p.partnerConfig?.trialEnabled ?? false),
      trialMaxUsers: Number(p.trialMaxUsers ?? p.partnerConfig?.trialMaxUsers ?? 5),
    });
    setIsEditOpen(true);
  };

  const handlePreEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setError(null);
    setIsConfirmEditOpen(true);
  };

  const handleConfirmEditPartner = async () => {
    if (!selectedPartner) return;
    setSubmitting(true);
    setError(null);

    try {
      await superAdminApi.updatePartner(selectedPartner.id, {
        ...editForm,
        trialEnabled: Boolean(editForm.trialEnabled),
        trialDays: 7,
        trialMaxUsers: Number(editForm.trialMaxUsers || 5),
        perClientRate: Number(editForm.perClientRate),
        setupFee: Number(editForm.setupFee),
        clientLimit: Number(editForm.clientLimit),
      });
      setIsConfirmEditOpen(false);
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update partner");
      setIsConfirmEditOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (partner: any) => {
    const newStatus = partner.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      newStatus === "SUSPENDED"
        ? `Are you sure you want to SUSPEND ${partner.name}? Their admins and clients will be restricted.`
        : `Reactivate partner ${partner.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await superAdminApi.updatePartnerStatus(partner.id, newStatus, `Admin manual toggle to ${newStatus}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Action failed");
    }
  };

  const handleImpersonate = async (partnerId: string, partnerName: string) => {
    try {
      const res = await superAdminApi.impersonatePartner(partnerId);
      const token = res.impersonationToken;
      if (token) {
        // Set short lived impersonation token and open admin dashboard in new tab
        sessionStorage.setItem("appnix_impersonation_token", token);
        alert(`Impersonation session initialized for ${partnerName}. Valid for 15 minutes.`);
        window.open(`/admin/dashboard?impersonate=${partnerId}`, "_blank");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to start impersonation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Wholesale Multitenancy
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            White-Label Admins & Reseller Partners
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Provision, manage, and monitor White-Label SaaS partners, wholesale pricing contracts, and client quotas.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <Link href="/super-admin/partners/create">
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create White-Label Partner</span>
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

      {/* 4 Summary Economics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Lifetime White-Label Fees */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Lifetime License Fees
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-foreground font-mono">
              {loading && !summary
                ? "..."
                : `₹${Number(summary?.totalLifetimeFees || 0).toLocaleString("en-IN")}`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              One-Time License • Permanent / No Expiry
            </p>
          </div>
        </div>

        {/* Metric 2: Active End-Clients */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active End-Clients
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-foreground font-mono">
              {loading && !summary ? "..." : summary?.totalActiveClients ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Onboarded across all White-Label partners
            </p>
          </div>
        </div>

        {/* Metric 3: Recurring Monthly Commission */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Commission MRR
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {loading && !summary
                ? "..."
                : `₹${Number(summary?.totalMonthlyCommission || 0).toLocaleString("en-IN")}`}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Appnix recurring share per active client
            </p>
          </div>
        </div>

        {/* Metric 4: Retained Partner Margins */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Partner Retained Margin
            </span>
            <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {loading && !summary
                ? "..."
                : `₹${Number(summary?.totalPartnerMargin || 0).toLocaleString("en-IN")}`}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Kept 100% by White-Label partners
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3.5 rounded-xl border shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search partner name, slug, domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
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

      {/* Partners List Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading partners and wholesale contracts...</span>
          </div>
        ) : partners.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-sm text-foreground">No partners found</p>
            <p className="max-w-sm text-muted-foreground">
              No White-Label Resellers match your search or filter. Create one to get started.
            </p>
            <Link href="/super-admin/partners/create">
              <Button
                size="sm"
                className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Provision Partner Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-3.5">Partner</th>
                  <th className="py-3 px-3.5">Lifetime White-Label Fee</th>
                  <th className="py-3 px-3.5">Payment Status</th>
                  <th className="py-3 px-3.5">Total/Active Clients</th>
                  <th className="py-3 px-3.5">Commission / Client</th>
                  <th className="py-3 px-3.5">Monthly Commission</th>
                  <th className="py-3 px-3.5">Total Commission</th>
                  <th className="py-3 px-3.5">Partner Margin</th>
                  <th className="py-3 px-3.5">7-Day Free Trial</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {partners.map((p) => {
                  const lifetimeFee = p.lifetimeFee ?? p.pricing?.setupFee ?? 0;
                  const isPaid = p.lifetimeFeePaid !== undefined
                    ? Boolean(p.lifetimeFeePaid)
                    : p.paymentStatus !== undefined
                    ? p.paymentStatus === "PAID"
                    : (p.pricing?.setupFeePaid ?? true);
                  const paymentStatus = isPaid ? "PAID" : "PENDING";
                  const totalClients = p.totalClients ?? p.clientCount ?? 0;
                  const activeClients = p.activeClients ?? p.clientCount ?? 0;
                  const maxClients = p.maxClients || p.pricing?.clientLimit || 50;
                  const commissionPerClient = p.commissionPerClient ?? p.pricing?.perClientRate ?? 0;
                  const monthlyCommission = p.monthlyCommissionRevenue ?? (activeClients * commissionPerClient);
                  const totalCommission = p.totalCommissionRevenue ?? monthlyCommission;
                  const partnerMargin = p.partnerMargin ?? 0;
                  const marginPct = p.partnerMarginPercentage !== undefined && p.partnerMarginPercentage !== null
                    ? p.partnerMarginPercentage
                    : partnerMargin > 0 && monthlyCommission > 0
                    ? Math.round((partnerMargin / (partnerMargin + monthlyCommission)) * 100)
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      {/* 1. Partner Agency */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: p.branding?.primaryColor || "#0f172a" }}
                          >
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/super-admin/partners/${p.id}`}
                              className="font-bold text-foreground hover:text-amber-600 transition-colors text-xs flex items-center gap-1"
                            >
                              <span>{p.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </Link>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {p.adminUser?.email || p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Lifetime White-Label Fee */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="text-foreground font-bold text-xs">
                          ₹{Number(lifetimeFee).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          Lifetime • No Expiry
                        </div>
                      </td>

                      {/* 3. Payment Status */}
                      <td className="py-3.5 px-3.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(p)}
                          title="Click to toggle Paid / Pending status"
                          className="cursor-pointer group"
                        >
                          <Badge
                            className={
                              isPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold group-hover:opacity-80"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold group-hover:opacity-80"
                            }
                          >
                            {paymentStatus}
                          </Badge>
                        </button>
                      </td>

                      {/* 4. Total / Active Clients */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                          <span>{totalClients} / {activeClients}</span>
                          <span className="text-[10px] text-muted-foreground font-sans font-normal">
                            (max {maxClients})
                          </span>
                        </div>
                        <div className="w-20 bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((totalClients / (maxClients || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* 5. Commission Per Client */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                          ₹{commissionPerClient}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          /client/mo
                        </div>
                      </td>

                      {/* 6. Monthly Commission Revenue */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="text-foreground font-bold text-xs">
                          ₹{Number(monthlyCommission).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          Recurring / mo
                        </div>
                      </td>

                      {/* 7. Total Commission Revenue */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="text-foreground font-bold text-xs">
                          ₹{Number(totalCommission).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          Cumulative
                        </div>
                      </td>

                      {/* 8. Partner Margin */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="text-amber-700 dark:text-amber-300 font-bold text-xs">
                          ₹{Number(partnerMargin).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {marginPct !== null ? `${marginPct}% retained` : "Margin retained"}
                        </div>
                      </td>

                      {/* 9. 7-Day Free Trial Status */}
                      <td className="py-3.5 px-3.5">
                        {p.trialEnabled ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                              ENABLED (7d)
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              Max {p.trialMaxUsers || 5} seats
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Disabled
                          </Badge>
                        )}
                      </td>

                      {/* 10. Status */}
                      <td className="py-3.5 px-3.5">
                        <Badge
                          className={
                            p.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[10px]"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistoryModal(p)}
                            className="h-7 px-2 text-xs gap-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="View monthly recurring commission history ledger"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">History</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImpersonate(p.id, p.name)}
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-amber-600"
                            title="Inspect workspace via delegated token"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Inspect</span>
                          </Button>

                          <Link href={`/super-admin/partners/update?id=${p.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-amber-600"
                              title="Edit Partner Settings & Pricing"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Edit</span>
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(p)}
                            className={`h-7 px-2 text-xs font-semibold ${
                              p.status === "ACTIVE"
                                ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                          >
                            {p.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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



      {/* EDIT PARTNER MODAL */}
      {isEditOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-card border rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Edit Partner: {selectedPartner.name}</h3>
                <p className="text-xs text-muted-foreground">Adjust wholesale rates, client quotas, or branding.</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePreEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Company / Partner Name</label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Wholesale Rate / Client (₹)
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={editForm.perClientRate}
                    onChange={(e) => setEditForm({ ...editForm, perClientRate: Number(e.target.value) })}
                    className="h-9 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Client Limit</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={editForm.clientLimit}
                    onChange={(e) => setEditForm({ ...editForm, clientLimit: Number(e.target.value) })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">One-Time Setup Fee (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.setupFee}
                    onChange={(e) => setEditForm({ ...editForm, setupFee: Number(e.target.value) })}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Custom Domain</label>
                  <Input
                    placeholder="portal.client.com"
                    value={editForm.customDomain}
                    onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editForm.primaryColor}
                    onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                    className="h-9 w-12 rounded-lg border p-1 cursor-pointer bg-background"
                  />
                  <Input
                    value={editForm.primaryColor}
                    onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                    className="h-9 text-xs font-mono flex-1"
                  />
                </div>
              </div>

              {/* 7-Day Free Trial Configuration */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    7-Day Free Trial Entitlement
                  </span>
                  <Badge className={editForm.trialEnabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                    {editForm.trialEnabled ? "ENABLED (7d)" : "DISABLED"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Free Trial Access
                    </label>
                    <select
                      value={editForm.trialEnabled ? "yes" : "no"}
                      onChange={(e) => setEditForm({ ...editForm, trialEnabled: e.target.value === "yes" })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs font-semibold text-foreground cursor-pointer"
                    >
                      <option value="no">Disabled</option>
                      <option value="yes">Enabled (7 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Max Trial Seats / Users
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editForm.trialMaxUsers}
                      onChange={(e) => setEditForm({ ...editForm, trialMaxUsers: Math.max(1, parseInt(e.target.value) || 1) })}
                      disabled={!editForm.trialEnabled}
                      className="h-8 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Subsystems Access */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Allowed Feature Subsystem Access
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableFeatures.map((f) => {
                    const isChecked = editForm.featureAccess?.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "bg-amber-500/10 border-amber-500/30 text-foreground font-semibold"
                            : "bg-card text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({
                                ...editForm,
                                featureAccess: [...(editForm.featureAccess || []), f.id],
                              });
                            } else {
                              setEditForm({
                                ...editForm,
                                featureAccess: (editForm.featureAccess || []).filter((x) => x !== f.id),
                              });
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="truncate">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before saving partner updates */}
      {selectedPartner && (
        <PartnerConfirmModal
          isOpen={isConfirmEditOpen}
          onClose={() => setIsConfirmEditOpen(false)}
          onConfirm={handleConfirmEditPartner}
          submitting={submitting}
          mode="update"
          data={{
            name: editForm.name,
            slug: selectedPartner.slug,
            adminName: selectedPartner.adminUser?.name || "Reseller Administrator",
            adminEmail: selectedPartner.adminUser?.email || "N/A",
            adminPhone: selectedPartner.adminUser?.phone || "None",
            primaryColor: editForm.primaryColor || selectedPartner.branding?.primaryColor,
            wholesalePlanName: selectedPartner.pricing?.wholesalePlan?.name || "Custom Negotiated",
            perClientRate: Number(editForm.perClientRate),
            setupFee: Number(editForm.setupFee),
            clientLimit: Number(editForm.clientLimit),
            customDomain: editForm.customDomain,
            featureAccess: editForm.featureAccess || [],
          }}
        />
      )}

      {/* Partner Commission History & Lifetime License Modal */}
      <PartnerCommissionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        partner={historyPartner}
      />
    </div>
  );
}
