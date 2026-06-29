"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { productPlacementKey } from "@/lib/site/product-placement";
import { productPlacementLabel } from "@/lib/site/cta-placements";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  scheduleEmail,
  getJobReport,
  cancelEmailJob,
  type RecipientRow,
} from "@/lib/worker/email";
import { sendSms, scheduleSms, getSmsJobReport, cancelSmsJob } from "@/lib/worker/sms";
import { runAutomations } from "@/lib/automation/send";
import { composeBrandedEmail } from "@/lib/email/layout";
import {
  campaignCtaRedirectUrl,
  isSafeCtaTarget,
} from "@/lib/email/cta-redirect";
import { cancelAutomationScheduledJobs } from "@/lib/automation/cancel";
import {
  syncAutomationDeliveries,
} from "@/lib/automation/sync";
import { renderEmailTemplate } from "@/lib/automation/template";
import { getAutomationDeliveries } from "@/lib/admin/automations-data";
import type { Automation, AutomationDelivery } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils";
import { formatScheduledAt, parseScheduledAt } from "@/lib/datetime";
import type { AudienceInput, CampaignStatus, SmsCampaignStatus, Segment } from "@/lib/supabase/types";
import { expandSegmentKeys, isDescendantOf } from "@/lib/segments/hierarchy";
import { uploadMediaImage } from "@/lib/supabase/media";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/media/folders";
import { parseYoutubeVideoId } from "@/lib/youtube";

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

