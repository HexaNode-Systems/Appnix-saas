"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminLayout } from "@/super-admin/layouts/SuperAdminLayout";
import { Loader2 } from "lucide-react";
import { config } from "@/lib/config";

const allowedRoles = ["SUPER_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function decodeJwtPayload(token: string | null | undefined): any {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        let token =
          localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem(config.auth.tokenKey) ||
          getCookie("appnix_admin_token") ||
          getCookie("appnix_access_token") ||
          getCookie("appnix_auth_token");

        let rawUser =
          localStorage.getItem(config.auth.adminUserKey) ||
          localStorage.getItem(config.auth.userKey);

        // 1. Fast path: check token JWT payload directly
        if (token) {
          const decoded = decodeJwtPayload(token);
          const role = decoded?.role || decoded?.systemRole;
          if (role && allowedRoles.includes(role)) {
            if (!rawUser) {
              const syntheticUser = {
                id: decoded.sub || decoded.userId,
                email: decoded.email,
                role,
                tenantId: decoded.tenantId,
              };
              localStorage.setItem(config.auth.adminUserKey, JSON.stringify(syntheticUser));
              localStorage.setItem(config.auth.userKey, JSON.stringify(syntheticUser));
            }
            localStorage.setItem(config.auth.adminTokenKey, token);
            setAuthorized(true);

            // Fetch latest user profile in background without blocking UI
            fetch(`${config.api.proxyPrefix}/auth/me`, { credentials: "include" })
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                const u = data?.data || data;
                if (u?.id) {
                  localStorage.setItem(config.auth.adminUserKey, JSON.stringify(u));
                  localStorage.setItem(config.auth.userKey, JSON.stringify(u));
                }
              })
              .catch(() => {});
            return;
          }
        }

        // 2. Fallback: Query /auth/me via proxy with credentials
        try {
          const res = await fetch(`${config.api.proxyPrefix}/auth/me`, {
            credentials: "include",
          });
          if (res.ok) {
            const resData = await res.json();
            const u = resData?.data || resData;
            const uRole = u?.role || u?.systemRole || u?.rawRole;
            if (u?.id && allowedRoles.includes(uRole)) {
              localStorage.setItem(config.auth.adminUserKey, JSON.stringify(u));
              localStorage.setItem(config.auth.userKey, JSON.stringify(u));
              setAuthorized(true);
              return;
            }
          }
        } catch {
          // Network or server failure
        }

        // 3. User is not authorized as admin -> redirect directly to login
        setAuthorized(false);
      } catch {
        setAuthorized(false);
      }
    };

    verifyAuth();
  }, []);

  // If unauthorized, immediately redirect to admin login without showing blocked access page
  useEffect(() => {
    if (authorized === false && typeof window !== "undefined") {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login?returnUrl=${returnUrl}`;
    }
  }, [authorized]);

  if (authorized === null || authorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium tracking-wide">Loading Admin Console...</p>
      </div>
    );
  }

  return <SuperAdminLayout isSuperAdmin={false}>{children}</SuperAdminLayout>;
}
