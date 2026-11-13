import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { getContactStatuses } from "@/lib/admin/contact-statuses";
import { chunkArray } from "@/lib/utils";
import { formatSubmissionAnswers } from "@/lib/forms/format-answers";
import { healthLabelForTag } from "@/lib/site/health-tags";
import type { FormField, FormTemplateRecord } from "@/lib/forms/types";

/**
 * One site form, read the way the free-menu screen reads its signups: how many
 * answered, what they answered (as bars), and who they are.
 */

export type QuestionnaireFormOption = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  responses: number;
  lastAt: string | null;
};

export type QuestionnaireChoiceQuestion = {
  kind: "choice";
  id: string;
  label: string;
  multiple: boolean;
  answered: number;
  options: { value: string; label: string; count: number }[];
};

export type QuestionnaireNumberQuestion = {
  kind: "number";
  id: string;
  label: string;
  answered: number;
  avg: number | null;
  min: number | null;
  max: number | null;
};

export type QuestionnaireTextQuestion = {
  kind: "text";
  id: string;
  label: string;
  answered: number;
  latest: { value: string; at: string }[];
};

export type QuestionnaireQuestion =
  | QuestionnaireChoiceQuestion
  | QuestionnaireNumberQuestion
  | QuestionnaireTextQuestion;

export type QuestionnaireResponse = {
  id: string;
  submittedAt: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  subscriberId: string | null;
  unsubscribed: boolean;
  crmStatus: { name: string; color: string | null } | null;
  /** Raw answers for filtering by option: field id → chosen values. */
  choices: Record<string, string[]>;
  /** Readable Q&A for the answers panel and the export. */
  rows: { label: string; value: string }[];
};

export type QuestionnaireReport = {
  form: QuestionnaireFormOption & { title: string };
  questions: QuestionnaireQuestion[];
  responses: QuestionnaireResponse[];
};

const CHOICE_TYPES = new Set(["radio", "select", "checkbox", "health_interest"]);
const SKIP_TYPES = new Set(["heading", "image", "email", "consent"]);

