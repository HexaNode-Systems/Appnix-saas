"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { executeSuperAdminLogout } from "@/super-admin/services/superAdminApi";
import { config } from "@/lib/config";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Flag,
  LifeBuoy,
  ShieldCheck,
  History,
  Activity,
  Settings,
  LogOut,
  X,
  Shield,
  ChevronDown,
  UserPlus,
  Plus,
  Users,
  Layers,
  Radio,
  Palette,
} from "lucide-react";

interface SuperAdminSidebarProps {
  open: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

interface SubItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  badge?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  children?: SubItem[];
}

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    id: "clients",
    label: "Clients / Users",
    href: "/admin/clients",
    icon: Building2,
    children: [
      { label: "All Tenants", href: "/admin/clients", icon: Users },
      {
        label: "Add Tenant / Client",
        href: "/admin/clients?action=add",
        icon: UserPlus,
        badge: "New",
      },
    ],
  },
  { id: "brand-settings", label: "Brand Settings", href: "/admin/brand-settings", icon: Palette },
  { id: "billing", label: "Billing & Plans", href: "/admin/billing", icon: CreditCard },
  { id: "feature-flags", label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { id: "support", label: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
  { id: "team", label: "Team / Staff", href: "/admin/team", icon: ShieldCheck },
  { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", icon: History },
  { id: "system-health", label: "System Health", href: "/admin/system-health", icon: Activity },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
];

const superAdminNavItems: NavItem[] = [
  { id: "dashboard", label: "Platform Overview", href: "/super-admin/dashboard", icon: LayoutDashboard },
  {
    id: "partners",
    label: "White-Label Partners",
    href: "/super-admin/partners",
    icon: Building2,
    children: [
      { label: "All Partners", href: "/super-admin/partners", icon: Users },
      {
        label: "Add Partner",
        href: "/super-admin/partners/create",
        icon: Plus,
        badge: "New",
      },
    ],
  },
  { id: "clients", label: "All Client Accounts", href: "/super-admin/clients", icon: Users },
  { id: "wholesale-plans", label: "Wholesale Plans", href: "/super-admin/wholesale-plans", icon: Layers },
  { id: "subscriptions", label: "Subscriptions & Rev", href: "/super-admin/subscriptions", icon: CreditCard },
  { id: "channels", label: "Channel Usage", href: "/super-admin/channels", icon: Radio },
  { id: "health", label: "System Health", href: "/super-admin/health", icon: Activity },
  { id: "audit-logs", label: "Audit Trail", href: "/super-admin/audit-logs", icon: History },
];

export function SuperAdminSidebar({ open, onClose, isSuperAdmin: propIsSuperAdmin }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isSuperAdminSubdomain =
    typeof window !== "undefined" &&
    (window.location.hostname.startsWith("superadmin.") ||
      window.location.hostname === "superadmin.local" ||
      window.location.hostname.includes("superadmin"));

  const isSuperAdmin =
    propIsSuperAdmin !== undefined
      ? propIsSuperAdmin
      : pathname.startsWith("/super-admin") || isSuperAdminSubdomain;

  const navItems = isSuperAdmin ? superAdminNavItems : adminNavItems;

  const normalizePath = (p: string) =>
    p.replace(/^\/(super-admin|admin)/, "") || "/";

  const isItemActive = (href: string) => {
    const normPath = normalizePath(pathname);
    const normHref = normalizePath(href);
    if (normHref === "/" || normHref === "/dashboard") {
      return normPath === "/" || normPath === "/dashboard";
    }
    return normPath === normHref || normPath.startsWith(`${normHref}/`);
  };

  const getTargetHref = (href: string) => {
    if (isSuperAdmin) {
      if (isSuperAdminSubdomain && !pathname.startsWith("/super-admin")) {
        return href.replace(/^\/super-admin/, "") || "/dashboard";
      }
      return href;
    }
    if (!pathname.startsWith("/admin") && typeof window !== "undefined" && window.location.hostname.startsWith("admin.")) {
      return href.replace(/^\/admin/, "") || "/dashboard";
    }
    return href;
  };

  // Derive active expandable item without triggering cascading render effect
  const activeGroup = useMemo(() => {
    const norm = normalizePath(pathname);
    if (norm.startsWith("/clients")) return "clients";
    if (norm.startsWith("/partners")) return "partners";
    return null;
  }, [pathname]);

  const [manualExpanded, setManualExpanded] = useState<string | null>(null);
  const expanded = manualExpanded ?? activeGroup;

  const toggleExpand = (id: string) => {
    setManualExpanded((prev) => ((prev ?? activeGroup) === id ? null : id));
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
        const domains = ["", ".appnix.co.in", typeof window !== "undefined" ? window.location.hostname : ""];
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
        window.location.href = isSuperAdminSubdomain ? "/logout" : "/admin/logout";
      }
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card text-card-foreground transition-transform duration-200 ease-in-out shadow-sm h-full",
          "lg:static lg:z-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-white font-black shadow-xs",
              isSuperAdmin ? "bg-amber-600" : "bg-emerald-600"
            )}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-foreground uppercase">
                Appnix
              </p>
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isSuperAdmin ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {isSuperAdmin ? "Super Admin Root" : "Reseller Admin"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isSuperAdmin ? "Platform Administration" : "Tenant Administration"}
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const hasActiveChild = item.children?.some((sub) => isItemActive(sub.href));
                const isParentActive = isItemActive(item.href) || !!hasActiveChild;
                const isOpen = expanded === item.id;
                const targetHref = getTargetHref(item.href);

                if (!hasChildren) {
                  return (
                    <Link
                      key={item.href}
                      href={targetHref}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                        isParentActive
                          ? isSuperAdmin
                            ? "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200 font-bold border-l-4 border-amber-600 -ml-1 pl-3 shadow-xs"
                            : "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold border-l-4 border-emerald-600 -ml-1 pl-3 shadow-xs"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isParentActive
                            ? isSuperAdmin
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                }

                // Expandable parent item (e.g. Clients, Partners)
                return (
                  <div key={item.id} className="space-y-0.5">
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                        isParentActive
                          ? isSuperAdmin
                            ? "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200 font-bold border-l-4 border-amber-600 -ml-1 pl-3 shadow-xs"
                            : "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold border-l-4 border-emerald-600 -ml-1 pl-3 shadow-xs"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <Link
                        href={targetHref}
                        onClick={() => {
                          if (!isOpen) setManualExpanded(item.id);
                        }}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isParentActive
                              ? isSuperAdmin
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.id);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Toggle submenu"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                    </div>

                    {/* Submenu */}
                    {isOpen && (
                      <div className="ml-4 space-y-0.5 border-l border-border pl-3 pt-1 pb-1 animate-in fade-in duration-150">
                        {item.children!.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = isItemActive(sub.href);
                          const subTargetHref = getTargetHref(sub.href);

                          return (
                            <Link
                              key={sub.href}
                              href={subTargetHref}
                              onClick={onClose}
                              className={cn(
                                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                                isSubActive
                                  ? isSuperAdmin
                                    ? "bg-amber-100/60 dark:bg-amber-900/40 font-semibold text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-100/60 dark:bg-emerald-900/40 font-semibold text-emerald-700 dark:text-emerald-300"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {SubIcon && <SubIcon className="h-3.5 w-3.5 shrink-0" />}
                                <span className="truncate">{sub.label}</span>
                              </div>
                              {sub.badge && (
                                <span className={cn(
                                  "rounded px-1.5 py-0.2 text-[10px] font-bold text-white shadow-2xs",
                                  isSuperAdmin ? "bg-amber-600" : "bg-emerald-600"
                                )}>
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Logout Area */}
          <div className="shrink-0 space-y-2 border-t p-3 bg-muted/20">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>{isSuperAdmin ? "Sign Out Super Admin" : "Sign Out Admin"}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
