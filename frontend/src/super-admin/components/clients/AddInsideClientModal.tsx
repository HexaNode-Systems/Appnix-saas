"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Client } from "../../types";
import { X, Building2, AlertCircle, Loader2, Eye, EyeOff, Lock, Sparkles, ShieldCheck } from "lucide-react";
import { ClientConfirmModal, ConfirmDetailItem } from "./ClientConfirmModal";

interface AddInsideClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: (
    client: Omit<Client, "id" | "mrr" | "totalUsers" | "lastActive"> & { password?: string; adminPassword?: string }
  ) => Promise<void> | void;
}

export function AddInsideClientModal({ isOpen, onClose, onClientAdded }: AddInsideClientModalProps) {
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
        adminPassword: password,
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
      setError(err.response?.data?.message || err.message || "Failed to create inside client organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmItems: ConfirmDetailItem[] = [
    { label: "Client Type", value: "Inside Direct Client (app. / admin.)" },
    { label: "Subdomains", value: "app.appnix.co.in / admin.appnix.co.in" },
    { label: "Parent Workspace", value: "Appnix Platform Root (Direct)" },
    { label: "Organization Name", value: name.trim() },
    { label: "Owner / Contact", value: ownerName.trim() || `${name.trim()} Admin` },
    { label: "Admin Email", value: email.trim() },
    { label: "Subscription Plan", value: plan },
    { label: "Initial Status", value: status },
    { label: "WhatsApp BSP Status", value: whatsappStatus },
    { label: "Initial Balance", value: `₹${parseFloat(walletBalance || "0").toLocaleString("en-IN")}` },
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
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Add Inside Client</h3>
                  <span className="rounded-full bg-purple-100 dark:bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    App / Admin Subdomain
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct platform client provisioned under Platform Root (app.appnix.co.in).
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Subdomain Notice */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-2.5 text-xs text-purple-900 dark:text-purple-200">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-purple-600" />
            <span>
              This client will be attached directly to our core infrastructure (<strong>app.</strong> / <strong>admin.</strong>) and will not be shared with white-label partners.
            </span>
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
              {/* Organization Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Owner / Contact Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Owner / Contact Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Admin Work Email <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="admin@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Admin Account Password <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Min 8 characters</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 pl-9 pr-9 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                  <option value="Starter">Starter (₹999/mo)</option>
                  <option value="Pro">Pro (₹2,999/mo)</option>
                  <option value="Enterprise">Enterprise (₹4,999/mo)</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Initial Status</label>
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

              {/* Initial Wallet Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Wallet Balance (₹)</label>
                <Input
                  type="number"
                  step="100"
                  min="0"
                  placeholder="1000.00"
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
                onClick={handleClose}
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
                Review & Provision Inside Client
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ClientConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Inside Client Provisioning"
        description="Please review the inside client parameters before provisioning directly under Platform Root."
        details={confirmItems}
        confirmText="Provision Inside Client"
        confirmVariant="default"
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedSubmit}
      />
    </>
  );
}
