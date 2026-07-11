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

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const form = await getFormTemplateBySlug(slug);
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  let body: {
    answers?: Record<string, unknown>;
    token?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const answers = body.answers ?? {};
  const fields = form.fields ?? [];
  const locale = body.locale === "en" ? "en" : "bg";

  for (const field of fields) {
    if (!field.required || field.type === "heading") continue;
    const val = answers[field.id];
    if (val === undefined || val === "" || val === false) {
      return NextResponse.json(
        { error: "Please fill all required fields." },
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
      return NextResponse.json({ error: "Invalid link." }, { status: 403 });
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
    if (invitation?.completed_at) {
      return NextResponse.json({ error: "Already submitted." }, { status: 409 });
    }
    invitationId = invitation?.id ?? null;
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

  if (email && hasTagWork) {
    const { data: subRow } = await supabase
      .from("subscribers")
      .select("id, tags")
      .eq("email", email)
      .maybeSingle();

    const sub = subRow as { id: string; tags: string[] } | null;
    const nextTags = mergeAnswerTagsIntoSubscriber(
      sub?.tags ?? [],
      answerTags,
      fixedTags,
    );

    if (sub) {
      await supabase
        .from("subscribers")
        .update({ tags: nextTags, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
    } else {
      const { data: inserted } = await supabase
        .from("subscribers")
        .insert({
          email,
          locale,
          source: `form:${slug}`,
          tags: nextTags,
          status: "subscribed",
          consent: true,
        })
        .select("id")
        .single();

      const newId = (inserted as { id: string } | null)?.id;
      if (newId) {
        await supabase
          .from("form_submissions")
          .update({ subscriber_id: newId })
          .eq("form_id", form.id)
          .eq("email", email)
          .is("subscriber_id", null);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
