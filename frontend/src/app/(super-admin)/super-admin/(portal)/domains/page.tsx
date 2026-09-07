"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import { SuperAdminPagination } from "@/super-admin/components/common/SuperAdminPagination";
import {
  Globe,
  Plus,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Trash2,
  Check,
  Copy,
  X,
} from "lucide-react";

export default function SuperAdminDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Real DNS verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [dnsResultModal, setDnsResultModal] = useState<any | null>(null);

  // Add Domain Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [dnsRecordType, setDnsRecordType] = useState("CNAME");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const [domainsData, partnersData] = await Promise.all([
        superAdminApi.getDomains({ page: targetPage, limit: targetLimit }),
        superAdminApi.getPartners({ limit: 200 }),
      ]);

      if (domainsData && "data" in domainsData && Array.isArray(domainsData.data)) {
        setDomains(domainsData.data);
        setPage(domainsData.page || targetPage);
        setLimit(domainsData.limit || targetLimit);
        setTotal(domainsData.total || 0);
        setTotalPages(domainsData.totalPages || 1);
        setHasNext(Boolean(domainsData.hasNext));
        setHasPrevious(Boolean(domainsData.hasPrevious));
      } else {
        setDomains(Array.isArray(domainsData) ? domainsData : []);
      }

      const partnersList = Array.isArray(partnersData) ? partnersData : partnersData?.data || [];
      setPartners(partnersList);
      if (partnersList.length > 0 && !tenantId) {
        setTenantId(partnersList[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load domain mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    loadData(1, newLimit);
  };

  const handleVerifyDns = async (domainItem: any) => {
    setVerifyingId(domainItem.id);
    setError(null);

    try {
      const res = await superAdminApi.verifyDomain(domainItem.id);
      setDnsResultModal({
        domain: domainItem.domain,
        partner: domainItem.partnerName,
        ...res.diagnostics,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "DNS verification check failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput || !tenantId) return;

    setSubmitting(true);
    setError(null);

    try {
      await superAdminApi.addDomain({
        tenantId,
        domain: domainInput,
        dnsRecordType,
      });
      setIsAddOpen(false);
      setDomainInput("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to add domain mapping");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDomain = async (domainItem: any) => {
    if (!confirm(`Are you sure you want to remove custom domain '${domainItem.domain}'?`)) return;

    try {
      await superAdminApi.deleteDomain(domainItem.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete domain");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              DNS Architecture & SSL Provisioning
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Custom Domain Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Architecture for White-Label partner custom hostnames with real DNS CNAME/TXT resolution and SSL telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Domain</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* DNS Configuration Architecture Instruction Card */}
      <div className="rounded-xl border bg-muted/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              White-Label Domain Provisioning Architecture
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Standard DNS CNAME / TXT</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Partners point their vanity domain (e.g. <code className="font-mono text-foreground font-semibold">app.theiragency.com</code>)
          to Appnix platform edge. Our DNS engine validates the record via real DNS queries and provisions an automated TLS/SSL certificate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border bg-card text-xs font-mono space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
              Method 1: CNAME Delegation (Recommended)
            </span>
            <div className="flex items-center justify-between text-foreground">
              <span>CNAME Record:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">cname.appnix.co.in</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-card text-xs font-mono space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
              Method 2: TXT Security Verification
            </span>
            <div className="flex items-center justify-between text-foreground">
              <span>TXT Record:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">appnix-verify=[token]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Domains Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading custom domain mapping architecture...</span>
          </div>
        ) : domains.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Globe className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-bold text-sm text-foreground">No Custom Domains Mapped</p>
            <p className="max-w-sm text-muted-foreground">
              No White-Label partner has registered a custom vanity domain yet.
            </p>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Add First Custom Domain
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Custom Domain</th>
                  <th className="py-3 px-4">White-Label Partner</th>
                  <th className="py-3 px-4">DNS Config & Token</th>
                  <th className="py-3 px-4">DNS Verification</th>
                  <th className="py-3 px-4">SSL Provisioning</th>
                  <th className="py-3 px-4">Last Checked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {domains.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    {/* Domain */}
                    <td className="py-3.5 px-4">
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                      >
                        <span>{d.domain}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </td>

                    {/* Partner */}
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{d.partnerName}</span>
                      </div>
                    </td>

                    {/* Expected DNS record */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-sans">
                          {d.dnsRecordType || "CNAME"}
                        </Badge>
                        <span className="text-muted-foreground">{d.dnsExpectedValue}</span>
                      </div>
                      {d.verificationToken && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[140px]">{d.verificationToken}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(d.verificationToken, d.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy Token"
                          >
                            {copiedToken === d.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4">
                      {d.isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[11px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1 text-[11px] font-semibold">
                          <AlertCircle className="h-3 w-3" />
                          <span>Pending DNS</span>
                        </Badge>
                      )}
                    </td>

                    {/* SSL Provisioning */}
                    <td className="py-3.5 px-4">
                      {d.sslStatus === "ACTIVE" || d.sslProvisioned ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold font-mono text-xs">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>TLS 1.3 Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-mono text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Awaiting DNS</span>
                        </span>
                      )}
                    </td>

                    {/* Last Checked */}
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {d.lastCheckedAt ? new Date(d.lastCheckedAt).toLocaleTimeString() : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyingId === d.id}
                          onClick={() => handleVerifyDns(d)}
                          className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <RefreshCw className={`h-3 w-3 ${verifyingId === d.id ? "animate-spin" : ""}`} />
                          <span>{verifyingId === d.id ? "Resolving DNS..." : "Verify DNS"}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDomain(d)}
                          className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove domain mapping"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SuperAdminPagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          loading={loading}
        />
      </div>

      {/* REAL DNS RESOLUTION DIAGNOSTIC MODAL */}
      {dnsResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-card border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                {dnsResultModal.isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    DNS Query Result: {dnsResultModal.domain}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Partner: {dnsResultModal.partner}</p>
                </div>
              </div>
              <button
                onClick={() => setDnsResultModal(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className={`p-3.5 rounded-xl border ${
                  dnsResultModal.isVerified
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-500/30 text-amber-900 dark:text-amber-200"
                }`}
              >
                <p className="font-bold mb-1">
                  {dnsResultModal.isVerified ? "✓ DNS Propagation Verified" : "⚠ DNS Records Not Matching"}
                </p>
                <p className="leading-relaxed">{dnsResultModal.details}</p>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Expected Value:</span>
                  <span className="font-bold text-foreground">{dnsResultModal.expectedValue}</span>
                </div>
                <div className="flex flex-col gap-1 border-t pt-2">
                  <span className="text-muted-foreground font-sans">Resolved Records Found:</span>
                  {dnsResultModal.foundValues?.length > 0 ? (
                    dnsResultModal.foundValues.map((val: string, idx: number) => (
                      <span key={idx} className="font-bold text-foreground bg-background p-1.5 rounded border">
                        {val}
                      </span>
                    ))
                  ) : (
                    <span className="text-rose-600 italic">No DNS records currently resolved for this hostname.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" onClick={() => setDnsResultModal(null)} className="text-xs">
                Close Diagnostics
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DOMAIN MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Map Custom Domain</h3>
                <p className="text-xs text-muted-foreground">Assign a vanity domain to a White-Label partner.</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Target White-Label Partner *</label>
                <select
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background px-3 text-xs"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Custom Domain FQDN *</label>
                <Input
                  required
                  placeholder="e.g. app.apexagency.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Verification Method</label>
                <select
                  value={dnsRecordType}
                  onChange={(e) => setDnsRecordType(e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background px-3 text-xs"
                >
                  <option value="CNAME">CNAME Record (points to cname.appnix.co.in)</option>
                  <option value="TXT">TXT Security Token Record</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {submitting ? "Registering..." : "Map Domain"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
