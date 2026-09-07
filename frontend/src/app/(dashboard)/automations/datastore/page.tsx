"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Plus,
  Search,
  X,
  Upload,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  HardDrive,
  Layers,
  Zap,
  Clock,
  KeyRound,
  FileSpreadsheet,
  FileJson,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Filter,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { downloadCsv, escapeCsvField } from "@/components/crm/csv-utils";

// ---------- Interfaces ----------
export interface DataStoreItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  keyType: string;
  ttlSeconds: number | null;
  ttlLabel: string;
  recordLimit: number;
  recordsCount: number;
  sizeBytes: number;
  linkedWorkflowsCount: number;
  lastModified: string;
}

export interface DataStoreRecord {
  id: string;
  key: string;
  value: Record<string, any>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Storage Persistence & Helpers ----------
const DATASTORE_STORAGE_KEY = "appnix_datastores";
const DATASTORE_RECORDS_KEY = "appnix_datastore_records";

const LEGACY_DUMMY_IDS = new Set(["ds_1", "ds_2", "ds_3", "ds_4"]);
const LEGACY_DUMMY_SLUGS = new Set([
  "cart_session_store",
  "otp_verification_cache",
  "lead_routing_cache",
  "user_preferences_store",
]);

function getStoredDataStores(): DataStoreItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DATASTORE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (s) => s && !LEGACY_DUMMY_IDS.has(s.id) && !LEGACY_DUMMY_SLUGS.has(s.slug)
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch (err) {
    console.error("Failed to load datastores from storage:", err);
    return [];
  }
}

function getStoredRecords(): Record<string, DataStoreRecord[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DATASTORE_RECORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      delete parsed.ds_1;
      delete parsed.ds_2;
      delete parsed.ds_3;
      delete parsed.ds_4;
      return parsed;
    }
    return {};
  } catch (err) {
    console.error("Failed to load datastore records from storage:", err);
    return {};
  }
}

