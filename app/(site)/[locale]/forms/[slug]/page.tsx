import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import {
  getFormTemplateById,
  getFormTemplateBySlug,
} from "@/lib/admin/forms-data";
import { verifyFormInviteToken } from "@/lib/forms/form-invite-token";
import { DynamicForm } from "@/components/site/dynamic-form";
import { getAdminClient } from "@/lib/supabase/admin";
import type { FormTemplateRecord } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

/**
 * A link is only ever as good as the form it still resolves to. The slug is
 * tried first (including slugs this form used to have), and an invite token —
 * which carries the form id — rescues the rest.
 */
const resolveForm = cache(async function resolveForm(
  slug: string,
  token?: string,
): Promise<{ form: FormTemplateRecord; inviteToken?: string } | null> {
  const payload = token ? verifyFormInviteToken(token) : null;

  const bySlug = await getFormTemplateBySlug(slug, { includeDisabled: true });
  if (bySlug) {
    return {
      form: bySlug,
      inviteToken: payload?.f === bySlug.id ? token : undefined,
    };
  }

  if (!payload) return null;
  const byId = await getFormTemplateById(payload.f);
  return byId ? { form: byId, inviteToken: token } : null;
});

/** Merge tags the email provider failed to fill in are not data. */
function realValue(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value || value.includes("{{") || value.includes("%%")) return undefined;
  return value;
}

async function subscriberName(id: string): Promise<string | undefined> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return (data as { name?: string } | null)?.name ?? undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ t?: string; e?: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { t: token, e: emailParam } = await searchParams;
  if (!isLocale(locale)) return {};
  const resolved = await resolveForm(slug, token);
  if (!resolved) return { title: "Form" };
  const title =
    locale === "en" ? resolved.form.title_en : resolved.form.title_bg;

  // A personalised link carries someone's email — never let that get indexed.
  // The plain public URL keeps the site's default behaviour.
  const personal = Boolean(token || emailParam);
  return personal ? { title, robots: { index: false, follow: false } } : { title };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ t?: string; e?: string; sid?: string }>;
}) {
  const { locale, slug } = await params;
  const { t: token, e: emailParam, sid } = await searchParams;
  if (!isLocale(locale)) notFound();

  const l = locale as Locale;
  const resolved = await resolveForm(slug, token);
  if (!resolved) notFound();

  const { form, inviteToken } = resolved;

  // Hidden forms stay off the public URL, but a valid invite still opens them.
  if (!form.enabled && !inviteToken) notFound();

  let prefilledEmail: string | undefined;
  let prefilledName: string | undefined;

  if (inviteToken) {
    const payload = verifyFormInviteToken(inviteToken);
    prefilledEmail = payload?.e;
    if (payload?.sid) prefilledName = await subscriberName(payload.sid);
  } else {
    prefilledEmail = realValue(emailParam)?.toLowerCase();
    const subscriberId = realValue(sid);
    if (prefilledEmail && subscriberId) {
      prefilledName = await subscriberName(subscriberId);
    }
  }

  const title = l === "en" ? form.title_en : form.title_bg;
  const description = l === "en" ? form.description_en : form.description_bg;

  return (
    <DynamicForm
      locale={l}
      title={title}
      description={description}
      fields={form.fields}
      settings={form.settings}
      prefilledEmail={prefilledEmail}
      prefilledName={prefilledName}
      token={inviteToken}
      slug={form.slug}
    />
  );
}
