export function formatAdminWhen(iso: string | null | undefined): string {
  if (!iso) return "няма активност";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "няма активност";

  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "току-що";
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(diff / 60_000));
    return `преди ${minutes} мин`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(diff / 3_600_000));
    return `преди ${hours} ч`;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
