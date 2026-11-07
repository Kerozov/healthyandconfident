"use server";

import { revalidatePath } from "next/cache";
import {
  AdminAccessError,
  AdminSessionUnavailableError,
  requireAdmin,
  requireOwner,
  type AdminSession,
} from "@/lib/admin/auth";
import { logAdminChange } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/supabase/admin";
import { chunkArray } from "@/lib/utils";
import { normalizeStatusColor } from "@/lib/admin/contact-crm";
import {
  crmTablesMissing,
  recordSubscriberHistory,
} from "@/lib/admin/contact-statuses";
import type { ContactStatus } from "@/lib/supabase/types";

type Result = { ok: boolean; message?: string; updated?: number };

const MISSING_MIGRATION =
  "Статусите още не са включени в базата (миграция 088). След deploy опитай пак.";

/** The session, or the message to show instead of an error page. */
async function session(
  check: () => Promise<AdminSession>,
): Promise<{ ok: true; session: AdminSession } | { ok: false; message: string }> {
  try {
    return { ok: true, session: await check() };
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

function actorName(s: AdminSession): string {
  return s.displayName?.trim() || s.username || "Админ";
}

function refresh() {
  revalidatePath("/admin/subscribers", "layout");
}

function dbError(error: { code?: string; message?: string }): Result {
  if (crmTablesMissing(error)) return { ok: false, message: MISSING_MIGRATION };
  if (error.code === "23505") {
    return { ok: false, message: "Вече има статус с това име." };
  }
  return { ok: false, message: error.message ?? "Записът не успя." };
}

// ── Statuses (main admin only) ──────────────────────────────

export async function createContactStatus(input: {
  name: string;
  color: string;
}): Promise<Result> {
  const name = input.name.trim();
  const auth = await session(() => requireOwner());
  if (!auth.ok) return auth;
  if (!name) return { ok: false, message: "Въведи име на статуса." };
  if (name.length > 60) return { ok: false, message: "Името е твърде дълго (до 60 знака)." };

  const supabase = getAdminClient();
  const { data: last } = await supabase
    .from("contact_statuses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("contact_statuses").insert({
    name,
    color: normalizeStatusColor(input.color),
    sort_order: ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1,
  });
  if (error) return dbError(error);
  logAdminChange(auth.session, {
    screen: "subscribers",
    action: "create",
    summary: `Добави статус „${name}“`,
  });
  refresh();
  return { ok: true, message: `Статусът „${name}“ е добавен.` };
}

export async function updateContactStatus(input: {
  id: string;
  name?: string;
  color?: string;
}): Promise<Result> {
  const auth = await session(() => requireOwner());
  if (!auth.ok) return auth;

  const patch: Partial<ContactStatus> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Името не може да е празно." };
    if (name.length > 60) return { ok: false, message: "Името е твърде дълго (до 60 знака)." };
    patch.name = name;
  }
  if (input.color !== undefined) patch.color = normalizeStatusColor(input.color);

  const { error } = await getAdminClient()
    .from("contact_statuses")
    .update(patch)
    .eq("id", input.id);
  if (error) return dbError(error);
  logAdminChange(auth.session, {
    screen: "subscribers",
    action: "update",
    summary: patch.name ? `Промени статус „${patch.name}“` : "Промени статус",
    entityType: "contact_status",
    entityId: input.id,
  });
  refresh();
  return { ok: true };
}

export async function deleteContactStatus(id: string): Promise<Result> {
  const auth = await session(() => requireOwner());
  if (!auth.ok) return auth;
  const supabase = getAdminClient();

  // The people lose the status; their history keeps its name and colour.
  const { error: clearError } = await supabase
    .from("subscribers")
    .update({
      crm_status_id: null,
      crm_status_comment: null,
      crm_status_changed_at: null,
      crm_status_changed_by: null,
    })
    .eq("crm_status_id", id);
  if (clearError) return dbError(clearError);

  const { error } = await supabase.from("contact_statuses").delete().eq("id", id);
  if (error) return dbError(error);
  logAdminChange(auth.session, {
    screen: "subscribers",
    action: "delete",
    summary: "Изтри статус",
    entityType: "contact_status",
    entityId: id,
  });
  refresh();
  return { ok: true };
}

