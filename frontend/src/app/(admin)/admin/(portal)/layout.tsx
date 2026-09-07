"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminLayout } from "@/super-admin/layouts/SuperAdminLayout";
import { Loader2, ShieldAlert } from "lucide-react";
import { config } from "@/lib/config";

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Verify admin/reseller credentials in browser
    try {
      const rawUser =
        localStorage.getItem(config.auth.adminUserKey) ||
        localStorage.getItem(config.auth.userKey);
      const token =
        localStorage.getItem(config.auth.adminTokenKey) ||
        localStorage.getItem(config.auth.tokenKey);

      if (!token || !rawUser) {
        setAuthorized(false);
        router.replace("/admin/login?returnUrl=" + encodeURIComponent(window.location.pathname));
        return;
      }

      const user = JSON.parse(rawUser);
      const role = user?.role;
      const allowedRoles = ["SUPER_ADMIN", "RESELLER_ADMIN", "TENANT_ADMIN", "owner", "admin"];

      if (!role || !allowedRoles.includes(role)) {
        // Block non-admin user and redirect to admin login — do NOT bounce to user dashboard
        setAuthorized(false);
        router.replace("/admin/login?error=insufficient_permissions");
        return;
      }

      setAuthorized(true);
    } catch {
      setAuthorized(false);
      router.replace("/admin/login");
    }
  }, [router]);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <ShieldAlert className="h-8 w-8 text-rose-500" />
        <p className="text-xs font-medium tracking-wide text-rose-400">Access Restricted: Administrative permissions required.</p>
      </div>
    );
  }

  return <SuperAdminLayout isSuperAdmin={false}>{children}</SuperAdminLayout>;
}
