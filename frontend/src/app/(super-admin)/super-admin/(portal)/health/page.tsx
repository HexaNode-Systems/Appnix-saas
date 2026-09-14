"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { superAdminApi } from "@/super-admin/services/superAdminApi";
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  HardDrive,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function SuperAdminHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getSystemHealth();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load system health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0m";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            System, API & Webhook Health
          </h1>
    
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadHealth}
          disabled={loading}
          className="h-9 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Ping Services</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed flex-1">{error}</p>
        </div>
      )}

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Status
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <p className="text-xl font-black text-foreground">{data?.status || "Operational"}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">All subsystems responding</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Core Process Uptime
          </span>
          <p className="text-xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : formatUptime(data?.uptimeSeconds)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Continuous Node.js runtime</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Process Memory (RSS)
          </span>
          <p className="text-xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : `${data?.systemMetrics?.processMemoryMb?.rss || 0} MB`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Heap: {data?.systemMetrics?.processMemoryMb?.heapUsed || 0} MB utilized
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Node Engine / Arch
          </span>
          <p className="text-xl font-black text-foreground font-mono mt-2">
            {loading ? "..." : data?.systemMetrics?.nodeVersion || "Node.js"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Platform: {data?.systemMetrics?.platform}
          </p>
        </div>
      </div>

      {/* Microservices Diagnostic Cards */}
      <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">Infrastructure Services Health</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Pinging microservices and verifying round-trip response times...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.services?.map((svc: any) => (
              <div
                key={svc.name}
                className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          svc.status === "Operational" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <h4 className="font-bold text-xs text-foreground">{svc.name}</h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium pl-4 block mt-0.5">
                      Category: {svc.category}
                    </span>
                  </div>

                  <Badge
                    className={
                      svc.status === "Operational"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold text-[10px]"
                    }
                  >
                    {svc.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{svc.details}</p>

                <div className="flex items-center justify-between pt-2 border-t text-xs font-mono">
                  <span className="text-muted-foreground">Response Latency:</span>
                  <span
                    className={`font-bold ${
                      svc.responseTimeMs < 100
                        ? "text-emerald-600"
                        : svc.responseTimeMs < 300
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {svc.responseTimeMs} ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
