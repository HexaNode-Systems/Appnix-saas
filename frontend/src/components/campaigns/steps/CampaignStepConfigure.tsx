"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, FileText, ArrowRight, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";
import { SuperField } from "@/types/super-field";
import type { TemplateVariable } from "@/hooks/useCampaignWizard";

const DATA_SOURCES = [
  { value: "customerName", label: "Customer Name", sample: "Harshit Sharma" },
  { value: "firstName", label: "First Name", sample: "Harshit" },
  { value: "lastName", label: "Last Name", sample: "Sharma" },
  { value: "phoneNumber", label: "Phone Number", sample: "+91 98765 43210" },
  { value: "email", label: "Email Address", sample: "harshit@example.com" },
  { value: "discount", label: "Discount / Offer Value", sample: "25%" },
  { value: "customerId", label: "Customer ID", sample: "CUST-9041" },
  { value: "offerUrl", label: "Offer / Redeem URL", sample: "https://appnix.io/offer" },
  { value: "customFields", label: "Custom Audience Field", sample: "Custom Value" },
];

interface CampaignStepConfigureProps {
  campaign: {
    templateVariables: TemplateVariable[];
    variableMappings: Record<string, string>;
    metaTemplateName: string;
  };
  configureTemplate: (mappings: Record<string, string>) => void;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSaveDraft?: () => void;
  isSaving?: boolean;
}

export function CampaignStepConfigure({
  campaign,
  configureTemplate,
  canProceed,
  onNext,
  onPrev,
  onSaveDraft,
  isSaving,
}: CampaignStepConfigureProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(campaign.variableMappings || {});
  const [superFields, setSuperFields] = useState<SuperField[]>([]);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/crm/super-fields")
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (isMounted) {
          setSuperFields(list.filter((f: any) => f.status === "ACTIVE"));
        }
      })
      .catch((err) => {
        console.error("Failed to load super fields for campaign template mapping:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const allDataSources = useMemo(() => {
    const custom = superFields.map((f) => ({
      value: `superField:${f.key}`,
      label: `${f.label} [Custom Field]`,
      sample: f.placeholder || (f.options && f.options.length > 0 ? f.options[0].label : f.label),
    }));
    return [...DATA_SOURCES, ...custom];
  }, [superFields]);

  useEffect(() => {
    if (campaign.variableMappings) {
      setMappings(campaign.variableMappings);
    }
  }, [campaign.variableMappings]);

  const variables = useMemo(() => {
    return campaign.templateVariables || [];
  }, [campaign.templateVariables]);

  const isStatic = variables.length === 0;

  const handleMappingChange = (variableKey: string, dataSource: string) => {
    const next = { ...mappings, [variableKey]: dataSource };
    setMappings(next);
    configureTemplate(next);
  };

  const allMapped = useMemo(() => {
    if (isStatic) return true;
    return variables.every((v) => mappings[v.variable] && mappings[v.variable].trim().length > 0);
  }, [isStatic, variables, mappings]);

  if (isStatic) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl font-bold">Static Template</CardTitle>
                </div>
                <CardDescription>
                  This template does not require any dynamic variable mappings
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                Ready to Send
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="p-5 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Template: {campaign.metaTemplateName}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                This is a static broadcast template with fixed copy approved by Meta. Every contact in your selected audience will receive the exact same message without variable substitution.
              </p>
            </div>
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
            <Button onClick={onNext} className="gap-2 px-6 shadow-sm">
              Continue to Preview
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">Template Variables</CardTitle>
              </div>
              <CardDescription>
                Map dynamic variables detected in <strong>{campaign.metaTemplateName}</strong> to recipient attributes from your audience
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2.5 py-1",
                allMapped
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
              )}
            >
              {allMapped ? "All Variables Mapped" : `${Object.keys(mappings).filter((k) => !!mappings[k]).length}/${variables.length} Mapped`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="overflow-hidden border rounded-xl">
            <div className="grid grid-cols-12 gap-3 bg-muted/60 p-3.5 text-xs font-semibold text-muted-foreground border-b">
              <div className="col-span-12 sm:col-span-4">Template Variable</div>
              <div className="hidden sm:block sm:col-span-1 text-center"></div>
              <div className="col-span-12 sm:col-span-5">Audience Data Source</div>
              <div className="col-span-12 sm:col-span-2 text-right">Status</div>
            </div>

            <div className="divide-y divide-border bg-card">
              {variables.map((variable) => {
                const currentVal = mappings[variable.variable] || "";
                const isMapped = !!currentVal;
                const sourceObj = allDataSources.find((s) => s.value === currentVal);

                return (
                  <div
                    key={variable.variable}
                    className="grid grid-cols-12 gap-3 p-4 items-center hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {"{{" + variable.variable + "}}"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {variable.name}
                      </span>
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 justify-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                    </div>

                    <div className="col-span-12 sm:col-span-5">
                      <Select
                        value={currentVal}
                        onValueChange={(val) => handleMappingChange(variable.variable, val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select audience data source..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allDataSources.map((source) => (
                            <SelectItem key={source.value} value={source.value} className="text-xs">
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span>{source.label}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  e.g. &quot;{source.sample}&quot;
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sourceObj && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Sample Value: <span className="font-medium text-foreground">{sourceObj.sample}</span>
                        </p>
                      )}
                    </div>

                    <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-1.5 text-xs font-medium">
                      {isMapped ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Mapped</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Required</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!allMapped ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>All template variables must be mapped to valid data sources before proceeding to live preview.</span>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>All {variables.length} variables have been mapped. You can now preview the personalized message.</span>
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
            Continue to Preview
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}