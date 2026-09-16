"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Client } from "@/super-admin/types";
import { insideClientService, executeGuestLogin } from "@/super-admin/services";
import { AddInsideClientModal } from "./AddInsideClientModal";
import { UpdateInsideClientModal } from "./UpdateInsideClientModal";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  ShieldCheck,
  Globe,
  LogIn,
  Edit,
  PauseCircle,
  PlayCircle,
  Trash2,
  Loader2,
  Wallet,
  ExternalLink,
  Users,
} from "lucide-react";

interface InsideClientsSectionProps {
  isSuperAdmin?: boolean;
}

export function InsideClientsSection({ isSuperAdmin }: InsideClientsSectionProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [clientToUpdate, setClientToUpdate] = useState<Client | null>(null);

  // Guest login loading indicator
  const [guestLoginLoadingId, setGuestLoginLoadingId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await insideClientService.getAll();
      setClients(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load inside clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientAdded = async (newClient: any) => {
    await insideClientService.create(newClient);
    await fetchClients();
    showToast(`Inside organization "${newClient.name}" provisioned successfully on app. subdomain!`);
  };

  const handleClientUpdated = async (updatedData: Partial<Client>) => {
    if (!clientToUpdate) return;
    await insideClientService.update(clientToUpdate.id, updatedData);
    await fetchClients();
    showToast(`Inside organization "${clientToUpdate.name}" updated successfully!`);
    setIsUpdateOpen(false);
    setClientToUpdate(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: Client["status"]) => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      await insideClientService.updateStatus(id, newStatus);
      await fetchClients();
      showToast(`Inside client status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Error: ${err.message || "Failed to update status"}`);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete inside organization "${name}"? This cannot be undone.`)) {
      try {
        await insideClientService.delete(id);
        await fetchClients();
        showToast(`Inside organization "${name}" deleted`);
      } catch (err: any) {
        showToast(`Error: ${err.message || "Failed to delete client"}`);
      }
    }
  };

  const handleLoginAsGuest = async (client: Client) => {
    setGuestLoginLoadingId(client.id);
    showToast(`Connecting to app.appnix.co.in portal for ${client.name}...`);
    try {
      await executeGuestLogin(client, "/admin/clients/inside-clients");
    } catch (err: any) {
      console.error("Inside guest login failed:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to log in as guest";
      showToast(`Error: ${errMsg}`);
    } finally {
      setGuestLoginLoadingId(null);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.plan.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilterTab === "All") return true;
    if (activeFilterTab === "Active") return client.status === "Active";
    if (activeFilterTab === "Trial") return client.status === "Trial";
    if (activeFilterTab === "Suspended") return client.status === "Suspended";
    if (activeFilterTab === "Negative Balance") return client.walletBalance < 0;

    return true;
  });

  const totalMRR = clients.reduce((acc, c) => acc + (c.mrr || 0), 0);
  const totalBalance = clients.reduce((acc, c) => acc + (c.walletBalance || 0), 0);
  const activeCount = clients.filter((c) => c.status === "Active").length;
  const suspendedCount = clients.filter((c) => c.status === "Suspended").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 border border-gray-700">
          <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Inside Clients
            </h2>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-xs font-semibold border-purple-300">
              app. & admin. only
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Direct platform client organizations provisioned exclusively on our proprietary subdomains (<code className="text-purple-600 font-mono">app.appnix.co.in</code> & <code className="text-purple-600 font-mono">admin.appnix.co.in</code>). Strictly isolated from reseller organizations.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Inside Client
        </Button>
      </div>

      {/* Subdomain Infrastructure Callout */}
      <div className="rounded-2xl border border-purple-500/20 bg-linear-to-r from-purple-500/10 via-background to-indigo-500/10 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-600/15 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Dedicated Subdomains Architecture</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                These accounts belong directly to our Platform Root and cannot be seen or managed by third-party white-label partners. All guest logins route to <span className="text-purple-600 font-semibold font-mono">app.appnix.co.in</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-card border text-purple-700 dark:text-purple-300 font-bold">
              app.appnix.co.in
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="px-2.5 py-1 rounded-lg bg-card border text-indigo-700 dark:text-indigo-300 font-bold">
              admin.appnix.co.in
            </span>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-purple-600" />
            Total Inside Clients
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground">{clients.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Active Accounts
          </p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <PauseCircle className="h-3.5 w-3.5 text-rose-600" />
            Suspended
          </p>
          <p className="mt-1 text-xl font-extrabold text-rose-600">{suspendedCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-purple-600" />
            Total Inside MRR
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground">₹{totalMRR.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl bg-card p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {["All", "Active", "Trial", "Suspended", "Negative Balance"].map((tab) => {
            const isSelected = activeFilterTab === tab;
            const count =
              tab === "All"
                ? clients.length
                : tab === "Negative Balance"
                ? clients.filter((c) => c.walletBalance < 0).length
                : clients.filter((c) => c.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilterTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-purple-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search inside clients, owner, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-8.5 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Inside Clients Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4 text-left">Organization & Domain</th>
                <th className="p-4 text-left">Plan</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">WhatsApp BSP</th>
                <th className="p-4 text-right">Wallet Balance</th>
                <th className="p-4 text-left">Signup Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <span>Loading proprietary inside clients from server...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rose-600 text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-rose-500" />
                      <span>{error}</span>
                      <Button variant="outline" size="sm" onClick={fetchClients} className="text-xs mt-2">
                        Try Again
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <Sparkles className="h-8 w-8 text-purple-400/60" />
                      <p className="font-semibold text-foreground">No inside clients found</p>
                      <p className="text-[11px] max-w-sm text-muted-foreground">
                        {searchQuery
                          ? "No inside client organizations match your search criteria."
                          : "Provision your first internal direct client for the app. / admin. subdomains."}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => setIsAddOpen(true)}
                          size="sm"
                          className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Provision First Inside Client
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isNegative = client.walletBalance < 0;
                  const isGuestLoading = guestLoginLoadingId === client.id;
                  return (
                    <tr
                      key={client.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors text-xs"
                    >
                      {/* Org Name + Domain */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-600/10 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-xs shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{client.name}</span>
                              <span className="rounded bg-purple-100 dark:bg-purple-950 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                app.
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {client.ownerName} • {client.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            client.plan === "Enterprise" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
                            client.plan === "Pro" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                            client.plan === "Growth" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                            client.plan === "Starter" && "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          {client.plan}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold",
                            client.status === "Active" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                            client.status === "Trial" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                            client.status === "Suspended" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                            client.status === "Inactive" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {client.status}
                        </Badge>
                      </td>

                      {/* WhatsApp BSP */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Connected</span>
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="p-4 text-right">
                        <span className={cn("font-bold", isNegative ? "text-rose-600 font-extrabold" : "text-foreground")}>
                          ₹{Number(client.walletBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Signup Date */}
                      <td className="p-4 text-muted-foreground">
                        {client.signupDate || "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Guest Login to App */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoginAsGuest(client)}
                            disabled={isGuestLoading}
                            className="h-7 px-2 text-[11px] font-bold text-purple-700 dark:text-purple-300 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950 cursor-pointer"
                            title="Open direct guest session on app.appnix.co.in"
                          >
                            {isGuestLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                            ) : (
                              <>
                                <LogIn className="h-3.5 w-3.5 mr-1 text-purple-600" />
                                <span>App Portal</span>
                              </>
                            )}
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setClientToUpdate(client);
                              setIsUpdateOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Client"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {/* Toggle Status */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(client.id, client.status)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title={client.status === "Active" ? "Suspend Client" : "Activate Client"}
                          >
                            {client.status === "Active" ? (
                              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 cursor-pointer"
                            title="Delete Client"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Inside Client Modal */}
      <AddInsideClientModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Update Inside Client Modal */}
      <UpdateInsideClientModal
        isOpen={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setClientToUpdate(null);
        }}
        client={clientToUpdate}
        onClientUpdated={handleClientUpdated}
      />
    </div>
  );
}
