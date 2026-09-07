"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { LeadFormModal } from "@/components/landing/lead-form-modal";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500 selection:text-white">
      {/* Standard Customer Header / Navigation */}
      <Navbar onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">{children}</main>

      {/* Standard Customer Footer */}
      <Footer onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* Reusable Lead Capture / Demo Modal */}
      <LeadFormModal
        isOpen={demoModalOpen}
        onOpenChange={setDemoModalOpen}
        defaultInterest="all"
        source="client_layout"
      />
    </div>
  );
}
