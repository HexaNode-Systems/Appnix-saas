"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PlanTier } from "../../types";
import { X, CreditCard } from "lucide-react";

interface PlanModalProps {
  isOpen: boolean;
  plan?: PlanTier | null;
  onClose: () => void;
  onSavePlan: (plan: PlanTier) => void;
}

export function PlanModal({ isOpen, plan, onClose, onSavePlan }: PlanModalProps) {
  const [name, setName] = useState(plan?.name || "");
  const [monthlyPrice, setMonthlyPrice] = useState(plan?.monthlyPrice?.toString() || "2999");
  const [yearlyPrice, setYearlyPrice] = useState(plan?.yearlyPrice?.toString() || "29990");
  const [userLimit, setUserLimit] = useState(plan?.userLimit?.toString() || "10");
  const [apiLimit, setApiLimit] = useState(plan?.apiLimit || "50,000 req/mo");
  const [storageLimit, setStorageLimit] = useState(plan?.storageLimit || "10 GB");
  const [supportSla, setSupportSla] = useState(plan?.supportSla || "12h Support Response");
  const [customDomain, setCustomDomain] = useState(plan?.customDomain ?? true);
  const [sso, setSso] = useState(plan?.sso ?? false);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(plan?.advancedAnalytics ?? true);
  const [prioritySupport, setPrioritySupport] = useState(plan?.prioritySupport ?? false);
  const [isPopular, setIsPopular] = useState(plan?.isPopular ?? false);

  useEffect(() => {
    if (isOpen) {
      setName(plan?.name || "");
      setMonthlyPrice(plan?.monthlyPrice ? plan.monthlyPrice.toString() : "2999");
      setYearlyPrice(plan?.yearlyPrice ? plan.yearlyPrice.toString() : "29990");
      setUserLimit(plan?.userLimit ? plan.userLimit.toString() : "10");
      setApiLimit(plan?.apiLimit || "50,000 req/mo");
      setStorageLimit(plan?.storageLimit || "10 GB");
      setSupportSla(plan?.supportSla || "12h Support Response");
      setCustomDomain(plan?.customDomain ?? true);
      setSso(plan?.sso ?? false);
      setAdvancedAnalytics(plan?.advancedAnalytics ?? true);
      setPrioritySupport(plan?.prioritySupport ?? false);
      setIsPopular(plan?.isPopular ?? false);
    }
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const mPrice = parseFloat(monthlyPrice) || 0;
    const yPrice = parseFloat(yearlyPrice) || Math.round(mPrice * 10);

    onSavePlan({
      id: plan?.id || name.toLowerCase().replace(/\s+/g, "-"),
      name: name.trim(),
      monthlyPrice: mPrice,
      yearlyPrice: yPrice,
      userLimit: userLimit === "Unlimited" ? "Unlimited" : parseInt(userLimit) || 5,
      apiLimit,
      storageLimit,
      supportSla,
      features: [
        `${userLimit} Users Allowed`,
        apiLimit,
        storageLimit,
        supportSla,
        customDomain ? "Custom Domain & Branding" : "Standard Domain",
        sso ? "Enterprise SAML / SSO" : "Standard Email & Google Auth",
      ],
      isPopular,
      customDomain,
      sso,
      advancedAnalytics,
      prioritySupport,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {plan ? `Edit ${plan.name} Tier` : "Create New Subscription Plan"}
              </h2>
              <p className="text-xs text-muted-foreground">Configure pricing tier limits, features, and SLAs.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Plan Name *</label>
            <Input
              required
              placeholder="e.g. Scale Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Monthly Price (₹ INR)</label>
              <Input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Yearly Price (₹ INR)</label>
              <Input
                type="number"
                value={yearlyPrice}
                onChange={(e) => setYearlyPrice(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">User Limit</label>
              <Input
                placeholder="e.g. 25 or Unlimited"
                value={userLimit}
                onChange={(e) => setUserLimit(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Messages / API Limit</label>
              <Input
                placeholder="e.g. 50,000 req/mo"
                value={apiLimit}
                onChange={(e) => setApiLimit(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Storage Limit</label>
              <Input
                placeholder="e.g. 50 GB"
                value={storageLimit}
                onChange={(e) => setStorageLimit(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Support Response SLA</label>
              <Input
                placeholder="e.g. 4h Priority Response"
                value={supportSla}
                onChange={(e) => setSupportSla(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Feature Checkboxes */}
          <div className="space-y-2 pt-2 border-t">
            <p className="font-bold text-foreground">Plan Badges & Entitlements</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={isPopular} onCheckedChange={(c) => setIsPopular(!!c)} />
                <span className="font-semibold text-emerald-600">Most Popular Tier</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={customDomain} onCheckedChange={(c) => setCustomDomain(!!c)} />
                <span>Custom Domain</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={sso} onCheckedChange={(c) => setSso(!!c)} />
                <span>SAML / SSO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={advancedAnalytics} onCheckedChange={(c) => setAdvancedAnalytics(!!c)} />
                <span>Advanced Analytics</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={prioritySupport} onCheckedChange={(c) => setPrioritySupport(!!c)} />
                <span>Priority Support</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Save Plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
