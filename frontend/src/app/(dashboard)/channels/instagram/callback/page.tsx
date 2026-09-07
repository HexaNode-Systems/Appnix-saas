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
import {
  InstagramDiscoveredAccount,
  InstagramUserProfile,
} from "@/types/instagram-channel";
import {
  saveStoredInstagramUser,
  saveStoredInstagramAccounts,
  markInstagramAccountAsConnected,
} from "@/lib/instagram-channels";

function InstagramBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function InstagramOAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(errorParam);
  const [authUser, setAuthUser] = useState<InstagramUserProfile | null>(null);
  const [accounts, setAccounts] = useState<InstagramDiscoveredAccount[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // If running in popup opened by ConnectInstagramModal, postMessage to parent and close
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      try {
        if (code) {
          window.opener.postMessage(
            { type: "META_INSTAGRAM_AUTH_CODE", code },
            "*",
          );
          window.close();
          return;
        }
        if (errorParam) {
          window.opener.postMessage(
            { type: "META_INSTAGRAM_AUTH_ERROR", error: errorParam },
            "*",
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

        const redirectUri = window.location.origin + "/channels/instagram/callback";
        const res = await api.post("/channels/instagram/oauth/exchange", {
          code,
          redirectUri,
        });

        const data = res.data?.data;
        if (isMounted) {
          const user = data?.user || null;
          const list = data?.accounts || [];
          setAuthUser(user);
          setAccounts(list);

          if (user) saveStoredInstagramUser(user);
          if (list.length > 0) saveStoredInstagramAccounts(list);

          if (list.length === 0) {
            setErrorMessage(
              data?.guidance ||
                "No Instagram Professional accounts found linked to your Facebook Pages. Please ensure your Instagram account is linked to a Facebook Page in Meta Business Suite.",
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.message ||
              "Failed to authenticate with Meta Graph API. The code may have expired.",
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

  const handleConnectAccount = async (account: InstagramDiscoveredAccount) => {
    try {
      setConnectingId(account.instagramBusinessId);
      setErrorMessage(null);

      await api.post("/channels/instagram/connect", {
        instagramBusinessId: account.instagramBusinessId,
        pageId: account.pageId,
        username: account.username,
        name: account.name,
        profilePictureUrl: account.profilePictureUrl,
        accessToken: account.accessToken,
      });

      markInstagramAccountAsConnected(account.instagramBusinessId);

      setSuccessMessage(
        `Successfully connected @${account.username}! Redirecting to Instagram dashboard...`,
      );

      setTimeout(() => {
        router.push("/channels/instagram");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to register Instagram account in database.",
      );
      setConnectingId(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-xl space-y-6 text-center">
        {/* Header Icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
          <InstagramBrandIcon className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            Meta Instagram Authorization
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Linking your Instagram Professional Account with Appnix Comment-to-DM Engine
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs font-medium text-foreground">
              Exchanging authorization code and discovering linked Instagram accounts...
            </p>
            <p className="text-[11px] text-muted-foreground">
              Validating long-lived token with Meta Graph API v21.0
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
              <p className="font-semibold text-foreground">Troubleshooting Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
                <li>Open your Instagram mobile app &gt; Settings &gt; Account Type &gt; Switch to Professional Account.</li>
                <li>Go to your Facebook Page &gt; Settings &gt; Linked Accounts &gt; Connect Instagram.</li>
                <li>Ensure you have Admin permissions on both the Page and Instagram account.</li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/channels/instagram">
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

        {/* Discovered Accounts Selection */}
        {!isLoading && !errorMessage && accounts.length > 0 && !successMessage && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Select Instagram Account to Connect ({accounts.length} found):
              </span>
              <Badge variant="outline" className="text-[10px]">
                Meta Graph API Verified
              </Badge>
            </div>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.instagramBusinessId}
                  className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 transition-all hover:border-primary/50 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    {acc.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={acc.profilePictureUrl}
                        alt={acc.username}
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-pink-500/30"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                        {acc.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground text-sm">
                          @{acc.username}
                        </p>
                        {acc.isAlreadyConnected && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {acc.name} • Linked Page: <strong>{acc.pageName}</strong>
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        IG ID: {acc.instagramBusinessId}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={connectingId === acc.instagramBusinessId}
                    onClick={() => handleConnectAccount(acc)}
                    className="text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shrink-0"
                  >
                    {connectingId === acc.instagramBusinessId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>{acc.isAlreadyConnected ? "Re-connect" : "Connect"}</span>
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

export default function InstagramOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InstagramOAuthCallbackContent />
    </Suspense>
  );
}
