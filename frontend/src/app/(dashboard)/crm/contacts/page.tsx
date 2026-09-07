"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Filter,
  ArrowLeft,
  Tag,
  Plus,
  Users,
  MessageSquare,
  Wallet,
  Flag,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Search,
  X,
  Phone,
  Edit2,
  Check,
  History,
  Layers,
  Sliders,
  Megaphone,
} from "lucide-react";
import { Contact, ImportHistoryRecord } from "@/components/crm/types";
import { ImportContactsModal } from "@/components/crm/ImportContactsModal";
import { ImportHistoryTable } from "@/components/crm/ImportHistoryTable";
import { downloadCsv, escapeCsvField } from "@/components/crm/csv-utils";
import { ManageTagsModal } from "@/components/crm/tags/ManageTagsModal";
import { TagBadge } from "@/components/crm/tags/TagBadge";
import { InlineContactTagPicker } from "@/components/crm/tags/InlineContactTagPicker";
import type { SuperField } from "@/types/super-field";
import { api } from "@/lib/api/axios";
import { toast } from "sonner";

interface SegmentItem {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CrmContactsPage() {
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [importHistoryList, setImportHistoryList] = useState<ImportHistoryRecord[]>([]);
  const [segmentsList, setSegmentsList] = useState<SegmentItem[]>([]);
  const [superFields, setSuperFields] = useState<SuperField[]>([]);
  const [newContactSuperFields, setNewContactSuperFields] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSegmentsLoading, setIsSegmentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "segments" | "history">("contacts");

  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState("20");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageTagsModalOpen, setIsManageTagsModalOpen] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Edit Contact & Super Fields Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    whatsappNumber: "",
    email: "",
    marketingBudget: "",
    marketingGoal: "",
  });
  const [editSuperFieldValues, setEditSuperFieldValues] = useState<Record<string, any>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Create Segment Modal state
  const [isCreateSegmentModalOpen, setIsCreateSegmentModalOpen] = useState(false);
  const [newSegmentData, setNewSegmentData] = useState({
    name: "",
    description: "",
    filterType: "all" as "all" | "tag" | "superField",
    tag: "",
    superFieldKey: "",
    superFieldValue: "",
  });
  const [isSubmittingSegment, setIsSubmittingSegment] = useState(false);

  // Fetch real contacts from backend
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/contacts");
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped: Contact[] = data.map((c: any) => {
        const rawTags: string[] = Array.isArray(c.tags) ? c.tags : [];
        const cleanTags = rawTags.filter((t) => !t.startsWith("budget:") && !t.startsWith("goal:"));
        const budgetFromTag = rawTags.find((t) => t.startsWith("budget:"))?.replace("budget:", "");
        const goalFromTag = rawTags.find((t) => t.startsWith("goal:"))?.replace("goal:", "");

        const budget = c.superFieldValues?.marketingBudget || budgetFromTag || "$0";
        const goal = c.superFieldValues?.marketingGoal || goalFromTag || "General Inquiries";

        return {
          id: c.id,
          fullName: c.name || "Unnamed Contact",
          whatsappNumber: c.phone || "",
          email: c.email || "",
          tags: cleanTags.map((tag) => ({
            label: tag,
            variant: tag.toLowerCase().includes("vip")
              ? "vip"
              : tag.toLowerCase().includes("star")
              ? "star"
              : tag.toLowerCase().includes("check")
              ? "check"
              : "none",
          })),
          marketingBudget: budget.startsWith("$") ? budget : `$${budget}`,
          marketingGoal: goal,
          superFieldValues: c.superFieldValues || {},
          createdOn: c.createdAt
            ? new Date(c.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Recent",
        };
      });
      setContactsList(mapped);
    } catch (err) {
      console.error("Failed to fetch CRM contacts", err);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch real import history
  const fetchImportHistory = useCallback(async () => {
    try {
      const res = await api.get("/contacts/import-history");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setImportHistoryList(list);
    } catch (err) {
      console.error("Failed to load import history", err);
    }
  }, []);

  // Fetch real segments
  const fetchSegments = useCallback(async () => {
    setIsSegmentsLoading(true);
    try {
      const res = await api.get("/contacts/segments");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setSegmentsList(list);
    } catch (err) {
      console.error("Failed to load segments", err);
    } finally {
      setIsSegmentsLoading(false);
    }
  }, []);

  // Fetch real active Super Fields
  const fetchSuperFields = useCallback(async () => {
    try {
      const res = await api.get("/crm/super-fields");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setSuperFields(list.filter((f: SuperField) => f.status === "ACTIVE"));
    } catch {
      setSuperFields([]);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchImportHistory();
    fetchSegments();
    fetchSuperFields();
  }, [fetchContacts, fetchImportHistory, fetchSegments, fetchSuperFields]);

  const handleUpdateContactTags = async (contactId: string, newLabels: string[]) => {
    try {
      await api.patch(`/contacts/${contactId}`, { tags: newLabels });
      setContactsList((prev) =>
        prev.map((c) => {
          if (c.id === contactId) {
            return {
              ...c,
              tags: newLabels.map((l) => ({
                label: l,
                variant: l.toLowerCase().includes("vip")
                  ? "vip"
                  : l.toLowerCase().includes("star")
                  ? "star"
                  : l.toLowerCase().includes("check")
                  ? "check"
                  : "none",
              })),
            };
          }
          return c;
        })
      );
      toast.success("Tags updated");
      fetchSegments();
    } catch (err) {
      console.error("Failed to update contact tags", err);
      toast.error("Failed to update tags");
    }
  };

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "fullName" | "marketingBudget" | "marketingGoal";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add Contact Form state
  const [newContact, setNewContact] = useState({
    fullName: "",
    whatsappNumber: "",
    email: "",
    marketingBudget: "",
    marketingGoal: "",
    isVip: false,
  });

  // Dynamic Real Statistics Calculation
  const statCards = useMemo(() => {
    const totalCount = contactsList.length;
    const activeWhatsappCount = contactsList.filter((c) => Boolean(c.whatsappNumber)).length;
    const withEmailCount = contactsList.filter((c) => Boolean(c.email)).length;
    const taggedCount = contactsList.filter((c) => c.tags && c.tags.length > 0).length;

    let totalBudgetSum = 0;
    contactsList.forEach((c) => {
      const num = parseFloat(c.marketingBudget.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) totalBudgetSum += num;
    });

    const formattedBudget =
      totalBudgetSum >= 1000
        ? `$${(totalBudgetSum / 1000).toFixed(1)}k`
        : `$${totalBudgetSum.toLocaleString()}`;

    return [
      {
        label: "Total Contacts",
        value: totalCount.toLocaleString(),
        change: totalCount > 0 ? `${totalCount} verified records` : "No contacts yet",
        icon: Users,
        trend: "neutral" as const,
      },
      {
        label: "Active WhatsApp",
        value: activeWhatsappCount.toLocaleString(),
        change: `${activeWhatsappCount} reachable numbers`,
        icon: MessageSquare,
        trend: "neutral" as const,
      },
      {
        label: "Categorized Contacts",
        value: taggedCount.toLocaleString(),
        change: `${taggedCount} with CRM tags`,
        icon: Tag,
        trend: "neutral" as const,
      },
      {
        label: "Total Marketing Budget",
        value: formattedBudget,
        change: `${withEmailCount} with email address`,
        icon: Wallet,
        trend: "neutral" as const,
      },
    ];
  }, [contactsList]);

  // Filtering
  const filteredContacts = useMemo(() => {
    return contactsList.filter((contact) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        contact.fullName.toLowerCase().includes(q) ||
        contact.whatsappNumber.includes(searchQuery) ||
        (contact.email && contact.email.toLowerCase().includes(q)) ||
        contact.marketingGoal.toLowerCase().includes(q) ||
        Object.values(contact.superFieldValues || {}).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q)
        );

      const matchesTag =
        !filterTag ||
        (filterTag === "vip" && contact.tags.some((t) => t.variant === "vip")) ||
        (filterTag === "star" && contact.tags.some((t) => t.variant === "star"));

      return matchesSearch && matchesTag;
    });
  }, [contactsList, searchQuery, filterTag]);

  const allSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selected.includes(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(filteredContacts.map((c) => c.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContactsList((prev) => prev.filter((c) => c.id !== id));
      setSelected((prev) => prev.filter((s) => s !== id));
      toast.success("Contact deleted");
      fetchSegments();
    } catch (err) {
      console.error("Failed to delete contact", err);
      toast.error("Failed to delete contact");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selected.length} contacts?`)) return;
    try {
      await api.post("/contacts/bulk-delete", { ids: selected });
      setContactsList((prev) => prev.filter((c) => !selected.includes(c.id)));
      setSelected([]);
      toast.success(`${selected.length} contacts deleted`);
      fetchSegments();
    } catch (err) {
      console.error("Failed to bulk delete contacts", err);
      toast.error("Failed to delete contacts");
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.whatsappNumber.trim()) return;
    setIsSubmittingContact(true);

    try {
      const payload = {
        name: newContact.fullName.trim() || "Unnamed Contact",
        phone: newContact.whatsappNumber.trim().replace(/\D/g, "") || newContact.whatsappNumber.trim(),
        email: newContact.email.trim() || undefined,
        tags: newContact.isVip ? ["VIP"] : [],
        marketingBudget: newContact.marketingBudget.trim() || undefined,
        marketingGoal: newContact.marketingGoal.trim() || undefined,
        superFieldValues: newContactSuperFields,
      };
      await api.post("/contacts", payload);
      toast.success("Contact added successfully");
      fetchContacts();
      fetchSegments();
      setNewContact({
        fullName: "",
        whatsappNumber: "",
        email: "",
        marketingBudget: "",
        marketingGoal: "",
        isVip: false,
      });
      setNewContactSuperFields({});
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Failed to add contact", err);
      toast.error("Failed to add contact");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Callback when bulk CSV import completes
  const handleImportComplete = (_newImported: Contact[], historyRecord: ImportHistoryRecord) => {
    fetchContacts();
    fetchImportHistory();
    fetchSegments();
    setImportHistoryList((prev) => [historyRecord, ...prev]);
  };

  // Secure CSV Export (with CSV Injection protection)
  const handleExportCsv = () => {
    const headers = ["Full Name", "WhatsApp Number", "Email", "Tags", "Marketing Budget", "Marketing Goal"];
    const rows = contactsList.map((c) => [
      c.fullName,
      c.whatsappNumber,
      c.email || "",
      c.tags.map((t) => t.label).join(", "),
      c.marketingBudget,
      c.marketingGoal,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\r\n");

    downloadCsv("crm_contacts.csv", csvContent);
  };

  const startInlineEdit = (
    id: string,
    field: "fullName" | "marketingBudget" | "marketingGoal",
    currentVal: string
  ) => {
    setEditingCell({ id, field });
    setEditValue(currentVal);
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const value = editValue;
    try {
      const payload: any = {};
      if (field === "fullName") payload.name = value;
      if (field === "marketingBudget") payload.marketingBudget = value;
      if (field === "marketingGoal") payload.marketingGoal = value;
      await api.patch(`/contacts/${id}`, payload);
      setContactsList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
      toast.success("Contact updated");
    } catch (err) {
      console.error("Failed to update contact", err);
      toast.error("Failed to update contact");
    } finally {
      setEditingCell(null);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;
    try {
      await api.delete(`/contacts/segments/${segmentId}`);
      setSegmentsList((prev) => prev.filter((s) => s.id !== segmentId));
      toast.success("Segment deleted");
    } catch (err) {
      console.error("Failed to delete segment", err);
      toast.error("Failed to delete segment");
    }
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setEditFormData({
      fullName: contact.fullName,
      whatsappNumber: contact.whatsappNumber,
      email: contact.email || "",
      marketingBudget: contact.marketingBudget || "",
      marketingGoal: contact.marketingGoal || "",
    });
    setEditSuperFieldValues(contact.superFieldValues || {});
    setIsEditModalOpen(true);
  };

  const handleSaveEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setIsSubmittingEdit(true);
    try {
      const payload = {
        name: editFormData.fullName.trim() || undefined,
        phone: editFormData.whatsappNumber.trim().replace(/\D/g, "") || undefined,
        email: editFormData.email.trim() || undefined,
        marketingBudget: editFormData.marketingBudget.trim() || undefined,
        marketingGoal: editFormData.marketingGoal.trim() || undefined,
        superFieldValues: editSuperFieldValues,
      };
      await api.patch(`/contacts/${editingContact.id}`, payload);
      toast.success("Contact updated successfully");
      setIsEditModalOpen(false);
      fetchContacts();
      fetchSegments();
    } catch (err) {
      console.error("Failed to update contact:", err);
      toast.error("Failed to update contact");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegmentData.name.trim()) return;
    setIsSubmittingSegment(true);
    try {
      const payload: any = {
        name: newSegmentData.name.trim(),
        description: newSegmentData.description.trim() || undefined,
      };
      if (newSegmentData.filterType === "tag" && newSegmentData.tag) {
        payload.tag = newSegmentData.tag;
      } else if (newSegmentData.filterType === "superField" && newSegmentData.superFieldKey) {
        payload.superFieldKey = newSegmentData.superFieldKey;
        if (newSegmentData.superFieldValue) {
          payload.superFieldValue = newSegmentData.superFieldValue;
        }
      }
      await api.post("/contacts/segments", payload);
      toast.success("Segment created successfully");
      setIsCreateSegmentModalOpen(false);
      setNewSegmentData({
        name: "",
        description: "",
        filterType: "all",
        tag: "",
        superFieldKey: "",
        superFieldValue: "",
      });
      fetchSegments();
    } catch (err) {
      console.error("Failed to create segment:", err);
      toast.error("Failed to create segment");
    } finally {
      setIsSubmittingSegment(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
          <Link
            href="/crm"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>CRM</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="text-primary font-medium">Contacts</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              CRM Contacts & Segments
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage real customer contacts, marketing budgets, custom tags, and audience segments.
            </p>
          </div>

          {/* Action Button Bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManageTagsModalOpen(true)}
              className="shrink-0 text-xs shadow-xs gap-1.5"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Tags</span>
            </Button>

            <Link href="/crm/super-fields">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs shadow-xs gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Super Fields</span>
              </Button>
            </Link>

            <Button
              variant={filterTag ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTag(filterTag ? null : "vip")}
              className="shrink-0 text-xs shadow-xs"
            >
              <Filter className="h-3.5 w-3.5 sm:mr-1.5" />
              <span>{filterTag ? `Filter: ${filterTag.toUpperCase()}` : "Filters"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="shrink-0 text-xs shadow-xs border-primary/30 text-primary hover:text-primary hover:bg-primary/5 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Contacts</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs shadow-xs gap-1.5"
              onClick={handleExportCsv}
              disabled={contactsList.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 text-xs shadow-sm font-medium gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Contact</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <stat.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-0.5 text-foreground">{stat.value}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === "contacts"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>All Contacts ({contactsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("segments")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === "segments"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Segments ({segmentsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Import History ({importHistoryList.length})</span>
          </button>
        </div>

        {activeTab === "contacts" && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Double-click table cells to quickly edit
          </span>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CONTACTS TABLE */}
      {/* ========================================================= */}
      {activeTab === "contacts" && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs animate-in fade-in duration-150">
          {/* Table toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 border-b bg-muted/20">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-9 text-sm bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows:</span>
                <Input
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  className="h-8 w-14 text-xs bg-background text-center"
                />
              </div>

              <span className="text-xs text-muted-foreground">
                Showing {filteredContacts.length} of {contactsList.length} contacts
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {selected.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="h-8 text-xs gap-1 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected ({selected.length})
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  fetchContacts();
                  setSearchQuery("");
                  setFilterTag(null);
                  setSelected([]);
                }}
                disabled={isLoading}
                title="Refresh contacts"
                className="h-8 w-8 text-muted-foreground"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3 w-10 text-left">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Action
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Created On
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Tags
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Full Name
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    WhatsApp Number
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Email
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Marketing Budget
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Marketing Goal
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-xs text-muted-foreground">Loading real CRM contacts...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/60">
                          <Users className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {searchQuery || filterTag ? "No matching contacts" : "No contacts in database"}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {searchQuery || filterTag
                            ? "Try adjusting your search query or removing active filters."
                            : "Your CRM currently contains no contacts. Add a single contact or bulk import via CSV to get started."}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          {searchQuery || filterTag ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchQuery("");
                                setFilterTag(null);
                              }}
                              className="text-xs"
                            >
                              Reset Filters
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsImportModalOpen(true)}
                                className="text-xs gap-1.5"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Import CSV
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setIsAddModalOpen(true)}
                                className="text-xs gap-1.5"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Contact
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selected.includes(contact.id)}
                          onCheckedChange={() => toggleOne(contact.id)}
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(contact)}
                            title="Edit contact & custom fields"
                            className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const data = `Contact: ${contact.fullName}\nWhatsApp: ${contact.whatsappNumber}\nEmail: ${contact.email || "N/A"}\nBudget: ${contact.marketingBudget}\nGoal: ${contact.marketingGoal}`;
                              navigator.clipboard.writeText(data);
                              toast.success("Contact copied to clipboard");
                            }}
                            title="Copy details"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(contact.id)}
                            title="Delete contact"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {contact.createdOn}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          {contact.tags.map((t, idx) => (
                            <TagBadge
                              key={idx}
                              name={t.label}
                              size="xs"
                              onRemove={() =>
                                handleUpdateContactTags(
                                  contact.id,
                                  contact.tags.filter((_, i) => i !== idx).map((x) => x.label)
                                )
                              }
                            />
                          ))}
                          <InlineContactTagPicker
                            assignedTagLabels={contact.tags.map((t) => t.label)}
                            onTagsChange={(newLabels) =>
                              handleUpdateContactTags(contact.id, newLabels)
                            }
                          />
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {editingCell?.id === contact.id &&
                        editingCell.field === "fullName" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()}
                              className="h-7 text-xs w-36"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600"
                              onClick={saveInlineEdit}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="group flex items-center gap-1.5 cursor-pointer"
                            onDoubleClick={() =>
                              startInlineEdit(contact.id, "fullName", contact.fullName)
                            }
                          >
                            <span className="font-medium text-foreground">
                              {contact.fullName}
                            </span>
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-xs">
                        {contact.whatsappNumber ? (
                          <a
                            href={`https://wa.me/${contact.whatsappNumber.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {contact.whatsappNumber}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">No WhatsApp</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {contact.email || "--"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {editingCell?.id === contact.id &&
                        editingCell.field === "marketingBudget" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()}
                              className="h-7 text-xs w-28"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600"
                              onClick={saveInlineEdit}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="group flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                            onDoubleClick={() =>
                              startInlineEdit(
                                contact.id,
                                "marketingBudget",
                                contact.marketingBudget
                              )
                            }
                          >
                            <span>{contact.marketingBudget || "$0"}</span>
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {editingCell?.id === contact.id &&
                        editingCell.field === "marketingGoal" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()}
                              className="h-7 text-xs w-36"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600"
                              onClick={saveInlineEdit}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="group flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                            onDoubleClick={() =>
                              startInlineEdit(
                                contact.id,
                                "marketingGoal",
                                contact.marketingGoal
                              )
                            }
                          >
                            <span>{contact.marketingGoal || "General Inquiries"}</span>
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 border-t bg-muted/10 text-xs text-muted-foreground">
            <span>Total Contacts: {contactsList.length}</span>
            <span>Real database records for current authenticated tenant</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SEGMENTS VIEW */}
      {/* ========================================================= */}
      {activeTab === "segments" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Target Audience Segments</h3>
              <p className="text-xs text-muted-foreground">
                Audience segments dynamically calculated from your CRM contacts, tags, and Super Fields.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSegments}
                disabled={isSegmentsLoading}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isSegmentsLoading && "animate-spin")} />
                <span>Refresh Segments</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateSegmentModalOpen(true)}
                className="gap-1.5 text-xs bg-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Segment</span>
              </Button>
            </div>
          </div>

          {isSegmentsLoading ? (
            <div className="p-12 text-center border rounded-xl bg-card">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading customer segments...</p>
            </div>
          ) : segmentsList.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground/60">
                <Layers className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No segments found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Segments are target audiences created from your contacts, tags, and custom Super Fields.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Contact
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsCreateSegmentModalOpen(true)}
                  className="text-xs gap-1.5 bg-primary"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Create Custom Segment
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segmentsList.map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-xl border bg-card p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">{segment.name}</h4>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        Active
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {segment.description || "Dynamic segment based on tenant CRM contacts"}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Contacts</span>
                      <span className="font-semibold text-foreground">
                        {segment.contactCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" className="w-full text-xs gap-1.5 bg-primary">
                        <Link href={`/crm/campaigns/create?audienceId=${segment.id}`}>
                          <Megaphone className="h-3.5 w-3.5" />
                          <span>Launch Campaign</span>
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteSegment(segment.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        title="Delete segment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: IMPORT HISTORY TABLE */}
      {/* ========================================================= */}
      {activeTab === "history" && (
        <div className="animate-in fade-in duration-150">
          <ImportHistoryTable
            historyList={importHistoryList}
            onRefresh={fetchImportHistory}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK CSV IMPORT CONTACTS MODAL */}
      {/* ========================================================= */}
      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingContacts={contactsList}
        onImportComplete={handleImportComplete}
      />

      {/* ========================================================= */}
      {/* ADD SINGLE CONTACT MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-foreground">Add New CRM Contact</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={newContact.fullName}
                  onChange={(e) =>
                    setNewContact({ ...newContact, fullName: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    placeholder="e.g. 919876543210"
                    value={newContact.whatsappNumber}
                    onChange={(e) =>
                      setNewContact({ ...newContact, whatsappNumber: e.target.value })
                    }
                    className="pl-8.5 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Marketing Budget
                  </label>
                  <Input
                    placeholder="e.g. $10,000"
                    value={newContact.marketingBudget}
                    onChange={(e) =>
                      setNewContact({ ...newContact, marketingBudget: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Marketing Goal
                  </label>
                  <Input
                    placeholder="e.g. Conversions"
                    value={newContact.marketingGoal}
                    onChange={(e) =>
                      setNewContact({ ...newContact, marketingGoal: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Super Fields */}
              {superFields.filter((f) => f.placement?.contactProfile !== false).length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Custom Super Fields</span>
                    <Badge variant="outline" className="text-[10px]">
                      Dynamic
                    </Badge>
                  </div>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {superFields
                      .filter((f) => f.placement?.contactProfile !== false)
                      .map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-xs font-medium text-muted-foreground">
                            {field.label}{" "}
                            {field.validation?.isRequired && (
                              <span className="text-rose-500 font-bold">*</span>
                            )}
                          </label>
                          {field.dataType === "DROPDOWN" ? (
                            <select
                              required={field.validation?.isRequired}
                              value={newContactSuperFields[field.key] || ""}
                              onChange={(e) =>
                                setNewContactSuperFields({
                                  ...newContactSuperFields,
                                  [field.key]: e.target.value,
                                })
                              }
                              className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                            >
                              <option value="">
                                {field.placeholder || "Select an option..."}
                              </option>
                              {field.options?.map((opt: any) => (
                                <option key={opt.id} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : field.dataType === "BOOLEAN" ? (
                            <div className="flex items-center gap-2 pt-0.5">
                              <Checkbox
                                id={`sf-${field.key}`}
                                checked={Boolean(newContactSuperFields[field.key])}
                                onCheckedChange={(checked) =>
                                  setNewContactSuperFields({
                                    ...newContactSuperFields,
                                    [field.key]: Boolean(checked),
                                  })
                                }
                              />
                              <label
                                htmlFor={`sf-${field.key}`}
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                {field.placeholder || "Yes / Active"}
                              </label>
                            </div>
                          ) : field.dataType === "DATE" ? (
                            <Input
                              type="date"
                              required={field.validation?.isRequired}
                              value={newContactSuperFields[field.key] || ""}
                              onChange={(e) =>
                                setNewContactSuperFields({
                                  ...newContactSuperFields,
                                  [field.key]: e.target.value,
                                })
                              }
                              className="h-8 text-xs"
                            />
                          ) : field.dataType === "NUMERIC" ||
                            field.dataType === "DECIMAL" ||
                            field.dataType === "AMOUNT" ? (
                            <div className="relative">
                              {field.dataType === "AMOUNT" && (
                                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">
                                  {field.currencySymbol || "₹"}
                                </span>
                              )}
                              <Input
                                type="number"
                                required={field.validation?.isRequired}
                                placeholder={field.placeholder || "0"}
                                value={newContactSuperFields[field.key] || ""}
                                onChange={(e) =>
                                  setNewContactSuperFields({
                                    ...newContactSuperFields,
                                    [field.key]: e.target.value,
                                  })
                                }
                                className={cn(
                                  "h-8 text-xs",
                                  field.dataType === "AMOUNT" && "pl-6"
                                )}
                              />
                            </div>
                          ) : field.dataType === "TEXTAREA" ? (
                            <textarea
                              rows={2}
                              required={field.validation?.isRequired}
                              placeholder={field.placeholder || ""}
                              value={newContactSuperFields[field.key] || ""}
                              onChange={(e) =>
                                setNewContactSuperFields({
                                  ...newContactSuperFields,
                                  [field.key]: e.target.value,
                                })
                              }
                              className="w-full rounded-md border bg-background p-2 text-xs resize-none"
                            />
                          ) : (
                            <Input
                              type={field.dataType === "EMAIL" ? "email" : "text"}
                              required={field.validation?.isRequired}
                              placeholder={field.placeholder || ""}
                              value={newContactSuperFields[field.key] || ""}
                              onChange={(e) =>
                                setNewContactSuperFields({
                                  ...newContactSuperFields,
                                  [field.key]: e.target.value,
                                })
                              }
                              className="h-8 text-xs"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="vip-checkbox"
                  checked={newContact.isVip}
                  onCheckedChange={(checked) =>
                    setNewContact({ ...newContact, isVip: Boolean(checked) })
                  }
                />
                <label
                  htmlFor="vip-checkbox"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Mark as VIP Contact
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingContact ? "Saving..." : "Save Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT CONTACT & SUPER FIELDS MODAL */}
      {/* ========================================================= */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Edit Contact & Super Fields</h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContact} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <Input
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    WhatsApp Number
                  </label>
                  <Input
                    value={editFormData.whatsappNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Marketing Budget
                  </label>
                  <Input
                    value={editFormData.marketingBudget}
                    onChange={(e) => setEditFormData({ ...editFormData, marketingBudget: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Marketing Goal
                  </label>
                  <Input
                    value={editFormData.marketingGoal}
                    onChange={(e) => setEditFormData({ ...editFormData, marketingGoal: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Super Fields in Edit Modal */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Dynamic Super Fields</span>
                  <Badge variant="outline" className="text-[10px]">
                    {superFields.length} Defined
                  </Badge>
                </div>

                {superFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No custom Super Fields defined. Configure custom fields in CRM directory.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {superFields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-medium text-muted-foreground">
                          {field.label}{" "}
                          {field.validation?.isRequired && (
                            <span className="text-rose-500 font-bold">*</span>
                          )}
                        </label>
                        {field.dataType === "DROPDOWN" ? (
                          <select
                            value={editSuperFieldValues[field.key] || ""}
                            onChange={(e) =>
                              setEditSuperFieldValues({
                                ...editSuperFieldValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className="w-full h-8 px-2.5 rounded-md border bg-background text-xs font-medium"
                          >
                            <option value="">{field.placeholder || "Select an option..."}</option>
                            {field.options?.map((opt: any) => (
                              <option key={opt.id || opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : field.dataType === "BOOLEAN" ? (
                          <div className="flex items-center gap-2 pt-0.5">
                            <Checkbox
                              id={`edit-sf-${field.key}`}
                              checked={Boolean(editSuperFieldValues[field.key])}
                              onCheckedChange={(checked) =>
                                setEditSuperFieldValues({
                                  ...editSuperFieldValues,
                                  [field.key]: Boolean(checked),
                                })
                              }
                            />
                            <label
                              htmlFor={`edit-sf-${field.key}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              {field.placeholder || "Yes / Active"}
                            </label>
                          </div>
                        ) : field.dataType === "DATE" ? (
                          <Input
                            type="date"
                            value={editSuperFieldValues[field.key] || ""}
                            onChange={(e) =>
                              setEditSuperFieldValues({
                                ...editSuperFieldValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        ) : field.dataType === "DATETIME" ? (
                          <Input
                            type="datetime-local"
                            value={editSuperFieldValues[field.key] || ""}
                            onChange={(e) =>
                              setEditSuperFieldValues({
                                ...editSuperFieldValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        ) : field.dataType === "NUMERIC" ||
                          field.dataType === "DECIMAL" ||
                          field.dataType === "AMOUNT" ? (
                          <div className="relative">
                            {field.dataType === "AMOUNT" && (
                              <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">
                                {field.currencySymbol || "₹"}
                              </span>
                            )}
                            <Input
                              type="number"
                              placeholder={field.placeholder || "0"}
                              value={editSuperFieldValues[field.key] || ""}
                              onChange={(e) =>
                                setEditSuperFieldValues({
                                  ...editSuperFieldValues,
                                  [field.key]: e.target.value,
                                })
                              }
                              className={cn(
                                "h-8 text-xs",
                                field.dataType === "AMOUNT" && "pl-6"
                              )}
                            />
                          </div>
                        ) : field.dataType === "TEXTAREA" ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder || ""}
                            value={editSuperFieldValues[field.key] || ""}
                            onChange={(e) =>
                              setEditSuperFieldValues({
                                ...editSuperFieldValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className="w-full rounded-md border bg-background p-2 text-xs resize-none"
                          />
                        ) : (
                          <Input
                            type={field.dataType === "EMAIL" ? "email" : "text"}
                            placeholder={field.placeholder || ""}
                            value={editSuperFieldValues[field.key] || ""}
                            onChange={(e) =>
                              setEditSuperFieldValues({
                                ...editSuperFieldValues,
                                [field.key]: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingEdit ? "Saving..." : "Update Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE AUDIENCE SEGMENT MODAL */}
      {/* ========================================================= */}
      {isCreateSegmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Create Audience Segment</h2>
              </div>
              <button
                onClick={() => setIsCreateSegmentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSegment} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Segment Name *
                </label>
                <Input
                  required
                  placeholder="e.g. High Budget Enterprises"
                  value={newSegmentData.name}
                  onChange={(e) => setNewSegmentData({ ...newSegmentData, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <Input
                  placeholder="e.g. Contacts with budget over $10,000"
                  value={newSegmentData.description}
                  onChange={(e) => setNewSegmentData({ ...newSegmentData, description: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Audience Filter Source
                </label>
                <select
                  value={newSegmentData.filterType}
                  onChange={(e) => setNewSegmentData({ ...newSegmentData, filterType: e.target.value as any })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs font-medium"
                >
                  <option value="all">All Tenant Contacts</option>
                  <option value="tag">Filter by Tag</option>
                  <option value="superField">Filter by Super Field (Custom Field)</option>
                </select>
              </div>

              {newSegmentData.filterType === "tag" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Tag Name
                  </label>
                  <Input
                    placeholder="e.g. VIP or Hot Lead"
                    value={newSegmentData.tag}
                    onChange={(e) => setNewSegmentData({ ...newSegmentData, tag: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {newSegmentData.filterType === "superField" && (
                <div className="space-y-3 p-3 bg-muted/20 border rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Select Super Field *
                    </label>
                    <select
                      required
                      value={newSegmentData.superFieldKey}
                      onChange={(e) => setNewSegmentData({ ...newSegmentData, superFieldKey: e.target.value })}
                      className="w-full h-8 rounded-md border bg-background px-2.5 text-xs font-medium"
                    >
                      <option value="">Select custom field...</option>
                      {superFields.map((f) => (
                        <option key={f.id} value={f.key}>
                          {f.label} ({f.dataType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Matching Value (Optional, leave blank for any populated value)
                    </label>
                    <Input
                      placeholder="e.g. Enterprise Prospect"
                      value={newSegmentData.superFieldValue}
                      onChange={(e) => setNewSegmentData({ ...newSegmentData, superFieldValue: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSegmentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingSegment}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingSegment ? "Creating..." : "Create Segment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Tags Taxonomy Modal */}
      <ManageTagsModal
        isOpen={isManageTagsModalOpen}
        onClose={() => setIsManageTagsModalOpen(false)}
      />
    </div>
  );
}
