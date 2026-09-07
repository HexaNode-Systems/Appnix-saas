"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlanTier } from "@/super-admin/types";
import { billingService } from "@/super-admin/services";
import { PlanModal } from "@/super-admin/components/billing/PlanModal";
import {
  CreditCard,
  ArrowLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Edit2,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Server,
  BarChart3,
} from "lucide-react";

export default function SuperAdminBillingPage() {
  const [plans, setPlans] = useState<PlanTier[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);

  const fetchPlans = () => {
    billingService.getPlans().then(setPlans);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleEditPlan = (plan: PlanTier) => {
    setEditingPlan(plan);
    setIsPlanModalOpen(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setIsPlanModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/super-admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Billing & Plans</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Billing & Plans Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure subscription tiers, feature entitlements, quotas, and pricing models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Opening Revenue & ARPU Analytics...")}
            className="text-xs font-semibold gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Analytics
          </Button>

          <Button
            onClick={handleCreatePlan}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Pricing Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-6 shadow-xs transition-all duration-200 bg-card",
                plan.isPopular
                  ? "border-emerald-600/60 ring-2 ring-emerald-600/20 bg-emerald-50/10"
                  : "border-border hover:shadow-md"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-lg text-foreground">{plan.name}</h3>
                  {plan.isPopular && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                      POPULAR
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-foreground">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/mo</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    (${plan.yearlyPrice}/yr)
                  </span>
                </div>

                <div className="space-y-2.5 my-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Up to {plan.userLimit} Users</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{plan.apiLimit}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Server className="h-4 w-4 text-primary shrink-0" />
                    <span>{plan.storageLimit}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>{plan.supportSla}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Features Included:
                  </p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPlan(plan)}
                  className="w-full text-xs font-semibold gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Plan
                </Button>
              </div>
            </div>
          );
        })}

        {/* Create New Plan Card (Dashed) */}
        <button
          type="button"
          onClick={handleCreatePlan}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-6 text-center transition-all cursor-pointer min-h-[360px]",
            "hover:border-emerald-600/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 group"
          )}
        >
          <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-600/40 bg-card text-emerald-600 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors">
            Create New Plan
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-44">
            Draft a custom pricing tier with unique quota and SLA limits
          </p>
        </button>
      </div>

      {/* Plan Creation / Edit Modal */}
      <PlanModal
        isOpen={isPlanModalOpen}
        plan={editingPlan}
        onClose={() => setIsPlanModalOpen(false)}
        onSavePlan={(saved) => {
          billingService.savePlan(saved).then(() => {
            fetchPlans();
            alert(`Plan ${saved.name} saved successfully!`);
          });
        }}
      />
    </div>
  );
}
