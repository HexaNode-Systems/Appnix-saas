"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  RefreshCw,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { superAdminApi } from "@/super-admin/services/superAdminApi";

interface DirectAdminConfig {
  supportEmail?: string;
  staffPermissions?: string;
  alertWebhook?: string;
  maintenanceMode?: boolean;
  allowSignup?: boolean;
  directTierDefault?: string;
  trialEnabled?: boolean;
  trialDays?: number;
  trialMaxUsers?: number;
}

export default function DirectStaffPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [settings, setSettings] = useState<DirectAdminConfig>({
    supportEmail: "",
    staffPermissions: "",
    alertWebhook: "",
    trialEnabled: false,
    trialDays: 7,
    trialMaxUsers: 5,
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [staff, config] = await Promise.all([
        superAdminApi.getDirectOperationsAdmins(),
        superAdminApi.getDirectOperationsAdminConfig(),
      ]);
      setAdmins(staff || []);
      if (config) {
        setSettings({
          supportEmail: config.supportEmail || "",
          staffPermissions: config.staffPermissions || "",
          alertWebhook: config.alertWebhook || "",
          trialEnabled: Boolean(config.trialEnabled),
          trialDays: typeof config.trialDays === "number" ? config.trialDays : 7,
          trialMaxUsers: typeof config.trialMaxUsers === "number" ? config.trialMaxUsers : 5,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load direct operations settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const guestLogin = async (id: string) => {
    setOpeningId(id);
    try {
      const result = await superAdminApi.directOperationsGuestLogin("DIRECT_ADMIN", id);
      if (result.redirectUrl) {
        window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to launch guest login session");
    } finally {
      setOpeningId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const payload = {
        supportEmail: settings.supportEmail,
        staffPermissions: settings.staffPermissions,
        alertWebhook: settings.alertWebhook,
        trialEnabled: Boolean(settings.trialEnabled),
        trialDays: 7,
        trialMaxUsers: Math.max(1, Number(settings.trialMaxUsers) || 5),
      };
      const updated = await superAdminApi.updateDirectOperationsAdminConfig(payload);
      if (updated) {
        setSettings({
          supportEmail: updated.supportEmail || "",
          staffPermissions: updated.staffPermissions || "",
          alertWebhook: updated.alertWebhook || "",
          trialEnabled: Boolean(updated.trialEnabled),
          trialDays: typeof updated.trialDays === "number" ? updated.trialDays : 7,
          trialMaxUsers: typeof updated.trialMaxUsers === "number" ? updated.trialMaxUsers : 5,
        });
      }
      setSuccessMessage("Direct operations and 7-day free trial configuration updated successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Direct Staff & Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage internal APP_ADMIN accounts on admin.appnix.co.in and configure direct operations settings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 7-Day Free Trial Entitlement Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  7-Day Free Trial Entitlement (Direct Operations)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Authorize whether direct signups on app.appnix.co.in receive a 7-day free trial and configure trial limits.
                </p>
              </div>
            </div>

            <Badge
              className={
                settings.trialEnabled
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold w-fit"
                  : "bg-muted text-muted-foreground text-[10px] font-bold w-fit"
              }
            >
              {settings.trialEnabled ? "TRIAL: ENABLED" : "TRIAL: DISABLED"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Free Trial Toggle */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Free Trial Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={settings.trialEnabled ? "yes" : "no"}
                onChange={(e) => setSettings({ ...settings, trialEnabled: e.target.value === "yes" })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="yes">Enabled (Direct clients receive 7-day trial)</option>
                <option value="no">Disabled (Paid activation required)</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Super Admin direct operations permission
              </p>
            </div>

            {/* Trial Duration (Fixed at 7 days) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Trial Duration
              </label>
              <div className="h-10 rounded-md border border-input bg-muted/40 px-3 flex items-center text-xs font-mono font-bold text-foreground">
                7 Days (Fixed)
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Calculated strictly server-side from activation
              </p>
            </div>

            {/* Maximum Allowed Users */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Max Users Allowed During Trial <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                required
                min={1}
                max={100}
                value={settings.trialMaxUsers ?? 5}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setSettings({ ...settings, trialMaxUsers: val });
                }}
                disabled={!settings.trialEnabled}
                className="h-10 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Active seat capacity allowed during the 7-day trial
              </p>
            </div>
          </div>
        </div>

        {/* Direct Admin Operations Config Card */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-4">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Direct Admin System Configuration
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Operational parameters for staff administration on admin.appnix.co.in.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Support Email
              </label>
              <Input
                type="email"
                placeholder="support@appnix.co.in"
                value={settings.supportEmail || ""}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="h-10 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Escalation contact for staff</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Staff Default Permissions
              </label>
              <Input
                type="text"
                placeholder="clients.view,clients.edit"
                value={settings.staffPermissions || ""}
                onChange={(e) => setSettings({ ...settings, staffPermissions: e.target.value })}
                className="h-10 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Comma-delimited permission keys</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Alert Webhook URL
              </label>
              <Input
                type="url"
                placeholder="https://hooks.slack.com/..."
                value={settings.alertWebhook || ""}
                onChange={(e) => setSettings({ ...settings, alertWebhook: e.target.value })}
                className="h-10 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Direct system alert notification endpoint</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold text-xs h-10 px-5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Direct Staff Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Direct Staff Accounts</h2>
            <p className="text-xs text-muted-foreground">Authorized staff users possessing APP_ADMIN role.</p>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {admins.length} {admins.length === 1 ? "Account" : "Accounts"}
          </Badge>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading direct staff accounts...</span>
                  </td>
                </tr>
              ) : admins.map((admin) => (
                <tr key={admin.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-semibold text-foreground">
                    {admin.name || "Unnamed staff"}
                  </td>
                  <td className="p-3.5 font-mono text-xs text-muted-foreground">{admin.email}</td>
                  <td className="p-3.5">
                    <Badge variant="secondary" className="font-mono text-[10px] font-semibold">
                      {admin.role}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-xs text-muted-foreground">{admin.department || "General Operations"}</td>
                  <td className="p-3.5">
                    <Badge
                      className={
                        admin.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      onClick={() => guestLogin(admin.id)}
                      disabled={openingId === admin.id}
                      className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 shadow-xs"
                    >
                      {openingId === admin.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Opening…</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Guest Login</span>
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && !admins.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="font-medium text-foreground text-sm">No direct staff accounts found</p>
                    <p className="text-xs text-muted-foreground mt-1">Staff accounts will appear here once provisioned.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
