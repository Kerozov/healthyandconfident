-- Downsell: a second, cheaper offer shown when the visitor declines the upsell.
-- The upsell already lives on site_cta_placements (offer_id / offer_enabled);
-- this adds the matching "second chance" offer alongside it.

alter table public.site_cta_placements
  add column if not exists downsell_offer_id uuid
    references public.site_products(id) on delete set null,
  add column if not exists downsell_enabled boolean not null default false,
  add column if not exists downsell_headline_bg text not null default '',
  add column if not exists downsell_headline_en text not null default '';

-- A product must never offer itself: it would put the same line item in the
-- Stripe session twice and show the buyer what they are already buying.
update public.site_cta_placements
set offer_id = null, offer_enabled = false
where key = 'product_' || offer_id::text;

update public.site_cta_placements
set downsell_offer_id = null, downsell_enabled = false
where key = 'product_' || downsell_offer_id::text;
