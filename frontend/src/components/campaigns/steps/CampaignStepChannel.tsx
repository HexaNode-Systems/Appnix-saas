"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Camera,
  ScanLine,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Save,
  Radio,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChannelItem } from "@/hooks/useCampaignWizard";

type ChannelType = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "RCS";

const channelMeta: Record<
  ChannelType,
  {
    label: string;
    icon: React.ElementType;
    iconStyle: string;
    description: string;
    connectUrl: string;
  }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    icon: MessageSquare,
    iconStyle: "bg-emerald-500 text-white",
    description: "Send rich interactive broadcasts, buttons, and media via WhatsApp Cloud API",
    connectUrl: "/channels/whatsapp",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: Camera,
    iconStyle: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
    description: "Reach leads and followers via Instagram Messaging API",
    connectUrl: "/channels/instagram",
  },
  FACEBOOK: {
    label: "Facebook",
    icon: ScanLine,
    iconStyle: "bg-blue-600 text-white",
    description: "Engage your connected Facebook Page audience with broadcast messages",
    connectUrl: "/channels/facebook",
  },
  RCS: {
    label: "RCS",
    icon: Smartphone,
    iconStyle: "bg-indigo-600 text-white",
    description: "Google Verified RCS messaging with rich cards and quick-reply action chips",
    connectUrl: "/channels/rcs",
  },
};

interface CampaignStepChannelProps {
  campaign: {
    channel: ChannelType;
  };
  channels: ChannelItem[];
  selectChannel: (channel: ChannelType) => void;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  loadTemplates: (channel?: string) => Promise<void>;
  onSaveDraft?: () => void;
  isSaving?: boolean;
}

export function CampaignStepChannel({
  campaign,
  channels,
  selectChannel,
  canProceed,
  onNext,
  onPrev,
  onSaveDraft,
  isSaving,
}: CampaignStepChannelProps) {
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType>(
    campaign.channel || "WHATSAPP"
  );

  const channelTypes: ChannelType[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "RCS"];

  // Filter ONLY the real integrated and connected channels for the selected type
  const connectedChannelsForType = channels.filter(
    (c) => c.channel === selectedChannelType && c.isConnected
  );

  const hasConnectedChannel = connectedChannelsForType.length > 0;
  const isCurrentChannelSelected =
    campaign.channel === selectedChannelType && hasConnectedChannel;

  useEffect(() => {
    const currentIsConnected = channels.some(
      (c) => c.channel === selectedChannelType && c.isConnected
    );
    if (!currentIsConnected) {
      const firstConnected = channels.find((c) => c.isConnected);
      if (firstConnected) {
        setSelectedChannelType(firstConnected.channel);
        selectChannel(firstConnected.channel);
      }
    }
  }, [channels, selectedChannelType, selectChannel]);

  const handleSelectChannelType = (type: ChannelType) => {
    setSelectedChannelType(type);
    const connectedOfThisType = channels.filter(
      (c) => c.channel === type && c.isConnected
    );
    if (connectedOfThisType.length > 0) {
      selectChannel(type);
    }
  };

  const handleSelectSpecificChannel = (type: ChannelType) => {
    selectChannel(type);
  };

  const activeMeta = channelMeta[selectedChannelType];
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ActiveIcon className="h-4 w-4" />
                </div>
                <CardTitle className="text-xl font-bold">Select Campaign Channel</CardTitle>
              </div>
              <CardDescription>
                First select a channel type, then choose your connected business channel.
              </CardDescription>
            </div>
            {isCurrentChannelSelected && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1.5 px-3 py-1 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Channel Connected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* STEP 1A: Channel Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              1. Choose Channel Type
            </label>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {channelTypes.map((chKey) => {
                const meta = channelMeta[chKey];
                const Icon = meta.icon;
                const isSelected = selectedChannelType === chKey;
                const connectedCount = channels.filter(
                  (c) => c.channel === chKey && c.isConnected
                ).length;

                return (
                  <button
                    key={chKey}
                    type="button"
                    onClick={() => handleSelectChannelType(chKey)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center mb-2.5 shadow-2xs",
                        meta.iconStyle
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      {connectedCount > 0
                        ? `${connectedCount} Connected`
                        : "Not Connected"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1B: Connected Channel Selection / Empty State */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                2. Select Integrated {activeMeta.label} Channel
              </label>
              {hasConnectedChannel && (
                <span className="text-xs text-muted-foreground">
                  Credentials securely managed by Appnix backend
                </span>
              )}
            </div>

            {hasConnectedChannel ? (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {connectedChannelsForType.map((channelItem) => {
                    const isSelected = campaign.channel === selectedChannelType;

                    return (
                      <div
                        key={channelItem.id}
                        onClick={() => handleSelectSpecificChannel(selectedChannelType)}
                        className={cn(
                          "relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary shadow-2xs"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                              activeMeta.iconStyle
                            )}
                          >
                            <ActiveIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">
                                {channelItem.accountName || `${activeMeta.label} Account`}
                              </h4>
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] gap-1 py-0.5 px-2 font-medium"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected & Ready
                              </Badge>
                            </div>
                            {channelItem.phoneNumber && (
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                {channelItem.phoneNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border flex items-center justify-center",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Security and No-Technical-IDs Reassurance */}
                <div className="rounded-lg bg-muted/40 border p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    All API IDs, WABA IDs, Page IDs, and tokens are resolved securely by the backend from your integrated channel record. No technical configuration is required.
                  </p>
                </div>
              </div>
            ) : (
              /* Empty State: No Channel Connected */
              <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/10 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground/60">
                  <ActiveIcon className="h-6 w-6" />
                </div>

                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-semibold text-foreground">
                    No connected {activeMeta.label} channel
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have not connected an official {activeMeta.label} account for your organization yet. Connect your channel to launch campaigns.
                  </p>
                </div>

                <div className="pt-1">
                  <Button asChild size="sm" className="gap-1.5 text-xs">
                    <Link href={activeMeta.connectUrl}>
                      <span>Connect {activeMeta.label} Channel</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stepper Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onPrev} className="gap-2 text-xs">
          <ChevronLeft className="h-4 w-4" />
          Cancel & Exit
        </Button>

        <div className="flex items-center gap-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="gap-2 text-xs"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
          )}

          <Button
            onClick={onNext}
            disabled={!hasConnectedChannel || !canProceed}
            className="gap-2 px-6 shadow-sm text-xs bg-primary"
          >
            <span>Continue to Campaign Details</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
