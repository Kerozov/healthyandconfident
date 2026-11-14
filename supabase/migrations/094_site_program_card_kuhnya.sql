-- 094: the cooking programme „Здравословно хранене за заети хора“ gets its
-- card in the home page section „Програми“ / on `/programs`, and every card
-- learns an optional „group“ link shown after purchase.
--
-- The programme's landing page and its four buttons exist (migration 086), so
-- it can be sold — but the home page and `/programs` list only what is in
-- `site_program_cards`, and that table had no row for it. The card below adds
-- it with the same key scheme as the first three (`programs_3`), plus a button
-- row in `site_cta_placements` so the admin can later wire a Stripe price or
-- an upsell offer to the card's button, exactly like `programs_0/1/2`.
--
-- The `group_*` columns are the „Влез в групата“ link the buyer sees on the
-- thank-you screen after paying for that programme (Viber, Facebook, Skool…).
-- Empty until a link is entered in Админ → Сайт → Програми.

alter table public.site_program_cards
  add column if not exists group_label_bg text not null default '',
  add column if not exists group_label_en text not null default '',
  add column if not exists group_url    text not null default '',
  add column if not exists group_url_en text not null default '';

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
    'programs_3',
    'Нова програма', 'New programme',
    'Здравословно хранене за заети хора', 'Healthy Eating for Busy People',
    'кратки видеа · 10-12 мин', 'short videos · 10-12 min',
    '€39', '€39',
    'Бързи идеи за здравословна вечеря с познати продукти – за най-натоварените дни.',
    'Quick healthy dinner ideas with everyday ingredients – for your busiest days.',
    array[
      'Кратки видеа по 10-12 минути',
      '23 идеи за вечеря и 5 за обяд',
      'Списък за пазаруване и подготовка за седмицата'
    ],
    array[
      'Short 10-12 minute videos',
      '23 dinner and 5 lunch ideas',
      'Shopping list and weekly prep'
    ],
    'Виж цената', 'See price',
    '/programs/kuhnya', '/programs/kuhnya',
    '/images/kuhnya-cover.jpg', false, 40
  )
on conflict (placement_key) do nothing;

insert into public.site_cta_placements (key, label_bg, label_en) values
  (
    'programs_3',
    'Програми: „Здравословно хранене за заети хора“ - бутон на картичката',
    'Programs: “Healthy Eating for Busy People” - card button'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';
