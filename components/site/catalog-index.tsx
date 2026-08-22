import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export function CatalogIndex({
  locale,
  eyebrow,
  title,
  subtitle,
  empty,
  children,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  subtitle: string;
  empty?: string;
  children: ReactNode;
}) {
  const home = locale === "bg" ? "Към началото" : "Back to home";

  return (
    <div className="bg-cream py-14 sm:py-20">
      <Container>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {home}
        </Link>
        <header className="mx-auto mt-6 max-w-2xl text-center">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-ink-soft">{subtitle}</p>
        </header>
        {empty ? (
          <p className="mt-16 text-center text-ink-soft">{empty}</p>
        ) : (
          children
        )}
      </Container>
    </div>
  );
}
