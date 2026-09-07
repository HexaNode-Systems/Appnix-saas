"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, ArrowLeft } from "lucide-react";

interface AdminAuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export function AdminAuthLayout({
  children,
  title = "Administrative Console",
  subtitle = "Secure portal for platform administrators and white-label resellers",
  badgeText = "Restricted Administrative Area",
}: AdminAuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-slate-50 via-slate-50/80 to-blue-50/40 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 text-foreground antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting effects matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[360px] bg-primary/8 dark:bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-[450px] h-[320px] bg-blue-400/8 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[300px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Security Banner */}
      <header className="w-full border-b border-border/70 bg-background/80 px-4 py-3.5 backdrop-blur-md sm:px-8 shadow-xs sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs group-hover:border-primary/40 transition-colors">
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
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Admin OS
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/60">
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>TLS 1.3 End-to-End Encrypted</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Workspace Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area: Centered, Clean Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Badge & Title Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{badgeText}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Form & Card Wrapper */}
          <div className="rounded-2xl border border-border/70 bg-card/95 text-card-foreground p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl ring-1 ring-border/50">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Compliance & Policy Footer */}
      <footer className="w-full border-t border-border/60 bg-background/60 backdrop-blur-xs px-4 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Appnix Technologies Pvt. Ltd. All unauthorized access attempts are monitored and logged.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              SOC2 Type II Compliant
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
