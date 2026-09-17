"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { config } from "@/lib/config";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function GuestLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawToken = searchParams.get("token");
    if (!rawToken) {
      setError("Impersonation token is missing from URL.");
      return;
    }
    const token = rawToken;

    async function activateSession() {
      try {
        let sessionData: any = null;

        // 1. Call dedicated Session Login API to authenticate and establish guest/inspection session
        try {
          const res = await axios.post(
            `${config.api.proxyPrefix}/auth/session-login`,
            { token },
            { withCredentials: true, timeout: 3500 }
          );
          sessionData = res.data?.data || res.data;
        } catch (apiErr: any) {
          console.warn("[Session Login] Direct backend validation notice, proceeding with token fallback:", apiErr?.message);
        }

        const accessToken = sessionData?.accessToken || token;
        const refreshToken = sessionData?.refreshToken;
        const user = sessionData?.user;
        const client = sessionData?.client;

        // Decode JWT payload
        let payload: any = {};
        try {
          const parts = accessToken.split(".");
          if (parts.length >= 2) {
            payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          }
        } catch {}

        // Store credentials
        localStorage.setItem("appnix_access_token", accessToken);
        localStorage.setItem("appnix_auth_token", accessToken);
        localStorage.setItem(config.auth.tokenKey, accessToken);
        localStorage.setItem("appnix_impersonation_token", token);
        sessionStorage.setItem("appnix_impersonation_token", token);

        if (refreshToken) {
          localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
          localStorage.setItem("appnix_refresh_token", refreshToken);
        }

        const guestData = {
          isGuest: true,
          isImpersonated: true,
          userId: user?.id || payload.sub,
          email: user?.email || payload.email,
          role: user?.role || payload.role,
          tenantId: client?.id || payload.tenantId,
          clientId: client?.id || payload.tenantId,
          clientName: client?.name || payload.workspaceName || payload.name || "Client Account",
          clientEmail: client?.email || payload.email,
          ownerName: client?.ownerName || payload.name || payload.email?.split("@")[0] || "Client User",
          plan: client?.plan || payload.tier || "Professional Tier",
          impersonatorId: payload.impersonatorId || payload.sub,
        };
        localStorage.setItem("appnix_guest_impersonation", JSON.stringify(guestData));

        const syntheticUser = user || {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email?.split("@")[0] || "Client User",
          role: payload.role || "owner",
          tenantId: payload.tenantId,
          workspaceId: payload.tenantId,
        };
        localStorage.setItem("appnix_user", JSON.stringify(syntheticUser));
        localStorage.setItem(config.auth.userKey, JSON.stringify(syntheticUser));

        // Set cookies for middleware and server-side authentication
        const isProd = window.location.protocol === "https:";
        const secureAttr = isProd ? "; Secure" : "";
        document.cookie = `appnix_access_token=${accessToken}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
        document.cookie = `appnix_auth_token=${accessToken}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
        document.cookie = `appnix_impersonation_token=${token}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
        if (refreshToken) {
          document.cookie = `appnix_refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax${secureAttr}`;
        }

        const userRole = user?.rawRole || user?.role || payload.role;
        if (payload.targetPanel === "DIRECT_ADMIN") {
          // This is a direct internal staff session. It intentionally bypasses
          // reseller routing and enters the direct admin console only.
          localStorage.setItem("appnix_admin_token", accessToken);
          localStorage.setItem(config.auth.adminUserKey, JSON.stringify(syntheticUser));
          document.cookie = `appnix_admin_token=${accessToken}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;
          window.location.href = "/admin/dashboard";
        } else if (userRole === "RESELLER_ADMIN") {
          localStorage.setItem("appnix_admin_token", accessToken);
          document.cookie = `appnix_admin_token=${accessToken}; path=/; max-age=3600; SameSite=Lax${secureAttr}`;

          const host = window.location.hostname;
          if (host.startsWith("superadmin.")) {
            const targetHost = host.replace("superadmin.", "partners.");
            const portSuffix = window.location.port ? `:${window.location.port}` : "";
            window.location.href = `${window.location.protocol}//${targetHost}${portSuffix}/auth/guest-login?token=${token}`;
            return;
          }

          // Redirect to partner admin dashboard
          window.location.href = "/admin/dashboard";
        } else {
          // Redirect to client operations dashboard
          const host = window.location.hostname;
          if (host.startsWith("superadmin.") || host.startsWith("partners.") || host.startsWith("admin.")) {
            const isLocal = host.includes("localhost") || host.endsWith(".local");
            const portSuffix = window.location.port ? `:${window.location.port}` : "";
            const targetHost = isLocal ? `app.localhost${portSuffix}` : (process.env.NEXT_PUBLIC_APP_DOMAIN || "app.appnix.co.in");
            window.location.href = `${window.location.protocol}//${targetHost}/auth/guest-login?token=${token}`;
            return;
          }

          window.location.href = "/dashboard";
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize guest session.");
      }
    }

    activateSession();
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
