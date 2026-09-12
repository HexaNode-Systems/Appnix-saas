"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

export function ImpersonationBanner() {
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    try {
      // 1. Check localStorage / sessionStorage for impersonation token
      const impToken =
        sessionStorage.getItem("appnix_impersonation_token") ||
        localStorage.getItem("appnix_impersonation_token");

      if (impToken) {
        try {
          const parts = impToken.split(".");
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            if (payload?.isImpersonated || payload?.purpose === "super_admin_impersonation") {
              setIsImpersonated(true);
              return;
            }
          }
        } catch {
          // fallback to token presence
          setIsImpersonated(true);
          return;
        }
      }

      // 2. Check guest impersonation storage flag
      const guestFlag = localStorage.getItem("appnix_guest_impersonation");
      if (guestFlag) {
        setIsImpersonated(true);
        return;
      }

      // 3. Check document cookie
      if (document.cookie.includes("appnix_impersonation_token")) {
        setIsImpersonated(true);
        return;
      }
    } catch {
      setIsImpersonated(false);
    }
  }, []);

  if (!isImpersonated) {
    return null;
  }

  const handleExitSession = async () => {
    setIsExiting(true);
    try {
      // Call backend termination endpoint
      const apiUrl = `${config.api.baseUrl}/super-admin/impersonate/terminate`;
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("appnix_access_token") || ""}`,
        },
        credentials: "include",
      }).catch(() => null);
    } catch (err) {
      console.warn("Impersonation terminate call:", err);
    }

    // Clean up local session & tokens
    localStorage.removeItem("appnix_impersonation_token");
    sessionStorage.removeItem("appnix_impersonation_token");
    localStorage.removeItem("appnix_guest_impersonation");
    localStorage.removeItem("appnix_guest_backup");

    // Clear cookies
    document.cookie =
      "appnix_impersonation_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Redirect to super admin
    const host = window.location.hostname;
    const isLocal =
      host.includes("localhost") || host.includes("127.0.0.1") || host.endsWith(".local");
    const superAdminUrl = isLocal
      ? `${window.location.protocol}//superadmin.localhost${window.location.port ? ":" + window.location.port : ""}/super-admin/dashboard`
      : "https://superadmin.appnix.co.in/super-admin/dashboard";

    window.location.href = superAdminUrl;
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] w-full bg-amber-500 text-amber-950 font-medium px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm border-b border-amber-600/30 transition-all"
    >
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-900 shrink-0 animate-pulse" />
        <span>
          <strong>Super Admin Guest Mode:</strong> You are currently accessing this account in Super Admin Guest Mode (Audited Session).
        </span>
      </div>
      <Button
        onClick={handleExitSession}
        disabled={isExiting}
        size="sm"
        variant="outline"
        className="ml-3 h-7 px-2.5 text-xs font-semibold bg-amber-950 text-amber-50 border-amber-900 hover:bg-amber-900 hover:text-white shrink-0 gap-1.5 cursor-pointer shadow-sm"
      >
        {isExiting ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Exiting...
          </>
        ) : (
          <>
            <LogOut className="h-3 w-3" />
            Exit Session
          </>
        )}
      </Button>
    </div>
  );
}

export default ImpersonationBanner;
