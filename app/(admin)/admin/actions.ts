"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { productPlacementKey } from "@/lib/site/product-placement";
import { productPlacementLabel } from "@/lib/site/cta-placements";
import { enrichStripePriceFromProduct } from "@/lib/stripe/sync-product";
import {
  getStripeCatalogForAdmin,
  refreshSiteProductFromStripe,
  siteProductRowFromStripeCatalog,
} from "@/lib/admin/stripe-catalog";
import type { StripeCatalogItem } from "@/lib/admin/stripe-product-types";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  scheduleEmail,
  getJobReport,
  cancelEmailJob,
  notOpenedRecipientEmails,
  type RecipientRow,
} from "@/lib/worker/email";
import { sendSms, scheduleSms, getSmsJobReport, cancelSmsJob } from "@/lib/worker/sms";
import { runAutomations } from "@/lib/automation/send";
import { composeBrandedEmail } from "@/lib/email/layout";
import { getEmailFooterConfig, invalidateEmailFooterCache } from "@/lib/email/footer-config";
import { buildEmailBodyForRecipient } from "@/lib/email/build-body";
import {
  campaignCtaRedirectUrl,
  isSafeCtaTarget,
} from "@/lib/email/cta-redirect";
import {
  filterSubscribedEmails,
  unsubscribeLinkForEmail,
} from "@/lib/email/unsubscribe";
import { cancelAutomationScheduledJobs } from "@/lib/automation/cancel";
import {
  syncAutomationDeliveries,
} from "@/lib/automation/sync";
import {
  syncCampaignDeliveries,
  getCampaignClickCountsByEmail,
} from "@/lib/campaign/sync-deliveries";
import { renderEmailTemplate } from "@/lib/automation/template";
import { getAutomationDeliveries } from "@/lib/admin/automations-data";
import type { Automation, AutomationDelivery, SiteSectionKey } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils";
import { formatScheduledAt, parseScheduledAt } from "@/lib/datetime";
import type { AudienceInput, CampaignStatus, SmsCampaignStatus, Segment, SegmentGroup } from "@/lib/supabase/types";
import { expandAudienceKeys, isDescendantGroup } from "@/lib/segments/hierarchy";
import { uploadMediaImage, uploadEmailPdf } from "@/lib/supabase/media";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/media/folders";
import { parseYoutubeVideoId } from "@/lib/youtube";
import {
  getEngagementOverview,
  getEngagementSummaryForEmails,
  getSubscriberEngagementDetail,
} from "@/lib/admin/engagement";
import type { FormField, FormSettings } from "@/lib/forms/types";
import { getFormPreset, FORM_PRESETS } from "@/lib/forms/presets";
import { getFormSubmissions } from "@/lib/admin/forms-data";
import { publicFormInviteUrl } from "@/lib/forms/invite-url";
import { createFormInviteToken } from "@/lib/forms/form-invite-token";

export type ActionResult = { ok: boolean; message?: string; id?: string; slug?: string };

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

