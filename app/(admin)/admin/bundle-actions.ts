"use server";

import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  AdminAccessError,
  AdminSessionUnavailableError,
  requireAdmin,
} from "@/lib/admin/auth";

export type BundleActionResult = { ok: boolean; message?: string; id?: string };

async function guard(): Promise<BundleActionResult> {
  try {
    await requireAdmin("bundles", { action: "save", summary: "Обнови пакети" });
    return { ok: true };
  } catch (err) {
    if (err instanceof AdminSessionUnavailableError) {
      return {
        ok: false,
        message:
          "Връзката с базата се разпадна. Опитай пак - не си излязъл от профила.",
      };
    }
    if (err instanceof AdminAccessError) {
      return {
        ok: false,
        message:
          err.message === "UNAUTHORIZED"
            ? "Сесията не можа да се потвърди. Презареди страницата."
            : err.message,
      };
    }
    throw err;
  }
}

function lines(items: string[] | undefined): string[] {
  return (items ?? []).map((s) => s.trim()).filter(Boolean);
}

export type BundleInput = {
  id?: string;
  slug?: string;
  title_bg: string;
  title_en: string;
  subtitle_bg: string;
  subtitle_en: string;
  includes_bg?: string[];
  includes_en?: string[];
  old_price_bg: string;
  old_price_en: string;
  price_bg: string;
  price_en: string;
  bonus_bg: string;
  bonus_en: string;
  cta_label_bg: string;
  cta_label_en: string;
  stripe_url: string;
  stripe_url_en: string;
  image_url?: string;
  badge_bg: string;
  badge_en: string;
  highlight: boolean;
  enabled: boolean;
  enabled_en: boolean;
};

async function nextSortOrder(): Promise<number> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_bundles")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const max = (data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0;
  return max + 1;
}

export async function saveBundle(input: BundleInput): Promise<BundleActionResult> {
  const guardResult = await guard();
  if (!guardResult.ok) return guardResult;

  if (!input.title_bg.trim() && !input.title_en.trim()) {
    return { ok: false, message: "Добави заглавие на пакета." };
  }

  const supabase = getAdminClient();
  const row = {
    slug: slugify(input.slug?.trim() || input.title_bg || input.title_en) || null,
    title_bg: input.title_bg,
    title_en: input.title_en,
    subtitle_bg: input.subtitle_bg,
    subtitle_en: input.subtitle_en,
    includes_bg: lines(input.includes_bg),
    includes_en: lines(input.includes_en),
    old_price_bg: input.old_price_bg,
    old_price_en: input.old_price_en,
    price_bg: input.price_bg,
    price_en: input.price_en,
    bonus_bg: input.bonus_bg,
    bonus_en: input.bonus_en,
    cta_label_bg: input.cta_label_bg,
    cta_label_en: input.cta_label_en,
    stripe_url: input.stripe_url.trim(),
    stripe_url_en: input.stripe_url_en.trim(),
    image_url: input.image_url?.trim() || null,
    badge_bg: input.badge_bg,
    badge_en: input.badge_en,
    highlight: input.highlight,
    enabled: input.enabled,
    enabled_en: input.enabled_en,
  };

  if (input.id) {
    const { error } = await supabase.from("site_bundles").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data, error } = await supabase
      .from("site_bundles")
      .insert({ ...row, sort_order: await nextSortOrder() })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/bundles");
    revalidatePath("/", "layout");
    return { ok: true, id: (data as { id: string }).id };
  }

  revalidatePath("/admin/bundles");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBundle(id: string): Promise<BundleActionResult> {
  const guardResult = await guard();
  if (!guardResult.ok) return guardResult;
  const supabase = getAdminClient();
  const { error } = await supabase.from("site_bundles").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/bundles");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function moveBundle(
  id: string,
  direction: "up" | "down",
): Promise<BundleActionResult> {
  const guardResult = await guard();
  if (!guardResult.ok) return guardResult;
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_bundles")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = (data as { id: string; sort_order: number }[]) ?? [];
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return { ok: false, message: "Пакетът не е намерен." };
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return { ok: true };

  const a = rows[index];
  const b = rows[swapIndex];
  const { error } = await supabase
    .from("site_bundles")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (!error) {
    await supabase.from("site_bundles").update({ sort_order: a.sort_order }).eq("id", b.id);
  }
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/bundles");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type BlackFridayConfigInput = {
  enabled: boolean;
  deadline?: string;
  early_access_deadline?: string;
  early_access_form_slug?: string;
  banner_text_bg?: string;
  banner_text_en?: string;
  banner_href?: string;
};

export async function saveBlackFridayConfig(
  input: BlackFridayConfigInput,
): Promise<BundleActionResult> {
  const guardResult = await guard();
  if (!guardResult.ok) return guardResult;

  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("site_black_friday")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    enabled: input.enabled,
    deadline: input.deadline?.trim() || null,
    early_access_deadline: input.early_access_deadline?.trim() || null,
    early_access_form_slug: input.early_access_form_slug?.trim() || "",
    banner_text_bg: input.banner_text_bg?.trim() || "",
    banner_text_en: input.banner_text_en?.trim() || "",
    banner_href: input.banner_href?.trim() || "/black-friday",
    updated_at: new Date().toISOString(),
  };

  const { error } = existing?.id
    ? await supabase.from("site_black_friday").update(payload).eq("id", existing.id)
    : await supabase.from("site_black_friday").insert(payload);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/bundles");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** The four offers from the Black Friday 2026 plan, as drafts to fill in. */
