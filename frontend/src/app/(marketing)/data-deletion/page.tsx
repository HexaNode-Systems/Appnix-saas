import type { Metadata } from "next";
import { Suspense } from "react";
import { DataDeletionView } from "@/components/legal/DataDeletionView";

export const metadata: Metadata = {
  title: "Appnix Technologies Data Deletion",
  description: "Instructions and status tracking for requesting deletion of data associated with the Appnix Technologies SaaS platform.",
  alternates: {
    canonical: "https://www.appnix.co.in/data-deletion",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Appnix Technologies Data Deletion",
    description: "Instructions and status tracking for requesting deletion of data associated with the Appnix Technologies SaaS platform.",
    url: "https://www.appnix.co.in/data-deletion",
    siteName: "Appnix Technologies",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Appnix Technologies Data Deletion",
    description: "Instructions and status tracking for requesting deletion of data associated with the Appnix Technologies SaaS platform.",
  },
};

export default function DataDeletionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading Data Deletion Portal...</div>}>
      <DataDeletionView />
    </Suspense>
  );
}
