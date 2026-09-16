#!/usr/bin/env bun
export {};

/**
 * Gives every product and guide already in the database the readable link it
 * was missing, so the copy buttons in the admin are useful on day one instead
 * of only after each row is opened and saved again.
 *
 *   bun scripts/backfill-catalog-slugs.ts          # show what it would do
 *   bun scripts/backfill-catalog-slugs.ts --write  # write it
 *
 * Rows that already have a slug are left alone. Ids keep resolving either way,
 * so nothing already sent out changes meaning.
 */
import { catalogSlug, uniqueCatalogSlug } from "@/lib/site/share-links";

// `lib/supabase/admin.ts` is `server-only`, which does not resolve outside the
// Next build — the client is built here the same way `verify-upload.ts` does it.
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Row = { id: string; slug: string | null; title_bg: string; title_en: string };

const WRITE = process.argv.includes("--write");

async function backfill(table: "site_guides" | "site_products") {
  const { data, error } = await supabase
    .from(table)
    .select("id, slug, title_bg, title_en")
    .limit(1000);

  if (error) {
    console.error(`${table}: ${error.message}`);
    return 1;
  }

  const rows = (data as Row[]) ?? [];
  const taken = rows.map((r) => r.slug?.trim() ?? "").filter(Boolean);
  let changed = 0;

  console.log(`\n${table} — ${rows.length} реда`);

  for (const row of rows) {
    if (row.slug?.trim()) {
      console.log(`  =    ${row.slug}  (${row.title_bg})`);
      continue;
    }

    const slug = uniqueCatalogSlug(
      catalogSlug(row.title_bg) || catalogSlug(row.title_en),
      taken,
    );
    if (!slug) {
      console.log(`  --   няма как да се направи линк от „${row.title_bg}“ — остава по id`);
      continue;
    }

    taken.push(slug);
    changed += 1;
    console.log(`  ${WRITE ? "+" : "?"}    ${slug}  (${row.title_bg})`);

    if (WRITE) {
      const { error: writeError } = await supabase
        .from(table)
        .update({ slug })
        .eq("id", row.id);
      if (writeError) {
        console.error(`       записът не мина: ${writeError.message}`);
        return 1;
      }
    }
  }

  console.log(`  ${changed} за обновяване`);
  return 0;
}

const failures =
  (await backfill("site_guides")) + (await backfill("site_products"));

if (!WRITE) {
  console.log("\nНищо не е записано. Пусни пак с --write, за да се приложи.");
}

process.exit(failures > 0 ? 1 : 0);
