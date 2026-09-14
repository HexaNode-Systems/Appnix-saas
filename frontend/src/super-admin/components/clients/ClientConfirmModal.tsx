"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, AlertCircle } from "lucide-react";

export interface ConfirmDetailItem {
  label: string;
  value: React.ReactNode;
}

interface ClientConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  details?: ConfirmDetailItem[];
  confirmText?: string;
  confirmVariant?: "default" | "destructive";
  isSubmitting?: boolean;
  error?: string | null;
}

export function ClientConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details = [],
  confirmText = "Confirm",
  confirmVariant = "default",
  isSubmitting = false,
  error = null,
}: ClientConfirmModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md w-[95vw] sm:max-w-md rounded-2xl p-6 bg-card border shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {details.length > 0 && (
          <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-2 max-h-60 overflow-y-auto">
            {details.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
              >
                <span className="text-muted-foreground font-medium">{item.label}</span>
                <span className="font-semibold text-foreground text-right">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-end gap-2 pt-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-xs h-9 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={
              confirmVariant === "destructive"
                ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 cursor-pointer"
                : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 cursor-pointer"
            }
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isSubmitting ? "Processing..." : confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
