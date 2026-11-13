import {
  fetchFunnelBrandEmailAllowance,
  FunnelBrandError,
  getFunnelBrandConfig,
  type FunnelBrandEmailAllowance,
} from "@/lib/integrations/funnel-brand";

/**
 * Лентата за имейлите от Launchify — същата като над „Имейли“ там, с числата
 * оттам при всяко отваряне. Купуването е в Launchify: бутонът води точно до
 * картата с покупката, а не до началната страница.
 *
 * Без ключ за Launchify, или акаунт без лимит — нищо не се рисува. Ред „без
 * лимит“ е ред, който не води никъде.
 */
export async function LaunchifyEmailAllowance({
  className = "",
}: {
  className?: string;
}) {
  const config = getFunnelBrandConfig();
  if (!config) return null;

  let view: FunnelBrandEmailAllowance;
  try {
    view = await fetchFunnelBrandEmailAllowance(config);
  } catch (err) {
    // 404: Launchify още не е пуснал адреса — нищо за казване на собственика.
    if (err instanceof FunnelBrandError && err.status === 404) return null;
    return (
      <p
        className={`rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs text-ink-soft ${className}`}
      >
        Имейлите в Launchify: не успях да прочета остатъка (
        {err instanceof Error ? err.message : "грешка"}). Опитай пак след малко.
      </p>
    );
  }

  if (!view.limited) return null;
  const buyUrl = safeUrl(view.buyUrl);

  if (!view.ok) {
    return (
      <p
        className={`rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs text-ink-soft ${className}`}
      >
        Имейлите в Launchify: {view.error}
      </p>
    );
  }

  const usedShare =
    view.included > 0 ? Math.min(1, view.spent / view.included) : 0;
  const tone = view.empty
    ? "border-red-300 bg-red-50"
    : view.low
      ? "border-amber-300 bg-amber-50"
      : "border-ink/10 bg-white";
  const bar = view.empty
    ? "bg-red-500"
    : view.low
      ? "bg-amber-500"
      : "bg-coral-500";
  const urgent = view.empty || view.low;

  return (
    <section
      className={`space-y-3 rounded-2xl border px-5 py-4 ${tone} ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-ink">
          <span className="text-ink-soft">Launchify · </span>
          {view.headline}
        </p>
        <p className="text-xs text-ink-soft">{view.detail}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.round(usedShare * 100)}%` }}
        />
      </div>
      {view.extraLeft > 0 ? (
        <p className="text-xs text-ink-soft">
          От тях {view.extraLeft.toLocaleString("bg-BG")} са добавени от теб и
          не изтичат.
        </p>
      ) : null}
      {buyUrl ? (
        urgent ? (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600"
          >
            Купи имейли в Launchify · {view.topupLabel} →
          </a>
        ) : (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral-600 underline underline-offset-2 hover:text-coral-500"
          >
            Трябват ти още? {view.topupLabel} в Launchify →
          </a>
        )
      ) : null}
    </section>
  );
}

/** Само https адрес — линкът идва отвън и стои в `href`. */
function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
