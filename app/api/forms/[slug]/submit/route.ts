import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getFormTemplateById,
  getFormTemplateBySlug,
} from "@/lib/admin/forms-data";
import { verifyFormInviteToken } from "@/lib/forms/form-invite-token";
import { resolveTagsOnSubmit } from "@/lib/forms/tags-on-submit";
import {
  mergeAnswerTagsIntoSubscriber,
  tagsFromMappedAnswers,
} from "@/lib/forms/answer-tags";
import type { FormField } from "@/lib/forms/types";
import { runAutomations } from "@/lib/automation/run";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";
import { notifyFormSubmission } from "@/lib/admin/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const rateLimited = createRateLimiter(10, 60_000);

function formError(locale: string, key: "required" | "invalid" | "already" | "notFound" | "json" | "email"): string {
  const en = locale === "en";
  switch (key) {
    case "required":
      return en ? "Please fill all required fields." : "Попълни всички задължителни полета.";
    case "invalid":
      return en ? "This invite link is not valid." : "Линкът за формата не е валиден.";
    case "already":
      return en ? "This form was already submitted." : "Формата вече е попълнена с този линк.";
    case "notFound":
      return en ? "Form not found." : "Формата не е намерена.";
    case "json":
      return en ? "Invalid request." : "Невалидна заявка.";
    case "email":
      return en
        ? "An email address is required."
        : "Имейлът е задължителен.";
  }
}

function extractEmail(
  fields: FormField[],
  answers: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    if (field.type === "email") {
      const val = answers[field.id];
      if (typeof val === "string" && val.includes("@")) {
        return val.trim().toLowerCase();
      }
    }
  }
  for (const val of Object.values(answers)) {
    if (typeof val === "string" && val.includes("@")) {
      return val.trim().toLowerCase();
    }
  }
  return null;
}

/**
 * A required answer counts as missing when it is absent, blank, unticked — or an
 * empty list, which is what a multi-select ticked and then cleared sends.
 */
function isBlankAnswer(val: unknown): boolean {
  if (val === undefined || val === null || val === false) return true;
  if (typeof val === "string") return val.trim() === "";
  if (Array.isArray(val)) return val.length === 0;
  return false;
}

/** If the form has consent checkboxes, at least one must be checked for marketing. */
function hasMarketingConsent(
  fields: FormField[],
  answers: Record<string, unknown>,
): boolean {
  const consentFields = fields.filter((f) => f.type === "consent");
  if (consentFields.length === 0) return true;
  return consentFields.some((f) => Boolean(answers[f.id]));
}

type AdminClient = ReturnType<typeof getAdminClient>;
type Invitation = { id: string; completed_at: string | null };

/**
 * The subscriber an invite was sent to may have been deleted since. Linking the
 * answer to that id would fail the insert, so it falls back to the email lookup.
 */
