// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Zelime gtp",
  description: "Mila mou ellinika",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
