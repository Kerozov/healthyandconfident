"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PostCatalogItem } from "@/lib/site/post-recommendations";

const pending = new Map<Locale, Promise<{ items: PostCatalogItem[]; seed: number }>>();

function loadCatalog(locale: Locale) {
  const existing = pending.get(locale);
  if (existing) return existing;
  const promise = fetch(`/api/blog/catalog?locale=${locale}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Предложенията не можаха да се заредят. Опитай отново.");
      const data = await response.json() as { items: PostCatalogItem[] };
      return { items: data.items, seed: Math.floor(Math.random() * 4294967296) };
    }).finally(() => { pending.delete(locale); });
  pending.set(locale, promise);
  return promise;
}

/** Share in-flight requests between blocks, but read fresh data on each visit. */
export function usePostCatalog(locale: Locale, enabled = true) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    locale: Locale; revision: number; items: PostCatalogItem[]; seed: number; error?: string;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadCatalog(locale).then((data) => {
      if (!cancelled) setResult({ ...data, locale, revision });
    }).catch((error: Error) => {
      if (!cancelled) setResult({ locale, revision, items: [], seed: 0, error: error.message });
    });
    return () => { cancelled = true; };
  }, [locale, enabled, revision]);
  const current = result?.locale === locale && result.revision === revision ? result : null;
  return {
    items: current?.items ?? [], seed: current?.seed ?? 0,
    loading: enabled && !current, error: current?.error,
    reload: () => setRevision((r) => r + 1),
  };
}
