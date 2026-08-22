import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getFormTemplateBySlug } from "@/lib/admin/forms-data";
import { verifyFormInviteToken } from "@/lib/forms/form-invite-token";
import { resolveTagsOnSubmit } from "@/lib/forms/tags-on-submit";
import {
  mergeAnswerTagsIntoSubscriber,
  tagsFromMappedAnswers,
} from "@/lib/forms/answer-tags";
import type { FormField } from "@/lib/forms/types";
import { runAutomations } from "@/lib/automation/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

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
  const form = await getFormTemplateBySlug(slug, { includeDisabled: true });
  if (!form) {
    return NextResponse.json({ error: formError(locale, "notFound") }, { status: 404 });
  }
  if (!form.enabled && !body.token) {
    return NextResponse.json({ error: formError(locale, "notFound") }, { status: 404 });
  }

  const answers = body.answers ?? {};
  const fields = form.fields ?? [];

  for (const field of fields) {
    if (!field.required || field.type === "heading") continue;
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
    const payload = verifyFormInviteToken(body.token);
    if (!payload || payload.f !== form.id) {
      return NextResponse.json({ error: formError(locale, "invalid") }, { status: 403 });
    }
    email = payload.e;
    subscriberId = payload.sid ?? null;

    const supabase = getAdminClient();
    const { data: inv } = await supabase
      .from("form_invitations")
      .select("id, completed_at")
      .eq("token", body.token)
      .maybeSingle();

    const invitation = inv as { id: string; completed_at: string | null } | null;
    if (!invitation) {
      return NextResponse.json({ error: formError(locale, "invalid") }, { status: 403 });
    }
    if (invitation.completed_at) {
      return NextResponse.json({ error: formError(locale, "already") }, { status: 409 });
    }
    invitationId = invitation.id;
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

  const { error: insertError } = await supabase.from("form_submissions").insert({
    form_id: form.id,
    subscriber_id: subscriberId,
    email,
    answers: answers as Record<string, string | string[] | boolean>,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (invitationId) {
    await supabase
      .from("form_invitations")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", invitationId);
  }

  const fixedTags = resolveTagsOnSubmit(form.settings);
  const answerTags = tagsFromMappedAnswers(fields, answers);
  const hasTagWork = fixedTags.length > 0 || answerTags.length > 0;
  const formSource = `form:${slug}`;

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
      const { data: inserted } = await supabase
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
      await runAutomations({
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
    } catch (err) {
      console.error("[form-submit] automations:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
