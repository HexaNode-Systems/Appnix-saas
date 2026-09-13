"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { config } from "@/lib/config";
import { useAuth } from "@/lib/auth/auth-context";
import { hasActiveSubscription } from "@/lib/subscription";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const token = searchParams.get("token");
  const refreshToken = searchParams.get("refreshToken");
  const authError = searchParams.get("error");

  const initialError = authError
    ? decodeURIComponent(authError)
    : !token
    ? "Authentication failed: No access token received."
    : null;

  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    // 1. Guard against executing callback on root or alias domains (appnix.co.in / www.appnix.co.in)
    // The authenticated session MUST be provisioned on the Client Portal origin (app.appnix.co.in)
    const hostname = window.location.hostname.toLowerCase();
    const isRootOrAliasDomain =
      hostname === "appnix.co.in" ||
      hostname === "www.appnix.co.in";

    if (isRootOrAliasDomain) {
      const appDomain = config.app.domains.app || "app.appnix.co.in";
      window.location.replace(`https://${appDomain}/auth/callback${window.location.search}`);
      return;
    }

    if (!token || authError) {
      return;
    }

    const processAuth = async () => {
      try {
        // 1. Persist tokens in localStorage on the client portal origin
        localStorage.setItem(config.auth.tokenKey, token);
        localStorage.setItem("appnix_access_token", token);
        localStorage.setItem("token", token);

        if (refreshToken) {
          localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
          localStorage.setItem("appnix_refresh_token", refreshToken);
          localStorage.setItem("refreshToken", refreshToken);
        }

        // 2. Set SameSite=Lax session cookies across the application domain
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        const isProdDomain = hostname.endsWith("appnix.co.in");
        const domainAttr = isProdDomain ? "; Domain=.appnix.co.in" : "";

        document.cookie = `appnix_access_token=${encodeURIComponent(token)}; Path=/; Max-Age=900; SameSite=Lax${domainAttr}${secure}`;
        document.cookie = `appnix_auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=900; SameSite=Lax${domainAttr}${secure}`;
        if (refreshToken) {
          document.cookie = `appnix_refresh_token=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=604800; SameSite=Lax${domainAttr}${secure}`;
        }

        // 3. Clean sensitive token parameters from the URL address bar & history immediately
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 4. Provision and sync authenticated user data with AuthContext
        await refreshUser();

        // 5. Determine post-authentication destination based on real subscription status from backend
        const storedUser = typeof window !== "undefined" ? localStorage.getItem(config.auth.userKey) : null;
        let parsedUser: any = null;
        try {
          parsedUser = storedUser ? JSON.parse(storedUser) : null;
        } catch {}

        let destination = "/dashboard";
        if (parsedUser?.role === "owner" || parsedUser?.role === "SUPER_ADMIN") {
          destination = "/super-admin/dashboard";
        } else if (
          parsedUser?.role === "admin" ||
          parsedUser?.role === "RESELLER_ADMIN" ||
          parsedUser?.tier === "PRIMARY_RESELLER" ||
          parsedUser?.tier === "SUB_RESELLER"
        ) {
          destination = "/admin/dashboard";
        } else {
          let workspaceId = parsedUser?.workspaceId || parsedUser?.tenantId;
          if (!workspaceId && token) {
            try {
              const parts = token.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                workspaceId = payload.tenantId || payload.workspaceId;
              }
            } catch {}
          }
          const active = await hasActiveSubscription(workspaceId, token);
          destination = active ? "/dashboard" : "/subscription";
        }

        // 6. DIRECT navigation to resolved destination
        // Avoid router.replace client-side RSC fetching across domains or stale router caches
        const targetUrl =
          hostname.includes("appnix.co.in") && !hostname.startsWith("app.")
            ? `https://${config.app.domains.app}${destination}`
            : destination;

        window.location.replace(targetUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to finalize authentication session.";
        setError(message);
      }
    };

    processAuth();
  }, [token, refreshToken, authError, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md p-6 text-center shadow-lg border-destructive/30">
          <CardContent className="space-y-4 pt-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Authentication Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild className="w-full mt-4">
              <Link href="/signin">Return to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Completing sign in...</h2>
        <p className="text-sm text-muted-foreground">Setting up your workspace session, please wait.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
