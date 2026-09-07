import { AdminAuthLayout } from "@/components/layout/AdminAuthLayout";

export const metadata = {
  title: "Admin Login — Appnix Platform",
  description: "Secure administrative sign-in for platform administrators and resellers",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthLayout
      title="Admin & Reseller Sign In"
      subtitle="Enter your administrative credentials to manage tenant organizations, billing, and system configurations."
      badgeText="Restricted Administrative Area"
    >
      {children}
    </AdminAuthLayout>
  );
}
