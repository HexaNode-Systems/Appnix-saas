"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import { InsideClientsSection } from "@/super-admin/components/clients/InsideClientsSection";

export default function AdminInsideClientsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <Link
          href="/admin/clients"
          className="font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Clients
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground flex items-center gap-1 text-purple-600 dark:text-purple-400">
          <Sparkles className="h-3 w-3" />
          Inside Clients (App / Admin)
        </span>
      </div>

      {/* Main Inside Clients Section */}
      <InsideClientsSection isSuperAdmin={false} />
    </div>
  );
}
