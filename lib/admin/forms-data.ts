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

function normalizeFormRow(row: FormTemplateRecord): FormTemplateRecord {
  return {
    ...row,
    fields: Array.isArray(row.fields) ? row.fields : [],
    settings: row.settings ?? { theme: "default", thank_you_bg: "", thank_you_en: "" },
  };
}

/**
 * A read that fails is not a form that does not exist. Swallowing the error
 * here turned every hiccup into a permanent-looking 404 on the public page, so
 * the failure is raised and only "no such row" comes back as null.
 */
function assertReadOk(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`form lookup failed (${what}): ${error.message}`);
}

export async function getFormTemplateById(
  id: string,
): Promise<FormTemplateRecord | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("form_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  assertReadOk(error, `id=${id}`);
  return data ? normalizeFormRow(data as FormTemplateRecord) : null;
}

export async function getFormTemplateBySlug(
  slug: string,
  options?: { includeDisabled?: boolean },
): Promise<FormTemplateRecord | null> {
  const wanted = slug.trim();
  if (!wanted) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("form_templates")
    .select("*")
    .eq("slug", wanted)
    .maybeSingle();
  assertReadOk(error, `slug=${wanted}`);

  let row = data as FormTemplateRecord | null;

  // Not the current slug — it may be one this form used to have. Links already
  // sent out keep working instead of 404-ing the moment the slug is edited.
  // Tolerates the table not being there yet: deploying the code before the
  // migration lands must not take every form page down with it.
  if (!row) {
    const { data: alias, error: aliasError } = await supabase
      .from("form_template_slugs")
      .select("form_id")
      .eq("slug", wanted)
      .maybeSingle();
    if (aliasError) {
      console.error(`[forms] slug history lookup (${wanted}):`, aliasError.message);
      return null;
    }
    const formId = (alias as { form_id: string } | null)?.form_id;
    if (!formId) return null;
    row = await getFormTemplateById(formId);
    if (!row) return null;
  }

  if (!options?.includeDisabled && !row.enabled) return null;
  return normalizeFormRow(row);
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
