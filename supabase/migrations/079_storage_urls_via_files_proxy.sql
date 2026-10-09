-- Point every stored Supabase Storage URL at the cached /files proxy.
--
-- Images and PDFs were linked straight from Supabase, so each page view, email
-- open and per-job worker attachment fetch counted against the free plan's
-- 5 GB cached-egress quota — which ran out on 2026-10-09 and returned 402 for
-- every project in the organisation. `/files/<bucket>/<key>` on the site is
-- the same file behind Vercel's CDN (app/files/[...path]/route.ts); new uploads
-- already get that URL (lib/storage/cdn-url.ts).
--
-- Plain prefix replace over every text / varchar / json / jsonb / text[]
-- column in public. Only rows that contain the prefix are touched; the only
-- update triggers in this schema bump updated_at. Idempotent: a second run
-- finds nothing to replace.

do $$
declare
  old_prefix constant text :=
    'https://oydbidzehhtnkrvrmylh.supabase.co/storage/v1/object/public/';
  new_prefix constant text := 'https://www.healthyandconfident.co.uk/files/';
  col record;
  touched bigint;
begin
  for col in
    select c.relname as tbl,
           a.attname as col,
           format_type(a.atttypid, a.atttypmod) as typ
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and a.attnum > 0
       and not a.attisdropped
       and a.attgenerated = ''
       and a.atttypid in (
         'text'::regtype, 'varchar'::regtype,
         'json'::regtype, 'jsonb'::regtype, 'text[]'::regtype
       )
  loop
    execute format(
      'update public.%I set %I = replace(%I::text, %L, %L)::%s where strpos(%I::text, %L) > 0',
      col.tbl, col.col, col.col, old_prefix, new_prefix, col.typ, col.col, old_prefix
    );
    get diagnostics touched = row_count;
    if touched > 0 then
      raise notice 'storage urls → /files: %.% (% rows)', col.tbl, col.col, touched;
    end if;
  end loop;
end $$;
