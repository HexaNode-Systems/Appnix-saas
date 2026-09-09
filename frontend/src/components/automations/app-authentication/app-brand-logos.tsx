import React from 'react';
import {
  Webhook,
  Database,
  Cpu,
  Server,
  Sparkles,
  Zap,
  Bot,
  Send,
  Users,
  Smartphone,
  CreditCard,
  Wallet,
  ShoppingCart,
  Search,
  Table,
  PhoneCall,
  KeyRound,
  Globe,
} from 'lucide-react';

interface BrandLogoProps {
  appName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AppBrandLogo({ appName, className = '', size = 'md' }: BrandLogoProps) {
  const normalized = (appName || '').toUpperCase().replace(/[\s-]/g, '_');

  const sizeClasses = {
    sm: 'w-6 h-6 p-1 text-xs',
    md: 'w-10 h-10 p-2 text-sm',
    lg: 'w-12 h-12 p-2.5 text-base',
    xl: 'w-14 h-14 p-3 text-lg',
  }[size];

  switch (normalized) {
    case 'SHOPIFY':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Shopify"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M19.124 5.992c-.048-.352-.338-.485-.566-.499-.228-.014-4.22-.057-4.22-.057s-2.825-2.775-3.093-3.037c-.267-.262-.787-.184-1.002-.12-.066.02-.34.116-.763.267-.457-1.309-1.282-2.518-2.673-2.546h-.227C5.46 0 4.542 1.05 4.316 2.373c-.933.328-1.57.551-1.636.574-.528.185-.544.204-.613.737C1.94 4.673.493 15.827.493 15.827L11.516 18l8.47-2.023s-1.815-9.633-1.862-9.985zM9.48 4.417s.672-.224 1.157-.384c-.452 1.638-1.282 3.638-2.607 5.093.428-1.74 1.183-3.87 1.45-4.709zm-2.9 1.002c.328 0 .61.08.847.23-.274.84-.96 2.766-2.062 4.453.308-1.814 1.025-4.683 1.215-4.683zm-1.89 1.188c.45-.157.94-.328 1.46-.51-.257.98-.823 2.77-1.796 4.372.072-1.306.242-2.92.336-3.862zm-.86 16.51l-2.628-.58L3.06 6.942c.45-.158.94-.33 1.46-.51.018.156.036.315.054.475-1.026 1.748-1.65 3.754-1.65 5.86 0 1.547.464 2.987 1.258 4.195l-1.352 5.655zm1.536.34l1.246-5.213c.712.928 1.706 1.603 2.852 1.905l-4.098 3.308zm11.75-3.323l-7.447 1.778c-.732-.303-1.37-.775-1.863-1.365 1.758-2.096 2.853-4.887 2.853-7.934 0-.41-.02-.816-.058-1.217l6.515.088zm0 0" />
          </svg>
        </div>
      );

    case 'GOOGLE_SHEETS':
    case 'GOOGLESHEETS':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/60 dark:to-green-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Google Sheets"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-3h6v3zm0-4.5H6V9.5h6V13zm0-5H6V5h6v3zm7 9.5h-5.5v-3H19v3zm0-4.5h-5.5V9.5H19V13zm0-5h-5.5V5H19v3z" />
          </svg>
        </div>
      );

