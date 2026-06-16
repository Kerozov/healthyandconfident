import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  runAutomations,
} from "@/lib/automation/send";
import type { Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: {
    email?: string;
    name?: string;
    phone?: string;
    locale?: string;
    source?: string;
    tags?: string[];
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

  const locale = body.locale === "en" ? "en" : "bg";
  const source = body.source || "popup";
  const mailLocale: Locale = locale;
  const incomingTags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string" && t.length > 0)
    : [];

  try {
    const supabase = getAdminClient();
    const name = body.name?.trim() || null;

    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, tags")
      .eq("email", email)
      .maybeSingle();

    const isNew = !existing;
    let subscriberId = existing?.id as string | undefined;
    let finalTags = incomingTags;

    if (existing) {
      finalTags = Array.from(
        new Set([...(existing.tags as string[] ?? []), ...incomingTags]),
      );
      await supabase
        .from("subscribers")
        .update({
          tags: finalTags,
          status: "subscribed",
          ...(name ? { name } : {}),
          ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
        })
        .eq("id", existing.id as string);
    } else {
      const { data: inserted } = await supabase
        .from("subscribers")
        .insert({
          email,
          name,
          phone: body.phone?.trim() || null,
          locale,
          source,
          tags: incomingTags,
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
