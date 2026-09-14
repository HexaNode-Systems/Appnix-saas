"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Client } from "../../types";
import { X, Building2, AlertCircle, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { ClientConfirmModal, ConfirmDetailItem } from "./ClientConfirmModal";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: (
    client: Omit<Client, "id" | "mrr" | "totalUsers" | "lastActive"> & { password?: string }
  ) => Promise<void> | void;
}

export function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Client["plan"]>("Pro");
  const [status, setStatus] = useState<Client["status"]>("Active");
  const [whatsappStatus, setWhatsappStatus] = useState<Client["whatsappStatus"]>("Connected");
  const [walletBalance, setWalletBalance] = useState("1000.00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setOwnerName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setPhone("");
    setPlan("Pro");
    setStatus("Active");
    setWhatsappStatus("Connected");
    setWalletBalance("1000.00");
    setError(null);
    setIsConfirmOpen(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Organization Name and Work Email are required.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password is required and must be at least 8 characters long.");
      return;
    }

    setError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onClientAdded({
        name: name.trim(),
        ownerName: ownerName.trim() || `${name.trim()} Admin`,
        email: email.trim(),
        password: password,
        phone: phone.trim() || "",
        plan,
        status,
        whatsappStatus,
        walletBalance: parseFloat(walletBalance) || 0,
        signupDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
      setIsConfirmOpen(false);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create client organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDetails: ConfirmDetailItem[] = [
    { label: "Organization Name", value: name.trim() },
    { label: "Owner / Contact", value: ownerName.trim() || `${name.trim()} Admin` },
    { label: "Admin Email", value: email.trim() },
    { label: "Subscription Plan", value: `${plan} Tier` },
    { label: "Account Status", value: status },
    { label: "WhatsApp BSP", value: whatsappStatus },
    {
      label: "Initial Wallet Credit",
      value: `$${(parseFloat(walletBalance) || 0).toFixed(2)}`,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Add New Client Organization</h2>
                <p className="text-xs text-muted-foreground">Provision a new tenant workspace and subscription.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
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

            {/* Password Field with show/hide eye toggle */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password *
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">Min. 8 characters</span>
              </label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter initial password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="h-9 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Plan Tier</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Client["plan"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="Starter">Starter ($29/mo)</option>
                  <option value="Growth">Growth ($99/mo)</option>
                  <option value="Pro">Pro ($199/mo)</option>
                  <option value="Enterprise">Enterprise ($299+/mo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Client["status"])}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
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
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="Connected">Connected</option>
                  <option value="Pending">Pending</option>
                  <option value="Disconnected">Disconnected</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Initial Wallet Credit ($ USD)</label>
              <Input
                type="number"
                step="10"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-1.5"
              >
                <span>Create Client</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog (Shadcn Dialog) */}
      <ClientConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedSubmit}
        title="Confirm Client Creation"
        description="Please review the organization and administrator account details before provisioning."
        details={confirmDetails}
        confirmText="Confirm & Create"
        isSubmitting={isSubmitting}
        error={error}
      />
    </>
  );
}
