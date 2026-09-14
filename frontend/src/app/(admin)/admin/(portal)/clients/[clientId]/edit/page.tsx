"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientService } from "@/super-admin/services";
import { Client } from "@/super-admin/types";
import { ClientConfirmModal, ConfirmDetailItem } from "@/super-admin/components/clients/ClientConfirmModal";
import {
  Building2,
  ArrowLeft,
  ChevronRight,
  Save,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  Globe,
  Radio,
  Loader2,
} from "lucide-react";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = (params?.clientId as string) || "";

  // Loading & Error states
  const [loadingClient, setLoadingClient] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Client["plan"]>("Pro");
  const [status, setStatus] = useState<Client["status"]>("Active");
  const [whatsappStatus, setWhatsappStatus] = useState<Client["whatsappStatus"]>("Connected");
  const [walletBalance, setWalletBalance] = useState("0");

  // Submission State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    const fetchClient = async () => {
      setLoadingClient(true);
      setFetchError(null);
      try {
        const data = await clientService.getById(clientId);
        if (!data) {
          throw new Error("Client organization not found");
        }
        if (isMounted) {
          setClient(data);
          setName(data.name || "");
          setOwnerName(data.ownerName || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setPlan(data.plan || "Pro");
          setStatus(data.status || "Active");
          setWhatsappStatus(data.whatsappStatus || "Connected");
          setWalletBalance(data.walletBalance !== undefined ? String(data.walletBalance) : "0");
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.response?.data?.message || err.message || "Failed to load client details");
        }
      } finally {
        if (isMounted) setLoadingClient(false);
      }
    };

    fetchClient();
    return () => {
      isMounted = false;
    };
  }, [clientId]);

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
    if (!clientId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await clientService.update(clientId, {
        name: name.trim(),
        ownerName: ownerName.trim() || client?.ownerName,
        email: email.trim(),
        phone: phone.trim() || client?.phone,
        plan,
        status,
        whatsappStatus,
        walletBalance: parseFloat(walletBalance) || 0,
      });

      setIsConfirmOpen(false);
      showToast(`Client "${name.trim()}" updated successfully!`);
      setTimeout(() => {
        router.push("/admin/clients");
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update client organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDetails: ConfirmDetailItem[] = [
    { label: "Organization Name", value: name.trim() },
    { label: "Owner / Contact", value: ownerName.trim() || client?.ownerName || "—" },
    { label: "Work Email", value: email.trim() },
    { label: "Phone Number", value: phone.trim() || "—" },
    { label: "Subscription Plan", value: `${plan} Tier` },
    { label: "Account Status", value: status },
    { label: "WhatsApp BSP", value: whatsappStatus },
    {
      label: "Wallet Balance",
      value: `$${(parseFloat(walletBalance) || 0).toFixed(2)}`,
    },
  ];

  if (loadingClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-xs text-muted-foreground font-medium">Loading client details...</p>
      </div>
    );
  }

  if (fetchError || !client) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 rounded-2xl border bg-card shadow-xs text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">Client Not Found</h2>
          <p className="text-xs text-muted-foreground">
            {fetchError || "The requested client organization could not be found or access is restricted."}
          </p>
        </div>
        <Link href="/admin/clients">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

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
        <span className="font-semibold text-foreground truncate max-w-[200px]">{client.name}</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Edit</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            Edit Client Details
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Update organization identity, plan tier, WhatsApp status, and wallet credit for{" "}
            <strong className="text-foreground">{client.name}</strong> (ID: {client.id})
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

      {/* Main Edit Form */}
      <form onSubmit={handlePreSubmit} className="space-y-6">
        {/* Section 1: Organization & Contact Information */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Organization & Contact Details
            </h2>
            <p className="text-xs text-muted-foreground">Manage organization name, administrator email, and primary contact.</p>
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

        {/* Section 2: Subscription Plan & Settings */}
        <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Plan, Status & Connectivity
            </h2>
            <p className="text-xs text-muted-foreground">Modify tier privileges, operational status, and pre-funded balance.</p>
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
                Wallet Balance ($ USD)
              </label>
              <Input
                type="number"
                step="0.01"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="h-9.5 text-xs font-mono"
              />
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
            <Save className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog (Shadcn Dialog) */}
      <ClientConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedUpdate}
        title="Confirm Client Update"
        description={`Are you sure you want to save changes to "${name}"?`}
        details={confirmDetails}
        confirmText="Confirm Update"
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
}
