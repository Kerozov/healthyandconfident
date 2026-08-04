"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/money";

/**
 * Chart palette.
 *
 * `series` is the categorical trio for multi-series charts, validated on the
 * admin's white surface (all-pairs: CVD ΔE 8.0, normal-vision ΔE 24.0, chroma and
 * lightness bands clear). Aqua sits at 2.82:1 contrast, just under the 3:1 mark —
 * the relief is the legend, the direct end-labels and the table view that every
 * multi-series chart below ships with.
 *
 * `single` is the brand olive, used for every one-series chart; magnitude is the
 * bar's length, so a second hue would encode nothing.
 */
export const CHART = {
  series: ["#2a78d6", "#e2603a", "#1baf7a"],
  single: "#6a7153",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  surface: "#ffffff",
} as const;

/**
 * Charts are drawn in real pixels, so they need the container's width.
 *
 * A callback ref (rather than an effect) so the measurement re-runs every time
 * the node attaches — the table toggle unmounts and remounts the chart, and a
 * stale width would silently squash the plot into part of the card. Measured
 * immediately, again on the next frame, and then kept in sync by a
 * ResizeObserver plus a window listener for environments where the observer
 * never fires.
 */
function useElementWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [width, setWidth] = React.useState(640);
  const teardown = React.useRef<(() => void) | null>(null);

  const ref = React.useCallback((node: T | null) => {
    teardown.current?.();
    teardown.current = null;
    if (!node) return;

    const measure = () => {
      const next = node.getBoundingClientRect().width;
      if (next > 0) {
        setWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
      }
    };

    measure();
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);

    teardown.current = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return [ref, width];
}

/** Round the axis maximum up to a clean number so ticks read 0 / 500 / 1 000. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function ticksFor(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

// ── Stat tile ───────────────────────────────────────────────

export function StatTile({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  higherIsBetter = true,
  spark,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** Percent change vs the previous window. `null` hides the delta. */
  delta?: number | null;
  deltaLabel?: string;
  higherIsBetter?: boolean;
  spark?: number[];
  className?: string;
}) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const good = showDelta && (delta! >= 0) === higherIsBetter;

  return (
    <div
      className={cn(
        "rounded-2xl border border-ink/10 bg-white p-5",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {showDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              delta === 0
                ? "bg-ink/5 text-ink-soft"
                : good
                  ? "bg-forest-500/12 text-forest-700"
                  : "bg-coral-500/12 text-coral-700",
            )}
          >
            <span aria-hidden>{delta! > 0 ? "↑" : delta! < 0 ? "↓" : "→"}</span>
            {Math.abs(delta!).toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%
            <span className="sr-only">
              {good ? "нагоре спрямо" : "надолу спрямо"} предходния период
            </span>
          </span>
        )}
        {(sub || deltaLabel) && (
          <span className="text-xs text-ink-soft">{sub ?? deltaLabel}</span>
        )}
      </div>

      {spark && spark.length > 1 && (
        <Sparkline values={spark} className="mt-3" />
      )}
    </div>
  );
}

export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const width = 160;
  const height = 32;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 3) - 1.5}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-8 w-full", className)}
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={CHART.single}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Time series ─────────────────────────────────────────────

export type Series = {
  key: string;
  label: string;
  values: number[];
};

