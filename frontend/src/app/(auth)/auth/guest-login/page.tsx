"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function GuestLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Impersonation token is missing from URL.");
      return;
    }

    try {
      // Decode JWT payload
      const parts = token.split(".");
      if (parts.length < 2) {
        throw new Error("Malformed JWT token format.");
      }
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

      // Store credentials
      localStorage.setItem("appnix_access_token", token);
      localStorage.setItem("appnix_impersonation_token", token);
      sessionStorage.setItem("appnix_impersonation_token", token);

      const guestData = {
        isGuest: true,
        isImpersonated: true,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        impersonatorId: payload.impersonatorId,
      };
      localStorage.setItem("appnix_guest_impersonation", JSON.stringify(guestData));

      // Set cookies for middleware and server-side authentication
      const isProd = window.location.protocol === "https:";
      const secureAttr = isProd ? "; Secure" : "";
      document.cookie = `appnix_access_token=${token}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
      document.cookie = `appnix_impersonation_token=${token}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;

      if (payload.role === "RESELLER_ADMIN") {
        localStorage.setItem("appnix_admin_token", token);
        document.cookie = `appnix_admin_token=${token}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
        // Redirect to partner admin dashboard
        window.location.href = "/admin/dashboard";
      } else {
        // Redirect to client operations dashboard
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize guest session.");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Impersonation Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="h-8 w-8 text-amber-500" />
          </div>
          <Loader2 className="h-20 w-20 text-amber-500/40 animate-spin absolute -top-2 -left-2" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Initializing Guest Session</h2>
        <p className="text-sm text-slate-400">
          Entering Super Admin guest mode with full audit logging enabled. Redirecting...
        </p>
      </div>
    </div>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <GuestLoginContent />
    </Suspense>
  );
}
