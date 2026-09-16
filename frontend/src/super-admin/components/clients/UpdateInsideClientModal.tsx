"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Client } from "../../types";
import { X, Sparkles, Save, AlertCircle } from "lucide-react";
import { ClientConfirmModal, ConfirmDetailItem } from "./ClientConfirmModal";

interface UpdateInsideClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onClientUpdated: (updatedClient: Partial<Client>) => Promise<void> | void;
}

export function UpdateInsideClientModal({
  isOpen,
  onClose,
  client,
  onClientUpdated,
}: UpdateInsideClientModalProps) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Client["plan"]>("Pro");
  const [status, setStatus] = useState<Client["status"]>("Active");
  const [whatsappStatus, setWhatsappStatus] = useState<Client["whatsappStatus"]>("Connected");
  const [walletBalance, setWalletBalance] = useState("0");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setOwnerName(client.ownerName || "");
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setPlan(client.plan || "Pro");
      setStatus(client.status || "Active");
      setWhatsappStatus(client.whatsappStatus || "Connected");
      setWalletBalance(client.walletBalance !== undefined ? String(client.walletBalance) : "0");
      setError(null);
      setIsConfirmOpen(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Organization Name and Work Email are required.");
      return;
    }
    setError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmedUpdate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onClientUpdated({
        name: name.trim(),
        ownerName: ownerName.trim() || client.ownerName,
        email: email.trim(),
        phone: phone.trim() || client.phone,
        plan,
        status,
        whatsappStatus,
        walletBalance: parseFloat(walletBalance) || 0,
      });
      setIsConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update inside client organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDetails: ConfirmDetailItem[] = [
    { label: "Organization Name", value: name.trim() },
    { label: "Owner / Contact", value: ownerName.trim() || client.ownerName },
    { label: "Work Email", value: email.trim() },
    { label: "Phone", value: phone.trim() || "—" },
    { label: "Subscription Plan", value: `${plan} Tier` },
    { label: "Client Status", value: status },
    { label: "WhatsApp BSP", value: whatsappStatus },
    {
      label: "Wallet Balance",
      value: `₹${(parseFloat(walletBalance) || 0).toLocaleString("en-IN")}`,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Inside Client</h3>
                <p className="text-xs text-muted-foreground">
                  Update parameters for direct platform workspace ({(client as any).slug || client.name}).
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handlePreSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Owner / Contact Name</label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Plan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subscription Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Client["plan"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Client["status"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              {/* Wallet Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Wallet Balance (₹)</label>
                <Input
                  type="number"
                  step="100"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Review & Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ClientConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Inside Client Updates"
        description="Please review the changes before saving."
        details={confirmDetails}
        confirmText="Save Changes"
        confirmVariant="default"
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedUpdate}
      />
    </>
  );
}
