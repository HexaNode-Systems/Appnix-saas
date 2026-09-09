"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { executeSuperAdminLogout } from "@/super-admin/services/superAdminApi";
import { useAuth } from "@/lib/auth/auth-context";
import { config } from "@/lib/config";
import {
  Search,
  Menu,
  Maximize2,
  Bell,
  QrCode,
  Shield,
  User,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Clock,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface SuperAdminHeaderProps {
  onMenuClick: () => void;
  isSuperAdmin?: boolean;
}

export function SuperAdminHeader({ onMenuClick, isSuperAdmin: propIsSuperAdmin }: SuperAdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);

  const isSuperAdminSubdomain =
    typeof window !== "undefined" &&
    (window.location.hostname.startsWith("superadmin.") ||
      window.location.hostname === "superadmin.local" ||
      window.location.hostname.includes("superadmin"));

  const isSuperAdmin =
    propIsSuperAdmin !== undefined
      ? propIsSuperAdmin
      : pathname.startsWith("/super-admin") || isSuperAdminSubdomain;

  useEffect(() => {
    try {
      const key = isSuperAdmin
        ? config.auth.superAdminUserKey
        : config.auth.adminUserKey;
      const raw =
        localStorage.getItem(key) ||
        localStorage.getItem(config.auth.userKey) ||
        localStorage.getItem(isSuperAdmin ? "appnix_superadmin_user" : "appnix_admin_user");
      if (raw) {
        setLocalUser(JSON.parse(raw));
      }
    } catch {}
  }, [isSuperAdmin]);

  const activeUser = authUser || localUser;

  const displayName =
    activeUser?.name ||
    (activeUser?.email ? activeUser.email.split("@")[0] : isSuperAdmin ? "Root Administrator" : "Admin");

  const rawRole = activeUser?.rawRole || activeUser?.systemRole || activeUser?.role;

  const formatRole = (role?: string, isSuper?: boolean) => {
    if (!role) return isSuper ? "Root Administrator" : "Admin";
    const upper = role.toUpperCase();
    if (upper === "SUPER_ADMIN") return isSuper ? "Root Administrator" : "Super Admin";
    if (upper === "RESELLER_ADMIN") return "Reseller Admin";
    if (upper === "TENANT_ADMIN") return "Tenant Admin";
    if (upper === "OWNER") return "Owner";
    if (upper === "ADMIN") return "Admin";
    if (upper === "MEMBER") return "Member";
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const displayRole = formatRole(rawRole, isSuperAdmin);

  const getInitials = (name?: string, email?: string) => {
    const clean = (name || email?.split("@")[0] || "").trim();
    if (!clean) return isSuperAdmin ? "SA" : "AD";
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, Math.min(2, clean.length)).toUpperCase();
  };

  const initials = getInitials(activeUser?.name, activeUser?.email);

  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const notifications = [
    {
      id: "n1",
      title: "Urgent Support Escalation",
      desc: "Acme Corp (Enterprise) opened Ticket #TKT-8902",
      time: "10 mins ago",
      type: "urgent",
    },
    {
      id: "n2",
      title: "Negative Wallet Balance",
      desc: "Global Logistics dipped to -$120.00",
      time: "2 hours ago",
      type: "warning",
    },
    {
      id: "n3",
      title: "Worker Node 04 Degraded",
      desc: "BullMQ background queue memory reached 88%",
      time: "3 hours ago",
      type: "warning",
    },
  ];

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleLogout = async () => {
    if (confirm(`Sign out from ${isSuperAdmin ? "Super Admin Platform Root" : "Admin Console"}?`)) {
      if (isSuperAdmin) {
        await executeSuperAdminLogout();
      } else {
        localStorage.removeItem(config.auth.adminTokenKey);
        localStorage.removeItem(config.auth.adminUserKey);
        localStorage.removeItem(config.auth.adminRefreshTokenKey);
        localStorage.removeItem(config.auth.tokenKey);
        localStorage.removeItem(config.auth.userKey);
        localStorage.removeItem(config.auth.refreshTokenKey);
        localStorage.removeItem("appnix_admin_token");
        localStorage.removeItem("appnix_admin_user");
        localStorage.removeItem("appnix_auth_token");
        localStorage.removeItem("appnix_user");
        localStorage.removeItem("appnix_admin_refresh_token");
        localStorage.removeItem("appnix_refresh_token");
        document.cookie = "appnix_admin_token=; path=/; max-age=0";
        document.cookie = "appnix_access_token=; path=/; max-age=0";
        document.cookie = "appnix_auth_token=; path=/; max-age=0";
        window.location.href = isSuperAdminSubdomain ? "/logout" : "/admin/logout";
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-2xs">
      {/* Left side: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isSuperAdmin ? "Search partners, wholesale plans, clients..." : "Search clients, tickets, plans, staff, logs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/30 border-border/70 focus-visible:ring-1 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      {/* Right side: Utilities, Notifications, Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Fullscreen Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFullscreen}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="h-4.5 w-4.5" />
        </Button>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
            }}
            className="h-9 w-9 relative text-muted-foreground hover:text-foreground"
            title="Platform Alerts"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card animate-pulse" />
          </Button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-card p-3 shadow-xl z-50 animate-in space-y-2">
              <div className="flex items-center justify-between border-b pb-2 px-1">
                <span className="font-bold text-xs text-foreground">Platform Alerts</span>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                  Real-Time
                </Badge>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Security logs are retained immutably in <strong>audit_logs</strong>.</span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-1"
                  >
                    <p className="font-semibold text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                    <span className="text-[10px] text-muted-foreground block">{n.time}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 text-center">
                <Link
                  href={
                    isSuperAdmin
                      ? isSuperAdminSubdomain && !pathname.startsWith("/super-admin")
                        ? "/audit-logs"
                        : "/super-admin/audit-logs"
                      : !pathname.startsWith("/admin") && typeof window !== "undefined" && window.location.hostname.startsWith("admin.")
                      ? "/audit-logs"
                      : "/admin/audit-logs"
                  }
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                >
                  View Full Audit Logs →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile & Avatar Menu */}
        <div className="border-l pl-2 sm:pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group outline-none focus-visible:ring-1 focus-visible:ring-amber-500 data-[state=open]:bg-muted/80">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold leading-tight text-foreground group-hover:text-amber-600 transition-colors">
                  {displayName}
                </p>
                <p className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  isSuperAdmin ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {displayRole}
                </p>
              </div>
              {activeUser?.avatar ? (
                <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-indigo-600/30">
                  <img
                    src={activeUser.avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className={cn(
                  "h-8 w-8 rounded-full text-white flex items-center justify-center font-bold text-xs ring-2",
                  isSuperAdmin ? "bg-amber-600 ring-amber-600/30" : "bg-indigo-600 ring-indigo-600/30"
                )}>
                  {initials}
                </div>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-lg">
              <DropdownMenuLabel className="font-normal px-2 py-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground truncate max-w-[130px]">
                      {displayName}
                    </p>
                    <Badge className={cn(
                      "text-[10px] font-semibold",
                      isSuperAdmin ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                    )}>
                      {displayRole}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeUser?.email || (isSuperAdmin ? "superadmin@appnix.co.in" : "admin@platform.com")}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link
                  href={
                    isSuperAdmin
                      ? isSuperAdminSubdomain && !pathname.startsWith("/super-admin")
                        ? "/dashboard"
                        : "/super-admin/dashboard"
                      : !pathname.startsWith("/admin") && typeof window !== "undefined" && window.location.hostname.startsWith("admin.")
                      ? "/settings"
                      : "/admin/settings"
                  }
                  className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-xs text-foreground hover:bg-accent focus:bg-accent transition-colors"
                >
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{isSuperAdmin ? "Platform Overview" : "Profile & Settings"}</span>
                    <span className="text-[10px] text-muted-foreground">System console control</span>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 transition-colors"
              >
                <LogOut className="h-4 w-4 text-rose-600" />
                <span className="font-semibold">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
