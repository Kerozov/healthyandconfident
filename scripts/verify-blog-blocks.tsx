import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/site/markdown";
import {
  createPostBlock, parsePostBlocks, postReadingContent, serializePostBlocks,
} from "@/lib/site/post-blocks";
import {
  defaultPostRecommendations, parsePostRecommendations, recommendationsMarkdown,
  seededPostRandom, selectPostRecommendations, type PostCatalogItem,
} from "@/lib/site/post-recommendations";
import { buildPostCatalog, type PostCatalogSource } from "@/lib/site/post-catalog";
import { toggleMarkdownFormat } from "@/lib/site/markdown-formatting";
import type { BlogPost, SiteEvent, SiteGuide, SiteProduct, SiteProgramCard, SiteVideo } from "@/lib/supabase/types";

let passed = 0;
function check(label: string, test: () => void) {
  test(); passed += 1; console.log(`✓ ${label}`);
}
const config = defaultPostRecommendations();
const catalog: PostCatalogItem[] = Array.from({ length: 12 }, (_, i) => ({
  key: `${i < 6 ? "product" : "guide"}:${i}`, kind: i < 6 ? "product" : "guide",
  title: `Предложение ${i}`, description: "Описание", image: "", href: `/bg/products/${i}`, price: "",
}));

check("Blocks survive saving and reopening between text and images", () => {
  const settings = { ...config, title: "Прочети още\n``` и 🎉", mode: "mixed" as const,
    selected: ["guide:7"], pool: "selected" as const, poolItems: ["product:2", "guide:9"] };
  const input = `## Начало\n\n**Важен текст**\n\n${recommendationsMarkdown(settings)}\n\n![Снимка](/images/3.jpg)\n\nКрай`;
  const blocks = parsePostBlocks(input);
  assert.deepEqual(blocks.map((b) => b.type), ["text", "recommendations", "image", "text"]);
  const reopened = parsePostBlocks(serializePostBlocks(blocks));
  const block = reopened.find((b) => b.type === "recommendations");
  assert.ok(block?.type === "recommendations");
  assert.deepEqual(block.config, settings);
  assert.equal(serializePostBlocks(reopened), serializePostBlocks(blocks));
});
check("Existing Markdown and regular code fences stay intact", () => {
  const input = "## Заглавие\n\nАбзац с **акцент**.\n\n```json\n{\"count\":5}\n```\n\nКрай";
  assert.equal(serializePostBlocks(parsePostBlocks(input)), input);
  assert.equal(createPostBlock("recommendations").type, "recommendations");
});
check("Invalid settings are harmless and numeric limits are enforced", () => {
  for (const value of ["bad json", "null", "[]", "42"]) assert.equal(parsePostRecommendations(value), null);
  const parsed = parsePostRecommendations(JSON.stringify({ count: 9999, interval: -4, columns: 90, selected: [1, "guide:7", "guide:7"], kinds: ["guide", "secret"] }));
  assert.ok(parsed);
  assert.equal(parsed.count, 50); assert.equal(parsed.interval, 3); assert.equal(parsed.columns, 3);
  assert.deepEqual(parsed.selected, ["guide:7"]); assert.deepEqual(parsed.kinds, ["guide"]);
});
check("Manual selection keeps the chosen order and skips unavailable items", () => {
  const items = selectPostRecommendations({ ...config, mode: "manual", selected: ["guide:9", "missing:1", "product:2", "guide:9"], count: 5 }, catalog);
  assert.deepEqual(items.map((i) => i.key), ["guide:9", "product:2"]);
});
check("Random selection respects kinds, pool and count, without duplicates", () => {
  const settings = { ...config, kinds: ["guide" as const], count: 2, pool: "selected" as const,
    poolItems: ["product:2", "guide:7", "guide:9", "guide:11"] };
  for (let seed = 1; seed <= 100; seed++) {
    const items = selectPostRecommendations(settings, catalog, seededPostRandom(seed));
    assert.equal(items.length, 2); assert.equal(new Set(items.map((i) => i.key)).size, 2);
    assert.ok(items.every((i) => i.kind === "guide" && settings.poolItems.includes(i.key)));
  }
});
check("Mixed blocks pin chosen items then fill only the remaining places", () => {
  const items = selectPostRecommendations({ ...config, mode: "mixed", count: 5,
    selected: ["guide:7", "product:2"], pool: "selected", poolItems: ["guide:7", "guide:8", "guide:9", "guide:10", "guide:11"] }, catalog, seededPostRandom(12));
  assert.equal(items.length, 5);
  assert.deepEqual(items.slice(0, 2).map((i) => i.key), ["guide:7", "product:2"]);
  assert.equal(new Set(items.map((i) => i.key)).size, 5);
});
check("Small or empty pools never repeat items or silently use all items", () => {
  assert.equal(selectPostRecommendations({ ...config, pool: "selected", poolItems: [], count: 50 }, catalog).length, 0);
  assert.equal(selectPostRecommendations({ ...config, pool: "selected", poolItems: ["guide:7"], count: 50 }, catalog).length, 1);
  assert.equal(selectPostRecommendations({ ...config, kinds: [] }, catalog).length, 0);
});
check("A fresh seed changes the selection over repeated visits", () => {
  const selections = new Set(Array.from({ length: 30 }, (_, i) =>
    selectPostRecommendations(config, catalog, seededPostRandom(i * 100003)).map((item) => item.key).join(",")));
  assert.ok(selections.size > 20);
});

