-- 067: every product and every guide gets a link of its own that a person can
-- read, plus a say in where its buttons lead.
--
-- Until now the only address a row had was `/bg/guides/<uuid>` — fine for the
-- site's own links, unusable in a bio, a DM or an ad. `slug` is that address;
-- the uuid keeps resolving, so nothing already sent out breaks.
--
-- `link_mode` decides what the row's own cards and buttons do:
--   page   — open the row's page (for a product this is where its upsell runs)
--   direct — skip the page and open Stripe straight away
--   custom — go to `link_url` instead

alter table public.site_guides
  add column if not exists slug text,
  add column if not exists link_mode text not null default 'page',
  add column if not exists link_url text not null default '';

alter table public.site_products
  add column if not exists slug text,
  add column if not exists link_mode text not null default 'page',
  add column if not exists link_url text not null default '';

-- An empty slug means "address this row by its id", and several rows may be in
-- that state at once — so uniqueness is only enforced on real slugs.
update public.site_guides set slug = null where slug is not null and btrim(slug) = '';
update public.site_products set slug = null where slug is not null and btrim(slug) = '';

create unique index if not exists site_guides_slug_key
  on public.site_guides (lower(slug))
  where slug is not null;

create unique index if not exists site_products_slug_key
  on public.site_products (lower(slug))
  where slug is not null;

alter table public.site_guides drop constraint if exists site_guides_link_mode_check;
alter table public.site_guides
  add constraint site_guides_link_mode_check
  check (link_mode in ('page', 'direct', 'custom'));

alter table public.site_products drop constraint if exists site_products_link_mode_check;
alter table public.site_products
  add constraint site_products_link_mode_check
  check (link_mode in ('page', 'direct', 'custom'));

notify pgrst, 'reload schema';
