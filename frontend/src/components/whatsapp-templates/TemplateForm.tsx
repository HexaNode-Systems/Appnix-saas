"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  FileText,
  Smartphone,
  Layers,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Phone,
  CornerDownLeft,
  Copy,
  Info,
  HelpCircle,
  UploadCloud,
  Bold,
  Italic,
  Strikethrough,
  Code,
  ArrowUp,
  ArrowDown,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WhatsAppTemplate,
  TemplateCategory,
  TemplateContentType,
  HeaderType,
  TemplateVariable,
  CTAButton,
  CarouselCard,
  CatalogConfig,
  ValidationError,
  WhatsAppTemplateStatus,
} from "@/types/whatsapp-template";
import {
  SUPPORTED_LANGUAGES,
  CATEGORY_DETAILS,
  STANDARD_DATA_SOURCES,
  extractVariablesFromText,
  validateTemplate,
  saveStoredTemplates,
  getStoredTemplates,
} from "@/lib/whatsapp-templates";
import { WhatsAppPhonePreview } from "./WhatsAppPhonePreview";
import { SubmitApprovalModal } from "./SubmitApprovalModal";
import { cn } from "@/lib/utils";

interface TemplateFormProps {
  initialData?: WhatsAppTemplate;
  isEditMode?: boolean;
  onSuccess?: (savedTemplate: WhatsAppTemplate) => void;
}

