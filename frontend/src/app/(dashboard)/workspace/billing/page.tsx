"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Calendar,
  Download,
  ArrowUpRight,
  Zap,
  Shield,
  Clock,
  Sparkles,
  Users,
  Bot,
  MessageSquare,
  Loader2,
  Receipt,
} from "lucide-react";
import { PlanCard, type CheckoutFlowMode } from "@/components/billing/PlanCard";
import { MockCashfreeModalContainer } from "@/components/billing/mock-cashfree-modal";
import { downloadReceipt } from "@/lib/invoice-generator";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  isCurrent?: boolean;
  features: string[];
}

const BASE_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter Tier",
    price: "₹999",
    period: "/month",
    description: "For small businesses starting with omnichannel messaging.",
    features: [
      "Up to 2,000 monthly messages",
      "2 WhatsApp / Social channels",
      "1 Automation Botflow",
      "2 Team Members",
      "Community Support",
    ],
  },
  {
    id: "pro",
    name: "Professional Tier",
    price: "₹2,999",
    period: "/month",
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
  {
    id: "enterprise",
    name: "Enterprise Custom",
    price: "₹8,999",
    period: "/month",
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
];

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  plan: string;
  amount: string;
  rawAmount: number;
  status: string;
  cfPaymentId?: string;
  paymentMethod?: string;
}

function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/proxy";
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return "https://api.appnix.co.in/api/v1";
}

