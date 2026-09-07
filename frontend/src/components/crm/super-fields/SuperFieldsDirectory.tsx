"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Filter,
  Copy,
  Check,
  Edit2,
  Trash2,
  Sliders,
  CheckCircle2,
  MoreVertical,
  LayoutGrid,
  List,
  User,
  PanelRight,
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
  Tag,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SuperField,
  SuperFieldDataType,
  SuperFieldFormPayload,
} from "@/types/super-field";
import { DATA_TYPE_METADATA } from "@/lib/super-fields";
import { useSuperFields } from "@/hooks/useSuperFields";
import { SuperFieldDrawer } from "./SuperFieldDrawer";
import { SuperFieldDeleteDialog } from "./SuperFieldDeleteDialog";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<SuperFieldDataType, React.ElementType> = {
  TEXT: Type,
  TEXTAREA: AlignLeft,
  DROPDOWN: ChevronDownCircle,
  MULTI_SELECT: CheckSquare,
  NUMERIC: Hash,
  DECIMAL: Binary,
  AMOUNT: IndianRupee,
  EMAIL: Mail,
  PHONE: Phone,
  URL: Globe,
  ADDRESS: MapPin,
  DATE: Calendar,
  DATETIME: Clock,
  BOOLEAN: CheckSquare,
  PERIODIC_TIME: Hourglass,
};

