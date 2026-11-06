-- 086: buttons for „Здравословно хранене за заети хора“.
--
-- The public name lives in lib/programs/kuhnya.ts. These rows are what
-- Админ → Сайт → Бутони lists. No Stripe product is stored here: pick it on
-- the price button (`product_kuhnya-bez-rezistentnost_pricing_0`). Until then
-- the page quotes KUHNYA_PRICE from lib/programs/kuhnya.ts and shows no buy button.

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'product_kuhnya-bez-rezistentnost',
    'Здравословно хранене за заети хора - главен бутон',
    'Healthy Eating for Busy People - primary button'
  ),
  (
    'product_kuhnya-bez-rezistentnost_secondary',
    'Здравословно хранене за заети хора - втори бутон горе',
    'Healthy Eating for Busy People - secondary button'
  ),
  (
    'product_kuhnya-bez-rezistentnost_pricing_0',
    'Здравословно хранене за заети хора - цена',
    'Healthy Eating for Busy People - price'
  ),
  (
    'product_kuhnya-bez-rezistentnost_final',
    'Здравословно хранене за заети хора - последен бутон на страницата',
    'Healthy Eating for Busy People - last button on the page'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';
