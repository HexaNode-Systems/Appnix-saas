"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Settings,
  ArrowLeft,
  ChevronRight,
  Shield,
  Sliders,
  Bell,
  Lock,
  Save,
  CheckCircle2,
  Server,
  Zap,
  Globe,
  Radio,
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "security" | "limits" | "alerts">("general");
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [platformName, setPlatformName] = useState("Appnix SaaS Cloud");
  const [supportEmail, setSupportEmail] = useState("support@appnix.io");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [enforce2fa, setEnforce2fa] = useState(true);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState("12");
  const [defaultApiRateLimit, setDefaultApiRateLimit] = useState("250");
  const [webhookAlertUrl, setWebhookAlertUrl] = useState("https://hooks.slack.com/services/T00/B00/XXXX");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

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
        <span className="font-semibold text-foreground">Console Settings</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-600" />
            Super Admin Console Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure global platform parameters, security policies, rate limit defaults, and alerting webhooks.
          </p>
        </div>

        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {isSaved && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Platform configuration changes propagated to all edge clusters!
        </div>
      )}

      {/* Settings Tab Selector */}
      <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: "general", label: "General & Branding", icon: Globe },
          { id: "security", label: "Security & 2FA Governance", icon: Lock },
          { id: "limits", label: "Platform Quotas & Throttling", icon: Zap },
          { id: "alerts", label: "Alert Dispatchers & Webhooks", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                isSelected
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs max-w-3xl">
        {activeTab === "general" && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Platform Brand Display Name</label>
              <Input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Global Support Escalation Email</label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20 mt-4">
              <div>
                <p className="font-bold text-foreground">Global Platform Maintenance Mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Temporarily display a 503 maintenance splash screen to standard users while allowing staff access.
                </p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
          </form>
        )}

        {activeTab === "security" && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
              <div>
                <p className="font-bold text-foreground">Mandatory 2FA for All Staff Members</p>
                <p className="text-[11px] text-muted-foreground">
                  Require TOTP hardware authenticator or SMS verification on every Super Admin login.
                </p>
              </div>
              <Switch checked={enforce2fa} onCheckedChange={setEnforce2fa} />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Max Idle Session Duration (Hours)</label>
              <Input
                type="number"
                value={sessionTimeoutHours}
                onChange={(e) => setSessionTimeoutHours(e.target.value)}
                className="h-9 text-xs w-48"
              />
            </div>

            <div className="space-y-1 pt-2">
              <label className="font-semibold text-muted-foreground">Allowed Super Admin IP CIDR Ranges</label>
              <Input
                placeholder="103.21.124.0/24, 49.207.210.0/24"
                defaultValue="0.0.0.0/0 (Global Access)"
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Restrict Super Admin console access to office VPN CIDRs.</p>
            </div>
          </div>
        )}

        {activeTab === "limits" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Global Tenant Concurrency Bucket</label>
                <Input
                  value={defaultApiRateLimit}
                  onChange={(e) => setDefaultApiRateLimit(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Max req/sec per standard tenant</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Default Free Storage Quota</label>
                <Input defaultValue="5 GB" className="h-9 text-xs" />
                <p className="text-[10px] text-muted-foreground">Allocated on initial tenant signup</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Background Queue BullMQ Max Concurrency</label>
              <Input defaultValue="64 workers" className="h-9 text-xs w-48" />
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Slack / Discord Webhook URL for Critical Incidents</label>
              <Input
                value={webhookAlertUrl}
                onChange={(e) => setWebhookAlertUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Dispatches real-time alerts on 5xx spike or worker queue backpressure.</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">PagerDuty Integration Key</label>
              <Input
                placeholder="pd-prod-routing-key-xxxx"
                defaultValue="pd-appnix-prod-981a20"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>
        )}

        <div className="pt-5 border-t mt-5 flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
