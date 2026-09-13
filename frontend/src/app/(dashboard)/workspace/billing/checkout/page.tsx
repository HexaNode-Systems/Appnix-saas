"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Lock,
  Zap,
  Loader2,
  AlertCircle,
  Building2,
  QrCode,
  Sparkles,
} from "lucide-react";
import { useCashfree } from "@/hooks/useCashfree";
import { MockCashfreeModalContainer } from "@/components/billing/mock-cashfree-modal";

interface PlanConfig {
  id: string;
  slug?: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
}

const AVAILABLE_PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    slug: "starter",
    name: "Starter Tier",
    monthlyPrice: 999,
    yearlyPrice: 9590, // ~20% off
    description: "For small businesses starting with omnichannel messaging.",
    features: [
      "Up to 2,000 monthly messages",
      "2 WhatsApp / Social channels",
      "1 Automation Botflow",
      "2 Team Members",
      "Community Support & API Access",
    ],
  },
  pro: {
    id: "pro",
    slug: "pro",
    name: "Professional Tier",
    monthlyPrice: 2999,
    yearlyPrice: 28790,
    description: "For fast-scaling teams automating campaigns and customer care.",
    features: [
      "Up to 25,000 monthly messages",
      "Unlimited Channels (WhatsApp, IG, FB, RCS)",
      "5 Advanced AI Botflows",
      "10 Team Member Seats",
      "Priority Live Support & SLA",
      "Custom Webhooks & REST API",
    ],
  },
  enterprise: {
    id: "enterprise",
    slug: "enterprise",
    name: "Enterprise Custom",
    monthlyPrice: 8999,
    yearlyPrice: 86390,
    description: "Dedicated high-volume messaging infrastructure and SLA.",
    features: [
      "Unlimited Monthly Messages",
      "Custom AI Voice Agent streaming",
      "Unlimited Automation Botflows",
      "Unlimited Team Seats & SSO",
      "Dedicated Account Manager",
      "Custom SLA & On-premise deployment",
    ],
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createPaymentSession, checkout, isLoaded, mode } = useCashfree();

  const planParam = searchParams.get("plan") || "starter";
  const cycleParam = (searchParams.get("cycle") as "monthly" | "quarterly" | "half_yearly" | "yearly") || "monthly";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "half_yearly" | "yearly">(cycleParam);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dynamicPlans, setDynamicPlans] = useState<PlanConfig[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("appnix_auth_token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("appnix_token")
            : null;

        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch("/api/proxy/billing/plans", { headers, cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
          if (isMounted && list.length > 0) {
            const mapped: PlanConfig[] = list.map((p: any) => ({
              id: p.id,
              slug: p.slug || p.id,
              name: p.name,
              monthlyPrice: Number(p.monthlyPrice ?? p.price ?? 999),
              yearlyPrice: Number(p.yearlyPrice ?? ((p.monthlyPrice ?? 999) * 10)),
              description: p.description || "",
              features: Array.isArray(p.features)
                ? p.features
                : typeof p.features === "string"
                ? JSON.parse(p.features || "[]")
                : [
                    `Up to ${(p.limits?.maxMessages || 2000).toLocaleString()} monthly messages`,
                    `${p.limits?.maxBots || 1} Automation Botflow`,
                    `${p.limits?.maxUsers || 2} Team Members`,
                    `${p.limits?.supportLevel || "Standard Support"}`,
                  ],
            }));
            setDynamicPlans(mapped);
          }
        }
      } catch (e) {
        console.warn("[Checkout] Could not load dynamic plans from backend:", e);
      } finally {
        if (isMounted) setIsLoadingPlans(false);
      }
    }
    loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const matchedDynamic = dynamicPlans.find(
    (p) =>
      p.slug?.toLowerCase() === planParam.toLowerCase() ||
      p.id?.toLowerCase() === planParam.toLowerCase() ||
      p.name?.toLowerCase() === planParam.toLowerCase()
  );

  const plan: PlanConfig =
    matchedDynamic ||
    AVAILABLE_PLANS[planParam.toLowerCase()] ||
    (dynamicPlans.length > 0 ? dynamicPlans[0] : AVAILABLE_PLANS.starter);

  // Calculation
  let basePrice = plan.monthlyPrice;
  let periodLabel = "month";

  if (billingCycle === "yearly") {
    basePrice = plan.yearlyPrice;
    periodLabel = "year";
  } else if (billingCycle === "half_yearly") {
    basePrice = Math.round(plan.monthlyPrice * 6 * 0.85);
    periodLabel = "6 months";
  } else if (billingCycle === "quarterly") {
    basePrice = Math.round(plan.monthlyPrice * 3 * 0.9);
    periodLabel = "3 months";
  } else {
    basePrice = plan.monthlyPrice;
    periodLabel = "month";
  }

  const gstAmount = Math.round(basePrice * 0.18); // 18% GST standard in India
  const totalAmount = basePrice + gstAmount;

  const handleCashfreePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const targetPlanKey = plan.slug || plan.id;

    try {
      const returnUrl = `${window.location.origin}/workspace/billing/status?order_id={order_id}&plan=${targetPlanKey}&amount=${totalAmount}`;

      // 1. Request Cashfree payment session
      const session = await createPaymentSession({
        planId: targetPlanKey,
        billingCycle,
        returnUrl,
      });

      if (!session?.paymentSessionId && !session?.paymentLink) {
        throw new Error("Unable to establish Cashfree payment session.");
      }

      // 2. Launch Cashfree SDK checkout (or Sandbox Simulator Fallback)
      await checkout({
        paymentSessionId: session.paymentSessionId,
        orderId: session.orderId,
        planId: targetPlanKey,
        planName: plan.name,
        amount: totalAmount,
        isMock: session.isMock,
        fallbackPaymentLink: session.paymentLink,
        redirectTarget: "modal",
        returnUrl: `${window.location.origin}/workspace/billing/status?order_id=${session.orderId}&plan=${targetPlanKey}&amount=${totalAmount}`,
      });
    } catch (err: any) {
      console.error("[Checkout] Payment failed:", err);
      setErrorMessage(err.message || "Payment initiation failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isLoadingPlans) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs text-muted-foreground">Loading checkout details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <MockCashfreeModalContainer />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/workspace"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Workspace</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <Link
          href="/workspace/billing"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Billing
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-primary">Checkout Review</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <CreditCard className="h-6 w-6 text-primary" />
          Upgrade Checkout Review
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirm your workspace subscription upgrade details before proceeding to Cashfree payment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plan & Features Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plan Selected Card */}
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold mb-2">
                  SELECTED SUBSCRIPTION
                </Badge>
                <h2 className="text-xl font-extrabold text-foreground">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-foreground">₹{basePrice.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground block">/{periodLabel}</span>
              </div>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="rounded-lg border bg-muted/30 p-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all text-center",
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                1 Month
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("quarterly")}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1",
                  billingCycle === "quarterly"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>3 Months</span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  10% OFF
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("half_yearly")}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1",
                  billingCycle === "half_yearly"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>6 Months</span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  15% OFF
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1",
                  billingCycle === "yearly"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Annual</span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  20% OFF
                </span>
              </button>
            </div>

            {/* Feature Checklist */}
            <div className="border-t pt-4 space-y-2.5">
              <h3 className="text-xs font-bold text-foreground">What's Included in This Tier:</h3>
              <div className="space-y-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Gateway Trust Card */}
          <div className="rounded-xl border bg-muted/20 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-foreground">Cashfree Payment Gateway Integration</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Payments are processed through Cashfree's PCI-DSS Level 1 compliant secure checkout. All Indian payment instruments are supported, including UPI (Google Pay, PhonePe, Paytm), Credit / Debit Cards (Visa, Mastercard, RuPay), and NetBanking across 50+ banks.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1">
                <QrCode className="h-3.5 w-3.5 text-primary" /> Instant UPI QR
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Credit / Debit
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" /> NetBanking
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Action */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b pb-3">Order Summary</h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Base Subscription ({billingCycle})</span>
                <span className="font-semibold text-foreground">₹{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Applicable Taxes (18% GST)
                </span>
                <span className="font-semibold text-foreground">₹{gstAmount.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex items-baseline justify-between">
                <span className="text-sm font-bold text-foreground">Total Payable</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">₹{totalAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">INR (All Inclusive)</span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <Button
                onClick={handleCashfreePayment}
                disabled={isProcessing}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Connecting to Cashfree...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Pay ₹{totalAmount.toLocaleString()} via Cashfree</span>
                  </>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Link href="/workspace/billing">
                  Cancel & Return to Billing
                </Link>
              </Button>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>SDK Mode:</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {mode.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Upon confirmation, your workspace subscription and quotas are upgraded immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
