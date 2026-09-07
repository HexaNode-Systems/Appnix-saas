import { SuperAdminAuthLayout } from "@/components/layout/SuperAdminAuthLayout";

export const metadata = {
  title: "Super Admin Authentication — Appnix Root",
  description: "Hardware MFA-enforced security portal for platform super administrators",
};

export default function SuperAdminAuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuperAdminAuthLayout
      title="Platform Root Authentication"
      subtitle="Restricted Tier-0 Console. Hardware key / TOTP verification mandatory for session authorization."
    >
      {children}
    </SuperAdminAuthLayout>
  );
}
