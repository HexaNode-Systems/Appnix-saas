"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { KeyRound, ShieldAlert, Lock, ArrowLeft, Terminal, ShieldCheck } from "lucide-react";

interface SuperAdminAuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function SuperAdminAuthLayout({
  children,
  title = "Super Admin Terminal Access",
  subtitle = "Hardware-enforced zero-trust identity verification for platform root operators",
}: SuperAdminAuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-slate-50 via-slate-50/80 to-amber-50/30 dark:from-zinc-950 dark:via-zinc-900/90 dark:to-zinc-950 text-foreground antialiased selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Background ambient lighting effects matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[360px] bg-amber-500/8 dark:bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-[450px] h-[320px] bg-primary/6 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[300px] bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Security Banner */}
      <header className="w-full border-b border-border/70 bg-background/80 px-4 py-3.5 backdrop-blur-md sm:px-8 shadow-xs sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs group-hover:border-amber-500/40 transition-colors">
                <Image
                  src="/logo-favicon.png"
                  alt="Appnix Logo"
                  width={24}
                  height={24}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-foreground text-base">Appnix</span>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  ROOT PRIVILEGES
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hardware MFA Enforced</span>
            </div>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area: Centered, Clean Container */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Security Alert Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-xs">
              <Terminal className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Platform Tier 0 Access Control</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border/70 bg-card/95 text-card-foreground p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl ring-1 ring-border/50">
            {children}
          </div>

          {/* Audit Notice */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-center text-xs text-amber-800 dark:text-amber-300">
            <Lock className="inline h-3.5 w-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
            Audit Logging Active: Every login attempt and session IP is hashed and written to an immutable audit record.
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-border/60 bg-background/60 backdrop-blur-xs px-4 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Appnix Core Infrastructure. Strict confidentiality mandated.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security Level: EAL4+
            </span>
            <span>•</span>
            <span>FIPS 140-3 Validated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
