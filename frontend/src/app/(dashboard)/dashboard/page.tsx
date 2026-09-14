"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/axios";
import {
  MessageSquare,
  Send,
  Bot,
  Zap,
  Users,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  CreditCard,
  UserPlus,
  LayoutGrid,
  Activity,
  BarChart3,
  ChevronRight,
  Headphones,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardData {
  totalConversations: number;
  conversationsChange: string;
  activeCampaigns: number;
  campaignsChange: string;
  botInteractions: number;
  botInteractionsChange: string;
  automationsRunning: number;
  automationsChange: string;
  contactsCount: number;
  contactsChartData: Array<{ date: string; contacts: number }>;
  recentCampaigns: Array<{
    id: string | number;
    name: string;
    channel: string;
    status: string;
    reach: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    status: string;
  }>;
  subscription: {
    plan: string;
    totalDays: number;
    remainingDays: number;
    usedMessages?: number;
    maxMessages?: number;
    usedBots?: number;
    maxBots?: number;
    usedTeamSeats?: number;
    maxTeamSeats?: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [data, setData] = useState<DashboardData>({
    totalConversations: 0,
    conversationsChange: "0%",
    activeCampaigns: 0,
    campaignsChange: "0",
    botInteractions: 0,
    botInteractionsChange: "0%",
    automationsRunning: 0,
    automationsChange: "0",
    contactsCount: 0,
    contactsChartData: [],
    recentCampaigns: [],
    recentActivity: [],
    subscription: {
      plan: "Professional Tier",
      totalDays: 90,
      remainingDays: 90,
      usedMessages: 0,
      maxMessages: 10000,
      usedBots: 0,
      maxBots: 5,
      usedTeamSeats: 1,
      maxTeamSeats: 10,
    },
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await api.get("/dashboard/stats");
        if (res.data?.data && isMounted) {
          setData((prev) => ({
            ...prev,
            ...res.data.data,
            subscription: {
              ...prev.subscription,
              ...(res.data.data.subscription || {}),
            },
          }));
        }
      } catch (err: any) {
        if (err.response?.status === 403) {
          const errCode = err.response?.data?.code;
          const errMsg = err.response?.data?.message || "";
          if (
            errCode === "SUBSCRIPTION_REQUIRED" ||
            errCode === "TENANT_INACTIVE" ||
            errMsg.toLowerCase().includes("subscription")
          ) {
            router.replace("/subscription");
            return;
          }
        }
        console.error("Failed to load dashboard statistics", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const stats = useMemo(
    () => [
      {
        name: t.dashboard.totalConversations,
        value: data.totalConversations.toLocaleString(),
        change: data.conversationsChange,
        icon: MessageSquare,
        iconClass: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
        accentClass: "bg-sky-500",
        trend: data.totalConversations > 0 ? "up" : "neutral",
      },
      {
        name: t.dashboard.activeCampaigns,
        value: data.activeCampaigns.toLocaleString(),
        change: data.campaignsChange,
        icon: Send,
        iconClass: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
        accentClass: "bg-violet-500",
        trend: data.activeCampaigns > 0 ? "up" : "neutral",
      },
      {
        name: t.dashboard.botInteractions,
        value: data.botInteractions.toLocaleString(),
        change: data.botInteractionsChange,
        icon: Bot,
        iconClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
        accentClass: "bg-emerald-500",
        trend: data.botInteractions > 0 ? "up" : "neutral",
      },
      {
        name: t.dashboard.automationsRunning,
        value: data.automationsRunning.toLocaleString(),
        change: data.automationsChange,
        icon: Zap,
        iconClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
        accentClass: "bg-amber-500",
        trend: "neutral",
      },
    ],
    [t, data]
  );

  const quickActions = useMemo(
    () => [
      {
        name: t.dashboard.startCampaign,
        description: "Create and track marketing campaigns and reports.",
        buttonText: t.dashboard.startCampaign,
        href: "/dashboard/campaigns/new",
        icon: Send,
        iconClass: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
        buttonClass: "bg-violet-600 hover:bg-violet-700",
      },
      {
        name: t.dashboard.createBot,
        description: "Create, edit and manage automation bots.",
        buttonText: t.dashboard.createBot,
        href: "/chatbots/builder/new",
        icon: Bot,
        iconClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
        buttonClass: "bg-emerald-600 hover:bg-emerald-700",
      },
      {
        name: "New Automation",
        description: "Set up workflows that run automatically.",
        buttonText: "Set Up Automation",
        href: "/automations/workflow",
        icon: Zap,
        iconClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
        buttonClass: "bg-amber-600 hover:bg-amber-700",
      },
      {
        name: "Import Contacts",
        description: "Manage your customer contacts and segments.",
        buttonText: "Import Now",
        href: "/crm/contacts",
        icon: Users,
        iconClass: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
        buttonClass: "bg-sky-600 hover:bg-sky-700",
      },
    ],
    [t]
  );

  const usedMessages = data.subscription.usedMessages ?? data.totalConversations;
  const maxMessages = data.subscription.maxMessages ?? 10000;
  const usedBots = data.subscription.usedBots ?? (data.botInteractions > 0 ? 1 : 0);
  const maxBots = data.subscription.maxBots ?? 5;
  const usedTeamSeats = data.subscription.usedTeamSeats ?? 1;
  const maxTeamSeats = data.subscription.maxTeamSeats ?? 10;

  const totalDays = data.subscription.totalDays || 90;
  const remainingDays = Math.min(data.subscription.remainingDays ?? 90, totalDays);

  return (
    <div className="space-y-5 sm:space-y-7 px-3 sm:px-0 pb-4">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              Workspace overview
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl break-words">
              {t.auth.welcomeBack}, {user?.name?.split(" ")[0] || "User"}!
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t.dashboard.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end items-center gap-2">
            <Button
              asChild
              className="col-span-2 sm:col-span-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md shadow-emerald-600/15 w-full sm:w-auto"
            >
              <Link href="/products">
                <LayoutGrid className="h-4 w-4" />
                {t.sidebar.products}
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto gap-1.5 shadow-sm">
              <Link href="/dashboard/campaigns/new">
                <Send className="h-4 w-4" />
                {t.dashboard.startCampaign}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5 bg-background/70">
              <Link href="/crm/live-chat">
                <Headphones className="h-4 w-4" />
                {t.dashboard.liveChat}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 w-full min-w-0">
        {stats.map((stat) => (
          <Card key={stat.name} className="group relative min-w-0 overflow-hidden border-border/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className={cn("absolute inset-x-0 top-0 h-0.5", stat.accentClass)} />
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight min-w-0 break-words">
                {stat.name}
              </CardTitle>
              <div
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                  stat.iconClass,
                )}
              >
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 min-w-0">
              <div className="text-2xl sm:text-[1.75rem] font-bold tracking-tight truncate">
                {stat.value}
              </div>
              <p
                className={cn(
                  "text-xs mt-1",
                  stat.trend === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground",
                )}
              >
                {stat.trend === "up" ? (
                  <span className="flex items-center flex-wrap gap-1">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    <span>{stat.change} vs last month</span>
                  </span>
                ) : (
                  "Active workspace metric"
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 w-full min-w-0">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          {/* Contacts Overview */}
          <Card className="min-w-0 border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserPlus className="h-4 w-4 shrink-0" />
                  </span>
                  {t.dashboard.contacts}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground border rounded-lg bg-muted/40 px-2.5 sm:px-3 py-1.5 whitespace-nowrap">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Real-time Growth</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="inline-block rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
                  Total CRM Contacts
                </p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight">
                  {data.contactsCount.toLocaleString()}
                </p>
              </div>

              <div className="h-56 sm:h-64 w-full max-w-full min-w-0 rounded-xl border border-border/70 bg-gradient-to-b from-primary/[0.04] to-transparent p-2 overflow-hidden">
                {data.contactsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.contactsChartData}
                      margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickMargin={6}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        fontSize={10}
                        width={24}
                        tickMargin={2}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="contacts"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Number of Contacts"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No contact growth data recorded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
                    <Send className="h-4 w-4" />
                  </span>
                  {t.dashboard.activeCampaigns}
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                  <Link href="/crm/campaigns">View all <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {data.recentCampaigns.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[560px] sm:min-w-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign Name</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Reach</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentCampaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.name}
                          </TableCell>
                          <TableCell>{c.channel}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                c.status === "Active" &&
                                  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                                c.status === "Scheduled" &&
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {c.reach}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No campaigns created yet. Click &quot;Start Campaign&quot; to begin your first broadcast.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
                    <Activity className="h-4 w-4" />
                  </span>
                  {t.dashboard.recentActivity}
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                  <Link href="/settings/activity-logs">View all <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {data.recentActivity.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-transparent transition-colors",
                        activity.status === "unread"
                          ? "bg-primary/5 border-primary/10"
                          : "hover:bg-muted/50 hover:border-border/70",
                      )}
                    >
                      <div
                        className={cn(
                          "h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
                          activity.type === "message" &&
                            "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                          activity.type === "campaign" &&
                            "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
                          activity.type === "bot" &&
                            "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
                          activity.type === "automation" &&
                            "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
                          activity.type === "contact" &&
                            "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
                        )}
                      >
                        {activity.type === "message" && (
                          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {activity.type === "campaign" && (
                          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {activity.type === "bot" && (
                          <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {activity.type === "automation" && (
                          <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {activity.type === "contact" && (
                          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <p className="font-medium text-foreground text-sm sm:text-base break-words">
                            {activity.title}
                          </p>
                          <div
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium shrink-0",
                              activity.status === "unread" &&
                                "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                              activity.status === "sent" &&
                                "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                              activity.status === "completed" &&
                                "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                              activity.status === "running" &&
                                "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                              activity.status === "added" &&
                                "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
                            )}
                          >
                            {activity.status}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No recent activity logged yet in this workspace.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 sm:space-y-6">
          {/* Current Subscription */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                  <CreditCard className="h-4 w-4 shrink-0" />
                </span>
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-3xl font-bold tracking-tight">
                    {totalDays}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Plan Days</p>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 shadow-sm">
                  {remainingDays} Days Remaining
                </Badge>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, (remainingDays / totalDays) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {Math.max(0, totalDays - remainingDays)} Days Used
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                  <Zap className="h-4 w-4 shrink-0" />
                </span>
                {t.dashboard.quickActions}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              {quickActions.map((action) => (
                <div
                  key={action.name}
                  className="group rounded-xl border border-border/70 bg-muted/[0.18] p-3 sm:p-4 space-y-3 transition-all hover:border-primary/25 hover:bg-primary/[0.03]"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", action.iconClass)}>
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      {action.name}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {action.description}
                  </p>
                  <Button
                    asChild
                    className={cn(
                      "w-full justify-between text-white shadow-sm",
                      action.buttonClass,
                    )}
                  >
                    <Link href={action.href}>
                      <span className="truncate">{action.buttonText}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Workspace Overview */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
                  <BarChart3 className="h-4 w-4" />
                </span>
                {t.dashboard.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium text-foreground">{data.subscription.plan}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="gap-1">
                  <Link href="/workspace/billing">Upgrade <ChevronRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1 gap-2">
                    <span className="text-muted-foreground">
                      Messages Quota
                    </span>
                    <span className="font-medium shrink-0">
                      {usedMessages.toLocaleString()} / {maxMessages.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (usedMessages / (maxMessages || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1 gap-2">
                    <span className="text-muted-foreground">
                      Team Members
                    </span>
                    <span className="font-medium shrink-0">
                      {usedTeamSeats} / {maxTeamSeats}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(100, (usedTeamSeats / (maxTeamSeats || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1 gap-2">
                    <span className="text-muted-foreground">
                      Active Bots
                    </span>
                    <span className="font-medium shrink-0">
                      {usedBots} / {maxBots}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (usedBots / (maxBots || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