export async function publishPost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data: row, error: loadError } = await supabase
    .from("blog_posts")
    .select("locale, slug, title")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, message: loadError?.message ?? "Post not found." };
  }

  const post = row as { locale: string; slug: string; title: string };
  if (!post.title?.trim()) {
    return { ok: false, message: "Add a title before publishing." };
  }

  const { error } = await supabase
    .from("blog_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${post.locale}/blog`);
  revalidatePath(`/${post.locale}/blog/${post.slug}`);
  revalidatePath("/admin/blog");
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

// ── Automations ───────────────────────────────────────────────
type AutomationInput = {
  name: string;
  channel: "email" | "sms";
  trigger_event: "registration" | "purchase" | "new_subscriber";
  enabled: boolean;
  segment_keys: string[];
  new_subscribers_only: boolean;
  after_automation_id?: string | null;
  delay_days?: number;
  send_time?: string;
  send_date?: string | null;
  subject_bg: string;
  html_bg: string;
  subject_en: string;
  html_en: string;
  cta_label_bg: string;
  cta_url_bg: string;
  cta_label_en: string;
  cta_url_en: string;
  sms_bg: string;
  sms_en: string;
  sort_order?: number;
};

function normalizeSendTime(value?: string): string {
  const m = (value ?? "09:00").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "09:00";
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeSendDate(value?: string | null): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? trimmed : null;
}

export async function createAutomation(
  input: AutomationInput,
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("automations")
    .insert({
      ...input,
      after_automation_id: input.after_automation_id || null,
      delay_days: Math.max(0, input.delay_days ?? 0),
      send_time: normalizeSendTime(input.send_time),
      send_date: normalizeSendDate(input.send_date),
      sort_order: input.sort_order ?? 0,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateAutomation(
  id: string,
  input: AutomationInput,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("automations")
    .update({
      ...input,
      after_automation_id: input.after_automation_id || null,
      delay_days: Math.max(0, input.delay_days ?? 0),
      send_time: normalizeSendTime(input.send_time),
      send_date: normalizeSendDate(input.send_date),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  await requireAdmin();
  await cancelAutomationScheduledJobs(id);
  const supabase = getAdminClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
}

export async function toggleAutomationEnabled(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  if (!enabled) {
    await cancelAutomationScheduledJobs(id);
  }
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("automations")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
}

export async function syncAutomation(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await syncAutomationDeliveries(id);
  revalidatePath("/admin/automations");
  return {
    ok: true,
    message: `Synced ${result.synced} of ${result.total} delivery(ies).`,
  };
}

export async function syncAllAutomations(): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data } = await supabase.from("automations").select("id");
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);

  let synced = 0;
  for (const id of ids) {
    const result = await syncAutomationDeliveries(id);
    synced += result.synced;
  }

  revalidatePath("/admin/automations");
  return {
    ok: true,
    message: `Synced ${synced} delivery(ies) across ${ids.length} automation(s).`,
  };
}

export async function getAutomationDeliveriesReport(
  automationId: string,
): Promise<
  | { ok: true; deliveries: AutomationDelivery[] }
  | { ok: false; message: string }
> {
  await requireAdmin();
  await syncAutomationDeliveries(automationId);
  const deliveries = await getAutomationDeliveries(automationId);
  revalidatePath("/admin/automations");
  return { ok: true, deliveries };
}

export async function resendAutomationToNonOpeners(
  automationId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .maybeSingle();

  const automation = row as Automation | null;
  if (!automation) {
    return { ok: false, message: "Automation not found." };
  }
  if (automation.channel !== "email") {
    return {
      ok: false,
      message: "Resend to non-openers is only available for email automations.",
    };
  }

  await syncAutomationDeliveries(automationId);
  const deliveries = await getAutomationDeliveries(automationId);

  const nonOpeners = deliveries.filter(
    (d) =>
      d.status === "sent" &&
      !d.opened_at &&
      d.recipient_status !== "bounced" &&
      d.recipient_status !== "opened" &&
      d.recipient_status !== "failed" &&
      d.recipient_status !== "complained",
  );

  if (nonOpeners.length === 0) {
    return {
      ok: false,
      message: "Everyone has opened (or bounced) — nobody to resend to.",
    };
  }

  const emails = nonOpeners.map((d) => d.email);
  const { data: subs } = await supabase
    .from("subscribers")
    .select("email, locale, name")
    .in("email", emails);

  const byLocale = new Map<"bg" | "en", string[]>();
  for (const email of emails) {
    const sub = (subs as { email: string; locale: string }[] | null)?.find(
      (s) => s.email === email,
    );
    const locale = sub?.locale === "en" ? "en" : "bg";
    const list = byLocale.get(locale) ?? [];
    list.push(email);
    byLocale.set(locale, list);
  }

  for (const [locale, localeEmails] of byLocale) {
    const subjectTpl =
      locale === "en" ? automation.subject_en : automation.subject_bg;
    const htmlTpl = locale === "en" ? automation.html_en : automation.html_bg;
    const sampleEmail = localeEmails[0] ?? "";
    const subject = renderEmailTemplate(subjectTpl, {
      name: null,
      email: sampleEmail,
    }).slice(0, 250);
    const html = renderEmailTemplate(htmlTpl, {
      name: null,
      email: sampleEmail,
    });
    const ctaLabel =
      locale === "en" ? automation.cta_label_en : automation.cta_label_bg;
    const ctaUrl = locale === "en" ? automation.cta_url_en : automation.cta_url_bg;

    await dispatchCampaign({
      subject,
      html,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      locale,
      segment_tag: `${automation.name} · resend`,
      target_tags: automation.segment_keys.length
        ? automation.segment_keys
        : null,
      recipients: localeEmails,
    });
  }

  revalidatePath("/admin/automations");
  revalidatePath("/admin/campaigns");
  return {
    ok: true,
    message: `Resent to ${emails.length} non-opener(s). Track progress under Campaigns.`,
  };
}

// ── Subscribers ─────────────────────────────────────────────
export async function addSubscriber(input: {
  email: string;
  name?: string;
  phone?: string;
  locale: "bg" | "en";
  tags?: string[];
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const email = input.email.trim().toLowerCase();
  const tags = Array.from(
    new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean)),
  );

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, tags")
    .eq("email", email)
    .maybeSingle();

  const mergedTags = existing
    ? Array.from(new Set([...(existing.tags as string[]), ...tags]))
    : tags;

  const { error } = await supabase.from("subscribers").upsert(
    {
      email,
      name: input.name || null,
      phone: input.phone || null,
      locale: input.locale,
      source: "manual",
      tags: mergedTags,
      status: "subscribed",
    },
    { onConflict: "email" },
  );
  if (error) return { ok: false, message: error.message };

  const isNew = !existing;
  const { data: row } = await supabase
    .from("subscribers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  void runAutomations({
    email,
    name: input.name ?? null,
    phone: input.phone ?? null,
    locale: input.locale,
    subscriberId: (row as { id: string } | null)?.id ?? null,
    tags: mergedTags,
    isNew,
    source: "manual",
  });

  revalidatePath("/admin/subscribers");
  return { ok: true };
}

export async function importSubscribers(input: {
  rows: {
    email: string;
    name?: string;
    phone?: string;
    locale?: "bg" | "en";
    status?: "subscribed" | "unsubscribed";
    segments?: string[];
    notes?: string;
  }[];
  mergeSegments?: boolean;
}): Promise<
  ActionResult & {
    created?: number;
    updated?: number;
    failed?: number;
    errors?: string[];
  }
> {
  await requireAdmin();
  const supabase = getAdminClient();
  const mergeSegments = input.mergeSegments !== false;

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of input.rows) {
    const email = row.email.trim().toLowerCase();
    if (!email) continue;

    const tags = Array.from(
      new Set((row.segments ?? []).map((t) => t.trim()).filter(Boolean)),
    );

    try {
      const { data: existing } = await supabase
        .from("subscribers")
        .select("id, tags")
        .eq("email", email)
        .maybeSingle();

      const mergedTags = existing && mergeSegments
        ? Array.from(new Set([...(existing.tags as string[]), ...tags]))
        : tags;

      const payload = {
        email,
        name: row.name?.trim() || null,
        phone: row.phone?.trim() || null,
        locale: row.locale === "en" ? "en" : "bg",
        status: row.status === "unsubscribed" ? "unsubscribed" : "subscribed",
        source: "import",
        tags: mergedTags,
        notes: row.notes?.trim() || null,
      } as const;

      const { error } = await supabase
        .from("subscribers")
        .upsert(payload, { onConflict: "email" });

      if (error) {
        failed += 1;
        if (errors.length < 5) errors.push(`${email}: ${error.message}`);
        continue;
      }

      if (existing) updated += 1;
      else created += 1;
    } catch (err) {
      failed += 1;
      if (errors.length < 5) {
        errors.push(
          `${email}: ${err instanceof Error ? err.message : "Import failed"}`,
        );
      }
    }
  }

  revalidatePath("/admin/subscribers");

  const total = created + updated;
  if (total === 0 && failed > 0) {
    return {
      ok: false,
      message: errors[0] ?? "Import failed.",
      created,
      updated,
      failed,
      errors,
    };
  }

  return {
    ok: true,
    message: `Imported ${total} subscriber(s): ${created} new, ${updated} updated${failed ? `, ${failed} failed` : ""}.`,
    created,
    updated,
    failed,
    errors: errors.length ? errors : undefined,
  };
}

