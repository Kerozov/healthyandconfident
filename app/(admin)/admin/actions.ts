"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, scheduleEmail } from "@/lib/worker/email";
import { sendSms } from "@/lib/sms/notifier";
import { slugify } from "@/lib/utils";

export type ActionResult = { ok: boolean; message?: string; id?: string };

function readingMinutes(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Blog ────────────────────────────────────────────────────
export async function savePost(input: {
  id?: string;
  locale: "bg" | "en";
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image?: string;
  tags?: string;
  seo_title?: string;
  seo_description?: string;
  status: "draft" | "published";
  featured?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const tags = (input.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const slug = input.slug ? slugify(input.slug) : slugify(input.title);

  const row = {
    locale: input.locale,
    slug,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    cover_image: input.cover_image || null,
    tags,
    seo_title: input.seo_title || null,
    seo_description: input.seo_description || null,
    reading_minutes: readingMinutes(input.content),
    status: input.status,
    featured: input.featured ?? false,
    published_at:
      input.status === "published" ? new Date().toISOString() : null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("blog_posts")
      .update(row)
      .eq("id", input.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data, error } = await supabase
      .from("blog_posts")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    revalidatePath(`/${input.locale}/blog`);
    return { ok: true, id: (data as { id: string }).id };
  }

  revalidatePath(`/${input.locale}/blog`);
  revalidatePath(`/${input.locale}/blog/${slug}`);
  return { ok: true };
}

export async function deletePost(id: string, locale: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/${locale}/blog`);
  return { ok: true };
}

// ── Popup ───────────────────────────────────────────────────
export async function savePopup(input: {
  locale: "bg" | "en";
  enabled: boolean;
  title: string;
  message: string;
  cta_label: string;
  success_message: string;
  image_url?: string;
  segment_tag: string;
  delay_seconds: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("popup_config")
    .update({
      enabled: input.enabled,
      title: input.title,
      message: input.message,
      cta_label: input.cta_label,
      success_message: input.success_message,
      image_url: input.image_url || null,
      segment_tag: input.segment_tag,
      delay_seconds: input.delay_seconds,
      updated_at: new Date().toISOString(),
    })
    .eq("locale", input.locale);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ── Subscribers ─────────────────────────────────────────────
export async function addSubscriber(input: {
  email: string;
  name?: string;
  phone?: string;
  locale: "bg" | "en";
  tags?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const email = input.email.trim().toLowerCase();
  const tags = (input.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("subscribers").upsert(
    {
      email,
      name: input.name || null,
      phone: input.phone || null,
      locale: input.locale,
      source: "manual",
      tags,
    },
    { onConflict: "email" },
  );
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

export async function updateSubscriber(input: {
  id: string;
  tags?: string;
  status?: "subscribed" | "unsubscribed";
  notes?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const patch: Partial<import("@/lib/supabase/types").Subscriber> = {};
  if (input.tags !== undefined)
    patch.tags = input.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { error } = await supabase
    .from("subscribers")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

export async function deleteSubscriber(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("subscribers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

async function recipientsForSegment(
  tag: string,
  locale?: "bg" | "en",
): Promise<{ emails: string[]; phones: string[] }> {
  const supabase = getAdminClient();
  let q = supabase
    .from("subscribers")
    .select("email, phone, tags, locale")
    .eq("status", "subscribed");
  if (locale) q = q.eq("locale", locale);
  if (tag && tag !== "all") q = q.contains("tags", [tag]);
  const { data } = await q;
  const rows = (data as { email: string; phone: string | null }[]) ?? [];
  return {
    emails: rows.map((r) => r.email).filter(Boolean),
    phones: rows.map((r) => r.phone || "").filter(Boolean),
  };
}

// ── Email campaigns ─────────────────────────────────────────
export async function sendEmailCampaign(input: {
  subject: string;
  html: string;
  segment_tag: string;
  locale?: "bg" | "en" | "";
  scheduled_at?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const locale = input.locale || undefined;

  const { emails } = await recipientsForSegment(input.segment_tag, locale);
  if (emails.length === 0) {
    return { ok: false, message: "No subscribers match this segment." };
  }

  try {
    let jobId = "";
    let status: "sent" | "scheduled" = "sent";

    if (input.scheduled_at) {
      const res = await scheduleEmail({
        subject: input.subject,
        html: input.html,
        recipients: emails,
        sendAt: new Date(input.scheduled_at).toISOString(),
        idempotencyKey: `camp-${Date.now()}`,
      });
      jobId = res.jobId;
      status = "scheduled";
    } else {
      const res = await sendEmail({
        subject: input.subject,
        html: input.html,
        recipients: emails,
      });
      jobId = res.jobId;
    }

    await supabase.from("email_campaigns").insert({
      subject: input.subject,
      html: input.html,
      locale: locale || null,
      segment_tag: input.segment_tag,
      recipients_count: emails.length,
      worker_job_id: jobId,
      status,
      scheduled_at: input.scheduled_at || null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    revalidatePath("/admin/campaigns");
    return { ok: true, message: `Queued to ${emails.length} subscribers.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await supabase.from("email_campaigns").insert({
      subject: input.subject,
      html: input.html,
      locale: locale || null,
      segment_tag: input.segment_tag,
      recipients_count: emails.length,
      status: "failed",
      error: message,
    });
    revalidatePath("/admin/campaigns");
    return { ok: false, message };
  }
}

// ── SMS campaigns ───────────────────────────────────────────
export async function sendSmsCampaign(input: {
  message: string;
  segment_tag: string;
  locale?: "bg" | "en" | "";
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const locale = input.locale || undefined;
  const { phones } = await recipientsForSegment(input.segment_tag, locale);
  if (phones.length === 0) {
    return { ok: false, message: "No subscribers with a phone number match this segment." };
  }

  const res = await sendSms({ message: input.message, recipients: phones });

  await supabase.from("sms_campaigns").insert({
    message: input.message,
    segment_tag: input.segment_tag,
    recipients_count: phones.length,
    provider_ref: res.providerRef || null,
    status: res.ok ? "sent" : "failed",
    sent_at: res.ok ? new Date().toISOString() : null,
    error: res.error || null,
  });

  revalidatePath("/admin/campaigns");
  return {
    ok: res.ok,
    message: res.ok
      ? `Sent to ${res.sent} numbers.`
      : res.error || "SMS failed",
  };
}
