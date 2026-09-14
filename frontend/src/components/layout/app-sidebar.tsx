"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LogoutConfirmModal } from "@/components/shared/LogoutConfirmModal";
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import {
  LayoutDashboard,
  ArrowLeftRight,
  LayoutGrid,
  Camera,
  ScanLine,
  Smartphone,
  Users,
  Bot,
  Zap,
  Grid3x3,
  MessageSquare,
  Headset,
  Building2,
  Share2,
  Settings,
  LogOut,
  X,
  ChevronDown,
  BarChart3,
  GitBranch,
  Database,
  FileText,
  KeyRound,
  Contact,
  ShieldCheck,
  Wallet,
  CreditCard,
  User,
  Bell,
  Shield,
  Palette,
  Plug,
  History,
  Send,
  Radio,
  Briefcase,
  MessageCircle,
  LifeBuoy,
  Sliders,
} from "lucide-react";

// Sub-item type for expandable menu sections
interface SubItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  children?: SubItem[];
}

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useTranslation();

  // Tracks which parent menu item (by id/label) is expanded.
  const [expanded, setExpanded] = useState<string | null>(null);

  // Main navigation items dynamically localized
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: t.sidebar.dashboard,
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "channels",
        label: t.sidebar.channels,
        href: "/channels",
        icon: Radio, // was ArrowLeftRight — "channels/broadcast" ke liye zyada sahi
        children: [
          { label: "All Channels", href: "/channels", icon: LayoutGrid },
          { label: "WhatsApp", href: "/channels/whatsapp", icon: FaWhatsapp }, // was MessageSquare
          {
            label: "Instagram",
            href: "/channels/instagram",
            icon: FaInstagram,
          }, // was Camera
          { label: "Facebook", href: "/channels/facebook", icon: FaFacebook }, // was ScanLine
          { label: "RCS", href: "/channels/rcs", icon: Smartphone },
        ],
      },
      {
        id: "crm",
        label: t.sidebar.crm,
        href: "/crm",
        icon: Users,
        children: [
          { label: "Contacts", href: "/crm/contacts", icon: Contact },
          { label: "Super Fields", href: "/crm/super-fields", icon: Sliders },
          { label: "Bulk Campaign", href: "/crm/bulk-campaign", icon: Send },
          { label: "Live Chat", href: "/crm/live-chat", icon: MessageSquare },
        ],
      },
      {
        id: "chatbots",
        label: t.sidebar.chatbots,
        href: "/chatbots",
        icon: Bot,
      },
      {
        id: "automations",
        label: t.sidebar.automations,
        href: "/automations",
        icon: Zap,
        children: [
          {
            label: "Analytics",
            href: "/automations/analytics",
            icon: BarChart3,
          },
          { label: "Workflow", href: "/automations/workflow", icon: GitBranch },
          {
            label: "Data Store",
            href: "/automations/datastore",
            icon: Database,
          },
          {
            label: "Templates",
            href: "/automations/templates",
            icon: FileText,
          },
          {
            label: "App Authentication",
            href: "/automations/app-authentication",
            icon: KeyRound,
          },
        ],
      },
      {
        id: "whatsapp-mini-apps",
        label: "WhatsApp Mini-Apps",
        href: "/whatsapp-mini-apps",
        icon: Grid3x3,
      },
      {
        id: "chat-widget",
        label: "Chat Widget",
        href: "/chat-widget",
        icon: MessageCircle,
      }, // was MessageSquare (duplicate with CRM > Live Chat)
      {
        id: "voice-ai-agent",
        label: t.sidebar.voiceAi,
        href: "/voice-ai-agent",
        icon: Headset,
      },
      {
        id: "department",
        label: t.sidebar.department,
        href: "/department",
        icon: Building2,
        children: [
          {
            label: "Analytics",
            href: "/department/analytics",
            icon: BarChart3,
          },
          {
            label: "Departments",
            href: "/department/departments",
            icon: Building2,
          },
          { label: "Roles", href: "/department/roles", icon: ShieldCheck },
        ],
      },
      {
        id: "workspace",
        label: t.sidebar.workspace,
        href: "/workspace",
        icon: Briefcase, // was Share2 — workspace ke liye zyada sahi
        children: [
          {
            label: "Account Settings",
            href: "/workspace/account-settings",
            icon: Settings,
          },
          {
            label: "Wallet & Transactions",
            href: "/workspace/wallet",
            icon: Wallet,
          },
          { label: "Billing", href: "/workspace/billing", icon: CreditCard },
          { label: "Support", href: "/workspace/support", icon: LifeBuoy }, // was Headset (duplicate with Voice AI Agent)
        ],
      },
      {
        id: "settings",
        label: t.sidebar.settings,
        href: "/settings",
        icon: Settings,
        children: [
          { label: "Profile", href: "/settings/profile", icon: User },
          {
            label: "Notifications",
            href: "/settings/notifications",
            icon: Bell,
          },
          { label: "Security", href: "/settings/security", icon: Shield },
          { label: "Appearance", href: "/settings/appearance", icon: Palette },
          { label: "Integrations", href: "/settings/integrations", icon: Plug },
          {
            label: "Activity Logs",
            href: "/settings/activity-logs",
            icon: History,
          },
          {
            label: "Account & Data",
            href: "/settings/account-data",
            icon: Database,
          },
        ],
      },
    ],
    [t],
  );

  // Auto-expand the parent whose child route matches the current path
  useEffect(() => {
    const activeParent = menuItems.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
        item.children?.some(
          (child) =>
            pathname === child.href ||
            (child.href !== item.href && pathname.startsWith(child.href + "/")),
        ),
    );
    if (activeParent && activeParent.children?.length) {
      setExpanded(activeParent.id);
    }
  }, [pathname, menuItems]);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/signin");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "app-surface fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 ease-in-out",
          "lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo row */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="brand-box">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-foreground">
                Appnix CRM
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {t.dashboard.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Outer content area*/}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Scrollable menu */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.sidebar.menu}
            </p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const isParentActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/")) ||
                  item.children?.some(
                    (c) =>
                      pathname === c.href ||
                      (c.href !== item.href &&
                        pathname.startsWith(c.href + "/")),
                  );
                const isOpen = expanded === item.id;

                // Item without children: render a plain link
                if (!hasChildren) {
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/dashboard" && pathname === "/products");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "sidebar-nav-item",
                        isActive
                          ? "sidebar-nav-item-active"
                          : "sidebar-nav-item-inactive",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                }

                // Item with children: render an expandable button + submenu
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className={cn(
                        "sidebar-nav-item w-full justify-between cursor-pointer",
                        isParentActive
                          ? "sidebar-nav-item-active"
                          : "sidebar-nav-item-inactive",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {/* Submenu: animated height via grid-rows trick */}
                    <div
                      className={cn(
                        "grid overflow-hidden transition-all duration-200 ease-in-out",
                        isOpen
                          ? "grid-rows-[1fr] opacity-100 mt-1"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-6.75 space-y-0.5 border-l border-border pl-4">
                          {item.children!.map((sub) => {
                            const isSubActive =
                              pathname === sub.href ||
                              (sub.href !== "/channels" &&
                                sub.href !== "/crm" &&
                                sub.href !== "/department" &&
                                sub.href !== "/workspace" &&
                                sub.href !== "/settings" &&
                                sub.href !== "/automations" &&
                                pathname.startsWith(sub.href + "/"));
                            const SubIcon = sub.icon;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onClose}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                                  isSubActive
                                    ? "bg-primary/10 font-medium text-primary border-l-2 border-primary -ml-4.5 pl-3"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                {SubIcon && (
                                  <SubIcon className="h-4 w-4 shrink-0" />
                                )}
                                <span className="truncate">{sub.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Fixed bottom section — never scrolls, always pinned to the bottom */}
          <div className="shrink-0 space-y-1 border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={handleOpenLogoutModal}
              className="sidebar-nav-item-danger w-full justify-start cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" />
              <span>{t.sidebar.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title={t.sidebar.logout || "Sign Out"}
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        isLoading={isLoggingOut}
      />
    </>
  );
}