    case 'OPENAI':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white border border-emerald-700/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="OpenAI"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 8.713a4.476 4.476 0 0 1 2.34-1.974V12.2a.795.795 0 0 0 .391.68l5.844 3.37-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 8.713zm15.798 3.553l-5.843-3.37 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.677a.79.79 0 0 0-.402-.681zm2.262-4.148l-.141-.085-4.779-2.76a.776.776 0 0 0-.78 0L8.856 8.642V6.31a.08.08 0 0 1 .033-.061l4.84-2.795a4.5 4.5 0 0 1 6.67 4.536v.175zM12 14.168L9.406 12.67 12 11.173l2.594 1.498L12 14.168z" />
          </svg>
        </div>
      );

    case 'CASHFREE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Cashfree Payments"
        >
          <span className="font-extrabold tracking-tighter uppercase font-sans text-xs leading-none">
            CF
          </span>
        </div>
      );

    case 'HUBSPOT':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white border border-orange-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="HubSpot"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M18.8 8.4V5.6c.9-.4 1.6-1.3 1.6-2.4 0-1.4-1.1-2.6-2.6-2.6-1.4 0-2.6 1.1-2.6 2.6 0 1 .6 1.9 1.5 2.3v2.8c-1.3.4-2.4 1.2-3.1 2.3L7.7 7.4c.1-.3.2-.6.2-1 0-1.8-1.5-3.3-3.3-3.3S1.3 4.6 1.3 6.4s1.5 3.3 3.3 3.3c.6 0 1.2-.2 1.7-.5l5.8 3.2c-.3.7-.5 1.5-.5 2.3 0 3.2 2.6 5.8 5.8 5.8s5.8-2.6 5.8-5.8c0-3-2.3-5.5-5.2-5.7zm-1.2-5.6c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zM4.6 7.8c-.8 0-1.4-.6-1.4-1.4 0-.8.6-1.4 1.4-1.4.8 0 1.4.6 1.4 1.4 0 .8-.6 1.4-1.4 1.4zm12.8 11.7c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm1.9-4c0 1.1-.9 1.9-1.9 1.9s-1.9-.9-1.9-1.9.9-1.9 1.9-1.9 1.9.8 1.9 1.9z" />
          </svg>
        </div>
      );

    case 'CUSTOM_WEBHOOK':
    case 'WEBHOOK':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white border border-violet-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Custom Webhook / Bearer"
        >
          <Webhook className="w-full h-full" />
        </div>
      );

    case 'SUPABASE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-900 to-slate-950 text-emerald-400 border border-emerald-700/50 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Supabase"
        >
          <Database className="w-full h-full" />
        </div>
      );

    case 'AIRTABLE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-500 text-white border border-amber-300/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Airtable"
        >
          <Table className="w-full h-full" />
        </div>
      );

    case 'WOOCOMMERCE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-700 to-indigo-900 text-white border border-purple-500/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="WooCommerce"
        >
          <ShoppingCart className="w-full h-full" />
        </div>
      );

    case 'SLACK':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-amber-400 border border-indigo-700/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Slack"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
        </div>
      );

    case 'TWILIO':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white border border-red-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Twilio"
        >
          <PhoneCall className="w-full h-full" />
        </div>
      );

    case 'RESEND':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-zinc-950 text-white border border-zinc-700/50 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Resend"
        >
          <span className="font-mono font-black text-sm tracking-wider">R</span>
        </div>
      );

    case 'SENDGRID':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white border border-cyan-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="SendGrid"
        >
          <Send className="w-full h-full" />
        </div>
      );

    case 'ANTHROPIC':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-stone-900 text-amber-200 border border-amber-600/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Anthropic Claude"
        >
          <Bot className="w-full h-full" />
        </div>
      );

    case 'GOOGLE_GEMINI':
    case 'GEMINI':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-pink-600 text-white border border-blue-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Google Gemini"
        >
          <Sparkles className="w-full h-full" />
        </div>
      );

    case 'GROQ':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white border border-orange-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Groq Fast AI"
        >
          <Zap className="w-full h-full" />
        </div>
      );

    case 'PERPLEXITY':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-cyan-900 text-teal-200 border border-teal-500/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Perplexity AI"
        >
          <Search className="w-full h-full" />
        </div>
      );

    case 'POSTGRESQL':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-700 to-blue-900 text-white border border-sky-500/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="PostgreSQL"
        >
          <Server className="w-full h-full" />
        </div>
      );

    case 'REDIS':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-red-700 to-rose-950 text-white border border-red-600/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Redis"
        >
          <Cpu className="w-full h-full" />
        </div>
      );

    case 'SALESFORCE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white border border-sky-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Salesforce"
        >
          <Globe className="w-full h-full" />
        </div>
      );

    case 'ZOHO_CRM':
    case 'ZOHO':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-amber-500 to-green-600 text-white border border-amber-300/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Zoho CRM"
        >
          <Users className="w-full h-full" />
        </div>
      );

    case 'PAYPAL':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-sky-600 text-white border border-blue-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="PayPal"
        >
          <CreditCard className="w-full h-full" />
        </div>
      );

    case 'CASHFREE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white border border-cyan-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="Cashfree"
        >
          <Wallet className="w-full h-full" />
        </div>
      );

    case 'PHONEPE':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-700 to-violet-900 text-white border border-purple-400/40 shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title="PhonePe"
        >
          <Smartphone className="w-full h-full" />
        </div>
      );

    default:
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-300 border border-border shadow-sm shrink-0 ${sizeClasses} ${className}`}
          title={appName}
        >
          <KeyRound className="w-full h-full" />
        </div>
      );
  }
}
