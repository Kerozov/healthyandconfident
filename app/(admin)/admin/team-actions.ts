"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/lib/supabase/types";
import { requireAdmin, requireOwner, type AdminSession } from "@/lib/admin/auth";
import { logAdminChange } from "@/lib/admin/audit";
import { hashPassword, verifyPassword, safeEqualSecret } from "@/lib/admin/passwords";
import { sanitizeAdminScreens } from "@/lib/admin/screens";
import { normalizeUsername, usernameRules } from "@/lib/admin/usernames";

export type TeamActionResult = { ok: boolean; message?: string };

const MIN_PASSWORD = 8;

function revalidateTeam() {
  revalidatePath("/admin");
  revalidatePath("/admin/team");
}

function accessErrorMessage(error: unknown): TeamActionResult {
  const message =
    error instanceof Error && error.message && error.message !== "UNAUTHORIZED"
      ? error.message
      : "Нямаш достъп.";
  return { ok: false, message };
}

function validPassword(password: string): boolean {
  return password.trim().length >= MIN_PASSWORD;
}

export async function createAdminProfile(input: {
  displayName: string;
  username: string;
  password: string;
  screens: string[];
}): Promise<TeamActionResult> {
  let actor: AdminSession;
  try {
    actor = await requireOwner();
  } catch (error) {
    return accessErrorMessage(error);
  }

  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const screens = sanitizeAdminScreens(input.screens);

  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, message: "Името трябва да е между 2 и 80 символа." };
  }
  if (!username) {
    return { ok: false, message: `Невалидно потребителско име. ${usernameRules()}.` };
  }
  if (!validPassword(input.password)) {
    return { ok: false, message: `Паролата трябва да е поне ${MIN_PASSWORD} символа.` };
  }
  if (screens.length === 0) {
    return { ok: false, message: "Избери поне един екран, до който профилът има достъп." };
  }

  const password_hash = await hashPassword(input.password);
  const { error } = await getAdminClient().from("admin_users").insert({
    display_name: displayName,
    username,
    password_hash,
    role: "member",
    screens,
    active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Това потребителско име вече се използва." };
    }
    return { ok: false, message: error.message };
  }

  logAdminChange(actor, {
    screen: "team",
    action: "create",
    summary: `Създаде профил ${displayName} (@${username})`,
    entityType: "admin_user",
  });
  revalidateTeam();
  return { ok: true, message: `Профилът „${displayName}“ е създаден.` };
}

export async function updateAdminProfile(input: {
  id: string;
  displayName: string;
  username: string;
  password?: string;
  screens: string[];
  active: boolean;
}): Promise<TeamActionResult> {
  let actor: AdminSession;
  try {
    actor = await requireOwner();
  } catch (error) {
    return accessErrorMessage(error);
  }

  const { data, error: loadError } = await getAdminClient()
    .from("admin_users")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (loadError || !data) {
    return { ok: false, message: "Профилът не е намерен." };
  }

  const user = data as AdminUser;
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false, message: "Името трябва да е между 2 и 80 символа." };
  }
  if (!username) {
    return { ok: false, message: `Невалидно потребителско име. ${usernameRules()}.` };
  }

  const patch: Partial<AdminUser> = {
    display_name: displayName,
    username,
  };

  if (user.role === "owner") {
    if (input.active === false) {
      return { ok: false, message: "Главният админ не може да бъде деактивиран." };
    }
    if (input.password?.trim()) {
      if (!validPassword(input.password)) {
        return { ok: false, message: `Паролата трябва да е поне ${MIN_PASSWORD} символа.` };
      }
      patch.password_hash = await hashPassword(input.password);
    }
  } else {
    const screens = sanitizeAdminScreens(input.screens);
    if (input.active && screens.length === 0) {
      return { ok: false, message: "Активен профил трябва да има поне един екран." };
    }
    patch.screens = screens;
    patch.active = input.active;
    if (input.password?.trim()) {
      if (!validPassword(input.password)) {
        return { ok: false, message: `Паролата трябва да е поне ${MIN_PASSWORD} символа.` };
      }
      patch.password_hash = await hashPassword(input.password);
    }
  }

  const { error } = await getAdminClient()
    .from("admin_users")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Това потребителско име вече се използва." };
    }
    return { ok: false, message: error.message };
  }

  logAdminChange(actor, {
    screen: "team",
    action: "update",
    summary: `Обнови профил ${displayName} (@${username})`,
    entityType: "admin_user",
    entityId: user.id,
  });
  revalidateTeam();
  return { ok: true, message: "Профилът е обновен." };
}

export async function deleteAdminProfile(id: string): Promise<TeamActionResult> {
  let actor: AdminSession;
  try {
    actor = await requireOwner();
  } catch (error) {
    return accessErrorMessage(error);
  }

  const { data } = await getAdminClient()
    .from("admin_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const user = data as AdminUser | null;
  if (!user) return { ok: false, message: "Профилът не е намерен." };
  if (user.role === "owner") {
    return { ok: false, message: "Главният админ не може да бъде изтрит." };
  }
  if (actor.id && actor.id === user.id) {
    return { ok: false, message: "Не можеш да изтриеш собствения си профил." };
  }

  const { error } = await getAdminClient().from("admin_users").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  logAdminChange(actor, {
    screen: "team",
    action: "delete",
    summary: `Изтри профил ${user.display_name} (@${user.username})`,
    entityType: "admin_user",
    entityId: id,
  });
  revalidateTeam();
  return { ok: true, message: "Профилът е изтрит." };
}

export async function changeOwnPassword(input: {
  currentPassword: string;
  nextPassword: string;
}): Promise<TeamActionResult> {
  let actor: AdminSession;
  try {
    actor = await requireAdmin();
  } catch (error) {
    return accessErrorMessage(error);
  }

  if (!actor.id) {
    return {
      ok: false,
      message: "Пусни SQL миграцията за профили, преди да задаваш лична парола.",
    };
  }
  if (!validPassword(input.nextPassword)) {
    return { ok: false, message: `Новата парола трябва да е поне ${MIN_PASSWORD} символа.` };
  }

  const { data, error: loadError } = await getAdminClient()
    .from("admin_users")
    .select("*")
    .eq("id", actor.id)
    .maybeSingle();
  if (loadError || !data) {
    return { ok: false, message: "Профилът не е намерен." };
  }

  const user = data as AdminUser;
  const secret = process.env.ADMIN_SECRET?.trim() || "";
  const masterOk =
    user.role === "owner" && Boolean(secret) && safeEqualSecret(input.currentPassword, secret);
  const hashOk = await verifyPassword(input.currentPassword, user.password_hash);

  if (!masterOk && !hashOk) {
    return { ok: false, message: "Текущата парола е грешна." };
  }

  const password_hash = await hashPassword(input.nextPassword);
  const { error } = await getAdminClient()
    .from("admin_users")
    .update({ password_hash })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  logAdminChange(actor, {
    screen: "account",
    action: "update",
    summary: "Смени паролата си",
  });
  revalidateTeam();
  return { ok: true, message: "Паролата е сменена." };
}
