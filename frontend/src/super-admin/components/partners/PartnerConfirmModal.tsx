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
import { Loader2 } from "lucide-react";

export interface PartnerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  mode: "create" | "update";
  data?: Record<string, unknown>;
}

export function PartnerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  submitting = false,
  mode,
}: PartnerConfirmModalProps) {
  const isCreate = mode === "create";
  const title = isCreate ? "Confirm Partner Creation" : "Confirm Partner Update";
  const message = isCreate
    ? "Are you sure you want to provision this White-Label Partner?"
    : "Are you sure you want to update this White-Label Partner?";
  const actionText = isCreate ? "Create Partner" : "Confirm Update";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-md p-6 sm:rounded-xl border bg-card shadow-2xl z-[70]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
            className="h-9 px-5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{actionText}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
