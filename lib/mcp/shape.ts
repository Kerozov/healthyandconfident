/**
 * Режe големите отговори, преди да влязат в разговора: търсене, избрани полета
 * и страници. Без IO, за да се тества.
 */

export type ShapeOptions = {
  /** Точков път до списъка в отговора, напр. `report.rows`. Без него: самият отговор или най-дългият списък в него. */
  path?: string;
  /** Подниз, без значение главни/малки букви, търсен в целия запис. */
  search?: string;
  /** Само тези полета от всеки запис. */
  fields?: string[];
  offset?: number;
  limit?: number;
};

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 1000;
export const MAX_TEXT = 150_000;

/** JSON-безопасно копие: Map → обект, Set → масив, BigInt → низ, Date → ISO. */
export function toJsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v instanceof Map) return Object.fromEntries(v);
      if (v instanceof Set) return [...v];
      if (typeof v === "bigint") return v.toString();
      return v;
    }) ?? "null",
  );
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && Object.hasOwn(current, key)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

function setPath(value: Record<string, unknown>, path: string, next: unknown): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = value;
  for (const key of keys.slice(0, -1)) current = current[key] as Record<string, unknown>;
  current[keys[keys.length - 1]] = next;
}

/** Пътят до най-дългия списък на първите две нива. */
function largestArrayPath(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  let best: { path: string; length: number } | null = null;
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) && (!best || child.length > best.length)) best = { path: key, length: child.length };
    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const [inner, grand] of Object.entries(child)) {
        if (Array.isArray(grand) && (!best || grand.length > best.length)) {
          best = { path: `${key}.${inner}`, length: grand.length };
        }
      }
    }
  }
  return best && best.length > 0 ? best.path : null;
}

function pick(item: unknown, fields: string[]): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  return Object.fromEntries(fields.filter((f) => Object.hasOwn(item, f)).map((f) => [f, (item as Record<string, unknown>)[f]]));
}

export type Shaped = { value: unknown; page?: { path: string; total: number; matched: number; offset: number; returned: number } };

export function shapeResult(raw: unknown, options: ShapeOptions = {}): Shaped {
  const value = toJsonSafe(raw);
  const path = options.path ?? (Array.isArray(value) ? "" : largestArrayPath(value));
  if (path === null) return { value };
  const list = path === "" ? value : getPath(value, path);
  if (!Array.isArray(list)) return { value };

  const needle = options.search?.trim().toLowerCase();
  const matched = needle ? list.filter((item) => JSON.stringify(item).toLowerCase().includes(needle)) : list;
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT)));
  const fields = options.fields?.filter((f) => typeof f === "string" && f) ?? [];
  const items = matched.slice(offset, offset + limit).map((item) => (fields.length ? pick(item, fields) : item));
  const page = { path: path || "(root)", total: list.length, matched: matched.length, offset, returned: items.length };

  if (path === "") return { value: items, page };
  setPath(value as Record<string, unknown>, path, items);
  return { value, page };
}

/** Текстът за Claude, с бележка, ако е отрязан. */
export function renderText(shaped: Shaped): string {
  const body = shaped.page ? { result: shaped.value, page: shaped.page } : { result: shaped.value };
  const text = JSON.stringify(body);
  if (text.length <= MAX_TEXT) return text;
  return `${text.slice(0, MAX_TEXT)}\n…[отрязано: ${text.length} знака. Ползвай search, fields, offset и limit.]`;
}
