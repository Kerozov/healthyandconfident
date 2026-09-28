import { NextResponse } from "next/server";
import { sendMetaEvent } from "@/lib/meta/capi";
import { fbcFromClickId, metaUserFromRequest } from "@/lib/meta/request";
import type { MetaEventName, MetaTrackRequest } from "@/lib/meta/types";
import { createRateLimiter } from "@/lib/util/rate-limit";

export const dynamic = "force-dynamic";

/** Events the browser is allowed to mirror. PageView stays pixel-only. */
const ALLOWED: ReadonlySet<MetaEventName> = new Set<MetaEventName>([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Lead",
  "CompleteRegistration",
  "Subscribe",
  "Contact",
]);

const rateLimited = createRateLimiter(40, 60_000);

function safeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(value, 1_000_000);
}

function safeStringList(value: unknown, max = 20): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 200)
    .slice(0, max);
  return list.length > 0 ? list : undefined;
}

function safeString(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export async function POST(req: Request) {
  let body: (MetaTrackRequest & { fbclid?: string | null }) | null = null;
  try {
    body = (await req.json()) as MetaTrackRequest & { fbclid?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventName = body?.eventName as MetaEventName | undefined;
  if (!eventName || !ALLOWED.has(eventName)) {
    return NextResponse.json({ ok: false, error: "unsupported_event" }, { status: 400 });
  }

  const browser = metaUserFromRequest(req);
  if (rateLimited(browser.clientIpAddress ?? "unknown")) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const result = await sendMetaEvent({
    eventName,
    eventId: safeString(body.eventId, 100) ?? null,
    eventSourceUrl: safeString(body.eventSourceUrl, 500) ?? null,
    actionSource: "website",
    source: "browser",
    user: {
      ...browser,
      fbc: browser.fbc ?? fbcFromClickId(body.fbclid),
      email: safeString(body.email, 320) ?? null,
      phone: safeString(body.phone, 40) ?? null,
      firstName: safeString(body.firstName, 100) ?? null,
      lastName: safeString(body.lastName, 100) ?? null,
    },
    custom: {
      value: safeNumber(body.value) ?? null,
      currency: safeString(body.currency, 3) ?? null,
      contentIds: safeStringList(body.contentIds),
      contentName: safeString(body.contentName, 200) ?? null,
      contentType:
        body.contentType === "product" || body.contentType === "product_group"
          ? body.contentType
          : undefined,
      contentCategory: safeString(body.contentCategory, 100) ?? null,
      numItems: safeNumber(body.numItems) ?? null,
    },
  });

  return NextResponse.json({ ok: result.ok, status: result.status });
}