export default function DataStorePage() {
  // State
  const [stores, setStores] = useState<DataStoreItem[]>(() => getStoredDataStores());
  const [recordsMap, setRecordsMap] = useState<Record<string, DataStoreRecord[]>>(() => getStoredRecords());
  const [selectedStore, setSelectedStore] = useState<DataStoreItem | null>(null);

  // Search & Filters
  const [searchStoreQuery, setSearchStoreQuery] = useState("");
  const [searchRecordQuery, setSearchRecordQuery] = useState("");

  // Modals
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataStoreRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Store Form State
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreSlug, setNewStoreSlug] = useState("");
  const [newStoreDesc, setNewStoreDesc] = useState("");
  const [newStoreKeyType, setNewStoreKeyType] = useState("Phone Number");
  const [newStoreTtl, setNewStoreTtl] = useState<string>("86400"); // 24 hours
  const [newStoreLimit, setNewStoreLimit] = useState<string>("50000");

  // Add/Edit Record Form State
  const [recordKeyInput, setRecordKeyInput] = useState("");
  const [recordJsonInput, setRecordJsonInput] = useState(`{\n  "status": "active",\n  "count": 1\n}`);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Filtered Stores
  const filteredStores = useMemo(() => {
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(searchStoreQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchStoreQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchStoreQuery.toLowerCase())
    );
  }, [stores, searchStoreQuery]);

  // Filtered Records for Active Store
  const currentRecords = useMemo(() => {
    if (!selectedStore) return [];
    const list = recordsMap[selectedStore.id] || [];
    if (!searchRecordQuery.trim()) return list;

    const q = searchRecordQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        JSON.stringify(r.value).toLowerCase().includes(q)
    );
  }, [selectedStore, recordsMap, searchRecordQuery]);

  // Overall Statistics
  const totalStoresCount = stores.length;
  const totalRecordsCount = stores.reduce((acc, s) => acc + s.recordsCount, 0);
  const totalBytes = stores.reduce((acc, s) => acc + s.sizeBytes, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const activeWorkflowsCount = stores.reduce((acc, s) => acc + s.linkedWorkflowsCount, 0);

  // Handle Slugify on Name change
  const handleNameChange = (val: string) => {
    setNewStoreName(val);
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    setNewStoreSlug(slug);
  };

  // Create Data Store
  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreSlug.trim()) return;

    const ttlNum = newStoreTtl === "never" ? null : parseInt(newStoreTtl, 10);
    const ttlLabel =
      newStoreTtl === "never"
        ? "Never Expire"
        : newStoreTtl === "600"
        ? "10 Mins"
        : newStoreTtl === "3600"
        ? "1 Hour"
        : newStoreTtl === "86400"
        ? "24 Hours"
        : newStoreTtl === "604800"
        ? "7 Days"
        : "30 Days";

    const newStoreObj: DataStoreItem = {
      id: `ds_${Date.now()}`,
      name: newStoreName.trim(),
      slug: newStoreSlug.trim(),
      description: newStoreDesc.trim() || "Custom automation key-value table store.",
      keyType: newStoreKeyType,
      ttlSeconds: ttlNum,
      ttlLabel,
      recordLimit: parseInt(newStoreLimit, 10) || 50000,
      recordsCount: 0,
      sizeBytes: 0,
      linkedWorkflowsCount: 0,
      lastModified: "Just now",
    };

    const updatedStores = [newStoreObj, ...stores];
    const updatedRecords = { ...recordsMap, [newStoreObj.id]: [] };
    setStores(updatedStores);
    setRecordsMap(updatedRecords);
    if (typeof window !== "undefined") {
      localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(updatedStores));
      localStorage.setItem(DATASTORE_RECORDS_KEY, JSON.stringify(updatedRecords));
    }

    // Reset and close
    setNewStoreName("");
    setNewStoreSlug("");
    setNewStoreDesc("");
    setIsCreateStoreModalOpen(false);
  };

  // Delete Data Store
  const handleDeleteStore = (storeId: string) => {
    if (confirm("Are you sure you want to delete this Data Store and all its stored records?")) {
      const updatedStores = stores.filter((s) => s.id !== storeId);
      const updatedRecords = { ...recordsMap };
      delete updatedRecords[storeId];
      setStores(updatedStores);
      setRecordsMap(updatedRecords);
      if (typeof window !== "undefined") {
        localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(updatedStores));
        localStorage.setItem(DATASTORE_RECORDS_KEY, JSON.stringify(updatedRecords));
      }
      if (selectedStore?.id === storeId) {
        setSelectedStore(null);
      }
    }
  };

  // Clear Store Records
  const handleClearStore = (storeId: string) => {
    if (confirm("Are you sure you want to clear all records in this Data Store?")) {
      const updatedRecords = { ...recordsMap, [storeId]: [] };
      const updatedStores = stores.map((s) =>
        s.id === storeId ? { ...s, recordsCount: 0, sizeBytes: 0, lastModified: "Just now" } : s
      );
      setRecordsMap(updatedRecords);
      setStores(updatedStores);
      if (typeof window !== "undefined") {
        localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(updatedStores));
        localStorage.setItem(DATASTORE_RECORDS_KEY, JSON.stringify(updatedRecords));
      }
    }
  };

  // Open Add/Edit Record Modal
  const handleOpenAddRecord = (record?: DataStoreRecord) => {
    if (record) {
      setEditingRecord(record);
      setRecordKeyInput(record.key);
      setRecordJsonInput(JSON.stringify(record.value, null, 2));
    } else {
      setEditingRecord(null);
      setRecordKeyInput("");
      setRecordJsonInput(`{\n  "status": "active",\n  "updatedAt": "${new Date().toISOString()}"\n}`);
    }
    setJsonError(null);
    setIsAddRecordModalOpen(true);
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !recordKeyInput.trim()) return;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(recordJsonInput);
    } catch (err: any) {
      setJsonError("Invalid JSON syntax. Please check brackets and quotes.");
      return;
    }

    const storeId = selectedStore.id;
    const storeRecords = recordsMap[storeId] || [];
    let updatedStores: DataStoreItem[];
    let updatedRecords: Record<string, DataStoreRecord[]>;

    if (editingRecord) {
      // Update
      const updatedList = storeRecords.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              key: recordKeyInput.trim(),
              value: parsedJson,
              updatedAt: "Just now",
            }
          : r
      );
      updatedRecords = { ...recordsMap, [storeId]: updatedList };
      updatedStores = stores;
    } else {
      // Insert
      const newRec: DataStoreRecord = {
        id: `rec_${Date.now()}`,
        key: recordKeyInput.trim(),
        value: parsedJson,
        expiresAt: selectedStore.ttlLabel === "Never Expire" ? "Never" : `Expires in ${selectedStore.ttlLabel}`,
        createdAt: "Just now",
        updatedAt: "Just now",
      };
      updatedRecords = { ...recordsMap, [storeId]: [newRec, ...storeRecords] };
      updatedStores = stores.map((s) =>
        s.id === storeId ? { ...s, recordsCount: s.recordsCount + 1, sizeBytes: s.sizeBytes + 350, lastModified: "Just now" } : s
      );
    }

    setRecordsMap(updatedRecords);
    setStores(updatedStores);
    if (typeof window !== "undefined") {
      localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(updatedStores));
      localStorage.setItem(DATASTORE_RECORDS_KEY, JSON.stringify(updatedRecords));
    }

    setIsAddRecordModalOpen(false);
  };

  // Delete Single Record
  const handleDeleteRecord = (recordId: string) => {
    if (!selectedStore) return;
    const storeId = selectedStore.id;
    const updated = (recordsMap[storeId] || []).filter((r) => r.id !== recordId);
    const updatedRecords = { ...recordsMap, [storeId]: updated };
    const updatedStores = stores.map((s) =>
      s.id === storeId ? { ...s, recordsCount: Math.max(0, s.recordsCount - 1), sizeBytes: Math.max(0, s.sizeBytes - 350) } : s
    );
    setRecordsMap(updatedRecords);
    setStores(updatedStores);
    if (typeof window !== "undefined") {
      localStorage.setItem(DATASTORE_STORAGE_KEY, JSON.stringify(updatedStores));
      localStorage.setItem(DATASTORE_RECORDS_KEY, JSON.stringify(updatedRecords));
    }
  };

  // Export Records to CSV
  const handleExportCsv = () => {
    if (!selectedStore) return;
    const headers = ["Record ID", "Primary Key", "JSON Value Payload", "Expiration Status", "Created At", "Updated At"];
    const rows = currentRecords.map((r) => [
      r.id,
      r.key,
      JSON.stringify(r.value),
      r.expiresAt || "Never",
      r.createdAt,
      r.updatedAt,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map(escapeCsvField).join(","))].join("\r\n");
    downloadCsv(`datastore_${selectedStore.slug}_${Date.now()}.csv`, csvContent);
  };

  // Copy Key to Clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumbs */}
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/automations/workflow"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Automations</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          {selectedStore ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Data Store
              </button>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="text-primary font-semibold">{selectedStore.name}</span>
            </>
          ) : (
            <span className="text-primary font-semibold">Data Store</span>
          )}
        </div>

        {/* Title Bar & Quick Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {selectedStore ? selectedStore.name : "Data Store"}
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                {selectedStore ? `Slug: ${selectedStore.slug}` : "KV Store & Internal Tables"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              {selectedStore
                ? selectedStore.description
                : "Manage and view your custom data stores, internal tables, and persistent key-value records used in automated workflows."}
            </p>
          </div>

          {/* Action Buttons: Create Data Store + Import */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {!selectedStore ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-xs h-9 font-medium gap-1.5 shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import Data</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsCreateStoreModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Create Data Store</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStore(null)}
                  className="text-xs h-9 font-medium gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Data Stores</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="text-xs h-9 font-medium gap-1.5 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleOpenAddRecord()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Record</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Overview Summary Cards (4 Cards Grid) */}
      {!selectedStore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Stores */}
          <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                Active Tables
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium">Total Data Stores</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {totalStoresCount} Stores
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
              <span>Dynamic JSON Key-Value Collections</span>
            </div>
          </div>

          {/* Card 2: Total Records */}
          <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold">
                Persisted Items
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium">Total Stored Records</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {totalRecordsCount.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
              <span>Across all workflow collections</span>
            </div>
          </div>

          {/* Card 3: Storage Quota */}
          <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <HardDrive className="h-5 w-5" />
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px] font-semibold">
                {totalMB} MB / 100 MB
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium">Storage Quota Used</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {totalMB} MB
            </p>
            <div className="mt-2 pt-2 border-t space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, (Number(totalMB) / 100) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Active Workflows Connected */}
          <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                Live I/O
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-medium">Connected Automations</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {activeWorkflowsCount} Workflows
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
              <span>Read / Write triggers in real-time</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW A: STORES DIRECTORY LIST                             */}
      {/* ========================================================= */}
      {!selectedStore && (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
          {/* Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-muted/10 gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stores by name, slug..."
                  value={searchStoreQuery}
                  onChange={(e) => setSearchStoreQuery(e.target.value)}
                  className="pl-8.5 h-9 text-xs bg-background"
                />
                {searchStoreQuery && (
                  <button
                    onClick={() => setSearchStoreQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {filteredStores.length} of {stores.length} data stores
              </span>
            </div>
          </div>

          {/* Scrollable Stores Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    Store Name & Slug
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    Primary Key Type
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Total Records
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Storage Size
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    Retention / TTL
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Workflows
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 border flex items-center justify-center text-muted-foreground/60">
                          <Database className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-foreground text-sm">No Data Stores Created Yet</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Create key-value data stores or internal tables to persist session data, customer tags, and counters across automated workflows.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setIsCreateStoreModalOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold gap-1.5 shadow-sm mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Data Store</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      No Data Stores match &quot;{searchStoreQuery}&quot;. Try resetting your search.
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((store) => (
                    <tr key={store.id} className="hover:bg-muted/20 transition-colors">
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedStore(store)}
                              className="font-bold text-foreground hover:text-primary transition-colors text-left"
                            >
                              {store.name}
                            </button>
                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span>slug: {store.slug}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Key Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-medium bg-muted/20 gap-1">
                          <KeyRound className="h-3 w-3 text-muted-foreground" />
                          <span>{store.keyType}</span>
                        </Badge>
                      </td>

                      {/* Total Records */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                        {store.recordsCount.toLocaleString("en-IN")}
                      </td>

                      {/* Storage Size */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {(store.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </td>

                      {/* TTL */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold",
                            store.ttlSeconds
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          )}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{store.ttlLabel}</span>
                        </Badge>
                      </td>

                      {/* Workflows Count */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {store.linkedWorkflowsCount} Workflows
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => setSelectedStore(store)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 shadow-2xs"
                          >
                            <FolderOpen className="h-3 w-3" />
                            <span>Open Records</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleClearStore(store.id)}
                            title="Clear records"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                          >
                            Clear
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStore(store.id)}
                            title="Delete store"
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: SPECIFIC STORE RECORDS VIEWER                      */}
      {/* ========================================================= */}
      {selectedStore && (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
          {/* Records Search & Actions Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-muted/10 gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search by ${selectedStore.keyType} or payload...`}
                  value={searchRecordQuery}
                  onChange={(e) => setSearchRecordQuery(e.target.value)}
                  className="pl-8.5 h-9 text-xs bg-background"
                />
                {searchRecordQuery && (
                  <button
                    onClick={() => setSearchRecordQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {currentRecords.length} stored records in <strong>{selectedStore.name}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearStore(selectedStore.id)}
                className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </Button>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    Primary Lookup Key
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    JSON Structured Payload
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                    TTL Status
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Last Updated
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs space-y-2">
                      <Layers className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="font-semibold text-foreground">No Records Found</p>
                      <p className="text-[11px] text-muted-foreground">
                        This data store is currently empty. Click &quot;+ Add Record&quot; to insert an item manually or emit from a workflow.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                      {/* Key */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-muted/40 px-2 py-0.5 rounded border border-border">
                            {record.key}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(record.key)}
                            title="Copy key"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedKey === record.key ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* JSON Payload */}
                      <td className="py-3.5 px-4">
                        <div className="rounded-lg bg-muted/40 border p-2 font-mono text-[11px] max-w-md max-h-24 overflow-y-auto text-slate-800 dark:text-slate-200">
                          <pre className="whitespace-pre-wrap leading-tight">
                            {JSON.stringify(record.value, null, 2)}
                          </pre>
                        </div>
                      </td>

                      {/* TTL */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-medium bg-muted/20">
                          {record.expiresAt || "Permanent"}
                        </Badge>
                      </td>

                      {/* Updated */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {record.updatedAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddRecord(record)}
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE DATA STORE MODAL                           */}
      {/* ========================================================= */}
      {isCreateStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Create New Data Store</h3>
                  <p className="text-xs text-muted-foreground">Define table schema and time-to-live settings</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateStoreModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="ds-name" className="text-xs font-bold text-foreground">
                  Data Store Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="ds-name"
                  placeholder="e.g. Session Store"
                  value={newStoreName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-xs bg-background"
                  autoFocus
                />
              </div>

              {/* Slug / Identifier */}
              <div className="space-y-1.5">
                <Label htmlFor="ds-slug" className="text-xs font-bold text-foreground">
                  System Identifier / Slug <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="ds-slug"
                  placeholder="e.g. session_store"
                  value={newStoreSlug}
                  onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="h-9 font-mono text-xs bg-background"
                />
                <span className="text-[10px] text-muted-foreground">Used in chatbot and webhook JSON nodes</span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ds-desc" className="text-xs font-bold text-foreground">
                  Description (Optional)
                </Label>
                <Input
                  id="ds-desc"
                  placeholder="e.g. Transient session state and workflow cache"
                  value={newStoreDesc}
                  onChange={(e) => setNewStoreDesc(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>

              {/* Key Type & Retention Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Primary Key Type</Label>
                  <select
                    value={newStoreKeyType}
                    onChange={(e) => setNewStoreKeyType(e.target.value)}
                    className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs text-foreground cursor-pointer"
                  >
                    <option value="Phone Number">Phone Number</option>
                    <option value="Email / Lead ID">Email / Lead ID</option>
                    <option value="User UUID">User UUID</option>
                    <option value="Custom String Key">Custom String Key</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Data Retention / TTL</Label>
                  <select
                    value={newStoreTtl}
                    onChange={(e) => setNewStoreTtl(e.target.value)}
                    className="w-full h-9 rounded-lg border bg-background px-2.5 text-xs text-foreground cursor-pointer"
                  >
                    <option value="never">Never Expire</option>
                    <option value="600">10 Minutes</option>
                    <option value="3600">1 Hour</option>
                    <option value="86400">24 Hours</option>
                    <option value="604800">7 Days</option>
                    <option value="2592000">30 Days</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateStoreModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newStoreName.trim() || !newStoreSlug.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-sm"
                >
                  Create Store
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD / EDIT RECORD MODAL                           */}
      {/* ========================================================= */}
      {isAddRecordModalOpen && selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingRecord ? "Edit Record" : "Add Record to Store"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedStore.name} ({selectedStore.slug})</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddRecordModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              {jsonError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs font-medium">
                  {jsonError}
                </div>
              )}

              {/* Primary Key */}
              <div className="space-y-1.5">
                <Label htmlFor="rec-key" className="text-xs font-bold text-foreground">
                  Primary Lookup Key ({selectedStore.keyType}) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="rec-key"
                  placeholder={selectedStore.keyType === "Phone Number" ? "+15550100" : "usr_1001"}
                  value={recordKeyInput}
                  onChange={(e) => setRecordKeyInput(e.target.value)}
                  className="h-9 font-mono text-xs bg-background"
                  autoFocus
                />
              </div>

              {/* JSON Value Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rec-json" className="text-xs font-bold text-foreground">
                    JSON Structured Payload <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Valid JSON object</span>
                </div>
                <Textarea
                  id="rec-json"
                  rows={6}
                  value={recordJsonInput}
                  onChange={(e) => {
                    setRecordJsonInput(e.target.value);
                    setJsonError(null);
                  }}
                  className="font-mono text-xs bg-background leading-relaxed"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddRecordModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!recordKeyInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-sm"
                >
                  Save Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: IMPORT DATA MODAL                                */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Import Store Records</h3>
                  <p className="text-xs text-muted-foreground">Upload CSV or JSON key-value dump</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImportModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-2 hover:bg-muted/20 transition-colors cursor-pointer">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-xs font-bold text-foreground">Drag and drop file here or click to browse</p>
              <p className="text-[10px] text-muted-foreground">Supports .CSV, .JSON up to 10MB</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
                className="text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}