export function TimeSeriesChart({
  labels,
  series,
  height = 260,
  formatValue = (v: number) => formatNumber(v),
  emptyText = "Няма данни за периода.",
  singleHue = false,
}: {
  /** X labels, one per data point (already formatted for display). */
  labels: string[];
  series: Series[];
  height?: number;
  formatValue?: (value: number) => string;
  emptyText?: string;
  /** One-series charts use the brand hue instead of the categorical slots. */
  singleHue?: boolean;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);

  const colors = singleHue
    ? [CHART.single]
    : series.map((_, i) => CHART.series[i % CHART.series.length]);

  const hasData = series.some((s) => s.values.some((v) => v > 0));
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0));

  // Size the y gutter to the widest tick so currency labels are never clipped.
  const tickLabels = ticksFor(max).map(formatValue);
  const gutter = Math.min(
    120,
    Math.max(40, Math.max(...tickLabels.map((t) => t.length)) * 6.6 + 14),
  );

  const pad = { top: 14, right: 16, bottom: 26, left: gutter };
  const innerW = Math.max(40, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const count = labels.length;
  const stepX = count > 1 ? innerW / (count - 1) : 0;

  const x = (i: number) => pad.left + i * stepX;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  // Keep x labels at least 48px apart; the last point always gets one, and the
  // label before it is dropped rather than allowed to touch.
  const MIN_LABEL_GAP = 48;
  const labelIndices: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const previous = labelIndices[labelIndices.length - 1];
    if (previous === undefined || x(i) - x(previous) >= MIN_LABEL_GAP) {
      labelIndices.push(i);
    }
  }
  while (
    labelIndices.length > 0 &&
    x(count - 1) - x(labelIndices[labelIndices.length - 1]) < MIN_LABEL_GAP
  ) {
    labelIndices.pop();
  }
  if (count > 0) labelIndices.push(count - 1);
  const labelSet = new Set(labelIndices);

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    if (count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - rect.left - pad.left;
    const index = stepX > 0 ? Math.round(relative / stepX) : 0;
    setActive(Math.min(count - 1, Math.max(0, index)));
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    setActive((prev) => {
      const base = prev ?? 0;
      const next = event.key === "ArrowRight" ? base + 1 : base - 1;
      return Math.min(count - 1, Math.max(0, next));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {series.length > 1 && (
          <ul className="flex flex-wrap items-center gap-4">
            {series.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2 text-xs text-ink-soft">
                <span
                  className="h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: colors[i] }}
                  aria-hidden
                />
                {s.label}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto rounded-lg px-2.5 py-1 text-xs font-medium text-ink-soft underline-offset-2 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
          aria-pressed={showTable}
        >
          {showTable ? "Графика" : "Таблица"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-[320px] overflow-auto rounded-xl border border-ink/10">
          <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                <th className="px-3 py-2 font-semibold">Дата</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 font-semibold">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, i) => (
                <tr key={label + i} className="border-b border-ink/5 last:border-0">
                  <td className="px-3 py-1.5 text-ink-soft">{label}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5">
                      {formatValue(s.values[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative w-full">
          {!hasData && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-soft">
              {emptyText}
            </p>
          )}
          <svg
            width="100%"
            height={height}
            role="img"
            aria-label={`Графика: ${series.map((s) => s.label).join(", ")}`}
            tabIndex={0}
            onPointerMove={handleMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={handleKey}
            onBlur={() => setActive(null)}
            className="touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
          >
            {ticksFor(max).map((tick) => (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={pad.left + innerW}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? CHART.axis : CHART.grid}
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 8}
                  y={y(tick) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill={CHART.muted}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatValue(tick)}
                </text>
              </g>
            ))}

            {labels.map((label, i) =>
              labelSet.has(i) ? (
                <text
                  key={label + i}
                  x={x(i)}
                  y={height - 8}
                  textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
                  fontSize={11}
                  fill={CHART.muted}
                >
                  {label}
                </text>
              ) : null,
            )}

            {series.map((s, si) => {
              const path = s.values
                .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
                .join(" ");
              return (
                <g key={s.key}>
                  {series.length === 1 && (
                    <path
                      d={`${path} L${x(count - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                      fill={colors[si]}
                      opacity={0.1}
                    />
                  )}
                  <path
                    d={path}
                    fill="none"
                    stroke={colors[si]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {count > 0 && (
                    <circle
                      cx={x(count - 1)}
                      cy={y(s.values[count - 1] ?? 0)}
                      r={4}
                      fill={colors[si]}
                      stroke={CHART.surface}
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}

            {active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={pad.top}
                  y2={pad.top + innerH}
                  stroke={CHART.axis}
                  strokeWidth={1}
                />
                {series.map((s, si) => (
                  <circle
                    key={s.key}
                    cx={x(active)}
                    cy={y(s.values[active] ?? 0)}
                    r={4}
                    fill={colors[si]}
                    stroke={CHART.surface}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>

          {active !== null && hasData && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[9rem] rounded-xl border border-ink/10 bg-white p-3 shadow-lg"
              style={{
                left: Math.min(Math.max(x(active) - 70, 0), Math.max(0, width - 160)),
              }}
              role="status"
            >
              <p className="text-xs font-medium text-ink-soft">{labels[active]}</p>
              <ul className="mt-1.5 space-y-1">
                {series.map((s, si) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: colors[si] }}
                      aria-hidden
                    />
                    <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                      {formatValue(s.values[active] ?? 0)}
                    </span>
                    <span className="text-xs text-ink-soft">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Columns (single series) ─────────────────────────────────

export function ColumnChart({
  data,
  height = 180,
  formatValue = (v: number) => formatNumber(v),
  emptyText = "Няма данни.",
}: {
  data: { label: string; value: number; title?: string }[];
  height?: number;
  formatValue?: (value: number) => string;
  emptyText?: string;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const pad = { top: 10, right: 8, bottom: 22, left: 8 };
  const innerW = Math.max(40, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const slot = data.length > 0 ? innerW / data.length : innerW;
  // Cap the bar and let the leftover slot be air, per the mark spec.
  const barW = Math.min(24, Math.max(3, slot - 4));

  if (data.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyText}</p>;
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg width="100%" height={height} role="img" aria-label="Разпределение">
        <line
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + innerH}
          y2={pad.top + innerH}
          stroke={CHART.axis}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barH = max > 0 ? (d.value / max) * innerH : 0;
          const cx = pad.left + slot * i + slot / 2;
          return (
            <g
              key={d.label + i}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            >
              {/* Hit target is the whole slot, not just the painted bar. */}
              <rect
                x={cx - slot / 2}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
              />
              <rect
                x={cx - barW / 2}
                y={pad.top + innerH - barH}
                width={barW}
                height={Math.max(barH, d.value > 0 ? 2 : 0)}
                rx={Math.min(4, barW / 2)}
                fill={CHART.single}
                opacity={active === null || active === i ? 1 : 0.55}
              />
              {i % Math.max(1, Math.ceil(data.length / 12)) === 0 && (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={CHART.muted}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: Math.min(
              Math.max(pad.left + slot * active + slot / 2 - 50, 0),
              Math.max(0, width - 110),
            ),
          }}
          role="status"
        >
          <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {formatValue(data[active].value)}
          </span>{" "}
          <span className="text-ink-soft">{data[active].title ?? data[active].label}</span>
        </div>
      )}
    </div>
  );
}

// ── Horizontal bars (ranked, single series) ─────────────────

export function RankedBars({
  data,
  formatValue = (v: number) => formatNumber(v),
  emptyText = "Няма данни.",
  max: maxOverride,
}: {
  data: { id: string; label: string; value: number; note?: string }[];
  formatValue?: (value: number) => string;
  emptyText?: string;
  max?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyText}</p>;
  }
  const max = maxOverride ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
              {formatValue(row.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-forest-50">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (row.value / max) * 100)}%`,
                backgroundColor: CHART.single,
              }}
            />
          </div>
          {row.note && <p className="mt-1 text-xs text-ink-soft">{row.note}</p>}
        </li>
      ))}
    </ul>
  );
}

// ── Funnel / meter ──────────────────────────────────────────

export function Meter({
  label,
  value,
  total,
  valueLabel,
}: {
  label: string;
  value: number;
  total: number;
  valueLabel?: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">{label}</span>
        <span className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
          {valueLabel ?? formatNumber(value)}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-forest-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: CHART.single }}
        />
      </div>
    </div>
  );
}
