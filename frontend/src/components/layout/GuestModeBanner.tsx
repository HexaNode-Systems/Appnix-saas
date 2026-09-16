"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

interface GuestSession {
  isGuest: boolean;
  clientId: string;
  clientName: string;
  clientEmail: string;
  ownerName: string;
  plan: string;
  returnUrl?: string;
}

export function GuestModeBanner() {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appnix_guest_impersonation");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.isGuest) {
          setGuestSession(parsed);
        }
      }
    } catch {
      // ignore parsing error
    }
  }, []);

  if (!guestSession) return null;

  const handleExitGuestMode = () => {
    setIsExiting(true);
    try {
      const rawBackup = localStorage.getItem("appnix_guest_backup");
      if (rawBackup) {
        const backup = JSON.parse(rawBackup);

        // Restore auth tokens
        if (backup.authToken) {
          localStorage.setItem(config.auth.tokenKey, backup.authToken);
        } else {
          localStorage.removeItem(config.auth.tokenKey);
        }

        if (backup.refreshToken) {
          localStorage.setItem(config.auth.refreshTokenKey, backup.refreshToken);
        } else {
          localStorage.removeItem(config.auth.refreshTokenKey);
        }

        if (backup.user) {
          localStorage.setItem(config.auth.userKey, backup.user);
        } else {
          localStorage.removeItem(config.auth.userKey);
        }

        // Restore admin credentials
        if (backup.adminToken) {
          localStorage.setItem(config.auth.adminTokenKey, backup.adminToken);
          localStorage.setItem("appnix_admin_token", backup.adminToken);
        }
        if (backup.adminRefreshToken) {
          localStorage.setItem(config.auth.adminRefreshTokenKey, backup.adminRefreshToken);
        }
        if (backup.adminUser) {
          localStorage.setItem(config.auth.adminUserKey, backup.adminUser);
          localStorage.setItem("appnix_admin_user", backup.adminUser);
        }

        // Restore super-admin credentials if applicable
        if (backup.superAdminToken) {
          localStorage.setItem(config.auth.superAdminTokenKey, backup.superAdminToken);
        }
        if (backup.superAdminRefreshToken) {
          localStorage.setItem(config.auth.superAdminRefreshTokenKey, backup.superAdminRefreshToken);
        }
        if (backup.superAdminUser) {
          localStorage.setItem(config.auth.superAdminUserKey, backup.superAdminUser);
        }

        // Update cookie with active admin token
        const activeToken =
          backup.adminToken || backup.superAdminToken || backup.authToken;
        if (activeToken) {
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `appnix_access_token=${encodeURIComponent(activeToken)}; Path=/; SameSite=Lax${secure}`;
        }
      }
    } catch (e) {
      console.error("Failed to restore admin credentials upon exiting guest mode:", e);
    } finally {
      // Clear all guest session and impersonation keys
      localStorage.removeItem("appnix_guest_impersonation");
      localStorage.removeItem("appnix_guest_backup");
      localStorage.removeItem("appnix_impersonation_token");
      sessionStorage.removeItem("appnix_impersonation_token");

      let targetUrl = guestSession.returnUrl || "/admin/clients";
      if (!targetUrl.startsWith("http")) {
        const host = window.location.hostname;
        const portSuffix = window.location.port ? `:${window.location.port}` : "";
        const protocol = window.location.protocol;
        const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.endsWith(".local");
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "appnix.co.in";
        if (targetUrl.startsWith("/super-admin")) {
          const domain = isLocal ? `superadmin.localhost${portSuffix}` : (process.env.NEXT_PUBLIC_SUPERADMIN_DOMAIN || `superadmin.${rootDomain}`);
          targetUrl = `${protocol}//${domain}${targetUrl}`;
        } else if (targetUrl.startsWith("/admin")) {
          const domain = isLocal ? `partners.localhost${portSuffix}` : (process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `partners.${rootDomain}`);
          targetUrl = `${protocol}//${domain}${targetUrl}`;
        }
      }
      window.location.href = targetUrl;
    }
  };

  const isSuperAdminReturn = guestSession.returnUrl?.includes("super-admin");
  const exitLabel = isSuperAdminReturn ? "Exit to Super Admin" : "Exit to Admin Portal";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-emerald-500/30 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-4 py-2 text-white shadow-md text-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white font-bold">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-extrabold uppercase tracking-wide text-emerald-200">
            Guest Session Active:
          </span>
          <span className="font-semibold">
            Viewing workspace for{" "}
            <strong className="underline underline-offset-2">{guestSession.clientName}</strong>
          </span>
          <span className="text-white/80">
            ({guestSession.ownerName} • {guestSession.clientEmail})
          </span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            {guestSession.plan} Plan
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleExitGuestMode}
          disabled={isExiting}
          className="h-7 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
        >
          {isExiting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-900" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
          <span>{exitLabel}</span>
        </Button>
      </div>
    </div>
  );
}
