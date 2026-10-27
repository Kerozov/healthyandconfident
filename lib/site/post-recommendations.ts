/** Portable settings stored inside a fenced `site-content` block in Markdown. */
export const POST_CATALOG_KINDS = ["product", "guide", "program", "event", "video", "post", "form"] as const;
export type PostCatalogKind = (typeof POST_CATALOG_KINDS)[number];
export const POST_CATALOG_LABELS: Record<PostCatalogKind, string> = {
  product: "Продукти", guide: "Ръководства", program: "Програми",
  event: "Предстоящи събития", video: "Видеа", post: "Статии", form: "Форми",
};
export type PostCatalogItem = {
  key: string;
  kind: PostCatalogKind;
  title: string;
  description: string;
  image: string;
  href: string;
  price: string;
  date?: string;
  /** Programme buttons retain their configured checkout and extra offers. */
  placementKey?: string;
};
export type PostRecommendations = {
  title: string;
  layout: "grid" | "carousel" | "list";
  columns: 1 | 2 | 3;
  count: number;
  mode: "manual" | "random" | "mixed";
  kinds: PostCatalogKind[];
  /** Ordered manual items, or the pinned items at the start of a mixed block. */
  selected: string[];
  pool: "all" | "selected";
  poolItems: string[];
  showDescription: boolean;
  showPrice: boolean;
  autoplay: boolean;
  interval: number;
};

export function defaultPostRecommendations(): PostRecommendations {
  return {
    title: "", layout: "grid", columns: 2, count: 3, mode: "random",
    kinds: [...POST_CATALOG_KINDS], selected: [], pool: "all", poolItems: [],
    showDescription: true, showPrice: true, autoplay: false, interval: 5,
  };
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length <= 200))]
    : [];
}

/** Fail closed on malformed data; bound numeric settings from the Markdown tab. */
export function parsePostRecommendations(json: string): PostRecommendations | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const v = raw as Record<string, unknown>;
    const defaults = defaultPostRecommendations();
    const number = (value: unknown, fallback: number, min: number, max: number) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
    return {
      title: typeof v.title === "string" ? v.title.slice(0, 300) : "",
      layout: v.layout === "carousel" || v.layout === "list" ? v.layout : "grid",
      columns: number(v.columns, defaults.columns, 1, 3) as 1 | 2 | 3,
      count: number(v.count, defaults.count, 1, 50),
      mode: v.mode === "manual" || v.mode === "mixed" ? v.mode : "random",
      kinds: Array.isArray(v.kinds)
        ? POST_CATALOG_KINDS.filter((kind) => v.kinds instanceof Array && v.kinds.includes(kind))
        : defaults.kinds,
      selected: strings(v.selected),
      pool: v.pool === "selected" ? "selected" : "all",
      poolItems: strings(v.poolItems),
      showDescription: v.showDescription !== false,
      showPrice: v.showPrice !== false,
      autoplay: v.autoplay === true,
      interval: number(v.interval, defaults.interval, 3, 30),
    };
  } catch {
    return null;
  }
}

export function recommendationsMarkdown(config: PostRecommendations): string {
  // Escape backticks so a title cannot close its own Markdown fence.
  return `\`\`\`site-content\n${JSON.stringify(config).replace(/`/g, "\\u0060")}\n\`\`\``;
}

export function recommendationsFromChunk(chunk: string): PostRecommendations | null {
  const match = /^```site-content\s*\n([\s\S]*?)\n```$/.exec(chunk.trim());
  return match ? parsePostRecommendations(match[1]) : null;
}

export function seededPostRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** No duplicates, no invented replacements for unavailable manually selected items. */
export function selectPostRecommendations(
  config: PostRecommendations,
  catalog: PostCatalogItem[],
  random: () => number = Math.random,
): PostCatalogItem[] {
  const byKey = new Map(catalog.map((item) => [item.key, item]));
  const fixed = [...new Set(config.selected)].flatMap((key) => {
    const item = byKey.get(key);
    return item ? [item] : [];
  });
  if (config.mode === "manual") return fixed.slice(0, config.count);
  const pinned = config.mode === "mixed" ? fixed.slice(0, config.count) : [];
  const used = new Set(pinned.map((item) => item.key));
  const pool = new Set(config.poolItems);
  const candidates = [...byKey.values()].filter((item) =>
    config.kinds.includes(item.kind) && !used.has(item.key) &&
    (config.pool === "all" || pool.has(item.key)),
  );
  // Fisher–Yates: every eligible item has the same chance of being picked.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return [...pinned, ...candidates.slice(0, config.count - pinned.length)];
}
