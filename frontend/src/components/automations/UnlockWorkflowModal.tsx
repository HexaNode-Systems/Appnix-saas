"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  KeyRound,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  ExternalLink,
  Layers,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";

export interface UnlockWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowUnlocked?: (unlockedWorkflow: any) => void;
}

export function UnlockWorkflowModal({
  isOpen,
  onClose,
  onWorkflowUnlocked,
}: UnlockWorkflowModalProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"key" | "quota">("key");
  const [licenseKey, setLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  if (!isOpen) return null;

  // Format license key input as user types (e.g. WFLW-XXXX-XXXX-XXXX)
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (val.length > 16) val = val.slice(0, 16);

    const parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.slice(i, i + 4));
    }
    setLicenseKey(parts.join("-"));
    setErrorMessage(null);
    setSuccessData(null);
  };

  // Quick Preset Key Clicker
  const handleSelectPresetKey = (key: string) => {
    setLicenseKey(key);
    setErrorMessage(null);
    setSuccessData(null);
  };

  // Submit Key Validation
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setErrorMessage("Please enter a valid 16-character license key.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessData(null);

    try {
      // Call backend API
      const response = await api.post("/automations/workflows/unlock", {
        licenseKey: licenseKey.trim(),
      });

      if (response.data && response.data.success) {
        setSuccessData(response.data.unlockedWorkflow || { title: "Premium Automation Workflow" });
        if (onWorkflowUnlocked) {
          onWorkflowUnlocked(response.data.unlockedWorkflow);
        }
      } else {
        setErrorMessage(response.data?.message || "Invalid or unverified license key.");
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        "License verification failed. Please ensure the key is valid and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Unlock Automation Workflows</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold">
                  License Center
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter an activation license key or redeem workflow credits to unlock premium automations.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("key");
                setErrorMessage(null);
              }}
              className={cn(
                "py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                activeTab === "key"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Enter License / Share Key</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("quota");
                setErrorMessage(null);
              }}
              className={cn(
                "py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                activeTab === "quota"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Workspace Plan Quota</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ENTER LICENSE KEY                                 */}
        {/* ======================================================== */}
        {activeTab === "key" && (
          <div className="px-6 space-y-4">
            {/* Success Feedback Banner */}
            {successData && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Workflow Successfully Unlocked!</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{successData.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    This premium automation canvas is now unlocked and available in your workflow list.
                  </p>
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onClose();
                      router.push(`/automations/workflow/${successData.id || "wf_unlocked"}/builder`);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                  >
                    <span>Open in Canvas Builder</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSuccessData(null);
                      setLicenseKey("");
                    }}
                    className="text-xs h-8"
                  >
                    Unlock Another
                  </Button>
                </div>
              </div>
            )}

            {/* Error Feedback Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!successData && (
              <form onSubmit={handleVerifyKey} className="space-y-4">
                {/* Form Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="license-key" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      16-Character License / Share Key
                    </Label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {licenseKey.length} / 19
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="license-key"
                      placeholder="WFLW-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={handleKeyChange}
                      className="pl-9 h-10 font-mono text-sm uppercase tracking-wider bg-background border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    License keys are provided with enterprise plans, template packs, and partner referrals.
                  </p>
                </div>

                {/* Sample Test Keys */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-muted/20 p-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Quick Sample Keys for Testing:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPresetKey("WFLW-VIP8-2026-PREM")}
                      className="px-2 py-1 rounded-md border text-[11px] font-mono font-semibold bg-card hover:bg-muted/50 text-foreground transition-colors"
                    >
                      WFLW-VIP8-2026-PREM (AI Lead Bot)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetKey("WFLW-CART-REC9-9921")}
                      className="px-2 py-1 rounded-md border text-[11px] font-mono font-semibold bg-card hover:bg-muted/50 text-foreground transition-colors"
                    >
                      WFLW-CART-REC9-9921 (Cart Recovery)
                    </button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 -mx-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !licenseKey.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Validating Key...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Verify & Unlock</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: WORKSPACE PLAN QUOTA                              */}
        {/* ======================================================== */}
        {activeTab === "quota" && (
          <div className="px-6 space-y-4">
            {/* Quota Progress Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Starter Tier Plan Quota</h4>
                    <p className="text-[11px] text-muted-foreground">Active Automation Workflows</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">
                  80% Used
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground font-bold">4 active flows</span>
                  <span className="text-muted-foreground">5 max limit</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "80%" }} />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You have <strong>1 workflow slot remaining</strong> on your current tier. Upgrading to Pro unlocks unlimited workflows, AI handover bots, and custom webhooks.
              </p>
            </div>

            {/* Pro Tier Upgrade Perks Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Crown className="h-4 w-4" />
                <span>Unlock Full Omnichannel Power with Professional Tier</span>
              </div>
              <ul className="text-xs space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Unlimited Active Automations & Botflows</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Multi-channel Triggers (WhatsApp, Instagram, FB, RCS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Advanced AI Agent Classifier & Live Handover</span>
                </li>
              </ul>
            </div>

            {/* Quota Footer Actions */}
            <div className="p-4 -mx-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs h-9"
              >
                Close
              </Button>
              <Link href="/workspace/billing">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 gap-1.5 font-semibold shadow-sm"
                >
                  <span>Upgrade Plan to Pro Tier</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
