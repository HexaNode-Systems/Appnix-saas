"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clientService, analyticsService } from "@/super-admin/services";
import { AddClientModal } from "@/super-admin/components/clients/AddClientModal";
import {
  Users,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Database,
  Zap,
  LifeBuoy,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Activity,
  HardDrive,
  ShieldAlert,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

export default function SuperAdminDashboardPage() {
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalClientsCount, setTotalClientsCount] = useState(2481);

  useEffect(() => {
    analyticsService.getGrowthChartData().then(setChartData);
    clientService.getAll().then((clients) => {
      if (clients.length > 0) {
        setTotalClientsCount(2481 + clients.length - 7);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Super Admin Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Hey Sarah, here&apos;s your platform today.
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Real-time multi-tenant analytics, infrastructure utilization, and client operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Sub-Navigation Tabs */}
          <div className="inline-flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs font-semibold">
            <Link
              href="/super-admin/dashboard"
              className="bg-card text-foreground px-3 py-1.5 rounded-md shadow-xs"
            >
              Dashboard
            </Link>
            <Link
              href="/super-admin/clients"
              className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
            >
              Clients
            </Link>
            <Link
              href="/super-admin/billing"
              className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
            >
              Billing
            </Link>
          </div>

          <Button
            onClick={() => setIsAddClientOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Client
          </Button>
        </div>
      </div>

      {/* Main Dashboard Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clients Overview & Growth Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clients Overview Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clients Overview
                </p>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    {totalClientsCount.toLocaleString()}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% vs last month
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 bg-muted/20 text-muted-foreground w-fit">
                <Calendar className="h-3.5 w-3.5" />
                <span>Last 30 Days</span>
              </div>
            </div>

            {/* Growth Curve Chart */}
            <div className="h-72 w-full rounded-xl border bg-muted/10 p-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickLine={false} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clients"
                    stroke="#059669"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#clientGrad)"
                    dot={{ r: 5, fill: "#059669" }}
                    activeDot={{ r: 7 }}
                    name="Active Client Tenants"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Metrics Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5 text-primary">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Active Workspaces</p>
              <p className="text-2xl font-bold mt-0.5 text-foreground">2,340</p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">94.3% retention rate</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-2.5 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Monthly Platform MRR</p>
              <p className="text-2xl font-bold mt-0.5 text-foreground">$84,250</p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">+18.4% YoY</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mb-2.5 text-indigo-600 dark:text-indigo-400">
                <LifeBuoy className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Support Escalations</p>
              <p className="text-2xl font-bold mt-0.5 text-foreground">4 Active</p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">1 Urgent on-call</p>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Usage, Quick Actions & Health */}
        <div className="space-y-6">
          {/* Current Plan Usage Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Current Plan Usage</h2>
              <Badge variant="outline" className="text-[10px] font-semibold">
                Global Quota
              </Badge>
            </div>

            {/* API Requests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  API Requests
                </span>
                <span className="font-bold text-foreground">8.4M / 10M</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "84%" }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">84% Capacity utilized</p>
            </div>

            {/* Storage */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  Media & Object Storage
                </span>
                <span className="font-bold text-foreground">42GB / 50GB</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "84%" }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">8GB Available</p>
            </div>

            <Button
              variant="outline"
              onClick={() => alert("Redirecting to Infrastructure Capacity Provisioner...")}
              className="w-full text-xs font-semibold text-foreground hover:bg-muted"
            >
              Upgrade Limits
            </Button>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-foreground mb-1">Quick Actions</h2>

            <Link
              href="/super-admin/clients"
              className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors group text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <span>Manage Clients</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/super-admin/billing"
              className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors group text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>Manage Billing & Plans</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/super-admin/support"
              className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors group text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <span>Support Tickets Triage</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onClientAdded={(newClient) => {
          clientService.create(newClient).then(() => {
            setTotalClientsCount((prev) => prev + 1);
            alert(`Client ${newClient.name} provisioned successfully!`);
          });
        }}
      />
    </div>
  );
}
