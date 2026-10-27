import type { AdminUser } from "@/lib/supabase/types";

export const ADMIN_NOTIFICATION_OPTIONS = [
  {
    key: "notifyFormSubmissions",
    column: "notify_form_submissions",
    screen: "forms",
    label: "Попълнена форма / ново запитване",
    description: "Имейл с формата, данните за контакт и изпратените отговори.",
    accessHint: "Избери достъп до „Форми“, за да включиш тези известия.",
  },
  {
    key: "notifyNewSubscribers",
    column: "notify_new_subscribers",
    screen: "subscribers",
    label: "Нов абонат от сайта",
    description: "Имейл при първо записване през меню, popup или друга форма за абонамент.",
    accessHint: "Избери достъп до „Абонати“, за да включиш тези известия.",
  },
] as const;

export type AdminNotificationSettings = {
  notificationEmail: string;
  notifyFormSubmissions: boolean;
  notifyNewSubscribers: boolean;
};

export type AdminNotificationKind = (typeof ADMIN_NOTIFICATION_OPTIONS)[number]["column"];

const EMAIL_RE = /^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\]+\.[^\s@<>"(),;:\\]+$/;

export function normalizeNotificationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export function canReceiveAdminNotification(
  user: Pick<AdminUser, "role" | "screens">,
  kind: AdminNotificationKind,
): boolean {
  const option = ADMIN_NOTIFICATION_OPTIONS.find((item) => item.column === kind);
  return user.role === "owner" || Boolean(option && user.screens.includes(option.screen));
}

export function notificationSettingsPatch(
  input: AdminNotificationSettings,
  user: Pick<AdminUser, "role" | "screens">,
): {
  patch: Pick<AdminUser, "notification_email" | "notify_form_submissions" | "notify_new_subscribers">;
  error?: never;
} | { error: string; patch?: never } {
  const email = normalizeNotificationEmail(input.notificationEmail);
  if (typeof input.notificationEmail !== "string" || (input.notificationEmail.trim() && !email)) {
    return { error: "Въведи валиден имейл за известия." };
  }
  const patch = {
    notification_email: email,
    notify_form_submissions: input.notifyFormSubmissions === true,
    notify_new_subscribers: input.notifyNewSubscribers === true,
  };
  for (const option of ADMIN_NOTIFICATION_OPTIONS) {
    if (!patch[option.column]) continue;
    if (!email) return { error: "Добави имейл, за да включиш известията." };
    if (!canReceiveAdminNotification(user, option.column)) {
      return { error: option.accessHint };
    }
  }
  return { patch };
}
