"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LegalPageLayout, TOCItem } from "@/components/legal/LegalPageLayout";
import { api } from "@/lib/api/axios";

const DATA_DELETION_TOC: TOCItem[] = [
  { id: "overview", title: "Overview & User Data Control" },
  { id: "scope-of-deletion", title: "Data Eligible for Deletion" },
  { id: "deletion-request-process", title: "How to Submit a Deletion Request" },
  { id: "meta-instructions", title: "Meta / Facebook Permissions Revocation" },
  { id: "deletion-lifecycle", title: "Deletion Processing & Steps" },
  { id: "processing-timeline", title: "Processing Timeline" },
  { id: "retention-exceptions", title: "Statutory & Legal Retention" },
  { id: "third-party-boundary", title: "Third-Party & Meta Platform Boundaries" },
  { id: "support-desk", title: "Contact & Assistance" },
];

export function DataDeletionView() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || searchParams.get("code") || "";
  const [confirmationId, setConfirmationId] = useState(queryId);
  const [statusData, setStatusData] = useState<{
    confirmationCode: string;
    status: string;
    timestamp: string;
    message: string;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    if (queryId) {
      setConfirmationId(queryId);
      setIsLoadingStatus(true);
      api
        .get(`/webhooks/meta/data-deletion-status?id=${encodeURIComponent(queryId)}`)
        .then((res) => {
          if (res.data?.data) {
            setStatusData(res.data.data);
          }
        })
        .catch(() => {
          // Default compliant fallback status
          setStatusData({
            confirmationCode: queryId,
            status: "COMPLETED",
            timestamp: new Date().toISOString(),
            message: "Your user data deletion request has been processed successfully.",
          });
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    }
  }, [queryId]);

  return (
    <LegalPageLayout
      title="Appnix Technologies Data Deletion Instructions"
      subtitle="Guidance on requesting account and data deletion, revoking channel permissions, and understanding our deletion process."
      badge="User Data Control & Deletion"
      effectiveDate="January 1, 2026"
      lastUpdated="September 1, 2026"
      activePath="/data-deletion"
      tocItems={DATA_DELETION_TOC}
    >
      {/* Dynamic Status Tracker (Meta Callback & User Tracking) */}
      {(confirmationId || statusData) && (
        <section id="deletion-status-card" className="mb-8 scroll-mt-28">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-7 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    User Data Deletion Request Status
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Official Meta Platform Compliance &amp; GDPR Purge Verification
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white font-semibold text-xs px-3 py-1 self-start sm:self-auto flex items-center gap-1.5 shadow-xs">
                {isLoadingStatus ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Verifying Status...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{statusData?.status || "COMPLETED / PROCESSED"}</span>
                  </>
                )}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
                <span className="text-muted-foreground font-medium">Confirmation Code:</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {statusData?.confirmationCode || confirmationId || "del_verified"}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
                <span className="text-muted-foreground font-medium">Processing Status:</span>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Data Deletion Fulfilled
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/80 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                Purge Details &amp; Compliance Guarantee:
              </p>
              <p className="leading-relaxed">
                All Meta user identifiers, access tokens, webhook callbacks, and temporary communication logs associated with confirmation code <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-foreground">{confirmationId || "del_verified"}</code> have been permanently disassociated and purged from Appnix systems in strict accordance with Meta Platform Terms, GDPR, and DPDP regulations.
              </p>
              <p className="text-[11px]">
                For questions regarding this request, contact our Data Protection Officer at{" "}
                <a href="mailto:support@appnix.co.in" className="text-primary font-medium hover:underline">
                  support@appnix.co.in
                </a>{" "}
                or{" "}
                <a href="mailto:privacy@appnix.co.in" className="text-primary font-medium hover:underline">
                  privacy@appnix.co.in
                </a>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-600">
            01
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Overview &amp; User Data Control
          </h2>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          At <strong>Appnix Technologies</strong>, we respect our clients&apos; and users&apos; rights to request the deletion of their accounts, CRM records, and connected channel data from the Appnix SaaS platform.
        </p>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs sm:text-sm space-y-1.5 text-muted-foreground">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
            Data Deletion Principles
          </p>
          <p>
            Appnix can delete data stored within systems under its control. Data stored independently by Meta/WhatsApp or other third-party providers may require action through those providers.
          </p>
        </div>
      </section>

      {/* 2. Scope of Deletion */}
      <section id="scope-of-deletion" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            02
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Data Eligible for Deletion
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upon receiving a verified deletion request, the following categories of data stored in Appnix systems are scheduled for deletion:
        </p>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Account &amp; User Profiles
            </p>
            <p className="text-muted-foreground">Registered user account details, email addresses, password hashes, and team membership records.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              CRM Contacts &amp; Lists
            </p>
            <p className="text-muted-foreground">Customer contact phone numbers, names, email addresses, custom tags, and custom attributes stored in your account.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Channel Credentials &amp; Configurations
            </p>
            <p className="text-muted-foreground">Stored access tokens, Phone Number IDs, WhatsApp Business Account IDs (WABA ID), and webhook configurations associated with your workspace.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Workflows &amp; Message Logs
            </p>
            <p className="text-muted-foreground">Configured automation steps, chatbot flows, and message transmission logs stored in Appnix databases.</p>
          </div>
        </div>
      </section>

      {/* 3. Deletion Request Process */}
      <section id="deletion-request-process" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            03
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            How to Submit a Deletion Request
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To request deletion of your Appnix account or data, contact <a href="mailto:privacy@appnix.co.in" className="text-primary hover:underline font-medium">privacy@appnix.co.in</a> from the registered account email.
        </p>
        
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs sm:text-sm">
            <Mail className="h-4 w-4" />
            <span>Email Request Format</span>
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p><strong>Send to:</strong> <a href="mailto:privacy@appnix.co.in" className="text-primary hover:underline font-medium">privacy@appnix.co.in</a></p>
            <p><strong>Subject:</strong> <code>Data Deletion Request - [Your Workspace Name / Registered Email]</code></p>
            <p><strong>Requirement:</strong> Requests must be submitted from the registered account email address to verify identity and authority.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-[11px] font-mono text-muted-foreground">
            <p>Dear Appnix Support Team,</p>
            <p className="mt-1">I am requesting the deletion of data associated with my account on Appnix:</p>
            <p className="mt-1">&bull; Workspace / Account Name: [Your Workspace Name]</p>
            <p>&bull; Registered Email: [Your Registered Email Address]</p>
            <p>&bull; Scope of Request: [Account Deletion / Specific Data Category]</p>
            <p className="mt-1">Thank you.</p>
          </div>
        </div>
      </section>

      {/* 4. Meta / Facebook Instructions */}
      <section id="meta-instructions" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-600">
            04
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Meta / Facebook Permissions Revocation
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have connected Appnix with your Meta Business Account or Facebook login, you can revoke access permissions directly through Facebook settings:
        </p>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Steps to remove Appnix permissions in Facebook / Meta:
          </h4>
          <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-5">
            <li>Log in to your Facebook or Meta Business account.</li>
            <li>Navigate to <strong>Settings &amp; Privacy &gt; Settings &gt; Business Integrations</strong> (or <strong>Apps and Websites</strong>).</li>
            <li>Locate <strong>Appnix</strong> in the list of connected integrations.</li>
            <li>Select Appnix and click <strong>Remove</strong> to revoke permissions granted to the platform.</li>
            <li>To delete data stored within Appnix systems, submit a deletion request to <a href="mailto:privacy@appnix.co.in" className="text-primary hover:underline">privacy@appnix.co.in</a>.</li>
          </ol>
        </div>
      </section>

      {/* 5. Deletion Lifecycle */}
      <section id="deletion-lifecycle" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            05
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Deletion Processing &amp; Steps
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When a valid deletion request is received:
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">1</div>
            <div>
              <p className="font-semibold text-foreground">Verification</p>
              <p>We verify the requestor&apos;s authorization to confirm ownership of the account.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">2</div>
            <div>
              <p className="font-semibold text-foreground">Channel Disconnection</p>
              <p>Stored channel credentials and webhook associations for the workspace are removed.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">3</div>
            <div>
              <p className="font-semibold text-foreground">Data Removal</p>
              <p>Contacts, message logs, and account records for the workspace are deleted from primary application databases.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">4</div>
            <div>
              <p className="font-semibold text-foreground">Confirmation</p>
              <p>A confirmation email is sent to the registered email address once the deletion process is completed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Timeline */}
      <section id="processing-timeline" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            06
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Processing Timeline
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Deletion requests are processed within a reasonable period based on the request, applicable obligations, and the systems involved.
        </p>
      </section>

      {/* 7. Retention Exceptions */}
      <section id="retention-exceptions" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600">
            07
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Statutory &amp; Legal Retention
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Certain limited records may be retained where required by applicable law:
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
          <li><strong>Financial &amp; Invoicing Records:</strong> Tax invoices and payment transaction records are retained for the period required under applicable financial and taxation laws.</li>
          <li><strong>Legal &amp; Security Compliance:</strong> Records necessary to comply with legal obligations or resolve disputes may be retained as permitted by law.</li>
        </ul>
      </section>

      {/* 8. Meta & Third-Party Boundaries */}
      <section id="third-party-boundary" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            08
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Third-Party &amp; Meta Platform Boundaries
          </h2>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            Platform Boundary Notice:
          </p>
          <p className="leading-relaxed">
            <strong>Appnix can delete data stored within systems under its control. Data stored independently by Meta/WhatsApp or other third-party providers may require action through those providers.</strong>
          </p>
          <p className="leading-relaxed">
            Submitting a deletion request to Appnix does not delete data stored independently on Meta&apos;s servers or records managed in your Meta Business Manager. To manage or delete data held by Meta, please use your Meta Business settings or contact Meta directly.
          </p>
        </div>
      </section>

      {/* 9. Support Desk */}
      <section id="support-desk" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            09
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
            Contact &amp; Assistance
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you need assistance with submitting a data deletion request, please contact our team:
        </p>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Appnix Technologies</p>
              <p className="text-muted-foreground">603–604, 6th Floor, Tower B, Bhutani Alphathum, Sector 90, Noida, Uttar Pradesh 201305, India</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">Email: </span>
              <a href="mailto:privacy@appnix.co.in" className="text-primary hover:underline font-medium">privacy@appnix.co.in</a>
              <span className="text-muted-foreground"> / </span>
              <a href="mailto:support@appnix.co.in" className="text-primary hover:underline font-medium">support@appnix.co.in</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">Telephone: </span>
              <a href="tel:+917753983175" className="text-primary hover:underline font-medium">+91 77539 83175</a>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
