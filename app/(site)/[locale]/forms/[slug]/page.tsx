import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getFormTemplateBySlug } from "@/lib/admin/forms-data";
import { verifyFormInviteToken } from "@/lib/forms/form-invite-token";
import { DynamicForm } from "@/components/site/dynamic-form";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const form = await getFormTemplateBySlug(slug);
  if (!form) return { title: "Form" };
  const title = locale === "en" ? form.title_en : form.title_bg;
  return { title };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, slug } = await params;
  const { t: token } = await searchParams;
  if (!isLocale(locale)) notFound();

  const l = locale as Locale;
  const form = await getFormTemplateBySlug(slug);
  if (!form) notFound();

  let prefilledEmail: string | undefined;
  let prefilledName: string | undefined;

  if (token) {
    const payload = verifyFormInviteToken(token);
    if (payload && payload.f === form.id) {
      prefilledEmail = payload.e;
      if (payload.sid) {
        const supabase = getAdminClient();
        const { data } = await supabase
          .from("subscribers")
          .select("name")
          .eq("id", payload.sid)
          .maybeSingle();
        prefilledName = (data as { name?: string } | null)?.name ?? undefined;
      }
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
      token={token}
      slug={slug}
    />
  );
}
