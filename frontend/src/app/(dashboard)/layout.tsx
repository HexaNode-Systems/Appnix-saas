"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppNavbar } from "@/components/layout/app-navbar";
import { GuestModeBanner } from "@/components/layout/GuestModeBanner";
import { MockCashfreeModalContainer } from "@/components/billing/mock-cashfree-modal";
import { useAuth } from "@/lib/auth/auth-context";
import { verifySubscriptionStatus } from "@/lib/subscription";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [isVerifyingSub, setIsVerifyingSub] = useState(true);
  const [hasSubAccess, setHasSubAccess] = useState(false);

  useEffect(() => {
    // If auth is still loading, wait
    if (isAuthLoading) return;

    // If no user, let auth guard handle it
    if (!user) {
      setIsVerifyingSub(false);
      return;
    }

    // 0. Active guest impersonation session always has dashboard access
    const isGuest = typeof window !== "undefined" && !!localStorage.getItem("appnix_guest_impersonation");
    if (isGuest) {
      setHasSubAccess(true);
      setIsVerifyingSub(false);
      return;
    }

    // 1. Super Admin and Partner/Reseller Admins always have unrestricted access
    const isSuperAdmin = user.role === "owner" || (user as any).role === "SUPER_ADMIN";
    const isReseller =
      user.role === "admin" ||
      (user as any).role === "RESELLER_ADMIN" ||
      (user as any).tier === "PRIMARY_RESELLER" ||
      (user as any).tier === "SUB_RESELLER";

    if (isSuperAdmin || isReseller) {
      setHasSubAccess(true);
      setIsVerifyingSub(false);
      return;
    }

    // 2. Billing checkout and status return pages are always accessible to complete onboarding
    const isBillingPath =
      pathname.startsWith("/workspace/billing/checkout") ||
      pathname.startsWith("/workspace/billing/status");

    if (isBillingPath) {
      setHasSubAccess(true);
      setIsVerifyingSub(false);
      return;
    }

    // 3. Check workspace subscription from server
    async function checkSubscription() {
      try {
        const workspaceId = user?.workspaceId || (user as any)?.tenantId;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("appnix_auth_token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("appnix_token") ||
              undefined
            : undefined;

        const subStatus = await verifySubscriptionStatus(workspaceId, token);

        if (subStatus.hasActiveSubscription) {
          setHasSubAccess(true);
          setIsVerifyingSub(false);
          return;
        }
      } catch (e: any) {
        console.warn("Subscription check notice:", e.message);
      }

      // No active subscription or expired/cancelled/suspended: block dashboard access and redirect to subscription selection
      setHasSubAccess(false);
      setIsVerifyingSub(false);
      router.replace("/subscription");
    }

    checkSubscription();
  }, [user, isAuthLoading, pathname, router]);

  // Loading state while verifying subscription
  if (isAuthLoading || isVerifyingSub) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-xs text-muted-foreground font-medium">
          Verifying workspace subscription...
        </p>
      </div>
    );
  }

  // If blocked from dashboard, show redirect notice until navigation finishes
  if (!hasSubAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-xs text-muted-foreground font-medium">
          Redirecting to plan selection...
        </p>
      </div>
    );
  }

  return (
    // OUTER: now flex-col (vertical) instead of flex (horizontal).
    // Navbar comes first, full width, on its own row.
    <div className="dashboard-shell">
      <GuestModeBanner />
      <MockCashfreeModalContainer />
      <AppNavbar onMenuClick={() => setSidebarOpen((p) => !p)} />

      {/* INNER: horizontal row for sidebar + main, placed BELOW the navbar */}
      <div className="flex flex-1 items-start">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}