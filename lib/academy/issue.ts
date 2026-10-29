import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { academyProductParam } from "@/lib/academy/product";

/**
 * Course access codes from the academy (academy-platform, „Продажби“).
 *
 * After a paid checkout every line whose product or guide names an academy
 * product (`academy_product`, copied onto the purchase line when it is
 * recorded) gets one single-use code. The academy is idempotent on our
 * reference (`hc:<session>:<stripe product>`), so a retried webhook, a
 * catch-up run or a later email step always gets the same code, never a
 * second one.
 */

export type AcademyConfig = { url: string; key: string };

export function academyConfig(): AcademyConfig | null {
  const url = (process.env.ACADEMY_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.ACADEMY_SALE_KEY || "").trim();
  return url && key ? { url, key } : null;
}

export type AccessCodeResult =
  | { ok: true; code: string }
  | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  invalid_key: "Ключът за академията (ACADEMY_SALE_KEY) е грешен или отменен.",
  space_archived: "Пространството в академията е архивирано.",
  product_required: "В академията има няколко продукта или школи — посочи кой в полето „Продукт в академията“.",
  unknown_product: "Няма такъв активен продукт или школа в академията — провери полето „Продукт в академията“.",
  product_without_courses: "Продуктът в академията няма избрани курсове.",
};

/** Ask the academy for one code. Retries once on a network error or 5xx, never on 4xx. */
export async function requestAccessCode(
  config: AcademyConfig,
  input: { product?: string | null; email: string; name?: string | null; reference: string },
): Promise<AccessCodeResult> {
  const body = JSON.stringify({
    product: input.product?.trim() || undefined,
    email: input.email,
    name: input.name?.trim() || undefined,
    reference: input.reference,
  });
  let last = "Академията не отговори.";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${config.url}/api/v1/access-codes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => null)) as
        | { code?: string; error?: string; message?: string }
        | null;
      if (res.ok && data?.code) return { ok: true, code: data.code };
      const reason = data?.error ? (ERRORS[data.error] ?? data.message ?? data.error) : `HTTP ${res.status}`;
      if (res.status < 500) return { ok: false, message: reason };
      last = reason;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, message: last };
}

type PurchaseLine = {
  id: string;
  email: string;
  stripe_session_id: string;
  stripe_product_id: string;
  product_id: string | null;
  academy_product: string | null;
  academy_code: string | null;
  purchased_at: string | null;
};

async function issueForLine(
  config: AcademyConfig,
  line: PurchaseLine,
  product: string,
  name: string | null | undefined,
): Promise<AccessCodeResult> {
  const res = await requestAccessCode(config, {
    product: academyProductParam(product),
    email: line.email,
    name,
    reference: `hc:${line.stripe_session_id}:${line.stripe_product_id}`,
  });
  if (res.ok) {
    const { error } = await getAdminClient()
      .from("subscriber_purchases")
      .update({ academy_code: res.code })
      .eq("id", line.id);
    if (error) console.error("[academy] code not saved on purchase:", error.message);
  }
  return res;
}

const LINE_COLUMNS =
  "id, email, stripe_session_id, stripe_product_id, product_id, academy_product, academy_code, purchased_at";

/** Issue codes for every academy line of one paid checkout. Never throws. */
export async function issueCourseCodesForSession(
  stripeSessionId: string,
  name?: string | null,
): Promise<void> {
  const config = academyConfig();
  if (!config) return;
  try {
    const { data } = await getAdminClient()
      .from("subscriber_purchases")
      .select(LINE_COLUMNS)
      .eq("stripe_session_id", stripeSessionId)
      .eq("payment_status", "paid");
    const lines = (data ?? []) as PurchaseLine[];
    for (const line of lines) {
      const product = line.academy_product?.trim();
      if (line.academy_code || !product) continue;
      const res = await issueForLine(config, line, product, name);
      if (!res.ok) console.error(`[academy] no code for ${line.email}: ${res.message}`);
    }
  } catch (err) {
    console.error("[academy] issuing codes failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * The code for `{{course_code}}` in an email to this person: the newest paid
 * purchase that unlocks an academy product, preferring the products that
 * started this run. A line without a code yet gets one now. Throws with the
 * reason when there is no code — the email must not go out with a hole where
 * the code should be.
 */
export async function courseCodeForRecipient(input: {
  email: string;
  name?: string | null;
  purchasedProductIds?: string[];
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await getAdminClient()
    .from("subscriber_purchases")
    .select(LINE_COLUMNS)
    .eq("email", email)
    .eq("payment_status", "paid")
    .order("purchased_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Кодът за курса не можа да се прочете: ${error.message}`);
  const lines = (data ?? []) as PurchaseLine[];
  const prefer = new Set(input.purchasedProductIds ?? []);
  const academyLines = lines
    .filter((l) => l.academy_code || l.academy_product?.trim())
    .sort(
      (a, b) =>
        Number(prefer.has(b.product_id ?? "")) - Number(prefer.has(a.product_id ?? "")),
    );
  const line = academyLines[0];
  if (!line) {
    throw new Error("Няма платена покупка с курс от академията за този човек — кодът за курса няма откъде да дойде.");
  }
  if (line.academy_code) return line.academy_code;

  const config = academyConfig();
  if (!config) {
    throw new Error("Академията не е свързана (липсват ACADEMY_URL и ACADEMY_SALE_KEY).");
  }
  const res = await issueForLine(config, line, line.academy_product!.trim(), input.name);
  if (!res.ok) throw new Error(`Кодът за курса не се издаде: ${res.message}`);
  return res.code;
}
