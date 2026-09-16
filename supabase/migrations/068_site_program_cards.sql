-- 068: the programme cards in the home page section „Програми“ become content.
--
-- The three cards lived in i18n/dictionaries/{bg,en}.ts, so adding a fourth,
-- hiding one for a season, repointing a button or swapping a photo all meant a
-- code change. They move into a table the admin screen edits, seeded with
-- exactly what the dictionaries hold today so the live page does not change.
--
-- `placement_key` keeps the card tied to its site_cta_placements row
-- (programs_0 / programs_1 / programs_2), so the Stripe wiring and the upsell
-- offers already configured for these buttons keep working.

insert into public.site_sections (key, enabled, title_bg, title_en)
values ('programs', true, '', '')
on conflict (key) do nothing;

create table if not exists public.site_program_cards (
  id              uuid primary key default gen_random_uuid(),
  placement_key   text not null unique,
  badge_bg        text not null default '',
  badge_en        text not null default '',
  title_bg        text not null,
  title_en        text not null default '',
  duration_bg     text not null default '',
  duration_en     text not null default '',
  price_bg        text not null default '',
  price_en        text not null default '',
  description_bg  text not null default '',
  description_en  text not null default '',
  features_bg     text[] not null default '{}',
  features_en     text[] not null default '{}',
  cta_label_bg    text not null default '',
  cta_label_en    text not null default '',
  -- Where the button sends the visitor: „/programs/…“ and „#contact“ are our
  -- own pages (the locale prefix is added when the link is rendered), anything
  -- starting with http is an external link opened in a new tab.
  href            text not null default '',
  href_en         text not null default '',
  image_url       text,
  highlight       boolean not null default false,
  enabled         boolean not null default true,
  enabled_en      boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_program_cards_sort_idx
  on public.site_program_cards (sort_order, created_at);

drop trigger if exists site_program_cards_updated_at on public.site_program_cards;
create trigger site_program_cards_updated_at before update on public.site_program_cards
  for each row execute function public.set_updated_at();

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
    'programs_0',
    'Летен пакет', 'Summer package',
    'Лято – стройна и спокойна', 'Summer — slim and calm',
    '60 дни достъп', '60 days of access',
    '€36', '€36',
    'Наслади се на морето, сладоледа и вечерите с приятели – без чувство за вина и без през септември да започваш отначало.',
    'Enjoy the sea, the ice cream and the evenings with friends — without guilt, and without starting over in September.',
    array[
      'Ръководства за ресторант, хотел, all inclusive и барбекю',
      '12 лесни летни рецепти + snack guide и mocktails',
      'SOS аудио практики за моментите извън ритъм'
    ],
    array[
      'Guides for restaurants, hotels, all inclusive and barbecues',
      '12 easy summer recipes plus a snack guide and mocktails',
      'SOS audio practices for the moments you slip'
    ],
    'Искам моето спокойно лято', 'I want my calm summer',
    '/programs/summer-programme', '/programs/summer-programme',
    '/images/11.jpg', false, 10
  ),
  (
    'programs_1',
    'Най-избирана', 'Most popular',
    'Живей без резистентност', 'Live Without Resistance',
    '3 месеца', '3 months',
    'групова програма', 'group program',
    'Свали 5-10-15 кг трайно и/или се справи с инсулиновата резистентност с пълна подкрепа.',
    'Lose 5–15 kg sustainably and tackle insulin resistance with full support.',
    array[
      'Вкусно меню за цялото семейство',
      'Без часове в кухнята и специални магазини',
      'Структура, мотивация и подкрепа'
    ],
    array[
      'Whole-family friendly meals',
      'No hours in the kitchen',
      'Structure, motivation and support'
    ],
    'Кандидатствай', 'Apply now',
    '/programs/zhivey-bez-rezistentnost', '/programs/zhivey-bez-rezistentnost',
    '/images/7.jpg', true, 20
  ),
  (
    'programs_2',
    'Само 7-10 мин/ден', '7–10 min/day',
    'Препрограмирай апетита', 'Reprogram Your Appetite',
    'ежедневно', 'daily',
    'достъпно', 'affordable',
    'Пусни стреса, блокажите и изкушенията към шоколад и тестени — само за 7-10 минути на ден.',
    'Release stress, blocks and cravings for chocolate and carbs — just 7–10 minutes a day.',
    array[
      'Кратки ежедневни практики',
      'Живот без постоянни изкушения',
      'Спокойствие и контрол'
    ],
    array[
      'Short daily practices',
      'Life without constant cravings',
      'Calm and control'
    ],
    'Научи повече', 'Learn more',
    '/programs/preprogramirai-apetita', '/programs/preprogramirai-apetita',
    '/images/12.jpg', false, 30
  )
on conflict (placement_key) do nothing;

notify pgrst, 'reload schema';
