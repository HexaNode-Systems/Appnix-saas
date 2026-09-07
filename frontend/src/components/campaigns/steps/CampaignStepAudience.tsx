"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Users, AlertCircle, CheckCircle2, Calendar, Save, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AudienceItem } from "@/hooks/useCampaignWizard";

interface CampaignStepAudienceProps {
  campaign: {
    audienceId: string;
    audienceName: string;
    audienceCount: number;
    name: string;
  };
  audiences: AudienceItem[];
  selectAudience: (audienceId: string) => void;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSaveDraft?: () => void;
  isSaving?: boolean;
}

export function CampaignStepAudience({
  campaign,
  audiences,
  selectAudience,
  canProceed,
  onNext,
  onPrev,
  onSaveDraft,
  isSaving,
}: CampaignStepAudienceProps) {
  const selectedAudience = audiences.find((a) => a.id === campaign.audienceId);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle className="text-xl font-bold">Select Campaign Audience</CardTitle>
              </div>
              <CardDescription>
                Choose an audience segment. The recipient count will be automatically calculated from this segment.
              </CardDescription>
            </div>
            {selectedAudience && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Audience Selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {audiences.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/20">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">No audiences available</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No audience segments found. Please import contacts or create an audience segment in CRM first.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href="/crm/contacts">
                    <span>Manage CRM Contacts & Segments</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {audiences.map((audience) => {
                const isSelected = campaign.audienceId === audience.id;
                const hasContacts = audience.contactCount > 0;
                const isAudienceActive = audience.status === "ACTIVE";
                const isSelectable = hasContacts && isAudienceActive;

                return (
                  <button
                    key={audience.id}
                    type="button"
                    onClick={() => isSelectable && selectAudience(audience.id)}
                    disabled={!isSelectable}
                    className={cn(
                      "group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                        : isSelectable
                        ? "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                        : "border-border/60 bg-muted/20 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {audience.name}
                        </h4>
                        <Badge
                          variant={isAudienceActive ? "default" : "secondary"}
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-5 shrink-0",
                            isAudienceActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {audience.status}
                        </Badge>
                      </div>

                      {audience.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {audience.description}
                        </p>
                      )}

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>{audience.contactCount.toLocaleString()} eligible contacts</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Updated {audience.lastUpdated ? new Date(audience.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!hasContacts && (
                      <div className="mt-3 pt-2.5 border-t border-destructive/20 flex items-center gap-1.5 text-destructive text-xs font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>This audience currently has no eligible contacts.</span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Audience Banner */}
          {selectedAudience ? (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Selected Segment</p>
                    <p className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                      {selectedAudience.name}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right pl-13 sm:pl-0">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">
                    Estimated Recipients
                  </span>
                  <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 tracking-tight">
                    {selectedAudience.contactCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Please select an audience with eligible contacts to proceed. Manual recipient count entry is disabled to ensure delivery safety.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="gap-2 px-6 shadow-sm"
          >
            Continue to Template
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}