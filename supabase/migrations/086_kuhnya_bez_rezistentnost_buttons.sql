-- 086: buttons for „Кухня без резистентност“ (working title).
--
-- The public name lives in lib/programs/kuhnya.ts. These rows are what
-- Админ → Сайт → Бутони lists. No Stripe product is stored here: pick it on
-- the price button (`product_kuhnya-bez-rezistentnost_pricing_0`). Until then
-- the page shows no amount and the buy buttons stay on the page.

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'product_kuhnya-bez-rezistentnost',
    'Кухня без резистентност - главен бутон',
    'Kitchen Without Resistance - primary button'
  ),
  (
    'product_kuhnya-bez-rezistentnost_secondary',
    'Кухня без резистентност - втори бутон горе',
    'Kitchen Without Resistance - secondary button'
  ),
  (
    'product_kuhnya-bez-rezistentnost_pricing_0',
    'Кухня без резистентност - цена',
    'Kitchen Without Resistance - price'
  ),
  (
    'product_kuhnya-bez-rezistentnost_final',
    'Кухня без резистентност - последен бутон на страницата',
    'Kitchen Without Resistance - last button on the page'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';
