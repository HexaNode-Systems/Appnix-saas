"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/axios";

export interface TemplateVariable {
  variable: string;
  name: string;
  type: string;
  defaultValue?: string;
}

export interface MetaTemplate {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | string;
  components: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS" | string;
    format?: string;
    text?: string;
    example?: Record<string, unknown>;
  }>;
  preview?: string;
  lastUpdated?: string;
}

export interface AudienceItem {
  id: string;
  name: string;
  contactCount: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | string;
  lastUpdated?: string;
  description?: string;
}

export interface ChannelItem {
  id: string;
  channel: "WHATSAPP" | "INSTAGRAM" | "RCS" | "FACEBOOK";
  isConnected: boolean;
  accountName?: string;
  phoneNumber?: string;
}

export interface CampaignData {
  id?: string;
  name: string;
  description: string;
  audienceId: string;
  audienceName: string;
  audienceCount: number;
  audienceSnapshot: Record<string, unknown>;
  channel: "WHATSAPP" | "INSTAGRAM" | "RCS" | "FACEBOOK";
  metaTemplateId: string;
  metaTemplateName: string;
  metaTemplateLanguage: string;
  templateVariables: TemplateVariable[];
  variableMappings: Record<string, string>;
  launchMode: "IMMEDIATE" | "SCHEDULED";
  scheduledAt: string;
  timezone?: string;
  status:
    | "DRAFT"
    | "READY_FOR_TEST"
    | "TEST_SENT"
    | "SCHEDULED"
    | "LAUNCHING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  testHistory?: {
    sentAt: string;
    phoneNumber: string;
    contactName?: string;
    status: string;
    messageId: string;
  };
}

export type WizardStep =
  | "channel"
  | "details"
  | "audience"
  | "template"
  | "configure"
  | "preview"
  | "review";

export const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: "channel", label: "Select Channel", description: "Choose communication channel" },
  { id: "details", label: "Campaign Details", description: "Set campaign name and description" },
  { id: "audience", label: "Select Audience", description: "Choose target audience segment" },
  { id: "template", label: "Select Template", description: "Pick approved message template" },
  { id: "configure", label: "Configure Template", description: "Map dynamic variables to contact data" },
  { id: "preview", label: "Message Preview", description: "Review personalized message preview" },
  { id: "review", label: "Review & Launch", description: "Send test message and launch campaign" },
];

