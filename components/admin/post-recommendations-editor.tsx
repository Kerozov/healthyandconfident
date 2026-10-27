"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, Search, X } from "lucide-react";
import { Field, Input, Select } from "@/components/admin/fields";
import { PostRecommendationsBlock } from "@/components/site/post-recommendations";
import {
  POST_CATALOG_KINDS, POST_CATALOG_LABELS,
  type PostCatalogItem, type PostCatalogKind, type PostRecommendations,
} from "@/lib/site/post-recommendations";
import type { Locale } from "@/i18n/config";

export function PostRecommendationsEditor({ config, onChange, catalog, loading, error, onReload, locale }: {
  config: PostRecommendations;
  onChange: (config: PostRecommendations) => void;
  catalog: PostCatalogItem[];
  loading: boolean;
  error?: string;
  onReload: () => void;
  locale: Locale;
}) {
  function patch(value: Partial<PostRecommendations>) { onChange({ ...config, ...value }); }
  const random = config.mode !== "manual";
  const fixed = config.mode !== "random";

  return <div className="space-y-5">
    <Field label="Заглавие над предложенията" hint="По избор. Празно = „Може да ти е полезно“ (или английския вариант).">
      <Input value={config.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Например: Продължи с тези ръководства" />
    </Field>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Как се избират">
        <Select value={config.mode} onChange={(e) => patch({ mode: e.target.value as PostRecommendations["mode"] })}>
          <option value="manual">Конкретни — в моя ред</option>
          <option value="random">Случайни при всяко зареждане</option>
          <option value="mixed">Фиксирани + случайно допълване</option>
        </Select>
      </Field>
      <Field label="Общо предложения" hint="От 1 до 50. Ако наличните са по-малко, показваме толкова, колкото има.">
        <Input type="number" min={1} max={50} value={config.count}
          onChange={(e) => patch({ count: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })} />
      </Field>
    </div>
    <p className="text-xs leading-relaxed text-ink-soft">
      {config.mode === "manual" ? "Показват се първите избрани предложения в реда по-долу."
        : config.mode === "mixed" ? "Първо стоят фиксираните в твоя ред. Останалите места до общия брой се запълват случайно, без повторения."
        : "Всеки посетител получава нов случаен избор при зареждане на статията. Може да има съвпадения с предишния избор."}
    </p>

    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
      <p className="text-xs text-ink-soft">Само активни предложения на {locale === "bg" ? "български" : "английски"}. Миналите събития отпадат автоматично.</p>
      <button type="button" onClick={onReload} disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 disabled:opacity-50">
        <RefreshCw className="h-3.5 w-3.5" /> Обнови списъка
      </button>
    </div>
    {loading && <p role="status" className="text-sm text-ink-soft">Зареждане на активните предложения…</p>}
    {error && <p role="alert" className="text-sm text-coral-600">{error}</p>}

    {fixed && <div className="space-y-3">
      <p className="text-sm font-semibold">{config.mode === "mixed" ? "Фиксирани предложения (първи)" : "Избрани предложения и ред"}</p>
      <ItemPicker catalog={catalog} selected={config.selected} onChange={(selected) => patch({ selected })} />
      <ol className="space-y-2">
        {config.selected.map((key, index) => {
          const item = catalog.find((candidate) => candidate.key === key);
          function move(direction: -1 | 1) {
            const next = [...config.selected];
            [next[index], next[index + direction]] = [next[index + direction], next[index]];
            patch({ selected: next });
          }
          return <li key={key} className="flex items-center gap-2 rounded-xl bg-cream/70 px-3 py-2 text-sm">
            <span className="text-xs tabular-nums text-ink-soft">{index + 1}.</span>
            <span className="min-w-0 flex-1">{item?.title ?? (loading ? "Зареждане…" : "Вече не е активно на този език")}
              {!item && !loading && <span className="block text-xs text-gold-600">Ще бъде пропуснато. Можеш да го премахнеш или да го активираш отново.</span>}
            </span>
            <button type="button" aria-label="Премести предложението нагоре" title="Нагоре" disabled={index === 0} onClick={() => move(-1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Премести предложението надолу" title="Надолу" disabled={index === config.selected.length - 1} onClick={() => move(1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" aria-label="Премахни предложението" title="Премахни" onClick={() => patch({ selected: config.selected.filter((k) => k !== key) })} className="rounded-lg p-1.5 text-coral-600 hover:bg-white"><X className="h-4 w-4" /></button>
          </li>;
        })}
      </ol>
      {config.selected.length > config.count && <p className="text-xs text-gold-600">Избрани са {config.selected.length}, а общият брой е {config.count}. Ще се покажат първите {config.count} активни. Увеличи броя, за да се покажат всички.</p>}
    </div>}

    {random && <div className="space-y-4 rounded-xl border border-forest-100 bg-forest-50/30 p-3">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Случайните да са от тези видове</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {POST_CATALOG_KINDS.map((kind) => <label key={kind} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.kinds.includes(kind)} onChange={(e) => patch({
              kinds: e.target.checked ? [...config.kinds, kind] : config.kinds.filter((k) => k !== kind),
            })} />{POST_CATALOG_LABELS[kind]}
          </label>)}
        </div>
      </fieldset>
      <Field label="От кои предложения да тегли">
        <Select value={config.pool} onChange={(e) => patch({ pool: e.target.value as "all" | "selected" })}>
          <option value="all">Всички активни от отметнатите видове</option>
          <option value="selected">Само от избрани от мен предложения</option>
        </Select>
      </Field>
      {config.pool === "selected" && <ItemPicker catalog={catalog.filter((item) => config.kinds.includes(item.kind))}
        selected={config.poolItems} onChange={(poolItems) => patch({ poolItems })} />}
      {config.kinds.length === 0 && <p className="text-xs text-gold-600">Отметни поне един вид за случайния избор.</p>}
      {config.pool === "selected" && config.poolItems.length === 0 && <p className="text-xs text-gold-600">Избери поне едно предложение, от което да теглим.</p>}
    </div>}

    <div className="grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2">
      <Field label="Подредба">
        <Select value={config.layout} onChange={(e) => patch({ layout: e.target.value as PostRecommendations["layout"] })}>
          <option value="grid">Карти в колони</option>
          <option value="carousel">Карусел</option>
          <option value="list">Списък — снимка до текста</option>
        </Select>
      </Field>
      {config.layout !== "list" && <Field label={config.layout === "carousel" ? "Видими карти наведнъж (на голям екран)" : "Колони (на голям екран)"} hint="На телефон картите се подреждат за малък екран.">
        <Select value={config.columns} onChange={(e) => patch({ columns: Number(e.target.value) as 1 | 2 | 3 })}>
          <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
        </Select>
      </Field>}
    </div>
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={config.showDescription} onChange={(e) => patch({ showDescription: e.target.checked })} />Показвай описания</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={config.showPrice} onChange={(e) => patch({ showPrice: e.target.checked })} />Показвай цени, когато има</label>
    </div>
    {config.layout === "carousel" && <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} />Автоматично въртене</label>
      {config.autoplay && <Field label="Смяна през (секунди)" hint="От 3 до 30 секунди. Спира при четене с мишката или клавиатурата.">
        <Input type="number" min={3} max={30} value={config.interval} onChange={(e) => patch({ interval: Math.min(30, Math.max(3, Number(e.target.value) || 3)) })} />
      </Field>}
    </div>}
    <details className="rounded-xl border border-ink/10 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-forest-700">Преглед на този блок</summary>
      <PostRecommendationsBlock config={config} locale={locale} catalog={catalog} preview />
    </details>
  </div>;
}

function ItemPicker({ catalog, selected, onChange }: {
  catalog: PostCatalogItem[]; selected: string[]; onChange: (keys: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PostCatalogKind | "all">("all");
  const visible = catalog.filter((item) => (kind === "all" || item.kind === kind) &&
    item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
        <Input aria-label="Търси предложения" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Търси по заглавие…" className="py-2.5 pl-9" />
      </div>
      <Select aria-label="Филтър по вид" value={kind} onChange={(e) => setKind(e.target.value as PostCatalogKind | "all")} className="w-auto max-w-full py-2">
        <option value="all">Всички видове</option>
        {POST_CATALOG_KINDS.map((k) => <option key={k} value={k}>{POST_CATALOG_LABELS[k]}</option>)}
      </Select>
    </div>
    <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink/10 p-2">
      {visible.map((item) => <label key={item.key} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-cream">
        <input type="checkbox" className="mt-1" checked={selected.includes(item.key)} onChange={(e) => onChange(e.target.checked ? [...selected, item.key] : selected.filter((key) => key !== item.key))} />
        <span className="min-w-0 text-sm">{item.title}<span className="block text-xs text-ink-soft">{POST_CATALOG_LABELS[item.kind]}{item.price ? ` · ${item.price}` : ""}</span></span>
      </label>)}
      {!visible.length && <p className="p-2 text-xs text-ink-soft">Няма предложения за този филтър.</p>}
    </div>
    <p className="text-xs text-ink-soft">{selected.length} избрани</p>
  </div>;
}
