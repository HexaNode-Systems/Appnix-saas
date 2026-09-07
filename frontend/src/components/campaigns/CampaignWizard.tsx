"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Check,
  AlertCircle,
  Loader2,
  X,
  Megaphone,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CampaignStepDetails } from "./steps/CampaignStepDetails";
import { CampaignStepAudience } from "./steps/CampaignStepAudience";
import { CampaignStepChannel } from "./steps/CampaignStepChannel";
import { CampaignStepTemplate } from "./steps/CampaignStepTemplate";
import { CampaignStepConfigure } from "./steps/CampaignStepConfigure";
import { CampaignStepPreview } from "./steps/CampaignStepPreview";
import { CampaignStepReview } from "./steps/CampaignStepReview";
import { TestMessageModal } from "./TestMessageModal";
import { LaunchConfirmModal } from "./LaunchConfirmModal";
import type {
  CampaignData,
  WizardStep,
  AudienceItem,
  ChannelItem,
  MetaTemplate,
} from "@/hooks/useCampaignWizard";

// Concise, non-overflowing wizard step labels
const COMPACT_STEP_LABELS: Record<WizardStep, string> = {
  details: "Details",
  audience: "Audience",
  channel: "Channel",
  template: "Template",
  configure: "Configure",
  preview: "Preview",
  review: "Review & Launch",
};

interface CampaignWizardProps {
  campaign: CampaignData;
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;
  updateCampaignData: (data: Partial<CampaignData>) => void;
  onSaveDraft: () => void;
  onComplete: () => void;
  isLoading: boolean;
  isRefreshingTemplates?: boolean;
  error: string | null;
  audiences: AudienceItem[];
  channels: ChannelItem[];
  templates: MetaTemplate[];
  testSent: boolean;
  canProceed: boolean;
  nextStep: () => void;
  prevStep: () => void;
  selectAudience: (audienceId: string) => void;
  selectChannel: (channel: "WHATSAPP" | "INSTAGRAM" | "RCS" | "FACEBOOK") => void;
  selectTemplate: (templateId: string) => void;
  configureTemplate: (mappings: Record<string, string>) => void;
  sendTest: (testPhoneNumber: string, testContactName?: string) => Promise<unknown>;
  validateCampaign: () => Promise<{ valid: boolean; errors: string[] }>;
  launchCampaign: (confirmed: boolean, launchMode: "IMMEDIATE" | "SCHEDULED", scheduledAt?: string) => Promise<unknown>;
  loadTemplates: (channel?: string) => Promise<void>;
  STEPS: Array<{ id: WizardStep; label: string; description: string }>;
}