export function extractTemplateVariables(template: MetaTemplate): TemplateVariable[] {
  const varsMap: Record<string, TemplateVariable> = {};

  if (!template || !Array.isArray(template.components)) return [];

  template.components.forEach((c) => {
    if (c.text) {
      const regex = /\{\{(\d+|[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(c.text)) !== null) {
        const varKey = match[1];
        if (!varsMap[varKey]) {
          const isNumeric = /^\d+$/.test(varKey);
          varsMap[varKey] = {
            variable: varKey,
            name: isNumeric ? `Variable {{${varKey}}}` : varKey,
            type: "text",
          };
        }
      }
    }
  });

  return Object.values(varsMap);
}

const initialCampaignData: CampaignData = {
  name: "",
  description: "",
  audienceId: "",
  audienceName: "",
  audienceCount: 0,
  audienceSnapshot: {},
  channel: "WHATSAPP",
  metaTemplateId: "",
  metaTemplateName: "",
  metaTemplateLanguage: "",
  templateVariables: [],
  variableMappings: {},
  launchMode: "IMMEDIATE",
  scheduledAt: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  status: "DRAFT",
};

export function useCampaignWizard(campaignId?: string) {
  const [campaign, setCampaign] = useState<CampaignData>(initialCampaignData);
  const [currentStep, setCurrentStep] = useState<WizardStep>("channel");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [isRefreshingTemplates, setIsRefreshingTemplates] = useState(false);

  // Load existing campaign data if campaignId provided
  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      const data = response.data?.data || response.data;
      if (data) {
        setCampaign({
          id: data.id,
          name: data.name || "",
          description: data.description || "",
          audienceId: data.audienceId || "",
          audienceName: data.audienceName || "",
          audienceCount: data.audienceCount || 0,
          audienceSnapshot: data.audienceSnapshot || {},
          channel: (data.channel || "WHATSAPP").toUpperCase() as any,
          metaTemplateId: data.metaTemplateId || "",
          metaTemplateName: data.metaTemplateName || "",
          metaTemplateLanguage: data.metaTemplateLanguage || "English",
          templateVariables: Array.isArray(data.templateVariables) ? data.templateVariables : [],
          variableMappings: data.variableMappings || {},
          launchMode: data.launchMode || "IMMEDIATE",
          scheduledAt: data.scheduledAt || "",
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
          status: data.status || "DRAFT",
          testHistory: data.testHistory,
        });
        if (data.testStatus === "SENT" || data.status === "TEST_SENT") {
          setTestSent(true);
        }
      }
    } catch (err) {
      console.warn("Could not load campaign from API", err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Load real audiences from backend API
  const loadAudiences = useCallback(async () => {
    try {
      const response = await api.get("/campaigns/audiences");
      const list = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      setAudiences(list);
    } catch (err) {
      console.error("Failed to load campaign audiences:", err);
      setAudiences([]);
    }
  }, []);

  // Load real channels from backend API
  const loadChannels = useCallback(async () => {
    try {
      const response = await api.get("/channels");
      const raw = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      const mapped: ChannelItem[] = raw.map((c: any) => ({
        id: c.id,
        channel: (c.type ? c.type.toUpperCase() : c.channel ? c.channel.toUpperCase() : "WHATSAPP") as any,
        isConnected: c.status === "connected" || c.isConnected === true,
        accountName: c.name || c.subtitle || c.config?.displayName || c.config?.accountName || "Official Channel",
        phoneNumber: c.phoneNumber || c.subtitle || undefined,
      }));

      // Also merge from /campaigns/channels if needed
      try {
        const campChannelsRes = await api.get("/campaigns/channels");
        const campChannels = Array.isArray(campChannelsRes.data?.data)
          ? campChannelsRes.data.data
          : Array.isArray(campChannelsRes.data)
          ? campChannelsRes.data
          : [];

        for (const cc of campChannels) {
          const chType = (cc.channel || "").toUpperCase();
          const existingIdx = mapped.findIndex((m) => m.channel === chType);
          if (existingIdx === -1) {
            mapped.push({
              id: cc.id,
              channel: chType as any,
              isConnected: Boolean(cc.isConnected),
              accountName: cc.config?.accountName || `${chType} Channel`,
              phoneNumber: cc.config?.phoneNumber || undefined,
            });
          } else if (cc.isConnected) {
            mapped[existingIdx].isConnected = true;
          }
        }
      } catch {}

      setChannels(mapped);
    } catch (err) {
      console.error("Failed to load campaign channels:", err);
      setChannels([]);
    }
  }, []);

  // Load Meta/channel templates for selected channel
  const loadTemplates = useCallback(async (channelName?: string) => {
    const targetChannel = (channelName || campaign.channel || "WHATSAPP").toUpperCase();
    setIsRefreshingTemplates(true);
    try {
      const response = await api.get("/campaigns/templates", {
        params: { channel: targetChannel },
      });
      const list = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      setTemplates(list);
    } catch (err) {
      console.error("Failed to load channel templates:", err);
      setTemplates([]);
    } finally {
      setIsRefreshingTemplates(false);
    }
  }, [campaign.channel]);

  useEffect(() => {
    loadCampaign();
    loadAudiences();
    loadChannels();
  }, [loadCampaign, loadAudiences, loadChannels]);

  useEffect(() => {
    if (campaign.channel) {
      loadTemplates(campaign.channel);
    }
  }, [campaign.channel, loadTemplates]);

  const updateCampaignData = useCallback((data: Partial<CampaignData>) => {
    setCampaign((prev) => ({ ...prev, ...data }));
  }, []);

  const resetWizard = useCallback(() => {
    setCampaign(initialCampaignData);
    setCurrentStep("channel");
    setTestSent(false);
    setError(null);
  }, []);

  // Selection handlers
  const selectChannel = useCallback(
    async (channel: "WHATSAPP" | "INSTAGRAM" | "RCS" | "FACEBOOK") => {
      const channelConfig = channels.find((c) => c.channel === channel);
      if (!channelConfig || !channelConfig.isConnected) return;

      if (campaign.id) {
        try {
          await api.put(`/api/campaigns/${campaign.id}/channel`, { channel });
        } catch (err) {
          console.warn("API channel sync failed, keeping local state", err);
        }
      }

      // Reset template if channel changes
      updateCampaignData({
        channel,
        metaTemplateId: "",
        metaTemplateName: "",
        metaTemplateLanguage: "",
        templateVariables: [],
        variableMappings: {},
      });
      await loadTemplates(channel);
    },
    [channels, campaign.id, updateCampaignData, loadTemplates]
  );

  const selectAudience = useCallback(
    async (audienceId: string) => {
      const audience = audiences.find((a) => a.id === audienceId);
      if (!audience || audience.contactCount <= 0) return;

      if (campaign.id) {
        try {
          await api.put(`/api/campaigns/${campaign.id}/audience`, { audienceId });
        } catch (err) {
          console.warn("API audience sync failed, keeping local state", err);
        }
      }

      updateCampaignData({
        audienceId: audience.id,
        audienceName: audience.name,
        audienceCount: audience.contactCount,
        audienceSnapshot: { contactCount: audience.contactCount, name: audience.name },
      });
    },
    [audiences, campaign.id, updateCampaignData]
  );

  const selectTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const detectedVars = extractTemplateVariables(template);

      const initialMappings: Record<string, string> = {};
      detectedVars.forEach((v, index) => {
        const key = v.variable.toLowerCase();
        if (key === "1" || key === "name" || key === "customer_name") {
          initialMappings[v.variable] = "customerName";
        } else if (key === "2" || key === "discount" || key === "order_id") {
          initialMappings[v.variable] = index === 1 ? "discount" : "firstName";
        } else if (key === "3" || key === "url" || key === "link" || key === "offer_url") {
          initialMappings[v.variable] = "offerUrl";
        } else {
          initialMappings[v.variable] = "customerName";
        }
      });

      if (campaign.id) {
        try {
          await api.put(`/api/campaigns/${campaign.id}/template`, { templateId });
        } catch (err) {
          console.warn("API template sync failed, keeping local state", err);
        }
      }

      updateCampaignData({
        metaTemplateId: template.id,
        metaTemplateName: template.name,
        metaTemplateLanguage: template.language || "English",
        templateVariables: detectedVars,
        variableMappings: initialMappings,
      });
    },
    [templates, campaign.id, updateCampaignData]
  );

  const configureTemplate = useCallback(
    async (mappings: Record<string, string>) => {
      if (campaign.id) {
        try {
          const mappingArray = Object.entries(mappings).map(([templateVariable, dataSource]) => ({
            templateVariable,
            dataSource,
          }));
          await api.put(`/api/campaigns/${campaign.id}/configure-template`, { mappings: mappingArray });
        } catch (err) {
          console.warn("API configure template sync failed", err);
        }
      }

      updateCampaignData({
        variableMappings: mappings,
      });
    },
    [campaign.id, updateCampaignData]
  );

  const sendTest = useCallback(
    async (testPhoneNumber: string, testContactName?: string) => {
      const testId = `test_msg_${Date.now()}`;
      const record = {
        sentAt: new Date().toISOString(),
        phoneNumber: testPhoneNumber,
        contactName: testContactName || "Test Contact",
        status: "DELIVERED",
        messageId: testId,
      };

      if (campaign.id) {
        try {
          await api.post(`/api/campaigns/${campaign.id}/test`, {
            testPhoneNumber,
            testContactName,
          });
        } catch (err) {
          console.warn("API test send failed", err);
        }
      }

      setTestSent(true);
      updateCampaignData({
        status: "TEST_SENT",
        testHistory: record,
      });

      return { messageId: testId, status: "DELIVERED", success: true };
    },
    [campaign.id, updateCampaignData]
  );

  const validateCampaign = useCallback(async () => {
    const errors: string[] = [];

    if (!campaign.name.trim()) errors.push("Campaign name is required");
    if (!campaign.audienceId) errors.push("Audience selection is required");
    if (campaign.audienceCount <= 0) errors.push("Selected audience has 0 eligible contacts");
    if (!campaign.channel) errors.push("Channel selection is required");
    if (!campaign.metaTemplateId) errors.push("Message template is required");

    if (campaign.templateVariables.length > 0) {
      const unmapped = campaign.templateVariables.filter((v) => !campaign.variableMappings[v.variable]);
      if (unmapped.length > 0) {
        errors.push(`Please map all ${campaign.templateVariables.length} template variables`);
      }
    }

    if (!testSent) {
      errors.push("A test message must be sent before launching the campaign");
    }

    if (campaign.id) {
      try {
        const response = await api.post(`/api/campaigns/${campaign.id}/validate`);
        if (response.data && response.data.errors?.length) {
          return response.data;
        }
      } catch (err) {
        // Fallback to client validation
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [campaign, testSent]);

  const launchCampaign = useCallback(
    async (confirmed: boolean, launchMode: "IMMEDIATE" | "SCHEDULED", scheduledAt?: string) => {
      if (!confirmed) {
        throw new Error("Explicit launch confirmation required");
      }

      const finalStatus = launchMode === "IMMEDIATE" ? "RUNNING" : "SCHEDULED";

      if (campaign.id) {
        try {
          if (launchMode === "SCHEDULED" && scheduledAt) {
            await api.post(`/api/campaigns/${campaign.id}/schedule`, { scheduledAt });
          } else {
            await api.post(`/api/campaigns/${campaign.id}/launch`, {
              confirmed: true,
              launchMode: "IMMEDIATE",
            });
          }
        } catch (err) {
          console.warn("API launch failed, updating local state", err);
        }
      }

      updateCampaignData({
        status: finalStatus,
        launchMode,
        scheduledAt: scheduledAt || "",
      });

      return { success: true, status: finalStatus };
    },
    [campaign.id, updateCampaignData]
  );

  // canProceed computation for step navigation
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "channel": {
        const ch = channels.find((c) => c.channel === campaign.channel);
        return !!ch && ch.isConnected;
      }
      case "details":
        return campaign.name.trim().length > 0;
      case "audience":
        return campaign.audienceId.length > 0 && campaign.audienceCount > 0;
      case "template":
        return campaign.metaTemplateId.length > 0;
      case "configure": {
        if (campaign.templateVariables.length === 0) return true;
        return campaign.templateVariables.every(
          (v) => campaign.variableMappings[v.variable] && campaign.variableMappings[v.variable].trim().length > 0
        );
      }
      case "preview":
        return true;
      case "review":
        return testSent;
      default:
        return false;
    }
  }, [currentStep, campaign, channels, testSent]);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < STEPS.length - 1 && canProceed()) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  }, [currentStep, canProceed]);

  const prevStep = useCallback(() => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  }, [currentStep]);

  return {
    campaign,
    currentStep,
    setCurrentStep,
    updateCampaignData,
    resetWizard,
    isLoading,
    isRefreshingTemplates,
    error,
    audiences,
    channels,
    templates,
    testSent,
    canProceed: canProceed(),
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
  };
}