"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  Layers,
  Plus,
  RefreshCw,
  Building2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";

export default function SuperAdminWholesalePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    setupFee: 0,
    perClientPrice: 0,
    maxClients: 50,
    featureAccess: ["whatsapp", "instagram", "rcs", "crm", "chatbots"],
    status: "ACTIVE",
  });

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
    { id: "priority_support", label: "Priority Enterprise Support" },
  ];

  const loadPlans = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getWholesalePlans({ page: targetPage, limit: targetLimit });
      if (res && "data" in res && Array.isArray(res.data)) {
        setPlans(res.data);
        setPage(res.page || targetPage);
        setLimit(res.limit || targetLimit);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setHasNext(Boolean(res.hasNext));
        setHasPrevious(Boolean(res.hasPrevious));
      } else {
        setPlans(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load wholesale plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadPlans(newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadPlans(1, newLimit);
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      setupFee: 0,
      perClientPrice: 0,
      maxClients: 50,
      featureAccess: ["whatsapp", "instagram", "rcs", "crm", "chatbots", "automations"],
      status: "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      setupFee: plan.setupFee,
      perClientPrice: plan.perClientPrice,
      maxClients: plan.maxClients || 50,
      featureAccess: plan.featureAccess || [],
      status: plan.status || "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingPlan) {
        await superAdminApi.updateWholesalePlan(editingPlan.id, {
          ...form,
          setupFee: Number(form.setupFee),
          perClientPrice: Number(form.perClientPrice),
          maxClients: Number(form.maxClients),
        });
      } else {
        await superAdminApi.createWholesalePlan({
          ...form,
          setupFee: Number(form.setupFee),
          perClientPrice: Number(form.perClientPrice),
          maxClients: Number(form.maxClients),
        });
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plan: any) => {
    if (!confirm(`Are you sure you want to remove or archive wholesale plan '${plan.name}'?`)) return;

    try {
      await superAdminApi.deleteWholesalePlan(plan.id);
      loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
        
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Standard Wholesale / White-Label Plans
          </h1>
        
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPlans()}
            disabled={loading}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Wholesale Plan</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          <span>Loading wholesale packages...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-bold text-sm text-foreground">No Wholesale Plans Configured</p>
          <p className="max-w-md mx-auto">
            Click &quot;Create Wholesale Plan&quot; to define standard pricing tiers for your White-Label agency partners.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-amber-500/50 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-foreground">{p.name}</h3>
                    <span className="font-mono text-[11px] text-muted-foreground">slug: {p.slug}</span>
                  </div>
                  <Badge
                    className={
                      p.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.description || "Standard wholesale distribution tier for marketing and SaaS reseller partners."}
                </p>

                {/* Pricing Box */}
                <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 font-mono">
                  <div className="flex items-baseline justify-between border-b pb-2">
                    <span className="text-[11px] text-muted-foreground uppercase font-sans font-semibold">
                      Commission / Client
                    </span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                      ₹{p.perClientPrice}
                      <span className="text-xs font-normal text-muted-foreground">/cl/mo</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <span className="text-muted-foreground font-sans">Lifetime License:</span>
                    <span className="font-bold text-foreground">₹{p.setupFee.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-sans">Client Capacity:</span>
                    <span className="font-bold text-foreground">{p.maxClients} End-Clients</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-sans">Assigned Partners:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{p.partnerCount} Active</span>
                  </div>

                  <div className="pt-1 border-t text-[10px] text-muted-foreground font-sans flex items-center justify-between">
                    <span>License Type:</span>
                    <Badge variant="outline" className="text-[9px] font-bold text-blue-600">
                      LIFETIME (NO EXPIRY)
                    </Badge>
                  </div>
                </div>

                {/* Feature Entitlements */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Feature Entitlements
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.featureAccess?.map((feat: string) => (
                      <Badge key={feat} variant="outline" className="text-[10px] font-mono capitalize">
                        {feat.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(p)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Plan</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(p)}
                  className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Archive or delete plan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-card border rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  {editingPlan ? `Edit Wholesale Plan: ${editingPlan.name}` : "Create Standard Wholesale Plan"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define base wholesale unit cost, one-time fees, and feature limits.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Plan Name *</label>
                  <Input
                    required
                    placeholder="e.g. Agency Growth Wholesale"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Slug (Optional)</label>
                  <Input
                    placeholder="e.g. agency-growth-wholesale"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Plan Description</label>
                <Input
                  placeholder="Summary of wholesale tier terms and ideal agency size"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Appnix Commission / Client / Mo (₹) *
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={form.perClientPrice}
                    onChange={(e) => setForm({ ...form, perClientPrice: Number(e.target.value) })}
                    className="h-8.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    One-Time Lifetime License Fee (₹) *
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={form.setupFee}
                    onChange={(e) => setForm({ ...form, setupFee: Number(e.target.value) })}
                    className="h-8.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Max Clients Capacity *
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={form.maxClients}
                    onChange={(e) => setForm({ ...form, maxClients: Number(e.target.value) })}
                    className="h-8.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Feature Entitlements Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Included Subsystem Feature Entitlements
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableFeatures.map((f) => {
                    const isChecked = form.featureAccess.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "bg-amber-500/10 border-amber-500/30 text-foreground font-semibold"
                            : "bg-card text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, featureAccess: [...form.featureAccess, f.id] });
                            } else {
                              setForm({
                                ...form,
                                featureAccess: form.featureAccess.filter((x) => x !== f.id),
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
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {submitting ? "Saving..." : editingPlan ? "Update Plan" : "Create Wholesale Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
