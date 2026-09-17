"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Lock,
  Mail,
  Building2,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import axios from "axios";
import { config } from "@/lib/config";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturn = searchParams.get("returnUrl");
  const returnUrl = !rawReturn || rawReturn === "/" || rawReturn === "/login" || rawReturn === "/admin/login"
    ? "/admin/dashboard"
    : rawReturn;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantBranding, setTenantBranding] = useState<{
    name: string;
    primaryColor: string;
    logoUrl?: string;
  } | null>(null);

  // Auto-resolve tenant branding from hostname if on custom domain or subdomain
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.host;
    if (host && !host.startsWith("localhost") && !host.startsWith("admin.")) {
      fetch(`${config.api.proxyPrefix}/tenants/resolve-domain?host=${encodeURIComponent(host)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.found && data?.tenant) {
            setTenantBranding({
              name: data.tenant.name,
              primaryColor: data.tenant.primaryColor || "#0f172a",
              logoUrl: data.tenant.logoUrl,
            });
            setOrgSlug(data.tenant.slug);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Submit to dedicated admin auth endpoint
      const cleanEmail = email ? email.toLowerCase().trim() : "";
      const response = await axios.post(
        "/api/admin/auth/login",
        {
          email: cleanEmail,
          password,
          orgSlug: orgSlug ? orgSlug.trim() : undefined,
          mfaCode: mfaCode ? mfaCode.trim() : undefined,
        },
        { withCredentials: true }
      );

      const resData = response.data?.data || response.data;
      const { accessToken, refreshToken, user } = resData;

      // 2. Strict Role Verification: Ensure account has administrative privileges
      const role = user?.rawRole || user?.role;
      const allowedRoles = ["SUPER_ADMIN", "APP_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];
      if (role && !allowedRoles.includes(role)) {
        throw new Error("Access denied: Your account does not possess Admin or Reseller privileges.");
      }

      // 3. Persist tokens (both admin-specific and general for backward compatibility)
      if (accessToken) {
        localStorage.setItem(config.auth.adminTokenKey, accessToken);
        localStorage.setItem(config.auth.tokenKey, accessToken);
        document.cookie = `appnix_admin_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `appnix_access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `appnix_auth_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
      }
      if (refreshToken) {
        localStorage.setItem(config.auth.adminRefreshTokenKey, refreshToken);
        localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
        document.cookie = `appnix_admin_refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `appnix_refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
      }
      if (user) {
        localStorage.setItem(config.auth.adminUserKey, JSON.stringify(user));
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
      }

      // 4. Navigate to admin dashboard
      window.location.href = returnUrl;
    } catch (err: any) {
      const rawMsg = err.response?.data?.message || err.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : rawMsg || "Invalid administrative credentials. Please verify your email and password.";
      setError(msg);

      // Check if MFA is required
      if (err.response?.data?.requiresMfa) {
        setRequiresMfa(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Branding Info if on white-label custom domain */}
      {tenantBranding?.name && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 p-3 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
          <Building2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>Organization: <strong>{tenantBranding.name}</strong></span>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* Admin Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground tracking-wide mb-1.5">
            Admin Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@platform.com"
              className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent h-11 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-foreground tracking-wide">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-medium"
            >
              Reset Password
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="pl-10 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent h-11 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Optional Organization Slug (for white-label resellers) */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Reseller Organization Slug <span className="text-muted-foreground/60 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="e.g. acme-agency"
              className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent h-10 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* MFA / 2FA Code Input (when enabled or prompted) */}
        {requiresMfa && (
          <div className="animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide mb-1.5">
              Two-Factor Authenticator Code (TOTP)
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600 dark:text-amber-400" />
              <Input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                className="pl-10 tracking-[0.25em] text-center font-mono bg-background border-amber-500/50 text-amber-700 dark:text-amber-300 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-amber-500 h-11 font-bold text-lg rounded-xl"
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 rounded-xl shadow-md shadow-indigo-600/15 transition-all text-sm gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign in to Admin Console</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Client User Cross-link */}
      <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        Looking for the standard business messaging workspace?{" "}
        <Link
          href="/signin"
          className="font-semibold text-primary hover:underline transition-colors"
        >
          Sign in to Client App
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex items-center justify-center text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
