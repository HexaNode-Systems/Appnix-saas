"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Menu,
  X,
  ArrowRight,
  PhoneCall,
  ChevronDown,
  Send,
  Bot,
  Zap,
  Users,
  BarChart3,
  Layers,
  ShieldCheck,
  Star,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/landing/language-selector";
import { LanguageSuggestionPopup } from "@/components/landing/language-suggestion-popup";
import {
  WhatsAppIcon,
  InstagramIcon,
  RCSIcon,
  FacebookIcon,
} from "@/components/landing/channel-icons";

export interface HeaderProps {
  onOpenDemoModal: () => void;
  className?: string;
}

type ActiveDropdown = "features" | "channels" | "crm-bots" | null;

interface NavItem {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface DirectLink {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Header({ onOpenDemoModal, className }: HeaderProps) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [mobileAccordion, setMobileAccordion] = useState<{ [key: string]: boolean }>({
    features: false,
    channels: false,
    crmBots: false,
  });

  const headerRef = useRef<HTMLElement>(null);

  // Dynamic navigation configuration
  const featureItems: NavItem[] = useMemo(
    () => [
      {
        name: t.nav.unifiedInbox,
        description: t.nav.unifiedInboxDesc,
        href: "/#features",
        icon: MessageSquare,
      },
      {
        name: t.nav.campaignManager,
        description: t.nav.campaignManagerDesc,
        href: "/#campaigns",
        icon: Send,
      },
      {
        name: t.nav.automationBuilder,
        description: t.nav.automationBuilderDesc,
        href: "/#automations",
        icon: Zap,
      },
      {
        name: t.nav.analyticsDashboard,
        description: t.nav.analyticsDashboardDesc,
        href: "/#features",
        icon: BarChart3,
      },
      {
        name: t.nav.howItWorks,
        description: t.nav.howItWorksDesc,
        href: "/#how-it-works",
        icon: Layers,
      },
      {
        name: t.nav.whiteLabel,
        description: t.nav.whiteLabelDesc,
        href: "/#white-label",
        icon: ShieldCheck,
      },
      {
        name: t.nav.testimonials,
        description: t.nav.testimonialsDesc,
        href: "/#testimonials",
        icon: Star,
      },
      {
        name: t.nav.faq,
        description: t.nav.faqDesc,
        href: "/#faq",
        icon: HelpCircle,
      },
    ],
    [t]
  );

  const channelItems: NavItem[] = useMemo(
    () => [
      {
        name: t.nav.whatsappApi,
        description: t.nav.whatsappApiDesc,
        href: "/#channels",
        icon: WhatsAppIcon,
        badge: t.nav.officialApi,
      },
      {
        name: t.nav.rcsMessaging,
        description: t.nav.rcsMessagingDesc,
        href: "/#channels",
        icon: RCSIcon,
        badge: t.nav.googleVerified,
      },
      {
        name: t.nav.instagramDirect,
        description: t.nav.instagramDirectDesc,
        href: "/#channels",
        icon: InstagramIcon,
        badge: t.nav.metaDirect,
      },
      {
        name: t.nav.facebookMessenger,
        description: t.nav.facebookMessengerDesc,
        href: "/#channels",
        icon: FacebookIcon,
        badge: t.nav.metaApi,
      },
    ],
    [t]
  );

  const crmBotItems: NavItem[] = useMemo(
    () => [
      {
        name: t.nav.crmContact,
        description: t.nav.crmContactDesc,
        href: "/#crm",
        icon: Users,
      },
      {
        name: t.nav.botBuilder,
        description: t.nav.botBuilderDesc,
        href: "/#automations",
        icon: Bot,
      },
    ],
    [t]
  );

  const directLinks: DirectLink[] = useMemo(
    () => [
      {
        name: t.nav.pricing,
        href: "/#pricing",
        icon: CreditCard,
      },
    ],
    [t]
  );

