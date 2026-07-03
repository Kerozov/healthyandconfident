import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Status = "success" | "already" | "invalid" | "not_found";

function parseStatus(value: string | string[] | undefined): Status | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "success" ||
    raw === "already" ||
    raw === "invalid" ||
    raw === "not_found"
  ) {
    return raw;
  }
  return null;
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const u = dict.unsubscribe;
  const status = parseStatus((await searchParams).status);

  const content = (() => {
    switch (status) {
      case "success":
        return { title: u.successTitle, body: u.successBody, tone: "ok" as const };
      case "already":
        return { title: u.alreadyTitle, body: u.alreadyBody, tone: "ok" as const };
      case "not_found":
        return { title: u.notFoundTitle, body: u.notFoundBody, tone: "warn" as const };
      case "invalid":
        return { title: u.invalidTitle, body: u.invalidBody, tone: "warn" as const };
      default:
        return { title: u.title, body: u.helpBody, tone: "neutral" as const };
    }
  })();

  return (
    <div className="py-20">
      <Container>
        <div className="mx-auto max-w-lg rounded-2xl border border-forest-100 bg-white p-8 text-center shadow-sm sm:p-10">
          <div
            className={
              content.tone === "ok"
                ? "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-2xl"
                : content.tone === "warn"
                  ? "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl"
                  : "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-2xl"
            }
            aria-hidden
          >
            {content.tone === "ok" ? "✓" : content.tone === "warn" ? "!" : "✉"}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {content.title}
          </h1>
          <p className="mt-4 text-ink-soft">{content.body}</p>
          {(status === "success" || status === "already") && (
            <p className="mt-4 text-sm text-ink-soft">{u.resubscribeHint}</p>
          )}
          <Link
            href={`/${l}`}
            className="mt-8 inline-flex rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-700"
          >
            {u.backHome}
          </Link>
        </div>
      </Container>
    </div>
  );
}
