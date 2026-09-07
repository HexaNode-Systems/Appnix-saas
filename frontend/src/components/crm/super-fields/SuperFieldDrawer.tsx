"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Sliders,
  Layers,
  Sparkles,
  Type,
  AlignLeft,
  ChevronDownCircle,
  CheckSquare,
  Hash,
  Binary,
  IndianRupee,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Clock,
  Hourglass,
  ArrowRight,
  Eye,
  Info,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  SuperField,
  SuperFieldDataType,
  SuperFieldFormPayload,
  SuperFieldOption,
  SuperFieldValidationError,
} from "@/types/super-field";
import {
  DATA_TYPE_METADATA,
  generateFieldKey,
  validateSuperField,
} from "@/lib/super-fields";
import { cn } from "@/lib/utils";

interface SuperFieldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: SuperFieldFormPayload) => Promise<void>;
  initialData?: SuperField | null;
  existingFields?: SuperField[];
}

const OPTION_COLOR_PALETTE = [
  "#2563EB", // Blue
  "#059669", // Emerald
  "#7C3AED", // Purple
  "#D97706", // Amber
  "#E11D48", // Rose
  "#0891B2", // Cyan
  "#4F46E5", // Indigo
  "#64748B", // Slate
];

const CURRENCY_OPTIONS = [
  { symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { symbol: "$", label: "USD ($) - US Dollar" },
  { symbol: "€", label: "EUR (€) - Euro" },
  { symbol: "£", label: "GBP (£) - British Pound" },
  { symbol: "AED", label: "AED - UAE Dirham" },
  { symbol: "S$", label: "SGD (S$) - Singapore Dollar" },
];

export function SuperFieldDrawer({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingFields = [],
}: SuperFieldDrawerProps) {
  // Form State
  const [label, setLabel] = useState(initialData?.label || "");
  const [key, setKey] = useState(initialData?.key || "");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(!!initialData);
  const [isKeyLocked, setIsKeyLocked] = useState(true);
  const [description, setDescription] = useState(initialData?.description || "");
  const [dataType, setDataType] = useState<SuperFieldDataType>(
    initialData?.dataType || "TEXT"
  );
  const [currencySymbol, setCurrencySymbol] = useState(
    initialData?.currencySymbol || "₹"
  );

  // Options State (for Dropdown & Multi-Select)
  const [options, setOptions] = useState<SuperFieldOption[]>(
    initialData?.options || [
      { id: "opt-1", label: "Option 1", value: "Option 1", color: "#2563EB" },
      { id: "opt-2", label: "Option 2", value: "Option 2", color: "#059669" },
    ]
  );
  const [newOptionInput, setNewOptionInput] = useState("");
  const [defaultValue, setDefaultValue] = useState<string>(
    typeof initialData?.defaultValue === "string" ? initialData.defaultValue : ""
  );
  const [helperText, setHelperText] = useState(initialData?.helperText || "");
  const [placeholder, setPlaceholder] = useState(initialData?.placeholder || "");

  // Validation Rules State
  const [isRequired, setIsRequired] = useState(
    initialData?.validation?.isRequired || false
  );
  const [minValue, setMinValue] = useState<string>(
    initialData?.validation?.minValue?.toString() || ""
  );
  const [maxValue, setMaxValue] = useState<string>(
    initialData?.validation?.maxValue?.toString() || ""
  );

  // Placement Controls State
  const [contactProfile, setContactProfile] = useState(
    initialData ? initialData.placement.contactProfile : true
  );
  const [chatInboxLabel, setChatInboxLabel] = useState(
    initialData ? initialData.placement.chatInboxLabel : false
  );
  const [chatInboxSidebar, setChatInboxSidebar] = useState(
    initialData ? initialData.placement.chatInboxSidebar : true
  );

  // Submission & Validation State
  const [validationErrors, setValidationErrors] = useState<SuperFieldValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when initialData changes or drawer opens
  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label);
      setKey(initialData.key);
      setIsKeyManuallyEdited(true);
      setDescription(initialData.description || "");
      setDataType(initialData.dataType);
      setCurrencySymbol(initialData.currencySymbol || "₹");
      setOptions(initialData.options || []);
      setDefaultValue(typeof initialData.defaultValue === "string" ? initialData.defaultValue : "");
      setHelperText(initialData.helperText || "");
      setPlaceholder(initialData.placeholder || "");
      setIsRequired(initialData.validation.isRequired);
      setMinValue(initialData.validation.minValue?.toString() || "");
      setMaxValue(initialData.validation.maxValue?.toString() || "");
      setContactProfile(initialData.placement.contactProfile);
      setChatInboxLabel(initialData.placement.chatInboxLabel);
      setChatInboxSidebar(initialData.placement.chatInboxSidebar);
    } else {
      setLabel("");
      setKey("");
      setIsKeyManuallyEdited(false);
      setDescription("");
      setDataType("TEXT");
      setCurrencySymbol("₹");
      setOptions([
        { id: "opt-1", label: "Option 1", value: "Option 1", color: "#2563EB" },
        { id: "opt-2", label: "Option 2", value: "Option 2", color: "#059669" },
      ]);
      setDefaultValue("");
      setHelperText("");
      setPlaceholder("");
      setIsRequired(false);
      setMinValue("");
      setMaxValue("");
      setContactProfile(true);
      setChatInboxLabel(false);
      setChatInboxSidebar(true);
    }
    setValidationErrors([]);
    setIsSaving(false);
  }, [initialData, isOpen]);

  // Live Auto-Slug generator
  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!isKeyManuallyEdited || !initialData) {
      setKey(generateFieldKey(newLabel));
    }
  };

  // Add Option to list
  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;

    // Support comma-separated batch adding (e.g. "Delhi, Mumbai, Bengaluru")
    if (trimmed.includes(",")) {
      const splitItems = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      const newOpts: SuperFieldOption[] = splitItems.map((val, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        label: val,
        value: val,
        color: OPTION_COLOR_PALETTE[(options.length + idx) % OPTION_COLOR_PALETTE.length],
      }));
      setOptions([...options, ...newOpts]);
      setNewOptionInput("");
      return;
    }

    const randomColor =
      OPTION_COLOR_PALETTE[options.length % OPTION_COLOR_PALETTE.length];
    const newOpt: SuperFieldOption = {
      id: `opt-${Date.now()}`,
      label: trimmed,
      value: trimmed,
      color: randomColor,
    };
    setOptions([...options, newOpt]);
    setNewOptionInput("");
  };

  // Remove Option
  const handleRemoveOption = (id: string) => {
    const updated = options.filter((o) => o.id !== id);
    setOptions(updated);
    if (defaultValue === id) setDefaultValue("");
  };

  // Update Option Color
  const handleOptionColorChange = (id: string, color: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, color } : o)));
  };

  // Current payload
  const currentPayload: SuperFieldFormPayload = useMemo(() => {
    return {
      id: initialData?.id,
      key: key.trim(),
      label: label.trim(),
      description: description.trim() || undefined,
      dataType,
      currencySymbol: dataType === "AMOUNT" ? currencySymbol : undefined,
      options: DATA_TYPE_METADATA[dataType].supportsOptions ? options : undefined,
      defaultValue: defaultValue.trim() || undefined,
      helperText: helperText.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      validation: {
        isRequired,
        minValue: minValue ? parseFloat(minValue) : undefined,
        maxValue: maxValue ? parseFloat(maxValue) : undefined,
      },
      placement: {
        contactProfile,
        chatInboxLabel,
        chatInboxSidebar,
      },
    };
  }, [
    initialData,
    key,
    label,
    description,
    dataType,
    currencySymbol,
    options,
    defaultValue,
    helperText,
    placeholder,
    isRequired,
    minValue,
    maxValue,
    contactProfile,
    chatInboxLabel,
    chatInboxSidebar,
  ]);

  // Handle Save
  const handleSave = async () => {
    const errors = validateSuperField(currentPayload, existingFields);
    setValidationErrors(errors);

    if (errors.length > 0) return;

    setIsSaving(true);
    try {
      await onSave(currentPayload);
      onClose();
    } catch (e) {
      console.error("Error saving super field:", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentTypeMeta = DATA_TYPE_METADATA[dataType];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      {/* Slide-Over Drawer Container */}
      <div className="w-full max-w-2xl bg-card text-card-foreground h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b flex items-start justify-between bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sliders className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {initialData ? `Edit Super Field: ${initialData.label}` : "Create New Super Field"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure attribute label, data format constraints, and inbox display settings.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Validation Alert Errors Banner */}
          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-1.5 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Please fix the following validation errors:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-2">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SECTION 1: FIELD IDENTITY & DATA TYPE */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                1. Field Identity & Data Type
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                System Attribute
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field Label */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground text-xs">
                    Field Label <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">User-friendly display name</span>
                </div>
                <Input
                  required
                  placeholder="e.g. City / Customer Tier / Annual Budget"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="h-9 text-xs bg-background font-medium"
                />
              </div>

              {/* System Key / Slug */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <span>System Key (Slug)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsKeyLocked(!isKeyLocked)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    {isKeyLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{isKeyLocked ? "Unlock slug" : "Lock slug"}</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-[11px]">
                    contact.
                  </span>
                  <Input
                    required
                    disabled={isKeyLocked && !!initialData}
                    placeholder="city"
                    value={key}
                    onChange={(e) => {
                      setIsKeyManuallyEdited(true);
                      setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
                    }}
                    className="pl-16 h-9 text-xs font-mono bg-background"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Programmatic identifier used in automations and templates (e.g. <code>{"{{contact." + (key || "key") + "}}"}</code>).
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-foreground text-xs">
                  Field Description (Optional)
                </label>
                <Input
                  placeholder="Brief internal guidance on what this attribute captures..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Visual Data Type Selector Grid */}
            <div className="space-y-2 pt-2">
              <label className="font-bold text-foreground text-xs block">
                Select Data Format Constraint <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(DATA_TYPE_METADATA) as SuperFieldDataType[]).map((typeKey) => {
                  const meta = DATA_TYPE_METADATA[typeKey];
                  const isSelected = dataType === typeKey;

                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setDataType(typeKey)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between gap-2",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-border hover:bg-muted/40 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", meta.badgeStyle)}>
                          {typeKey}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs">{meta.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency Selector (if AMOUNT is selected) */}
            {dataType === "AMOUNT" && (
              <div className="pt-2 border-t space-y-1.5 animate-in fade-in duration-200">
                <label className="font-bold text-foreground text-xs block">
                  Select Currency Symbol
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCY_OPTIONS.map((curr) => (
                    <button
                      key={curr.symbol}
                      type="button"
                      onClick={() => setCurrencySymbol(curr.symbol)}
                      className={cn(
                        "p-2 rounded-lg border text-xs font-semibold flex items-center justify-between",
                        currencySymbol === curr.symbol
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <span>{curr.label}</span>
                      {currencySymbol === curr.symbol && <Check className="h-3 w-3 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: DROPDOWN & MULTI-SELECT OPTIONS BUILDER */}
          {currentTypeMeta.supportsOptions && (
            <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  2. Predefined Choices & Color Tags
                </h3>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {options.length} options defined
                </Badge>
              </div>

              {/* Add Option Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-xs block">
                  Add Choice Value
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter value or comma-separated list (e.g. Delhi, Mumbai, Dubai)..."
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="h-9 text-xs bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={!newOptionInput.trim()}
                    className="h-9 text-xs gap-1 shrink-0 bg-primary text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Choice</span>
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Tip: Type multiple choices separated by commas to add them in batch.
                </span>
              </div>

              {/* Added Choices Chips List */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-foreground block">
                  Configured Choices:
                </label>
                {options.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground text-xs">
                    No options defined yet. Add choices above to construct dropdown selection.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((opt) => (
                      <div
                        key={opt.id}
                        className="p-2.5 rounded-xl border bg-muted/20 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: opt.color || "#2563EB" }}
                          />
                          <span className="font-semibold text-foreground truncate">{opt.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1">
                            {OPTION_COLOR_PALETTE.slice(0, 4).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleOptionColorChange(opt.id, c)}
                                className={cn(
                                  "h-3 w-3 rounded-full transition-transform",
                                  opt.color === c ? "ring-1 ring-primary scale-110" : "hover:scale-110"
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="text-muted-foreground hover:text-rose-600 p-1"
                            title="Remove choice"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Default Value & Helper Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="font-bold text-foreground text-xs block mb-1">
                    Preselected Default Value
                  </label>
                  <select
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border bg-background text-xs text-foreground cursor-pointer"
                  >
                    <option value="">-- No Default Value (Blank) --</option>
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground text-xs block mb-1">
                    Agent Helper / Hint Text
                  </label>
                  <Input
                    placeholder="e.g. Select the corporate billing location..."
                    value={helperText}
                    onChange={(e) => setHelperText(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: VALIDATION & CONSTRAINTS */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                3. Validation Rules & Constraints
              </h3>
              <Badge variant="outline" className="text-[10px]">
                Data Integrity
              </Badge>
            </div>

            {/* Mandatory / Required Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border">
              <div>
                <p className="font-bold text-foreground text-xs">
                  Required Attribute (Mandatory)
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Agents and lead capture forms cannot save a contact profile without filling this attribute.
                </p>
              </div>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>

            {/* Numerical Min / Max Bounds */}
            {currentTypeMeta.supportsMinMax && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-foreground text-xs block mb-1">
                    Minimum Value Bound
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 0"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground text-xs block mb-1">
                    Maximum Value Bound
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: DISPLAY & PLACEMENT CONTROLS */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                4. Placement & Visibility Controls
              </h3>
              <Badge variant="outline" className="text-[10px]">
                Omnichannel Inbox
              </Badge>
            </div>

            <div className="space-y-3">
              {/* Placement 1: Contact Profile Page */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/10">
                <div>
                  <p className="font-bold text-foreground text-xs">
                    Display on Contact Profile Page
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Renders in the main contact overview grid when inspecting customer records.
                  </p>
                </div>
                <Switch checked={contactProfile} onCheckedChange={setContactProfile} />
              </div>

              {/* Placement 2: Chat Inbox Label Tag */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/10">
                <div>
                  <p className="font-bold text-foreground text-xs">
                    Display as Label in Chat Inbox
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Renders as a compact tag pill on customer conversation list cards in Live Chat.
                  </p>
                </div>
                <Switch checked={chatInboxLabel} onCheckedChange={setChatInboxLabel} />
              </div>

              {/* Placement 3: Chat Inbox Sidebar */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/10">
                <div>
                  <p className="font-bold text-foreground text-xs">
                    Display in Chat Inbox Sidebar
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Renders in the right-side CRM Attributes panel during active live conversations.
                  </p>
                </div>
                <Switch checked={chatInboxSidebar} onCheckedChange={setChatInboxSidebar} />
              </div>
            </div>
          </div>

          {/* SECTION 5: LIVE FIELD SIMULATOR PREVIEW */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Live Agent Input Preview
              </span>
              <Badge variant="outline" className="text-[10px] bg-background">
                Preview Mode
              </Badge>
            </div>

            <div className="p-4 rounded-xl border bg-background space-y-2">
              <label className="font-semibold text-foreground text-xs flex items-center gap-1">
                <span>{label || "Field Label Preview"}</span>
                {isRequired && <span className="text-rose-500">*</span>}
              </label>

              {dataType === "DROPDOWN" ? (
                <select className="w-full h-8 px-2.5 rounded-lg border text-xs text-foreground bg-card">
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : dataType === "MULTI_SELECT" ? (
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => (
                    <Badge key={opt.id} variant="outline" className="text-[10px] gap-1 bg-muted/40">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      <span>{opt.label}</span>
                    </Badge>
                  ))}
                </div>
              ) : dataType === "TEXTAREA" ? (
                <Textarea rows={2} placeholder={placeholder || "Agent notes..."} className="text-xs resize-none" />
              ) : dataType === "AMOUNT" ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
                    {currencySymbol}
                  </span>
                  <Input placeholder={placeholder || "50,000"} className="pl-7 h-8 text-xs font-mono" />
                </div>
              ) : dataType === "BOOLEAN" ? (
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={false} />
                  <span className="text-xs text-muted-foreground">{placeholder || "Toggle status / verify checkbox"}</span>
                </div>
              ) : dataType === "DATE" ? (
                <Input type="date" className="h-8 text-xs font-mono" />
              ) : dataType === "DATETIME" ? (
                <Input type="datetime-local" className="h-8 text-xs font-mono" />
              ) : (
                <Input placeholder={placeholder || currentTypeMeta.example} className="h-8 text-xs font-mono" />
              )}

              {helperText && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span>{helperText}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs">
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !label.trim()}
            className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Registering Schema...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Save Super Field</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
