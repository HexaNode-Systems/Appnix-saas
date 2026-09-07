export const metadata = {
  title: "Super Admin Platform Root — Appnix",
  description: "Platform Root Infrastructure & Super Administrator Control Panel",
};

export default function SuperAdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {children}
    </div>
  );
}