export async function getQuestionnaireForms(): Promise<QuestionnaireFormOption[]> {
  const supabase = getAdminClient();
  const { data: forms } = await supabase
    .from("form_templates")
    .select("id, name, slug, enabled")
    .order("updated_at", { ascending: false });

  const list = (forms as Pick<FormTemplateRecord, "id" | "name" | "slug" | "enabled">[] | null) ?? [];
  // Counted in the database, one head request per form — a plain read stops at 1000 rows.
  const stats = await Promise.all(
    list.map(async (f) => {
      const [{ count }, { data: last }] = await Promise.all([
        supabase
          .from("form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_id", f.id),
        supabase
          .from("form_submissions")
          .select("submitted_at")
          .eq("form_id", f.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        enabled: f.enabled,
        responses: count ?? 0,
        lastAt: (last as { submitted_at: string } | null)?.submitted_at ?? null,
      };
    }),
  );

  return stats.sort((a, b) => {
    if (!!a.lastAt !== !!b.lastAt) return a.lastAt ? -1 : 1;
    return (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || a.name.localeCompare(b.name, "bg");
  });
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === "" || value === false) return [];
  return [String(value)];
}

function optionLabel(field: FormField, value: string): string {
  if (field.type === "health_interest") return healthLabelForTag(value, "bg");
  return field.options?.find((o) => o.value === value)?.label_bg || value;
}

/** First answer that looks like a name — forms ask for it in different ways. */
function guessName(fields: FormField[], answers: Record<string, unknown>): string | null {
  for (const field of fields) {
    if (field.type !== "text") continue;
    const label = `${field.label_bg} ${field.label_en} ${field.id}`.toLowerCase();
    if (/име|name/.test(label) && typeof answers[field.id] === "string") {
      const v = String(answers[field.id]).trim();
      if (v) return v;
    }
  }
  return null;
}

function guessPhone(fields: FormField[], answers: Record<string, unknown>): string | null {
  for (const field of fields) {
    if (field.type === "phone" && typeof answers[field.id] === "string") {
      const v = String(answers[field.id]).trim();
      if (v) return v;
    }
  }
  return null;
}

export async function getQuestionnaireReport(formId: string): Promise<QuestionnaireReport | null> {
  const supabase = getAdminClient();
  const { data: formRow } = await supabase
    .from("form_templates")
    .select("*")
    .eq("id", formId)
    .maybeSingle();
  const form = formRow as FormTemplateRecord | null;
  if (!form) return null;
  const fields: FormField[] = Array.isArray(form.fields) ? form.fields : [];

  const submissions = await fetchAllRows<{
    id: string;
    email: string | null;
    subscriber_id: string | null;
    answers: Record<string, string | string[] | boolean>;
    submitted_at: string;
  }>(
    (from, to) =>
      supabase
        .from("form_submissions")
        .select("id, email, subscriber_id, answers, submitted_at")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    { pageSize: 1000, maxPages: 50 },
  );

  // Who they are in the list — by id when the submission kept it, else by email.
  const emails = [
    ...new Set(submissions.map((s) => s.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e))),
  ];
  const people = new Map<
    string,
    { id: string; name: string | null; phone: string | null; status: string }
  >();
  for (const batch of chunkArray(emails, 200)) {
    const { data } = await supabase
      .from("subscribers")
      .select("id, email, name, first_name, last_name, phone, status")
      .in("email", batch);
    for (const row of (data as {
      id: string;
      email: string;
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      status: string;
    }[] | null) ?? []) {
      people.set(row.email.toLowerCase(), {
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.name,
        phone: row.phone,
        status: row.status,
      });
    }
  }

  const responses: QuestionnaireResponse[] = submissions.map((s) => {
    const answers = s.answers ?? {};
    const person = s.email ? people.get(s.email.trim().toLowerCase()) : undefined;
    const choices: Record<string, string[]> = {};
    for (const field of fields) {
      if (CHOICE_TYPES.has(field.type)) choices[field.id] = asList(answers[field.id]);
    }
    return {
      id: s.id,
      submittedAt: s.submitted_at,
      email: s.email,
      name: person?.name || guessName(fields, answers),
      phone: person?.phone || guessPhone(fields, answers),
      subscriberId: person?.id ?? s.subscriber_id ?? null,
      unsubscribed: person?.status === "unsubscribed",
      crmStatus: null,
      choices,
      rows: formatSubmissionAnswers(fields, answers),
    };
  });

  const { statuses, available } = await getContactStatuses();
  if (available && statuses.length > 0) {
    const statusById = new Map(statuses.map((status) => [status.id, status]));
    const statusBySubscriber = new Map<string, string>();
    const subscriberIds = [...new Set(responses.flatMap((r) => r.subscriberId ? [r.subscriberId] : []))];
    for (const batch of chunkArray(subscriberIds, 200)) {
      const { data, error } = await supabase
        .from("subscribers")
        .select("id, crm_status_id")
        .in("id", batch);
      if (error) throw new Error(`Questionnaire contact statuses: ${error.message}`);
      for (const row of data ?? []) {
        if (row.crm_status_id) statusBySubscriber.set(row.id, row.crm_status_id);
      }
    }
    for (const response of responses) {
      const statusId = response.subscriberId ? statusBySubscriber.get(response.subscriberId) : undefined;
      const status = statusId ? statusById.get(statusId) : undefined;
      response.crmStatus = status ? { name: status.name, color: status.color } : null;
    }
  }

  const questions: QuestionnaireQuestion[] = [];
  for (const field of fields) {
    if (SKIP_TYPES.has(field.type)) continue;
    const label = field.label_bg || field.label_en || field.id;

    if (CHOICE_TYPES.has(field.type)) {
      const counts = new Map<string, number>();
      let answered = 0;
      for (const s of submissions) {
        const values = asList(s.answers?.[field.id]);
        if (values.length > 0) answered += 1;
        for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const known = (field.options ?? []).map((o) => ({
        value: o.value,
        label: optionLabel(field, o.value),
        count: counts.get(o.value) ?? 0,
      }));
      const extra = [...counts.entries()]
        .filter(([v]) => !known.some((k) => k.value === v))
        .map(([value, count]) => ({ value, label: optionLabel(field, value), count }));
      questions.push({
        kind: "choice",
        id: field.id,
        label,
        multiple: field.type === "checkbox",
        answered,
        options: [...known, ...extra],
      });
      continue;
    }

    if (field.type === "number") {
      const raw = submissions.filter((s) => {
        const v = s.answers?.[field.id];
        return v !== undefined && v !== null && String(v).trim() !== "";
      });
      const values = raw
        .map((s) => Number(String(s.answers?.[field.id]).replace(",", ".")))
        .filter((n) => Number.isFinite(n));
      questions.push({
        kind: "number",
        id: field.id,
        label,
        answered: raw.length,
        avg: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
      });
      continue;
    }

    const latest: { value: string; at: string }[] = [];
    let answered = 0;
    for (const s of submissions) {
      const v = s.answers?.[field.id];
      const text = typeof v === "string" ? v.trim() : Array.isArray(v) ? v.join(", ") : "";
      if (!text) continue;
      answered += 1;
      if (latest.length < 4) latest.push({ value: text, at: s.submitted_at });
    }
    questions.push({ kind: "text", id: field.id, label, answered, latest });
  }

  return {
    form: {
      id: form.id,
      name: form.name,
      slug: form.slug,
      enabled: form.enabled,
      title: form.title_bg || form.name,
      responses: responses.length,
      lastAt: responses[0]?.submittedAt ?? null,
    },
    questions,
    responses,
  };
}