async function existingSubscriberId(
  supabase: AdminClient,
  id: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("subscribers")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Write the invitation row a signed link should already have. A concurrent
 * submit may write it first — then that row is read back. If neither works the
 * answer is still saved, just without the one-answer-per-invite guard.
 */
async function recordMissingInvitation(
  supabase: AdminClient,
  row: { form_id: string; subscriber_id: string | null; email: string; token: string },
): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from("form_invitations")
    .insert(row)
    .select("id, completed_at")
    .single();
  if (!error && data) return data as Invitation;

  const { data: existing } = await supabase
    .from("form_invitations")
    .select("id, completed_at")
    .eq("token", row.token)
    .maybeSingle();
  if (existing) return existing as Invitation;

  console.error(
    `[form-submit] invitation row missing for form ${row.form_id} and could not be written:`,
    error?.message,
  );
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (rateLimited(requestIp(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: {
    answers?: Record<string, unknown>;
    token?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: formError("bg", "json") }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "bg";

  // Same resolution the public page uses: current slug, a retired one, or the
  // form id carried by the invite token. A posted answer is never lost to a
  // slug that was edited between the invite and the reply.
  const tokenPayload = body.token ? verifyFormInviteToken(body.token) : null;
  const form =
    (await getFormTemplateBySlug(slug, { includeDisabled: true })) ??
    (tokenPayload ? await getFormTemplateById(tokenPayload.f) : null);

  if (!form) {
    return NextResponse.json({ error: formError(locale, "notFound") }, { status: 404 });
  }
  if (!form.enabled && !body.token) {
    return NextResponse.json({ error: formError(locale, "notFound") }, { status: 404 });
  }

  const answers = body.answers ?? {};
  const fields = form.fields ?? [];

  for (const field of fields) {
    if (!field.required || field.type === "heading" || field.type === "image") continue;
    if (body.token && field.type === "email") continue;
    if (isBlankAnswer(answers[field.id])) {
      return NextResponse.json(
        { error: formError(locale, "required") },
        { status: 400 },
      );
    }
  }

  let email = extractEmail(fields, answers);
  let subscriberId: string | null = null;
  let invitationId: string | null = null;

  if (body.token) {
    const payload = tokenPayload;
    if (!payload || payload.f !== form.id) {
      return NextResponse.json({ error: formError(locale, "invalid") }, { status: 403 });
    }
    email = payload.e;

    const supabase = getAdminClient();
    subscriberId = payload.sid ? await existingSubscriberId(supabase, payload.sid) : null;

    const { data: inv } = await supabase
      .from("form_invitations")
      .select("id, completed_at")
      .eq("token", body.token)
      .maybeSingle();

    // The token is signed with our own key, so it is genuine even when its
    // invitation row never got written (a failed batch insert at send time).
    // Write the row now rather than turn away answers someone already typed.
    const invitation =
      (inv as Invitation | null) ??
      (await recordMissingInvitation(supabase, {
        form_id: form.id,
        subscriber_id: subscriberId,
        email,
        token: body.token,
      }));

    if (invitation?.completed_at) {
      return NextResponse.json({ error: formError(locale, "already") }, { status: 409 });
    }
    invitationId = invitation?.id ?? null;
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: formError(locale, "email") }, { status: 400 });
  }

  const supabase = getAdminClient();

  if (email && !subscriberId) {
    const { data: sub } = await supabase
      .from("subscribers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    subscriberId = (sub as { id: string } | null)?.id ?? null;
  }

  const submissionId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("form_submissions").insert({
    id: submissionId,
    form_id: form.id,
    invitation_id: invitationId,
    subscriber_id: subscriberId,
    email,
    answers: answers as Record<string, string | string[] | boolean>,
    submitted_at: submittedAt,
  });

  if (insertError) {
    if (invitationId && insertError.code === "23505") {
      return NextResponse.json({ error: formError(locale, "already") }, { status: 409 });
    }
    console.error(`[form-submit] ${form.slug} insert failed:`, insertError.message);
    return NextResponse.json(
      { error: locale === "en" ? "Something went wrong. Please try again." : "Нещо се обърка. Опитай отново." },
      { status: 500 },
    );
  }

  if (invitationId) {
    await supabase
      .from("form_invitations")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", invitationId);
  }

  // Staff receive the saved enquiry even when the visitor declines marketing.
  // Await the worker handoff, just like automations, so serverless cannot drop it.
  await notifyFormSubmission({
    form,
    submission: {
      id: submissionId,
      email,
      answers: answers as Record<string, string | string[] | boolean>,
      submitted_at: submittedAt,
    },
  });

  const fixedTags = resolveTagsOnSubmit(form.settings);
  const answerTags = tagsFromMappedAnswers(fields, answers);
  const hasTagWork = fixedTags.length > 0 || answerTags.length > 0;
  const formSource = `form:${form.slug}`;

  if (email && hasMarketingConsent(fields, answers)) {
    const { data: subRow } = await supabase
      .from("subscribers")
      .select("id, tags")
      .eq("email", email)
      .maybeSingle();

    const sub = subRow as { id: string; tags: string[] } | null;
    const priorTags = sub?.tags ?? [];
    const nextTags = hasTagWork
      ? mergeAnswerTagsIntoSubscriber(priorTags, answerTags, fixedTags)
      : priorTags;
    const isNew = !sub;

    if (sub) {
      subscriberId = sub.id;
      await supabase
        .from("subscribers")
        .update({
          tags: nextTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
    } else {
      const { data: inserted, error: subscriberError } = await supabase
        .from("subscribers")
        .insert({
          email,
          locale,
          source: formSource,
          tags: nextTags,
          status: "subscribed",
          consent: true,
        })
        .select("id")
        .single();

      if (subscriberError) {
        console.error(
          `[form-submit] subscriber insert failed for ${email}:`,
          subscriberError.message,
        );
      }

      const newId = (inserted as { id: string } | null)?.id ?? null;
      subscriberId = newId;
      if (newId) {
        await supabase
          .from("form_submissions")
          .update({ subscriber_id: newId })
          .eq("form_id", form.id)
          .eq("email", email)
          .is("subscriber_id", null);
      }
    }

    try {
      if (sub) {
        const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
          "@/lib/automation/cancel"
        );
        await cancelIneligibleAutomationDeliveriesForSubscriber(email, nextTags);
      }
      const report = await runAutomations({
        email,
        locale,
        subscriberId: subscriberId ?? null,
        tags: nextTags,
        priorTags: sub ? priorTags : undefined,
        isNew,
        source: formSource,
        formId: form.id,
        formAnswers: answers as Record<string, string | string[] | boolean>,
      });

      // "The automations did not fire" is otherwise invisible: the run reports
      // exactly which rule was skipped and why, so print it next to the submit.
      console.info(
        `[form-submit] ${formSource} ${email}: triggers=[${report.triggerEvents.join(",")}] ` +
          `rules=${report.rulesLoaded} sent=${report.submitted}` +
          (report.skipped.length
            ? ` skipped=${report.skipped.map((s) => `${s.name}(${s.reason})`).join(" | ")}`
            : "") +
          (report.errors.length ? ` errors=${report.errors.join(",")}` : ""),
      );
    } catch (err) {
      console.error("[form-submit] automations:", err);
    }
  } else if (email) {
    console.info(
      `[form-submit] ${formSource} ${email}: no marketing consent ticked - ` +
        "submission stored, no subscriber and no automations.",
    );
  }

  return NextResponse.json({ ok: true });
}
