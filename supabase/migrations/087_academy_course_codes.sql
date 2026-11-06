-- Course access codes from the academy, issued after a paid checkout.
-- A product or guide names the academy product it unlocks (its slug in the
-- academy's „Продажби“); each paid line remembers the code it got, so a
-- retried webhook or a later email step reads the same code back.
alter table public.site_products
  add column if not exists academy_product text;
alter table public.site_guides
  add column if not exists academy_product text;
alter table public.subscriber_purchases
  add column if not exists academy_product text,
  add column if not exists academy_code text;

notify pgrst, 'reload schema';
