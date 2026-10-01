import { labelHasAmount, splitPriceLabel } from "@/lib/site/price-format";
import { cn } from "@/lib/utils";

/**
 * A price label from the admin, shown the way a buyer reads it: the amount
 * large, the old price („вместо 152 €“) struck through beside it. A label with
 * no amount („групова програма“) is plain text — there is nothing to anchor.
 */
export function PriceTag({
  label,
  wasLabel,
  size = "md",
  className,
}: {
  label: string;
  /** „вместо“ — read out by screen readers before the struck-through price. */
  wasLabel: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = label.trim();
  if (!text) return null;

  if (!labelHasAmount(text)) {
    return (
      <p className={cn("text-sm font-semibold text-forest-700 first-letter:uppercase", className)}>
        {text}
      </p>
    );
  }

  const { now, was } = splitPriceLabel(text);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-display font-semibold tabular-nums leading-none text-slate-800",
          size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        {now}
      </span>
      {was && (
        <span className="text-sm text-ink-soft">
          <span className="sr-only">{wasLabel} </span>
          <s className="decoration-coral-500/70">{was}</s>
        </span>
      )}
    </p>
  );
}
