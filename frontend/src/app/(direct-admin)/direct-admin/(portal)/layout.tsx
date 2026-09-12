"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  History,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

const directStaffNavItems = [
  { label: "Dashboard", href: "/direct-admin/dashboard", icon: LayoutDashboard },
  { label: "Direct Clients", href: "/direct-admin/clients", icon: Users },
  { label: "System Health", href: "/direct-admin/system-health", icon: Activity },
  { label: "Audit Logs", href: "/direct-admin/audit-logs", icon: History },
  { label: "Support Desk", href: "/direct-admin/support", icon: LifeBuoy },
];

export default function DirectAdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const staffAllowedRoles = ["SUPER_ADMIN", "APP_ADMIN", "owner"];

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        let rawUser =
          localStorage.getItem(config.auth.adminUserKey) ||
          localStorage.getItem(config.auth.userKey);
        let token =
          localStorage.getItem(config.auth.adminTokenKey) ||
          localStorage.getItem(config.auth.tokenKey);

        if (!token || !rawUser) {
          try {
            const res = await fetch(`${config.api.proxyPrefix}/auth/me`, {
              credentials: "include",
            });
            if (res.ok) {
              const resData = await res.json();
              const u = resData?.data || resData;
              const uRole = u?.role || u?.systemRole;
              if (staffAllowedRoles.includes(uRole)) {
                localStorage.setItem(config.auth.adminUserKey, JSON.stringify(u));
                setUserProfile(u);
                setAuthorized(true);
                return;
              }
            }
          } catch {}
          setAuthorized(false);
          return;
        }

        const user = JSON.parse(rawUser);
        const role = user?.role || user?.systemRole;

        // Block RESELLER_ADMIN strictly
        if (role === "RESELLER_ADMIN") {
          setAuthorized(false);
          return;
        }

        if (!role || !staffAllowedRoles.includes(role)) {
          setAuthorized(false);
          return;
        }

        setUserProfile(user);
        setAuthorized(true);
      } catch {
        setAuthorized(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    const cookiesToClear = [
      "appnix_admin_token",
      "appnix_admin_refresh_token",
      "appnix_access_token",
      "appnix_auth_token",
    ];
    cookiesToClear.forEach((c) => {
      document.cookie = `${c}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    window.location.href = "/direct-admin/login";
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium tracking-wide">Verifying Staff Administrator Clearance...</p>
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
          <p className="text-xs text-rose-400 font-medium">Direct Staff Administrator clearance required.</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            White-Label Reseller accounts are strictly isolated from the Direct Staff Admin console.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Button
            onClick={() => (window.location.href = "https://partners.appnix.co.in/login")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9"
          >
            Go to Reseller Portal
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-slate-800 text-slate-400 hover:text-white text-xs h-9"
          >
            Sign In with Staff Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Direct Staff Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 flex flex-col shrink-0">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="h-8 w-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-none">Appnix Staff</div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Direct Operations</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {directStaffNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition",
                  active
                    ? "bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <div className="px-3 py-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">{userProfile?.email || "staff@appnix.co.in"}</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] uppercase font-mono font-bold">
              {userProfile?.role || "STAFF"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Console: <span className="font-semibold text-slate-200">admin.appnix.co.in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono">Platform Active</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
