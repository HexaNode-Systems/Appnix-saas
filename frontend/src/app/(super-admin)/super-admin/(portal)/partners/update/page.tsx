"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { PartnerConfirmModal } from "@/super-admin/components/partners/PartnerConfirmModal";
import {
  ArrowLeft,
  Building2,
  Users,
  Shield,
  KeyRound,
  DollarSign,
  Globe,
  Palette,
  Layers,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

function UpdatePartnerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("id") || "";

  const [wholesalePlans, setWholesalePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminName: "",
    adminPassword: "",
    adminPhone: "",
    wholesalePlanId: "",
    setupFee: 49999,
    setupFeePaid: true,
    perClientRate: 499,
    clientLimit: 50,
    customDomain: "",
    primaryColor: "#0f172a",
    logoUrl: "",
    featureAccess: [
      "whatsapp",
      "instagram",
      "rcs",
      "crm",
      "chatbots",
      "automations",
    ] as string[],
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
  ];

  useEffect(() => {
    async function loadData() {
      if (!partnerId) {
        setError("Missing partner ID. Please select a partner from the partners list.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [plansRes, partner] = await Promise.all([
          superAdminApi.getWholesalePlans({ limit: 100 }),
          superAdminApi.getPartnerById(partnerId),
        ]);

        const plans = Array.isArray(plansRes) ? plansRes : plansRes?.data || [];
        setWholesalePlans(plans);

        if (partner) {
          setForm({
            name: partner.name || "",
            slug: partner.slug || "",
            adminEmail: partner.adminUsers?.[0]?.email || "",
            adminName: partner.adminUsers?.[0]?.name || "",
            adminPassword: "",
            adminPhone: partner.adminUsers?.[0]?.phone || "",
            wholesalePlanId: partner.partnerConfig?.wholesalePlanId || "",
            setupFee: Number(partner.partnerConfig?.setupFee ?? partner.metrics?.lifetimeFee ?? 0),
            setupFeePaid: Boolean(partner.partnerConfig?.setupFeePaid ?? partner.metrics?.lifetimeFeePaid ?? true),
            perClientRate: Number(partner.partnerConfig?.perClientRate ?? partner.metrics?.commissionPerClient ?? 499),
            clientLimit: Number(partner.metrics?.maxClients ?? partner.maxEndClients ?? 50),
            customDomain: partner.customDomain || "",
            primaryColor: partner.branding?.primaryColor || partner.primaryColor || "#0f172a",
            logoUrl: partner.branding?.logoUrl || partner.logoUrl || "",
            featureAccess: partner.partnerConfig?.featureAccess || partner.featureAccess || [
              "whatsapp",
              "instagram",
              "rcs",
              "crm",
              "chatbots",
              "automations",
            ],
          });
        }
      } catch (err: any) {
        console.error("Failed to load partner:", err);
        setError(err.response?.data?.message || err.message || "Failed to load partner details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [partnerId]);

  const handlePlanSelect = (planId: string) => {
    const chosen = wholesalePlans.find((p) => p.id === planId);
    if (chosen) {
      setForm((prev) => ({
        ...prev,
        wholesalePlanId: chosen.id,
        perClientRate: chosen.perClientPrice,
        setupFee: chosen.setupFee,
        clientLimit: chosen.maxClients || 50,
        featureAccess: chosen.featureAccess || prev.featureAccess,
      }));
    } else {
      setForm((prev) => ({ ...prev, wholesalePlanId: planId }));
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!partnerId) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: form.name,
        setupFee: Number(form.setupFee),
        lifetimeFee: Number(form.setupFee),
        setupFeePaid: Boolean(form.setupFeePaid),
        perClientRate: Number(form.perClientRate),
        commissionPerClient: Number(form.perClientRate),
        clientLimit: Number(form.clientLimit),
        customDomain: form.customDomain,
        primaryColor: form.primaryColor,
        logoUrl: form.logoUrl,
        featureAccess: form.featureAccess,
        wholesalePlanId: form.wholesalePlanId || undefined,
      };

      if (form.adminPassword && form.adminPassword.trim().length >= 6) {
        payload.adminPassword = form.adminPassword.trim();
      }

      await superAdminApi.updatePartner(partnerId, payload);

      setIsConfirmOpen(false);
      // Redirect back to partners list on success
      router.push("/super-admin/partners");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update White-Label Partner. Please verify inputs."
      );
      setIsConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <span>Loading partner architecture & contract...</span>
      </div>
    );
  }

  if (!partnerId) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-12">
        <Link href="/super-admin/partners">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Partners</span>
          </Button>
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-bold text-sm mb-1">No Partner Selected</p>
          <p>Please select a White-Label Partner from the partners list to edit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Back Link */}
      <div className="space-y-3">
        <Link href="/super-admin/partners">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Partners</span>
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Wholesale Management
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Update Partner: {form.name || "White-Label Partner"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modify reseller tenant settings, wholesale contract economics, quotas, and feature entitlements.
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
      <form onSubmit={handlePreSubmit} className="space-y-6">
        {/* Section 1: Agency & Workspace Details */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3.5">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Agency & Tenant Identity
              </h3>
              <p className="text-[11px] text-muted-foreground">
                The white-label partner organization and tenant URL identifier
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Partner Agency Name <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Apex Digital Marketing Ltd"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Workspace Slug
              </label>
              <Input
                disabled
                value={form.slug}
                className="h-10 text-xs font-mono bg-muted/50 cursor-not-allowed opacity-80"
              />
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Workspace slug identifier cannot be modified once provisioned.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Reseller Admin Credentials */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3.5">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Reseller Admin Account
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Primary credentials used by the partner to log into the Admin portal (/admin/login)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Admin Email
              </label>
              <Input
                type="email"
                disabled
                value={form.adminEmail}
                className="h-10 text-xs font-mono bg-muted/50 cursor-not-allowed opacity-80"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Primary admin identity email
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Administrator Full Name
              </label>
              <Input
                placeholder="Alex Apex"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Update Password (Optional)
              </label>
              <Input
                type="password"
                minLength={6}
                placeholder="Leave blank to keep existing"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave blank to keep existing password unchanged.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Contact Phone / WhatsApp
              </label>
              <Input
                placeholder="+91 98765 43210"
                value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                className="h-10 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 w-12 rounded-lg border p-1 cursor-pointer bg-background"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-10 text-xs font-mono flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Wholesale Pricing & Contract Economics */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-500/20 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  White-Label Economics & Lifetime License
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Partner pays a one-time lifetime license fee (permanent access, no expiry or annual renewal). Appnix earns a recurring commission per active client.
                </p>
              </div>
            </div>

            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold w-fit">
              ONE-TIME LIFETIME LICENSE • PARTNER KEEPS 100% MARGIN
            </Badge>
          </div>

 
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Appnix Commission Per Active Client (₹/cl/mo) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={0}
                value={form.perClientRate}
                onChange={(e) => setForm({ ...form, perClientRate: Number(e.target.value) })}
                className="h-10 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Recurring monthly commission earned by Appnix per active client
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Max End-Client Quota Limit <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={1}
                value={form.clientLimit}
                onChange={(e) => setForm({ ...form, clientLimit: Number(e.target.value) })}
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Maximum number of client businesses partner may onboard
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Custom White-Label Domain (Optional)
              </label>
              <Input
                placeholder="app.apexdigital.com"
                value={form.customDomain}
                onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Vanity hostname for partner&apos;s clients (CNAME to cname.appnix.co.in)
              </p>
            </div>
          </div>

          {/* Revenue Model Margin Note */}
          <div className="p-3 rounded-lg bg-background border text-xs text-muted-foreground flex items-center justify-between">
            <span className="text-[11px]">
              <strong>Partner Retail Margin:</strong> Partner can set any retail price for their clients (e.g. ₹1,999/mo) and keeps 100% of their margin above Appnix commission (₹{form.perClientRate}/cl/mo).
            </span>
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] shrink-0 ml-2">
              Margin: ₹{Math.max(0, 1999 - Number(form.perClientRate))}/cl/mo
            </Badge>
          </div>
        </div>

        {/* Section 4: Allowed Subsystems & Feature Entitlements */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3.5">
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Allowed Feature Subsystems
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Select modules and channels the partner and their end-clients are permitted to access
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableFeatures.map((f) => {
              const isChecked = form.featureAccess.includes(f.id);
              return (
                <label
                  key={f.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? "bg-amber-500/10 border-amber-500/40 text-foreground font-semibold shadow-2xs"
                      : "bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({
                          ...form,
                          featureAccess: [...form.featureAccess, f.id],
                        });
                      } else {
                        setForm({
                          ...form,
                          featureAccess: form.featureAccess.filter((x) => x !== f.id),
                        });
                      }
                    }}
                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="truncate">{f.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/super-admin/partners">
            <Button type="button" variant="outline" size="sm" className="h-10 px-4 text-xs cursor-pointer">
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
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Update Partner & Contract</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog before updating */}
      <PartnerConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmUpdate}
        submitting={submitting}
        mode="update"
        data={{
          name: form.name,
          slug: form.slug,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPhone: form.adminPhone,
          primaryColor: form.primaryColor,
          wholesalePlanName: wholesalePlans.find((p) => p.id === form.wholesalePlanId)?.name,
          perClientRate: Number(form.perClientRate),
          setupFee: Number(form.setupFee),
          clientLimit: Number(form.clientLimit),
          customDomain: form.customDomain,
          featureAccess: form.featureAccess,
        }}
      />
    </div>
  );
}

export default function UpdatePartnerPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          <span>Loading partner update view...</span>
        </div>
      }
    >
      <UpdatePartnerForm />
    </Suspense>
  );
}
