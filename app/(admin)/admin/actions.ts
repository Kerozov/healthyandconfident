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
import { sendSms, scheduleSms, getSmsJobReport } from "@/lib/worker/sms";
import { runAutomations } from "@/lib/automation/send";
import { slugify } from "@/lib/utils";
import { formatScheduledAt, parseScheduledAt } from "@/lib/datetime";
import type { AudienceInput, CampaignStatus, SmsCampaignStatus } from "@/lib/supabase/types";

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

// ── Automations ───────────────────────────────────────────────
type AutomationInput = {
  name: string;
  channel: "email" | "sms";
  trigger_event: "registration" | "purchase" | "new_subscriber";
  enabled: boolean;
  segment_keys: string[];
  new_subscribers_only: boolean;
  after_automation_id?: string | null;
  subject_bg: string;
  html_bg: string;
  subject_en: string;
  html_en: string;
  sms_bg: string;
  sms_en: string;
  sort_order?: number;
};

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
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

    let scheduledAtIso: string | null = null;

    if (input.scheduledAt) {
      scheduledAtIso = parseScheduledAt(input.scheduledAt);
      if (!scheduledAtIso) {
        return { ok: false, message: "Invalid schedule time." };
      }
      const res = await scheduleEmail({
        subject: input.subject,
        html: input.html,
        recipients: input.recipients,
        sendAt: scheduledAtIso,
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
      Boolean(scheduledAtIso),
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
        scheduled_at: scheduledAtIso,
        sent_at: scheduledAtIso ? null : new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
        total_count: total,
        not_opened_count: 0,
        bounced_count: 0,
        opened_count: 0,
        delivered_count: 0,
        last_synced_at: new Date().toISOString(),
        parent_campaign_id: input.parentCampaignId || null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    const campaignId = (data as { id: string }).id;
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

export async function deleteSmsCampaign(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/campaigns");
  return { ok: true };
}
