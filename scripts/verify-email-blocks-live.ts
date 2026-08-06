/**
 * Reads every stored email body (automations, campaigns, forms) and checks that
 * the builder can round-trip it without losing anything a recipient would see.
 *
 *   bun scripts/verify-email-blocks-live.ts
 */
import { createClient } from "@supabase/supabase-js";
import { parseEmailBlocks, serializeEmailBlocks } from "@/lib/email/blocks";
import { normalizeEmailBodyHtml } from "@/lib/email/normalize-body";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

/** Everything a recipient can actually perceive, order preserved. */
function fingerprint(html: string) {
  const normalized = normalizeEmailBodyHtml(html);
  const text = normalized
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const links = [...normalized.matchAll(/href="([^"]*)"/gi)].map((m) => m[1]);
  const images = [...normalized.matchAll(/<img[^>]*\ssrc="([^"]*)"/gi)].map(
    (m) => m[1],
  );
  const markers = [...normalized.matchAll(/hc-email-(product|form):([\w-]+)/gi)].map(
    (m) => `${m[1]}:${m[2]}`,
  );
  return { text, links, images, markers };
}

function diff(label: string, before: string, after: string): string[] {
  const a = fingerprint(before);
  const b = fingerprint(after);
  const problems: string[] = [];
  if (a.text !== b.text) {
    const at = Math.min(a.text.length, b.text.length);
    let i = 0;
    while (i < at && a.text[i] === b.text[i]) i += 1;
    problems.push(
      `text differs at ${i}:\n      was: …${a.text.slice(Math.max(0, i - 40), i + 60)}\n      now: …${b.text.slice(Math.max(0, i - 40), i + 60)}`,
    );
  }
  for (const kind of ["links", "images", "markers"] as const) {
    const was = a[kind].join(" | ");
    const now = b[kind].join(" | ");
    if (was !== now) problems.push(`${kind} differ:\n      was: ${was}\n      now: ${now}`);
  }
  return problems.map((p) => `  ${label}: ${p}`);
}

let checked = 0;
let broken = 0;

function run(label: string, html: string | null) {
  if (!html || !html.trim()) return;
  checked += 1;
  const blocks = parseEmailBlocks(html);
  const problems = diff(label, html, serializeEmailBlocks(blocks));
  const summary = blocks.map((b) => b.type).join(",");
  if (problems.length) {
    broken += 1;
    console.log(`\n✗ ${label}\n  blocks: ${summary}`);
    problems.forEach((p) => console.log(p));
  } else {
    console.log(`✓ ${label} → ${summary}`);
  }
}

const { data: automations } = await supabase
  .from("automations")
  .select("id, name, html_bg, html_en");
for (const a of (automations ?? []) as { id: string; name: string; html_bg: string; html_en: string }[]) {
  run(`automation "${a.name}" BG`, a.html_bg);
  run(`automation "${a.name}" EN`, a.html_en);
}

const { data: campaigns } = await supabase
  .from("email_campaigns")
  .select("id, subject, html")
  .order("created_at", { ascending: false })
  .limit(50);
for (const c of (campaigns ?? []) as { id: string; subject: string; html: string }[]) {
  run(`campaign "${c.subject}"`, c.html);
}

const { data: forms } = await supabase
  .from("form_templates")
  .select("id, name, email_intro_bg, email_intro_en");
for (const f of (forms ?? []) as { id: string; name: string; email_intro_bg: string; email_intro_en: string }[]) {
  run(`form "${f.name}" BG`, f.email_intro_bg);
  run(`form "${f.name}" EN`, f.email_intro_en);
}

console.log(
  `\n${checked} bodies checked · ${broken} would change what the reader sees`,
);
process.exit(broken === 0 ? 0 : 1);
