"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogoutConfirmModal } from "@/components/shared/LogoutConfirmModal";
import { FaWhatsapp } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/landing/language-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Menu,
  ScanLine,
  Maximize2,
  Bell,
  Users,
  User,
  LogOut,
  ChevronDown,
  Briefcase,
  Sliders,
  Clock,
  MessageSquare,
  Wallet,
  Inbox,
} from "lucide-react";

interface AppNavbarProps {
  // Toggles the mobile sidebar drawer, lifted from the parent shell.
  onMenuClick: () => void;
}

export function AppNavbar({ onMenuClick }: AppNavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      setIsLoggingOut(false);
      router.push("/signin");
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <header className="app-surface sticky top-0 z-30 flex h-16 items-stretch border-b">
      {/* Brand column: width-matched to the sidebar (w-64) on desktop so the
          right border lines up with the sidebar's border below it. */}
      <div className="hidden shrink-0 items-center gap-2 border-r border-border px-4 lg:flex lg:w-64">
        <div className="brand-box">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-tight text-foreground">
            Appnix CRM
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {t.dashboard.title}
          </p>
        </div>
      </div>

      {/* Right side of the header: hamburger, search, icons, user */}
      <div className="flex flex-1 items-center gap-3 px-3 sm:px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search bar: grows to fill space, shrinks gracefully on small screens */}
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t.dashboard.searchPlaceholder}
            className="navbar-search-input"
          />
        </div>

        {/* Right-side icons + language selector + user */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Language Selector Dropdown in Dashboard Header */}
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>

          <button
            className="navbar-icon-btn"
            aria-label="Scan"
            onClick={() => alert("Scanner & QR Code tool")}
          >
            <ScanLine className="h-4.5 w-4.5" />
          </button>
          <button
            className="navbar-icon-btn"
            aria-label="Fullscreen"
            onClick={handleToggleFullscreen}
          >
            <Maximize2 className="h-4.5 w-4.5" />
          </button>
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="navbar-icon-btn relative outline-none cursor-pointer data-[state=open]:bg-accent"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive sm:right-1.5 sm:top-1.5 ring-2 ring-background animate-pulse" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-80 sm:w-96 p-2 shadow-xl z-50"
            >
              {/* Header with Title & Badge */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">
                    Notifications
                  </span>
                  <Badge className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.2">
                    3 New
                  </Badge>
                </div>

                <Link
                  href="/notifications"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All →
                </Link>
              </div>

              {/* 45-Day Retention Notice */}
              <div className="mx-1 my-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  Notifications are automatically removed after{" "}
                  <strong>45 days</strong>.
                </span>
              </div>

              {/* Recent Notifications Quick Stream */}
              <div className="space-y-1 my-1 max-h-64 overflow-y-auto divide-y divide-border/40">
                <DropdownMenuItem asChild>
                  <Link
                    href="/crm/campaigns"
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 mt-0.5 text-[#25D366]">
                      <FaWhatsapp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        Meta WhatsApp Campaign Completed
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        Dispatched to 12,450 recipients (98.4% delivered)
                      </p>
                      <span className="text-[10px] text-muted-foreground/80">
                        10 mins ago
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/crm/live-chat"
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0 mt-0.5 text-blue-600">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        Customer Escalation in Live Chat
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        Nourin Sodawala requested live human assistance
                      </p>
                      <span className="text-[10px] text-muted-foreground/80">
                        45 mins ago
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/workspace/wallet"
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        Wallet Top-up Successful
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        ₹5,000 added via UPI. Balance: ₹12,450
                      </p>
                      <span className="text-[10px] text-muted-foreground/80">
                        2 hours ago
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              {/* Dedicated Notifications Hub Link */}
              <div className="p-1">
                <Button
                  size="sm"
                  asChild
                  className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Link href="/notifications">
                    <Inbox className="h-3.5 w-3.5" />
                    Open Full Notification Center
                  </Link>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown Menu */}
          <div className="ml-1 border-l border-border pl-1.5 sm:pl-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="group flex items-center gap-2 rounded-lg py-1 px-1.5 sm:px-2 transition-colors hover:bg-accent/60 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary data-[state=open]:bg-accent/80">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                    {user?.name || "Harshit Admin"}
                  </p>
                  <p className="text-xs capitalize leading-tight text-muted-foreground">
                    {user?.role || "Owner"}
                  </p>
                </div>
                <Image
                  src="/avatar-placeholder.png"
                  alt={user?.name || "User"}
                  width={36}
                  height={36}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-border transition-all group-hover:ring-2 group-hover:ring-primary sm:h-9 sm:w-9"
                />
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg">
                {/* User Info Header */}
                <DropdownMenuLabel className="font-normal px-2 py-2">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold leading-none text-foreground truncate max-w-[150px]">
                        {user?.name || "Harshit Admin"}
                      </p>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] uppercase font-bold px-1.5 py-0.2">
                        {user?.role || "Owner"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || "harshit@appnix.io"}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Profile Option */}
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-sm text-foreground hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">Profile</span>
                      <span className="text-[10px] text-muted-foreground">
                        Personal details & credentials
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                {/* Manage Members Option */}
                <DropdownMenuItem asChild>
                  <Link
                    href="/department/roles"
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-sm text-foreground hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">
                        Manage Members
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Team seats, roles & access
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                {/* Workspace Settings Option */}
                <DropdownMenuItem asChild>
                  <Link
                    href="/workspace/account-settings"
                    className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-sm text-foreground hover:bg-accent focus:bg-accent transition-colors"
                  >
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">
                        Workspace Settings
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Plan, billing & API keys
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Logout Option */}
                <DropdownMenuItem
                  onClick={handleOpenLogoutModal}
                  className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-md text-sm text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-xs">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>

    <LogoutConfirmModal
      isOpen={isLogoutModalOpen}
      onClose={() => setIsLogoutModalOpen(false)}
      onConfirm={handleConfirmLogout}
      title="Log out"
      message="Are you sure you want to log out of your account?"
      confirmText="Log out"
      cancelText="Cancel"
      isLoading={isLoggingOut}
    />
  </>
);
}
