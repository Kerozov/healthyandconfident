import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { ReactNode } from "react";

export function CatalogUnavailable({
  locale,
  backHref,
  backLabel,
}: {
  locale: Locale;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center shadow-card">
      <h1 className="font-display text-2xl font-semibold text-slate-800">
        {locale === "bg"
          ? "Офертата вече не е активна"
          : "This offer is no longer available"}
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        {locale === "bg"
          ? "Виж останалите програми и продукти или ни пиши — ще ти предложим подходящото."
          : "Take a look at the other programmes and products, or get in touch and we will point you to the right one."}
      </p>
      <Link
        href={backHref}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-gold-400 px-7 text-sm font-bold text-forest-900 hover:bg-gold-500"
      >
        {backLabel}
      </Link>
    </div>
  );
}

export function CatalogDetailShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-cream py-14 sm:py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