export function TemplateForm({
  initialData,
  isEditMode = false,
  onSuccess,
}: TemplateFormProps) {
  const router = useRouter();
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Core Template State
  const [templateName, setTemplateName] = useState(
    initialData?.name || ""
  );
  const [category, setCategory] = useState<TemplateCategory>(
    initialData?.category || "UTILITY"
  );
  const [language, setLanguage] = useState(initialData?.language || "en_US");
  const [contentType, setContentType] = useState<TemplateContentType>(
    initialData?.contentType || "TEXT"
  );

  // Header State
  const [headerType, setHeaderType] = useState<HeaderType>(
    initialData?.header?.type || "NONE"
  );
  const [headerText, setHeaderText] = useState(
    initialData?.header?.text || ""
  );
  const [headerMediaUrl, setHeaderMediaUrl] = useState(
    initialData?.header?.mediaUrl || ""
  );
  const [headerMediaFileName, setHeaderMediaFileName] = useState(
    initialData?.header?.mediaFileName || ""
  );

  // Body & Variables State
  const [bodyText, setBodyText] = useState(
    initialData?.body || ""
  );
  const [variableConfigs, setVariableConfigs] = useState<TemplateVariable[]>(
    initialData?.variables || []
  );

  // Footer State
  const [footerText, setFooterText] = useState(initialData?.footer || "");

  // Buttons State
  const [enableButtons, setEnableButtons] = useState(
    (initialData?.buttons && initialData.buttons.length > 0) || false
  );
  const [buttons, setButtons] = useState<CTAButton[]>(
    initialData?.buttons || []
  );

  // Catalog State
  const [catalogConfig, setCatalogConfig] = useState<CatalogConfig>(
    initialData?.catalog || {
      catalogId: "cat-appnix-01",
      catalogName: "Appnix Official Store Catalog",
      productId: "prod-901",
      productName: "Featured SaaS Cloud Solutions",
      bodyText: "Explore our comprehensive suite of automated workflows and CRM services.",
      ctaText: "View Catalog",
    }
  );

  // Carousel State
  const [carouselCards, setCarouselCards] = useState<CarouselCard[]>(
    initialData?.carouselCards || [
      {
        id: "card-1",
        mediaUrl:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
        header: "WhatsApp Automation Pro",
        body: "Automate 90% of customer support chats with custom ChatGPT flows and instant lead booking.",
        buttons: [
          {
            id: "cb-1",
            type: "URL",
            text: "View Bot Demo",
            url: "https://appnix.io/bot-demo",
            urlType: "STATIC",
          },
          {
            id: "cb-2",
            type: "QUICK_REPLY",
            text: "Get Bot",
            payload: "BUY_BOT",
          },
        ],
      },
      {
        id: "card-2",
        mediaUrl:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
        header: "Omnichannel CRM Suite",
        body: "Manage WhatsApp, Instagram, Facebook, and RCS conversations in one unified collaborative inbox.",
        buttons: [
          {
            id: "cb-3",
            type: "URL",
            text: "Explore CRM",
            url: "https://appnix.io/crm-suite",
            urlType: "STATIC",
          },
          {
            id: "cb-4",
            type: "QUICK_REPLY",
            text: "Contact Us",
            payload: "CONTACT_CRM",
          },
        ],
      },
    ]
  );

  // Section Accordion Open/Closed States
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    details: true,
    contentType: true,
    header: true,
    body: true,
    variables: true,
    footer: true,
    buttons: true,
    catalog: true,
    carousel: true,
  });

  const toggleSection = (section: string) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Validation State
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sample overrides for preview
  const [customSampleOverrides, setCustomSampleOverrides] = useState<
    Record<string, string>
  >({});

  // Auto-detect and sync dynamic variables from body text
  const detectedVariableIndices = useMemo(() => {
    return extractVariablesFromText(bodyText);
  }, [bodyText]);

  // Keep variableConfigs in sync with detected indices in body
  useMemo(() => {
    const newConfigs: TemplateVariable[] = [];
    detectedVariableIndices.forEach((idx) => {
      const existing = variableConfigs.find((v) => v.index === idx);
      if (existing) {
        newConfigs.push(existing);
      } else {
        const defaultSource = STANDARD_DATA_SOURCES[Math.min(idx - 1, STANDARD_DATA_SOURCES.length - 1)];
        newConfigs.push({
          index: idx,
          name: defaultSource.label,
          sampleValue: defaultSource.defaultSample,
          dataSource: defaultSource.id,
        });
      }
    });

    if (JSON.stringify(newConfigs) !== JSON.stringify(variableConfigs)) {
      setVariableConfigs(newConfigs);
    }
  }, [detectedVariableIndices]);

  // Handle template name change with live formatting (no spaces, lowercase)
  const handleNameChange = (val: string) => {
    const formatted = val.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setTemplateName(formatted);
  };

  // Format text helper (bold, italic, etc.)
  const insertTextFormatting = (wrapper: string) => {
    if (!bodyTextareaRef.current) return;
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyText.substring(start, end);
    const replacement = `${wrapper}${selected || "text"}${wrapper}`;
    const newText = bodyText.substring(0, start) + replacement + bodyText.substring(end);
    setBodyText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + wrapper.length,
        end + wrapper.length + (selected ? 0 : 4)
      );
    }, 50);
  };

  // Insert Variable helper
  const insertDynamicVariable = (sourceId?: string, label?: string) => {
    const nextIndex = detectedVariableIndices.length > 0
      ? Math.max(...detectedVariableIndices) + 1
      : 1;
    const varTag = `{{${nextIndex}}}`;

    if (bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = bodyText.substring(0, start) + varTag + bodyText.substring(end);
      setBodyText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varTag.length, start + varTag.length);
      }, 50);
    } else {
      setBodyText((prev) => (prev ? `${prev} ${varTag}` : varTag));
    }
  };

  // Update Variable Mapping
  const handleUpdateVariable = (
    index: number,
    field: "name" | "sampleValue" | "dataSource",
    value: string
  ) => {
    setVariableConfigs((prev) =>
      prev.map((v) => {
        if (v.index === index) {
          const updated = { ...v, [field]: value };
          if (field === "dataSource") {
            const match = STANDARD_DATA_SOURCES.find((ds) => ds.id === value);
            if (match) {
              updated.name = match.label;
              if (!updated.sampleValue || updated.sampleValue === "Sample Value") {
                updated.sampleValue = match.defaultSample;
              }
            }
          }
          return updated;
        }
        return v;
      })
    );
  };

  // Add CTA Button
  const handleAddButton = (type: "URL" | "PHONE_NUMBER" | "QUICK_REPLY") => {
    const newBtn: CTAButton = {
      id: `btn-${Date.now()}`,
      type,
      text:
        type === "URL"
          ? "Visit Website"
          : type === "PHONE_NUMBER"
          ? "Call Us"
          : "Quick Response",
      url: type === "URL" ? "https://appnix.io" : undefined,
      urlType: type === "URL" ? "STATIC" : undefined,
      phoneNumber: type === "PHONE_NUMBER" ? "+918062765557" : undefined,
      countryCode: type === "PHONE_NUMBER" ? "+91" : undefined,
      payload: type === "QUICK_REPLY" ? "RESPONSE_PAYLOAD" : undefined,
    };
    setButtons([...buttons, newBtn]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, idx) => idx !== index));
  };

  const handleUpdateButton = (index: number, field: keyof CTAButton, value: any) => {
    setButtons((prev) =>
      prev.map((btn, idx) => (idx === index ? { ...btn, [field]: value } : btn))
    );
  };

  // Carousel Handlers
  const handleAddCarouselCard = () => {
    if (carouselCards.length >= 10) return;
    const newCard: CarouselCard = {
      id: `card-${Date.now()}`,
      mediaUrl:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
      header: `Card Header ${carouselCards.length + 1}`,
      body: "Describe this featured service or product with dynamic benefits for your customer.",
      buttons: [
        {
          id: `cb-${Date.now()}-1`,
          type: "URL",
          text: "Learn More",
          url: "https://appnix.io",
          urlType: "STATIC",
        },
      ],
    };
    setCarouselCards([...carouselCards, newCard]);
  };

  const handleRemoveCarouselCard = (index: number) => {
    if (carouselCards.length <= 2) {
      alert("WhatsApp carousel templates require a minimum of 2 cards.");
      return;
    }
    setCarouselCards(carouselCards.filter((_, idx) => idx !== index));
  };

  const handleMoveCarouselCard = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= carouselCards.length) return;
    const newCards = [...carouselCards];
    const temp = newCards[index];
    newCards[index] = newCards[targetIdx];
    newCards[targetIdx] = temp;
    setCarouselCards(newCards);
  };

  const handleUpdateCarouselCard = (
    index: number,
    field: keyof CarouselCard,
    value: any
  ) => {
    setCarouselCards((prev) =>
      prev.map((card, idx) => (idx === index ? { ...card, [field]: value } : card))
    );
  };

  // Compile full template object for validation and persistence
  const currentTemplate: Partial<WhatsAppTemplate> = useMemo(() => {
    const mappings: Record<string, string> = {};
    variableConfigs.forEach((v) => {
      mappings[String(v.index)] = v.name;
    });

    return {
      id: initialData?.id || `tpl-${Date.now()}`,
      name: templateName,
      category,
      language,
      contentType,
      header: {
        type: headerType,
        text: headerText,
        mediaUrl: headerMediaUrl,
        mediaFileName: headerMediaFileName,
      },
      body: bodyText,
      variables: variableConfigs,
      variableMappings: mappings,
      footer: footerText,
      buttons: enableButtons ? buttons : [],
      catalog: contentType === "CATALOG" ? catalogConfig : undefined,
      carouselCards: contentType === "CAROUSEL" ? carouselCards : undefined,
      status: initialData?.status || "DRAFT",
      metaTemplateId: initialData?.metaTemplateId,
      rejectionReason: initialData?.rejectionReason,
      rejectionDetails: initialData?.rejectionDetails,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    initialData,
    templateName,
    category,
    language,
    contentType,
    headerType,
    headerText,
    headerMediaUrl,
    headerMediaFileName,
    bodyText,
    variableConfigs,
    footerText,
    enableButtons,
    buttons,
    catalogConfig,
    carouselCards,
  ]);

  // Check errors whenever template data changes if already attempted submit
  const errors = useMemo(() => {
    return validateTemplate(currentTemplate);
  }, [currentTemplate]);

  const getFieldError = (field: string) => {
    return validationErrors.find((e) => e.field === field)?.message;
  };

  // Save Draft Handler
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveSuccessMessage(null);

    try {
      const templateToSave: WhatsAppTemplate = {
        ...(currentTemplate as WhatsAppTemplate),
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
      };

      const existing = getStoredTemplates();
      const existingIdx = existing.findIndex((t) => t.id === templateToSave.id);
      let updatedList: WhatsAppTemplate[];

      if (existingIdx !== -1) {
        updatedList = existing.map((t, idx) =>
          idx === existingIdx ? templateToSave : t
        );
      } else {
        updatedList = [templateToSave, ...existing];
      }

      saveStoredTemplates(updatedList);
      setSaveSuccessMessage("Draft saved successfully!");
      setTimeout(() => setSaveSuccessMessage(null), 3500);

      onSuccess?.(templateToSave);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Pre-Submit validation trigger
  const handleOpenSubmitModal = () => {
    setHasAttemptedSubmit(true);
    const currentErrors = validateTemplate(currentTemplate);
    setValidationErrors(currentErrors);

    if (currentErrors.length > 0) {
      // Scroll to top or show notice
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitModalOpen(true);
  };

  // Meta Submission execution
  const handleConfirmSubmit = async () => {
    const metaId = `meta_tpl_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const submittedTemplate: WhatsAppTemplate = {
      ...(currentTemplate as WhatsAppTemplate),
      status: "PENDING",
      metaTemplateId: metaId,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rejectionReason: undefined,
      rejectionDetails: undefined,
    };

    const existing = getStoredTemplates();
    const existingIdx = existing.findIndex((t) => t.id === submittedTemplate.id);
    let updatedList: WhatsAppTemplate[];

    if (existingIdx !== -1) {
      updatedList = existing.map((t, idx) =>
        idx === existingIdx ? submittedTemplate : t
      );
    } else {
      updatedList = [submittedTemplate, ...existing];
    }

    saveStoredTemplates(updatedList);
    onSuccess?.(submittedTemplate);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/channels/whatsapp"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>WhatsApp Channels</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <Link
            href="/channels/whatsapp/templates"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Message Templates
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-foreground font-medium">
            {isEditMode ? "Edit Template" : "Create Template"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
            {isEditMode ? "Edit Message Template" : "Create Message Template"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a WhatsApp template and submit it for Meta approval.
          </p>
        </div>
      </div>

      {/* Validation Error Summary Banner */}
      {hasAttemptedSubmit && validationErrors.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {validationErrors.length} error{validationErrors.length !== 1 ? "s" : ""} found. Please fix before submitting to Meta:
            </span>
          </div>
          <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-400 space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccessMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* 2-Column Desktop Layout (Left: Form, Right: Sticky Phone Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Configuration Form (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Section 1: Template Details */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("details")}
              className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Template Details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Name, category classification and primary language
                  </p>
                </div>
              </div>
              {sectionsOpen.details ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {sectionsOpen.details && (
              <div className="p-4 space-y-4">
                {/* Template Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Template Name <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      e.g. order_confirmation
                    </span>
                  </div>
                  <Input
                    placeholder="e.g. order_confirmation_v2"
                    value={templateName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={cn(
                      "font-mono text-xs h-9",
                      getFieldError("name") && "border-rose-500 focus-visible:ring-rose-500"
                    )}
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <p className="text-muted-foreground">
                      Use a unique name with lowercase letters, numbers and underscores.
                    </p>
                    <span className="text-muted-foreground font-mono">
                      {templateName.length}/512
                    </span>
                  </div>
                  {getFieldError("name") && (
                    <p className="text-xs text-rose-500 font-medium">
                      {getFieldError("name")}
                    </p>
                  )}
                </div>

                {/* Template Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Template Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        "AUTHENTICATION",
                        "MARKETING",
                        "UTILITY",
                      ] as TemplateCategory[]
                    ).map((cat) => {
                      const details = CATEGORY_DETAILS[cat];
                      const isSelected = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={cn(
                            "flex flex-col p-3 rounded-xl border text-left transition-all relative",
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600 shadow-xs"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-foreground">
                              {details.title}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            {details.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Template Language */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Template Language <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Meta requires you to create separate templates for each language version.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Message Content Type */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("contentType")}
              className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Message Content Type
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    What type of message do you want to send?
                  </p>
                </div>
              </div>
              {sectionsOpen.contentType ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {sectionsOpen.contentType && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: "TEXT",
                      label: "Text Message",
                      desc: "Simple text-based template with optional header",
                      icon: FileText,
                    },
                    {
                      id: "MEDIA",
                      label: "Media Message",
                      desc: "Image, Video, or Document header banner",
                      icon: ImageIcon,
                    },
                    {
                      id: "CATALOG",
                      label: "Catalog",
                      desc: "WhatsApp product catalog & collection",
                      icon: ShoppingBag,
                    },
                    {
                      id: "CAROUSEL",
                      label: "Carousel",
                      desc: "Multi-card scrollable product/service showcase",
                      icon: Layers,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = contentType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setContentType(item.id as TemplateContentType);
                          if (item.id === "MEDIA" && headerType === "NONE") {
                            setHeaderType("IMAGE");
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center text-center p-3 rounded-xl border transition-all relative",
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600 shadow-xs"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center mb-2",
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-xs text-foreground mb-0.5">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-clamp-2">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Header Configuration (for TEXT & MEDIA) */}
          {contentType !== "CATALOG" && contentType !== "CAROUSEL" && (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("header")}
                className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Header Configuration
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Optional text headline or media banner
                    </p>
                  </div>
                </div>
                {sectionsOpen.header ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {sectionsOpen.header && (
                <div className="p-4 space-y-4">
                  {/* Header Type Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Header Type
                    </label>
                    <select
                      value={headerType}
                      onChange={(e) => setHeaderType(e.target.value as HeaderType)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="NONE">None (No Header)</option>
                      <option value="TEXT">Text Headline</option>
                      <option value="IMAGE">Image (JPG, PNG - Max 5MB)</option>
                      <option value="VIDEO">Video (MP4 - Max 16MB)</option>
                      <option value="DOCUMENT">Document (PDF - Max 100MB)</option>
                    </select>
                  </div>

                  {/* Text Header Input */}
                  {headerType === "TEXT" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Header Text <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Order Confirmation - {{1}}"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        className="text-xs h-9"
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Variables like `&#123;&#123;1&#125;&#125;` are supported in header text.</span>
                        <span>{headerText.length}/60</span>
                      </div>
                      {getFieldError("header.text") && (
                        <p className="text-xs text-rose-500 font-medium">
                          {getFieldError("header.text")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Media Upload / URL */}
                  {(headerType === "IMAGE" ||
                    headerType === "VIDEO" ||
                    headerType === "DOCUMENT") && (
                    <div className="space-y-3">
                      <div className="rounded-xl border-2 border-dashed border-border p-5 text-center space-y-2 bg-muted/20">
                        <UploadCloud className="h-8 w-8 text-emerald-600 mx-auto" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Upload sample media for Meta review
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {headerType === "IMAGE" && "Supported: JPG, PNG (Max 5MB)"}
                            {headerType === "VIDEO" && "Supported: MP4, 3GPP (Max 16MB)"}
                            {headerType === "DOCUMENT" && "Supported: PDF, DOCX (Max 100MB)"}
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              if (headerType === "IMAGE") {
                                setHeaderMediaUrl(
                                  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80"
                                );
                                setHeaderMediaFileName("sample_promo_banner.jpg");
                              } else if (headerType === "VIDEO") {
                                setHeaderMediaUrl("https://example.com/demo.mp4");
                                setHeaderMediaFileName("product_demo.mp4");
                              } else {
                                setHeaderMediaUrl("https://example.com/invoice.pdf");
                                setHeaderMediaFileName("Invoice_Sample.pdf");
                              }
                            }}
                          >
                            Load Sample Preset
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Media URL or File Handle (Meta Cloud Media API)
                        </label>
                        <Input
                          placeholder="https://images.unsplash.com/... or media handle"
                          value={headerMediaUrl}
                          onChange={(e) => setHeaderMediaUrl(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Message Body (for TEXT, MEDIA, CAROUSEL) */}
          {contentType !== "CATALOG" && (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("body")}
                className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Message Body
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Main message text with dynamic variables and text styling
                    </p>
                  </div>
                </div>
                {sectionsOpen.body ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {sectionsOpen.body && (
                <div className="p-4 space-y-3">
                  {/* Formatting & Insert Variable Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    {/* Text Styling */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => insertTextFormatting("*")}
                        title="Bold (*text*)"
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => insertTextFormatting("_")}
                        title="Italic (_text_)"
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => insertTextFormatting("~")}
                        title="Strikethrough (~text~)"
                      >
                        <Strikethrough className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => insertTextFormatting("```")}
                        title="Monospace (```text```)"
                      >
                        <Code className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Insert Dynamic Variable Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Insert Dynamic Variable</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 text-xs">
                        {STANDARD_DATA_SOURCES.map((ds) => (
                          <DropdownMenuItem
                            key={ds.id}
                            onClick={() => insertDynamicVariable(ds.id, ds.label)}
                          >
                            <span className="font-medium">{ds.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Main Textarea */}
                  <div className="space-y-1.5">
                    <Textarea
                      ref={bodyTextareaRef}
                      placeholder="Enter your WhatsApp message here... e.g. Hello {{1}}, your order {{2}} has been confirmed."
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={6}
                      className={cn(
                        "text-xs leading-relaxed font-sans resize-y",
                        getFieldError("body") && "border-rose-500 focus-visible:ring-rose-500"
                      )}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Use variables to personalize your message dynamically.
                      </span>
                      <span
                        className={cn(
                          "font-mono",
                          bodyText.length > 1024 && "text-rose-500 font-bold"
                        )}
                      >
                        {bodyText.length}/1024
                      </span>
                    </div>
                    {getFieldError("body") && (
                      <p className="text-xs text-rose-500 font-medium">
                        {getFieldError("body")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Dynamic Variables & Data Source Mapping */}
          {variableConfigs.length > 0 && (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("variables")}
                className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Dynamic Variables & Mapping ({variableConfigs.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Map variables to CRM fields and specify sample values for preview
                    </p>
                  </div>
                </div>
                {sectionsOpen.variables ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {sectionsOpen.variables && (
                <div className="p-4 space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-2 font-medium w-16">Variable</th>
                          <th className="pb-2 font-medium">Variable Name</th>
                          <th className="pb-2 font-medium">Data Source</th>
                          <th className="pb-2 font-medium">Sample Value (Preview)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variableConfigs.map((v) => (
                          <tr key={v.index}>
                            <td className="py-2.5 font-mono font-bold text-emerald-600">
                              {`{{${v.index}}}`}
                            </td>
                            <td className="py-2.5 pr-2">
                              <Input
                                value={v.name}
                                onChange={(e) =>
                                  handleUpdateVariable(v.index, "name", e.target.value)
                                }
                                placeholder="e.g. Customer Name"
                                className="h-7 text-xs"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <select
                                value={v.dataSource}
                                onChange={(e) =>
                                  handleUpdateVariable(v.index, "dataSource", e.target.value)
                                }
                                className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs"
                              >
                                {STANDARD_DATA_SOURCES.map((ds) => (
                                  <option key={ds.id} value={ds.id}>
                                    {ds.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5">
                              <Input
                                value={v.sampleValue}
                                onChange={(e) =>
                                  handleUpdateVariable(
                                    v.index,
                                    "sampleValue",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. John"
                                className="h-7 text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 6: Footer Text (Optional) */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("footer")}
              className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  6
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Footer Text <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Short disclaimer, opt-out note or brand tagline
                  </p>
                </div>
              </div>
              {sectionsOpen.footer ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {sectionsOpen.footer && (
              <div className="p-4 space-y-2">
                <Input
                  placeholder="e.g. Appnix Technologies • Reply STOP to unsubscribe"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="text-xs h-9"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Footer is rendered in small subtle gray font below message.</span>
                  <span>{footerText.length}/60</span>
                </div>
                {getFieldError("footer") && (
                  <p className="text-xs text-rose-500 font-medium">
                    {getFieldError("footer")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 7: Call To Action (CTA) Buttons */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("buttons")}
              className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  7
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Call To Action (CTA) Buttons
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Interactive buttons for website links, phone calls and quick replies
                  </p>
                </div>
              </div>
              {sectionsOpen.buttons ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {sectionsOpen.buttons && (
              <div className="p-4 space-y-4">
                {/* Toggle Enable CTA */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-xs text-foreground">
                      Enable Interactive Buttons
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Add clickable CTAs like Visit Website or Call Support
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableButtons}
                    onChange={(e) => setEnableButtons(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                {enableButtons && (
                  <div className="space-y-3 pt-1">
                    {/* Buttons List */}
                    {buttons.map((btn, idx) => (
                      <div
                        key={btn.id || idx}
                        className="rounded-xl border bg-muted/20 p-3.5 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            {btn.type === "URL" && <ExternalLink className="h-3.5 w-3.5 text-blue-600" />}
                            {btn.type === "PHONE_NUMBER" && <Phone className="h-3.5 w-3.5 text-emerald-600" />}
                            {btn.type === "QUICK_REPLY" && <CornerDownLeft className="h-3.5 w-3.5 text-purple-600" />}
                            {btn.type === "COPY_CODE" && <Copy className="h-3.5 w-3.5 text-amber-600" />}
                            <span>Button #{idx + 1} - {btn.type.replace("_", " ")}</span>
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveButton(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Button Text */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">
                              Button Text (Max 25 chars)
                            </label>
                            <Input
                              placeholder="e.g. Track Order"
                              value={btn.text}
                              onChange={(e) =>
                                handleUpdateButton(idx, "text", e.target.value)
                              }
                              className="h-8 text-xs"
                            />
                          </div>

                          {/* URL Button Fields */}
                          {btn.type === "URL" && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">
                                Website URL
                              </label>
                              <Input
                                placeholder="https://appnix.io/track/{{1}}"
                                value={btn.url || ""}
                                onChange={(e) =>
                                  handleUpdateButton(idx, "url", e.target.value)
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          {/* Phone Button Fields */}
                          {btn.type === "PHONE_NUMBER" && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">
                                Phone Number (with Country Code)
                              </label>
                              <Input
                                placeholder="+91 80627 65557"
                                value={btn.phoneNumber || ""}
                                onChange={(e) =>
                                  handleUpdateButton(idx, "phoneNumber", e.target.value)
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          {/* Quick Reply Payload */}
                          {btn.type === "QUICK_REPLY" && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">
                                Quick Reply Payload / Event ID
                              </label>
                              <Input
                                placeholder="e.g. OPT_OUT_PROMO"
                                value={btn.payload || ""}
                                onChange={(e) =>
                                  handleUpdateButton(idx, "payload", e.target.value)
                                }
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Button Triggers */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddButton("URL")}
                        disabled={buttons.filter((b) => b.type === "URL").length >= 2}
                        className="text-xs h-7.5 gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>+ Visit Website</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddButton("PHONE_NUMBER")}
                        disabled={buttons.filter((b) => b.type === "PHONE_NUMBER").length >= 1}
                        className="text-xs h-7.5 gap-1.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>+ Call Phone Number</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddButton("QUICK_REPLY")}
                        disabled={buttons.filter((b) => b.type === "QUICK_REPLY").length >= 10}
                        className="text-xs h-7.5 gap-1.5"
                      >
                        <CornerDownLeft className="h-3 w-3" />
                        <span>+ Quick Reply</span>
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Meta limits: Maximum 2 Website URLs, 1 Call Phone Number, or up to 10 Quick Replies.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 8: Catalog Configuration (Conditional) */}
          {contentType === "CATALOG" && (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("catalog")}
                className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    8
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Catalog Settings
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connected WhatsApp Business catalog and product selection
                    </p>
                  </div>
                </div>
                {sectionsOpen.catalog ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {sectionsOpen.catalog && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Catalog Selection
                      </label>
                      <select
                        value={catalogConfig.catalogId}
                        onChange={(e) =>
                          setCatalogConfig({
                            ...catalogConfig,
                            catalogId: e.target.value,
                          })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="cat-appnix-01">
                          Appnix Main Catalog (ID: 89601570359)
                        </option>
                        <option value="cat-appnix-02">
                          Special Offers & Bundles Catalog
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Catalog Name
                      </label>
                      <Input
                        value={catalogConfig.catalogName || ""}
                        onChange={(e) =>
                          setCatalogConfig({
                            ...catalogConfig,
                            catalogName: e.target.value,
                          })
                        }
                        placeholder="e.g. Appnix Official Store"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Body Text for Catalog Message
                    </label>
                    <Textarea
                      rows={3}
                      value={catalogConfig.bodyText || ""}
                      onChange={(e) =>
                        setCatalogConfig({
                          ...catalogConfig,
                          bodyText: e.target.value,
                        })
                      }
                      placeholder="Browse our catalog to view the latest software packages."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Catalog CTA Button Text
                    </label>
                    <Input
                      value={catalogConfig.ctaText}
                      onChange={(e) =>
                        setCatalogConfig({
                          ...catalogConfig,
                          ctaText: e.target.value,
                        })
                      }
                      placeholder="View Catalog"
                      className="h-9 text-xs max-w-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 9: Carousel Cards Configuration (Conditional) */}
          {contentType === "CAROUSEL" && (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("carousel")}
                className="w-full flex items-center justify-between p-4 bg-muted/10 border-b hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    9
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Carousel Cards ({carouselCards.length}/10)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Multi-card cards with individual media, headers, and CTAs
                    </p>
                  </div>
                </div>
                {sectionsOpen.carousel ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {sectionsOpen.carousel && (
                <div className="p-4 space-y-4">
                  {carouselCards.map((card, cidx) => (
                    <div
                      key={card.id || cidx}
                      className="rounded-xl border bg-muted/20 p-4 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-xs text-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            Card {cidx + 1}
                          </Badge>
                          <span>{card.header || `Card #${cidx + 1}`}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={cidx === 0}
                            onClick={() => handleMoveCarouselCard(cidx, "up")}
                            className="h-7 w-7"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={cidx === carouselCards.length - 1}
                            onClick={() => handleMoveCarouselCard(cidx, "down")}
                            className="h-7 w-7"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveCarouselCard(cidx)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">
                              Card Media Image URL
                            </label>
                            <Input
                              value={card.mediaUrl || ""}
                              onChange={(e) =>
                                handleUpdateCarouselCard(cidx, "mediaUrl", e.target.value)
                              }
                              placeholder="https://images.unsplash.com/..."
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-muted-foreground">
                              Card Header Title
                            </label>
                            <Input
                              value={card.header || ""}
                              onChange={(e) =>
                                handleUpdateCarouselCard(cidx, "header", e.target.value)
                              }
                              placeholder="e.g. Starter Plan"
                              className="h-8 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">
                            Card Body Text
                          </label>
                          <Textarea
                            rows={2}
                            value={card.body}
                            onChange={(e) =>
                              handleUpdateCarouselCard(cidx, "body", e.target.value)
                            }
                            placeholder="Describe this card..."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      Carousel requires 2 to 10 cards.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCarouselCard}
                      disabled={carouselCards.length >= 10}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Card</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Sticky Live WhatsApp Preview (5 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 self-start space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-emerald-600" /> Live WhatsApp Preview
            </h3>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
              Real-time Sync
            </span>
          </div>

          <WhatsAppPhonePreview
            template={currentTemplate}
            customSampleOverrides={customSampleOverrides}
            onUpdateSampleValue={(idx, val) =>
              setCustomSampleOverrides((prev) => ({ ...prev, [idx]: val }))
            }
          />
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t p-3 sm:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {validationErrors.length > 0 && hasAttemptedSubmit ? (
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Fix {validationErrors.length} errors to submit
              </span>
            ) : (
              <span>
                Template: <strong className="text-foreground">{templateName || "untitled"}</strong> ({category})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Draft</span>
            </Button>

            <Button
              type="button"
              onClick={handleOpenSubmitModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit for Meta Approval</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Submit for Meta Approval Confirmation Modal */}
      <SubmitApprovalModal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          router.push("/channels/whatsapp/templates");
        }}
        onConfirmSubmit={handleConfirmSubmit}
        template={currentTemplate}
      />
    </div>
  );
}
