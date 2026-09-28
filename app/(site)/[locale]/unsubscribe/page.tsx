import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { Container } from "@/components/ui/container";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";

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

/** `vessie@example.com` → `v•••••@example.com` — enough to recognise, not to harvest. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}@${domain}`;
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string | string[]; token?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const u = dict.unsubscribe;
  const query = await searchParams;
  const status = parseStatus(query.status);
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  const pending = !status && token ? verifyUnsubscribeToken(token) : null;

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
        if (token && !pending) {
          return { title: u.invalidTitle, body: u.invalidBody, tone: "warn" as const };
        }
        if (pending) {
          return {
            title: u.confirmTitle,
            body: u.confirmBody.replace("{email}", maskEmail(pending.email)),
            tone: "neutral" as const,
          };
        }
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
          {pending && token ? (
            <form method="post" action="/api/unsubscribe" className="mt-8">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={l} />
              <button
                type="submit"
                className="inline-flex rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-700"
              >
                {u.confirmButton}
              </button>
              <div className="mt-4">
                <Link href={`/${l}`} className="text-sm text-ink-soft underline">
                  {u.backHome}
                </Link>
              </div>
            </form>
          ) : (
            <Link
              href={`/${l}`}
              className="mt-8 inline-flex rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-700"
            >
              {u.backHome}
            </Link>
          )}
        </div>
      </Container>
    </div>
  );
}
