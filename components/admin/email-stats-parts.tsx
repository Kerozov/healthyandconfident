"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/money";

/** Small bar + percent for a rate inside a table row. */
export function RateBar({
  value,
  tone = "forest",
  className,
}: {
  value: number;
  tone?: "forest" | "coral" | "sky";
  className?: string;
}) {
  const color =
    tone === "coral" ? "bg-coral-600" : tone === "sky" ? "bg-sky-600" : "bg-forest-600";
  return (
    <div className={cn("flex min-w-[6.5rem] items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest-50">
        <div
          className={cn("animate-grow-x h-full rounded-full", color)}
          style={{ width: `${Math.min(100, Math.max(value > 0 ? 3 : 0, value))}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-semibold text-ink [font-variant-numeric:tabular-nums]">
        {formatPercent(value)}
      </span>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink/10 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/70 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/25"
      />
    </label>
  );
}

export function FilterChips<T extends string>({
  options,
  active,
  onChange,
  label,
}: {
  options: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.id === active;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
              selected
                ? "border-forest-600 bg-forest-600 text-cream"
                : "border-ink/10 bg-white text-ink-soft hover:border-forest-300 hover:text-ink",
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] [font-variant-numeric:tabular-nums]",
                  selected ? "bg-white/20" : "bg-ink/5",
                )}
              >
                {option.count.toLocaleString("bg-BG")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** "Купили" pill — always worded as a timing match, never as caused by. */
export function BuyersPill({ count }: { count: number | null }) {
  if (count === null) return <span className="text-xs text-ink-soft">—</span>;
  if (count === 0) return <span className="text-xs text-ink-soft">0</span>;
  return (
    <span
      className="inline-flex items-center rounded-full bg-coral-500/15 px-2 py-0.5 text-xs font-semibold text-coral-700"
      title="Платили до 7 дни след имейла — съвпадение по време, не доказателство"
    >
      {count.toLocaleString("bg-BG")} купили
    </span>
  );
}
