import "server-only";

/**
 * Read-only client for FunnelBrand's contact export.
 *
 * FunnelBrand hosts the funnels; this site only knows an API key and pulls the
 * contacts that belong to it. The key lives in the server environment and every
 * request is made from the server, so it never reaches a browser.
 */

export type FunnelBrandContact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  phone: string | null;
  kind: string;
  ticket: "free" | "vip";
  message: string | null;
  formAnswers: Record<string, string>;
  /** Segment derived from the funnel name — where the contact came from. */
  segment: string;
  segmentName: string;
  /** Second tag — the software that collected the contact. */
  source: string;
  tags: string[];
  unsubscribed: boolean;
  createdAt: string;
};

export type FunnelBrandFunnel = {
  id: string;
  name: string;
  slug: string;
  segment: string;
};

export type FunnelBrandPage = {
  contacts: FunnelBrandContact[];
  funnels: FunnelBrandFunnel[];
  count: number;
  total: number;
  hasMore: boolean;
  nextSince: string | null;
};

export type FunnelBrandPing = {
  ok: true;
  key: {
    name: string;
    prefix: string;
    source: string;
    scope: "funnel" | "account";
  };
  funnels: (FunnelBrandFunnel & { contacts: number })[];
  totalContacts: number;
};

export type FunnelBrandConfig = {
  baseUrl: string;
  apiKey: string;
};

const DEFAULT_BASE_URL = "https://www.funnel-brand.com";

export function getFunnelBrandConfig(): FunnelBrandConfig | null {
  const apiKey = process.env.FUNNEL_BRAND_API_KEY?.trim();
  if (!apiKey) return null;

  const raw = process.env.FUNNEL_BRAND_API_URL?.trim() || DEFAULT_BASE_URL;
  const baseUrl = raw.replace(/\/+$/, "");

  return { baseUrl, apiKey };
}

export function isFunnelBrandConfigured(): boolean {
  return getFunnelBrandConfig() !== null;
}

class FunnelBrandError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FunnelBrandError";
  }
}

async function request<T>(
  config: FunnelBrandConfig,
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 30_000,
  body?: unknown,
): Promise<T> {
  const url = new URL(`${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Contacts must never come from a cache — a stale page would silently
      // drop everything collected since it was stored.
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new FunnelBrandError(
      err instanceof Error && err.name === "TimeoutError"
        ? "FunnelBrand не отговори навреме."
        : "Няма връзка с FunnelBrand.",
    );
  }

  if (response.status === 401) {
    throw new FunnelBrandError("Ключът е невалиден или отменен.", 401);
  }
  if (response.status === 429) {
    throw new FunnelBrandError(
      "Твърде много заявки към FunnelBrand. Опитай пак след минута.",
      429,
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new FunnelBrandError(
      body?.error || `FunnelBrand върна грешка (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Connection test — confirms the key works and lists the funnels behind it. */
export async function pingFunnelBrand(
  config: FunnelBrandConfig,
): Promise<FunnelBrandPing> {
  return request<FunnelBrandPing>(config, "/api/export/ping");
}

export async function fetchFunnelBrandPage(
  config: FunnelBrandConfig,
  options: { since?: string | null; limit?: number; offset?: number } = {},
): Promise<FunnelBrandPage> {
  return request<FunnelBrandPage>(config, "/api/export/contacts", {
    since: options.since ?? "",
    limit: String(options.limit ?? 200),
    offset: String(options.offset ?? 0),
  });
}

export { FunnelBrandError };

/**
 * How many emails the Launchify account has left — the same bar Launchify shows
 * above „Имейли“. Numbers and sentences arrive ready-made so the two never drift.
 */
export type FunnelBrandEmailAllowance =
  | { ok: true; limited: false; buyUrl: string }
  | {
      ok: true;
      limited: true;
      plan: "start" | "pro";
      included: number;
      renews: boolean;
      spent: number;
      includedLeft: number;
      extraLeft: number;
      remaining: number;
      renewsOn: string | null;
      low: boolean;
      empty: boolean;
      topupLabel: string;
      headline: string;
      detail: string;
      /** The Launchify page where emails are bought. */
      buyUrl: string;
    }
  | {
      ok: false;
      limited: true;
      plan: "start" | "pro";
      error: string;
      buyUrl: string;
    };

export async function fetchFunnelBrandEmailAllowance(
  config: FunnelBrandConfig,
): Promise<FunnelBrandEmailAllowance> {
  // Read while an admin page opens — it must not hold the page for half a minute.
  return request<FunnelBrandEmailAllowance>(
    config,
    "/api/export/email-allowance",
    {},
    8_000,
  );
}

/** Изпратеното от сайта за един ден (Europe/Sofia). */
export type FunnelBrandEmailDay = { day: string; emails: number };

/**
 * Казва на Launchify колко имейла е пратил сайтът по дни — една заявка за всички
 * дни. Сумата за деня заменя предишната отсреща, така че повторът не брои двойно.
 */
export async function reportFunnelBrandEmailDays(
  config: FunnelBrandConfig,
  days: FunnelBrandEmailDay[],
): Promise<{ ok: boolean; counted: boolean }> {
  return request<{ ok: boolean; counted: boolean }>(
    config,
    "/api/export/email-usage",
    {},
    8_000,
    { days },
  );
}