const PLAN_BUNDLES: Array<Omit<BundleInput, "stripe_url" | "stripe_url_en" | "enabled" | "enabled_en">> = [
  {
    slug: "21-dni-black-friday",
    title_bg: "„21 дни“ рецепти и менюта",
    title_en: "“21 days” recipes and menus",
    subtitle_bg: "Готови менюта и рецепти до 20 минути, плюс два наръчника.",
    subtitle_en: "Ready menus and recipes under 20 minutes, plus two guides.",
    includes_bg: [
      "„21 дни“ рецепти и менюта",
      "PDF „Вкусни гарнитури“",
      "PDF „Растителни протеини“",
    ],
    includes_en: [
      "“21 days” recipes and menus",
      "PDF “Tasty side dishes”",
      "PDF “Plant proteins”",
    ],
    old_price_bg: "77 €",
    old_price_en: "77 €",
    price_bg: "39 €",
    price_en: "39 €",
    bonus_bg: "Гаранция: следвай менюто 7 дни и ако не усетиш разлика, ти връщам парите.",
    bonus_en: "Guarantee: follow the menu for 7 days, and if you feel no difference, I refund you.",
    cta_label_bg: "Искам „21 дни“",
    cta_label_en: "I want “21 days”",
    badge_bg: "Най-продавано",
    badge_en: "Bestseller",
    highlight: true,
  },
  {
    slug: "po-leko-tyalo-black-friday",
    title_bg: "„По-леко тяло. По-свободно движение“",
    title_en: "“A lighter body. Freer movement”",
    subtitle_bg: "",
    subtitle_en: "",
    includes_bg: [],
    includes_en: [],
    old_price_bg: "96 €",
    old_price_en: "96 €",
    price_bg: "69 €",
    price_en: "69 €",
    bonus_bg: "",
    bonus_en: "",
    cta_label_bg: "",
    cta_label_en: "",
    badge_bg: "",
    badge_en: "",
    highlight: false,
  },
  {
    slug: "pdf-black-friday",
    title_bg: "PDF ръководства",
    title_en: "PDF guides",
    subtitle_bg: "Всеки наръчник на половин цена.",
    subtitle_en: "Every guide at half price.",
    includes_bg: ["Вкусни гарнитури", "Менопауза", "Кожа", "Растителни протеини"],
    includes_en: ["Tasty side dishes", "Menopause", "Skin", "Plant proteins"],
    old_price_bg: "по 16 €",
    old_price_en: "16 € each",
    price_bg: "по 9 €",
    price_en: "9 € each",
    bonus_bg: "",
    bonus_en: "",
    cta_label_bg: "",
    cta_label_en: "",
    badge_bg: "",
    badge_en: "",
    highlight: false,
  },
  {
    slug: "zhivei-bez-rezistentnost-black-friday",
    title_bg: "„Живей без резистентност“ (3 месеца)",
    title_en: "“Live without resistance” (3 months)",
    subtitle_bg: "Груповата програма на същата цена, с подарък.",
    subtitle_en: "The group program at the same price, with a gift.",
    includes_bg: [],
    includes_en: [],
    old_price_bg: "",
    old_price_en: "",
    price_bg: "",
    price_en: "",
    bonus_bg: "„21 дни“ подарък веднага + плащане на 2 вноски",
    bonus_en: "“21 days” as a gift right away + pay in 2 instalments",
    cta_label_bg: "",
    cta_label_en: "",
    badge_bg: "",
    badge_en: "",
    highlight: false,
  },
];

/**
 * Creates the plan's four offers as hidden drafts (skips any that already
 * exist by slug). The admin then only pastes the Stripe links and turns them on.
 */
export async function createPlanBundles(): Promise<BundleActionResult & { created?: number }> {
  const guardResult = await guard();
  if (!guardResult.ok) return guardResult;
  const supabase = getAdminClient();
  const { data: existing } = await supabase.from("site_bundles").select("slug");
  const taken = new Set(((existing as { slug: string | null }[]) ?? []).map((r) => r.slug));
  let order = await nextSortOrder();
  const rows = PLAN_BUNDLES.filter((b) => !taken.has(b.slug ?? "")).map((b) => ({
    ...b,
    slug: b.slug ?? null,
    includes_bg: b.includes_bg ?? [],
    includes_en: b.includes_en ?? [],
    stripe_url: "",
    stripe_url_en: "",
    enabled: false,
    enabled_en: false,
    sort_order: order++,
  }));
  if (rows.length === 0) return { ok: true, created: 0 };
  const { error } = await supabase.from("site_bundles").insert(rows);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/bundles");
  revalidatePath("/", "layout");
  return { ok: true, created: rows.length };
}
