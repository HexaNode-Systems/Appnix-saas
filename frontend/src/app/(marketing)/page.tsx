"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TrustMetrics } from "@/components/landing/trust-metrics";
import { ChannelDemo } from "@/components/landing/channel-demo";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CRMShowcase } from "@/components/landing/crm-showcase";
import { AutomationShowcase } from "@/components/landing/automation-showcase";
import { CampaignShowcase } from "@/components/landing/campaign-showcase";
import { WhiteLabel } from "@/components/landing/white-label";
import { WhyAppnix } from "@/components/landing/why-appnix";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { LeadFormModal } from "@/components/landing/lead-form-modal";
import { FloatingLeadTrigger } from "@/components/landing/floating-lead-trigger";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { ExitIntentModal } from "@/components/landing/exit-intent-modal";
import { StickyMobileCTA } from "@/components/landing/sticky-mobile-cta";

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoInterest, setDemoInterest] = useState("Complete Platform (All-in-One)");
  const [demoSource, setDemoSource] = useState("Landing Page Header CTA");

  const handleOpenDemo = (interest = "Complete Platform (All-in-One)", source = "Landing Page CTA") => {
    setDemoInterest(interest);
    setDemoSource(source);
    setDemoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* 1. Sticky Professional Navigation Header */}
      <Navbar onOpenDemoModal={() => handleOpenDemo("Complete Platform (All-in-One)", "Header Demo CTA")} />

      {/* 2. Hero Section with Live Product Visual & Dynamic Status Cards */}
      <Hero onOpenDemoModal={() => handleOpenDemo("Complete Platform (All-in-One)", "Hero Demo CTA")} />

      {/* 3. Trust Metrics & Statistics */}
      <TrustMetrics />

      {/* 4. Unified Channels Interactive Demo */}
      <ChannelDemo onOpenDemoModal={() => handleOpenDemo("Omnichannel Integration", "Channels Section CTA")} />

      {/* 5. Platform Features with Micro-previews */}
      <FeatureGrid />

      {/* 6. How Appnix Works (3 Steps) */}
      <HowItWorks onOpenDemoModal={() => handleOpenDemo("General Walkthrough", "How It Works CTA")} />

      {/* 7. CRM & Lead Management Showcase */}
      <CRMShowcase onOpenDemoModal={() => handleOpenDemo("CRM & Lead Management", "CRM Section CTA")} />

      {/* 8. Automation & Workflow Engine Showcase */}
      <AutomationShowcase onOpenDemoModal={() => handleOpenDemo("No-Code Bot & Automation Builder", "Automation Section CTA")} />

      {/* 9. Campaign & Broadcast Manager Showcase */}
      <CampaignShowcase onOpenDemoModal={() => handleOpenDemo("Multi-Channel Broadcast Campaigns", "Campaigns Section CTA")} />

      {/* 10. Multi-Tenant & White-Label Capabilities */}
      <WhiteLabel onOpenDemoModal={() => handleOpenDemo("Multi-Tenant & White-Label Architecture", "White Label Section CTA")} />

      {/* 11. Why Appnix Comparative Advantage */}
      <WhyAppnix />

      {/* 12. Testimonials & Social Proof */}
      <Testimonials />

      {/* 13. Transparent Pricing Plans Preview */}
      <PricingPreview onOpenDemoModal={(plan) => handleOpenDemo(plan ? `Pricing Plan: ${plan}` : "Pricing Inquiry", "Pricing Preview CTA")} />

      {/* 14. Frequently Asked Questions Accordion */}
      <FAQ onOpenDemoModal={() => handleOpenDemo("General Inquiries", "FAQ Section CTA")} />

      {/* 15. Final High-Conversion CTA Banner */}
      <FinalCTA onOpenDemoModal={() => handleOpenDemo("Complete Platform (All-in-One)", "Final CTA Banner")} />

      {/* 16. Professional Multi-Column Footer */}
      <Footer onOpenDemoModal={() => handleOpenDemo("General Contact", "Footer Contact CTA")} />

      {/* 17. Floating Lead Trigger (Desktop/Tablet) */}
      <FloatingLeadTrigger onClick={() => handleOpenDemo("Live Chat Assistance", "Floating Expert Button")} />

      {/* 18. Scroll To Top Button (Bottom-Left) */}
      <ScrollToTop />

      {/* 19. Sticky Mobile Conversion Bar */}
      <StickyMobileCTA onOpenDemoModal={() => handleOpenDemo("Mobile Demo Request", "Mobile Sticky CTA")} />

      {/* 19. Exit-Intent Lead Capture (Desktop Only) */}
      <ExitIntentModal onOpenDemoModal={() => handleOpenDemo("Special Sandbox Demo", "Exit Intent Modal")} />

      {/* 20. Reusable Lead & Demo Booking Modal */}
      <LeadFormModal
        isOpen={demoModalOpen}
        onOpenChange={setDemoModalOpen}
        defaultInterest={demoInterest}
        source={demoSource}
      />
    </div>
  );
}