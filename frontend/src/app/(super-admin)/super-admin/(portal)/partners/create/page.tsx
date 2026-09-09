"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { PartnerConfirmModal } from "@/super-admin/components/partners/PartnerConfirmModal";
import { PartnerOtpVerificationModal } from "@/super-admin/components/partners/PartnerOtpVerificationModal";
import { sendFirebasePhoneOtp } from "@/lib/firebasePhoneAuth";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  DollarSign,
  Layers,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

const PREDEFINED_SLUGS = [
  { value: "partner", label: "partner (Default)" },
  { value: "agency", label: "agency" },
  { value: "reseller", label: "reseller" },
  { value: "hub", label: "hub" },
  { value: "portal", label: "portal" },
  { value: "custom", label: "Custom Slug..." },
];

export default function CreatePartnerPage() {
  const router = useRouter();
  const [wholesalePlans, setWholesalePlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal visibility states
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Verified Firebase token saved after OTP verification
  const [verifiedFirebaseToken, setVerifiedFirebaseToken] = useState<string | null>(null);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Slug selector state (predefined vs custom)
  const [slugOption, setSlugOption] = useState<string>("partner");
  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
  }>({
    checking: false,
    available: null,
    message: null,
  });

  // Form State
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminEmail: "",
    adminName: "",
    adminPassword: "",
    adminPhone: "",
    wholesalePlanId: "",
    setupFee: 0,
    setupFeePaid: true,
    perClientRate: 0,
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
    ],
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
    async function fetchPlans() {
      try {
        const plansRes = await superAdminApi.getWholesalePlans({ limit: 100 });
        const plans = Array.isArray(plansRes) ? plansRes : plansRes?.data || [];
        setWholesalePlans(plans);
        if (plans.length > 0 && !form.wholesalePlanId) {
          setForm((prev) => ({
            ...prev,
            wholesalePlanId: plans[0].id,
            perClientRate: Number(plans[0].perClientPrice ?? 0),
            setupFee: Number(plans[0].setupFee ?? 0),
            clientLimit: Number(plans[0].maxClients ?? 50),
            featureAccess: plans[0].featureAccess || prev.featureAccess,
          }));
        }
      } catch (err: any) {
        console.error("Failed to load wholesale plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, []);

  // Live slug uniqueness & format check (debounced)
  useEffect(() => {
    const raw = (form.slug || "").toLowerCase().trim();
    if (!raw) {
      setSlugStatus({ checking: false, available: null, message: null });
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
      setSlugStatus({
        checking: false,
        available: false,
        message: "Slug must contain only lowercase letters, numbers, and hyphens.",
      });
      return;
    }

    setSlugStatus({ checking: true, available: null, message: null });
    const timer = setTimeout(async () => {
      try {
        const res = await superAdminApi.checkPartnerSlug(raw);
        if (res.available) {
          setSlugStatus({
            checking: false,
            available: true,
            message: `✓ Slug "${res.slug}" is available`,
          });
        } else {
          setSlugStatus({
            checking: false,
            available: false,
            message: res.reason || `✗ Slug "${raw}" is already in use`,
          });
        }
      } catch (err) {
        setSlugStatus({ checking: false, available: null, message: null });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.slug]);

  const handleSlugOptionChange = (option: string) => {
    setSlugOption(option);
    if (option !== "custom") {
      setForm((prev) => ({ ...prev, slug: option }));
    }
  };

  const handleSlugInputChange = (rawVal: string) => {
    const clean = rawVal
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({ ...prev, slug: rawVal.toLowerCase() }));

    const matching = PREDEFINED_SLUGS.find(
      (p) => p.value === clean && p.value !== "custom"
    );
    if (matching) {
      setSlugOption(matching.value);
    } else {
      setSlugOption("custom");
    }
  };

  const handlePlanSelect = (planId: string) => {
    const chosen = wholesalePlans.find((p) => p.id === planId);
    if (chosen) {
      setForm((prev) => ({
        ...prev,
        wholesalePlanId: chosen.id,
        perClientRate: chosen.perClientPrice,
        setupFee: chosen.setupFee || prev.setupFee,
        clientLimit: chosen.maxClients || 50,
        featureAccess: chosen.featureAccess || prev.featureAccess,
      }));
    } else {
      setForm((prev) => ({ ...prev, wholesalePlanId: planId }));
    }
  };

  /**
   * Step 1: Form submission initiates Firebase Phone OTP
   */
  const handleInitiateCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!form.name.trim()) {
      setError("Partner agency name is required.");
      return;
    }
    if (!form.adminEmail.trim()) {
      setError("Administrator email is required.");
      return;
    }
    if (!form.adminName.trim()) {
      setError("Administrator full name is required.");
      return;
    }
    if (!form.adminPassword || form.adminPassword.trim().length < 6) {
      setError("Temporary password must be at least 6 characters.");
      return;
    }
    if (!form.adminPhone || !form.adminPhone.trim()) {
      setError("Contact Phone / WhatsApp is required for OTP verification.");
      return;
    }

    const cleanSlug = (form.slug || "partner")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setError("Invalid workspace slug format. Use lowercase letters, numbers, and hyphens.");
      return;
    }

    if (slugStatus.available === false) {
      setError(slugStatus.message || "The chosen workspace slug is already taken.");
      return;
    }

    // Trigger Firebase Phone OTP
    setSendingOtp(true);
    try {
      await sendFirebasePhoneOtp(form.adminPhone.trim());
      setIsOtpOpen(true);
    } catch (otpErr: any) {
      setError(otpErr.message || "Failed to send Firebase Phone OTP. Please verify phone number.");
    } finally {
      setSendingOtp(false);
    }
  };

  /**
   * Step 2: OTP successfully verified by Firebase
   */
  const handleOtpVerified = (firebaseIdToken: string) => {
    setVerifiedFirebaseToken(firebaseIdToken);
    setIsOtpOpen(false);
    // Proceed to Step 3: Small confirmation dialog
    setIsConfirmOpen(true);
  };

  /**
   * Step 3: Final confirmation dialog creates the partner
   */
  const handleFinalConfirmCreate = async () => {
    if (!verifiedFirebaseToken) {
      setError("Phone OTP must be verified before partner creation.");
      setIsConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleanSlug = (form.slug || "partner")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      await superAdminApi.createPartner({
        ...form,
        slug: cleanSlug,
        setupFee: Number(form.setupFee),
        lifetimeFee: Number(form.setupFee),
        setupFeePaid: Boolean(form.setupFeePaid),
        perClientRate: Number(form.perClientRate),
        commissionPerClient: Number(form.perClientRate),
        clientLimit: Number(form.clientLimit),
        firebaseIdToken: verifiedFirebaseToken,
      });

      setIsConfirmOpen(false);
      router.push("/super-admin/partners");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to provision White-Label Partner. Please verify inputs."
      );
      setIsConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

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
                Wholesale Provisioning
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Provision White-Label Partner
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Provision an isolated reseller tenant with custom wholesale economics, administrator credentials, and subsystem access.
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
      <form onSubmit={handleInitiateCreate} className="space-y-6">
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
                The white-label partner organization and workspace slug identifier
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

            {/* Workspace Slug with Predefined Dropdown + Custom Input */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Workspace Slug <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={slugOption}
                  onChange={(e) => handleSlugOptionChange(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {PREDEFINED_SLUGS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Input
                    required
                    placeholder="partner"
                    value={form.slug}
                    onChange={(e) => handleSlugInputChange(e.target.value)}
                    className="h-10 text-xs font-mono pr-8"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {slugStatus.checking && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {!slugStatus.checking && slugStatus.available === true && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {!slugStatus.checking && slugStatus.available === false && (
                      <X className="h-3.5 w-3.5 text-rose-600" />
                    )}
                  </div>
                </div>
              </div>

              {slugStatus.message && (
                <p
                  className={`text-[11px] mt-1 font-mono ${
                    slugStatus.available
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {slugStatus.message}
                </p>
              )}
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
                Admin Email <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="admin@apexdigital.com"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                className="h-10 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Administrator Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="Alex Apex"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            {/* Temporary Password with Eye/EyeOff toggle */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Temporary Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••••••"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="h-10 text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Contact Phone / WhatsApp <span className="text-rose-500">* (Required for OTP)</span>
              </label>
              <Input
                required
                placeholder="+91 98765 43210"
                value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                className="h-10 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Firebase Phone OTP verification code will be dispatched to this number.
              </p>
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

        {/* Section 3: Wholesale Pricing & Lifetime License */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Custom Lifetime White-Label License Price Textbox */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Lifetime White-Label License Price (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={0}
                step="any"
                placeholder="0.00"
                value={form.setupFee}
                onChange={(e) => setForm({ ...form, setupFee: Number(e.target.value) })}
                className="h-10 text-xs font-mono font-bold text-amber-700 dark:text-amber-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                One-time lifetime license fee (not hardcoded, custom per contract)
              </p>
            </div>

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
                CNAME target: cname.appnix.co.in
              </p>
            </div>
          </div>

          {/* Revenue Model Margin Note */}
          <div className="p-3 rounded-lg bg-background border text-xs text-muted-foreground flex items-center justify-between">
            <span className="text-[11px]">
              <strong>Partner Economics:</strong> Partner provisions end-clients with customized retail pricing and retains full margin above the Appnix contracted commission (₹{form.perClientRate || 0}/client/month).
            </span>
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] shrink-0 ml-2">
              Appnix Commission: ₹{form.perClientRate || 0}/cl/mo
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
            disabled={sendingOtp || submitting}
            className="h-10 px-6 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2 shadow-md shadow-amber-600/15 cursor-pointer"
          >
            {sendingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending Firebase Phone OTP...</span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Provisioning Partner...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Provision Partner & Contract</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Step 2: Small OTP Verification Dialog */}
      <PartnerOtpVerificationModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        phone={form.adminPhone}
        onVerified={handleOtpVerified}
      />

      {/* Step 3: Small Confirmation Dialog after OTP verification */}
      <PartnerConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalConfirmCreate}
        submitting={submitting}
        mode="create"
      />
    </div>
  );
}
