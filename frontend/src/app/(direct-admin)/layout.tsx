export const metadata = {
  title: "Direct Staff Admin — Appnix",
  description: "Appnix Internal Staff & Operations Console",
};

export default function RootDirectAdminLayout({
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
