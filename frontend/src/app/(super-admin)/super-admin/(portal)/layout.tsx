"use client";

import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/super-admin/layouts/SuperAdminLayout";
import { Loader2, ShieldAlert } from "lucide-react";
import { config } from "@/lib/config";
import {
  superAdminApi,
  clearSuperAdminAuthSession,
  getSuperAdminLoginUrl,
} from "@/super-admin/services/superAdminApi";

export default function SuperAdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      try {
        const rawUser =
          localStorage.getItem(config.auth.superAdminUserKey) ||
          localStorage.getItem(config.auth.userKey);
        const token =
          localStorage.getItem(config.auth.superAdminTokenKey) ||
          localStorage.getItem("appnix_superadmin_token") ||
          localStorage.getItem(config.auth.tokenKey);

        if (!token || !rawUser) {
          clearSuperAdminAuthSession();
          if (isMounted) {
            setAuthorized(false);
            window.location.href = getSuperAdminLoginUrl(window.location.pathname);
          }
          return;
        }

        const user = JSON.parse(rawUser);
        const role = user?.role;

        // Strictly super-admin clearance
        if (role !== "SUPER_ADMIN" && role !== "owner") {
          clearSuperAdminAuthSession();
          if (isMounted) {
            setAuthorized(false);
            window.location.href = `${getSuperAdminLoginUrl()}?error=insufficient_clearance`;
          }
          return;
        }

        // Verify with backend that token is not revoked or expired
        await superAdminApi.getMe();

        if (isMounted) {
          setAuthorized(true);
        }
      } catch {
        clearSuperAdminAuthSession();
        if (isMounted) {
          setAuthorized(false);
          window.location.href = getSuperAdminLoginUrl(window.location.pathname);
        }
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-xs font-mono font-medium tracking-wide">Verifying Tier-0 Hardware Clearance...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <ShieldAlert className="h-8 w-8 text-rose-500" />
        <p className="text-xs font-mono font-medium tracking-wide text-rose-400">
          Access Restricted: Super Administrator authorization required.
        </p>
      </div>
    );
  }

  return <SuperAdminLayout isSuperAdmin={true}>{children}</SuperAdminLayout>;
}
