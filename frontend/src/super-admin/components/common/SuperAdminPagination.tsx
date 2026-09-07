"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SuperAdminPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

export const SuperAdminPagination: React.FC<SuperAdminPaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  hasNext,
  hasPrevious,
  onPageChange,
  onLimitChange,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100, 200],
  className = "",
}) => {
  if (total === 0) {
    return null;
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground ${className}`}
    >
      {/* Left: Total Records Info & Page Size Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          Showing <span className="font-semibold text-foreground font-mono">{startRecord}</span> to{" "}
          <span className="font-semibold text-foreground font-mono">{endRecord}</span> of{" "}
          <span className="font-semibold text-foreground font-mono">{total}</span> records
        </div>

        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                if (!isNaN(newLimit)) {
                  onLimitChange(newLimit);
                }
              }}
              disabled={loading}
              className="h-7 rounded-md border border-input bg-background px-2 py-0 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page info & Previous / Next navigation */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="font-mono text-xs text-muted-foreground mr-1">
          Page <strong className="text-foreground">{page}</strong> of{" "}
          <strong className="text-foreground">{safeTotalPages}</strong>
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious || page <= 1 || loading}
          className="h-8 px-2.5 text-xs gap-1 cursor-pointer disabled:cursor-not-allowed border-border"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || page >= safeTotalPages || loading}
          className="h-8 px-2.5 text-xs gap-1 cursor-pointer disabled:cursor-not-allowed border-border"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
