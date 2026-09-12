import { ImpersonationBanner } from "@/components/shared/ImpersonationBanner";

export const metadata = {
  title: "Admin Portal — Appnix",
  description: "Appnix Platform Super Admin & Reseller Management Console",
};

export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ImpersonationBanner />
      {children}
    </div>
  );
}
