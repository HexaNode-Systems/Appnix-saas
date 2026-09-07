"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Users,
  Building,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/axios";
import { FacebookPage, FacebookUserProfile } from "@/types/facebook-channel";
import { saveStoredFacebookUser, saveStoredFacebookPages } from "@/lib/facebook-channels";

function FacebookBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function FacebookOAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(errorParam);
  const [authUser, setAuthUser] = useState<FacebookUserProfile | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // If running in popup opened by ConnectFacebookModal, postMessage to parent and close
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      try {
        if (code) {
          window.opener.postMessage(
            { type: "META_FACEBOOK_AUTH_CODE", code },
            window.location.origin,
          );
          window.close();
          return;
        }
        if (errorParam) {
          window.opener.postMessage(
            { type: "META_FACEBOOK_AUTH_ERROR", error: errorParam },
            window.location.origin,
          );
          window.close();
          return;
        }
      } catch (err) {
        console.warn("Could not postMessage to opener window:", err);
      }
    }

    if (!code) {
      if (!errorParam) {
        setErrorMessage("No authorization code received from Meta.");
      }
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function exchangeToken() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const redirectUri = window.location.origin + "/channels/facebook/callback";
        const res = await api.post("/channels/facebook/oauth/exchange", {
          code,
          redirectUri,
        });

        const data = res.data?.data;
        if (isMounted) {
          const user = data?.user || null;
          const list = data?.pages || [];
          setAuthUser(user);
          setPages(list);

          if (user) saveStoredFacebookUser(user);
          if (list.length > 0) saveStoredFacebookPages(list);

          if (list.length === 0) {
            setErrorMessage(
              data?.guidance ||
                "No Facebook Pages found under your Meta account. Please ensure you have created a Facebook Page and have Admin privileges in Meta Business Suite.",
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.message ||
              "Failed to authenticate with Meta Graph API. The authorization code may have expired.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    exchangeToken();

    return () => {
      isMounted = false;
    };
  }, [code, errorParam]);

  const handleConnectPage = async (page: FacebookPage) => {
    try {
      setConnectingId(page.id);
      setErrorMessage(null);

      await api.post("/channels/facebook/connect", {
        pageId: page.id,
        pageName: page.name,
        accessToken: page.accessToken,
        category: page.category,
        avatarUrl: page.avatarUrl,
        botEnabled: true,
      });

      setSuccessMessage(
        `Successfully connected ${page.name}! Redirecting to Facebook dashboard...`,
      );

      setTimeout(() => {
        router.push("/channels/facebook");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to register Facebook Page in database.",
      );
      setConnectingId(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-xl space-y-6 text-center">
        {/* Header Icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <FacebookBrandIcon className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            Facebook Page Authorization
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Linking your Facebook Business Page with Appnix Messenger & Live Chat
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs font-medium text-foreground">
              Exchanging authorization code and discovering your Facebook Pages...
            </p>
            <p className="text-[11px] text-muted-foreground">
              Validating Page Access Tokens with Meta Graph API
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive text-left space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                <span>Connection Notice</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 text-left text-xs space-y-2">
              <p className="font-semibold text-foreground">Requirements Checklist:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
                <li>You must have an active Admin or Editor role on the Facebook Page.</li>
                <li>The Facebook Page must be published and unrestricted.</li>
                <li>Grant messaging permissions during the Meta OAuth consent dialog.</li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/channels/facebook">
                <Button variant="outline" size="sm" className="text-xs">
                  Back to Channels
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Discovered Pages Selection */}
        {!isLoading && !errorMessage && pages.length > 0 && !successMessage && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Select Facebook Page to Connect ({pages.length} found):
              </span>
              <Badge variant="outline" className="text-[10px]">
                Meta Graph API Verified
              </Badge>
            </div>

            <div className="space-y-3">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 transition-all hover:border-[#1877F2]/50 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="h-11 w-11 rounded-xl object-cover ring-2 ring-blue-500/30 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-foreground text-sm truncate">
                          {p.name}
                        </p>
                        {p.isConnectedToCurrentWorkspace && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.category} • {(p.followerCount / 1000).toFixed(1)}k Followers
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Page ID: {p.id}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={connectingId === p.id}
                    onClick={() => handleConnectPage(p)}
                    className="text-xs font-semibold bg-[#1877F2] hover:bg-[#1877F2]/90 text-white gap-1.5 shrink-0"
                  >
                    {connectingId === p.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>{p.isConnectedToCurrentWorkspace ? "Re-connect" : "Connect"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FacebookOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <FacebookOAuthCallbackContent />
    </Suspense>
  );
}
