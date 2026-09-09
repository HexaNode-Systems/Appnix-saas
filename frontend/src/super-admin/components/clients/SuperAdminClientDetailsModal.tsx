"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  Wallet,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogIn,
} from "lucide-react";
import { executeGuestLogin } from "@/super-admin/services";

interface SuperAdminClientDetailsModalProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export function SuperAdminClientDetailsModal({
  clientId,
  isOpen,
  onClose,
  onStatusChanged,
}: SuperAdminClientDetailsModalProps) {
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientId) {
      setClient(null);
      return;
    }

    const loadClient = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await superAdminApi.getClientById(clientId);
        setClient(data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load client details");
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleToggleStatus = async () => {
    if (!client) return;
    const newStatus = client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Set client ${client.name} status to ${newStatus}?`)) return;

    setStatusUpdating(true);
    try {
      await superAdminApi.updateClientStatus(client.id, newStatus, `Manual toggle by Super Admin`);
      const updated = await superAdminApi.getClientById(client.id);
      setClient(updated);
      onStatusChanged?.();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const [guestLoading, setGuestLoading] = useState(false);

  const handleLoginAsGuest = async () => {
    if (!client) return;
    setGuestLoading(true);
    try {
      await executeGuestLogin(client, "/super-admin/clients");
    } catch (err: any) {
      console.error("Guest login failed:", err);
      alert(err.response?.data?.message || err.message || "Failed to log in as guest");
      setGuestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: client?.primaryColor || "#0f172a" }}
            >
              {client?.name ? client.name.slice(0, 2).toUpperCase() : <Building2 className="h-5 w-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {client?.name || "Client Details"}
                </h2>
                {client && (
                  <Badge
                    className={
                      client.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[10px]"
                    }
                  >
                    {client.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {client?.slug ? `slug: ${client.slug}` : "Inspect organization details and partner hierarchy"}
              </p>
            </div>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading client organization details...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : client ? (
          <div className="space-y-4 text-xs">
            {/* Parent White-Label Partner Card */}
            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Parent White-Label Reseller
              </span>
              {client.partner ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/super-admin/partners/${client.partner.id}`}
                      className="font-bold text-foreground text-sm hover:underline flex items-center gap-1.5"
                    >
                      <Building2 className="h-4 w-4 text-amber-600" />
                      <span>{client.partner.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Partner Admin: {client.partner.adminUser?.name || "Reseller Admin"} •{" "}
                      {client.partner.adminUser?.email || client.partner.slug}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0 self-start sm:self-center">
                    ID: {client.partner.id.slice(0, 8)}...
                  </Badge>
                </div>
              ) : (
                <div className="text-muted-foreground italic">Platform Direct Tenant (No reseller parent)</div>
              )}
            </div>

            {/* Grid: Owner & Subscription */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Owner / Contact */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Primary Owner / Contact
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{client.adminUser?.name || "Account Administrator"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{client.adminUser?.email || "No email"}</span>
                  </div>
                  {client.adminUser?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{client.adminUser.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription & Plan */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Subscription & Plan
                </span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      {client.subscription?.planName || client.plan || "Standard Plan"}
                    </span>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold">
                      {client.subscription?.status || client.status || "ACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground font-mono text-xs">
                    Price: {client.subscription?.price ? `₹${client.subscription.price}/mo` : "Standard Plan"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Renewal:{" "}
                    {client.subscription?.currentPeriodEnd
                      ? new Date(client.subscription.currentPeriodEnd).toLocaleDateString()
                      : "Active"}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid: Wallet & Usage Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wallet & Billing */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Prepaid Wallet Credit
                  </span>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold font-mono text-foreground">
                  ₹{Number(client.wallet?.balance || 0).toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {client.wallet?.currency || "INR"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Credits allocated for messaging and automations
                </p>
              </div>

              {/* Usage Metrics */}
              <div className="rounded-xl border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Workspace Usage
                  </span>
                  <Layers className="h-4 w-4 text-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>Users: <span className="font-bold text-foreground">{client.metrics?.totalUsers || 0}</span></div>
                  <div>Contacts: <span className="font-bold text-foreground">{client.metrics?.totalContacts || 0}</span></div>
                  <div>Campaigns: <span className="font-bold text-foreground">{client.metrics?.totalCampaigns || 0}</span></div>
                  <div>Workflows: <span className="font-bold text-foreground">{client.metrics?.totalWorkflows || 0}</span></div>
                </div>
              </div>
            </div>

            {/* Channels & Timestamps */}
            <div className="rounded-xl border bg-card p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Metadata & Channels
              </span>
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Onboarded: {new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Radio className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Connected Channels: {client.channels?.length || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Tier: {client.tier}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={statusUpdating}
                className={`text-xs font-semibold cursor-pointer ${
                  client.status === "ACTIVE"
                    ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {statusUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                <span>{client.status === "ACTIVE" ? "Suspend Client Account" : "Activate Client Account"}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleLoginAsGuest}
                  disabled={guestLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs cursor-pointer"
                >
                  {guestLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <LogIn className="h-3.5 w-3.5" />
                  )}
                  <span>Login as Guest →</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
