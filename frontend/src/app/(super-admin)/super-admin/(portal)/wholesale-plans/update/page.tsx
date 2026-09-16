"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { ManageFeaturesModal, FeatureItem } from "@/super-admin/components/wholesale-plans/ManageFeaturesModal";
import {
  ArrowLeft,
  Layers,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
  Sparkles,
  Plus,
} from "lucide-react";

function UpdateWholesalePlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");

  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    setupFee: 0,
    perClientPrice: 0,
    maxClients: 50,
    featureAccess: [
      "whatsapp",
      "instagram",
      "rcs",
      "crm",
      "chatbots",
      "automations",
    ] as string[],
    status: "ACTIVE",
    currency: "INR",
    billingCycle: "monthly",
  });

  useEffect(() => {
    async function loadData() {
      if (!planId) {
        setError("Missing wholesale plan ID. Please select a plan from the list.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [res, featuresData] = await Promise.all([
          superAdminApi.getWholesalePlans({ limit: 100 }),
          superAdminApi.getFeatures().catch(() => []),
        ]);

        const featList = Array.isArray(featuresData) ? featuresData : [];
        setFeatures(featList);
        setLoadingFeatures(false);

        const plans = Array.isArray(res) ? res : res?.data || [];
        const plan = plans.find((p: any) => p.id === planId);

        if (!plan) {
          setError(`Wholesale plan with ID '${planId}' was not found.`);
          return;
        }

        setOriginalName(plan.name || "");
        setForm({
          name: plan.name || "",
          slug: plan.slug || "",
          description: plan.description || "",
          setupFee: Number(plan.setupFee) || 0,
          perClientPrice: Number(plan.perClientPrice) || 0,
          maxClients: Number(plan.maxClients) || 50,
          featureAccess: plan.featureAccess || [
            "whatsapp",
            "instagram",
            "rcs",
            "crm",
            "chatbots",
            "automations",
          ],
          status: plan.status || "ACTIVE",
          currency: plan.currency || "INR",
          billingCycle: plan.billingCycle || "monthly",
        });
      } catch (err: any) {
        setError(
          err.response?.data?.message || err.message || "Failed to load wholesale plan details."
        );
      } finally {
        setLoading(false);
        setLoadingFeatures(false);
      }
    }

    loadData();
  }, [planId]);

  const handleToggleAllFeatures = () => {
    if (form.featureAccess.length === features.length) {
      setForm((prev) => ({ ...prev, featureAccess: [] }));
    } else {
      setForm((prev) => ({
        ...prev,
        featureAccess: features.map((f) => f.code || f.id),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    setError(null);

    if (!form.name.trim()) {
      setError("Plan name is required.");
      return;
    }

    setSubmitting(true);

    try {
      await superAdminApi.updateWholesalePlan(planId, {
        ...form,
        setupFee: Number(form.setupFee) || 0,
        perClientPrice: Number(form.perClientPrice) || 0,
        maxClients: Number(form.maxClients) || 50,
      });

      router.push("/super-admin/wholesale-plans");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update wholesale plan. Please check inputs."
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <span>Loading wholesale plan details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto pb-12">
      {/* Header & Back Link */}
      <div className="space-y-3">
        <Link href="/super-admin/wholesale-plans">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Wholesale Plans</span>
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {originalName ? `Update Wholesale Plan: ${originalName}` : "Update Wholesale Plan"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Modify wholesale unit pricing, lifetime license fees, client capacity limits, and subsystem feature entitlements.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Plan Details & Identification */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3.5">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Plan Identification & Overview
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Update the tier display name, slug identifier, and partner-facing description
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Plan Name <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Agency Growth Wholesale"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Plan Slug
              </label>
              <Input
                placeholder="agency-growth-wholesale"
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                  })
                }
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Unique identifier used by system contracts and partner assignments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Plan Description
              </label>
              <Input
                placeholder="Summary of wholesale tier terms and ideal partner agency size"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Plan Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE (Available for assignment)</option>
                <option value="INACTIVE">INACTIVE (Hidden / Archived)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Wholesale Pricing & Client Capacity */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-500/20 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Wholesale Economics & Client Capacity
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Partner pays a one-time lifetime license fee. Appnix charges a recurring monthly commission per provisioned client.
                </p>
              </div>
            </div>

            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold w-fit">
              ONE-TIME LIFETIME LICENSE • RECURRING CLIENT COMMISSION
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Appnix Commission / Client / Mo (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={0}
                placeholder="0"
                value={form.perClientPrice}
                onChange={(e) => setForm({ ...form, perClientPrice: Number(e.target.value) })}
                className="h-10 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Recurring monthly fee paid to Appnix per active onboarded end-client.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                One-Time Lifetime License Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={0}
                placeholder="0"
                value={form.setupFee}
                onChange={(e) => setForm({ ...form, setupFee: Number(e.target.value) })}
                className="h-10 text-xs font-mono font-bold text-amber-700 dark:text-amber-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                One-time initial license payment for permanent platform access.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Max Clients Capacity <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={1}
                placeholder="50"
                value={form.maxClients}
                onChange={(e) => setForm({ ...form, maxClients: Number(e.target.value) })}
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Maximum quota of client businesses the partner is permitted to provision.
              </p>
            </div>
          </div>

          {/* Revenue Model Margin Note */}
          <div className="p-3.5 rounded-lg bg-background border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px]">
                <strong>Partner Margin:</strong> Agency partners bill their own end-clients independently and retain 100% of the difference above Appnix&apos;s contracted commission rate.
              </span>
            </div>
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] shrink-0 self-start sm:self-auto">
              Appnix Share: ₹{form.perClientPrice || 0}/cl/mo
            </Badge>
          </div>
        </div>

        {/* Section 3: Feature Entitlements Selection */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Included Subsystem Feature Entitlements
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Select modules and communication channels enabled for this wholesale package
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeaturesModalOpen(true)}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
              >
                <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Manage / Add Features</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleAllFeatures}
                disabled={features.length === 0}
                className="text-xs h-7 px-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {form.featureAccess.length === features.length && features.length > 0
                  ? "Deselect All"
                  : "Select All Features"}
              </Button>
            </div>
          </div>

          {loadingFeatures ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span>Loading features catalog from database...</span>
            </div>
          ) : features.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-2">
              <Layers className="h-7 w-7 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No features configured yet</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Add features to the database to enable module selection for wholesale plans.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFeaturesModalOpen(true)}
                className="h-8 text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                <Sparkles className="h-3 w-3" />
                <span>Add First Feature</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((f) => {
                const code = f.code || f.id;
                const isChecked = form.featureAccess.includes(code);
                return (
                  <label
                    key={code}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      isChecked
                        ? "bg-amber-500/10 border-amber-500/40 text-foreground font-semibold shadow-2xs"
                        : "bg-card text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({
                              ...form,
                              featureAccess: [...form.featureAccess, code],
                            });
                          } else {
                            setForm({
                              ...form,
                              featureAccess: form.featureAccess.filter((x) => x !== code),
                            });
                          }
                        }}
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                      />
                      <span className="truncate">{f.label}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono px-1 py-0 shrink-0 text-muted-foreground"
                    >
                      {code}
                    </Badge>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/super-admin/wholesale-plans">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-4 text-xs cursor-pointer"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-10 px-6 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2 shadow-md shadow-amber-600/15 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating Plan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Update Wholesale Plan</span>
              </>
            )}
          </Button>
        </div>
      </form>

      <ManageFeaturesModal
        isOpen={featuresModalOpen}
        onClose={() => setFeaturesModalOpen(false)}
        onFeaturesUpdated={(updated) => setFeatures(updated)}
      />
    </div>
  );
}

export default function UpdateWholesalePlanPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          <span>Loading wholesale plan update page...</span>
        </div>
      }
    >
      <UpdateWholesalePlanForm />
    </Suspense>
  );
}
