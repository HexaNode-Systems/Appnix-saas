"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ServiceHealth } from "@/super-admin/types";
import { systemHealthService } from "@/super-admin/services";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  Clock,
  ShieldCheck,
  Radio,
  Cpu,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const latencyData = [
  { time: "00:00", p50: 85, p95: 140, p99: 210 },
  { time: "04:00", p50: 78, p95: 125, p99: 190 },
  { time: "08:00", p50: 110, p95: 180, p99: 290 },
  { time: "12:00", p50: 142, p95: 220, p99: 340 },
  { time: "16:00", p50: 135, p95: 210, p99: 310 },
  { time: "20:00", p50: 105, p95: 165, p99: 240 },
];

export default function SuperAdminSystemHealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = () => {
    setIsRefreshing(true);
    systemHealthService.getHealth().then((res) => {
      setServices(res);
      setTimeout(() => setIsRefreshing(false), 500);
    });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
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
        <span className="font-semibold text-foreground">System Health</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-600" />
            System Health & Infrastructure Telemetry
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Distributed microservices status, latency percentiles, worker backpressure, and edge nodes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          disabled={isRefreshing}
          className="text-xs font-semibold gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh Metrics
        </Button>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Platform Status</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">99.98%</p>
          <p className="text-[11px] text-muted-foreground mt-1">30-day cumulative uptime</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Median API Latency</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">114 ms</p>
          <p className="text-[11px] text-emerald-600 mt-1">p50 benchmark across edge</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Global Error Rate</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground">0.018%</p>
          <p className="text-[11px] text-emerald-600 mt-1">Well below 0.1% SLA threshold</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Throughput</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground">14.2k</p>
          <p className="text-[11px] text-muted-foreground mt-1">HTTP & WS reqs / minute</p>
        </div>
      </div>

      {/* Latency Percentiles Chart */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Edge Latency Distribution (Last 24 Hours)</h2>
            <p className="text-xs text-muted-foreground">Tracking p50, p95, and p99 response duration.</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> p50 Median
            </span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> p95 SLA
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> p99 Peak
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} unit="ms" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="p99" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} name="p99 Peak" />
              <Area type="monotone" dataKey="p95" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} name="p95 SLA" />
              <Area type="monotone" dataKey="p50" stroke="#059669" fill="#059669" fillOpacity={0.2} name="p50 Median" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Infrastructure Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Service Gateway Infrastructure Health</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((srv) => {
            const isOperational = srv.status === "Operational";
            const isDegraded = srv.status === "Degraded";

            return (
              <div
                key={srv.id}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-xs transition-all space-y-3",
                  isDegraded && "border-amber-400/60 bg-amber-50/10 dark:bg-amber-950/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-foreground line-clamp-1">{srv.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {srv.category}
                    </p>
                  </div>

                  <Badge
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0",
                      isOperational && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                      isDegraded && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                      srv.status === "Down" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    )}
                  >
                    {srv.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t text-muted-foreground">
                  <div>
                    <span>Response</span>
                    <p className="font-mono font-bold text-foreground">{srv.responseTimeMs} ms</p>
                  </div>
                  <div>
                    <span>Uptime</span>
                    <p className="font-mono font-bold text-emerald-600">{srv.uptimePercentage}%</p>
                  </div>
                </div>

                {srv.lastIncident && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 p-1.5 rounded-md border border-amber-200 dark:border-amber-900">
                    ⚠ {srv.lastIncident}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
