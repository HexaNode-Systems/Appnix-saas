"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  MessageSquare,
  Bot,
  Layers,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  Copy,
  Sliders,
  Building,
  Loader2,
  Lock,
  AlertTriangle,
  CheckSquare,
  ScanLine,
  Camera,
  Send,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  InstagramDiscoveredAccount,
  InstagramUserProfile,
  ConnectInstagramStep,
  InstagramWebhookHandshakeStep,
} from "@/types/instagram-channel";
import {
  INSTAGRAM_COLOR_SWATCH_PRESETS,
  getStoredInstagramUser,
  saveStoredInstagramUser,
  getStoredInstagramAccounts,
  saveStoredInstagramAccounts,
  markInstagramAccountAsConnected,
} from "@/lib/instagram-channels";
import { Channel } from "@/components/channels/channel-manager";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";

interface ConnectInstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  onChannelCreated?: (newChannel: Channel) => void;
  existingChannels?: Channel[];
}

function InstagramBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function ConnectInstagramModal({
  isOpen,
  onClose,
  onConnected,
  onChannelCreated,
  existingChannels = [],
}: ConnectInstagramModalProps) {
  // Stepper State
  const [step, setStep] = useState<ConnectInstagramStep>("AUTH");

  // Auth Mode State: "oauth" | "token"
  const [authMode, setAuthMode] = useState<"oauth" | "token">("oauth");
  const [customConfigId, setCustomConfigId] = useState("");
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Direct Token State
  const [manualToken, setManualToken] = useState("");
  const [manualAccountOrPageId, setManualAccountOrPageId] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerifyError, setTokenVerifyError] = useState<string | null>(null);

  // Auth State
  const [authUser, setAuthUser] = useState<InstagramUserProfile | null>(() =>
    getStoredInstagramUser()
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Accounts Selection State
  const [accounts, setAccounts] = useState<InstagramDiscoveredAccount[]>(() =>
    getStoredInstagramAccounts()
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);

  // Configuration State
  const [channelName, setChannelName] = useState("");
  const [colorCode, setColorCode] = useState("#E1306C"); // Instagram Rose default
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello @{{username}}! Thanks for messaging our Instagram. How can we help you today?"
  );

  // Provisioning State
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [handshakeSteps, setHandshakeSteps] = useState<InstagramWebhookHandshakeStep[]>([
    { id: "token", label: "Generating long-lived token via Meta Graph API v21.0", status: "pending" },
    { id: "webhook", label: "Registering Appnix Webhook (https://api.appnix.co.in/api/v1/webhooks/instagram)", status: "pending" },
    { id: "subscribe", label: "Subscribing to comments, messages, and mentions", status: "pending" },
    { id: "router", label: "Activating Comment-to-DM Engine & Live Chat Inbox", status: "pending" },
  ]);

  // Close Confirmation Prompt State
  const [showClosePrompt, setShowClosePrompt] = useState(false);

  // Synchronize initial account state
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.instagramBusinessId === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.username.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.instagramBusinessId.includes(q) ||
          a.pageName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accounts, searchQuery]);

  // Handle Close Attempt (with confirmation if in progress)
  const handleAttemptClose = () => {
    if (step === "CONFIGURE" || step === "PROVISIONING") {
      setShowClosePrompt(true);
    } else {
      onClose();
    }
  };

  // 1. Authenticate with Meta via OAuth popup / redirect
  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    const redirectUri = window.location.origin + "/channels/instagram/callback";
    const configParam = customConfigId.trim()
      ? `&configId=${encodeURIComponent(customConfigId.trim())}`
      : "";

    try {
      const res = await api.get(
        `/channels/instagram/oauth/url?redirectUri=${encodeURIComponent(redirectUri)}${configParam}`
      );
      const oauthUrl = res.data?.data?.oauthUrl;

      if (!oauthUrl) {
        throw new Error("Could not retrieve Meta authorization URL from backend.");
      }

      // Setup window postMessage listener for popup callback
      const onMessage = async (event: MessageEvent) => {
        const isAllowedOrigin =
          event.origin === window.location.origin ||
          (window.location.hostname.includes("localhost") && event.origin.includes("localhost"));
        if (!isAllowedOrigin) return;

        if (event.data?.type === "META_INSTAGRAM_AUTH_CODE") {
          window.removeEventListener("message", onMessage);
          const code = event.data.code;

          try {
            const exchangeRes = await api.post("/channels/instagram/oauth/exchange", {
              code,
              redirectUri,
            });
            const data = exchangeRes.data?.data;
            const user = data?.user || null;
            const list = data?.accounts || [];

            setAuthUser(user);
            setAccounts(list);
            if (user) saveStoredInstagramUser(user);
            if (list.length > 0) saveStoredInstagramAccounts(list);

            setIsAuthenticating(false);
            setStep("SELECT_ACCOUNT");
          } catch (exchangeErr: any) {
            setIsAuthenticating(false);
            setAuthError(
              exchangeErr.response?.data?.message || "Failed to exchange Meta authorization code."
            );
          }
        } else if (event.data?.type === "META_INSTAGRAM_AUTH_ERROR") {
          window.removeEventListener("message", onMessage);
          setIsAuthenticating(false);
          setAuthError(
            event.data.error || "Meta authentication was canceled or permission was denied."
          );
        }
      };

      window.addEventListener("message", onMessage);

      // Open OAuth in centered popup
      const width = 650;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        oauthUrl,
        "meta_instagram_oauth",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
      );

      // Detect if user closed the popup window manually
      const checkPopupClosed = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener("message", onMessage);
          setIsAuthenticating(false);
        }
      }, 1000);

      // Fallback: If popup is blocked by browser, redirect current window
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        clearInterval(checkPopupClosed);
        window.location.href = oauthUrl;
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setAuthError(
        err.response?.data?.message || err.message || "Failed to initialize Meta authorization."
      );
    }
  };

  // Direct Token Verification (Meta Graph API)
  const handleVerifyManualToken = async () => {
    if (!manualToken.trim()) {
      setTokenVerifyError("Please paste a valid Meta Page or Instagram Access Token.");
      return;
    }

    setIsVerifyingToken(true);
    setTokenVerifyError(null);

    try {
      const res = await api.post("/channels/instagram/verify-token", {
        accessToken: manualToken.trim(),
        instagramBusinessId: manualAccountOrPageId.trim() || undefined,
        pageId: manualAccountOrPageId.trim() || undefined,
      });

      const data = res.data;
      if (data?.success) {
        const verifiedAccounts: InstagramDiscoveredAccount[] =
          data.accounts || data.data?.accounts || [];
        const user = data.user || data.data?.user || null;

        if (user) {
          setAuthUser(user);
          saveStoredInstagramUser(user);
        }

        if (verifiedAccounts.length > 0) {
          setAccounts(verifiedAccounts);
          saveStoredInstagramAccounts(verifiedAccounts);

          if (verifiedAccounts.length === 1) {
            setSelectedAccountId(verifiedAccounts[0].instagramBusinessId);
            setChannelName(`@${verifiedAccounts[0].username}`);
            setStep("CONFIGURE");
          } else {
            setStep("SELECT_ACCOUNT");
          }
        } else {
          setTokenVerifyError("No Instagram Professional accounts found associated with this access token.");
        }
      }
    } catch (err: any) {
      setTokenVerifyError(
        err.response?.data?.message ||
          err.message ||
          "Failed to verify Instagram access token with Meta Graph API."
      );
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // Switch / Logout Meta Account
  const handleSwitchAccount = () => {
    setAuthUser(null);
    saveStoredInstagramUser(null);
    setSelectedAccountId(null);
    setAccounts([]);
    saveStoredInstagramAccounts([]);
    setStep("AUTH");
  };

  // Refresh Accounts List
  const handleRefreshAccounts = () => {
    setIsRefreshingAccounts(true);
    try {
      const stored = getStoredInstagramAccounts();
      setAccounts(stored);
    } finally {
      setIsRefreshingAccounts(false);
    }
  };

  // Account Selection Proceed
  const handleSelectAccount = (account: InstagramDiscoveredAccount) => {
    if (account.isConnectedToCurrentWorkspace || account.isAlreadyConnected) return;
    setSelectedAccountId(account.instagramBusinessId);
    setChannelName(`@${account.username}`);
  };

  const handleProceedToConfigure = () => {
    if (!selectedAccount) return;
    setChannelName(`@${selectedAccount.username}`);
    setStep("CONFIGURE");
  };

  // Provisioning & Webhook Execution
  const executeProvisioningHandshake = async () => {
    if (!selectedAccount || !channelName.trim()) return;

    setStep("PROVISIONING");
    setProvisioningError(null);
    setProvisioningProgress(20);

    // Step 1: Token Handshake
    setHandshakeSteps((prev) =>
      prev.map((s, i) => (i === 0 ? { ...s, status: "in_progress" } : { ...s, status: "pending" }))
    );

    try {
      setTimeout(() => {
        setHandshakeSteps((prev) =>
          prev.map((s, i) =>
            i === 0
              ? { ...s, status: "completed" }
              : i === 1
              ? { ...s, status: "in_progress" }
              : s
          )
        );
        setProvisioningProgress(50);
      }, 500);

      setTimeout(() => {
        setHandshakeSteps((prev) =>
          prev.map((s, i) =>
            i <= 1
              ? { ...s, status: "completed" }
              : i === 2
              ? { ...s, status: "in_progress" }
              : s
          )
        );
        setProvisioningProgress(75);
      }, 1000);

      // Real backend connection & webhook auto-subscription
      await api.post("/channels/instagram/connect", {
        instagramBusinessId: selectedAccount.instagramBusinessId,
        pageId: selectedAccount.pageId,
        username: selectedAccount.username,
        name: selectedAccount.name || selectedAccount.username,
        profilePictureUrl: selectedAccount.profilePictureUrl,
        accessToken: selectedAccount.accessToken,
        channelName: channelName.trim(),
        colorCode,
        autoReplyEnabled,
        welcomeMessage: welcomeMessage.trim(),
      });

      setHandshakeSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      setProvisioningProgress(100);

      // Create new active Channel Object for ChannelManager
      const newChannel: Channel = {
        id: `ig_${selectedAccount.instagramBusinessId}`,
        type: "instagram",
        name: channelName.trim(),
        subtitle: `@${selectedAccount.username}`,
        status: "connected",
        topRight: { label: "Professional Account", sub: "Instagram Direct" },
        fields: [
          { label: "Account Handle", value: `@${selectedAccount.username}`, icon: Camera },
          { label: "Linked Page", value: selectedAccount.pageName || "Facebook Page", icon: Building },
          {
            label: "Comment-to-DM",
            value: autoReplyEnabled ? "Active (Auto-Reply)" : "Manual Live Chat",
            icon: Bot,
          },
          { label: "Direct Sync", value: "Active", icon: ScanLine },
        ],
        actions: [],
      };

      markInstagramAccountAsConnected(selectedAccount.instagramBusinessId);
      onChannelCreated?.(newChannel);
      onConnected?.();
      setStep("SUCCESS");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Failed to connect Instagram account and configure Meta Webhooks.";
      setProvisioningError(msg);
      setHandshakeSteps((prev) =>
        prev.map((s) => (s.status === "in_progress" ? { ...s, status: "failed" } : s))
      );
    }
  };

  const handleCopyAccountId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedAccountId(id);
    setTimeout(() => setCopiedAccountId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Confirmation Modal if user attempts to close while configured */}
      {showClosePrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-2xl space-y-3 animate-in zoom-in-95 text-xs">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>Discard Instagram Setup?</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You are currently configuring <strong>@{selectedAccount?.username || "your Instagram account"}</strong>. Discarding will cancel token provisioning and close the wizard.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClosePrompt(false)}
                className="h-8 text-xs"
              >
                Continue Setup
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowClosePrompt(false);
                  onClose();
                }}
                className="h-8 text-xs"
              >
                Discard & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Wizard Dialog Container */}
      <div className="w-full max-w-2xl rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col my-6 animate-in zoom-in-95 duration-200">
        {/* 1. Persistent Header */}
        <div className="p-5 border-b bg-muted/20 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <InstagramBrandIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Connect Instagram Business Account</span>
                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                    Official Meta Graph API v21.0
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enable Comment-to-DM triggers, automated replies, and omnichannel live chat.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleAttemptClose}
              disabled={step === "PROVISIONING"}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Guided Step Progress Indicator */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
            {[
              { id: "AUTH", stepNum: "1", label: "Authenticate" },
              { id: "SELECT_ACCOUNT", stepNum: "2", label: "Select Account" },
              { id: "CONFIGURE", stepNum: "3", label: "Configure Channel" },
            ].map((s, idx) => {
              const stepMap = { AUTH: 0, SELECT_ACCOUNT: 1, CONFIGURE: 2, PROVISIONING: 2, SUCCESS: 3 };
              const currentIdx = stepMap[step];
              const isPassed = currentIdx > idx;
              const isCurrent = currentIdx === idx;

              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <div
                    className={cn(
                      "h-1.5 w-full rounded-full transition-all duration-300",
                      isPassed
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-gradient-to-r from-rose-500 to-purple-600"
                        : "bg-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold truncate",
                      isCurrent
                        ? "text-rose-600 dark:text-rose-400"
                        : isPassed
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    )}
                  >
                    ({s.stepNum}) {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Wizard Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5 text-xs">
          {/* STEP 1: AUTHENTICATION & PERMISSIONS HANDSHAKE */}
          {step === "AUTH" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Connection Mode Selection Tabs */}
              {!authUser && (
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("oauth");
                      setAuthError(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs transition-all",
                      authMode === "oauth"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                    <span>1-Click Meta OAuth</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("token");
                      setTokenVerifyError(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs transition-all",
                      authMode === "token"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Direct Access Token (Developer / Sandbox)</span>
                  </button>
                </div>
              )}

              {/* OAuth Error Banner */}
              {authError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 space-y-2 text-rose-800 dark:text-rose-200 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Authentication Notice</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{authError}</p>
                    </div>
                    <button
                      onClick={() => setAuthError(null)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/50 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      Need direct connection? Connect using an Access Token instead:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAuthError(null);
                        setAuthMode("token");
                      }}
                      className="h-7 text-[11px] bg-white dark:bg-card border-rose-300 text-rose-800 hover:bg-rose-100 font-semibold"
                    >
                      Switch to Direct Token
                    </Button>
                  </div>
                </div>
              )}

              {/* MODE 1: OAUTH FLOW */}
              {authMode === "oauth" && (
                <>
                  {/* Visual Overview & Security Badge */}
                  <div className="rounded-2xl border bg-gradient-to-br from-rose-50/50 via-pink-50/30 to-purple-50/40 dark:from-rose-950/30 dark:to-purple-950/20 p-5 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                          <InstagramBrandIcon className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            Meta OAuth 2.0 Permissions Handshake
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Connect your Meta account to discover linked Instagram Professional accounts.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-background/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px] gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Meta Verified App</span>
                      </Badge>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-foreground block mb-2">
                        Official Meta Graph API Permissions Requested:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>instagram_manage_comments</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Instantly detect comments on posts and dispatch public replies automatically.
                          </p>
                        </div>

                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>instagram_manage_messages</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Send private DM links, brochures, and pricing to comment authors in under 3 seconds.
                          </p>
                        </div>

                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>instagram_basic</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Read Instagram account profile metadata, handle, followers, and business ID.
                          </p>
                        </div>

                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>pages_show_list</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Discover Facebook Pages you manage and their connected Instagram Professional accounts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements Notice */}
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Requirements Before Connecting:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[10px]">
                        <li>Your Instagram account must be a <strong>Professional (Business or Creator)</strong> account.</li>
                        <li>Your Instagram account must be connected to a <strong>Facebook Page</strong> you manage in Meta Business Suite.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Authenticated User Status Card (if logged in) */}
                  {authUser ? (
                    <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        {authUser.avatarUrl ? (
                          <img
                            src={authUser.avatarUrl}
                            alt={authUser.name}
                            className="h-10 w-10 rounded-full object-cover border ring-2 ring-rose-500/20"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-rose-500/20">
                            {authUser.name?.slice(0, 2).toUpperCase() || "IG"}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-foreground text-xs">{authUser.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{authUser.email}</p>
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                            <Check className="h-3 w-3" /> Meta Session Active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSwitchAccount}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Log in as different user
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setStep("SELECT_ACCOUNT")}
                          className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-semibold gap-1.5 shadow-sm text-xs"
                        >
                          <span>Continue as {authUser.name.split(" ")[0]}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Primary OAuth Login Trigger */
                    <div className="space-y-3 text-center py-3">
                      <Button
                        type="button"
                        onClick={handleAuthenticate}
                        disabled={isAuthenticating}
                        className="w-full sm:w-auto px-8 h-11 bg-gradient-to-r from-blue-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-rose-500/20 gap-2.5"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Connecting to Meta accounts...</span>
                          </>
                        ) : (
                          <>
                            <FacebookBrandIcon className="h-5 w-5" />
                            <span>Log in with Facebook & Connect Instagram</span>
                          </>
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        An official Meta OAuth dialog will open in a popup window to authorize your linked Instagram accounts.
                      </p>

                      {/* Advanced Configuration ID Toggle */}
                      <div className="pt-2 text-left max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium mx-auto"
                        >
                          <span>{showAdvancedConfig ? "Hide" : "Show"} Advanced: Meta Configuration ID (`config_id`)</span>
                        </button>
                        {showAdvancedConfig && (
                          <div className="mt-2 p-3 rounded-xl border bg-muted/30 space-y-1.5 text-xs animate-in fade-in">
                            <label className="text-[11px] font-semibold text-foreground">
                              Facebook Login for Business Configuration ID
                            </label>
                            <Input
                              placeholder="e.g. 2343296023089838"
                              value={customConfigId}
                              onChange={(e) => setCustomConfigId(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              If your Meta App uses custom Facebook Login configurations, enter your Configuration ID here.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODE 2: DIRECT PAGE / INSTAGRAM ACCESS TOKEN */}
              {authMode === "token" && (
                <div className="space-y-4 rounded-2xl border bg-card p-5 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Lock className="h-4 w-4 text-amber-500" />
                          <span>Direct Access Token Connection</span>
                        </h4>
                        <Badge variant="outline" className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200">
                          Instant Connect
                        </Badge>
                      </div>
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Graph API Explorer</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Bypass Meta OAuth dialog restrictions by entering your Page or Instagram Access Token directly. Appnix will verify the token live with Meta Graph API and discover connected Instagram Professional accounts.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground text-[11px] flex items-center justify-between">
                      <span>Page / User Access Token *</span>
                      <span className="text-[10px] text-muted-foreground">Starts with EAA...</span>
                    </label>
                    <Textarea
                      placeholder="Paste your Meta Access Token (EAA...)"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="font-mono text-xs h-24 resize-none bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground text-[11px]">
                      Instagram Business Account ID or Facebook Page ID (Optional, auto-detected)
                    </label>
                    <Input
                      placeholder="e.g. 17841405309211844 or 102938475610293"
                      value={manualAccountOrPageId}
                      onChange={(e) => setManualAccountOrPageId(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>

                  {tokenVerifyError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Token Verification Failed</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed">{tokenVerifyError}</p>
                      </div>
                      <button
                        onClick={() => setTokenVerifyError(null)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleVerifyManualToken}
                    disabled={isVerifyingToken || !manualToken.trim()}
                    className="w-full bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs"
                  >
                    {isVerifyingToken ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying Token with Meta Graph API...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verify &amp; Discover Instagram Accounts</span>
                      </>
                    )}
                  </Button>

                  {/* Token Generation Helper */}
                  <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 border text-[11px]">
                    <span className="font-semibold text-foreground block">
                      How to get a Token in Meta Graph API Explorer:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[10px]">
                      <li>Open Meta Graph API Explorer and select your App.</li>
                      <li>Under Permissions, add <code>instagram_basic</code>, <code>instagram_manage_comments</code>, and <code>instagram_manage_messages</code>.</li>
                      <li>Click <strong>Generate Access Token</strong> and grant permissions for your Page and Instagram account.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT INSTAGRAM ACCOUNT */}
          {step === "SELECT_ACCOUNT" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* User Account Toolbar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-2.5">
                  {authUser?.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser?.name || "Meta User"}
                      className="h-7 w-7 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {authUser?.name?.slice(0, 2).toUpperCase() || "IG"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-xs">
                      {authUser?.name ? `Logged in as ${authUser.name}` : "Discovered Meta Accounts"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {accounts.length} Instagram Professional {accounts.length === 1 ? "account" : "accounts"} discovered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshAccounts}
                    disabled={isRefreshingAccounts}
                    className="text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRefreshingAccounts && "animate-spin")} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="text-primary hover:underline text-[11px] font-semibold ml-2"
                  >
                    Switch Account
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search accounts by @username, name, or Page name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Accounts Directory List */}
              <div className="space-y-2.5">
                {filteredAccounts.length === 0 ? (
                  /* Empty State: No Instagram accounts found */
                  <div className="rounded-xl border bg-card p-6 text-center space-y-3">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground text-sm">
                        No Instagram Professional Accounts found.
                      </h4>
                      <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                        To connect an Instagram account, please verify the following requirements:
                      </p>
                    </div>

                    <div className="max-w-md mx-auto rounded-lg bg-muted/40 p-3 text-left space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>The Instagram account is switched to a <strong>Professional (Business or Creator)</strong> account in the Instagram mobile app.</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>The Instagram account is linked to a <strong>Facebook Page</strong> you manage in Meta Business Suite.</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>Your Meta login profile has Admin rights on both the Facebook Page and Instagram Account.</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAccounts}
                        className="h-8 text-xs gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Refresh List
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSwitchAccount}
                        className="bg-primary text-primary-foreground h-8 text-xs"
                      >
                        Switch Meta Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredAccounts.map((account) => {
                    const isSelected = selectedAccountId === account.instagramBusinessId;
                    const isConnectedHere = account.isConnectedToCurrentWorkspace || account.isAlreadyConnected;
                    const isConnectedOther = account.isConnectedToOtherWorkspace;

                    return (
                      <div
                        key={account.instagramBusinessId}
                        onClick={() => handleSelectAccount(account)}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3",
                          isConnectedHere
                            ? "bg-muted/40 opacity-75 cursor-not-allowed border-border"
                            : isSelected
                            ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-500 cursor-pointer shadow-xs"
                            : "border-border hover:bg-muted/30 cursor-pointer hover:border-rose-400/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {account.profilePictureUrl ? (
                            <img
                              src={account.profilePictureUrl}
                              alt={account.username}
                              className="h-10 w-10 rounded-full object-cover border shrink-0 ring-1 ring-rose-500/20"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {account.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-xs truncate">
                                @{account.username}
                              </h4>
                              {isConnectedHere ? (
                                <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-muted-foreground/30">
                                  Already Connected
                                </Badge>
                              ) : isConnectedOther ? (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                                  {account.connectedWorkspaceName || "Connected in other workspace"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                  Available
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {account.name} • Linked Page: <strong>{account.pageName}</strong>
                              {account.followerCount !== undefined && account.followerCount > 0 && (
                                <span> • {(account.followerCount / 1000).toFixed(1)}k Followers</span>
                              )}
                            </p>

                            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <span>IG ID: {account.instagramBusinessId}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyAccountId(account.instagramBusinessId, e)}
                                title="Copy ID"
                                className="hover:text-foreground"
                              >
                                {copiedAccountId === account.instagramBusinessId ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </button>
                            </p>
                          </div>
                        </div>

                        {/* Availability Radio Selection */}
                        <div className="shrink-0">
                          {isConnectedHere ? (
                            <span className="text-[10px] text-muted-foreground font-semibold">Linked</span>
                          ) : (
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                                isSelected
                                  ? "border-rose-500 bg-rose-500 text-white shadow-xs"
                                  : "border-muted-foreground/40 bg-background"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CHANNEL CUSTOMIZATION & SETTINGS */}
          {step === "CONFIGURE" && selectedAccount && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Selected Account Summary Pill */}
              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {selectedAccount.profilePictureUrl ? (
                    <img
                      src={selectedAccount.profilePictureUrl}
                      alt={selectedAccount.username}
                      className="h-9 w-9 rounded-full object-cover border ring-1 ring-rose-500/20"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedAccount.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground text-xs">@{selectedAccount.username}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      IG ID: {selectedAccount.instagramBusinessId} • Linked Page: {selectedAccount.pageName}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("SELECT_ACCOUNT")}
                  className="text-xs h-7 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                >
                  Change Account
                </Button>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                {/* 1. Channel Display Name */}
                <div className="space-y-1">
                  <label className="font-bold text-foreground text-xs block">
                    Channel Display Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. @appnix_official or Appnix Instagram"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Custom channel title visible across Live Chat, omnichannel inbox, and broadcast reports.
                  </span>
                </div>

                {/* 2. Workspace Color Tag Swatch Palette */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground text-xs block">
                    Workspace Color Tag <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {INSTAGRAM_COLOR_SWATCH_PRESETS.map((swatch) => {
                      const isSelected = colorCode === swatch.hex;
                      return (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => setColorCode(swatch.hex)}
                          title={swatch.name}
                          className={cn(
                            "h-7 w-7 rounded-full transition-transform flex items-center justify-center shadow-xs",
                            isSelected ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      );
                    })}
                    <div className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorCode }} />
                      <span className="font-mono text-[11px] uppercase font-semibold">{colorCode}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Comment-to-DM & Auto-Reply Assignment */}
                <div className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-rose-500" />
                        <span>Comment-to-DM &amp; Auto-Reply Engine</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Automatically reply to post comments and send private DMs with links, brochures, or pricing.
                      </p>
                    </div>
                    <Switch
                      checked={autoReplyEnabled}
                      onCheckedChange={setAutoReplyEnabled}
                    />
                  </div>

                  {autoReplyEnabled && (
                    <div className="pt-2 border-t space-y-1">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Automated Welcome DM Message
                      </label>
                      <Textarea
                        rows={2}
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="text-xs bg-background resize-none"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Use <code>{"{{username}}"}</code> to insert the customer&apos;s Instagram handle.
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Webhook Subscription Confirmation Pill */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-foreground">Webhook Subscriptions Ready</p>
                      <p className="text-[10px] text-muted-foreground">
                        Auto-subscribes to <code>comments</code>, <code>messages</code>, and <code>mentions</code>.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] shrink-0">
                    Auto-Configured
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROVISIONING & FINALIZATION */}
          {step === "PROVISIONING" && (
            <div className="py-6 space-y-5 text-center animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Provisioning Instagram Channel &amp; Subscribing Webhooks...
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Connecting Meta Cloud Infrastructure for <strong>{channelName}</strong>
                </p>
              </div>

              {/* Multi-stage handshake progress list */}
              <div className="max-w-md mx-auto rounded-xl border bg-card p-4 space-y-3 text-left shadow-2xs">
                {handshakeSteps.map((hs) => (
                  <div key={hs.id} className="flex items-center gap-3 text-xs">
                    {hs.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : hs.status === "in_progress" ? (
                      <Loader2 className="h-4 w-4 text-rose-500 animate-spin shrink-0" />
                    ) : hs.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "leading-tight",
                        hs.status === "completed"
                          ? "text-foreground font-semibold"
                          : hs.status === "in_progress"
                          ? "text-rose-600 font-semibold"
                          : hs.status === "failed"
                          ? "text-rose-600 font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      {hs.label}
                    </span>
                  </div>
                ))}
              </div>

              {provisioningError && (
                <div className="max-w-md mx-auto rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 text-left text-xs text-rose-800 dark:text-rose-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>Provisioning Error</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed">{provisioningError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION */}
          {step === "SUCCESS" && (
            <div className="py-4 space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Instagram Channel Connected Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  <strong>{channelName}</strong> is now active, verified, and ready to receive comments and DMs.
                </p>
              </div>

              {/* Newly Provisioned Channel Card Preview */}
              <div className="max-w-sm mx-auto rounded-xl border bg-card p-4 text-left space-y-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  {selectedAccount?.profilePictureUrl ? (
                    <img
                      src={selectedAccount.profilePictureUrl}
                      alt={channelName}
                      className="h-9 w-9 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedAccount?.username.slice(0, 2).toUpperCase() || "IG"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground text-xs">{channelName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      IG ID: {selectedAccount?.instagramBusinessId} • Linked Page: {selectedAccount?.pageName}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span>Channel Status:</span>
                    <p className="font-semibold text-emerald-600">Connected &amp; Live</p>
                  </div>
                  <div>
                    <span>Comment-to-DM:</span>
                    <p className="font-semibold text-foreground">{autoReplyEnabled ? "Active (Auto-Reply)" : "Manual Live Chat"}</p>
                  </div>
                </div>
              </div>

              {/* Quick Action Shortcuts */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <Link href="/channels/instagram" onClick={onClose}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                    <span>Create Comment-to-DM Rule</span>
                  </Button>
                </Link>
                <Link href="/crm/live-chat" onClick={onClose}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Go to Live Chat Inbox</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 3. Wizard Footer Actions */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          {step === "AUTH" && (
            <>
              <Button variant="outline" size="sm" onClick={handleAttemptClose} className="text-xs">
                Cancel
              </Button>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>SSL Encrypted Meta Graph API v21.0</span>
              </span>
            </>
          )}

          {step === "SELECT_ACCOUNT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("AUTH")}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleProceedToConfigure}
                disabled={!selectedAccountId}
                className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
              >
                <span>Connect Selected Account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "CONFIGURE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("SELECT_ACCOUNT")}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
              <Button
                size="sm"
                onClick={executeProvisioningHandshake}
                disabled={!channelName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
              >
                <span>Complete Setup &amp; Launch</span>
                <Zap className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "PROVISIONING" && provisioningError && (
            <div className="w-full flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("CONFIGURE")}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Configure
              </Button>
              <Button
                size="sm"
                onClick={executeProvisioningHandshake}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </Button>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="w-full flex items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                Done &amp; View Channels
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
