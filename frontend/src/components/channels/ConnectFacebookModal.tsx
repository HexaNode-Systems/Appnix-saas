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
  Radio,
  Building,
  HelpCircle,
  Loader2,
  Lock,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FacebookPage,
  FacebookUserProfile,
  ConnectFacebookStep,
  WebhookHandshakeStep,
} from "@/types/facebook-channel";
import {
  getStoredFacebookUser,
  saveStoredFacebookUser,
  getStoredFacebookPages,
  saveStoredFacebookPages,
  markPageAsConnected,
} from "@/lib/facebook-channels";
import { Channel } from "@/components/channels/channel-manager";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";

interface ConnectFacebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (newChannel: Channel) => void;
  existingChannels?: Channel[];
}

function FacebookBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const COLOR_TAG_PALETTE = [
  { id: "indigo", hex: "#4F46E5", name: "Indigo" },
  { id: "emerald", hex: "#059669", name: "Emerald" },
  { id: "violet", hex: "#7C3AED", name: "Violet" },
  { id: "amber", hex: "#D97706", name: "Amber" },
  { id: "rose", hex: "#E11D48", name: "Rose" },
  { id: "cyan", hex: "#0891B2", name: "Cyan" },
];

export function ConnectFacebookModal({
  isOpen,
  onClose,
  onChannelCreated,
  existingChannels = [],
}: ConnectFacebookModalProps) {
  // Stepper State
  const [step, setStep] = useState<ConnectFacebookStep>("AUTH");

  // Auth Mode State: "oauth" | "token"
  const [authMode, setAuthMode] = useState<"oauth" | "token">("oauth");
  const [customConfigId, setCustomConfigId] = useState("");
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Direct Page Token State
  const [manualToken, setManualToken] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerifyError, setTokenVerifyError] = useState<string | null>(null);

  // Auth State
  const [authUser, setAuthUser] = useState<FacebookUserProfile | null>(() =>
    getStoredFacebookUser()
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Pages Selection State
  const [pages, setPages] = useState<FacebookPage[]>(() => getStoredFacebookPages());
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);
  const [isRefreshingPages, setIsRefreshingPages] = useState(false);

  // Configuration State
  const [channelName, setChannelName] = useState("");
  const [colorCode, setColorCode] = useState("#4F46E5"); // Indigo default
  const [botHandoffEnabled, setBotHandoffEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! Welcome to our Facebook Messenger support. An automated assistant or team member will assist you shortly."
  );

  // Provisioning & Webhook State
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [handshakeSteps, setHandshakeSteps] = useState<WebhookHandshakeStep[]>([
    { id: "token", label: "Generating long-lived Page Access Token via Meta Graph API", status: "pending" },
    { id: "webhook", label: "Registering Appnix Webhook Callback Endpoint (https://api.appnix.co.in/api/v1/webhooks/facebook)", status: "pending" },
    { id: "subscribe", label: "Subscribing to messages, messaging_postbacks & delivery receipts", status: "pending" },
    { id: "router", label: "Activating Live Chat Router & Automated Greeting Bot", status: "pending" },
  ]);

  // Close Confirmation Prompt State
  const [showClosePrompt, setShowClosePrompt] = useState(false);

  // Synchronize initial page state
  const selectedPage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId) || null;
  }, [pages, selectedPageId]);

  // Filtered pages list
  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pages, searchQuery]);

  // Handle Close Attempt (with confirmation if in progress)
  const handleAttemptClose = () => {
    if (step === "CONFIGURE" || step === "PROVISIONING") {
      setShowClosePrompt(true);
    } else {
      onClose();
    }
  };

  // 1. Authenticate with Facebook via Meta OAuth popup / redirect
  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    const redirectUri = window.location.origin + "/channels/facebook/callback";
    const configParam = customConfigId.trim()
      ? `&configId=${encodeURIComponent(customConfigId.trim())}`
      : "";

    try {
      const res = await api.get(
        `/channels/facebook/oauth/url?redirectUri=${encodeURIComponent(redirectUri)}${configParam}`
      );
      const oauthUrl = res.data?.data?.oauthUrl;

      if (!oauthUrl) {
        throw new Error("Could not retrieve Meta authorization URL from backend.");
      }

      // Setup window postMessage listener for popup callback
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "META_FACEBOOK_AUTH_CODE") {
          window.removeEventListener("message", onMessage);
          const code = event.data.code;

          try {
            const exchangeRes = await api.post("/channels/facebook/oauth/exchange", {
              code,
              redirectUri,
            });
            const data = exchangeRes.data?.data;
            const user = data?.user || null;
            const list = data?.pages || [];

            setAuthUser(user);
            setPages(list);
            if (user) saveStoredFacebookUser(user);
            if (list.length > 0) saveStoredFacebookPages(list);

            setIsAuthenticating(false);
            setStep("SELECT_PAGE");
          } catch (exchangeErr: any) {
            setIsAuthenticating(false);
            setAuthError(
              exchangeErr.response?.data?.message || "Failed to exchange Meta authorization code."
            );
          }
        } else if (event.data?.type === "META_FACEBOOK_AUTH_ERROR") {
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
        "meta_facebook_oauth",
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
      setTokenVerifyError("Please paste a valid Facebook Page Access Token.");
      return;
    }

    setIsVerifyingToken(true);
    setTokenVerifyError(null);

    try {
      const res = await api.post("/channels/facebook/verify-token", {
        accessToken: manualToken.trim(),
        pageId: manualPageId.trim() || undefined,
      });

      const data = res.data;
      if (data?.success) {
        const verifiedPages: FacebookPage[] = data.pages || (data.page ? [data.page] : []);
        if (verifiedPages.length > 0) {
          setPages(verifiedPages);
          saveStoredFacebookPages(verifiedPages);

          if (verifiedPages.length === 1) {
            setSelectedPageId(verifiedPages[0].id);
            setChannelName(verifiedPages[0].name);
            setStep("CONFIGURE");
          } else {
            setStep("SELECT_PAGE");
          }
        } else {
          setTokenVerifyError("No Facebook Pages found associated with this access token.");
        }
      }
    } catch (err: any) {
      setTokenVerifyError(
        err.response?.data?.message || err.message || "Failed to verify Facebook access token with Meta Graph API."
      );
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // Switch / Logout Facebook Account
  const handleSwitchAccount = () => {
    setAuthUser(null);
    saveStoredFacebookUser(null);
    setSelectedPageId(null);
    setPages([]);
    saveStoredFacebookPages([]);
    setStep("AUTH");
  };

  // Refresh Pages List
  const handleRefreshPages = () => {
    setIsRefreshingPages(true);
    try {
      const stored = getStoredFacebookPages();
      setPages(stored);
    } finally {
      setIsRefreshingPages(false);
    }
  };

  // Page Selection Proceed
  const handleSelectPage = (page: FacebookPage) => {
    if (page.isConnectedToCurrentWorkspace) return;
    setSelectedPageId(page.id);
    setChannelName(page.name);
  };

  const handleProceedToConfigure = () => {
    if (!selectedPage) return;
    setChannelName(selectedPage.name);
    setStep("CONFIGURE");
  };

  // Provisioning & Webhook Execution
  const executeProvisioningHandshake = async () => {
    if (!selectedPage || !channelName.trim()) return;

    setStep("PROVISIONING");
    setProvisioningError(null);
    setProvisioningProgress(20);

    // Step 1: Token
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
      await api.post("/channels/facebook/connect", {
        pageId: selectedPage.id,
        pageName: channelName.trim() || selectedPage.name,
        accessToken: selectedPage.accessToken,
        category: selectedPage.category,
        avatarUrl: selectedPage.avatarUrl,
        channelName: channelName.trim(),
        colorCode,
        botEnabled: botHandoffEnabled,
        welcomeMessage: welcomeMessage.trim(),
      });

      setHandshakeSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      setProvisioningProgress(100);

      // Create new active Channel Object
      const newChannel: Channel = {
        id: `fb_${selectedPage.id}`,
        type: "facebook",
        name: channelName.trim(),
        subtitle: `Page ID: ${selectedPage.id}`,
        status: "connected",
        topRight: { label: "Page Connected", sub: "Facebook Messenger" },
        fields: [
          { label: "Page Status", value: "Connected & Published", icon: CheckCircle2 },
          {
            label: "Category",
            value: selectedPage.category || "General",
            icon: ScanLine,
          },
          {
            label: "Messenger Bot",
            value: botHandoffEnabled ? "Active (Auto-Reply)" : "Manual Live Chat",
            icon: Bot,
          },
          { label: "Messenger Sync", value: "Direct Sync Enabled", icon: MessageSquare },
        ],
        actions: [],
      };

      markPageAsConnected(selectedPage.id);
      onChannelCreated(newChannel);
      setStep("SUCCESS");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Failed to connect Facebook Page and configure Messenger Webhooks.";
      setProvisioningError(msg);
      setHandshakeSteps((prev) =>
        prev.map((s) => (s.status === "in_progress" ? { ...s, status: "failed" } : s))
      );
    }
  };

  const handleCopyPageId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedPageId(id);
    setTimeout(() => setCopiedPageId(null), 2000);
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
              <span>Discard Facebook Setup?</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You are currently configuring <strong>{selectedPage?.name || "your Facebook Page"}</strong>. Discarding will cancel token provisioning and close the wizard.
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
              <div className="h-10 w-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-md">
                <FacebookBrandIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Connect Facebook Page</span>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                    Official Meta Graph API
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enable Messenger conversations, automated replies, and lead capture.
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
              { id: "SELECT_PAGE", stepNum: "2", label: "Select Page" },
              { id: "CONFIGURE", stepNum: "3", label: "Configure Channel" },
            ].map((s, idx) => {
              const stepMap = { AUTH: 0, SELECT_PAGE: 1, CONFIGURE: 2, PROVISIONING: 2, SUCCESS: 3 };
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
                        ? "bg-[#1877F2]"
                        : "bg-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold truncate",
                      isCurrent
                        ? "text-[#1877F2]"
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
                    <Zap className="h-3.5 w-3.5 text-[#1877F2]" />
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
                    <span>Page Access Token (Direct)</span>
                  </button>
                </div>
              )}

              {/* OAuth Cancellation / Scope Error Warning Banner */}
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

                  {/* Quick switch suggestion to Page Access Token */}
                  <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/50 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      Did Meta show &quot;Invalid Scopes&quot;? Connect directly via token instead:
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
                  <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 p-5 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg">
                          <FacebookBrandIcon className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            Meta OAuth 2.0 Permissions Handshake
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Connect with Meta Business to manage Messenger chats and automate customer replies.
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
                        Permissions Appnix will request:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Messenger Direct Messages</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Manage and send Facebook Page messages via live chat and automated bots.
                          </p>
                        </div>

                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Real-Time Webhooks</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Receive instant webhooks for incoming customer chats and delivery status.
                          </p>
                        </div>

                        <div className="bg-background/90 p-3 rounded-xl border space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Page Admin Discovery</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Read public page information, follower counts, and admin privileges.
                          </p>
                        </div>
                      </div>
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
                            className="h-10 w-10 rounded-full object-cover border ring-2 ring-primary/20"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs ring-2 ring-primary/20">
                            {authUser.name?.slice(0, 2).toUpperCase() || "FB"}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-foreground text-xs">{authUser.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{authUser.email}</p>
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                            <Check className="h-3 w-3" /> Token Active & Valid
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
                          Log in as a different user
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setStep("SELECT_PAGE")}
                          className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-semibold gap-1.5 shadow-sm text-xs"
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
                        className="w-full sm:w-auto px-8 h-11 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold text-sm shadow-md gap-2.5"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Connecting to Meta accounts...</span>
                          </>
                        ) : (
                          <>
                            <FacebookBrandIcon className="h-5 w-5" />
                            <span>Continue with Facebook</span>
                          </>
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        An official Meta OAuth dialog will open in a popup window to authorize your pages.
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
                              If your Meta App uses Facebook Login for Business configurations, paste your Configuration ID here to authorize without permission scope errors.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODE 2: DIRECT PAGE ACCESS TOKEN */}
              {authMode === "token" && (
                <div className="space-y-4 rounded-2xl border bg-card p-5 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Lock className="h-4 w-4 text-amber-500" />
                          <span>Direct Page Access Token Connection</span>
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
                      Bypass Meta OAuth dialog restrictions by entering your Page Access Token directly. Appnix will verify the token live with Meta Graph API and configure real Messenger Webhooks.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground text-[11px] flex items-center justify-between">
                      <span>Facebook Page Access Token *</span>
                      <span className="text-[10px] text-muted-foreground">Starts with EAA...</span>
                    </label>
                    <Textarea
                      placeholder="Paste your Page Access Token (EAA...)"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="font-mono text-xs h-24 resize-none bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground text-[11px]">
                      Page ID (Optional, auto-detected from token)
                    </label>
                    <Input
                      placeholder="e.g. 102938475610293"
                      value={manualPageId}
                      onChange={(e) => setManualPageId(e.target.value)}
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
                    className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-semibold text-xs h-10 gap-2 shadow-xs"
                  >
                    {isVerifyingToken ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying Token with Meta Graph API...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verify &amp; Load Facebook Page</span>
                      </>
                    )}
                  </Button>

                  {/* Fast Token Generation Helper */}
                  <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 border text-[11px]">
                    <span className="font-semibold text-foreground block">
                      How to get a Page Access Token in 30 seconds:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[10px]">
                      <li>
                        Go to{" "}
                        <a
                          href="https://developers.facebook.com/tools/explorer/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Meta Graph API Explorer
                        </a>
                      </li>
                      <li>In the <strong>Meta App</strong> dropdown, select your App.</li>
                      <li>In the <strong>User or Page</strong> dropdown, select the Facebook Page you want to connect.</li>
                      <li>Click <strong>Generate Access Token</strong>, approve permissions, and copy the token!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT FACEBOOK PAGE */}
          {step === "SELECT_PAGE" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* User Account Toolbar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-2.5">
                  {authUser?.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser?.name || "Facebook User"}
                      className="h-7 w-7 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[10px]">
                      {authUser?.name?.slice(0, 2).toUpperCase() || "FB"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-xs">
                      Logged in as {authUser?.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Admin rights verified for {pages.length} Facebook Business Pages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshPages}
                    disabled={isRefreshingPages}
                    className="text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRefreshingPages && "animate-spin")} />
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
                  placeholder="Search pages by name, category, or Page ID..."
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

              {/* Pages Directory List */}
              <div className="space-y-2.5">
                {filteredPages.length === 0 ? (
                  /* Empty State: No administerable Facebook pages */
                  <div className="rounded-xl border bg-card p-6 text-center space-y-3">
                    <Building className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground text-sm">
                        No administerable Facebook Pages found.
                      </h4>
                      <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                        To connect a Facebook page, please confirm the following requirements:
                      </p>
                    </div>

                    <div className="max-w-md mx-auto rounded-lg bg-muted/40 p-3 text-left space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Your personal profile has <strong>Admin or Editor</strong> access in Meta Business Suite.</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>The business page is published and not unpublished or restricted.</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>You have approved the <code>pages_messaging</code> permission scope.</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshPages}
                        className="h-8 text-xs gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Refresh List
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSwitchAccount}
                        className="bg-primary text-primary-foreground h-8 text-xs"
                      >
                        Switch Facebook Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredPages.map((page) => {
                    const isSelected = selectedPageId === page.id;
                    const isConnectedHere = page.isConnectedToCurrentWorkspace;
                    const isConnectedOther = page.isConnectedToOtherWorkspace;

                    return (
                      <div
                        key={page.id}
                        onClick={() => handleSelectPage(page)}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3",
                          isConnectedHere
                            ? "bg-muted/40 opacity-75 cursor-not-allowed border-border"
                            : isSelected
                            ? "border-[#1877F2] bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-[#1877F2] cursor-pointer shadow-xs"
                            : "border-border hover:bg-muted/30 cursor-pointer hover:border-[#1877F2]/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={page.avatarUrl}
                            alt={page.name}
                            className="h-10 w-10 rounded-xl object-cover border shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-xs truncate">
                                {page.name}
                              </h4>
                              {isConnectedHere ? (
                                <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-muted-foreground/30">
                                  Already Connected
                                </Badge>
                              ) : isConnectedOther ? (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                                  {page.connectedWorkspaceName}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                  Available
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {page.category} • {(page.followerCount / 1000).toFixed(1)}k Followers
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <span>Page ID: {page.id}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPageId(page.id, e)}
                                title="Copy ID"
                                className="hover:text-foreground"
                              >
                                {copiedPageId === page.id ? (
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
                                  ? "border-[#1877F2] bg-[#1877F2] text-white shadow-xs"
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
          {step === "CONFIGURE" && selectedPage && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Selected Page Summary Pill */}
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedPage.avatarUrl}
                    alt={selectedPage.name}
                    className="h-9 w-9 rounded-lg object-cover border"
                  />
                  <div>
                    <p className="font-bold text-foreground text-xs">{selectedPage.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Page ID: {selectedPage.id}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("SELECT_PAGE")}
                  className="text-xs h-7 text-[#1877F2] hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  Change Page
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
                    placeholder="e.g. Appnix Support - Messenger"
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
                    {COLOR_TAG_PALETTE.map((swatch) => {
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

                {/* 3. Default Bot / Auto-Reply Assignment */}
                <div className="rounded-xl border bg-card p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span>Default Bot / Auto-Reply Assignment</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Automatically route incoming Facebook Messenger chats to a default greeting workflow or AI agent.
                      </p>
                    </div>
                    <Switch
                      checked={botHandoffEnabled}
                      onCheckedChange={setBotHandoffEnabled}
                    />
                  </div>

                  {botHandoffEnabled && (
                    <div className="pt-2 border-t space-y-1">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Automated Welcome Greeting
                      </label>
                      <Textarea
                        rows={2}
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="text-xs bg-background resize-none"
                      />
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
                        Automatically subscribes to <code>messages</code>, <code>messaging_postbacks</code>, and <code>message_deliveries</code>.
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
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 text-[#1877F2] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Provisioning Facebook Channel & Subscribing Webhooks...
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
                      <Loader2 className="h-4 w-4 text-[#1877F2] animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "leading-tight",
                        hs.status === "completed"
                          ? "text-foreground font-semibold"
                          : hs.status === "in_progress"
                          ? "text-[#1877F2] font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      {hs.label}
                    </span>
                  </div>
                ))}
              </div>
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
                  Facebook Page Connected Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  <strong>{channelName}</strong> is now active, verified, and ready to receive customer messages.
                </p>
              </div>

              {/* Newly Provisioned Channel Card Preview */}
              <div className="max-w-sm mx-auto rounded-xl border bg-card p-4 text-left space-y-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedPage?.avatarUrl}
                    alt={channelName}
                    className="h-9 w-9 rounded-lg object-cover border"
                  />
                  <div>
                    <p className="font-bold text-foreground text-xs">{channelName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Page ID: {selectedPage?.id}</p>
                  </div>
                </div>
                <div className="pt-2 border-t grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <span>Channel Status:</span>
                    <p className="font-semibold text-emerald-600">Connected & Published</p>
                  </div>
                  <div>
                    <span>Messenger Bot:</span>
                    <p className="font-semibold text-foreground">{botHandoffEnabled ? "Active (Auto-Reply)" : "Manual"}</p>
                  </div>
                </div>
              </div>

              {/* Quick Action Shortcuts */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <Link href="/crm/live-chat" onClick={onClose}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Go to Live Chat Inbox</span>
                  </Button>
                </Link>
                <Link href="/chatbots" onClick={onClose}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Bot className="h-3.5 w-3.5" />
                    <span>Set Up Auto-Replies</span>
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
                <span>SSL Encrypted OAuth 2.0</span>
              </span>
            </>
          )}

          {step === "SELECT_PAGE" && (
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
                disabled={!selectedPageId}
                className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-semibold text-xs gap-1.5 shadow-sm"
              >
                <span>Connect Selected Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "CONFIGURE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("SELECT_PAGE")}
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
                <span>Complete Setup & Launch</span>
                <Zap className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "SUCCESS" && (
            <div className="w-full flex items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                Done & View Channels
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
