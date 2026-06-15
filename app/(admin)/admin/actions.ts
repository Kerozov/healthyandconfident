"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  scheduleEmail,
  getJobReport,
  type RecipientRow,
} from "@/lib/worker/email";
import { sendSms } from "@/lib/sms/notifier";
import { slugify } from "@/lib/utils";
import type { AudienceInput, CampaignStatus } from "@/lib/supabase/types";

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

// ── Segments ────────────────────────────────────────────────
export async function createSegment(input: {
  key: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const key = slugify(input.key || input.name);
  if (!key || key === "all") {
    return { ok: false, message: "Invalid segment key." };
  }

  const { error } = await supabase.from("segments").insert({
    key,
    name: input.name.trim(),
    description: input.description?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true, message: `Segment "${input.name}" created.` };
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
  if (key !== "all") q = q.contains("tags", [key]);
  const { data } = await q;
  const rows = (data as { email: string; phone: string | null }[]) ?? [];
  return {
    emails: rows.map((r) => r.email).filter(Boolean),
    phones: rows.map((r) => r.phone || "").filter(Boolean),
    label: key,
    segment_tag: key,
    target_tags: null,
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

  try {
    let jobId = "";
    let workerStatus = "pending";
    let sent = 0;
    let failed = 0;

    if (input.scheduledAt) {
      const res = await scheduleEmail({
        subject: input.subject,
        html: input.html,
        recipients: input.recipients,
        sendAt: new Date(input.scheduledAt).toISOString(),
        idempotencyKey: `camp-${Date.now()}`,
      });
      jobId = res.jobId;
      workerStatus = res.status || "pending";
    } else {
      const res = await sendEmail({
        subject: input.subject,
        html: input.html,
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
      Boolean(input.scheduledAt),
    );

    const { data, error } = await supabase
      .from("email_campaigns")
      .insert({
        subject: input.subject,
        html: input.html,
        locale: input.locale,
        segment_tag: input.segment_tag,
        target_tags: input.target_tags,
        recipients_count: total,
        worker_job_id: jobId,
        status,
        scheduled_at: input.scheduledAt || null,
        sent_at: input.scheduledAt ? null : new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
        total_count: total,
        not_opened_count: sent,
        last_synced_at: new Date().toISOString(),
        parent_campaign_id: input.parentCampaignId || null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

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
      id: (data as { id: string }).id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await supabase.from("email_campaigns").insert({
      subject: input.subject,
      html: input.html,
      locale: input.locale,
      segment_tag: input.segment_tag,
      target_tags: input.target_tags,
      recipients_count: total,
      total_count: total,
      status: "failed",
      error: message,
      parent_campaign_id: input.parentCampaignId || null,
    });
    revalidatePath("/admin/campaigns");
    return { ok: false, message };
  }
}

export async function sendEmailCampaign(input: {
  subject: string;
  html: string;
  audience: AudienceInput;
  scheduled_at?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const locale = input.audience.locale || undefined;
  const audience = await resolveAudience(input.audience);

  return dispatchCampaign({
    subject: input.subject,
    html: input.html,
    locale: locale ?? null,
    segment_tag: audience.segment_tag,
    target_tags: audience.target_tags,
    recipients: audience.emails,
    scheduledAt: input.scheduled_at || undefined,
  });
}

/** Pull authoritative status + filtered open tracking from the worker into our DB. */
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

  const report = await getJobReport(campaign.worker_job_id);
  if (!report) {
    return { ok: false, message: "Could not reach the worker for this job." };
  }

  const t = report.tracking;
  const status = deriveCampaignStatus(
    report.status,
    { sent: t.sent, failed: t.failed + t.bounced, total: t.total },
    Boolean(campaign.scheduled_at),
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
      machine_opened_count: 0,
      not_opened_count: t.notOpened,
      total_count: t.total || campaign.recipients_count,
      sent_at: report.sentAt,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/campaigns");
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

export async function deleteEmailCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

// ── SMS campaigns ───────────────────────────────────────────
export async function sendSmsCampaign(input: {
  message: string;
  audience: AudienceInput;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const locale = input.audience.locale || undefined;
  const audience = await resolveAudience(input.audience);

  if (audience.phones.length === 0) {
    return {
      ok: false,
      message: "No subscribers with a phone number match this audience.",
    };
  }

  const res = await sendSms({ message: input.message, recipients: audience.phones });

  await supabase.from("sms_campaigns").insert({
    message: input.message,
    segment_tag: audience.segment_tag,
    target_tags: audience.target_tags,
    recipients_count: audience.phones.length,
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

export async function deleteSmsCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: true };
}
