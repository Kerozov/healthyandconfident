"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Pause, Play, Shuffle } from "lucide-react";
import type { Locale } from "@/i18n/config";
import {
  seededPostRandom, selectPostRecommendations,
  type PostCatalogItem, type PostCatalogKind, type PostRecommendations,
} from "@/lib/site/post-recommendations";
import { usePostCatalog } from "@/components/site/use-post-catalog";
import { CardImage } from "@/components/site/card-image";
import { PriceTag } from "@/components/site/price-tag";
import { externalLinkProps } from "@/lib/site/external-link";
import { cn, formatDate } from "@/lib/utils";

const LABELS: Record<Locale, Record<PostCatalogKind, string>> = {
  bg: { product: "Продукт", guide: "Ръководство", program: "Програма", event: "Събитие", video: "Видео", post: "Статия", form: "Форма" },
  en: { product: "Product", guide: "Guide", program: "Programme", event: "Event", video: "Video", post: "Article", form: "Form" },
};

export function PostRecommendationsBlock({
  config, locale, catalog, excludePostId, preview = false,
}: {
  config: PostRecommendations;
  locale: Locale;
  catalog?: PostCatalogItem[];
  excludePostId?: string;
  preview?: boolean;
}) {
  const loaded = usePostCatalog(locale, catalog === undefined);
  const [previewSeed, setPreviewSeed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const headingId = useId();
  const trackId = useId();
  const items = selectPostRecommendations(config,
    (catalog ?? loaded.items).filter((item) => item.key !== `post:${excludePostId}`),
    seededPostRandom(previewSeed || loaded.seed),
  );
  const carousel = config.layout === "carousel";

  function scroll(direction: -1 | 1) {
    const node = track.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const next = direction === 1 && node.scrollLeft >= max - 4 ? 0
      : direction === -1 && node.scrollLeft <= 4 ? max
      : node.scrollLeft + direction * node.clientWidth;
    node.scrollTo({ left: next, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  useEffect(() => {
    if (!carousel || !config.autoplay || paused || hovering || focused || items.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const node = track.current;
      if (!node || document.hidden) return;
      const end = node.scrollLeft >= node.scrollWidth - node.clientWidth - 4;
      node.scrollTo({ left: end ? 0 : node.scrollLeft + node.clientWidth, behavior: "smooth" });
    }, config.interval * 1000);
    return () => window.clearInterval(timer);
  }, [carousel, config.autoplay, config.interval, paused, hovering, focused, items.length]);

  if (items.length === 0) {
    if (!preview) return null;
    return <p className="not-prose my-4 rounded-xl bg-cream-2 p-4 text-sm text-ink-soft">
      {loaded.loading ? "Зареждане…" : "Няма активни предложения за този избор. Провери видовете, избраните предложения и езика на статията."}
    </p>;
  }

  const title = config.title || (locale === "bg" ? "Може да ти е полезно" : "You may also like");
  return (
    <section className="not-prose clear-both my-10 min-w-0" aria-labelledby={headingId}
      aria-roledescription={carousel ? (locale === "bg" ? "Карусел" : "Carousel") : undefined}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="font-display text-2xl font-semibold leading-tight text-slate-800">{title}</h2>
        <div className="flex items-center gap-2">
          {preview && config.mode !== "manual" && <button type="button"
            onClick={() => setPreviewSeed(Math.floor(Math.random() * 4294967296))}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-xs font-medium">
            <Shuffle className="h-4 w-4" /> Разбъркай
          </button>}
          {carousel && items.length > 1 && <>
            {config.autoplay && <button type="button" onClick={() => setPaused((p) => !p)}
              aria-label={paused ? (locale === "bg" ? "Пусни въртенето" : "Start rotation") : (locale === "bg" ? "Спри въртенето" : "Pause rotation")}
              className="rounded-full border border-forest-100 bg-white p-2.5 text-forest-700">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>}
            {([-1, 1] as const).map((direction) => <button key={direction} type="button"
              aria-controls={trackId}
              aria-label={direction === -1 ? (locale === "bg" ? "Предишни предложения" : "Previous items") : (locale === "bg" ? "Следващи предложения" : "Next items")}
              onClick={() => scroll(direction)} className="rounded-full border border-forest-100 bg-white p-2.5 text-forest-700 hover:bg-forest-50">
              {direction === -1 ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>)}
          </>}
        </div>
      </div>
      <ul ref={track} id={trackId} tabIndex={carousel ? 0 : undefined}
        aria-label={carousel ? title : undefined}
        onKeyDown={carousel ? (event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault(); scroll(event.key === "ArrowRight" ? 1 : -1);
          }
        } : undefined}
        className={cn("m-0 min-w-0 list-none gap-4 p-0.5",
          carousel ? "flex snap-x snap-mandatory overflow-x-auto pb-4" : "grid",
          config.layout === "grid" && config.columns === 2 && "sm:grid-cols-2",
          config.layout === "grid" && config.columns === 3 && "sm:grid-cols-2 lg:grid-cols-3")}>
        {items.map((item) => <li key={item.key} className={cn("min-w-0",
          carousel && "w-[85%] shrink-0 snap-start",
          carousel && config.columns === 1 && "sm:w-full",
          carousel && config.columns === 2 && "sm:w-[calc((100%-1rem)/2)]",
          carousel && config.columns === 3 && "sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]")}>
          <a href={item.href} {...externalLinkProps(item.href)}
            onClick={preview ? (event) => event.preventDefault() : undefined}
            className={cn("group flex h-full overflow-hidden rounded-2xl bg-white text-left no-underline shadow-card ring-1 ring-forest-100 transition-shadow hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest-500",
              config.layout === "list" ? "flex-row" : "flex-col")}>
            {item.image ? <CardImage src={item.image} alt="" sizes="(max-width: 640px) 85vw, 350px"
              className={cn(config.layout === "list" ? "w-24 shrink-0 sm:w-36" : "aspect-[16/10] w-full")} />
              : <span aria-hidden className={cn("flex items-center justify-center bg-forest-50 text-forest-400",
                config.layout === "list" ? "w-24 shrink-0 sm:w-36" : "aspect-[16/10] w-full")}>
                <BookOpen className="h-9 w-9" />
              </span>}
            <div className="flex min-w-0 flex-1 flex-col p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-forest-600">{LABELS[locale][item.kind]}</span>
              <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-slate-800 group-hover:text-forest-700">{item.title}</h3>
              {config.showDescription && item.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{item.description}</p>}
              {item.date && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-soft"><CalendarDays className="h-3.5 w-3.5" />{formatDate(`${item.date}T12:00:00`, locale)}</p>}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                {config.showPrice && item.price && <PriceTag label={item.price} wasLabel={locale === "bg" ? "Преди" : "Was"} size="sm" />}
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600">{locale === "bg" ? "Виж повече" : "Learn more"}<ArrowRight className="h-4 w-4" /></span>
              </div>
            </div>
          </a>
        </li>)}
      </ul>
    </section>
  );
}
