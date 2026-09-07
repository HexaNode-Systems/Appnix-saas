"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  SuperField,
  SuperFieldFilterOptions,
  SuperFieldFormPayload,
  SuperFieldMetrics,
} from "@/types/super-field";
import { api } from "@/lib/api/axios";
import { toast } from "sonner";

export function useSuperFields() {
  const [fields, setFields] = useState<SuperField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Filter state
  const [filterOptions, setFilterOptions] = useState<SuperFieldFilterOptions>({
    searchQuery: "",
    dataType: "ALL",
    placementFilter: "ALL",
    requiredFilter: "ALL",
    statusFilter: "ALL",
  });

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterOptions.searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [filterOptions.searchQuery]);

  // Fetch real fields from backend API
  const fetchFields = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear legacy mock localStorage if present
      if (typeof window !== "undefined") {
        localStorage.removeItem("appnix_super_fields_v2");
      }

      const res = await api.get("/crm/super-fields");
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setFields(list);
    } catch (err) {
      console.error("Failed to load super fields from server:", err);
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Filtered & memoized records
  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      // Data type filter
      if (filterOptions.dataType !== "ALL" && field.dataType !== filterOptions.dataType) {
        return false;
      }

      // Placement filter
      if (filterOptions.placementFilter === "PROFILE" && !field.placement?.contactProfile) return false;
      if (filterOptions.placementFilter === "INBOX_LABEL" && !field.placement?.chatInboxLabel) return false;
      if (filterOptions.placementFilter === "INBOX_SIDEBAR" && !field.placement?.chatInboxSidebar) return false;

      // Required filter
      if (filterOptions.requiredFilter === "REQUIRED" && !field.validation?.isRequired) return false;
      if (filterOptions.requiredFilter === "OPTIONAL" && field.validation?.isRequired) return false;

      // Status filter
      if (filterOptions.statusFilter !== "ALL" && field.status !== filterOptions.statusFilter) return false;

      // Debounced search query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matchLabel = field.label?.toLowerCase().includes(q);
        const matchKey = field.key?.toLowerCase().includes(q);
        const matchDesc = field.description?.toLowerCase().includes(q);
        if (!matchLabel && !matchKey && !matchDesc) return false;
      }

      return true;
    });
  }, [
    fields,
    filterOptions.dataType,
    filterOptions.placementFilter,
    filterOptions.requiredFilter,
    filterOptions.statusFilter,
    debouncedSearch,
  ]);

  // Metrics computation from real database records
  const metrics: SuperFieldMetrics = useMemo(() => {
    const total = fields.length;
    const active = fields.filter((f) => f.status === "ACTIVE").length;
    const required = fields.filter((f) => f.validation?.isRequired).length;
    const inboxLabels = fields.filter((f) => f.placement?.chatInboxLabel).length;
    return { total, active, required, inboxLabels };
  }, [fields]);

  // Create Field via backend API
  const createField = useCallback(
    async (payload: SuperFieldFormPayload): Promise<SuperField> => {
      setIsMutating(true);
      try {
        const res = await api.post("/crm/super-fields", payload);
        const created = res.data?.data || res.data;
        toast.success(`Super Field "${created.label || payload.label}" created successfully`);
        await fetchFields();
        return created;
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to create Super Field";
        toast.error(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchFields]
  );

  // Update Field via backend API
  const updateField = useCallback(
    async (payload: SuperFieldFormPayload): Promise<SuperField> => {
      if (!payload.id) throw new Error("Field ID is required for update");
      setIsMutating(true);
      try {
        const res = await api.put(`/crm/super-fields/${payload.id}`, payload);
        const updated = res.data?.data || res.data;
        toast.success(`Super Field "${updated.label || payload.label}" updated successfully`);
        await fetchFields();
        return updated;
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to update Super Field";
        toast.error(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchFields]
  );

  // Duplicate Field via backend API
  const duplicateField = useCallback(
    async (field: SuperField): Promise<SuperField> => {
      setIsMutating(true);
      try {
        const res = await api.post(`/crm/super-fields/${field.id}/duplicate`);
        const duplicated = res.data?.data || res.data;
        toast.success(`Field "${field.label}" duplicated successfully`);
        await fetchFields();
        return duplicated;
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to duplicate Super Field";
        toast.error(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchFields]
  );

  // Archive Field via backend API
  const archiveField = useCallback(
    async (fieldId: string): Promise<void> => {
      setIsMutating(true);
      try {
        await api.patch(`/crm/super-fields/${fieldId}/archive`);
        toast.success("Super Field archived");
        await fetchFields();
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to archive Super Field";
        toast.error(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchFields]
  );

  // Delete Field via backend API
  const deleteField = useCallback(
    async (fieldId: string): Promise<void> => {
      setIsMutating(true);
      try {
        await api.delete(`/crm/super-fields/${fieldId}`);
        toast.success("Super Field deleted permanently");
        await fetchFields();
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to delete Super Field";
        toast.error(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchFields]
  );

  return {
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
    refreshFields: fetchFields,
  };
}
