"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Wallet,
  CreditCard,
  Download,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Search,
  X,
  FileText,
  Receipt,
  ExternalLink,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  BellRing,
  Smartphone,
  Check,
  Building,
  Info,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  RCSIcon,
} from "@/components/landing/channel-icons";
import { downloadCsv, escapeCsvField } from "@/components/crm/csv-utils";

// ---------- Interfaces ----------
export interface WalletTransaction {
  id: string;
  dateTime: string;
  description: string;
  channel: "WhatsApp" | "RCS" | "Meta" | "Wallet" | "Platform";
  type: "credit" | "debit";
  amount: number;
  closingBalance: number;
  referenceId: string;
  receiptNumber: string;
  gstAmount?: number;
}

export interface TaxInvoice {
  id: string;
  month: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  gstAmount: number;
  status: "Paid" | "Generated";
}

// ---------- Mock Initial Data ----------
const initialTransactions: WalletTransaction[] = [
  {
    id: "TXN_892101",
    dateTime: "28 Aug 2026, 04:32 PM",
    description: "Wallet Auto-Recharge - Razorpay UPI Mandate",
    channel: "Wallet",
    type: "credit",
    amount: 5000.0,
    closingBalance: 18450.75,
    referenceId: "pay_Rzp99281726",
    receiptNumber: "INV-2026-08-091",
    gstAmount: 762.71,
  },
  {
    id: "TXN_892100",
    dateTime: "28 Aug 2026, 02:15 PM",
    description: "WhatsApp Conversation Charges - Batch #9821 (1,240 Outbound)",
    channel: "WhatsApp",
    type: "debit",
    amount: 840.2,
    closingBalance: 13450.75,
    referenceId: "meta_batch_9821",
    receiptNumber: "RCPT-WA-892100",
  },
  {
    id: "TXN_892099",
    dateTime: "27 Aug 2026, 06:40 PM",
    description: "RCS Verified Campaign - Flash Sale Notification (Carrier Tier 1)",
    channel: "RCS",
    type: "debit",
    amount: 412.5,
    closingBalance: 14290.95,
    referenceId: "rcs_camp_7718",
    receiptNumber: "RCPT-RCS-892099",
  },
  {
    id: "TXN_892098",
    dateTime: "26 Aug 2026, 11:20 AM",
    description: "Instagram & Facebook Direct Messaging API Usage",
    channel: "Meta",
    type: "debit",
    amount: 185.0,
    closingBalance: 14703.45,
    referenceId: "ig_meta_4401",
    receiptNumber: "RCPT-META-892098",
  },
  {
    id: "TXN_892097",
    dateTime: "24 Aug 2026, 09:10 AM",
    description: "Manual Wallet Top-up - Corporate Credit Card (HDFC)",
    channel: "Wallet",
    type: "credit",
    amount: 10000.0,
    closingBalance: 14888.45,
    referenceId: "pay_Card881920",
    receiptNumber: "INV-2026-08-084",
    gstAmount: 1525.42,
  },
  {
    id: "TXN_892096",
    dateTime: "22 Aug 2026, 03:45 PM",
    description: "WhatsApp Authentication OTP Deductions (Batch of 450)",
    channel: "WhatsApp",
    type: "debit",
    amount: 67.5,
    closingBalance: 4888.45,
    referenceId: "wa_otp_2208",
    receiptNumber: "RCPT-WA-892096",
  },
  {
    id: "TXN_892095",
    dateTime: "19 Aug 2026, 01:12 PM",
    description: "DLT SMS Fallback Router Charges",
    channel: "Platform",
    type: "debit",
    amount: 45.2,
    closingBalance: 4955.95,
    referenceId: "dlt_sms_9918",
    receiptNumber: "RCPT-DLT-892095",
  },
];

const mockInvoices: TaxInvoice[] = [
  {
    id: "inv_1",
    month: "August 2026",
    invoiceNumber: "APNX-GST-2026-08",
    date: "29 Aug 2026",
    totalAmount: 15000.0,
    gstAmount: 2288.13,
    status: "Paid",
  },
  {
    id: "inv_2",
    month: "July 2026",
    invoiceNumber: "APNX-GST-2026-07",
    date: "31 Jul 2026",
    totalAmount: 12500.0,
    gstAmount: 1906.78,
    status: "Paid",
  },
  {
    id: "inv_3",
    month: "June 2026",
    invoiceNumber: "APNX-GST-2026-06",
    date: "30 Jun 2026",
    totalAmount: 10000.0,
    gstAmount: 1525.42,
    status: "Paid",
  },
];