export async function reorderContactStatuses(ids: string[]): Promise<Result> {
  const auth = await session(() => requireOwner());
  if (!auth.ok) return auth;
  const supabase = getAdminClient();
  for (let i = 0; i < ids.length; i += 1) {
    const { error } = await supabase
      .from("contact_statuses")
      .update({ sort_order: i })
      .eq("id", ids[i]);
    if (error) return dbError(error);
  }
  refresh();
  return { ok: true };
}

// ── Setting a status on people (anyone with the subscribers screen) ──

export async function setSubscribersStatus(input: {
  ids: string[];
  statusId: string | null;
  comment?: string;
}): Promise<Result> {
  const ids = [...new Set(input.ids.filter(Boolean))];
  const auth = await session(() =>
    requireAdmin("subscribers", {
      action: "update",
      summary:
        ids.length === 1 ? "Смени статуса на контакт" : `Смени статуса на ${ids.length} контакта`,
      entityType: "subscriber",
      entityId: ids.length === 1 ? ids[0] : undefined,
    }),
  );
  if (!auth.ok) return auth;
  if (ids.length === 0) return { ok: false, message: "Не е избран контакт." };

  const comment = input.comment?.trim() || null;
  if (comment && comment.length > 2000) {
    return { ok: false, message: "Коментарът е твърде дълъг (до 2000 знака)." };
  }

  const supabase = getAdminClient();

  let status: ContactStatus | null = null;
  if (input.statusId) {
    const { data, error } = await supabase
      .from("contact_statuses")
      .select("*")
      .eq("id", input.statusId)
      .maybeSingle();
    if (error) return dbError(error);
    status = (data as ContactStatus | null) ?? null;
    if (!status) return { ok: false, message: "Статусът вече не съществува. Презареди." };
  }

  const { data: statusRows } = await supabase.from("contact_statuses").select("id, name");
  const statusNameById = new Map(
    ((statusRows as { id: string; name: string }[] | null) ?? []).map((s) => [s.id, s.name]),
  );

  const now = new Date().toISOString();
  const by = actorName(auth.session);
  let updated = 0;
  const history: Parameters<typeof recordSubscriberHistory>[0] = [];

  for (const batch of chunkArray(ids, 150)) {
    const { data: before, error: readError } = await supabase
      .from("subscribers")
      .select("id, crm_status_id")
      .in("id", batch);
    if (readError) return dbError(readError);

    const { error } = await supabase
      .from("subscribers")
      .update({
        crm_status_id: status?.id ?? null,
        crm_status_comment: comment,
        crm_status_changed_at: now,
        crm_status_changed_by: by,
      })
      .in("id", batch);
    if (error) return dbError(error);

    for (const row of (before as { id: string; crm_status_id: string | null }[] | null) ?? []) {
      updated += 1;
      history.push({
        subscriber_id: row.id,
        kind: "status",
        status_id: status?.id ?? null,
        status_name: status?.name ?? null,
        status_color: status?.color ?? null,
        previous_status_name: row.crm_status_id
          ? (statusNameById.get(row.crm_status_id) ?? null)
          : null,
        comment,
        actor_id: auth.session.id,
        actor_name: by,
      });
    }
  }

  await recordSubscriberHistory(history);
  refresh();
  return {
    ok: true,
    updated,
    message: status
      ? `Статус „${status.name}“ - ${updated === 1 ? "1 контакт" : `${updated} контакта`}.`
      : `Статусът е махнат - ${updated === 1 ? "1 контакт" : `${updated} контакта`}.`,
  };
}