export async function updateSubscriber(input: {
  id: string;
  tags?: string[];
  status?: "subscribed" | "unsubscribed";
  notes?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const patch: Partial<import("@/lib/supabase/types").Subscriber> = {};
  if (input.tags !== undefined) {
    patch.tags = Array.from(
      new Set(input.tags.map((t) => t.trim()).filter(Boolean)),
    );
  }
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

// ── Segments ────────────────────────────────────────────────
export async function createSegment(input: {
  key: string;
  name: string;
  description?: string;
  parent_id?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const key = slugify(input.key || input.name);
  if (!key || key === "all") {
    return { ok: false, message: "Invalid segment key." };
  }

  let parentId: string | null = input.parent_id?.trim() || null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("segments")
      .select("id, key")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent) return { ok: false, message: "Parent segment not found." };
    if ((parent as { key: string }).key === "all") {
      return { ok: false, message: '"all" cannot be a parent segment.' };
    }
  } else {
    parentId = null;
  }

  const { error } = await supabase.from("segments").insert({
    key,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    parent_id: parentId,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true, message: `Segment "${input.name}" created.` };
}

export async function updateSegment(input: {
  id: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("segments")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  const segment = row as Segment | null;
  if (!segment) return { ok: false, message: "Segment not found." };
  if (segment.key === "all") {
    return { ok: false, message: 'The "all" segment cannot be edited.' };
  }

  const patch: Partial<Pick<Segment, "name" | "description" | "parent_id">> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.parent_id !== undefined) {
    const parentId = input.parent_id?.trim() || null;
    if (parentId === input.id) {
      return { ok: false, message: "A segment cannot be its own parent." };
    }
    if (parentId) {
      const { data: allRows } = await supabase.from("segments").select("*");
      const all = (allRows as Segment[]) ?? [];
      if (!all.some((s) => s.id === parentId)) {
        return { ok: false, message: "Parent segment not found." };
      }
      if (isDescendantOf(parentId, input.id, all)) {
        return { ok: false, message: "Cannot nest a segment under its own subgroup." };
      }
      const parent = all.find((s) => s.id === parentId);
      if (parent?.key === "all") {
        return { ok: false, message: '"all" cannot be a parent segment.' };
      }
    }
    patch.parent_id = parentId;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase.from("segments").update(patch).eq("id", input.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

export async function deleteSegment(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("segments")
    .select("key")
    .eq("id", id)
    .maybeSingle();

  const segment = row as { key: string } | null;
  if (!segment) return { ok: false, message: "Segment not found." };
  if (segment.key === "all") {
    return { ok: false, message: 'The "all" segment cannot be deleted.' };
  }

  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

// ── Audience targeting ──────────────────────────────────────
type ResolvedAudience = {
  emails: string[];
  phones: string[];
  label: string;
  segment_tag: string;
  target_tags: string[] | null;
};

async function resolveAudience(input: AudienceInput): Promise<ResolvedAudience> {
  const supabase = getAdminClient();
  const locale = input.locale || undefined;

  let q = supabase
    .from("subscribers")
    .select("email, phone")
    .eq("status", "subscribed");

  if (locale) q = q.eq("locale", locale);

  if (input.mode === "tags") {
    const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      return {
        emails: [],
        phones: [],
        label: "tags: (none)",
        segment_tag: "tags:",
        target_tags: [],
      };
    }
    q = q.overlaps("tags", tags);
    const { data } = await q;
    const rows = (data as { email: string; phone: string | null }[]) ?? [];
    return {
      emails: rows.map((r) => r.email).filter(Boolean),
      phones: rows.map((r) => r.phone || "").filter(Boolean),
      label: `tags: ${tags.join(", ")}`,
      segment_tag: `tags:${tags.join(",")}`,
      target_tags: tags,
    };
  }

  const key = input.segment_key || "all";
  const keys =
    input.segment_keys && input.segment_keys.length > 0
      ? input.segment_keys
      : [key];

  if (keys.length === 1 && keys[0] === "all") {
    const { data } = await q;
    const rows = (data as { email: string; phone: string | null }[]) ?? [];
    return {
      emails: rows.map((r) => r.email).filter(Boolean),
      phones: rows.map((r) => r.phone || "").filter(Boolean),
      label: "all",
      segment_tag: "all",
      target_tags: null,
    };
  }

  const { data: segmentRows } = await supabase.from("segments").select("*");
  const allSegments = (segmentRows as Segment[]) ?? [];
  const rawKeys = keys.filter((k) => k && k !== "all");
  const filtered = expandSegmentKeys(rawKeys, allSegments);
  if (filtered.length === 0) {
    return {
      emails: [],
      phones: [],
      label: "segments: (none)",
      segment_tag: "segments:",
      target_tags: [],
    };
  }

  const nameByKey = new Map(allSegments.map((s) => [s.key, s.name]));
  const labelParts = rawKeys.map((k) => nameByKey.get(k) ?? k);
  const includesSubgroups = filtered.length > rawKeys.length;

  q = q.overlaps("tags", filtered);
  const { data } = await q;
  const rows = (data as { email: string; phone: string | null }[]) ?? [];
  return {
    emails: rows.map((r) => r.email).filter(Boolean),
    phones: rows.map((r) => r.phone || "").filter(Boolean),
    label: `segments: ${labelParts.join(", ")}${includesSubgroups ? " (вкл. подгрупи)" : ""}`,
    segment_tag: `segments:${filtered.join(",")}`,
    target_tags: filtered,
  };
}

export async function previewAudience(
  input: AudienceInput,
): Promise<{ ok: true; emails: number; phones: number; label: string } | { ok: false; message: string }> {
  await requireAdmin();
  const audience = await resolveAudience(input);
  return {
    ok: true,
    emails: audience.emails.length,
    phones: audience.phones.length,
    label: audience.label,
  };
}


// ── Email campaigns ─────────────────────────────────────────

/** Map worker job status + counts → our campaign status. */
function deriveCampaignStatus(
  workerStatus: string,
  counts: { sent: number; failed: number; total: number },
  scheduled: boolean,
): CampaignStatus {
  switch (workerStatus) {
    case "pending":
      return scheduled ? "scheduled" : "queued";
    case "processing":
      return "sending";
    case "canceled":
      return "canceled";
    case "failed":
      return "failed";
    case "sent":
    default:
      if (counts.failed > 0 && counts.sent > 0) return "partial";
      if (counts.sent === 0 && counts.failed > 0) return "failed";
      return "sent";
  }
}

type CampaignInsert = {
  subject: string;
  html: string;
  cta_label?: string;
  cta_url?: string;
  locale: "bg" | "en" | null;
  segment_tag: string;
  target_tags: string[] | null;
  recipients: string[];
  scheduledAt?: string;
  parentCampaignId?: string;
};

/** Core sender: create the worker job, then persist a campaign row with the
 *  REAL status + counts returned by the worker (no more hardcoded "sent"). */
async function dispatchCampaign(input: CampaignInsert): Promise<ActionResult> {
  const supabase = getAdminClient();
  const total = input.recipients.length;

  if (total === 0) {
    return { ok: false, message: "No recipients match this segment." };
  }

  const ctaLabel = input.cta_label?.trim() ?? "";
  const ctaUrl = input.cta_url?.trim() ?? "";

  if (ctaUrl && !isSafeCtaTarget(ctaUrl)) {
    return { ok: false, message: "Invalid button link." };
  }

  const initialStatus: CampaignStatus = input.scheduledAt ? "scheduled" : "queued";
  let scheduledAtIso: string | null = null;
  if (input.scheduledAt) {
    scheduledAtIso = parseScheduledAt(input.scheduledAt);
    if (!scheduledAtIso) {
      return { ok: false, message: "Invalid schedule time." };
    }
  }

  const { data: draft, error: draftError } = await supabase
    .from("email_campaigns")
    .insert({
      subject: input.subject,
      html: input.html,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      locale: input.locale,
      segment_tag: input.segment_tag,
      target_tags: input.target_tags,
      recipients_count: total,
      total_count: total,
      status: initialStatus,
      scheduled_at: scheduledAtIso,
      parent_campaign_id: input.parentCampaignId || null,
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return { ok: false, message: draftError?.message ?? "Could not create campaign." };
  }

  const campaignId = (draft as { id: string }).id;
  const ctaHref =
    ctaLabel && ctaUrl ? campaignCtaRedirectUrl(campaignId) : null;
  const wrappedHtml = composeBrandedEmail({
    bodyHtml: input.html,
    locale: input.locale === "en" ? "en" : "bg",
    cta: ctaHref ? { label: ctaLabel, href: ctaHref } : null,
  });

  try {
    let jobId = "";
    let workerStatus = "pending";
    let sent = 0;
    let failed = 0;

    if (scheduledAtIso) {
      const res = await scheduleEmail({
        subject: input.subject,
        html: wrappedHtml,
        recipients: input.recipients,
        sendAt: scheduledAtIso,
        idempotencyKey: `camp-${Date.now()}`,
      });
      jobId = res.jobId;
      workerStatus = res.status || "pending";
    } else {
      const res = await sendEmail({
        subject: input.subject,
        html: wrappedHtml,
        recipients: input.recipients,
      });
      jobId = res.jobId;
      workerStatus = res.status || "sent";
      sent = res.sent ?? 0;
      failed = res.failed ?? 0;
    }

    const status = deriveCampaignStatus(
      workerStatus,
      { sent, failed, total },
      Boolean(scheduledAtIso),
    );

    const { error: updateError } = await supabase
      .from("email_campaigns")
      .update({
        worker_job_id: jobId,
        status,
        scheduled_at: scheduledAtIso,
        sent_at: scheduledAtIso ? null : new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateError) return { ok: false, message: updateError.message };

    if (jobId && !scheduledAtIso) {
      await persistCampaignSync(campaignId, jobId, null, total);
    }

    revalidatePath("/admin/campaigns");

    const msg =
      status === "scheduled"
        ? `Scheduled for ${total} subscribers.`
        : status === "failed"
          ? `Send failed for all ${total} recipients.`
          : status === "partial"
            ? `Sent to ${sent}, failed ${failed} of ${total}.`
            : `Sent to ${total} subscribers.`;

    return {
      ok: status !== "failed",
      message: msg,
      id: campaignId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await supabase
      .from("email_campaigns")
      .update({
        status: "failed",
        error: message,
      })
      .eq("id", campaignId);
    revalidatePath("/admin/campaigns");
    return { ok: false, message };
  }
}

export async function updateEmailCampaignCta(
  id: string,
  input: { cta_label: string; cta_url: string },
): Promise<ActionResult> {
  await requireAdmin();
  const ctaLabel = input.cta_label.trim();
  const ctaUrl = input.cta_url.trim();

  if (ctaLabel && !ctaUrl) {
    return { ok: false, message: "Add a link for the button, or clear the label." };
  }
  if (ctaUrl && !isSafeCtaTarget(ctaUrl)) {
    return { ok: false, message: "Invalid button link." };
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({ cta_label: ctaLabel, cta_url: ctaUrl })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return {
    ok: true,
    message: ctaUrl
      ? "Линкът е обновен — вече изпратените имейли ще пренасочват към новия адрес."
      : "Бутонът е премахнат от тази кампания.",
  };
}

export async function sendEmailCampaign(input: {
  subject: string;
  html: string;
  cta_label?: string;
  cta_url?: string;
  audience: AudienceInput;
  scheduled_at?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const ctaLabel = input.cta_label?.trim() ?? "";
  const ctaUrl = input.cta_url?.trim() ?? "";
  if (ctaLabel && !ctaUrl) {
    return { ok: false, message: "Добави линк за бутона или махни текста." };
  }
  if (ctaUrl && !ctaLabel) {
    return { ok: false, message: "Добави текст за бутона." };
  }
  const locale = input.audience.locale || undefined;
  const audience = await resolveAudience(input.audience);

  return dispatchCampaign({
    subject: input.subject,
    html: input.html,
    cta_label: input.cta_label,
    cta_url: input.cta_url,
    locale: locale ?? null,
    segment_tag: audience.segment_tag,
    target_tags: audience.target_tags,
    recipients: audience.emails,
    scheduledAt: input.scheduled_at || undefined,
  });
}

/** Pull authoritative status + open tracking from the worker into our DB. */
export async function syncEmailCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("email_campaigns")
    .select("id, worker_job_id, scheduled_at, recipients_count")
    .eq("id", id)
    .maybeSingle();

  const campaign = row as
    | { worker_job_id: string | null; scheduled_at: string | null; recipients_count: number }
    | null;

  if (!campaign?.worker_job_id) {
    return { ok: false, message: "No worker job linked to this campaign." };
  }

  const res = await persistCampaignSync(
    id,
    campaign.worker_job_id,
    campaign.scheduled_at,
    campaign.recipients_count,
  );
  if (res.ok) revalidatePath("/admin/campaigns");
  return res;
}

async function persistCampaignSync(
  id: string,
  workerJobId: string,
  scheduledAt: string | null,
  recipientsCount: number,
): Promise<ActionResult> {
  const supabase = getAdminClient();
  const report = await getJobReport(workerJobId);
  if (!report) {
    return { ok: false, message: "Could not reach the worker for this job." };
  }

  const t = report.tracking;
  const status = deriveCampaignStatus(
    report.status,
    { sent: t.sent, failed: t.failed + t.bounced, total: t.total },
    Boolean(scheduledAt),
  );

  const { error } = await supabase
    .from("email_campaigns")
    .update({
      status,
      sent_count: t.sent,
      failed_count: t.failed,
      bounced_count: t.bounced,
      delivered_count: t.delivered,
      opened_count: t.opened,
      not_opened_count: t.notOpened,
      total_count: t.total || recipientsCount,
      sent_at: report.sentAt,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Refresh every campaign that still has a worker job (skips drafts/failed-at-create). */
export async function syncAllEmailCampaigns(): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("email_campaigns")
    .select("id, worker_job_id")
    .not("worker_job_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data as { id: string; worker_job_id: string | null }[]) ?? [];

  await Promise.all(
    rows.map(async (r) => {
      try {
        await syncEmailCampaign(r.id);
      } catch {
        /* ignore individual failures so one bad job doesn't block the rest */
      }
    }),
  );

  revalidatePath("/admin/campaigns");
  return { ok: true, message: `Synced ${rows.length} campaign(s).` };
}

/** One-click resend to everyone who has NOT opened the original campaign. */
export async function resendToNonOpeners(input: {
  campaignId: string;
  subject?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .maybeSingle();

  const parent = row as
    | {
        worker_job_id: string | null;
        subject: string;
        html: string;
        cta_label: string;
        cta_url: string;
        locale: "bg" | "en" | null;
        segment_tag: string;
      }
    | null;

  if (!parent?.worker_job_id) {
    return { ok: false, message: "No worker job linked to this campaign." };
  }

  const report = await getJobReport(parent.worker_job_id);
  const emails = report?.notOpenedEmails ?? [];
  if (emails.length === 0) {
    return {
      ok: false,
      message: "Everyone has opened it (or bounced) — nobody to resend to.",
    };
  }

  const subject = (input.subject?.trim() || `${parent.subject}`).slice(0, 250);

  return dispatchCampaign({
    subject,
    html: parent.html,
    cta_label: parent.cta_label,
    cta_url: parent.cta_url,
    locale: parent.locale,
    segment_tag: `${parent.segment_tag} · resend`,
    target_tags: null,
    recipients: emails,
    parentCampaignId: input.campaignId,
  });
}

export async function getCampaignRecipientReport(
  campaignId: string,
): Promise<
  | {
      ok: true;
      recipients: RecipientRow[];
      tracking: import("@/lib/worker/email").RecipientStats;
    }
  | { ok: false; message: string }
> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("email_campaigns")
    .select("worker_job_id")
    .eq("id", campaignId)
    .maybeSingle();

  const campaign = row as { worker_job_id: string | null } | null;
  if (!campaign?.worker_job_id) {
    return { ok: false, message: "No worker job linked." };
  }

  const report = await getJobReport(campaign.worker_job_id);
  if (!report) {
    return { ok: false, message: "Could not load recipient report." };
  }

  return { ok: true, recipients: report.recipients, tracking: report.tracking };
}

const CANCELABLE_EMAIL_STATUSES: CampaignStatus[] = ["scheduled", "queued"];

export async function cancelEmailCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, worker_job_id, status")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { ok: false, message: "Campaign not found." };
  }

  const campaign = data as {
    id: string;
    worker_job_id: string | null;
    status: CampaignStatus;
  };

  if (!CANCELABLE_EMAIL_STATUSES.includes(campaign.status)) {
    return {
      ok: false,
      message: "Only scheduled or queued campaigns can be canceled.",
    };
  }

  let workerCanceled = false;
  if (campaign.worker_job_id) {
    workerCanceled = await cancelEmailJob(campaign.worker_job_id);
  }

  const { error: updateError } = await supabase
    .from("email_campaigns")
    .update({
      status: "canceled",
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return { ok: false, message: updateError.message };

  revalidatePath("/admin/campaigns");
  return {
    ok: true,
    message: workerCanceled
      ? "Scheduled send canceled."
      : "Campaign marked as canceled.",
  };
}

export async function deleteEmailCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("email_campaigns")
    .select("worker_job_id, status")
    .eq("id", id)
    .maybeSingle();

  const campaign = data as {
    worker_job_id: string | null;
    status: CampaignStatus;
  } | null;

  if (
    campaign?.worker_job_id &&
    CANCELABLE_EMAIL_STATUSES.includes(campaign.status)
  ) {
    await cancelEmailJob(campaign.worker_job_id);
  }

  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

// ── SMS campaigns ───────────────────────────────────────────

function deriveSmsCampaignStatus(
  workerStatus: string,
  counts: { sent: number; failed: number; total: number },
  scheduled: boolean,
): SmsCampaignStatus {
  switch (workerStatus) {
    case "pending":
      return scheduled ? "scheduled" : "queued";
    case "processing":
      return "sending";
    case "canceled":
      return "canceled";
    case "failed":
      return "failed";
    case "sent":
    case "partial":
    default:
      if (counts.failed > 0 && counts.sent > 0) return "partial";
      if (counts.sent === 0 && counts.failed > 0) return "failed";
      if (counts.sent > 0) return "sent";
      return scheduled ? "scheduled" : "queued";
  }
}

async function persistSmsCampaignSync(
  id: string,
  workerJobId: string,
  scheduledAt: string | null,
  recipientsCount: number,
): Promise<ActionResult & { status?: SmsCampaignStatus; sent?: number; failed?: number }> {
  const supabase = getAdminClient();
  const report = await getSmsJobReport(workerJobId);
  if (!report) {
    return { ok: false, message: "Could not reach the worker for this SMS job." };
  }

  const t = report.tracking;
  const failedTotal = t.failed + t.invalid;
  const status = deriveSmsCampaignStatus(
    report.status,
    { sent: t.sent, failed: failedTotal, total: t.total || recipientsCount },
    Boolean(scheduledAt) && report.status === "pending",
  );

  const { error } = await supabase
    .from("sms_campaigns")
    .update({
      status,
      sent_count: t.sent,
      failed_count: failedTotal,
      sent_at: report.sentAt,
      error: report.error,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, status, sent: t.sent, failed: failedTotal };
}

export async function sendSmsCampaign(input: {
  message: string;
  audience: AudienceInput;
  scheduled_at?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const audience = await resolveAudience(input.audience);

  if (audience.phones.length === 0) {
    return {
      ok: false,
      message: "No subscribers with a phone number match this audience.",
    };
  }

  const scheduledAt = input.scheduled_at
    ? parseScheduledAt(input.scheduled_at)
    : undefined;

  if (input.scheduled_at && !scheduledAt) {
    return { ok: false, message: "Invalid schedule time." };
  }

  try {
    const res = scheduledAt
      ? await scheduleSms({
          body: input.message,
          recipients: audience.phones,
          sendAt: scheduledAt,
          idempotencyKey: `sms-${Date.now()}`,
        })
      : await sendSms({
          body: input.message,
          recipients: audience.phones,
        });

    const invalidNote =
      res.invalid && res.invalid > 0
        ? `${res.invalid} invalid phone number(s) skipped`
        : null;
    const workerErrors = res.errors?.length ? res.errors.join("; ") : null;
    const initialError = [invalidNote, workerErrors].filter(Boolean).join(" | ") || null;

    const { data, error } = await supabase
      .from("sms_campaigns")
      .insert({
        message: input.message,
        segment_tag: audience.segment_tag,
        recipients_count: audience.phones.length,
        provider_ref: res.jobId,
        status: scheduledAt ? "scheduled" : "queued",
        scheduled_at: scheduledAt ?? null,
        sent_count: 0,
        failed_count: 0,
        error: initialError,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    const campaignId = (data as { id: string }).id;
    let status: SmsCampaignStatus = scheduledAt ? "scheduled" : "queued";
    let sent = 0;
    let failed = 0;

    if (res.jobId) {
      const sync = await persistSmsCampaignSync(
        campaignId,
        res.jobId,
        scheduledAt ?? null,
        audience.phones.length,
      );
      if (sync.status) status = sync.status;
      sent = sync.sent ?? 0;
      failed = sync.failed ?? 0;
    }

    revalidatePath("/admin/campaigns");

    const msg = scheduledAt
      ? `Scheduled for ${audience.phones.length} numbers at ${formatScheduledAt(scheduledAt, "en")}.`
      : status === "failed"
        ? `Send failed for all ${audience.phones.length} recipients.`
        : status === "partial"
          ? `Sent to ${sent}, failed ${failed} of ${audience.phones.length}.`
          : status === "sent"
            ? `Sent to ${sent} numbers.`
            : `Queued for ${audience.phones.length} numbers.`;

    return { ok: status !== "failed", message: msg };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMS failed";

    await supabase.from("sms_campaigns").insert({
      message: input.message,
      segment_tag: audience.segment_tag,
      recipients_count: audience.phones.length,
      status: "failed",
      error: message,
    });

    revalidatePath("/admin/campaigns");
    return { ok: false, message };
  }
}

export async function syncSmsCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("sms_campaigns")
    .select("id, provider_ref, scheduled_at, recipients_count")
    .eq("id", id)
    .maybeSingle();

  const campaign = row as
    | {
        provider_ref: string | null;
        scheduled_at: string | null;
        recipients_count: number;
      }
    | null;

  if (!campaign?.provider_ref) {
    return { ok: false, message: "No worker job linked to this SMS campaign." };
  }

  const res = await persistSmsCampaignSync(
    id,
    campaign.provider_ref,
    campaign.scheduled_at,
    campaign.recipients_count,
  );
  if (res.ok) revalidatePath("/admin/campaigns");
  return res;
}

export async function syncAllSmsCampaigns(): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("sms_campaigns")
    .select("id, provider_ref")
    .not("provider_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data as { id: string }[]) ?? [];

  await Promise.all(
    rows.map(async (r) => {
      try {
        await syncSmsCampaign(r.id);
      } catch {
        /* ignore individual failures */
      }
    }),
  );

  revalidatePath("/admin/campaigns");
  return { ok: true, message: `Synced ${rows.length} SMS campaign(s).` };
}

const CANCELABLE_SMS_STATUSES: SmsCampaignStatus[] = ["scheduled", "queued"];

export async function cancelSmsCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("sms_campaigns")
    .select("id, provider_ref, status")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { ok: false, message: "SMS campaign not found." };
  }

  const campaign = data as {
    id: string;
    provider_ref: string | null;
    status: SmsCampaignStatus;
  };

  if (!CANCELABLE_SMS_STATUSES.includes(campaign.status)) {
    return {
      ok: false,
      message: "Only scheduled or queued SMS campaigns can be canceled.",
    };
  }

  let workerCanceled = false;
  if (campaign.provider_ref) {
    workerCanceled = await cancelSmsJob(campaign.provider_ref);
  }

  const { error: updateError } = await supabase
    .from("sms_campaigns")
    .update({ status: "canceled" })
    .eq("id", id);

  if (updateError) return { ok: false, message: updateError.message };

  revalidatePath("/admin/campaigns");
  return {
    ok: true,
    message: workerCanceled
      ? "Scheduled SMS canceled."
      : "SMS campaign marked as canceled.",
  };
}

export async function deleteSmsCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("sms_campaigns")
    .select("provider_ref, status")
    .eq("id", id)
    .maybeSingle();

  const campaign = data as {
    provider_ref: string | null;
    status: SmsCampaignStatus;
  } | null;

  if (
    campaign?.provider_ref &&
    CANCELABLE_SMS_STATUSES.includes(campaign.status)
  ) {
    await cancelSmsJob(campaign.provider_ref);
  }

  const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

// ── Website (events & Stripe products) ────────────────────────
function revalidateSitePaths() {
  revalidatePath("/admin/website");
  revalidatePath("/bg");
  revalidatePath("/en");
}

async function syncProductPlacement(
  supabase: ReturnType<typeof getAdminClient>,
  productId: string,
  title_bg: string,
  title_en: string,
): Promise<ActionResult> {
  const { error } = await supabase.from("site_cta_placements").upsert(
    {
      key: productPlacementKey(productId),
      ...productPlacementLabel(title_bg, title_en),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function saveSiteSection(input: {
  key: "events" | "products" | "videos";
  enabled: boolean;
  title_bg?: string;
  title_en?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_sections").upsert(
    {
      key: input.key,
      enabled: input.enabled,
      title_bg: input.title_bg ?? "",
      title_en: input.title_en ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true };
}

export async function saveSiteEvent(input: {
  id?: string;
  title_bg: string;
  title_en: string;
  description_bg?: string;
  description_en?: string;
  url: string;
  image_url?: string;
  event_date?: string | null;
  offer_id?: string | null;
  offer_headline_bg?: string;
  offer_headline_en?: string;
  offer_enabled?: boolean;
  enabled?: boolean;
  sort_order?: number;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const row = {
    title_bg: input.title_bg.trim(),
    title_en: input.title_en.trim(),
    description_bg: input.description_bg?.trim() ?? "",
    description_en: input.description_en?.trim() ?? "",
    url: input.url.trim(),
    image_url: input.image_url?.trim() || null,
    event_date: normalizeSendDate(input.event_date),
    offer_id: input.offer_id || null,
    offer_headline_bg: input.offer_headline_bg?.trim() ?? "",
    offer_headline_en: input.offer_headline_en?.trim() ?? "",
    offer_enabled: input.offer_enabled ?? false,
    enabled: input.enabled ?? true,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("site_events").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
    revalidateSitePaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("site_events")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteSiteEvent(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_events").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true };
}

export async function saveSiteVideo(input: {
  id?: string;
  title_bg?: string;
  title_en?: string;
  youtube_url: string;
  enabled?: boolean;
  sort_order?: number;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const youtubeUrl = input.youtube_url.trim();
  if (!parseYoutubeVideoId(youtubeUrl)) {
    return { ok: false, message: "Невалиден YouTube линк." };
  }

  const supabase = getAdminClient();
  const row = {
    title_bg: input.title_bg?.trim() ?? "",
    title_en: input.title_en?.trim() ?? "",
    youtube_url: youtubeUrl,
    enabled: input.enabled ?? true,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("site_videos").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
    revalidateSitePaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("site_videos").insert(row).select("id").single();
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteSiteVideo(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_videos").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true };
}

export async function saveSiteProduct(input: {
  id?: string;
  title_bg: string;
  title_en: string;
  description_bg?: string;
  description_en?: string;
  stripe_url: string;
  stripe_price_id?: string;
  price_label_bg?: string;
  price_label_en?: string;
  image_url?: string;
  headline_bg?: string;
  headline_en?: string;
  cta_label_bg?: string;
  cta_label_en?: string;
  enabled?: boolean;
  sort_order?: number;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const titleBg = input.title_bg.trim();
  const titleEn = input.title_en.trim() || titleBg;
  if (!titleBg) {
    return { ok: false, message: "Попълни име на продукта (BG)." };
  }
  if (!input.stripe_url?.trim()) {
    return { ok: false, message: "Попълни Stripe линк." };
  }

  const row = {
    title_bg: titleBg,
    title_en: titleEn,
    description_bg: input.description_bg?.trim() ?? "",
    description_en: input.description_en?.trim() ?? "",
    stripe_url: input.stripe_url.trim(),
    stripe_price_id: input.stripe_price_id?.trim() ?? "",
    price_label_bg: input.price_label_bg?.trim() ?? "",
    price_label_en: input.price_label_en?.trim() ?? "",
    image_url: input.image_url?.trim() || null,
    offer_type: "upsell" as const,
    headline_bg: input.headline_bg?.trim() ?? "",
    headline_en: input.headline_en?.trim() ?? "",
    cta_label_bg: input.cta_label_bg?.trim() ?? "",
    cta_label_en: input.cta_label_en?.trim() ?? "",
    audience_tags: [] as string[],
    enabled: input.enabled ?? true,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("site_products").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
    const sync = await syncProductPlacement(supabase, input.id, row.title_bg, row.title_en);
    if (!sync.ok) return sync;
    revalidateSitePaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("site_products")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  const productId = (data as { id: string }).id;
  const sync = await syncProductPlacement(supabase, productId, row.title_bg, row.title_en);
  if (!sync.ok) return sync;
  revalidateSitePaths();
  return { ok: true, id: productId };
}

export async function deleteSiteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_products").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  await supabase
    .from("site_cta_placements")
    .delete()
    .eq("key", productPlacementKey(id));
  revalidateSitePaths();
  return { ok: true };
}

export async function saveCtaPlacement(input: {
  key: string;
  offer_id?: string | null;
  offer_headline_bg?: string;
  offer_headline_en?: string;
  offer_enabled?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("site_cta_placements")
    .update({
      offer_id: input.offer_id || null,
      offer_headline_bg: input.offer_headline_bg?.trim() ?? "",
      offer_headline_en: input.offer_headline_en?.trim() ?? "",
      offer_enabled: input.offer_enabled ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("key", input.key);
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true };
}

// ── Media uploads ───────────────────────────────────────────
export async function uploadSiteImage(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return { ok: false, message: "Липсва файл." };
  }
  if (typeof folder !== "string" || !MEDIA_FOLDERS.includes(folder as MediaFolder)) {
    return { ok: false, message: "Невалидна папка за качване." };
  }

  const result = await uploadMediaImage(file, folder as MediaFolder);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, url: result.url };
}
