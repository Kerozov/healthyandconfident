"use server";

import { revalidatePath } from "next/cache";
import { AdminAccessError, AdminSessionUnavailableError, requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteQuestionnaireCta } from "@/lib/supabase/types";

export type QuestionnaireCtaInput = Omit<SiteQuestionnaireCta, "id" | "updated_at">;

const LIMITS: Partial<Record<keyof QuestionnaireCtaInput, number>> = {
  nav_label_bg: 30,
  nav_label_en: 30,
  eyebrow_bg: 60,
  eyebrow_en: 60,
  title_bg: 120,
  title_en: 120,
  text_bg: 400,
  text_en: 400,
  button_bg: 40,
  button_en: 40,
};

/** The entry questionnaire on the site — menu item and home card. Needs the website screen. */
export async function saveQuestionnaireCta(
  input: QuestionnaireCtaInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin("website", {
      screen: "questionnaires",
      action: "save",
      summary: "Обнови въпросника на сайта",
    });
  } catch (err) {
    if (err instanceof AdminSessionUnavailableError) {
      return { ok: false, message: "Връзката с базата се разпадна. Опитай пак." };
    }
    if (err instanceof AdminAccessError) {
      return { ok: false, message: "Нужен е достъп до „Уебсайт“, за да променяш сайта." };
    }
    throw err;
  }

  const slug = input.form_slug.trim();
  if ((input.show_in_nav || input.show_on_home) && !slug) {
    return { ok: false, message: "Избери кой въпросник да се показва." };
  }

  const row: Record<string, unknown> = {
    id: "home",
    form_slug: slug,
    show_in_nav: Boolean(input.show_in_nav),
    show_on_home: Boolean(input.show_on_home),
    show_en: Boolean(input.show_en),
    image_url: input.image_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  for (const [key, max] of Object.entries(LIMITS) as [keyof QuestionnaireCtaInput, number][]) {
    const value = String(input[key] ?? "").trim();
    if (value.length > max) {
      return { ok: false, message: `Текстът е твърде дълъг (до ${max} знака).` };
    }
    row[key] = value;
  }

  const { error } = await getAdminClient()
    .from("site_questionnaire_cta")
    .upsert(row as Partial<SiteQuestionnaireCta>, { onConflict: "id" });
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    return {
      ok: false,
      message: missing
        ? "Блокът още не е в базата (миграция 090). След deploy опитай пак."
        : error.message,
    };
  }

  revalidatePath("/(site)/[locale]", "layout");
  revalidatePath("/admin/questionnaires");
  return { ok: true, message: "Запазено - сайтът е обновен." };
}
