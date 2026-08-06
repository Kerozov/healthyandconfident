import {
  createEmailBlock,
  parseEmailBlocks,
  serializeEmailBlocks,
  type EmailBlock,
} from "@/lib/email/blocks";
import { normalizeEmailBodyHtml } from "@/lib/email/normalize-body";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

/* 1. round-trip of every block type ------------------------------------- */
const blocks: EmailBlock[] = [
  { ...createEmailBlock("text"), type: "text", text: "Здравей, {{name}}!\nВтори ред & <тест>", align: "center", size: "lg" } as EmailBlock,
  { ...createEmailBlock("heading"), type: "heading", text: "Заглавие \"кавички\"", level: 1, align: "right" } as EmailBlock,
  { ...createEmailBlock("button"), type: "button", label: "Запиши се", href: "https://x.co/a?b=1&c=2", align: "center", variant: "green" } as EmailBlock,
  { ...createEmailBlock("image"), type: "image", src: "https://img/a.png", alt: "алт", href: "/bg#contact", width: 60, align: "right", radius: false, caption: "Подпис" } as EmailBlock,
  { ...createEmailBlock("columns"), type: "columns", columns: [
      { src: "https://img/1.png", alt: "1", text: "Ляво", href: "https://a.co" },
      { src: "https://img/2.png", alt: "2", text: "Дясно\nвтори ред", href: "" },
    ] } as EmailBlock,
  { ...createEmailBlock("quote"), type: "quote", text: "Цитат {{email}}" } as EmailBlock,
  { ...createEmailBlock("list"), type: "list", items: ["едно", "две & три"], ordered: true } as EmailBlock,
  createEmailBlock("divider"),
  { ...createEmailBlock("spacer"), type: "spacer", size: 40 } as EmailBlock,
  { ...createEmailBlock("product"), type: "product", productId: "11111111-2222-3333-4444-555555555555", linkMode: "site" } as EmailBlock,
  { ...createEmailBlock("form"), type: "form", formId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } as EmailBlock,
  { ...createEmailBlock("html"), type: "html", html: "<table><tr><td>raw</td></tr></table>" } as EmailBlock,
];

const html = serializeEmailBlocks(blocks);
const back = parseEmailBlocks(html);

check("block count survives", back.length === blocks.length, `${back.length} vs ${blocks.length}`);
check("types survive", back.map((b) => b.type).join(",") === blocks.map((b) => b.type).join(","), back.map((b) => b.type).join(","));

const strip = (b: EmailBlock) => JSON.stringify({ ...b, id: undefined });
blocks.forEach((original, i) => {
  check(`round-trip #${i} (${original.type})`, strip(original) === strip(back[i]), `\n    in : ${strip(original)}\n    out: ${strip(back[i])}`);
});

const twice = serializeEmailBlocks(back);
check("serialize is idempotent", twice === html);

/* 2. every serialized block is a single line ---------------------------- */
for (const chunk of html.split("\n\n")) {
  check(`single line: ${chunk.slice(0, 28)}…`, !chunk.includes("\n"));
}

/* 3. normalize must not mangle builder output --------------------------- */
const normalized = normalizeEmailBodyHtml(html);
check("no stray <br> injected", !normalized.includes("<br>\n<tr") && !/<\/table>\s*<br>/.test(normalized));
check("product marker preserved for server expansion", normalized.includes("hc-email-product:11111111-2222-3333-4444-555555555555"));
check("form marker preserved", normalized.includes("hc-email-form:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"));
check("{{name}} still literal after normalize", normalized.includes("{{name}}"));
check("mso conditional survived", normalized.includes("<!--[if mso]>"));

/* 4. legacy content still parses --------------------------------------- */
const legacy = [
  "Здравей, {{name}}!",
  "",
  "Радвам се, че си тук.",
  "",
  "<!-- hc-email-btn:" + encodeURIComponent("Виж програмата") + "|" + encodeURIComponent("https://a.co/x") + " -->",
  "",
  '<p style="margin:0 0 16px;line-height:0"><img src="https://img/legacy.png" alt="" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px" /></p>',
  "",
  "<!-- hc-email-product:11111111-2222-3333-4444-555555555555 -->",
  "",
  "<!-- hc-email-form:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee -->",
].join("\n");

const legacyBlocks = parseEmailBlocks(legacy);
check("legacy: 6 blocks", legacyBlocks.length === 6, legacyBlocks.map((b) => b.type).join(","));
check("legacy: text first", legacyBlocks[0].type === "text" && legacyBlocks[0].text.includes("{{name}}"));
check("legacy: button parsed", legacyBlocks[2].type === "button" && legacyBlocks[2].label === "Виж програмата" && legacyBlocks[2].href === "https://a.co/x");
check("legacy: inline image parsed", legacyBlocks[3].type === "image" && legacyBlocks[3].src === "https://img/legacy.png");
check("legacy: product parsed", legacyBlocks[4].type === "product");
check(
  "legacy product defaults to the upsell-capable site link",
  legacyBlocks[4].type === "product" && legacyBlocks[4].linkMode === "site",
);
check("legacy: form parsed", legacyBlocks[5].type === "form");

const legacyOut = serializeEmailBlocks(legacyBlocks);
check("legacy: markers kept after re-serialize", legacyOut.includes("hc-email-product:") && legacyOut.includes("hc-email-form:"));
check("legacy: text is not double-escaped", !legacyOut.includes("&amp;amp;"));

