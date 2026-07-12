export type PersonEmailStatus =
  | "sent"
  | "scheduled"
  | "failed"
  | "skipped"
  | "canceled"
  | "pending";

export type PersonEmailItem = {
  kind: "automation" | "campaign" | "reminder";
  title: string;
  status: PersonEmailStatus;
  at: string;
  opened: boolean;
  openedAt: string | null;
  clicks: number;
  error: string | null;
  workerJobId: string | null;
};

export const PERSON_EMAIL_STATUS_LABELS: Record<PersonEmailStatus, string> = {
  sent: "Изпратен",
  scheduled: "Планиран",
  failed: "Неуспешен",
  skipped: "Пропуснат",
  canceled: "Отменен",
  pending: "Чака",
};

export const PERSON_EMAIL_KIND_LABELS: Record<PersonEmailItem["kind"], string> = {
  automation: "Автоматизация",
  campaign: "Кампания",
  reminder: "Напомняне",
};
