import Link from "next/link";
import { geistSans, fraunces } from "@/app/fonts";
import "@/app/globals.css";

export default function NotFound() {
  return (
    <html lang="bg" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream p-6 text-center text-ink">
        <p className="font-display text-7xl font-semibold text-coral-500">404</p>
        <h1 className="font-display text-2xl font-semibold">
          Страницата не е намерена / Page not found
        </h1>
        <div className="flex gap-3">
          <Link
            href="/bg"
            className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-cream"
          >
            Начало
          </Link>
          <Link
            href="/en"
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}
