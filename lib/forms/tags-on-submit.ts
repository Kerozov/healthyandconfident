import type { FormSettings } from "@/lib/forms/types";

/** Fixed tags from form settings (supports legacy `tag_on_submit`). */
export function resolveTagsOnSubmit(settings: FormSettings | null | undefined): string[] {
  if (!settings) return [];
  const fromList = (settings.tags_on_submit ?? [])
    .map((t) => t.trim())
    .filter(Boolean);
  if (fromList.length > 0) return Array.from(new Set(fromList));
  const legacy = settings.tag_on_submit?.trim();
  return legacy ? [legacy] : [];
}
