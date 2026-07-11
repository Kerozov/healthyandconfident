import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { runAutomations } from "@/lib/automation/send";
import {
  ALL_HEALTH_TAG_KEYS,
  fullNameFromParts,
} from "@/lib/site/health-tags";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import { schedulePrePaymentReminders } from "@/lib/contacts/reminders";
import type { Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEALTH_TAG_SET = new Set<string>(ALL_HEALTH_TAG_KEYS);

function mergeSubscriberTags(
  existing: string[] | null | undefined,
  incoming: string[],
): string[] {
  const incomingHealth = incoming.filter((t) => HEALTH_TAG_SET.has(t));
  const incomingOther = incoming.filter((t) => !HEALTH_TAG_SET.has(t));
  const kept = (existing ?? []).filter((t) => {
    if (incomingHealth.length > 0 && HEALTH_TAG_SET.has(t)) return false;
    return true;
  });
  return Array.from(new Set([...kept, ...incomingOther, ...incomingHealth]));
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
  const incomingTags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string" && t.length > 0)
    : [];

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
    let finalTags = incomingTags;

    const profilePatch = {
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(name ? { name } : {}),
      ...(facebookUrl ? { facebook_url: facebookUrl } : {}),
      ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
    };

    if (existing) {
      finalTags = mergeSubscriberTags(existing.tags as string[] | null, incomingTags);
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
          tags: incomingTags,
          consent: true,
        })
        .select("id")
        .single();
      subscriberId = (inserted as { id: string } | null)?.id;
      finalTags = incomingTags;
    }

    void runAutomations({
      email,
      name,
      phone: body.phone?.trim() || null,
      locale: mailLocale,
      subscriberId: subscriberId ?? null,
      tags: finalTags,
      isNew,
      source,
    });

    if (subscriberId) {
      void (async () => {
        try {
          const contact = await ensureContactForSubscriber({
            subscriberId,
            email,
            name,
          });
          await schedulePrePaymentReminders(contact, mailLocale);
        } catch (err) {
          console.error("[subscribe] contact reminders:", err);
        }
      })();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
