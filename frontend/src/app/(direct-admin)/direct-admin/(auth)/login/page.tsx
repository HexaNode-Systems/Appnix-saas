"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Building,
} from "lucide-react";
import axios from "axios";
import { config } from "@/lib/config";

function DirectAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturn = searchParams.get("returnUrl");
  const returnUrl =
    !rawReturn || rawReturn === "/" || rawReturn === "/login" || rawReturn === "/admin/login" || rawReturn === "/direct-admin/login"
      ? "/direct-admin/dashboard"
      : rawReturn;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResellerBlocked, setIsResellerBlocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsResellerBlocked(false);
    setLoading(true);

    try {
      const cleanEmail = email ? email.toLowerCase().trim() : "";
      const response = await axios.post(
        "/api/admin/auth/login",
        {
          email: cleanEmail,
          password,
        },
        { withCredentials: true }
      );

      const resData = response.data?.data || response.data;
      const { accessToken, user } = resData;

      const role = user?.role;

      // Strict Reseller Isolation: RESELLER_ADMIN is strictly blocked from Direct Staff Admin
      if (role === "RESELLER_ADMIN") {
        setIsResellerBlocked(true);
        throw new Error(
          "Access Denied: White-label Resellers are strictly isolated from the Direct Staff Admin console. Please sign in via the Reseller Portal at partners.appnix.co.in."
        );
      }

      // Permitted roles: SUPER_ADMIN, APP_ADMIN, owner
      const staffRoles = ["SUPER_ADMIN", "APP_ADMIN", "owner"];
      if (!role || !staffRoles.includes(role)) {
        throw new Error(
          "Access denied: This console is reserved exclusively for Appnix internal staff administrators."
        );
      }

      // Store tokens
      if (accessToken) {
        localStorage.setItem(config.auth.adminTokenKey, accessToken);
        localStorage.setItem(config.auth.tokenKey, accessToken);
        document.cookie = `appnix_admin_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `appnix_access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
      }
      if (user) {
        localStorage.setItem(config.auth.adminUserKey, JSON.stringify(user));
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
      }

      router.push(returnUrl);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Authentication failed. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const partnerPortalUrl =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? "http://partners.localhost:3000/login"
      : "https://partners.appnix.co.in/login";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Appnix Direct Staff Admin
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 font-medium">
          Internal operations, platform health, and direct client administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <span>{error}</span>
                {isResellerBlocked && (
                  <div className="pt-1">
                    <a
                      href={partnerPortalUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                    >
                      <Building className="h-3.5 w-3.5" />
                      Go to White-Label Partner Portal
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@appnix.co.in"
                  className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 text-sm h-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 pr-10 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 text-sm h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-10 rounded-xl transition shadow-lg shadow-indigo-600/20 text-xs mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Staff Clearance...
                </>
              ) : (
                <>
                  Authenticate Staff Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-xs text-slate-500">
              White-label Reseller?{" "}
              <a
                href={partnerPortalUrl}
                className="text-indigo-400 hover:underline font-medium"
              >
                Access Partners Portal &rarr;
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DirectAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <DirectAdminLoginForm />
    </Suspense>
  );
}