export default function BillingPage() {
  const [activePlanId, setActivePlanId] = useState<string>("pro");
  const [activePlanDetails, setActivePlanDetails] = useState({
    name: "Professional Tier",
    price: "₹2,999/mo",
    status: "ACTIVE",
    remainingDays: 30,
    renewalDate: "04 Oct 2026",
    isTrial: false,
    maxTeamSeats: 10,
    usedTeamSeats: 1,
  });
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [flowMode, setFlowMode] = useState<CheckoutFlowMode>("sdk");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const syncPlanFromStorageOrApi = async () => {
    // 1. Immediate client storage hydration for instant UI response
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("appnix_active_plan");
      if (stored) {
        setActivePlanId(stored);
      }
      try {
        const localInvoices = JSON.parse(localStorage.getItem("appnix_transactions") || "[]");
        if (Array.isArray(localInvoices) && localInvoices.length > 0) {
          setInvoices(localInvoices);
          setIsLoadingInvoices(false);
        }
      } catch {}
    }

    // 2. Fetch authenticated subscription from backend
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("appnix_auth_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("appnix_token")
        : null;

    if (token) {
      try {
        const subRes = await fetch(`${getBackendUrl()}/billing/subscription`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.hasActiveSubscription && subData.data) {
            const d = subData.data;
            const resolvedPlanId = d.slug || d.planId || "pro";
            setActivePlanId(resolvedPlanId);

            const renewal = d.currentPeriodEnd
              ? new Date(d.currentPeriodEnd).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Next Month";

            setActivePlanDetails({
              name: d.isTrial ? "7-Day Free Trial" : (d.name || "Professional Tier"),
              price: d.isTrial ? "₹0 (Trial)" : (d.price || "₹2,999/mo"),
              status: d.status || (d.isTrial ? "TRIALING" : "ACTIVE"),
              remainingDays: d.remainingDays ?? (d.isTrial ? 7 : 30),
              renewalDate: renewal,
              isTrial: Boolean(d.isTrial),
              maxTeamSeats: d.maxTeamSeats || (d.isTrial ? 5 : 10),
              usedTeamSeats: d.usedTeamSeats || 1,
            });
          }
        }
      } catch (err) {
        console.warn("[BillingPage] Failed to fetch subscription details:", err);
      }
    }

    // 3. Fetch real database transaction orders
    try {
      const res = await fetch("/api/v1/payments/cashfree/history");
      if (res.ok) {
        const data = await res.json();
        if (data.activePlan && !activePlanDetails.isTrial) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("appnix_active_plan") : null;
          const resolvedPlanId = stored || data.activePlan.id || "pro";
          setActivePlanId(resolvedPlanId);

          const renewal = data.activePlan.currentPeriodEnd
            ? new Date(data.activePlan.currentPeriodEnd).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Next Month";

          setActivePlanDetails((prev) => ({
            ...prev,
            name:
              resolvedPlanId === "starter"
                ? "Starter Tier"
                : resolvedPlanId === "enterprise"
                ? "Enterprise Custom"
                : data.activePlan.name || "Professional Tier",
            price:
              resolvedPlanId === "starter"
                ? "₹999/mo"
                : resolvedPlanId === "enterprise"
                ? "₹8,999/mo"
                : data.activePlan.price || "₹2,999/mo",
            status: data.activePlan.status || "ACTIVE",
            remainingDays: data.activePlan.remainingDays || 30,
            renewalDate: renewal,
          }));
        }

        if (Array.isArray(data.invoices)) {
          let merged = data.invoices;
          if (typeof window !== "undefined") {
            try {
              const localInvoices = JSON.parse(localStorage.getItem("appnix_transactions") || "[]");
              const idSet = new Set(data.invoices.map((inv: any) => inv.id));
              const missingLocals = localInvoices.filter((inv: any) => !idSet.has(inv.id));
              merged = [...missingLocals, ...data.invoices];
              localStorage.setItem("appnix_transactions", JSON.stringify(merged));
            } catch {}
          }
          setInvoices(merged);
        }
      }
    } catch (err) {
      console.warn("[BillingPage] Failed to fetch real billing history:", err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    syncPlanFromStorageOrApi();
  }, []);

  const handleUpgradeComplete = (newPlanId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("appnix_active_plan", newPlanId);
    }
    setActivePlanId(newPlanId);
    syncPlanFromStorageOrApi();
  };

  // Compute active state dynamically so the upgraded plan shows as current
  const computedPlans = BASE_PLANS.map((p) => ({
    ...p,
    isCurrent: !activePlanDetails.isTrial && p.id === activePlanId,
  }));

  // Dynamic quota calculations based on active plan
  const quotaConfig = activePlanDetails.isTrial
    ? {
        msgs: "2,500 / 5,000",
        bots: "2 / 3",
        seats: `${activePlanDetails.usedTeamSeats} / ${activePlanDetails.maxTeamSeats}`,
        pctMsgs: "50%",
        pctBots: "66%",
        pctSeats: `${Math.min(100, Math.round((activePlanDetails.usedTeamSeats / (activePlanDetails.maxTeamSeats || 1)) * 100))}%`,
      }
    : activePlanId === "enterprise"
    ? { msgs: "Unlimited", bots: "Unlimited", seats: "Unlimited", pctMsgs: "10%", pctBots: "20%", pctSeats: "30%" }
    : activePlanId === "starter"
    ? { msgs: "450 / 2,000", bots: "1 / 1", seats: `${activePlanDetails.usedTeamSeats} / 2`, pctMsgs: "22.5%", pctBots: "100%", pctSeats: "50%" }
    : { msgs: "4,120 / 25,000", bots: "3 / 5", seats: `${activePlanDetails.usedTeamSeats} / 10`, pctMsgs: "16.48%", pctBots: "60%", pctSeats: "50%" };

  return (
    <div className="space-y-6">
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
        <span className="font-semibold text-primary">Billing</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Subscription & Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace subscription tier, invoices, and quota allowances.
        </p>
      </div>

      {/* Dynamic Active Subscription Banner */}
      <div
        className={cn(
          "rounded-xl border p-6 shadow-xs transition-all",
          activePlanDetails.isTrial
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card"
            : "border-border bg-card"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {activePlanDetails.isTrial ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold gap-1 px-2.5 py-0.5">
                  <Sparkles className="h-3 w-3" />
                  7-DAY FREE TRIAL
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold">
                  CURRENT PLAN
                </Badge>
              )}
              <h2 className="text-xl font-bold text-foreground">
                {activePlanDetails.isTrial ? "Your 7-Day Free Trial is Active" : `${activePlanDetails.name} Plan`}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {activePlanDetails.isTrial ? (
                <span>
                  Trial ends on <span className="font-semibold text-foreground">{activePlanDetails.renewalDate}</span> ({activePlanDetails.remainingDays} days remaining). Upgrade anytime to maintain uninterrupted WhatsApp & CRM messaging.
                </span>
              ) : (
                <span>
                  Renews automatically on <span className="font-semibold text-foreground">{activePlanDetails.renewalDate}</span> via Cashfree PG.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-left sm:text-right">
              <p className="text-2xl font-extrabold text-foreground">
                {activePlanDetails.isTrial ? "₹0" : activePlanDetails.price.replace("/mo", "")}
                <span className="text-sm font-normal text-muted-foreground">
                  {activePlanDetails.isTrial ? " (Free Trial)" : "/mo"}
                </span>
              </p>
              <p className="text-xs text-emerald-600 font-medium">
                {activePlanDetails.remainingDays} {activePlanDetails.remainingDays === 1 ? "Day" : "Days"} remaining in {activePlanDetails.isTrial ? "free trial" : "billing cycle"}
              </p>
            </div>
            <Button
              onClick={() => {
                const el = document.getElementById("available-tiers");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              variant={activePlanDetails.isTrial ? "default" : "outline"}
              className={cn(
                "text-xs gap-1.5 font-semibold cursor-pointer",
                activePlanDetails.isTrial && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              )}
            >
              {activePlanDetails.isTrial ? (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Upgrade to Paid Plan</span>
                </>
              ) : (
                <span>Change Subscription</span>
              )}
            </Button>
          </div>
        </div>

        {/* Quota Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Messages Dispatched
              </span>
              <span className="font-semibold text-foreground">{quotaConfig.msgs}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: quotaConfig.pctMsgs }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" /> Botflows Active
              </span>
              <span className="font-semibold text-foreground">{quotaConfig.bots}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: quotaConfig.pctBots }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Team Seats Used
              </span>
              <span className="font-semibold text-foreground">{quotaConfig.seats}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: quotaConfig.pctSeats }} />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Tiers */}
      <div id="available-tiers" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Available Workspace Tiers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose the tier that matches your customer messaging scale. Powered by Cashfree Payments.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1 self-start sm:self-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                billingCycle === "yearly"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {computedPlans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              billingCycle={billingCycle}
              flowMode={flowMode}
              onUpgradeComplete={handleUpgradeComplete}
            />
          ))}
        </div>
      </div>

      {/* Real Invoices Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              Billing Invoices & Transaction Receipts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download your official tax invoices and payment receipts.
            </p>
          </div>
          {invoices.length > 0 && (
            <Badge variant="outline" className="text-xs font-mono">
              {invoices.length} {invoices.length === 1 ? "Record" : "Records"}
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3.5 text-left">Order ID</th>
                <th className="p-3.5 text-left">Billing Date</th>
                <th className="p-3.5 text-left">Plan / Description</th>
                <th className="p-3.5 text-left">Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingInvoices ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading real billing history from database...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-foreground">No Billing Invoices Found</p>
                      <p>
                        Your real tax invoices and payment receipts will be recorded here automatically when you complete a subscription upgrade.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-mono text-xs font-semibold text-foreground">
                      {inv.id}
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">
                      {inv.date}
                    </td>
                    <td className="p-3.5 text-xs text-foreground font-medium">
                      {inv.plan}
                    </td>
                    <td className="p-3.5 text-xs font-bold text-foreground">
                      {inv.amount}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        className={cn(
                          "text-[10px] font-bold",
                          inv.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadReceipt({
                            orderId: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            planName: inv.plan,
                            amount: inv.rawAmount,
                            date: inv.date,
                            paymentMethod: inv.paymentMethod,
                            cfPaymentId: inv.cfPaymentId,
                          })
                        }
                        className="h-7 text-xs gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
