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

  const ids = forms.map((f) => f.id);
  const [{ data: subs }, { data: invs }] = await Promise.all([
    supabase.from("form_submissions").select("form_id").in("form_id", ids),
    supabase.from("form_invitations").select("form_id").in("form_id", ids),
  ]);

  const subCount = new Map<string, number>();
  for (const row of (subs as { form_id: string }[] | null) ?? []) {
    subCount.set(row.form_id, (subCount.get(row.form_id) ?? 0) + 1);
  }
  const invCount = new Map<string, number>();
  for (const row of (invs as { form_id: string }[] | null) ?? []) {
    invCount.set(row.form_id, (invCount.get(row.form_id) ?? 0) + 1);
  }

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
): Promise<FormTemplateRecord | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("form_templates")
    .select("*")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();

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
