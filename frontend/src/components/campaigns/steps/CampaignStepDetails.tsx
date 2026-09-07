"use client";

import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Megaphone,
  Save,
  Bookmark,
  Check,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CampaignStepDetailsProps {
  campaign: {
    name: string;
    description: string;
    status?: string;
  };
  updateCampaignData: (data: { name?: string; description?: string }) => void;
  canProceed?: boolean;
  onNext: () => void;
  onPrev?: () => void;
  onSaveDraft?: () => void;
  isSaving?: boolean;
}

export function CampaignStepDetails({
  campaign,
  updateCampaignData,
  canProceed,
  onNext,
  onPrev,
  onSaveDraft,
  isSaving = false,
}: CampaignStepDetailsProps) {
  const [nameTouched, setNameTouched] = useState(false);

  const nameLength = campaign.name?.length || 0;
  const descriptionLength = campaign.description?.length || 0;
  const isNameValid = campaign.name.trim().length > 0;
  const isProceedDisabled = canProceed !== undefined ? !canProceed : !isNameValid;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Main Form Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground shadow-xs overflow-hidden transition-all">
        {/* Card Header */}
        <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Campaign Details
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Set a clear name and internal description to identify this campaign across reports.
            </p>
          </div>
        </div>

        {/* Card Form Body */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Field 1: Campaign Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="campaign-name"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1"
              >
                <span>Campaign Name</span>
                <span className="text-rose-500 text-sm font-bold" title="Required">*</span>
              </Label>
              <span
                className={cn(
                  "text-[11px] font-mono",
                  nameLength > 80 ? "text-rose-500 font-bold" : "text-slate-400 dark:text-slate-500"
                )}
              >
                {nameLength} / 80
              </span>
            </div>

            <Input
              id="campaign-name"
              type="text"
              maxLength={80}
              placeholder="e.g. Festival Season VIP Discount 25%"
              value={campaign.name}
              onBlur={() => setNameTouched(true)}
              onChange={(e) => updateCampaignData({ name: e.target.value })}
              className={cn(
                "h-11 text-sm bg-background border-slate-300 dark:border-slate-700 rounded-lg px-3.5 transition-all shadow-2xs",
                "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
                nameTouched && !isNameValid && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
              )}
              autoFocus
            />

            <div className="flex items-center justify-between text-xs pt-0.5">
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Visible only internally to you and your team on dashboards and analytics.
              </p>
              {nameTouched && !isNameValid && (
                <span className="text-rose-500 text-xs font-medium">Name is required</span>
              )}
            </div>
          </div>

          {/* Field 2: Campaign Description (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="campaign-description"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span>Campaign Description</span>
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
              </Label>
              <span
                className={cn(
                  "text-[11px] font-mono",
                  descriptionLength > 250 ? "text-rose-500 font-bold" : "text-slate-400 dark:text-slate-500"
                )}
              >
                {descriptionLength} / 250
              </span>
            </div>

            <Textarea
              id="campaign-description"
              maxLength={250}
              rows={3}
              placeholder="e.g. Exclusive 25% discount promo broadcast to VIP loyal customers for the festival holiday weekend."
              value={campaign.description}
              onChange={(e) => updateCampaignData({ description: e.target.value })}
              className="text-sm bg-background border-slate-300 dark:border-slate-700 rounded-lg p-3 resize-none transition-all shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />

            <p className="text-slate-500 dark:text-slate-400 text-xs pt-0.5">
              Add internal context, campaign objectives, or notes for your team.
            </p>
          </div>

          {/* Pro Tip Card */}
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 sm:p-4.5 flex items-start gap-3.5 transition-all">
            <div className="h-8 w-8 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
              <span className="font-bold text-emerald-900 dark:text-emerald-300">Pro Tip: </span>
              <span className="text-emerald-800/90 dark:text-emerald-300/90">
                Include the target audience and core offer in your title (e.g.{" "}
                <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                  &quot;Diwali Flash Sale 2026 - VIP Tier&quot;
                </span>
                ) for effortless tracking and filtering in analytics reports.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Footer */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card/95 backdrop-blur-md p-4 sm:p-4.5 shadow-lg flex items-center justify-between gap-4">
        <div>
          {onPrev ? (
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
              className="text-xs h-10 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Channel</span>
            </Button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSaving || !campaign.name.trim()}
              className="text-xs h-10 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving Draft..." : "Save Draft"}</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onNext}
            disabled={isProceedDisabled}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-6 rounded-lg shadow-sm gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Continue to Audience</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}