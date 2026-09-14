"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Client } from "../../types";
import { X, Building2, Save, AlertCircle } from "lucide-react";
import { ClientConfirmModal, ConfirmDetailItem } from "./ClientConfirmModal";

interface UpdateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onClientUpdated: (updatedClient: Partial<Client>) => Promise<void> | void;
}

export function UpdateClientModal({
  isOpen,
  onClose,
  client,
  onClientUpdated,
}: UpdateClientModalProps) {
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
      setError(err.response?.data?.message || err.message || "Failed to update client organization");
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
      value: `$${(parseFloat(walletBalance) || 0).toFixed(2)}`,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Update Client Details</h2>
                <p className="text-xs text-muted-foreground">
                  Edit organization details for {client.name} (ID: {client.id})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Organization Name *</label>
                <Input
                  required
                  placeholder="e.g. Apex Global Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Owner / Contact Name *</label>
                <Input
                  required
                  placeholder="e.g. Robert Smith"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Work Email Address *</label>
                <Input
                  required
                  type="email"
                  placeholder="admin@apexcorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Phone Number</label>
                <Input
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Plan Tier</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Client["plan"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="Starter">Starter ($29/mo)</option>
                  <option value="Growth">Growth ($99/mo)</option>
                  <option value="Pro">Pro ($199/mo)</option>
                  <option value="Enterprise">Enterprise ($299+/mo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Client Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Client["status"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">WhatsApp BSP</label>
                <select
                  value={whatsappStatus}
                  onChange={(e) => setWhatsappStatus(e.target.value as Client["whatsappStatus"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                >
                  <option value="Connected">Connected</option>
                  <option value="Pending">Pending</option>
                  <option value="Disconnected">Disconnected</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Wallet Balance ($ USD)</label>
              <Input
                type="number"
                step="0.01"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog (Shadcn Dialog) */}
      <ClientConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedUpdate}
        title="Confirm Client Update"
        description={`Are you sure you want to save changes to "${client.name}"?`}
        details={confirmDetails}
        confirmText="Confirm Update"
        isSubmitting={isSubmitting}
        error={error}
      />
    </>
  );
}
