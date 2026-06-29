export const VISITOR_TAGS_KEY = "hc_visitor_tags";

export function readVisitorTags(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VISITOR_TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
  } catch {
    return [];
  }
}

export function mergeVisitorTags(incoming: string[]): void {
  if (typeof window === "undefined") return;
  const next = Array.from(
    new Set([...readVisitorTags(), ...incoming.filter((t) => t && t !== "all")]),
  );
  localStorage.setItem(VISITOR_TAGS_KEY, JSON.stringify(next));
}