export default function ChannelsBalancePage() {
  // Live State
  const [currentBalance, setCurrentBalance] = useState<number>(18450.75);
  const [monthlyBurn, setMonthlyBurn] = useState<number>(8920.4);
  const [isRefreshingMeta, setIsRefreshingMeta] = useState<boolean>(false);
  const [metaPrepaidBalance, setMetaPrepaidBalance] = useState<string>("39.1918 INR");

  // Transaction History Table State
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialTransactions);
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<WalletTransaction | null>(null);

  // Recharge Form State
  const [selectedPresetAmount, setSelectedPresetAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isRecharging, setIsRecharging] = useState<boolean>(false);

  // Auto-Recharge Settings State
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState<boolean>(true);
  const [thresholdAmount, setThresholdAmount] = useState<string>("2000");
  const [autoRechargeAmount, setAutoRechargeAmount] = useState<string>("5000");
  const [whatsappAlerts, setWhatsappAlerts] = useState<boolean>(true);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesChannel = channelFilter === "all" || t.channel.toLowerCase() === channelFilter.toLowerCase();
      const matchesSearch =
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesChannel && matchesSearch;
    });
  }, [transactions, typeFilter, channelFilter, searchQuery]);

  // Refresh Meta Prepaid Balance Action
  const handleRefreshMetaBalance = () => {
    setIsRefreshingMeta(true);
    setTimeout(() => {
      setMetaPrepaidBalance("39.1918 INR");
      setIsRefreshingMeta(false);
    }, 600);
  };

  // Perform Wallet Recharge
  const handlePerformRecharge = () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedPresetAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    setIsRecharging(true);
    setTimeout(() => {
      const newBal = currentBalance + finalAmount;
      setCurrentBalance(newBal);

      const newTxn: WalletTransaction = {
        id: `TXN_${Math.floor(100000 + Math.random() * 900000)}`,
        dateTime: "Just now",
        description: `Wallet Recharge - ${paymentMethod.toUpperCase()} Online Gateway`,
        channel: "Wallet",
        type: "credit",
        amount: finalAmount,
        closingBalance: newBal,
        referenceId: `pay_Appnx_${Date.now().toString().slice(-8)}`,
        receiptNumber: `INV-2026-08-${Math.floor(100 + Math.random() * 900)}`,
        gstAmount: parseFloat(((finalAmount * 0.18) / 1.18).toFixed(2)),
      };

      setTransactions([newTxn, ...transactions]);
      setIsRecharging(false);
      setIsRechargeModalOpen(false);
      setCustomAmount("");
    }, 800);
  };

  // Export Transactions CSV
  const handleExportCsv = () => {
    const headers = [
      "Transaction ID",
      "Date & Time",
      "Description",
      "Channel",
      "Type",
      "Amount (INR)",
      "Closing Balance (INR)",
      "Reference ID",
      "Receipt Number",
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.dateTime,
      t.description,
      t.channel,
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      t.closingBalance.toFixed(2),
      t.referenceId,
      t.receiptNumber,
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((r) => r.map(escapeCsvField).join(",")),
    ].join("\r\n");

    downloadCsv(`wallet_transactions_${Date.now()}.csv`, csvLines);
  };

  // Save Settings Trigger
  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const getEffectiveRechargeAmount = () => {
    if (customAmount) {
      const num = parseFloat(customAmount);
      return isNaN(num) ? 0 : num;
    }
    return selectedPresetAmount;
  };

  const rechargeBase = getEffectiveRechargeAmount();
  const rechargeGst = (rechargeBase * 0.18);
  const rechargeTotal = rechargeBase + rechargeGst;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Channels</span>
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <Link
            href="/channels"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            All Channels
          </Link>

        </div>

        {/* Title Bar & Main Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Account Balance & Wallet Overview
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                Prepaid Wallet
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Manage prepaid credits, auto-recharge settings, and channel-wise spending.
            </p>
          </div>

          {/* Action Buttons: Add Funds + Download Invoices */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInvoicesModalOpen(true)}
              className="text-xs h-9 font-medium gap-1.5 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Invoices</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsRechargeModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Funds / Recharge Wallet</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Financial KPI Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Current Available Balance */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <button
              onClick={() => {
                setCurrentBalance((b) => b);
              }}
              title="Refresh Balance"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Live Sync</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Current Available Balance</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            ₹{currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px]">
            <span className="text-muted-foreground">Unified Prepaid Credits</span>
            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              + Quick Recharge
            </button>
          </div>
        </div>

        {/* KPI 2: Monthly Burn / Usage */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold gap-1">
              <TrendingUp className="h-3 w-3" />
              +12.4%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Monthly Burn / Usage</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            ₹{monthlyBurn.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
            <span>Cycle: 01 Aug - 29 Aug</span>
            <span className="font-medium text-foreground">34,180 messages</span>
          </div>
        </div>

        {/* KPI 3: Estimated Runway */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
              Safe Zone
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Estimated Runway</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            ~22 Days
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
            <span>Burn: ~₹838.60 / day</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">&gt; 15 days buffer</span>
          </div>
        </div>

        {/* KPI 4: Low Balance Alert Status */}
        <div className="rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <Badge className={cn(
              "text-[11px] font-semibold",
              autoRechargeEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground"
            )}>
              {autoRechargeEnabled ? "Auto-Recharge: ON" : "Auto-Recharge: OFF"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Low Balance Alert</p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            ₹{parseFloat(thresholdAmount).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
            <span>Trigger at ₹{thresholdAmount}</span>
            <span className="font-medium text-primary">Recharge +₹{autoRechargeAmount}</span>
          </div>
        </div>
      </div>

      {/* 3. Channel-Wise Balance & Spending Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Channel-Wise Balance & Spending Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live consumption distribution and carrier API quotas across your connected channels.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Billing Cycle: August 2026
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: WhatsApp Cloud API */}
          <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs transition-all hover:border-emerald-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <WhatsAppIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">WhatsApp Cloud API</h3>
                  <p className="text-[10px] text-muted-foreground">Official Business Number</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                65.5% share
              </Badge>
            </div>

            {/* Meta Prepaid Account Specific Balance Callout */}
            <div className="rounded-xl bg-muted/30 border p-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Meta Account Balance</p>
                <p className="font-mono font-bold text-foreground mt-0.5">{metaPrepaidBalance}</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshMetaBalance}
                className="text-primary hover:text-primary/80 text-[11px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshingMeta && "animate-spin")} />
                <span>Fetch</span>
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Consumption:</span>
                <span className="font-bold text-foreground">₹5,840.20</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Marketing / Utility / Auth:</span>
                <span>28,210 sessions</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "65.5%" }} />
              </div>
              <div className="pt-1.5 border-t">
                <Link
                  href="/channels/whatsapp/balance"
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-between"
                >
                  <span>View Micro-Deduction Ledger</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: RCS Business Messaging */}
          <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs transition-all hover:border-violet-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                  <RCSIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">RCS Business Messaging</h3>
                  <p className="text-[10px] text-muted-foreground">Verified Brand Agent</p>
                </div>
              </div>
              <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
                20.6% share
              </Badge>
            </div>

            <div className="rounded-xl bg-muted/30 border p-2.5 space-y-1 text-xs">
              <p className="text-[10px] text-muted-foreground">Carrier Distribution</p>
              <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                <span>Jio (52%)</span>
                <span>Airtel (34%)</span>
                <span>Vi (14%)</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Consumption:</span>
                <span className="font-bold text-foreground">₹1,840.50</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Rich Cards & Carousels:</span>
                <span>3,750 sessions</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: "20.6%" }} />
              </div>
            </div>
          </div>

          {/* Card 3: Meta Direct (Instagram & FB) */}
          <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs transition-all hover:border-pink-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center">
                  <InstagramIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Meta IG & Facebook</h3>
                  <p className="text-[10px] text-muted-foreground">Direct Message APIs</p>
                </div>
              </div>
              <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-[10px]">
                10.0% share
              </Badge>
            </div>

            <div className="rounded-xl bg-muted/30 border p-2.5 space-y-1 text-xs">
              <p className="text-[10px] text-muted-foreground">Platform Protocol</p>
              <p className="font-medium text-foreground text-[11px]">IG Automation & Messenger Handover</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Consumption:</span>
                <span className="font-bold text-foreground">₹890.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Story & DM Triggers:</span>
                <span>16,330 messages</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: "10.0%" }} />
              </div>
            </div>
          </div>

          {/* Card 4: SMS / Fallback OTP & Platform */}
          <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs transition-all hover:border-blue-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Smartphone className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">SMS & Fallback OTP</h3>
                  <p className="text-[10px] text-muted-foreground">DLT Telecom Routing</p>
                </div>
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                3.9% share
              </Badge>
            </div>

            <div className="rounded-xl bg-muted/30 border p-2.5 space-y-1 text-xs">
              <p className="text-[10px] text-muted-foreground">DLT Route Backup</p>
              <p className="font-medium text-foreground text-[11px]">Primary Failover Active</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Consumption:</span>
                <span className="font-bold text-foreground">₹349.70</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Fallback Deliveries:</span>
                <span>1,420 OTPs</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "3.9%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Transaction & Usage History Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-muted/10 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transaction ID, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 h-9 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  typeFilter === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("credit")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  typeFilter === "credit" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                Credits / Recharge
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("debit")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  typeFilter === "debit" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                )}
              >
                Usage Deductions
              </button>
            </div>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2.5 text-xs text-foreground cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="rcs">RCS</option>
              <option value="meta">Meta (IG/FB)</option>
              <option value="wallet">Wallet Top-up</option>
              <option value="platform">Platform Fee</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
            <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs gap-1 shadow-xs"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Transaction ID & Date
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground">
                  Channel / Service
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Amount (INR)
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Closing Balance
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Receipt / Voucher
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    No transactions match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    {/* ID & Date */}
                    <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-foreground">{item.id}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.dateTime}</p>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-foreground leading-snug">{item.description}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Ref: {item.referenceId}</p>
                    </td>

                    {/* Channel Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.channel === "WhatsApp" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          WhatsApp
                        </Badge>
                      ) : item.channel === "RCS" ? (
                        <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
                          RCS
                        </Badge>
                      ) : item.channel === "Meta" ? (
                        <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-[10px]">
                          Meta Direct
                        </Badge>
                      ) : item.channel === "Wallet" ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Wallet Top-up
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Platform Fee
                        </Badge>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                      {item.type === "credit" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <ArrowDownLeft className="h-3 w-3" />
                          +₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-foreground flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          -₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Closing Balance */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      ₹{item.closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Action: Receipt */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedReceipt(item)}
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Voucher</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border-t bg-muted/10 text-xs text-muted-foreground gap-3">
          <span>Displaying latest wallet audit trail</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled className="h-7 text-xs px-2.5">
              Previous
            </Button>
            <Button size="sm" className="h-7 w-7 p-0 bg-primary text-primary-foreground font-semibold">
              1
            </Button>
            <Button variant="outline" size="sm" disabled className="h-7 text-xs px-2.5">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Auto-Recharge & Low Balance Notification Settings Card */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Auto-Recharge & Alert Rules</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure zero downtime for messaging campaigns and customer conversations.
              </p>
            </div>
          </div>
          {settingsSaved && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1">
              <Check className="h-3 w-3" />
              Settings Saved Successfully
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Auto Recharge Mandate Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <label htmlFor="auto-recharge-toggle" className="text-xs font-bold text-foreground cursor-pointer">
                  Enable Automatic Wallet Recharge
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically add funds whenever your balance falls below the threshold.
                </p>
              </div>
              <input
                id="auto-recharge-toggle"
                type="checkbox"
                checked={autoRechargeEnabled}
                onChange={(e) => setAutoRechargeEnabled(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Low Balance Trigger (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                    disabled={!autoRechargeEnabled}
                    className="pl-6 h-9 text-xs bg-background"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Triggers when balance &lt; threshold</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Auto-Recharge Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    value={autoRechargeAmount}
                    onChange={(e) => setAutoRechargeAmount(e.target.value)}
                    disabled={!autoRechargeEnabled}
                    className="pl-6 h-9 text-xs bg-background"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Amount debited via saved mandate</span>
              </div>
            </div>

            {/* Payment Mandate Preview */}
            <div className="rounded-xl border p-3 flex items-center justify-between text-xs bg-card">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">HDFC Bank Visa ending •••• 4092</p>
                  <p className="text-[10px] text-muted-foreground">E-Mandate Registered • Max limit ₹25,000</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/10">
                Change
              </Button>
            </div>
          </div>

          {/* Right Column: Notification Alerts Channels */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground">Low Balance Notification Channels</h3>
            <p className="text-xs text-muted-foreground -mt-2">
              Receive immediate real-time alerts before your balance is exhausted.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <WhatsAppIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">WhatsApp Instant Alert</p>
                    <p className="text-[11px] text-muted-foreground">Instant WhatsApp Alerts for Admins</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-card text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Email Notifications & Invoices</p>
                    <p className="text-[11px] text-muted-foreground">Notify Billing: admin@appnix.info</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveSettings}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 shadow-xs"
              >
                Save Notification Rules
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RECHARGE WALLET MODAL */}
      {/* ========================================================= */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Recharge Prepaid Wallet</h3>
                  <p className="text-xs text-muted-foreground">Instant balance top-up for WhatsApp, RCS & Meta</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRechargeModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Select Amount (INR):</label>
              <div className="grid grid-cols-4 gap-2">
                {[2000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedPresetAmount(amt);
                      setCustomAmount("");
                    }}
                    className={cn(
                      "py-2 rounded-xl border text-xs font-bold transition-all",
                      !customAmount && selectedPresetAmount === amt
                        ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                        : "border-border bg-card hover:bg-muted/40 text-foreground"
                    )}
                  >
                    ₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Or Enter Custom Amount:</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-7 h-10 text-sm font-semibold bg-background"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Payment Method:</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === "upi"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span>UPI / QR</span>
                  <span className="text-[10px] text-muted-foreground font-normal">GPay / PhonePe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span>Cards</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Visa / Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === "netbanking"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span>Netbanking</span>
                  <span className="text-[10px] text-muted-foreground font-normal">All Major Banks</span>
                </button>
              </div>
            </div>

            {/* Tax & Total Summary Box */}
            <div className="rounded-xl bg-muted/30 border p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Wallet Recharge Base:</span>
                <span className="font-medium text-foreground">₹{rechargeBase.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18% Input Credit):</span>
                <span className="font-medium text-foreground">₹{rechargeGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
                <span>Total Payable:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{rechargeTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRechargeModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isRecharging || rechargeBase <= 0}
                onClick={handlePerformRecharge}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm gap-1.5"
              >
                {isRecharging ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing Gateway...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Pay ₹{rechargeTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DOWNLOAD INVOICES & TAX STATEMENTS */}
      {/* ========================================================= */}
      {isInvoicesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Tax Invoices & GST Statements</h3>
                  <p className="text-xs text-muted-foreground">Download compliant tax invoices with input tax credit</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsInvoicesModalOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* GSTIN Summary Card */}
            <div className="rounded-xl border bg-muted/20 p-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-foreground">Appnix Technology Pvt Ltd</p>
                <p className="text-muted-foreground font-mono mt-0.5">GSTIN: 27AAACA1234A1Z5 • State: Maharashtra (27)</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                GST Verified
              </Badge>
            </div>

            {/* Invoices List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Invoices</h4>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Month</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Invoice No.</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Total (INR)</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mockInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-medium text-foreground">{inv.month}</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground font-mono">
                          ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                          ₹{inv.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.print()}
                            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>PDF</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInvoicesModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TRANSACTION VOUCHER / RECEIPT MODAL */}
      {/* ========================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Transaction Voucher</h3>
                  <p className="font-mono text-xs text-muted-foreground">{selectedReceipt.id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedReceipt(null)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-medium text-foreground">{selectedReceipt.dateTime}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Service Channel:</span>
                <span className="font-semibold text-foreground">{selectedReceipt.channel}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium text-foreground max-w-[220px] text-right">{selectedReceipt.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Reference ID:</span>
                <span className="font-mono text-foreground">{selectedReceipt.referenceId}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono text-foreground">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between py-1 pt-2 font-bold text-sm text-foreground">
                <span>Amount:</span>
                <span className={selectedReceipt.type === "credit" ? "text-emerald-600" : "text-foreground"}>
                  {selectedReceipt.type === "credit" ? "+" : "-"}₹{selectedReceipt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="text-xs h-8 gap-1"
              >
                <Printer className="h-3 w-3" />
                Print Voucher
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="text-xs h-8"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
