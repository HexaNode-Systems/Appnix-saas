"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Client } from "@/super-admin/types";
import { clientService } from "@/super-admin/services";
import { AddClientModal } from "@/super-admin/components/clients/AddClientModal";
import { UpdateClientModal } from "@/super-admin/components/clients/UpdateClientModal";
import {
  Building2,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Wallet,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Trash2,
  PauseCircle,
  PlayCircle,
  Eye,
  Edit,
  LogIn,
  KeyRound,
  Sparkles,
} from "lucide-react";

function SuperAdminClientsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<string>("All");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Update client modal state
  const [clientToUpdate, setClientToUpdate] = useState<Client | null>(null);
  const [isUpdateClientOpen, setIsUpdateClientOpen] = useState(false);

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchClients = () => {
    clientService.getAll().then(setClients);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Listen to ?action=add to open Add Client modal from sidebar or links
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsAddClientOpen(true);
    }
  }, [searchParams]);

  const handleCloseAddModal = () => {
    setIsAddClientOpen(false);
    if (searchParams.get("action") === "add") {
      router.replace("/super-admin/clients");
    }
  };

  const handleToggleStatus = (id: string, currentStatus: Client["status"]) => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    clientService.updateStatus(id, newStatus).then(() => {
      fetchClients();
      showToast(`Client status changed to ${newStatus}`);
    });
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete organization "${name}"? This cannot be undone.`)) {
      clientService.delete(id).then(() => {
        fetchClients();
        showToast(`Organization "${name}" deleted`);
      });
    }
  };

  const handleOpenUpdateModal = (client: Client) => {
    setClientToUpdate(client);
    setIsUpdateClientOpen(true);
  };

  const handleClientUpdated = (updatedData: Partial<Client>) => {
    if (!clientToUpdate) return;
    clientService.update(clientToUpdate.id, updatedData).then(() => {
      fetchClients();
      setIsUpdateClientOpen(false);
      setClientToUpdate(null);
      showToast(`Client "${updatedData.name || clientToUpdate.name}" updated successfully!`);
    });
  };

  const handleLoginAsGuest = (client: Client) => {
    // 1. Store guest session in localStorage
    const guestSession = {
      isGuest: true,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      ownerName: client.ownerName,
      plan: client.plan,
      walletBalance: client.walletBalance,
      whatsappStatus: client.whatsappStatus,
      loginTime: new Date().toISOString(),
      returnUrl: "/super-admin/clients",
    };
    localStorage.setItem("appnix_guest_impersonation", JSON.stringify(guestSession));

    // 2. Set tenant workspace credentials in localStorage so dashboard matches client
    const tenantUser = {
      id: client.id,
      email: client.email,
      name: client.ownerName,
      role: "owner",
      workspaceId: client.id,
      workspaceName: client.name,
      permissions: ["*"],
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: client.signupDate,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("appnix_user", JSON.stringify(tenantUser));
    localStorage.setItem("appnix_token", `guest_session_${client.id}_${Date.now()}`);

    // 3. Inform user & navigate
    showToast(`Redirecting as Guest to ${client.name}...`);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 border border-gray-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/super-admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Clients</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Clients Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage client organizations, provision workspaces, update details, and log in as guest.
          </p>
        </div>

        <Button
          onClick={() => setIsAddClientOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
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
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
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
              placeholder="Search clients, owner, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-8.5 text-xs bg-background"
            />
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4 text-left">Org Name</th>
                <th className="p-4 text-left">Plan</th>
                <th className="p-4 text-left">Client Status</th>
                <th className="p-4 text-left">WhatsApp Status</th>
                <th className="p-4 text-right">Wallet Balance</th>
                <th className="p-4 text-left">Signup Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                    No client organizations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isNegative = client.walletBalance < 0;
                  return (
                    <tr
                      key={client.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors text-xs"
                    >
                      {/* Org Name */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-600/10 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-400 text-xs shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p
                              onClick={() => setSelectedClient(client)}
                              className="font-bold text-foreground hover:text-emerald-600 cursor-pointer"
                            >
                              {client.name}
                            </p>
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

                      {/* Client Status */}
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

                      {/* WhatsApp Status */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              client.whatsappStatus === "Connected" && "bg-emerald-500",
                              client.whatsappStatus === "Pending" && "bg-amber-500",
                              client.whatsappStatus === "Disconnected" && "bg-slate-400"
                            )}
                          />
                          <span className="text-foreground font-medium">{client.whatsappStatus}</span>
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="p-4 text-right">
                        <span
                          className={cn(
                            "font-bold font-mono",
                            isNegative ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                          )}
                        >
                          {isNegative ? `-$${Math.abs(client.walletBalance).toFixed(2)}` : `$${client.walletBalance.toFixed(2)}`}
                        </span>
                      </td>

                      {/* Signup Date */}
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {client.signupDate}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Option: Login as Guest to that particular client */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoginAsGuest(client)}
                            className="h-7.5 px-2.5 text-[11px] font-semibold gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs cursor-pointer"
                            title={`Login as Guest to ${client.name}`}
                          >
                            <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Login as Guest</span>
                          </Button>

                          {/* Option: Update Client in table */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenUpdateModal(client)}
                            className="h-7.5 w-7.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                            title="Update Client"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {/* Option: View Client Details */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedClient(client)}
                            className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title="View Client Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Option: Toggle Suspend / Activate */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(client.id, client.status)}
                            className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title={client.status === "Active" ? "Suspend Client" : "Activate Client"}
                          >
                            {client.status === "Active" ? (
                              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>

                          {/* Option: Delete Client */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="h-7.5 w-7.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={handleCloseAddModal}
        onClientAdded={(newClient) => {
          clientService.create(newClient).then(() => {
            fetchClients();
            showToast(`Organization "${newClient.name}" successfully created!`);
          });
        }}
      />

      {/* Update Client Modal */}
      <UpdateClientModal
        isOpen={isUpdateClientOpen}
        onClose={() => {
          setIsUpdateClientOpen(false);
          setClientToUpdate(null);
        }}
        client={clientToUpdate}
        onClientUpdated={handleClientUpdated}
      />

      {/* View Client Details Drawer / Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600/10 flex items-center justify-center font-bold text-emerald-600 text-sm">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedClient.name}</h3>
                  <p className="text-xs text-muted-foreground">ID: {selectedClient.id}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedClient(null)}>
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">Account Owner</p>
                <p className="font-bold text-foreground mt-0.5">{selectedClient.ownerName}</p>
                <p className="text-muted-foreground">{selectedClient.email}</p>
                {selectedClient.phone && (
                  <p className="text-muted-foreground text-[11px] mt-0.5">{selectedClient.phone}</p>
                )}
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">Subscription Plan</p>
                <p className="font-bold text-foreground mt-0.5">{selectedClient.plan} Tier</p>
                <p className="text-emerald-600 font-semibold">${selectedClient.mrr}/mo MRR</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">Wallet Balance</p>
                <p className={cn("font-bold font-mono mt-0.5 text-sm", selectedClient.walletBalance < 0 ? "text-rose-600" : "text-foreground")}>
                  ${selectedClient.walletBalance.toFixed(2)}
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-[10px] uppercase font-semibold">WhatsApp Connectivity</p>
                <p className="font-bold text-foreground mt-0.5">{selectedClient.whatsappStatus}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedClient(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-semibold"
                  onClick={() => {
                    const client = selectedClient;
                    setSelectedClient(null);
                    handleOpenUpdateModal(client);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Update Client
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs"
                  onClick={() => {
                    const client = selectedClient;
                    setSelectedClient(null);
                    handleLoginAsGuest(client);
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login as Guest →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminClientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading clients console...</div>}>
      <SuperAdminClientsContent />
    </Suspense>
  );
}
