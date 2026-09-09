"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/axios";
import {
  Palette,
  ArrowLeft,
  ChevronRight,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";

interface TenantBrandingData {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  customDomain: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const PRESET_COLORS = [
  { name: "Slate", hex: "#0f172a" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Emerald", hex: "#059669" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Amber", hex: "#d97706" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Cyan", hex: "#0891b2" },
];

export default function BrandSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tenant branding form state
  const [tenantId, setTenantId] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantTier, setTenantTier] = useState("");
  const [tenantStatus, setTenantStatus] = useState("");

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // Load current tenant's branding settings from backend
  useEffect(() => {
    async function loadBranding() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/tenants/current/branding");
        const data: TenantBrandingData = res.data?.data || res.data;

        if (data) {
          setTenantId(data.id || "");
          setTenantSlug(data.slug || "");
          setTenantTier(data.tier || "");
          setTenantStatus(data.status || "ACTIVE");

          setName(data.name || "");
          setPrimaryColor(data.primaryColor || "#0f172a");
          setLogoUrl(data.logoUrl || "");
          setFaviconUrl(data.faviconUrl || "");
          setCustomDomain(data.customDomain || "");
        }
      } catch (err: any) {
        console.error("Failed to load branding settings:", err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load brand settings from server";
        setError(Array.isArray(msg) ? msg.join(", ") : msg);
      } finally {
        setLoading(false);
      }
    }

    loadBranding();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const payload = {
        name: name.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        customDomain: customDomain.trim() ? customDomain.toLowerCase().trim() : null,
      };

      const res = await api.patch("/tenants/current/branding", payload);
      const updated: TenantBrandingData = res.data?.data || res.data;

      if (updated) {
        setName(updated.name || name);
        setPrimaryColor(updated.primaryColor || primaryColor);
        setLogoUrl(updated.logoUrl || "");
        setFaviconUrl(updated.faviconUrl || "");
        setCustomDomain(updated.customDomain || "");
      }

      setSuccessMsg("Brand settings saved successfully! Changes are live across your tenant portal.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Failed to save brand settings:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to save brand settings. Please try again.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium tracking-wide">Loading brand configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Admin Console</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Brand Settings</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Brand Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure white-label branding, portal themes, logos, and custom domain mapping for your organization.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? "Saving..." : "Save Brand Settings"}</span>
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in">
          <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tenant Context Overview Card */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
            style={{ backgroundColor: primaryColor || "#0f172a" }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name || "Logo"}
                className="h-full w-full object-contain p-1 rounded-xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              (name ? name.slice(0, 2).toUpperCase() : "WL")
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{name || "Tenant Workspace"}</h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                {tenantSlug || "workspace"}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                {tenantStatus || "ACTIVE"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organization Tier: <strong>{tenantTier || "WHITE_LABEL_PARTNER"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-1.5 bg-muted/20 w-fit">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span>Tenant Context: <code className="font-mono font-semibold">{tenantId ? tenantId.slice(0, 8) + "..." : "Scoped"}</code></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity & Display Settings */}
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Organization Identity
                </h3>
                <span className="text-[11px] text-muted-foreground">White-Label Branding</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Organization Display Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Cloud Solutions"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Your brand name displayed on white-label login screens, dashboard headers, and client portals.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Workspace Identifier / Slug
                  </label>
                  <Input
                    value={tenantSlug}
                    disabled
                    className="h-9 text-xs font-mono bg-muted/40 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Unique workspace slug assigned by the root administrator platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Colors & Theming */}
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Theme Colors
                </h3>
                <span className="text-[11px] text-muted-foreground">Visual Identity</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-12 rounded border border-border bg-card cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#0f172a"
                      className="h-9 text-xs font-mono w-36 uppercase"
                    />
                    <div
                      className="h-9 flex-1 rounded-lg border flex items-center justify-center text-white text-xs font-semibold shadow-2xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Color Preview
                    </div>
                  </div>
                </div>

                {/* Preset Swatches */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-2">
                    Quick Preset Palettes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setPrimaryColor(c.hex)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs hover:border-primary transition-colors cursor-pointer"
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[11px] text-foreground font-medium">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Media & Assets */}
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Logos & Media Assets
                </h3>
                <span className="text-[11px] text-muted-foreground">Visual Assets</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Brand Logo URL
                  </label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Direct HTTPS link to your company logo (recommended: transparent PNG or SVG, min 200x50px).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Favicon URL
                  </label>
                  <Input
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://yourdomain.com/favicon.ico"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Browser tab icon URL (recommended: 32x32px or 64x64px ICO/PNG).
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Domain Mapping */}
            <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Custom Domain & DNS
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  CNAME Routing
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Custom Domain Hostname
                  </label>
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="portal.yourcompany.com"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Your clients and team will access this admin console and user workspace at this custom domain.
                  </p>
                </div>

                <div className="rounded-xl bg-muted/30 border p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    <span>DNS Configuration Instructions</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    In your DNS provider (e.g., Cloudflare, Route53, GoDaddy), create a <strong>CNAME</strong> record:
                  </p>
                  <div className="p-2 rounded bg-card border font-mono text-[11px] flex items-center justify-between">
                    <span>Host: <code>{customDomain || "portal"}</code></span>
                    <span>Target: <code>cname.appnix.co.in</code></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "Saving Changes..." : "Save Brand Settings"}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Branding Preview */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Brand Preview
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold">Real-Time</span>
            </div>

            {/* Mock Portal Header Preview */}
            <div className="rounded-xl border bg-background overflow-hidden shadow-xs">
              <div
                className="h-12 px-3 flex items-center justify-between border-b"
                style={{ borderTop: `3px solid ${primaryColor}` }}
              >
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Brand Logo"
                      className="h-6 max-w-[100px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {name ? name.slice(0, 2).toUpperCase() : "WL"}
                    </div>
                  )}
                  <span className="font-bold text-xs text-foreground truncate max-w-[110px]">
                    {name || "Your Brand"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-muted" />
                  <div
                    className="h-5 px-2 rounded-md text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Action
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Body */}
              <div className="p-3 bg-muted/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                    }}
                  >
                    Active Tier
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg border bg-card space-y-1">
                    <p className="text-[10px] text-muted-foreground">Connected Clients</p>
                    <p className="text-xs font-bold text-foreground">12</p>
                  </div>
                  <div className="p-2 rounded-lg border bg-card space-y-1">
                    <p className="text-[10px] text-muted-foreground">Monthly Active</p>
                    <p className="text-xs font-bold" style={{ color: primaryColor }}>99.8%</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1 transition-opacity hover:opacity-90 cursor-default"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Primary Portal Button</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Active Theme:</span>
                <span className="font-mono font-semibold uppercase">{primaryColor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Domain Scope:</span>
                <span className="font-mono font-semibold">{customDomain || "Platform Default"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
