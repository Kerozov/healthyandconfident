import type { Locale } from "@/i18n/config";

export function Marquee({ locale }: { locale: Locale }) {
  const words =
    locale === "bg"
      ? [
          "Инсулинова резистентност",
          "Трайно отслабване",
          "Диабет тип 2",
          "Балансирана кръвна захар",
          "Повече енергия",
          "Увереност",
          "Без диети",
          "Холистичен подход",
        ]
      : [
          "Insulin resistance",
          "Lasting weight loss",
          "Type 2 Diabetes",
          "Balanced blood sugar",
          "More energy",
          "Confidence",
          "No more diets",
          "Holistic approach",
        ];
  const row = [...words, ...words];
  return (
    <div className="border-y border-sage-100 bg-sage-600 py-4 text-white">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {row.map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-10 font-display text-lg font-medium tracking-tight"
          >
            {w}
            <span className="text-rose-300">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