/* 5. inline marker in the middle of a paragraph ------------------------- */
const inlineMarker = "Текст преди\n<!-- hc-email-product:11111111-2222-3333-4444-555555555555 -->\nТекст след";
const inlineBlocks = parseEmailBlocks(inlineMarker);
check("inline marker splits into 3", inlineBlocks.length === 3, inlineBlocks.map((b) => b.type).join(","));
check("inline marker → product block", inlineBlocks[1].type === "product");

/* 6. empty blocks are dropped on serialize ------------------------------ */
const withEmpty = serializeEmailBlocks([
  createEmailBlock("text"),
  { ...createEmailBlock("text"), type: "text", text: "истински", align: "left", size: "md" } as EmailBlock,
  createEmailBlock("image"),
]);
check("empty blocks skipped", withEmpty.split("\n\n").length === 1, withEmpty);

/* 7. unsafe hrefs are not rendered as links ----------------------------- */
const unsafe = serializeEmailBlocks([
  { ...createEmailBlock("button"), type: "button", label: "X", href: "javascript:alert(1)", align: "center", variant: "gold" } as EmailBlock,
  { ...createEmailBlock("image"), type: "image", src: "https://i/a.png", alt: "", href: "javascript:alert(1)", width: 100, align: "center", radius: true, caption: "" } as EmailBlock,
]);
// The raw value is kept in the inert data-* attribute so a typo stays fixable,
// but it must never become a real href / src.
check("no javascript: link rendered", !/\shref="javascript:/i.test(unsafe) && !/<a\b/i.test(unsafe), unsafe);

/* 8. hand-written HTML is broken into editable blocks ------------------- */
const handWritten =
  '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира.</p><ul><li>Едно</li><li>Две</li></ul><p style="text-align:center"><img src="https://img/x.png" alt="x" /></p><table><tr><td>сложна таблица</td></tr></table><p>Край <strong>с удебелен</strong> текст</p>';
const decomposed = parseEmailBlocks(handWritten);
check(
  "legacy html decomposed",
  decomposed.map((b) => b.type).join(",") === "heading,text,list,image,html,html",
  decomposed.map((b) => b.type).join(","),
);
check("legacy heading level", decomposed[0].type === "heading" && decomposed[0].level === 1 && decomposed[0].text === "Здравей, {{name}}!");
check("legacy list items", decomposed[2].type === "list" && decomposed[2].items.join("|") === "Едно|Две");
check("legacy image src", decomposed[3].type === "image" && decomposed[3].src === "https://img/x.png");
check("table kept as raw html", decomposed[4].type === "html" && decomposed[4].html.startsWith("<table"));
check("inline <strong> kept as raw html", decomposed[5].type === "html" && decomposed[5].html.includes("<strong>"));

const nestedList = parseEmailBlocks("<ul><li>едно<ul><li>под</li></ul></li></ul>");
check("nested list is not flattened", nestedList.length === 1 && nestedList[0].type === "html", nestedList.map((b) => b.type).join(","));

const linkParagraph = parseEmailBlocks('<p>Виж <a href="https://x.co">тук</a></p>');
check("paragraph with a link stays raw", linkParagraph[0].type === "html");

const plainParagraph = parseEmailBlocks('<p style="margin:0 0 16px;line-height:1.65;color:#1A2E1A">Ред едно<br>Ред две</p>');
check("plain paragraph → text block", plainParagraph[0].type === "text" && plainParagraph[0].text === "Ред едно\nРед две");

/* 9. deep nesting does not blow up the top-level walker ----------------- */
const deep = parseEmailBlocks("<div><div><p>вътре</p></div></div>");
check("nested wrapper kept whole", deep.length === 1 && deep[0].type === "html");

/* 9b. product link mode survives the round-trip ------------------------- */
const stripeMode = serializeEmailBlocks([
  { ...createEmailBlock("product"), type: "product", productId: "11111111-2222-3333-4444-555555555555", linkMode: "stripe" } as EmailBlock,
]);
check("stripe mode is written into the marker", stripeMode.includes(":stripe -->"), stripeMode);
const stripeBack = parseEmailBlocks(stripeMode);
check(
  "stripe mode parses back",
  stripeBack[0].type === "product" && stripeBack[0].linkMode === "stripe",
  stripeBack[0].type,
);

/* 10. hand-authored styling is never silently dropped ------------------- */
const styled = parseEmailBlocks('<p style="color:red">важно</p>');
check("custom colour keeps the block raw", styled[0].type === "html", styled[0].type);
const boldish = parseEmailBlocks('<h2 style="font-weight:900">силно</h2>');
check("custom font-weight keeps the block raw", boldish[0].type === "html", boldish[0].type);
const ourOwn = parseEmailBlocks('<p style="margin:0 0 16px;line-height:1.65;color:#1A2E1A">наш текст</p>');
check("our own paragraph style converts", ourOwn[0].type === "text");
const legacyInline = parseEmailBlocks('<p style="margin:0 0 16px;line-height:0"><img src="https://img/i.png" alt="" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px" /></p>');
check("legacy inline image still converts", legacyInline[0].type === "image" && legacyInline[0].src === "https://img/i.png", legacyInline[0].type);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
