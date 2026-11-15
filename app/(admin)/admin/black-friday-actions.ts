"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  AdminAccessError,
  AdminSessionUnavailableError,
  requireAdmin,
} from "@/lib/admin/auth";
import { getBlackFridayAdminItems } from "@/lib/black-friday/admin";
import {
  BUNDLE_MAX_ITEMS,
  BUNDLE_MIN_ITEMS,
  bundleFinalAmount,
  discountedAmount,
  euroToCents,
  parseBlackFridayItemKey,
  type BlackFridayBundlePriceType,
  type BlackFridayDiscountType,
} from "@/lib/black-friday/pricing";

export type BlackFridayActionResult = { ok: boolean; message?: string; id?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard(summary: string): Promise<BlackFridayActionResult> {
  try {
    await requireAdmin("bundles", { action: "save", summary });
    return { ok: true };
  } catch (err) {
    if (err instanceof AdminSessionUnavailableError) {
      return {
        ok: false,
        message: "Връзката с базата се разпадна. Опитай пак - не си излязъл от профила.",
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

function fail(err: unknown, fallback: string): BlackFridayActionResult {
  return { ok: false, message: err instanceof Error ? err.message : fallback };
}

function refresh(layout = false) {
  revalidatePath("/admin/bundles");
  if (layout) revalidatePath("/", "layout");
}

function checkValue(value: number, percent: boolean, what: string): number {
  if (!Number.isFinite(value) || value <= 0 || (percent && value >= 100)) {
    throw new Error(percent ? "Процентът трябва да е над 0 и под 100." : `${what} трябва да е положителна сума.`);
  }
  if (!percent && euroToCents(value) === null) {
    throw new Error("Използвай най-много два знака след десетичната запетая.");
  }
  return value;
}

function text(value: unknown, max: number, label: string): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new Error(`Невалидно поле „${label}“.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`„${label}“ може да е до ${max} знака.`);
  return trimmed;
}

async function nextSortOrder(table: "black_friday_discounts" | "black_friday_bundles") {
  const { data } = await getAdminClient()
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  return ((data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;
}

// ── Campaign ─────────────────────────────────────────────────────────────────

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
): Promise<BlackFridayActionResult> {
  const guardResult = await guard("Обнови кампанията за Черния петък");
  if (!guardResult.ok) return guardResult;

  const deadline = input.deadline?.trim() || null;
  const start = input.early_access_deadline?.trim() || null;
  if (deadline && start && new Date(deadline).getTime() <= new Date(start).getTime()) {
    return { ok: false, message: "Краят на офертите трябва да е след началото им." };
  }

  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("site_black_friday")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    enabled: input.enabled,
    deadline,
    early_access_deadline: start,
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
  refresh(true);
  return { ok: true };
}

// ── Discounts ────────────────────────────────────────────────────────────────

export async function saveBlackFridayDiscount(input: {
  item_key: string;
  discount_type: BlackFridayDiscountType;
  discount_value: number;
  enabled: boolean;
}): Promise<BlackFridayActionResult> {
  const guardResult = await guard("Обнови отстъпка за Черния петък");
  if (!guardResult.ok) return guardResult;

  try {
    if (!parseBlackFridayItemKey(input.item_key)) throw new Error("Избери продукт от списъка.");
    if (!["percent", "amount", "price"].includes(input.discount_type)) {
      throw new Error("Избери вид отстъпка.");
    }
    const value = checkValue(
      Number(input.discount_value),
      input.discount_type === "percent",
      input.discount_type === "price" ? "Новата цена" : "Отстъпката",
    );

    const items = await getBlackFridayAdminItems();
    const item = items.get(input.item_key);
    if (!item) throw new Error("Продуктът не е намерен - презареди страницата.");

    const supabase = getAdminClient();
    const { data: others, error: othersError } = await supabase
      .from("black_friday_discounts")
      .select("item_key")
      .neq("item_key", input.item_key);
    if (othersError) throw new Error(othersError.message);
    const clash = ((others as { item_key: string }[]) ?? [])
      .map((row) => items.get(row.item_key))
      .find((other) => other && item.priceId && other.priceId === item.priceId);
    if (clash) {
      throw new Error(`Същата Stripe цена вече има отстъпка: „${clash.label}“.`);
    }

    if (input.enabled) {
      if (item.problem || item.regularCents === null) {
        throw new Error(`„${item.label}“ не може да е с отстъпка: ${item.problem ?? "няма цена"}.`);
      }
      if (discountedAmount(item.regularCents, input.discount_type, value) === null) {
        throw new Error("Новата цена трябва да е над 0 и по-ниска от сегашната.");
      }
    }

    const { data: existing } = await supabase
      .from("black_friday_discounts")
      .select("item_key")
      .eq("item_key", input.item_key)
      .maybeSingle();
    const row = {
      discount_type: input.discount_type,
      discount_value: value,
      enabled: input.enabled,
    };
    const { error } = existing
      ? await supabase.from("black_friday_discounts").update(row).eq("item_key", input.item_key)
      : await supabase.from("black_friday_discounts").insert({
          ...row,
          item_key: input.item_key,
          sort_order: await nextSortOrder("black_friday_discounts"),
        });
    if (error) throw new Error(error.message);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Отстъпката не се запази.");
  }
}

export async function deleteBlackFridayDiscount(itemKey: string): Promise<BlackFridayActionResult> {
  const guardResult = await guard("Изтрий отстъпка за Черния петък");
  if (!guardResult.ok) return guardResult;
  if (!parseBlackFridayItemKey(itemKey)) return { ok: false, message: "Невалиден продукт." };
  const { error } = await getAdminClient()
    .from("black_friday_discounts")
    .delete()
    .eq("item_key", itemKey);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true };
}

// ── Bundles ──────────────────────────────────────────────────────────────────

export type BlackFridayBundleInput = {
  id?: string | null;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  badge_bg: string;
  badge_en: string;
  item_keys: string[];
  price_type: BlackFridayBundlePriceType;
  price_value: number;
  enabled: boolean;
};

export async function saveBlackFridayBundle(
  input: BlackFridayBundleInput,
): Promise<BlackFridayActionResult> {
  const guardResult = await guard("Обнови комплект за Черния петък");
  if (!guardResult.ok) return guardResult;

  try {
    if (input.id && !UUID_RE.test(input.id)) throw new Error("Невалиден комплект.");
    const titleBg = text(input.title_bg, 160, "Заглавие (БГ)");
    if (!titleBg) throw new Error("Дай име на комплекта.");

    const keys = Array.isArray(input.item_keys) ? input.item_keys : [];
    if (keys.some((key) => typeof key !== "string" || !parseBlackFridayItemKey(key))) {
      throw new Error("Избери продуктите от списъка.");
    }
    if (new Set(keys).size !== keys.length) throw new Error("Един продукт е добавен два пъти.");
    if (keys.length < BUNDLE_MIN_ITEMS || keys.length > BUNDLE_MAX_ITEMS) {
      throw new Error(`Комплектът събира от ${BUNDLE_MIN_ITEMS} до ${BUNDLE_MAX_ITEMS} продукта.`);
    }
    if (input.price_type !== "percent" && input.price_type !== "price") {
      throw new Error("Избери процент или крайна цена на комплекта.");
    }
    const value = checkValue(Number(input.price_value), input.price_type === "percent", "Цената");

    if (input.enabled) {
      const items = await getBlackFridayAdminItems();
      const picked = keys.map((key) => items.get(key));
      let total = 0;
      for (const [index, item] of picked.entries()) {
        if (!item) throw new Error("Един от продуктите не е намерен - презареди страницата.");
        if (item.problem || item.regularCents === null) {
          throw new Error(`„${item.label}“ не може да е в комплекта: ${item.problem ?? "няма цена"}.`);
        }
        const earlier = picked.slice(0, index);
        if (earlier.some((other) => other?.priceId === item.priceId)) {
          throw new Error(`„${item.label}“ е със същата Stripe цена като друг продукт в комплекта.`);
        }
        if (earlier.some((other) => other?.stripeProductId === item.stripeProductId)) {
          throw new Error(`„${item.label}“ е същият Stripe продукт като друг в комплекта.`);
        }
        total += item.regularCents;
      }
      if (bundleFinalAmount(total, keys.length, input.price_type, value) === null) {
        throw new Error("Цената на комплекта трябва да е по-ниска от сбора на продуктите поотделно.");
      }
    }

    const row = {
      title_bg: titleBg,
      title_en: text(input.title_en, 160, "Заглавие (EN)"),
      description_bg: text(input.description_bg, 600, "Описание (БГ)"),
      description_en: text(input.description_en, 600, "Описание (EN)"),
      badge_bg: text(input.badge_bg, 40, "Етикет (БГ)"),
      badge_en: text(input.badge_en, 40, "Етикет (EN)"),
      item_keys: keys,
      price_type: input.price_type,
      price_value: value,
      enabled: input.enabled,
    };
    const supabase = getAdminClient();
    const result = input.id
      ? await supabase
          .from("black_friday_bundles")
          .update(row)
          .eq("id", input.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("black_friday_bundles")
          .insert({ ...row, sort_order: await nextSortOrder("black_friday_bundles") })
          .select("id")
          .single();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Комплектът не е намерен - презареди страницата.");
    refresh();
    return { ok: true, id: (result.data as { id: string }).id };
  } catch (err) {
    return fail(err, "Комплектът не се запази.");
  }
}

export async function deleteBlackFridayBundle(id: string): Promise<BlackFridayActionResult> {
  const guardResult = await guard("Изтрий комплект за Черния петък");
  if (!guardResult.ok) return guardResult;
  if (!UUID_RE.test(id)) return { ok: false, message: "Невалиден комплект." };
  const { error } = await getAdminClient().from("black_friday_bundles").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true };
}
