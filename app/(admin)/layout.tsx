import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";
import { geistSans, fraunces } from "@/app/fonts";
import { isClerkEnabled } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin · Healthy & Confident",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-cream-2 text-ink">{children}</body>
    </html>
  );

  // Only mount ClerkProvider when Clerk is configured, so the panel works
  // (without login) while the Clerk project is not set up yet.
  return isClerkEnabled() ? <ClerkProvider>{shell}</ClerkProvider> : shell;
}
