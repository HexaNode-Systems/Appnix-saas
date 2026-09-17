"use client";

import { useEffect, useState } from "react";
import { LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { superAdminApi } from "@/super-admin/services/superAdminApi";

export default function DirectStaffPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({ supportEmail: "", staffPermissions: "", alertWebhook: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [staff, config] = await Promise.all([superAdminApi.getDirectOperationsAdmins(), superAdminApi.getDirectOperationsAdminConfig()]); setAdmins(staff); setSettings(config); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const guestLogin = async (id: string) => {
    setOpeningId(id);
    try {
      const result = await superAdminApi.directOperationsGuestLogin("DIRECT_ADMIN", id);
      if (result.redirectUrl) window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
    } finally { setOpeningId(null); }
  };

  return <div className="space-y-6">
    <div className="flex items-center justify-between border-b pb-5"><div><h1 className="text-2xl font-extrabold">Direct Staff</h1><p className="mt-1 text-sm text-muted-foreground">Internal APP_ADMIN accounts on admin.appnix.co.in.</p></div><Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button></div>
    <form className="grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { setSettings(await superAdminApi.updateDirectOperationsAdminConfig(settings)); } finally { setSaving(false); } }}><input className="rounded-md border bg-background p-2 text-sm" placeholder="Support email" value={settings.supportEmail || ""} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} /><input className="rounded-md border bg-background p-2 text-sm" placeholder="Staff permissions" value={settings.staffPermissions || ""} onChange={(e) => setSettings({ ...settings, staffPermissions: e.target.value })} /><input className="rounded-md border bg-background p-2 text-sm" placeholder="Alert webhook" value={settings.alertWebhook || ""} onChange={(e) => setSettings({ ...settings, alertWebhook: e.target.value })} /><Button type="submit" disabled={saving} className="md:col-span-3">{saving ? "Saving…" : "Save Settings"}</Button></form>
    <div className="overflow-hidden rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Department</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading direct staff…</td></tr> : admins.map((admin) => <tr key={admin.id} className="border-t"><td className="p-3 font-semibold">{admin.name || "Unnamed staff"}</td><td className="p-3 text-muted-foreground">{admin.email}</td><td className="p-3">{admin.role}</td><td className="p-3">{admin.department || "—"}</td><td className="p-3">{admin.isActive ? "Active" : "Inactive"}</td><td className="p-3 text-right"><Button size="sm" onClick={() => guestLogin(admin.id)} disabled={openingId === admin.id} className="gap-1.5 bg-sky-600 hover:bg-sky-700"><LogIn className="h-3.5 w-3.5" />{openingId === admin.id ? "Opening…" : "Guest Login"}</Button></td></tr>)}
      {!loading && !admins.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-5 w-5" />No direct staff accounts found.</td></tr>}
    </tbody></table></div>
  </div>;
}
