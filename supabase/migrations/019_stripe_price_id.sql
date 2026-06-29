-- Stripe Price ID for combined checkout (base product + upsell in one session)

alter table public.site_products
  add column if not exists stripe_price_id text not null default '';

notify pgrst, 'reload schema';
