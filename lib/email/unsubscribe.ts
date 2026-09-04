import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/email/cta-redirect";
import { createUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { cancelAllScheduledMailForSubscriber } from "@/lib/automation/cancel";
import { chunkArray } from "@/lib/utils";

export type UnsubscribeResult =
  | { ok: true; status: "unsubscribed" | "already" }
  | { ok: false; reason: "not_found" | "invalid" };

export function unsubscribeLinkForEmail(
  email: string,
  locale: "bg" | "en",
): string | null {
  const token = createUnsubscribeToken(email);
  if (!token) return null;
  return `${siteOrigin()}/api/unsubscribe?token=${encodeURIComponent(token)}&locale=${locale}`;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .select("status")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  return (data as { status?: string } | null)?.status === "unsubscribed";
}

export async function filterSubscribedEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];

  const normalized = Array.from(
    new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  );
  const supabase = getAdminClient();

  // Chunked: a resend to the non-openers of a big campaign passes thousands of
  // addresses, and one `in(...)` of that size both overruns the request URL and
  // trips PostgREST's 1000-row response cap — either way recipients vanished
  // from the send without a word.
  const subscribed = new Set<string>();
  for (const batch of chunkArray(normalized, 200)) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("email")
      .in("email", batch)
      .eq("status", "subscribed");

    if (error) {
      console.error("[unsubscribe] filter failed:", error.message);
      throw new Error(error.message);
    }

    // Normalise both sides — a row stored with different casing would otherwise
    // never match its own lowercased address and get silently dropped.
    for (const row of ((data as { email: string }[] | null) ?? [])) {
      subscribed.add(row.email.trim().toLowerCase());
    }
  }

  return normalized.filter((email) => subscribed.has(email));
}

async function cancelScheduledDeliveriesForEmail(email: string): Promise<void> {
  await cancelAllScheduledMailForSubscriber(email);
}

export async function unsubscribeEmail(email: string): Promise<UnsubscribeResult> {
  const normalized = email.trim().toLowerCase();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("email", normalized)
    .maybeSingle();

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  if ((row as { status: string }).status === "unsubscribed") {
    await cancelScheduledDeliveriesForEmail(normalized);
    return { ok: true, status: "already" };
  }

  const { error } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", consent: false })
    .eq("email", normalized);

  if (error) {
    return { ok: false, reason: "invalid" };
  }

  await cancelScheduledDeliveriesForEmail(normalized);
  return { ok: true, status: "unsubscribed" };
}