export function CampaignWizard({
  campaign,
  currentStep,
  setCurrentStep,
  updateCampaignData,
  onSaveDraft,
  onComplete,
  isLoading,
  isRefreshingTemplates,
  error,
  audiences,
  channels,
  templates,
  testSent,
  canProceed,
  nextStep,
  prevStep,
  selectAudience,
  selectChannel,
  selectTemplate,
  configureTemplate,
  sendTest,
  validateCampaign,
  launchCampaign,
  loadTemplates,
  STEPS,
}: CampaignWizardProps) {
  const router = useRouter();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSaveDraft();
    } finally {
      setIsSaving(false);
    }
  }, [onSaveDraft]);

  const handleDiscard = useCallback(() => {
    if (confirm("Are you sure you want to discard unsaved changes and return to campaigns?")) {
      router.push("/crm/bulk-campaign");
    }
  }, [router]);

  const handleLaunchTrigger = useCallback(async () => {
    const validation = await validateCampaign();
    if (!validation.valid) {
      alert(`Please resolve the following before launching:\n\n• ${validation.errors.join("\n• ")}`);
      return;
    }
    setShowLaunchModal(true);
  }, [validateCampaign]);

  const handleLaunchConfirm = useCallback(
    async (confirmed: boolean, launchMode: "IMMEDIATE" | "SCHEDULED", scheduledAt?: string) => {
      setIsLaunching(true);
      try {
        await launchCampaign(confirmed, launchMode, scheduledAt);
        setShowLaunchModal(false);
        onComplete();
      } catch (err) {
        console.error("Launch failed:", err);
      } finally {
        setIsLaunching(false);
      }
    },
    [launchCampaign, onComplete]
  );

  const handleTestSend = useCallback(
    async (phone: string, name?: string) => {
      await sendTest(phone, name);
    },
    [sendTest]
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case "channel":
        return (
          <CampaignStepChannel
            campaign={campaign}
            channels={channels}
            selectChannel={selectChannel}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={() => router.push("/crm/bulk-campaign")}
            loadTemplates={loadTemplates}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "details":
        return (
          <CampaignStepDetails
            campaign={campaign}
            updateCampaignData={updateCampaignData}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={prevStep}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "audience":
        return (
          <CampaignStepAudience
            campaign={campaign}
            audiences={audiences}
            selectAudience={selectAudience}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={prevStep}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "template":
        return (
          <CampaignStepTemplate
            campaign={campaign}
            templates={templates}
            selectTemplate={selectTemplate}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={prevStep}
            isLoading={isLoading}
            isRefreshing={isRefreshingTemplates}
            loadTemplates={loadTemplates}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "configure":
        return (
          <CampaignStepConfigure
            campaign={campaign}
            configureTemplate={configureTemplate}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={prevStep}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "preview":
        return (
          <CampaignStepPreview
            campaign={campaign}
            templates={templates}
            canProceed={canProceed}
            onNext={nextStep}
            onPrev={prevStep}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
          />
        );
      case "review":
        return (
          <CampaignStepReview
            campaign={campaign}
            testSent={testSent}
            onSendTest={() => setShowTestModal(true)}
            onLaunch={handleLaunchTrigger}
            onSaveDraft={handleSaveDraft}
            onPrev={prevStep}
            isSaving={isSaving}
            isLaunching={isLaunching}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Top Navigation Bar */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push("/crm/bulk-campaign")}
              className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Bulk Campaigns</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Create Campaign
                </h1>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  Draft
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure message settings, audience targeting, and dispatch parameters.
              </p>
            </div>

            {/* Header Right Action Buttons: Save Draft + Discard */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                className="text-xs h-9 px-3.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Discard
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving || !campaign.name.trim()}
                className="gap-1.5 text-xs h-9 px-3.5 border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                <Save className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                <span>{isSaving ? "Saving..." : "Save Draft"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Wizard Stepper Bar (Horizontal, Modern & Compact Timeline) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-xs">
          <div className="hidden md:flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const compactLabel = COMPACT_STEP_LABELS[step.id] || step.label;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= currentStepIndex) {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={index > currentStepIndex}
                    className={cn(
                      "flex items-center gap-2.5 group text-left transition-all",
                      index <= currentStepIndex ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : index + 1}
                    </div>

                    <span
                      className={cn(
                        "text-xs whitespace-nowrap transition-colors",
                        isCurrent
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : isCompleted
                          ? "text-slate-800 dark:text-slate-200 font-medium"
                          : "text-slate-400 dark:text-slate-500 font-normal"
                      )}
                    >
                      {compactLabel}
                    </span>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-3 rounded-full transition-all duration-300",
                        index < currentStepIndex
                          ? "bg-emerald-600"
                          : "bg-slate-200 dark:bg-slate-800"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Step Status */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Step {currentStepIndex + 1} of {STEPS.length}: {COMPACT_STEP_LABELS[currentStep] || STEPS[currentStepIndex]?.label}
              </span>
              <span className="text-slate-500 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error notification if present */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Step Body */}
        <div>{renderStepContent()}</div>
      </div>

      {/* Test Message Modal */}
      {showTestModal && (
        <TestMessageModal
          campaign={campaign}
          templates={templates}
          onClose={() => setShowTestModal(false)}
          onSend={handleTestSend}
        />
      )}

      {/* Launch Confirmation Modal */}
      {showLaunchModal && (
        <LaunchConfirmModal
          campaign={campaign}
          onClose={() => setShowLaunchModal(false)}
          onConfirm={handleLaunchConfirm}
          onSaveDraft={handleSaveDraft}
          isLoading={isLaunching}
        />
      )}
    </div>
  );
}