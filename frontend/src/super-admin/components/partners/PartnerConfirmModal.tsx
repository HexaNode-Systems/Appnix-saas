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
import { Loader2, Mail, ShieldCheck } from "lucide-react";

export interface PartnerConfirmData {
  name?: string;
  slug?: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  primaryColor?: string;
  wholesalePlanName?: string;
  perClientRate?: number;
  setupFee?: number;
  clientLimit?: number;
  customDomain?: string;
  featureAccess?: string[];
}

export interface PartnerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  mode: "create" | "update";
  data?: PartnerConfirmData;
}

export function PartnerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  submitting = false,
  mode,
  data,
}: PartnerConfirmModalProps) {
  const isCreate = mode === "create";
  const title = isCreate ? "Confirm Partner Provisioning" : "Confirm Partner Update";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="max-w-md p-6 sm:rounded-xl border bg-card shadow-2xl z-[70]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {isCreate
              ? "Please verify the partner organization details below. Upon confirmation, the tenant workspace and reseller administrator account will be provisioned."
              : "Are you sure you want to update this partner's wholesale configuration?"}
          </DialogDescription>
        </DialogHeader>

        {isCreate && data && (
          <div className="space-y-3 my-2 text-xs">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partner Brand:</span>
                <span className="font-semibold text-foreground">{data.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Administrator:</span>
                <span className="font-medium text-foreground">{data.adminName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Email:</span>
                <span className="font-mono text-foreground">{data.adminEmail || "—"}</span>
              </div>
              {data.customDomain && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custom Domain:</span>
                  <span className="font-mono text-foreground">{data.customDomain}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
              <Mail className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="leading-snug">
                <strong>Automatic Credentials Delivery:</strong> An email containing the Admin Panel URL, login email, and initial password will be automatically sent to <span className="font-mono underline">{data.adminEmail}</span>.
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t mt-4">
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
              <span>Confirm</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
