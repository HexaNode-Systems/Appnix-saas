"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import {
  DollarSign,
  TrendingUp,
  Users,
  ShieldCheck,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export interface PartnerCommissionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: any | null;
}

export function PartnerCommissionHistoryModal({
  isOpen,
  onClose,
  partner,
}: PartnerCommissionHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!partner?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getPartnerCommissionHistory(partner.id);
      setHistoryData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load commission history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && partner?.id) {
      fetchHistory();
    } else {
      setHistoryData(null);
      setError(null);
    }
  }, [isOpen, partner?.id]);

  if (!partner) return null;

  const lifetimeFee = historyData?.lifetimeFee ?? partner.lifetimeFee ?? partner.pricing?.setupFee ?? 0;
  const paymentStatus = historyData?.paymentStatus ?? partner.paymentStatus ?? (partner.pricing?.setupFeePaid ? "PAID" : "PENDING");
  const activeClients = historyData?.activeClients ?? partner.clientCount ?? 0;
  const commissionPerClient = historyData?.commissionPerClient ?? partner.commissionPerClient ?? partner.pricing?.perClientRate ?? 499;
  const monthlyCommissionRevenue = historyData?.monthlyCommissionRevenue ?? partner.monthlyCommissionRevenue ?? (activeClients * commissionPerClient);
  const totalCommissionRevenue = historyData?.totalCommissionRevenue ?? partner.totalCommissionRevenue ?? monthlyCommissionRevenue;
  const partnerMargin = historyData?.partnerMargin ?? partner.partnerMargin ?? Math.max(0, (activeClients * 1999) - monthlyCommissionRevenue);
  const marginPercentage = historyData?.marginPercentage ?? partner.partnerMarginPercentage ?? 75;
  const historyList = historyData?.history || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border bg-card">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <span>White-Label Commission & Lifetime License</span>
                </DialogTitle>
                <Badge
                  className={
                    partner.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]"
                  }
                >
                  {partner.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Partner: <strong className="text-foreground">{partner.name}</strong> • slug:{" "}
                <span className="font-mono">{partner.slug}</span>
              </DialogDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
              className="h-8 text-xs gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Lifetime License & Revenue Economics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Lifetime Fee & License */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Lifetime White-Label Fee
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black font-mono text-foreground">
              ₹{Number(lifetimeFee).toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                className={
                  paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold"
                }
              >
                {paymentStatus}
              </Badge>
              <span className="text-[10px] text-muted-foreground">Permanent • No Expiry</span>
            </div>
          </div>

          {/* Card 2: Active Clients & Commission Rate */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Commission / Client
              </span>
              <Users className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              ₹{Number(commissionPerClient).toLocaleString("en-IN")}
              <span className="text-xs font-normal text-muted-foreground">/cl/mo</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Active Clients: <strong className="text-foreground">{activeClients}</strong>
            </div>
          </div>

          {/* Card 3: Monthly & Total Commission Revenue */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Monthly Commission
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-foreground">
              ₹{Number(monthlyCommissionRevenue).toLocaleString("en-IN")}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Total Cumulative: <strong className="font-mono text-foreground">₹{Number(totalCommissionRevenue).toLocaleString("en-IN")}</strong>
            </div>
          </div>

          {/* Card 4: Partner Retained Margin */}
          <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Partner Net Margin
              </span>
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-300">
              ₹{Number(partnerMargin).toLocaleString("en-IN")}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Retained Margin: <strong className="text-amber-700 dark:text-amber-400">{marginPercentage}%</strong>
            </div>
          </div>
        </div>

        {/* Explainer Banner */}
        <div className="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs text-muted-foreground flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">
              White-Label Lifetime License Policy
            </p>
            <p className="mt-0.5 leading-relaxed text-[11px]">
              This partner holds a <strong>one-time lifetime White-Label license</strong> (₹{Number(lifetimeFee).toLocaleString("en-IN")}). No annual or monthly platform renewal is charged. Appnix separately earns a monthly commission of ₹{Number(commissionPerClient).toLocaleString("en-IN")} for every active end-client onboarded. The partner sets their own retail prices and retains 100% of their margin.
            </p>
          </div>
        </div>

        {/* Commission History Ledger Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Monthly Commission & Revenue Ledger</span>
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {historyList.length} billing {historyList.length === 1 ? "cycle" : "cycles"} tracked
            </span>
          </div>

          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <span>Loading monthly commission records...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No commission history available for this partner yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3.5">Billing Period</th>
                      <th className="py-2.5 px-3.5">Active Clients</th>
                      <th className="py-2.5 px-3.5">Commission Rate</th>
                      <th className="py-2.5 px-3.5">Appnix Commission</th>
                      <th className="py-2.5 px-3.5">Partner Gross</th>
                      <th className="py-2.5 px-3.5">Partner Margin</th>
                      <th className="py-2.5 px-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {historyList.map((item: any) => (
                      <tr key={item.period} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-foreground font-sans">
                          {item.label}
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {item.period}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-foreground font-bold">
                          {item.activeClients}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          ₹{item.commissionRate}/cl
                        </td>
                        <td className="py-2.5 px-3.5 text-emerald-700 dark:text-emerald-400 font-bold">
                          ₹{Number(item.commissionEarned || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          ₹{Number(item.retailRevenue || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-amber-700 dark:text-amber-300">
                          ₹{Number(item.partnerMargin || 0).toLocaleString("en-IN")}
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">
                            ({item.marginPercentage}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-sans">
                          <Badge
                            className={
                              item.status === "CURRENT"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]"
                                : item.status === "SETTLED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
                                : "bg-muted text-muted-foreground text-[10px]"
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
