"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Info,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/lib/config";

interface DomainMapping {
  id: string;
  domain: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  sslStatus: "PENDING" | "ACTIVE" | "FAILED";
  dnsRecordType?: string;
  expectedDnsTarget: string;
  verificationToken?: string;
  verifiedAt?: string | null;
  lastCheckedAt?: string | null;
  createdAt?: string;
}

export default function CustomDomainSettingsPage() {
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchDomains = async () => {
    try {
      setFetching(true);
      const token =
        localStorage.getItem(config.auth.adminTokenKey) ||
        localStorage.getItem(config.auth.tokenKey) ||
        "";

      const res = await fetch(`${config.api.baseUrl}/partner/domains`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        setDomains(json.data || []);
      }
    } catch (err: any) {
      console.warn("Failed to fetch custom domains:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) {
      toast.error("Please enter a custom domain name");
      return;
    }

    setLoading(true);
    try {
      const token =
        localStorage.getItem(config.auth.adminTokenKey) ||
        localStorage.getItem(config.auth.tokenKey) ||
        "";

      const res = await fetch(`${config.api.baseUrl}/partner/domains`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ domain: domainInput.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to register custom domain");
      }

      toast.success("Domain registered! Please configure DNS records.");
      setDomainInput("");
      await fetchDomains();
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDns = async (domainId: string, domainName: string) => {
    setVerifyingId(domainId);
    toast.info(`Querying DNS records for ${domainName}...`);

    try {
      const token =
        localStorage.getItem(config.auth.adminTokenKey) ||
        localStorage.getItem(config.auth.tokenKey) ||
        "";

      const res = await fetch(`${config.api.baseUrl}/partner/domains/${domainId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const json = await res.json();

      if (json.verified || json.status === "VERIFIED") {
        toast.success(`DNS Verified! ${domainName} is now active.`);
      } else {
        toast.error(
          json.message || `DNS verification failed for ${domainName}. Check CNAME target.`
        );
      }

      await fetchDomains();
    } catch (err: any) {
      toast.error(err.message || "Verification request failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to remove this domain mapping?")) return;

    try {
      const token =
        localStorage.getItem(config.auth.adminTokenKey) ||
        localStorage.getItem(config.auth.tokenKey) ||
        "";

      const res = await fetch(`${config.api.baseUrl}/partner/domains/${domainId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Domain mapping removed.");
        await fetchDomains();
      } else {
        const json = await res.json();
        toast.error(json.message || "Failed to delete domain");
      }
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Reseller Portal</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <Link
          href="/admin/settings"
          className="hover:text-foreground transition-colors"
        >
          Settings
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Custom Domains</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-500" />
            White-Label Custom Domain Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map your agency domain (e.g. <code className="text-indigo-400 font-mono text-xs">clients.myagency.com</code>) so your end clients access a 100% white-labeled portal.
          </p>
        </div>
        <Button
          onClick={fetchDomains}
          variant="outline"
          size="sm"
          disabled={fetching}
          className="gap-2 shrink-0 border-border/70"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Status
        </Button>
      </div>

      {/* Add New Custom Domain Form */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-1">
          Register New Custom Domain
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Enter the fully qualified domain name (subdomain recommended for zero downtime).
        </p>

        <form onSubmit={handleRegisterDomain} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="e.g. portal.yourbrand.com or clients.myagency.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="pl-9 text-sm"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !domainInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            Register Domain
          </Button>
        </form>
      </div>

      {/* Registered Domains List */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Configured Domains ({domains.length})
        </h2>

        {fetching && domains.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl border-border text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading domain configurations...
          </div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl border-border text-sm text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            No custom domains configured yet. Add your first domain above to start white-labeling.
          </div>
        ) : (
          domains.map((d) => {
            const isVerified = d.status === "VERIFIED";
            const isFailed = d.status === "FAILED";
            const isVerifying = verifyingId === d.id;

            return (
              <div
                key={d.id}
                className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-5 transition-all hover:border-border"
              >
                {/* Domain Title & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-foreground">
                      {d.domain}
                    </span>
                    {isVerified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active / Verified
                      </Badge>
                    ) : isFailed ? (
                      <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                        <Clock className="h-3 w-3" />
                        Pending DNS
                      </Badge>
                    )}

                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      SSL: {d.sslStatus || "PENDING"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleVerifyDns(d.id, d.domain)}
                      disabled={isVerifying}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-medium shadow-sm"
                    >
                      {isVerifying ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Verify DNS Now
                    </Button>
                    <Button
                      onClick={() => handleDeleteDomain(d.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* DNS Instructions Grid */}
                <div className="bg-muted/40 rounded-lg p-4 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Server className="h-4 w-4 text-indigo-500" />
                    Required DNS Configuration
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-background rounded-md p-3 border border-border/60">
                      <div className="text-muted-foreground mb-1 font-medium">Record Type</div>
                      <div className="font-mono font-bold text-foreground">CNAME</div>
                    </div>

                    <div className="bg-background rounded-md p-3 border border-border/60">
                      <div className="text-muted-foreground mb-1 font-medium">Host / Name</div>
                      <div className="flex items-center justify-between font-mono font-bold text-foreground">
                        <span>{d.domain.split(".")[0] || "@"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground"
                          onClick={() => copyToClipboard(d.domain.split(".")[0] || "@", "Host")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-background rounded-md p-3 border border-border/60">
                      <div className="text-muted-foreground mb-1 font-medium">Points to / Target</div>
                      <div className="flex items-center justify-between font-mono font-bold text-indigo-400">
                        <span>cname.appnix.co.in</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard("cname.appnix.co.in", "Target")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {d.verificationToken && (
                    <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between">
                      <span>
                        Alternate TXT Token: <code className="font-mono text-foreground font-semibold">appnix-verify={d.verificationToken}</code>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-muted-foreground gap-1 px-2"
                        onClick={() => copyToClipboard(`appnix-verify=${d.verificationToken}`, "TXT Token")}
                      >
                        <Copy className="h-3 w-3" />
                        Copy TXT Record
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status Notice */}
                {isVerified ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      Domain is active and resolving! Your clients can now log in directly at{" "}
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline inline-flex items-center gap-1"
                      >
                        https://{d.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>
                      After saving your CNAME record at your DNS registrar (GoDaddy, Cloudflare, Namecheap), allow 5-15 minutes for propagation before verifying.
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
