"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowRight,
  Terminal,
  Eye,
  EyeOff,
} from "lucide-react";
import axios from "axios";
import { config } from "@/lib/config";

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isSuperAdminSubdomain =
    host.startsWith("superadmin.") ||
    host === "superadmin.local" ||
    host.includes("superadmin");
  const defaultUrl = isSuperAdminSubdomain ? "/dashboard" : "/super-admin/dashboard";
  const returnUrl = searchParams.get("returnUrl") || defaultUrl;

  const [email, setEmail] = useState("superadmin@appnix.co.in");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("000000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      // 1. Submit to dedicated Super Admin auth endpoint
      const response = await axios.post(
        "/api/proxy/super-admin/auth/login",
        {
          email,
          password,
          mfaCode: mfaCode || "000000",
        },
        { withCredentials: true }
      );

      const resData = response.data?.data || response.data;
      const { accessToken, refreshToken, user } = resData;

      // 2. Strict Super-Admin verification
      const role = user?.role;
      if (role !== "SUPER_ADMIN" && role !== "owner") {
        throw new Error("Access Denied: Tier-0 Super Admin clearance required. Your account holds insufficient privileges.");
      }

      // 3. Persist session tokens (both superadmin-specific and general for backward compatibility)
      if (accessToken) {
        localStorage.setItem("appnix_superadmin_token", accessToken);
        localStorage.setItem(config.auth.superAdminTokenKey, accessToken);
        localStorage.setItem(config.auth.tokenKey, accessToken);
        document.cookie = `appnix_superadmin_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `appnix_access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `appnix_auth_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
      }
      if (refreshToken) {
        localStorage.setItem(config.auth.superAdminRefreshTokenKey, refreshToken);
        localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
        document.cookie = `appnix_superadmin_refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `appnix_refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
      }
      if (user) {
        localStorage.setItem(config.auth.superAdminUserKey, JSON.stringify(user));
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
      }

      window.location.href = returnUrl;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Authentication failed. Please verify credentials and MFA token.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground tracking-wide mb-1.5">
            Root Administrator Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="root@appnix.co.in"
              className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent h-11 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground tracking-wide mb-1.5">
            Master Passphrase
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className="pl-10 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent h-11 rounded-xl text-sm"
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

        {/* Mandatory MFA / Security Token */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide">
              MFA Authenticator Code <span className="text-amber-600 dark:text-amber-500 font-normal">(Mandatory)</span>
            </label>
            <span className="text-[11px] text-muted-foreground font-medium">FIDO2 / TOTP</span>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600 dark:text-amber-400" />
            <Input
              type="text"
              required
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              className="pl-10 tracking-[0.25em] text-center font-mono bg-background border-amber-500/50 text-amber-700 dark:text-amber-300 placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-amber-500 h-11 font-bold text-lg rounded-xl"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11 rounded-xl shadow-md shadow-amber-600/15 transition-all text-sm gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validating Root Clearance...</span>
            </>
          ) : (
            <>
              <span>Authorize Super Admin Session</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Cross-Link back to Standard Admin */}
      <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        Standard Tenant/Reseller Administrator?{" "}
        <Link
          href="/admin/login"
          className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline transition-colors"
        >
          Standard Admin Login
        </Link>
      </div>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex items-center justify-center text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      }
    >
      <SuperAdminLoginForm />
    </Suspense>
  );
}