// ── Email footer ──────────────────────────────────────────────
export async function saveEmailFooter(input: {
  locale: "bg" | "en";
  signature_enabled: boolean;
  signature_image_url?: string;
  signature_closing: string;
  signature_name: string;
  signature_title: string;
  signature_email: string;
  signature_phone: string;
  brand_name: string;
  brand_color: string;
  website_url: string;
  footer_email: string;
  footer_phone: string;
  address_line1: string;
  address_line2: string;
  facebook_url?: string;
  youtube_url?: string;
  disclaimer: string;
  preferences_url?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("email_footer_config")
    .update({
      signature_enabled: input.signature_enabled,
      signature_image_url: input.signature_image_url?.trim() || null,
      signature_closing: input.signature_closing,
      signature_name: input.signature_name,
      signature_title: input.signature_title,
      signature_email: input.signature_email,
      signature_phone: input.signature_phone,
      brand_name: input.brand_name,
      brand_color: input.brand_color || "#2563eb",
      website_url: input.website_url,
      footer_email: input.footer_email,
      footer_phone: input.footer_phone,
      address_line1: input.address_line1,
      address_line2: input.address_line2,
      facebook_url: input.facebook_url?.trim() || null,
      youtube_url: input.youtube_url?.trim() || null,
      disclaimer: input.disclaimer,
      preferences_url: input.preferences_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("locale", input.locale);
  if (error) return { ok: false, message: error.message };
  invalidateEmailFooterCache(input.locale);
  return { ok: true };
}

// ── Automations ───────────────────────────────────────────────
type AutomationInput = {
  name: string;
  channel: "email" | "sms";
  trigger_event: "purchase" | "new_subscriber";
  enabled: boolean;
  segment_keys: string[];
  group_ids: string[];
  audience_logic?: "any" | "all";
  exclude_group_ids?: string[];
  exclude_segment_keys?: string[];
  purchase_product_ids?: string[];
  signup_sources?: string[];
  new_subscribers_only: boolean;
  after_automation_id?: string | null;
  delay_days?: number;
  delay_minutes?: number;
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
  attachment_path_bg?: string;
  attachment_filename_bg?: string;
  attachment_path_en?: string;
  attachment_filename_en?: string;
  hero_image_url_bg?: string;
  hero_image_url_en?: string;
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

function validatePurchaseAutomation(input: AutomationInput): string | null {
  if (input.trigger_event !== "purchase") return null;
  const ids = input.purchase_product_ids?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return "При автоматизация „След покупка“ избери поне един продукт.";
  }
  return null;
}

export async function createAutomation(
  input: AutomationInput,
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const purchaseErr = validatePurchaseAutomation(input);
  if (purchaseErr) return { ok: false, message: purchaseErr };
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("automations")
    .insert({
      ...input,
      audience_logic: input.audience_logic === "all" ? "all" : "any",
      exclude_group_ids: input.exclude_group_ids ?? [],
      exclude_segment_keys: input.exclude_segment_keys ?? [],
      purchase_product_ids: input.purchase_product_ids ?? [],
      signup_sources: input.signup_sources ?? [],
      after_automation_id: input.after_automation_id || null,
      delay_days: Math.max(0, input.delay_days ?? 0),
      delay_minutes: Math.max(0, input.delay_minutes ?? 0),
      send_time: normalizeSendTime(input.send_time),
      send_date: normalizeSendDate(input.send_date),
      sort_order: input.sort_order ?? 0,
      attachment_path_bg: input.attachment_path_bg?.trim() || null,
      attachment_filename_bg: input.attachment_filename_bg?.trim() || null,
      attachment_path_en: input.attachment_path_en?.trim() || null,
      attachment_filename_en: input.attachment_filename_en?.trim() || null,
      hero_image_url_bg: input.hero_image_url_bg?.trim() || null,
      hero_image_url_en: input.hero_image_url_en?.trim() || null,
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
  const purchaseErr = validatePurchaseAutomation(input);
  if (purchaseErr) return { ok: false, message: purchaseErr };
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("automations")
    .update({
      ...input,
      audience_logic: input.audience_logic === "all" ? "all" : "any",
      exclude_group_ids: input.exclude_group_ids ?? [],
      exclude_segment_keys: input.exclude_segment_keys ?? [],
      purchase_product_ids: input.purchase_product_ids ?? [],
      signup_sources: input.signup_sources ?? [],
      after_automation_id: input.after_automation_id || null,
      delay_days: Math.max(0, input.delay_days ?? 0),
      delay_minutes: Math.max(0, input.delay_minutes ?? 0),
      send_time: normalizeSendTime(input.send_time),
      send_date: normalizeSendDate(input.send_date),
      updated_at: new Date().toISOString(),
      attachment_path_bg: input.attachment_path_bg?.trim() || null,
      attachment_filename_bg: input.attachment_filename_bg?.trim() || null,
      attachment_path_en: input.attachment_path_en?.trim() || null,
      attachment_filename_en: input.attachment_filename_en?.trim() || null,
      hero_image_url_bg: input.hero_image_url_bg?.trim() || null,
      hero_image_url_en: input.hero_image_url_en?.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/automations");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await cancelAutomationScheduledJobs(id);
  } catch {
    // Still delete the rule even if worker cancel fails.
  }
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

export async function diagnoseAutomationsForEmail(email: string): Promise<
  | {
      ok: true;
      subscriberFound: boolean;
      diagnosis: import("@/lib/automation/run").AutomationDiagnosis;
    }
  | { ok: false; message: string }
> {
  await requireAdmin();
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, message: "Въведи валиден имейл." };
  }

  const supabase = getAdminClient();
  const { data: sub } = await supabase
    .from("subscribers")
    .select("id, tags, locale, source, name, phone")
    .eq("email", normalized)
    .maybeSingle();

  const subscriber = sub as {
    id: string;
    tags: string[] | null;
    locale: string | null;
    source: string | null;
    name: string | null;
    phone: string | null;
  } | null;

  const { diagnoseAutomations } = await import("@/lib/automation/run");
  const diagnosis = await diagnoseAutomations({
    email: normalized,
    name: subscriber?.name ?? null,
    phone: subscriber?.phone ?? null,
    locale: subscriber?.locale === "en" ? "en" : "bg",
    subscriberId: subscriber?.id ?? null,
    tags: subscriber?.tags ?? [],
    // Simulate a fresh signup so gates that need "new" don't hide the reason;
    // "new + existing" automations are unaffected.
    isNew: !subscriber,
    source: subscriber?.source || "free-menu-banner",
  });

  return { ok: true, subscriberFound: Boolean(subscriber), diagnosis };
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

  const emails = await filterSubscribedEmails(nonOpeners.map((d) => d.email));
  if (emails.length === 0) {
    return {
      ok: false,
      message: "Everyone has opened (or bounced) — nobody to resend to.",
    };
  }

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
    const ctaLabel =
      locale === "en" ? automation.cta_label_en : automation.cta_label_bg;
    const ctaUrl = locale === "en" ? automation.cta_url_en : automation.cta_url_bg;

    await dispatchCampaign({
      subject,
      html: htmlTpl,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      locale,
      segment_tag: `${automation.name} · resend`,
      target_tags: automation.segment_keys.length
        ? automation.segment_keys
        : null,
      recipients: localeEmails,
      attachment_path:
        locale === "en"
          ? automation.attachment_path_en ?? undefined
          : automation.attachment_path_bg ?? undefined,
      attachment_filename:
        locale === "en"
          ? automation.attachment_filename_en ?? undefined
          : automation.attachment_filename_bg ?? undefined,
      hero_image_url:
        locale === "en"
          ? automation.hero_image_url_en ?? undefined
          : automation.hero_image_url_bg ?? undefined,
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
    new Set([
      "manual",
      ...(input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    ]),
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

  if (input.tags !== undefined) {
    const { data: row } = await supabase
      .from("subscribers")
      .select("email, tags")
      .eq("id", input.id)
      .maybeSingle();
    if (row?.email) {
      const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
        "@/lib/automation/cancel"
      );
      await cancelIneligibleAutomationDeliveriesForSubscriber(
        row.email as string,
        (row.tags as string[]) ?? [],
      );
    }
  }

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

// ── Segment groups ──────────────────────────────────────────
export async function createSegmentGroup(input: {
  name: string;
  description?: string;
  parent_id?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Group name is required." };

  let parentId: string | null = input.parent_id?.trim() || null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("segment_groups")
      .select("id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent) return { ok: false, message: "Parent group not found." };
  }

  const { error } = await supabase.from("segment_groups").insert({
    name,
    description: input.description?.trim() || null,
    parent_id: parentId,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true, message: `Group "${name}" created.` };
}

export async function updateSegmentGroup(input: {
  id: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("segment_groups")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  const group = row as SegmentGroup | null;
  if (!group) return { ok: false, message: "Group not found." };

  const patch: Partial<Pick<SegmentGroup, "name" | "description" | "parent_id">> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.parent_id !== undefined) {
    const parentId = input.parent_id?.trim() || null;
    if (parentId === input.id) {
      return { ok: false, message: "A group cannot be its own parent." };
    }
    if (parentId) {
      const { data: allRows } = await supabase.from("segment_groups").select("*");
      const all = (allRows as SegmentGroup[]) ?? [];
      if (!all.some((g) => g.id === parentId)) {
        return { ok: false, message: "Parent group not found." };
      }
      if (isDescendantGroup(parentId, input.id, all)) {
        return { ok: false, message: "Cannot nest a group under its own subgroup." };
      }
    }
    patch.parent_id = parentId;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from("segment_groups")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

export async function deleteSegmentGroup(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("segment_groups").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/subscribers");
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

// ── Segments ────────────────────────────────────────────────
export async function createSegment(input: {
  key: string;
  name: string;
  description?: string;
  group_id?: string | null;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const key = slugify(input.key || input.name);
  if (!key || key === "all") {
    return { ok: false, message: "Invalid segment key." };
  }

  let groupId: string | null = input.group_id?.trim() || null;
  if (groupId) {
    const { data: group } = await supabase
      .from("segment_groups")
      .select("id")
      .eq("id", groupId)
      .maybeSingle();
    if (!group) return { ok: false, message: "Group not found." };
  }

  const { error } = await supabase.from("segments").insert({
    key,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    group_id: groupId,
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
  group_id?: string | null;
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

  const patch: Partial<Pick<Segment, "name" | "description" | "group_id">> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.group_id !== undefined) {
    const groupId = input.group_id?.trim() || null;
    if (groupId) {
      const { data: group } = await supabase
        .from("segment_groups")
        .select("id")
        .eq("id", groupId)
        .maybeSingle();
      if (!group) return { ok: false, message: "Group not found." };
    }
    patch.group_id = groupId;
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

  const segmentKeys = (input.segment_keys ?? []).map((k) => k.trim()).filter(Boolean);
  const groupIds = (input.group_ids ?? []).map((id) => id.trim()).filter(Boolean);
  const hasSelection = segmentKeys.length > 0 || groupIds.length > 0;

  if (!hasSelection && (input.segment_key || "all") === "all") {
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

  const [{ data: segmentRows }, { data: groupRows }] = await Promise.all([
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);
  const allSegments = (segmentRows as Segment[]) ?? [];
  const allGroups = (groupRows as SegmentGroup[]) ?? [];
  const filtered = expandAudienceKeys(segmentKeys, groupIds, allGroups, allSegments);
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
  const nameByGroupId = new Map(allGroups.map((g) => [g.id, g.name]));
  const labelParts = [
    ...groupIds.map((id) => nameByGroupId.get(id) ?? id),
    ...segmentKeys.map((k) => nameByKey.get(k) ?? k),
  ];
  const includesGroups = groupIds.length > 0;

  q = q.overlaps("tags", filtered);
  const { data } = await q;
  const rows = (data as { email: string; phone: string | null }[]) ?? [];
  return {
    emails: rows.map((r) => r.email).filter(Boolean),
    phones: rows.map((r) => r.phone || "").filter(Boolean),
    label: `segments: ${labelParts.join(", ")}${includesGroups ? " (вкл. групи)" : ""}`,
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

function parseWorkerJobIds(workerJobId: string | null | undefined): string[] {
  if (!workerJobId) return [];
  return workerJobId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function aggregateJobReports(jobIds: string[]) {
  const reports = (
    await Promise.all(jobIds.map((id) => getJobReport(id)))
  ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getJobReport>>>[];

  if (reports.length === 0) return null;

  const tracking = reports.reduce(
    (acc, report) => ({
      total: acc.total + report.tracking.total,
      sent: acc.sent + report.tracking.sent,
      failed: acc.failed + report.tracking.failed,
      bounced: acc.bounced + report.tracking.bounced,
      delivered: acc.delivered + report.tracking.delivered,
      opened: acc.opened + report.tracking.opened,
      notOpened: acc.notOpened + report.tracking.notOpened,
      pending: acc.pending + report.tracking.pending,
    }),
    {
      total: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
      delivered: 0,
      opened: 0,
      notOpened: 0,
      pending: 0,
    },
  );

  const recipients = reports.flatMap((report) => report.recipients);
  const status = reports.some((report) => report.status === "processing")
    ? "processing"
    : reports.every((report) => report.status === "canceled")
      ? "canceled"
      : reports.every((report) => report.status === "failed")
        ? "failed"
        : reports.every((report) => report.status === "pending")
          ? "pending"
          : reports.every((report) => report.status === "sent")
            ? "sent"
            : "sent";

  return {
    status,
    sendAt: reports.find((report) => report.sendAt)?.sendAt ?? null,
    sentAt: reports.find((report) => report.sentAt)?.sentAt ?? null,
    tracking,
    recipients,
  };
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
  attachment_path?: string;
  attachment_filename?: string;
  hero_image_url?: string;
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
      attachment_path: input.attachment_path?.trim() || null,
      attachment_filename: input.attachment_filename?.trim() || null,
      hero_image_url: input.hero_image_url?.trim() || null,
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return { ok: false, message: draftError?.message ?? "Could not create campaign." };
  }

  const campaignId = (draft as { id: string }).id;
  const mailLocale = input.locale === "en" ? "en" : "bg";
  const footerConfig = await getEmailFooterConfig(mailLocale);

  const { data: subs } = await supabase
    .from("subscribers")
    .select("id, email, name")
    .in("email", input.recipients);
  const subByEmail = new Map(
    ((subs as { id: string; email: string; name: string | null }[] | null) ?? []).map((s) => [
      s.email.toLowerCase(),
      s,
    ]),
  );

  try {
    const jobIds: string[] = [];
    let sent = 0;
    let failed = 0;
    let workerStatus = "pending";

    for (const recipient of input.recipients) {
      const email = recipient.trim().toLowerCase();
      const sub = subByEmail.get(email);
      const subscriberId = sub?.id ?? null;
      const renderedHtml = renderEmailTemplate(input.html, {
        name: sub?.name ?? null,
        email,
      });
      const { bodyHtml, attachments } = await buildEmailBodyForRecipient({
        html: renderedHtml,
        locale: mailLocale,
        email,
        subscriberId,
        attachmentPath: input.attachment_path,
        attachmentFilename: input.attachment_filename,
      });
      const ctaHref =
        ctaLabel && ctaUrl
          ? campaignCtaRedirectUrl(campaignId, email, subscriberId)
          : null;
      const wrappedHtml = composeBrandedEmail({
        bodyHtml,
        locale: mailLocale,
        cta: ctaHref ? { label: ctaLabel, href: ctaHref } : null,
        unsubscribeHref: unsubscribeLinkForEmail(recipient, mailLocale),
        footerConfig,
        heroImageUrl: input.hero_image_url,
      });

      try {
        if (scheduledAtIso) {
          const res = await scheduleEmail({
            subject: input.subject,
            html: wrappedHtml,
            recipients: [recipient],
            sendAt: scheduledAtIso,
            idempotencyKey: `camp-${campaignId}-${recipient}`,
            attachments,
          });
          jobIds.push(res.jobId);
          workerStatus = res.status || "pending";
          await supabase.from("campaign_deliveries").insert({
            campaign_id: campaignId,
            email,
            subscriber_id: subscriberId,
            worker_job_id: res.jobId,
            status: "scheduled",
          });
        } else {
          const res = await sendEmail({
            subject: input.subject,
            html: wrappedHtml,
            recipients: [recipient],
            attachments,
          });
          jobIds.push(res.jobId);
          sent += res.sent ?? 1;
          failed += res.failed ?? 0;
          workerStatus = res.status || "sent";
          await supabase.from("campaign_deliveries").insert({
            campaign_id: campaignId,
            email,
            subscriber_id: subscriberId,
            worker_job_id: res.jobId,
            status: "sent",
          });
        }
      } catch {
        failed += 1;
      }
    }

    if (jobIds.length === 0 && failed > 0) {
      workerStatus = "failed";
    }

    const status = deriveCampaignStatus(
      workerStatus,
      { sent, failed, total },
      Boolean(scheduledAtIso),
    );

    const { error: updateError } = await supabase
      .from("email_campaigns")
      .update({
        worker_job_id: jobIds.join(",") || null,
        status,
        scheduled_at: scheduledAtIso,
        sent_at: scheduledAtIso ? null : new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateError) return { ok: false, message: updateError.message };

    if (jobIds.length > 0 && !scheduledAtIso) {
      await persistCampaignSync(campaignId, jobIds.join(","), null, total);
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
  attachment_path?: string;
  attachment_filename?: string;
  hero_image_url?: string;
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
    attachment_path: input.attachment_path,
    attachment_filename: input.attachment_filename,
    hero_image_url: input.hero_image_url,
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
  const jobIds = parseWorkerJobIds(workerJobId);
  const aggregated =
    jobIds.length > 1
      ? await aggregateJobReports(jobIds)
      : null;
  const report =
    aggregated ??
    (jobIds[0] ? await getJobReport(jobIds[0]) : null);

  if (!report) {
    return { ok: false, message: "Could not reach the worker for this job." };
  }

  const t = aggregated?.tracking ?? report.tracking;
  const status = deriveCampaignStatus(
    aggregated?.status ?? report.status,
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
      sent_at: aggregated?.sentAt ?? report.sentAt,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  await syncCampaignDeliveries(id);
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
        attachment_path: string | null;
        attachment_filename: string | null;
        hero_image_url: string | null;
      }
    | null;

  if (!parent?.worker_job_id) {
    return { ok: false, message: "No worker job linked to this campaign." };
  }

  const aggregated = await aggregateJobReports(parseWorkerJobIds(parent.worker_job_id));
  const emails = await filterSubscribedEmails(
    notOpenedRecipientEmails(aggregated?.recipients ?? []),
  );
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
    attachment_path: parent.attachment_path ?? undefined,
    attachment_filename: parent.attachment_filename ?? undefined,
    hero_image_url: parent.hero_image_url ?? undefined,
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

  const jobIds = parseWorkerJobIds(campaign.worker_job_id);
  const aggregated = await aggregateJobReports(jobIds);
  if (!aggregated) {
    return { ok: false, message: "Could not load recipient report." };
  }

  await syncCampaignDeliveries(campaignId);
  const clickMap = await getCampaignClickCountsByEmail(campaignId);

  return {
    ok: true,
    recipients: aggregated.recipients.map((r) => ({
      ...r,
      clickCount: clickMap.get(r.email.toLowerCase()) ?? 0,
    })),
    tracking: aggregated.tracking,
  };
}

export async function getAdminEngagementOverview() {
  await requireAdmin();
  const overview = await getEngagementOverview();
  return { ok: true as const, overview };
}

export async function getSubscriberEngagementReport(email: string) {
  await requireAdmin();
  const { getPersonProfile } = await import("@/lib/admin/person-profile");
  const [detail, profile] = await Promise.all([
    getSubscriberEngagementDetail(email),
    getPersonProfile(email),
  ]);
  return { ok: true as const, ...detail, profile };
}

export async function getSubscribersEngagementSummaries(emails: string[]) {
  await requireAdmin();
  const map = await getEngagementSummaryForEmails(emails);
  return Object.fromEntries(map);
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
    const results = await Promise.all(
      parseWorkerJobIds(campaign.worker_job_id).map((jobId) => cancelEmailJob(jobId)),
    );
    workerCanceled = results.some(Boolean);
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
    await Promise.all(
      parseWorkerJobIds(campaign.worker_job_id).map((jobId) => cancelEmailJob(jobId)),
    );
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
  key: SiteSectionKey;
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

export async function saveSiteGuide(input: {
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
  enabled?: boolean;
  sort_order?: number;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const titleBg = input.title_bg.trim();
  const titleEn = input.title_en.trim() || titleBg;
  if (!titleBg) {
    return { ok: false, message: "Попълни име на ръководството (BG)." };
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
    enabled: input.enabled ?? true,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("site_guides").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
    revalidateSitePaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("site_guides").insert(row).select("id").single();
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteSiteGuide(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_guides").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateSitePaths();
  return { ok: true };
}

export async function reorderSiteGuides(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("site_guides")
        .update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() })
        .eq("id", id),
    ),
  );
  revalidateSitePaths();
  return { ok: true };
}

export async function saveSiteProduct(input: {
  id?: string;
  title_bg: string;
  title_en: string;
  description_bg?: string;
  description_en?: string;
  stripe_url?: string;
  stripe_product_id?: string;
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
  purchase_tags?: string[];
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const titleBg = input.title_bg.trim();
  const titleEn = input.title_en.trim() || titleBg;
  if (!titleBg) {
    return { ok: false, message: "Попълни име на продукта (BG)." };
  }

  let stripeIds = {
    stripe_product_id: input.stripe_product_id?.trim() ?? "",
    stripe_price_id: input.stripe_price_id?.trim() ?? "",
  };
  try {
    stripeIds = await enrichStripePriceFromProduct(stripeIds);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe product lookup failed";
    return { ok: false, message };
  }

  const stripeUrl = input.stripe_url?.trim() ?? "";
  if (!stripeUrl && !stripeIds.stripe_price_id) {
    return {
      ok: false,
      message:
        "Попълни Stripe линк или Stripe Product/Price ID (за плащане през сайта).",
    };
  }

  const row = {
    title_bg: titleBg,
    title_en: titleEn,
    description_bg: input.description_bg?.trim() ?? "",
    description_en: input.description_en?.trim() ?? "",
    stripe_url: stripeUrl,
    stripe_product_id: stripeIds.stripe_product_id,
    stripe_price_id: stripeIds.stripe_price_id,
    price_label_bg: input.price_label_bg?.trim() ?? "",
    price_label_en: input.price_label_en?.trim() ?? "",
    image_url: input.image_url?.trim() || null,
    offer_type: "upsell" as const,
    headline_bg: input.headline_bg?.trim() ?? "",
    headline_en: input.headline_en?.trim() ?? "",
    cta_label_bg: input.cta_label_bg?.trim() ?? "",
    cta_label_en: input.cta_label_en?.trim() ?? "",
    audience_tags: [] as string[],
    purchase_tags: (input.purchase_tags ?? []).filter(Boolean),
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

export async function fetchStripeCatalog(): Promise<
  ActionResult & { items?: StripeCatalogItem[] }
> {
  await requireAdmin();
  try {
    const items = await getStripeCatalogForAdmin();
    return { ok: true, items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe catalog failed";
    return { ok: false, message };
  }
}

export async function importStripeProduct(
  stripeProductId: string,
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const prodId = stripeProductId.trim();
  if (!prodId.startsWith("prod_")) {
    return { ok: false, message: "Невалиден Stripe Product ID." };
  }

  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("site_products")
    .select("id")
    .eq("stripe_product_id", prodId)
    .maybeSingle();

  if (existing) {
    return { ok: true, id: (existing as { id: string }).id };
  }

  const catalog = await refreshSiteProductFromStripe(prodId);
  if (!catalog) {
    return { ok: false, message: "Продуктът не е намерен в Stripe." };
  }

  const { count } = await supabase
    .from("site_products")
    .select("id", { count: "exact", head: true });
  const sortOrder = ((count ?? 0) + 1) * 10;
  const row = siteProductRowFromStripeCatalog(catalog, sortOrder);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("site_products")
    .insert({ ...row, updated_at: now })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  const productId = (data as { id: string }).id;
  const sync = await syncProductPlacement(supabase, productId, row.title_bg, row.title_en);
  if (!sync.ok) return sync;
  revalidateSitePaths();
  return { ok: true, id: productId };
}

export async function syncSiteProductFromStripe(
  siteProductId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { data: product, error } = await supabase
    .from("site_products")
    .select("*")
    .eq("id", siteProductId)
    .single();

  if (error || !product) {
    return { ok: false, message: error?.message ?? "Продуктът не е намерен." };
  }

  const stripeProductId = (product as { stripe_product_id?: string }).stripe_product_id?.trim();
  if (!stripeProductId) {
    return { ok: false, message: "Няма Stripe Product ID за синхронизация." };
  }

  const catalog = await refreshSiteProductFromStripe(stripeProductId);
  if (!catalog) {
    return { ok: false, message: "Продуктът не е намерен в Stripe." };
  }

  const { error: updateError } = await supabase
    .from("site_products")
    .update({
      stripe_price_id: catalog.stripePriceId ?? "",
      price_label_bg: catalog.priceLabel || (product as { price_label_bg: string }).price_label_bg,
      price_label_en: catalog.priceLabel || (product as { price_label_en: string }).price_label_en,
      image_url: catalog.imageUrl ?? (product as { image_url: string | null }).image_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", siteProductId);

  if (updateError) return { ok: false, message: updateError.message };
  revalidateSitePaths();
  return { ok: true };
}

export async function reorderSiteProducts(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("site_products")
        .update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() })
        .eq("id", id),
    ),
  );
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

export async function uploadEmailAttachment(
  formData: FormData,
): Promise<
  ActionResult & { path?: string; filename?: string; url?: string }
> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Липсва файл." };
  }

  const result = await uploadEmailPdf(file);
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    path: result.path,
    filename: result.filename,
    url: result.url,
  };
}

// ── Forms ─────────────────────────────────────────────────────

export async function createFormFromPreset(presetKey: string): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const preset = getFormPreset(presetKey);
  if (!preset) return { ok: false, message: "Шаблонът не е намерен." };

  const supabase = getAdminClient();
  let slug = preset.slug;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data: existing } = await supabase
      .from("form_templates")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  const { data, error } = await supabase
    .from("form_templates")
    .insert({
      name: preset.name,
      slug,
      title_bg: preset.title_bg,
      title_en: preset.title_en,
      description_bg: preset.description_bg,
      description_en: preset.description_en,
      fields: preset.fields,
      settings: preset.settings,
      email_subject_bg: preset.email_subject_bg,
      email_subject_en: preset.email_subject_en,
      email_intro_bg: preset.email_intro_bg,
      email_intro_en: preset.email_intro_en,
      enabled: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/forms");
  return { ok: true, id: (data as { id: string }).id, slug };
}

export async function saveFormTemplate(input: {
  id?: string;
  name: string;
  slug: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  fields: FormField[];
  settings: FormSettings;
  email_subject_bg: string;
  email_subject_en: string;
  email_intro_bg: string;
  email_intro_en: string;
  enabled: boolean;
  attachment_path?: string;
  attachment_filename?: string;
  hero_image_url?: string;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const name = input.name.trim();
  const slug = slugify(input.slug.trim() || name);
  if (!name) return { ok: false, message: "Попълни име на формата." };
  if (!slug) return { ok: false, message: "Невалиден URL адрес (slug)." };

  const row = {
    name,
    slug,
    title_bg: input.title_bg.trim(),
    title_en: input.title_en.trim() || input.title_bg.trim(),
    description_bg: input.description_bg.trim(),
    description_en: input.description_en.trim(),
    fields: input.fields,
    settings: input.settings,
    email_subject_bg: input.email_subject_bg.trim(),
    email_subject_en: input.email_subject_en.trim() || input.email_subject_bg.trim(),
    email_intro_bg: input.email_intro_bg.trim(),
    email_intro_en: input.email_intro_en.trim(),
    enabled: input.enabled,
    attachment_path: input.attachment_path?.trim() || null,
    attachment_filename: input.attachment_filename?.trim() || null,
    hero_image_url: input.hero_image_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("form_templates").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/forms");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("form_templates")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/forms");
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteFormTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase.from("form_templates").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/forms");
  return { ok: true };
}

export async function sendFormByEmail(input: {
  formId: string;
  audience: AudienceInput;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("form_templates")
    .select("*")
    .eq("id", input.formId)
    .maybeSingle();

  const form = row as import("@/lib/forms/types").FormTemplateRecord | null;
  if (!form) return { ok: false, message: "Формата не е намерена." };

  const audience = await resolveAudience(input.audience);
  if (audience.emails.length === 0) {
    return { ok: false, message: "Няма получатели за избраната аудитория." };
  }

  const { data: subs } = await supabase
    .from("subscribers")
    .select("id, email, name, locale")
    .in("email", audience.emails);

  const subMap = new Map(
    ((subs as { id: string; email: string; name: string | null; locale: string }[] | null) ?? []).map(
      (s) => [s.email.toLowerCase(), s],
    ),
  );

  let sent = 0;
  let failed = 0;

  const [footerBg, footerEn] = await Promise.all([
    getEmailFooterConfig("bg"),
    getEmailFooterConfig("en"),
  ]);

  for (const email of audience.emails) {
    const sub = subMap.get(email.toLowerCase());
    const locale = sub?.locale === "en" ? "en" : "bg";
    const token = createFormInviteToken({
      f: form.id,
      e: email,
      sid: sub?.id,
    });
    if (!token) {
      failed += 1;
      continue;
    }

    await supabase.from("form_invitations").insert({
      form_id: form.id,
      subscriber_id: sub?.id ?? null,
      email: email.toLowerCase(),
      token,
    });

    const formUrl = publicFormInviteUrl(form.slug, locale, form.id, email, sub?.id);
    const subjectTpl =
      locale === "en" ? form.email_subject_en : form.email_subject_bg;
    const introTpl = locale === "en" ? form.email_intro_en : form.email_intro_bg;
    const subject = renderEmailTemplate(subjectTpl, {
      name: sub?.name,
      email,
    });
    const bodyIntro = renderEmailTemplate(introTpl, {
      name: sub?.name,
      email,
    });
    const { bodyHtml, attachments } = await buildEmailBodyForRecipient({
      html: bodyIntro,
      locale,
      email,
      subscriberId: sub?.id,
      attachmentPath: form.attachment_path,
      attachmentFilename: form.attachment_filename,
    });

    const html = composeBrandedEmail({
      bodyHtml,
      locale,
      cta: {
        label: locale === "en" ? "Open form" : "Отвори формата",
        href: formUrl,
      },
      unsubscribeHref: unsubscribeLinkForEmail(email, locale),
      footerConfig: locale === "en" ? footerEn : footerBg,
      heroImageUrl: form.hero_image_url,
    });

    try {
      await sendEmail({ subject, html, recipients: [email], attachments });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/admin/forms");
  return {
    ok: sent > 0,
    message:
      failed > 0
        ? `Изпратено до ${sent}, неуспешно ${failed} от ${audience.emails.length}.`
        : `Формата е изпратена до ${sent} абонат(а).`,
  };
}

export async function getFormSubmissionsReport(formId: string) {
  await requireAdmin();
  const submissions = await getFormSubmissions(formId);
  return { ok: true as const, submissions };
}

// ── Contacts journey ──────────────────────────────────────────
export async function cancelContactJobAction(
  localJobId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const { cancelContactWorkerJobById } = await import("@/lib/notification-worker");
  const canceled = await cancelContactWorkerJobById(localJobId);
  revalidatePath("/admin/contacts");
  if (!canceled) {
    return { ok: false, message: "Job not found or already sent/canceled." };
  }
  return { ok: true, message: "Reminder canceled." };
}

export async function saveZoomLiveConfig(input: {
  feature_enabled: boolean;
  watch_meeting_id: string | null;
  join_url: string;
  label_bg: string;
  label_en: string;
  manual_is_live: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("zoom_live_config")
    .update({
      feature_enabled: input.feature_enabled,
      watch_meeting_id: input.watch_meeting_id,
      join_url: input.join_url,
      label_bg: input.label_bg,
      label_en: input.label_en,
      manual_is_live: input.manual_is_live,
    })
    .eq("key", "default");

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/zoom");
  revalidatePath("/bg");
  revalidatePath("/en");
  return { ok: true, message: "Настройките за „На живо“ са запазени." };
}

