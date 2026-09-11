"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminLayout } from "@/super-admin/layouts/SuperAdminLayout";
import { Loader2, ShieldAlert, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const allowedRoles = ["SUPER_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];

  useEffect(() => {
    // Verify admin/reseller credentials in browser
    const verifyAuth = async () => {
      try {
        let rawUser =
          localStorage.getItem(config.auth.adminUserKey) ||
          localStorage.getItem(config.auth.userKey);
        let token =
          localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem(config.auth.tokenKey);

        // If local storage is missing but session cookie is present, attempt rehydration
        if (!token || !rawUser) {
          try {
            const res = await fetch(`${config.api.proxyPrefix}/auth/me`, {
              credentials: "include",
            });
            if (res.ok) {
              const resData = await res.json();
              const u = resData?.data || resData;
              if (u?.id) {
                const uRole = u.role || u.systemRole || u.rawRole;
                if (allowedRoles.includes(uRole)) {
                  localStorage.setItem(config.auth.adminUserKey, JSON.stringify(u));
                  localStorage.setItem(config.auth.userKey, JSON.stringify(u));
                  setAuthorized(true);
                  return;
                }
              }
            }
          } catch {
            // Rehydration attempt failed, fall through to denial
          }

          setAuthorized(false);
          return;
        }

        const user = JSON.parse(rawUser);
        const role = user?.role || user?.systemRole || user?.rawRole;

        if (!role || !allowedRoles.includes(role)) {
          setAuthorized(false);
          return;
        }

        setAuthorized(true);
      } catch {
        setAuthorized(false);
      }
    };

    verifyAuth();
  }, []);

  const handleForceLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    const domains = ["", ".appnix.co.in", window.location.hostname];
    const cookiesToClear = [
      "appnix_admin_token",
      "appnix_admin_refresh_token",
      "appnix_access_token",
      "appnix_auth_token",
      "appnix_refresh_token",
      "appnix_superadmin_token",
      "appnix_superadmin_refresh_token",
    ];
    cookiesToClear.forEach((c) => {
      domains.forEach((d) => {
        const domainAttr = d ? `; domain=${d}` : "";
        document.cookie = `${c}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${domainAttr}`;
      });
    });
    window.location.href = "/admin/logout";
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium tracking-wide">Verifying administrative security clearance...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400 p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h2 className="text-base font-bold text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs text-rose-400 font-medium">Administrative permissions required.</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current active session does not possess Administrative or Reseller privileges, or your credentials have expired.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Button
            onClick={handleForceLogout}
            variant="destructive"
            size="sm"
            className="text-xs font-semibold gap-2 shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            Clear Session & Log Out
          </Button>
          <Button
            onClick={() => {
              window.location.href = "/admin/login?switch=true";
            }}
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Sign In with Admin Account
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return <SuperAdminLayout isSuperAdmin={false}>{children}</SuperAdminLayout>;
}
