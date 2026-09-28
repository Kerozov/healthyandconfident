import { NextResponse, after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { runAutomations } from "@/lib/automation/send";
import {
  ALL_HEALTH_TAG_KEYS,
  applyHealthSelectionToTags,
  fullNameFromParts,
  healthSelectionFromAnswerKey,
} from "@/lib/site/health-tags";
import { applyEnglishRecipientTag } from "@/i18n/subscriber-locale";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import { allowedSignupTags, sanitizeSignupSource } from "@/lib/site/signup-tags";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";
import type { Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
/** Enough time to call the notification worker before the response returns. */
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEALTH_TAG_SET = new Set<string>(ALL_HEALTH_TAG_KEYS);
const rateLimited = createRateLimiter(10, 60_000);

function field(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

function resolveHealthSegment(
  interest: string | null | undefined,
  tags: string[],
): string | null {
  const fromField = interest?.trim() || "";
  if (fromField && HEALTH_TAG_SET.has(fromField)) return fromField;
  const fromTags = tags.find((t) => HEALTH_TAG_SET.has(t));
  return fromTags ?? null;
}

/**
 * Keep non-health tags (incl. free-menu activity), replace health with the
 * single answer from the form.
 */
function buildFinalTags(
  existing: string[] | null | undefined,
  incomingOther: string[],
  healthSegment: string | null,
): string[] {
  const kept = (existing ?? []).filter(
    (t) => !HEALTH_TAG_SET.has(t) && t !== "all",
  );
  const extras = incomingOther.filter(
    (t) => !HEALTH_TAG_SET.has(t) && t !== "all",
  );
  let next = Array.from(new Set([...kept, ...extras]));
  if (healthSegment) {
    const selection = healthSelectionFromAnswerKey(healthSegment);
    if (selection) {
      next = applyHealthSelectionToTags(next, selection);
    }
  }
  return next;
}

export async function POST(req: Request) {
  if (rateLimited(requestIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: {
    email?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    facebook_url?: string;
    phone?: string;
    locale?: string;
    source?: string;
    interest?: string | null;
    tags?: string[];
    consent?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "Marketing consent required" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "bg";
  const source = sanitizeSignupSource(body.source);
  const mailLocale: Locale = locale;

  const firstName = field(body.first_name, 100);
  const lastName = field(body.last_name, 100);
  const name =
    field(body.name, 200) ||
    fullNameFromParts(firstName ?? "", lastName ?? "") ||
    null;
  const facebookUrl = field(body.facebook_url, 300);
  const phone = field(body.phone, 40);

  try {
    const allowedTags = await allowedSignupTags();
    const rawTags = Array.isArray(body.tags)
      ? body.tags.filter(
          (t): t is string => typeof t === "string" && allowedTags.has(t),
        )
      : [];
    const interest =
      typeof body.interest === "string" && HEALTH_TAG_SET.has(body.interest)
        ? body.interest
        : null;
    const healthSegment = resolveHealthSegment(interest, rawTags);
    const incomingOther = rawTags.filter((t) => !HEALTH_TAG_SET.has(t));

    const supabase = getAdminClient();

    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, tags, name, first_name, last_name, facebook_url, phone")
      .eq("email", email)
      .maybeSingle();

    const isNew = !existing;
    let subscriberId = existing?.id as string | undefined;
    const priorTags = existing ? ((existing.tags as string[] | null) ?? []) : [];
    const finalTags = buildFinalTags(
      existing ? priorTags : [],
      incomingOther,
      healthSegment,
    );
    const tagsWithLocale = applyEnglishRecipientTag(finalTags, mailLocale);

    // Anyone can post any address here, so an existing profile is only filled
    // in, never overwritten — a stranger must not be able to rename someone
    // or swap their phone number.
    const current = (existing ?? {}) as {
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      facebook_url?: string | null;
      phone?: string | null;
    };
    const profilePatch = {
      ...(firstName && !current.first_name ? { first_name: firstName } : {}),
      ...(lastName && !current.last_name ? { last_name: lastName } : {}),
      ...(name && !current.name ? { name } : {}),
      ...(facebookUrl && !current.facebook_url ? { facebook_url: facebookUrl } : {}),
      ...(phone && !current.phone ? { phone } : {}),
    };

    if (existing) {
      await supabase
        .from("subscribers")
        .update({
          tags: tagsWithLocale,
          locale,
          status: "subscribed",
          consent: true,
          ...profilePatch,
        })
        .eq("id", existing.id as string);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("subscribers")
        .insert({
          email,
          name,
          first_name: firstName,
          last_name: lastName,
          facebook_url: facebookUrl,
          phone,
          locale,
          source,
          tags: tagsWithLocale,
          consent: true,
        })
        .select("id")
        .single();

      if (insertError) {
        // Two signups landing at once: the loser reads back the row that won so
        // automations still get a subscriber id (their idempotency key depends
        // on it — without it the same person can be mailed twice).
        const { data: raced } = await supabase
          .from("subscribers")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        subscriberId = (raced as { id: string } | null)?.id;
        if (!subscriberId) {
          console.error("[subscribe] insert failed:", insertError.message);
          return NextResponse.json({ error: "Failed" }, { status: 500 });
        }
      } else {
        subscriberId = (inserted as { id: string } | null)?.id;
      }
    }

    if (!isNew) {
      try {
        const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
          "@/lib/automation/cancel"
        );
        await cancelIneligibleAutomationDeliveriesForSubscriber(email, tagsWithLocale);
      } catch (err) {
        console.error("[subscribe] cancel ineligible automations:", err);
      }
    }

    // Await automations so the worker is actually called before the serverless
    // function ends. `after()` alone was dropping sends on Vercel.
    try {
      const report = await runAutomations({
        email,
        // The stored profile wins: a stranger's post must not put their words
        // in the greeting of someone else's welcome email.
        name: current.name || name,
        phone: current.phone || phone,
        locale: mailLocale,
        subscriberId: subscriberId ?? null,
        tags: tagsWithLocale,
        priorTags: isNew ? undefined : priorTags,
        isNew,
        source,
      });
      if (report.errors.length > 0) {
        console.warn(
          `[subscribe] ${source} ${email}: automations ${report.errors.join(", ")}`,
        );
      }
    } catch (err) {
      console.error("[subscribe] automations:", err);
    }

    if (subscriberId) {
      after(async () => {
        try {
          await ensureContactForSubscriber({
            subscriberId,
            email,
            name,
          });
        } catch (err) {
          console.error("[subscribe] contact ensure:", err);
        }
      });
    }

    // Nothing about the list goes back to an anonymous caller — the automation
    // report named internal rules and why each one was skipped.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