export function SuperFieldsDirectory() {
  const {
    fields,
    filteredFields,
    metrics,
    isLoading,
    isMutating,
    filterOptions,
    setFilterOptions,
    createField,
    updateField,
    duplicateField,
    archiveField,
    deleteField,
  } = useSuperFields();

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedFieldForEdit, setSelectedFieldForEdit] = useState<SuperField | null>(null);
  const [selectedFieldForDelete, setSelectedFieldForDelete] = useState<SuperField | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Save / Update Field
  const handleSaveField = async (payload: SuperFieldFormPayload) => {
    if (payload.id) {
      await updateField(payload);
    } else {
      await createField(payload);
    }
    setIsDrawerOpen(false);
    setSelectedFieldForEdit(null);
  };

  // Copy slug
  const handleCopyKey = (keyString: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`contact.${keyString}`);
    setCopiedKey(keyString);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterOptions({
      searchQuery: "",
      dataType: "ALL",
      placementFilter: "ALL",
      requiredFilter: "ALL",
      statusFilter: "ALL",
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs & Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/crm"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>CRM</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <Link
            href="/crm/contacts"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Contacts
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-primary font-semibold">Super Fields</span>
        </div>

        {/* Title Bar & Primary Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Super Fields
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                CRM Schema Engine
              </Badge>
              {isMutating && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Define structured custom attributes, data constraints, and placement rules across CRM records and live chat.
            </p>
          </div>

          <Button
            onClick={() => {
              setSelectedFieldForEdit(null);
              setIsDrawerOpen(true);
            }}
            className="bg-primary text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Super Field</span>
          </Button>
        </div>
      </div>

      {/* 2. Summary Status Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Total Super Fields</span>
            <Sliders className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.total}</p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Custom Schema Attributes</span>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Active Attributes</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.active}</p>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Ready for Customer Profiling</span>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Mandatory Rules</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.required}</p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Strict Validation Enforced</span>
        </div>

        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Inbox Chat Tags</span>
            <Tag className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.inboxLabels}</p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Visible in Live Conversations</span>
        </div>
      </div>

      {/* 3. Multi-Filter & Search Bar Console */}
      <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Filter & Search Attributes
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {(filterOptions.searchQuery ||
              filterOptions.dataType !== "ALL" ||
              filterOptions.placementFilter !== "ALL" ||
              filterOptions.requiredFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" /> Reset Filters
              </Button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "table" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                )}
                title="Cards Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by label or system slug (e.g. city)..."
              value={filterOptions.searchQuery}
              onChange={(e) =>
                setFilterOptions((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              className="pl-8 h-8 text-xs bg-background"
            />
            {filterOptions.searchQuery && (
              <button
                onClick={() =>
                  setFilterOptions((prev) => ({ ...prev, searchQuery: "" }))
                }
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Data Type Selector */}
          <div>
            <select
              value={filterOptions.dataType}
              onChange={(e) =>
                setFilterOptions((prev) => ({ ...prev, dataType: e.target.value as any }))
              }
              className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground cursor-pointer"
            >
              <option value="ALL">All Data Formats ({Object.keys(DATA_TYPE_METADATA).length})</option>
              {(Object.keys(DATA_TYPE_METADATA) as SuperFieldDataType[]).map((typeKey) => (
                <option key={typeKey} value={typeKey}>
                  {DATA_TYPE_METADATA[typeKey].label}
                </option>
              ))}
            </select>
          </div>

          {/* Placement Filter */}
          <div>
            <select
              value={filterOptions.placementFilter}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  placementFilter: e.target.value as any,
                }))
              }
              className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground cursor-pointer"
            >
              <option value="ALL">All Placements</option>
              <option value="PROFILE">Contact Profile Page</option>
              <option value="INBOX_LABEL">Chat Inbox Label Tag</option>
              <option value="INBOX_SIDEBAR">Chat Inbox Sidebar</option>
            </select>
          </div>

          {/* Required Status Filter */}
          <div>
            <select
              value={filterOptions.requiredFilter}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  requiredFilter: e.target.value as any,
                }))
              }
              className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs text-foreground cursor-pointer"
            >
              <option value="ALL">All Requirement Rules</option>
              <option value="REQUIRED">Mandatory Only</option>
              <option value="OPTIONAL">Optional Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Super Fields Data Table / Grid View */}
      {viewMode === "table" ? (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
          <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Registered Super Fields</h3>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {filteredFields.length} attributes
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {filteredFields.length} of {fields.length} schema fields
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Field Label & Key</th>
                  <th className="px-4 py-3">Data Type</th>
                  <th className="px-4 py-3">Predefined Options / Format Rule</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3">Placements</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      <p>Loading schema attributes...</p>
                    </td>
                  </tr>
                ) : filteredFields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-xs">
                      <Sliders className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-bold text-foreground">
                        {fields.length === 0 ? "No Super Fields Configured Yet" : "No Matching Super Fields Found"}
                      </p>
                      <p className="text-[11px] mt-0.5 max-w-sm mx-auto">
                        {fields.length === 0
                          ? "Create your first dynamic custom field to store business-specific attributes across CRM contacts, live chat profiles, and campaign audiences."
                          : "Try adjusting your search query or data type filter options."}
                      </p>
                      {fields.length === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedFieldForEdit(null);
                            setIsDrawerOpen(true);
                          }}
                          className="mt-3 h-8 text-xs font-semibold gap-1.5 bg-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Add Your First Super Field</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-3 h-7 text-xs"
                        >
                          Reset All Filters
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredFields.map((field) => {
                    const meta = DATA_TYPE_METADATA[field.dataType];
                    const TypeIcon = TYPE_ICONS[field.dataType] || Type;

                    return (
                      <tr
                        key={field.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedFieldForEdit(field);
                          setIsDrawerOpen(true);
                        }}
                      >
                        {/* 1. Field Label & Slug */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors text-xs flex items-center gap-1.5">
                              <span>{field.label}</span>
                              {field.validation.isRequired && (
                                <span className="text-rose-500 font-bold" title="Required">*</span>
                              )}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border">
                                contact.{field.key}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyKey(field.key, e)}
                                title="Copy slug tag"
                                className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                              >
                                {copiedKey === field.key ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            {field.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs pt-0.5">
                                {field.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 2. Data Type Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1", meta.badgeStyle)}>
                              <TypeIcon className="h-3 w-3 shrink-0" />
                              <span>{meta.label}</span>
                            </span>
                          </div>
                        </td>

                        {/* 3. Predefined Options / Rules Preview */}
                        <td className="px-4 py-3.5 max-w-xs">
                          {field.options && field.options.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {field.options.slice(0, 3).map((opt) => (
                                <Badge
                                  key={opt.id}
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 bg-background font-normal gap-1"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: opt.color || "#2563EB" }} />
                                  <span>{opt.label}</span>
                                </Badge>
                              ))}
                              {field.options.length > 3 && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  +{field.options.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {meta.example}
                            </span>
                          )}
                        </td>

                        {/* 4. Required Indicator */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {field.validation.isRequired ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-semibold">
                              Mandatory
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                              Optional
                            </Badge>
                          )}
                        </td>

                        {/* 5. Placements */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {field.placement.contactProfile && (
                              <span
                                className="h-6 w-6 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-900"
                                title="Visible on Contact Profile Page"
                              >
                                <User className="h-3 w-3" />
                              </span>
                            )}
                            {field.placement.chatInboxLabel && (
                              <span
                                className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center border border-indigo-200 dark:border-indigo-900"
                                title="Visible as Label in Chat Inbox list"
                              >
                                <Tag className="h-3 w-3" />
                              </span>
                            )}
                            {field.placement.chatInboxSidebar && (
                              <span
                                className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-900"
                                title="Visible in Live Chat Sidebar CRM Attributes"
                              >
                                <PanelRight className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFieldForEdit(field);
                                  setIsDrawerOpen(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-2 text-primary" />
                                <span>Edit Super Field</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateField(field)}>
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                <span>Duplicate Field</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setSelectedFieldForDelete(field)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                <span>Archive or Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground text-xs shadow-xs">
          <Sliders className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-bold text-foreground">
            {fields.length === 0 ? "No Super Fields Configured Yet" : "No Matching Super Fields Found"}
          </p>
          <p className="text-[11px] mt-0.5 max-w-sm mx-auto">
            {fields.length === 0
              ? "Create your first dynamic custom field to store business-specific attributes across CRM contacts, live chat profiles, and campaign audiences."
              : "Try adjusting your search query or data type filter options."}
          </p>
          {fields.length === 0 ? (
            <Button
              size="sm"
              onClick={() => {
                setSelectedFieldForEdit(null);
                setIsDrawerOpen(true);
              }}
              className="mt-3 h-8 text-xs font-semibold gap-1.5 bg-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Your First Super Field</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-3 h-7 text-xs"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        /* Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFields.map((field) => {
            const meta = DATA_TYPE_METADATA[field.dataType];
            const TypeIcon = TYPE_ICONS[field.dataType] || Type;

            return (
              <div
                key={field.id}
                onClick={() => {
                  setSelectedFieldForEdit(field);
                  setIsDrawerOpen(true);
                }}
                className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs hover:shadow-md transition-all cursor-pointer border-border hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-foreground text-xs">{field.label}</h4>
                      {field.validation.isRequired && (
                        <span className="text-rose-500 font-bold">*</span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      contact.{field.key}
                    </p>
                  </div>

                  <span className={cn("px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1", meta.badgeStyle)}>
                    <TypeIcon className="h-3 w-3 shrink-0" />
                    <span>{meta.label}</span>
                  </span>
                </div>

                {field.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {field.description}
                  </p>
                )}

                {field.options && field.options.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {field.options.slice(0, 4).map((opt) => (
                      <Badge
                        key={opt.id}
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 bg-background font-normal gap-1"
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: opt.color || "#2563EB" }} />
                        <span>{opt.label}</span>
                      </Badge>
                    ))}
                    {field.options.length > 4 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        +{field.options.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {field.placement.contactProfile && (
                      <span title="Contact Profile"><User className="h-3 w-3 text-blue-600" /></span>
                    )}
                    {field.placement.chatInboxLabel && (
                      <span title="Inbox Tag"><Tag className="h-3 w-3 text-indigo-600" /></span>
                    )}
                    {field.placement.chatInboxSidebar && (
                      <span title="Chat Sidebar"><PanelRight className="h-3 w-3 text-emerald-600" /></span>
                    )}
                  </div>
                  <span className="font-mono text-[10px]">
                    {field.usageCount.toLocaleString("en-IN")} contacts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation / Edit Drawer */}
      <SuperFieldDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedFieldForEdit(null);
        }}
        onSave={handleSaveField}
        initialData={selectedFieldForEdit}
        existingFields={fields}
      />

      {/* Delete / Archive Confirmation Dialog */}
      <SuperFieldDeleteDialog
        isOpen={!!selectedFieldForDelete}
        onClose={() => setSelectedFieldForDelete(null)}
        field={selectedFieldForDelete}
        onConfirmArchive={(field) => archiveField(field.id)}
        onConfirmDelete={(field) => deleteField(field.id)}
      />
    </div>
  );
}
