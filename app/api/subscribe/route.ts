import { NextResponse, after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { runAutomations } from "@/lib/automation/send";
import {
  ALL_HEALTH_TAG_KEYS,
  applyHealthSelectionToTags,
  fullNameFromParts,
  healthSelectionFromAnswerKey,
} from "@/lib/site/health-tags";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import type { Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
/** Enough time to call the notification worker before the response returns. */
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEALTH_TAG_SET = new Set<string>(ALL_HEALTH_TAG_KEYS);

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

  const email = (body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "Marketing consent required" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "bg";
  const source = body.source || "popup";
  const mailLocale: Locale = locale;
  const rawTags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string" && t.length > 0)
    : [];
  const healthSegment = resolveHealthSegment(body.interest, rawTags);
  const incomingOther = rawTags.filter((t) => !HEALTH_TAG_SET.has(t));

  const firstName = body.first_name?.trim() || null;
  const lastName = body.last_name?.trim() || null;
  const name =
    body.name?.trim() ||
    fullNameFromParts(firstName ?? "", lastName ?? "") ||
    null;
  const facebookUrl = body.facebook_url?.trim() || null;

  try {
    const supabase = getAdminClient();

    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, tags")
      .eq("email", email)
      .maybeSingle();

    const isNew = !existing;
    let subscriberId = existing?.id as string | undefined;
    const finalTags = buildFinalTags(
      existing ? (existing.tags as string[] | null) : [],
      incomingOther,
      healthSegment,
    );

    const profilePatch = {
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(name ? { name } : {}),
      ...(facebookUrl ? { facebook_url: facebookUrl } : {}),
      ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
    };

    if (existing) {
      await supabase
        .from("subscribers")
        .update({
          tags: finalTags,
          status: "subscribed",
          consent: true,
          ...profilePatch,
        })
        .eq("id", existing.id as string);
    } else {
      const { data: inserted } = await supabase
        .from("subscribers")
        .insert({
          email,
          name,
          first_name: firstName,
          last_name: lastName,
          facebook_url: facebookUrl,
          phone: body.phone?.trim() || null,
          locale,
          source,
          tags: finalTags,
          consent: true,
        })
        .select("id")
        .single();
      subscriberId = (inserted as { id: string } | null)?.id;
    }

    // Await automations so the worker is actually called before the serverless
    // function ends. `after()` alone was dropping sends on Vercel.
    try {
      await runAutomations({
        email,
        name,
        phone: body.phone?.trim() || null,
        locale: mailLocale,
        subscriberId: subscriberId ?? null,
        tags: finalTags,
        isNew,
        source,
      });
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

    return NextResponse.json({
      ok: true,
      tags: finalTags,
      interest: healthSegment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
