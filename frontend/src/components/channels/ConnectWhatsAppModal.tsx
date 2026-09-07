"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  Lock,
  ArrowRight,
  Check,
  Sparkles,
  Link2,
  ScanLine,
  MessageCircle,
  Building2,
  PhoneCall,
  Globe2,
  HelpCircle,
  CreditCard,
  BarChart3,
  Bot,
  Zap,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/axios";
import { Channel } from "@/components/channels/channel-manager";
import { cn } from "@/lib/utils";

interface ConnectWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (newChannel: Channel) => void;
}

type ModalStep = "INIT" | "AWAITING_META" | "VERIFYING" | "SUCCESS" | "ERROR";

interface MetaPublicConfig {
  appId: string;
  configId: string;
  graphVersion: string;
  isConfigured: boolean;
}

interface VerificationProgressStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

function WhatsAppModalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.32 4.86L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.19h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.18.83.85-3.1-.2-.32a8.14 8.14 0 0 1-1.26-4.36c0-4.51 3.68-8.19 8.2-8.19 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 0 1 2.4 5.8c0 4.51-3.68 8.27-8.1 8.27Zm4.49-6.13c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function MetaBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export function ConnectWhatsAppModal({
  isOpen,
  onClose,
  onChannelCreated,
}: ConnectWhatsAppModalProps) {
  const [step, setStep] = useState<ModalStep>("INIT");
  const [metaConfig, setMetaConfig] = useState<MetaPublicConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<any>(null);

  // Captured IDs from Meta session postMessage listener
  const capturedData = useRef<{
    phoneNumberId?: string;
    wabaId?: string;
    businessId?: string;
  }>({});

  const lastMetaStatus = useRef<{
    status: "FINISH" | "CANCEL" | "ERROR";
    reason?: string;
  } | null>(null);

  const [handshakeSteps, setHandshakeSteps] = useState<VerificationProgressStep[]>([
    { id: "code", label: "Capturing Meta authorization code & session tokens", status: "pending" },
    { id: "token", label: "Exchanging long-lived system user token via Graph API", status: "pending" },
    { id: "verify", label: "Verifying WhatsApp Business Account & phone number identity", status: "pending" },
    { id: "webhook", label: "Subscribing Cloud API webhook & syncing live channel", status: "pending" },
  ]);

  // Reset state whenever modal is opened
  useEffect(() => {
    if (!isOpen) return;

    setStep("INIT");
    setErrorMessage(null);
    setVerifiedResult(null);
    capturedData.current = {};
    lastMetaStatus.current = null;
    setHandshakeSteps([
      { id: "code", label: "Capturing Meta authorization code & session tokens", status: "pending" },
      { id: "token", label: "Exchanging long-lived system user token via Graph API", status: "pending" },
      { id: "verify", label: "Verifying WhatsApp Business Account & phone number identity", status: "pending" },
      { id: "webhook", label: "Subscribing Cloud API webhook & syncing live channel", status: "pending" },
    ]);
  }, [isOpen]);

  // Fetch Meta Public Config on mount / modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingConfig(true);
    setErrorMessage(null);

    api
      .get("/channels/whatsapp/config-public")
      .then((res) => {
        if (!isMounted) return;
        const configData = res.data?.data;
        if (configData) {
          setMetaConfig(configData);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(
          err.response?.data?.message || "Failed to load Meta WhatsApp configuration from server."
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingConfig(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Setup Meta sessionInfoListener for postMessage events
  useEffect(() => {
    if (!isOpen) return;

    const sessionInfoListener = (event: MessageEvent) => {
      const origin = event.origin || "";
      const isFacebookOrigin =
        origin === "https://www.facebook.com" ||
        origin === "https://web.facebook.com" ||
        /^https:\/\/([a-zA-Z0-9-]+\.)?facebook\.com$/.test(origin);

      if (!isFacebookOrigin) return;

      try {
        const parsed = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!parsed) return;

        if (
          parsed.type === "WA_EMBEDDED_SIGNUP" ||
          parsed.event === "WA_EMBEDDED_SIGNUP" ||
          parsed.event === "FINISH" ||
          parsed.event === "CANCEL" ||
          parsed.event === "ERROR"
        ) {
          const eventType = parsed.event || parsed.type;
          const payload = parsed.data || {};

          if (eventType === "CANCEL") {
            lastMetaStatus.current = {
              status: "CANCEL",
              reason: "Embedded Signup was cancelled by user.",
            };
          } else if (eventType === "ERROR") {
            lastMetaStatus.current = {
              status: "ERROR",
              reason: payload.error_message || "Meta Embedded Signup encountered an error.",
            };
          } else if (eventType === "FINISH" || payload.phone_number_id || payload.waba_id) {
            lastMetaStatus.current = { status: "FINISH" };
          }

          if (payload.phone_number_id) {
            capturedData.current.phoneNumberId = String(payload.phone_number_id);
          }
          if (payload.waba_id) {
            capturedData.current.wabaId = String(payload.waba_id);
          }
          if (payload.business_id) {
            capturedData.current.businessId = String(payload.business_id);
          }
        }
      } catch {
        // Ignore non-JSON messages from other extensions or postMessage sources
      }
    };

    window.addEventListener("message", sessionInfoListener);
    return () => {
      window.removeEventListener("message", sessionInfoListener);
    };
  }, [isOpen]);

  // Load Facebook JavaScript SDK safely
  const loadFacebookSDK = useCallback((appId: string, graphVersion: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.FB) {
        try {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: true,
            version: graphVersion || "v21.0",
          });
        } catch {
          // Already initialized
        }
        resolve(window.FB);
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: graphVersion || "v21.0",
        });
        resolve(window.FB);
      };

      const existingScript = document.getElementById("facebook-jssdk") as HTMLScriptElement | null;
      if (existingScript) {
        const interval = setInterval(() => {
          if (window.FB) {
            clearInterval(interval);
            try {
              window.FB.init({
                appId,
                cookie: true,
                xfbml: true,
                version: graphVersion || "v21.0",
              });
            } catch {}
            resolve(window.FB);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          if (!window.FB) {
            reject(new Error("Timeout loading Facebook SDK. Please disable content blockers."));
          }
        }, 10000);
        return;
      }

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onerror = () =>
        reject(
          new Error(
            "Failed to load Facebook SDK. Please check your internet connection or disable ad blockers."
          )
        );
      document.body.appendChild(script);
    });
  }, []);

  // Step 3: Handle Verify & Complete Server-to-Server Exchange
  const handleVerifyAndComplete = async (code: string) => {
    setStep("VERIFYING");

    // Step 1: Code captured
    setHandshakeSteps((prev) =>
      prev.map((s) =>
        s.id === "code"
          ? { ...s, status: "completed" }
          : s.id === "token"
          ? { ...s, status: "in_progress" }
          : s
      )
    );

    try {
      // Advance step 2 -> 3 animation
      const animTimer = setTimeout(() => {
        setHandshakeSteps((prev) =>
          prev.map((s) =>
            s.id === "token"
              ? { ...s, status: "completed" }
              : s.id === "verify"
              ? { ...s, status: "in_progress" }
              : s
          )
        );
      }, 700);

      const response = await api.post("/channels/whatsapp/embedded-signup", {
        code,
        wabaId: capturedData.current.wabaId,
        phoneNumberId: capturedData.current.phoneNumberId,
        businessId: capturedData.current.businessId,
      });

      clearTimeout(animTimer);
      const resultData = response.data?.data;

      // Advance step 3 -> 4
      setHandshakeSteps((prev) =>
        prev.map((s) =>
          s.id === "token" || s.id === "verify"
            ? { ...s, status: "completed" }
            : s.id === "webhook"
            ? { ...s, status: "in_progress" }
            : s
        )
      );

      await new Promise((r) => setTimeout(r, 600));

      // All completed
      setHandshakeSteps((prev) =>
        prev.map((s) => ({ ...s, status: "completed" }))
      );

      setVerifiedResult(resultData);
      setStep("SUCCESS");

      // Format connected channel and update CRM state (without auto-closing the modal)
      if (resultData) {
        const connectedChannel: Channel = {
          id: resultData.channelId || "whatsapp",
          type: "whatsapp",
          name: resultData.displayName || resultData.wabaName || "WhatsApp Cloud API",
          subtitle: resultData.phoneNumber || (resultData.wabaId ? `WABA: ${resultData.wabaId}` : "Connected Number"),
          status: "connected",
          topRight: { label: "Verified & Live", sub: "Cloud API" },
          fields: [
            { label: "Number Status", value: "Verified & Live", icon: MessageCircle },
            {
              label: "Quality Rating",
              value: resultData.qualityRating || "UNKNOWN",
              icon: ScanLine,
            },
            {
              label: "Messaging Limit",
              value: resultData.messagingLimitTier || "TIER_50",
              icon: MessageSquare,
            },
            {
              label: "WABA ID",
              value: resultData.wabaId || "Connected",
              icon: Link2,
            },
          ],
          actions: [Link2, FileText, CreditCard, BarChart3, Bot, Zap, MessageSquare],
        };
        onChannelCreated(connectedChannel);
      }
    } catch (err: any) {
      setHandshakeSteps((prev) =>
        prev.map((s) => (s.status === "in_progress" ? { ...s, status: "failed" } : s))
      );
      setStep("ERROR");
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Verification with Meta Graph API failed. Please try again."
      );
    }
  };

  // Launch Meta Embedded Signup Popup Flow
  const launchMetaEmbeddedSignup = async () => {
    if (!metaConfig?.isConfigured || !metaConfig.appId || !metaConfig.configId) {
      setErrorMessage(
        "Meta Embedded Signup is not fully configured on the server. Please set META_APP_ID and META_EMBEDDED_SIGNUP_CONFIG_ID in backend/.env."
      );
      setStep("ERROR");
      return;
    }

    setErrorMessage(null);
    setStep("AWAITING_META");
    lastMetaStatus.current = null;

    try {
      const FB = await loadFacebookSDK(metaConfig.appId, metaConfig.graphVersion);

      FB.login(
        (response: any) => {
          if (response?.authResponse?.code) {
            const authCode = response.authResponse.code;
            handleVerifyAndComplete(authCode);
          } else {
            setStep("ERROR");
            if (lastMetaStatus.current?.status === "CANCEL") {
              setErrorMessage(
                "The Meta Embedded Signup process was cancelled. Click 'Try Again' when you are ready to complete the connection."
              );
            } else if (lastMetaStatus.current?.status === "ERROR" && lastMetaStatus.current.reason) {
              setErrorMessage(`Meta Signup error: ${lastMetaStatus.current.reason}`);
            } else {
              setErrorMessage(
                "Meta Embedded Signup was cancelled or did not return an authorization code. Please complete all steps in the Meta dialog and try again."
              );
            }
          }
        },
        {
          config_id: metaConfig.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: "",
            sessionInfoVersion: "3",
          },
        }
      );
    } catch (err: any) {
      setStep("ERROR");
      setErrorMessage(err.message || "Failed to launch Meta Embedded Signup dialog.");
    }
  };

  const handleReset = () => {
    setStep("INIT");
    setErrorMessage(null);
    setVerifiedResult(null);
    capturedData.current = {};
    lastMetaStatus.current = null;
    setHandshakeSteps([
      { id: "code", label: "Capturing Meta authorization code & session tokens", status: "pending" },
      { id: "token", label: "Exchanging long-lived system user token via Graph API", status: "pending" },
      { id: "verify", label: "Verifying WhatsApp Business Account & phone number identity", status: "pending" },
      { id: "webhook", label: "Subscribing Cloud API webhook & syncing live channel", status: "pending" },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <WhatsAppModalIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Connect WhatsApp Business
                </h2>
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-semibold flex items-center gap-1"
                >
                  <MetaBrandIcon className="h-2.5 w-2.5" />
                  Meta Official
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Official WhatsApp Cloud API Embedded Signup Flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* STEP: INIT / READY */}
          {step === "INIT" && (
            <div className="space-y-5">
              {/* Configuration Status Notice */}
              {isLoadingConfig ? (
                <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>Loading Meta Embedded Signup configuration...</span>
                </div>
              ) : metaConfig && !metaConfig.isConfigured ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Meta Credentials Required</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    To connect your live WhatsApp account, please configure your Meta App credentials in{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">
                      backend/.env
                    </code>
                    :
                  </p>
                  <div className="bg-muted/60 p-2.5 rounded-lg font-mono text-[11px] text-muted-foreground space-y-1">
                    <p>META_APP_ID=your_real_meta_app_id</p>
                    <p>META_APP_SECRET=your_real_meta_app_secret</p>
                    <p>META_EMBEDDED_SIGNUP_CONFIG_ID=your_signup_config_id</p>
                  </div>
                </div>
              ) : null}

              {/* Step-by-Step Flow Explanation */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Meta Embedded Signup Process:
                </p>
                <div className="space-y-2.5 text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <span>
                      Log in to your Meta account and select your Business Portfolio (Business Manager).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <span>
                      Select an existing WhatsApp Business Account (WABA) or create a new one instantly.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      3
                    </div>
                    <span>
                      Select or register your business phone number and complete real-time OTP verification.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                      4
                    </div>
                    <span>
                      Confirm permissions — Appnix securely exchanges the code for encrypted tokens and sets up webhooks automatically.
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Banner */}
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Enterprise Grade Multi-Tenant Security
                  </p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Access tokens are encrypted at rest using AES-256-GCM. Your Meta credentials and phone numbers are strictly isolated to your organization workspace.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP: AWAITING_META (Meta Popup Opened) */}
          {step === "AWAITING_META" && (
            <div className="py-6 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
                <MetaBrandIcon className="h-7 w-7 text-blue-600" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-base">
                  Completing Meta Embedded Signup...
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Please complete the WhatsApp Business Account and phone number selection in the Meta popup window.
                </p>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground max-w-xs mx-auto space-y-1">
                <p className="text-[11px] font-semibold text-foreground flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-600" /> Listening for Meta callback
                </p>
                <p className="text-[10px]">
                  Do not refresh or close this page while the Meta dialog is active.
                </p>
              </div>
            </div>
          )}

          {/* STEP: VERIFYING (Verify & Complete Progress) */}
          {step === "VERIFYING" && (
            <div className="space-y-4">
              <div className="text-center space-y-1 pb-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  Verifying WhatsApp Business Channel
                </h3>
                <p className="text-xs text-muted-foreground">
                  Validating credentials with Meta Graph API and establishing live webhooks...
                </p>
              </div>

              {/* Handshake Stepper */}
              <div className="space-y-2.5 rounded-xl border bg-card p-4">
                {handshakeSteps.map((hs, idx) => (
                  <div key={hs.id} className="flex items-center gap-3 text-xs">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold transition-all",
                        hs.status === "completed" && "bg-emerald-600 text-white",
                        hs.status === "in_progress" &&
                          "bg-emerald-500/20 text-emerald-600 border border-emerald-500/40",
                        hs.status === "pending" && "bg-muted text-muted-foreground",
                        hs.status === "failed" && "bg-rose-600 text-white"
                      )}
                    >
                      {hs.status === "completed" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : hs.status === "in_progress" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : hs.status === "failed" ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-medium",
                        hs.status === "completed" && "text-foreground",
                        hs.status === "in_progress" && "text-emerald-600 font-semibold",
                        hs.status === "pending" && "text-muted-foreground",
                        hs.status === "failed" && "text-rose-600 font-semibold"
                      )}
                    >
                      {hs.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1.5">
                <div className="h-12 w-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  WhatsApp Channel Verified & Live!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp Business Account is connected to Appnix CRM Cloud API.
                </p>
              </div>

              {verifiedResult && (
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Business Name
                    </span>
                    <span className="font-bold text-foreground">
                      {verifiedResult.displayName || verifiedResult.wabaName || "WhatsApp Business"}
                    </span>
                  </div>

                  {verifiedResult.phoneNumber && (
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                        Phone Number
                      </span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {verifiedResult.phoneNumber}
                      </span>
                    </div>
                  )}

                  {verifiedResult.wabaId && (
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        WABA ID
                      </span>
                      <span className="font-mono text-foreground">{verifiedResult.wabaId}</span>
                    </div>
                  )}

                  {verifiedResult.businessId && (
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Business Portfolio ID
                      </span>
                      <span className="font-mono text-foreground">{verifiedResult.businessId}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
                      Quality Rating
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-semibold"
                    >
                      {verifiedResult.qualityRating || "UNKNOWN"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      Messaging Limit
                    </span>
                    <span className="font-medium text-foreground">
                      {verifiedResult.messagingLimitTier || "TIER_50"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-600" />
                      Webhook Status
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold"
                    >
                      Subscribed & Live
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: ERROR */}
          {step === "ERROR" && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1.5">
                <div className="h-12 w-12 mx-auto rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  Connection Incomplete
                </h3>
                <p className="text-xs text-muted-foreground">
                  Meta Embedded Signup could not complete verification.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Details:
                  </p>
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          {step === "INIT" && (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={launchMetaEmbeddedSignup}
                disabled={isLoadingConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm flex items-center gap-2"
              >
                <MetaBrandIcon className="h-4 w-4" />
                <span>Continue with Facebook / Meta</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "AWAITING_META" && (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Waiting for Meta dialog...</span>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          )}

          {step === "VERIFYING" && (
            <div className="w-full flex items-center justify-center text-xs text-muted-foreground py-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2 text-emerald-600" />
              <span>Verifying and saving channel in database...</span>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="w-full flex items-center justify-end">
              <Button
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                View WhatsApp Channel
              </Button>
            </div>
          )}

          {step === "ERROR" && (
            <div className="w-full flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