  // Scroll detection for sticky header transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dismiss dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleDropdown = (name: ActiveDropdown) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const toggleMobileAccordion = (key: string) => {
    setMobileAccordion((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeMenus = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-250",
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs py-2.5"
          : "bg-background/80 backdrop-blur-xs border-b border-border/40 py-3.5",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={closeMenus}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-xl bg-primary/10 border border-primary/20 p-1 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo-favicon.png"
                alt="Appnix Logo"
                width={36}
                height={36}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                Appnix
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-primary/80 mt-0.5">
                Technologies
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main Navigation">
            {/* 1. Features Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("features")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeDropdown === "features"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                aria-expanded={activeDropdown === "features"}
              >
                <span>{t.nav.features}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    activeDropdown === "features" ? "rotate-180 text-foreground" : "text-muted-foreground"
                  )}
                />
              </button>

              {activeDropdown === "features" && (
                <div className="absolute top-full left-0 mt-2 w-140 rounded-xl border border-border/80 bg-popover/98 p-3 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                  <div className="grid grid-cols-2 gap-1.5">
                    {featureItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={closeMenus}
                        className="group flex items-start gap-3 rounded-lg p-2.5 transition-all hover:bg-muted/80"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Channels Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("channels")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeDropdown === "channels"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                aria-expanded={activeDropdown === "channels"}
              >
                <span>{t.nav.channels}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    activeDropdown === "channels" ? "rotate-180 text-foreground" : "text-muted-foreground"
                  )}
                />
              </button>

              {activeDropdown === "channels" && (
                <div className="absolute top-full left-0 mt-2 w-110 rounded-xl border border-border/80 bg-popover/98 p-3 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                  <div className="space-y-1">
                    {channelItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={closeMenus}
                        className="group flex items-center justify-between rounded-lg p-2.5 transition-all hover:bg-muted/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {item.badge && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. CRM & Bots Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("crm-bots")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeDropdown === "crm-bots"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                aria-expanded={activeDropdown === "crm-bots"}
              >
                <span>{t.nav.crmBots}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    activeDropdown === "crm-bots" ? "rotate-180 text-foreground" : "text-muted-foreground"
                  )}
                />
              </button>

              {activeDropdown === "crm-bots" && (
                <div className="absolute top-full left-0 mt-2 w-96 rounded-xl border border-border/80 bg-popover/98 p-3 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                  <div className="space-y-1">
                    {crmBotItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={closeMenus}
                        className="group flex items-start gap-3 rounded-lg p-2.5 transition-all hover:bg-muted/80"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Links (e.g. Pricing) */}
            {directLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenus}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Action CTAs & Language Switcher (Powered by Google Translate CDN) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Google Translate Language Selector Dropdown */}
            <div className="relative">
              <LanguageSelector />
              <LanguageSuggestionPopup />
            </div>

            {/* Book Demo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDemoModal}
              className="hidden xl:inline-flex items-center gap-1.5 h-8.5 px-3 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>{t.nav.bookDemo}</span>
            </Button>

            {/* Sign In Link */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex h-8.5 px-3 text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              <Link href="/signin">{t.nav.signIn}</Link>
            </Button>

            {/* Primary Action Button */}
            <Button
              size="sm"
              asChild
              className="h-8.5 px-3.5 text-xs font-semibold shadow-xs bg-primary hover:bg-primary/90 cursor-pointer"
            >
              <Link href="/signup">
                <span>{t.nav.startFreeTrial}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/80 bg-background/98 backdrop-blur-lg px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Language selector in mobile drawer */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs font-medium text-muted-foreground">
              {t.languageSelector.label}
            </span>
            <LanguageSelector compact />
          </div>

          <div className="space-y-1">
            {/* Features Accordion */}
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion("features")}
                className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                <span>{t.nav.features}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    mobileAccordion.features ? "rotate-180" : ""
                  )}
                />
              </button>
              {mobileAccordion.features && (
                <div className="bg-muted/30 p-2 space-y-1 border-t border-border/40">
                  {featureItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 rounded-md p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Channels Accordion */}
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion("channels")}
                className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                <span>{t.nav.channels}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    mobileAccordion.channels ? "rotate-180" : ""
                  )}
                />
              </button>
              {mobileAccordion.channels && (
                <div className="bg-muted/30 p-2 space-y-1 border-t border-border/40">
                  {channelItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMenus}
                      className="flex items-center justify-between rounded-md p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* CRM & Bots Accordion */}
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion("crmBots")}
                className="flex w-full items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                <span>{t.nav.crmBots}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    mobileAccordion.crmBots ? "rotate-180" : ""
                  )}
                />
              </button>
              {mobileAccordion.crmBots && (
                <div className="bg-muted/30 p-2 space-y-1 border-t border-border/40">
                  {crmBotItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 rounded-md p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Links */}
            {directLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenus}
                className="block p-3 text-xs font-semibold text-foreground hover:bg-muted rounded-lg"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Quick Action CTAs for Mobile */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                closeMenus();
                onOpenDemoModal();
              }}
              className="w-full justify-center h-9 text-xs font-semibold text-primary border-primary/40 hover:bg-primary/10"
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
              <span>{t.nav.bookDemo}</span>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-center h-9 text-xs font-semibold"
              >
                <Link href="/signin" onClick={closeMenus}>
                  {t.nav.signIn}
                </Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="w-full justify-center h-9 text-xs font-semibold bg-primary hover:bg-primary/90"
              >
                <Link href="/signup" onClick={closeMenus}>
                  {t.nav.startFreeTrial}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// Backward-compatibility exports
export { Header as LandingHeader, Header as Navbar };
export default Header;
