"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientService } from "@/super-admin/services";
import { Client } from "@/super-admin/types";
import { ClientConfirmModal, ConfirmDetailItem } from "@/super-admin/components/clients/ClientConfirmModal";
import {
  Building2,
  ArrowLeft,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  Globe,
  Radio,
} from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();

  // Form State
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

  // Flow State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
      await clientService.create({
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
      showToast(`Organization "${name.trim()}" successfully created!`);
      setTimeout(() => {
        router.push("/admin/clients");
      }, 1000);
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 border border-gray-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <Link
          href="/admin/clients"
          className="font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Clients
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Add New Client</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            Add New Client Organization
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Provision a new tenant workspace, administrator login credentials, and subscription plan.
          </p>
        </div>

        <Link href="/admin/clients">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Clients
          </Button>
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handlePreSubmit} className="space-y-6">
        {/* Section 1: Organization & Contact Information */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Organization & Contact Details
            </h2>
            <p className="text-xs text-muted-foreground">Primary company identity and administrative point of contact.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Organization Name <span className="text-rose-600">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Apex Global Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9.5 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Owner / Contact Name <span className="text-rose-600">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Robert Smith"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="h-9.5 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Work Email Address <span className="text-rose-600">*</span>
              </label>
              <Input
                required
                type="email"
                placeholder="admin@apexcorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9.5 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security Credentials */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              Security & Credentials
            </h2>
            <p className="text-xs text-muted-foreground">Initial password for the client administrator to log in via /signin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 sm:col-span-2 max-w-lg">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password <span className="text-rose-600">*</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">Min. 8 characters</span>
              </label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter secure initial password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="h-9.5 text-xs pr-10"
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
              <p className="text-[11px] text-muted-foreground">
                This password will be securely hashed with bcrypt (12 rounds) and never stored in plaintext.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Subscription Plan & Settings */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Plan, Status & Connectivity
            </h2>
            <p className="text-xs text-muted-foreground">Subscription tier, initial balance, and channel availability.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Subscription Plan Tier
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as Client["plan"])}
                className="w-full h-9.5 rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer"
              >
                <option value="Starter">Starter ($29/mo)</option>
                <option value="Growth">Growth ($99/mo)</option>
                <option value="Pro">Pro ($199/mo)</option>
                <option value="Enterprise">Enterprise ($299+/mo)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Client["status"])}
                className="w-full h-9.5 rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                WhatsApp BSP
              </label>
              <select
                value={whatsappStatus}
                onChange={(e) => setWhatsappStatus(e.target.value as Client["whatsappStatus"])}
                className="w-full h-9.5 rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer"
              >
                <option value="Connected">Connected</option>
                <option value="Pending">Pending</option>
                <option value="Disconnected">Disconnected</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-3 max-w-sm">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                Initial Wallet Credit ($ USD)
              </label>
              <Input
                type="number"
                step="10"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="h-9.5 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Pre-funded balance available for WhatsApp messages and automation fees.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/clients">
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 px-5 cursor-pointer shadow-xs"
          >
            <span>Create Client</span>
          </Button>
        </div>
      </form>

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
    </div>
  );
}
