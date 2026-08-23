-- Per-locale Stripe + visibility for guides, videos, and site buttons.
-- Same pattern as products (051): pick a Stripe product or Payment Link per language,
-- and hide BG or EN independently.

alter table public.site_guides
  add column if not exists stripe_product_id text not null default '',
  add column if not exists stripe_url_en text not null default '',
  add column if not exists stripe_product_id_en text not null default '',
  add column if not exists stripe_price_id_en text not null default '',
  add column if not exists enabled_en boolean not null default true;

alter table public.site_videos
  add column if not exists enabled_en boolean not null default true;

alter table public.site_cta_placements
  add column if not exists button_url_en text not null default '',
  add column if not exists stripe_url text not null default '',
  add column if not exists stripe_product_id text not null default '',
  add column if not exists stripe_price_id text not null default '',
  add column if not exists stripe_url_en text not null default '',
  add column if not exists stripe_product_id_en text not null default '',
  add column if not exists stripe_price_id_en text not null default '',
  add column if not exists button_enabled boolean not null default true,
  add column if not exists button_enabled_en boolean not null default true;

notify pgrst, 'reload schema';
