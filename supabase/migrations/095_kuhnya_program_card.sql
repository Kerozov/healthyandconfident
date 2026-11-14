-- 095: the „Здравословно хранене за заети хора“ programme gets its card.
--
-- The cooking programme shipped with its own landing page and buttons
-- (086_kuhnya_bez_rezistentnost_buttons.sql), but no row in
-- site_program_cards. The „Програми“ section on the home page and /programs
-- only renders cards from that table, so the programme was invisible there,
-- and — because the „група след покупка“ invite lives on the card — there was
-- nothing to resolve a group for a checkout opened from its
-- `product_kuhnya-bez-rezistentnost_*` buttons either (see
-- lib/site/program-group.ts).
--
-- The card keeps the page's own base key, so findProgramGroupLink matches it
-- directly and the admin can set the group invite under „Програми“.

insert into public.site_program_cards (
  placement_key,
  badge_bg, badge_en,
  title_bg, title_en,
  duration_bg, duration_en,
  price_bg, price_en,
  description_bg, description_en,
  features_bg, features_en,
  cta_label_bg, cta_label_en,
  href, href_en,
  image_url, highlight, sort_order
)
values
  (
    'product_kuhnya-bez-rezistentnost',
    'Нова програма', 'New programme',
    'Здравословно хранене за заети хора', 'Healthy Eating for Busy People',
    'кратки видеа', 'short videos',
    '€39', '€39',
    'Бързи идеи за вечеря и обяд, когато нямаш време - с познати продукти и без дълго готвене.',
    'Quick dinner and lunch ideas for busy days - familiar ingredients, no long cooking.',
    array[
      'Кратки видеа по 10-12 минути',
      '23 идеи за вечеря и 5 за обяд',
      'Идеи без готвене и списък за пазаруване'
    ],
    array[
      'Short 10-12 minute videos',
      '23 dinner ideas and 5 lunches',
      'No-cook ideas plus a shopping list'
    ],
    'Виж повече', 'Learn more',
    '/programs/kuhnya', '/programs/kuhnya',
    '/images/kuhnya-cover.jpg', false, 40
  )
on conflict (placement_key) do nothing;

notify pgrst, 'reload schema';
