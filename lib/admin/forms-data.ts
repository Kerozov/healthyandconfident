import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { FormSubmissionRecord, FormTemplateRecord } from "@/lib/forms/types";

export type FormRow = FormTemplateRecord & {
  submission_count: number;
  invitation_count: number;
};

export async function getFormTemplates(): Promise<FormRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("form_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  const forms = (data as FormTemplateRecord[]) ?? [];
  if (forms.length === 0) return [];

  // Counted in the database, one head request per form. Reading the rows back
  // and counting them here stopped at PostgREST's 1000-row cap, so a popular
  // form showed a total that quietly stopped growing.
  const counts = await Promise.all(
    forms.map(async (form) => {
      const [subs, invs] = await Promise.all([
        supabase
          .from("form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_id", form.id),
        supabase
          .from("form_invitations")
          .select("id", { count: "exact", head: true })
          .eq("form_id", form.id),
      ]);
      return {
        id: form.id,
        submissions: subs.count ?? 0,
        invitations: invs.count ?? 0,
      };
    }),
  );

  const subCount = new Map(counts.map((c) => [c.id, c.submissions]));
  const invCount = new Map(counts.map((c) => [c.id, c.invitations]));

  return forms.map((f) => ({
    ...f,
    fields: Array.isArray(f.fields) ? f.fields : [],
    settings: f.settings ?? { theme: "default", thank_you_bg: "", thank_you_en: "" },
    submission_count: subCount.get(f.id) ?? 0,
    invitation_count: invCount.get(f.id) ?? 0,
  }));
}

export async function getFormTemplateBySlug(
  slug: string,
  options?: { includeDisabled?: boolean },
): Promise<FormTemplateRecord | null> {
  const supabase = getAdminClient();
  let query = supabase.from("form_templates").select("*").eq("slug", slug);
  if (!options?.includeDisabled) query = query.eq("enabled", true);
  const { data } = await query.maybeSingle();

  if (!data) return null;
  const row = data as FormTemplateRecord;
  return {
    ...row,
    fields: Array.isArray(row.fields) ? row.fields : [],
    settings: row.settings ?? { theme: "default", thank_you_bg: "", thank_you_en: "" },
  };
}

export async function getFormSubmissions(formId: string): Promise<FormSubmissionRecord[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (data as FormSubmissionRecord[]) ?? [];
}