const common = { enabled: true, enabled_en: false, title_bg: "Заглавие", title_en: "Title",
  description_bg: "Описание", description_en: "Description", image_url: null,
  sort_order: 0, created_at: "2026-10-27T00:00:00Z", updated_at: "2026-10-27T00:00:00Z" };
const source: PostCatalogSource = {
  products: [
    { ...common, id: "p", slug: "produkt", link_mode: "custom", link_url: "/programs/21-dni", price_label_bg: "10 €", price_label_en: "10 €" } as SiteProduct,
    { ...common, id: "hidden", enabled: false } as SiteProduct,
  ],
  guides: [{ ...common, enabled_en: true, id: "g", slug: "guide", price_label_bg: "5 €", price_label_en: "5 €" } as SiteGuide],
  programs: [{ ...common, id: "pr", href: "/programs/21-dni", href_en: "", badge_bg: "", badge_en: "", features_bg: [], features_en: [], duration_bg: "", duration_en: "", price_bg: "", price_en: "", cta_label_bg: "", cta_label_en: "" } as unknown as SiteProgramCard],
  events: [
    { ...common, id: "past", event_date: "2026-10-26", url: "https://example.com/past", url_en: "" },
    { ...common, id: "today", event_date: "2026-10-27", url: "/forms/webinar", url_en: "" },
    { ...common, id: "future", event_date: "2026-11-01", url: "https://example.com/event", url_en: "" },
    { ...common, id: "undated", event_date: null, url: "https://example.com/undated", url_en: "" },
  ] as SiteEvent[],
  videos: [{ ...common, id: "v", youtube_url: "https://youtu.be/dQw4w9WgXcQ" } as SiteVideo],
  posts: [
    { id: "published", locale: "bg", status: "published", title: "Статия", excerpt: "", slug: "post", cover_image: null },
    { id: "draft", locale: "bg", status: "draft", title: "Чернова", slug: "draft" },
    { id: "english", locale: "en", status: "published", title: "Article", excerpt: "", slug: "article" },
  ] as BlogPost[],
  forms: [
    { ...common, id: "form", slug: "form" },
    { ...common, id: "private", slug: "private", enabled: false },
  ],
};
check("Catalog excludes inactive items, drafts, other languages and past Sofia dates", () => {
  const items = buildPostCatalog(source, "bg", new Date("2026-10-26T22:30:00Z"));
  assert.deepEqual(items.map((i) => i.key), ["product:p", "guide:g", "program:pr", "event:today", "event:future", "event:undated", "video:v", "post:published", "form:form"]);
  assert.equal(items.find((i) => i.key === "product:p")?.href, "/bg/programs/21-dni");
  assert.equal(items.find((i) => i.key === "guide:g")?.href, "/bg/guides/guide");
  const en = buildPostCatalog(source, "en", new Date("2026-10-26T22:30:00Z"));
  assert.deepEqual(en.map((i) => i.key), ["guide:g", "post:english", "form:form"]);
});
check("Public cards honor the count and render inside the article, outside a pre tag", () => {
  const settings = { ...config, title: "Нашите предложения", mode: "manual" as const,
    selected: ["guide:7", "product:2"], count: 1 };
  const html = renderToStaticMarkup(<Markdown content={`Преди\n\n${recommendationsMarkdown(settings)}\n\nСлед`} catalog={catalog} />);
  assert.ok(html.includes("Нашите предложения")); assert.ok(html.includes("Предложение 7"));
  assert.ok(!html.includes("Предложение 2")); assert.ok(!html.includes("<pre"));
  assert.ok(html.indexOf("Преди") < html.indexOf("Нашите предложения"));
  assert.ok(html.indexOf("Нашите предложения") < html.indexOf("След"));
});
check("The current post cannot recommend itself; empty blocks disappear", () => {
  const settings = { ...config, mode: "manual" as const, selected: ["post:current"] };
  const self = { ...catalog[0], key: "post:current", kind: "post" as const };
  const html = renderToStaticMarkup(<Markdown content={recommendationsMarkdown(settings)} catalog={[self]} excludePostId="current" />);
  assert.ok(!html.includes("<section")); assert.ok(!html.includes("site-content"));
});
check("Settings do not count towards reading time", () => {
  const content = `Преди\n\n${recommendationsMarkdown({ ...config, title: "Заглавие с много думи" })}\n\nСлед`;
  assert.equal(postReadingContent(content), "Преди\n\nСлед");
});
check("Bold handles sentences, spaces, toggling and the selected word range", () => {
  const result = toggleMarkdownFormat("Преди важни думи след", 6, 16, "**");
  assert.equal(result.value, "Преди **важни думи** след");
  assert.equal(result.value.slice(result.start, result.end), "важни думи");
  const cleared = toggleMarkdownFormat(result.value, result.start, result.end, "**");
  assert.equal(cleared.value, "Преди важни думи след");
  assert.equal(toggleMarkdownFormat(" дума ", 0, 6, "**").value, " **дума** ");
  assert.equal(toggleMarkdownFormat("**дума**", 0, 8, "**").value, "дума");
  assert.equal(toggleMarkdownFormat("", 0, 0, "**").value, "**удебелен текст**");
});
console.log(`\n${passed} blog checks passed.`);
