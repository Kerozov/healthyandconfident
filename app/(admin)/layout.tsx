import type { Metadata } from "next";
import "@/app/globals.css";
import { geistSans, fraunces } from "@/app/fonts";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Admin · ${siteConfig.brand}`,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-cream-2 text-ink">{children}</body>
    </html>
  );
}
