import { slugify } from "@/lib/utils";

/**
 * The one place a form slug is shaped. The admin types free text (often
 * Cyrillic); the public URL only ever carries what this returns, so the link
 * shown in the panel and the row saved in the database cannot drift apart.
 */
export function formSlug(desired: string, fallback = ""): string {
  return slugify((desired || "").trim()) || slugify(fallback.trim());
}
