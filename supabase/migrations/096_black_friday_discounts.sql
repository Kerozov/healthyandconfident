-- 096: Black Friday discounts and bundles built from the site's own catalog
--
-- Instead of packages typed in by hand with their own Payment Link (092), the
-- admin picks what is already sold on the site and sets the discount:
--   - an offer      (`product:<site_products.id>`),
--   - a guide       (`guide:<site_guides.id>`),
--   - a programme   (`program:<site_cta_placements.key>` — the card's pay button).
-- The regular price is always read from Stripe; Checkout charges the
-- discounted amount on the same Stripe product, so the purchase lands on the
-- same groups, automations and course codes as a full-price sale.
--
-- The campaign itself (on/off, start, end, banner, early access) stays in
-- `site_black_friday` from 092.

create table if not exists public.black_friday_discounts (
  item_key        text primary key
                  check (item_key ~ '^(product|guide|program):[A-Za-z0-9_-]+$'),
  -- percent: % off; amount: euro off; price: the final price in euro.
  discount_type   text not null check (discount_type in ('percent', 'amount', 'price')),
  discount_value  numeric(10, 2) not null check (discount_value > 0),
  enabled         boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint black_friday_discount_percent_check
    check (discount_type <> 'percent' or discount_value < 100)
);

create table if not exists public.black_friday_bundles (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null default '' check (char_length(title_bg) <= 160),
  title_en        text not null default '' check (char_length(title_en) <= 160),
  description_bg  text not null default '' check (char_length(description_bg) <= 600),
  description_en  text not null default '' check (char_length(description_en) <= 600),
  badge_bg        text not null default '' check (char_length(badge_bg) <= 40),
  badge_en        text not null default '' check (char_length(badge_en) <= 40),
  item_keys       text[] not null check (cardinality(item_keys) between 2 and 6),
  -- percent: % off the sum of the items; price: the bundle's final price in euro.
  price_type      text not null check (price_type in ('percent', 'price')),
  price_value     numeric(10, 2) not null check (price_value > 0),
  enabled         boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint black_friday_bundle_percent_check
    check (price_type <> 'percent' or price_value < 100)
);

create index if not exists black_friday_bundles_sort_idx
  on public.black_friday_bundles (sort_order, created_at);

drop trigger if exists black_friday_discounts_updated_at on public.black_friday_discounts;
create trigger black_friday_discounts_updated_at before update on public.black_friday_discounts
  for each row execute function public.set_updated_at();

drop trigger if exists black_friday_bundles_updated_at on public.black_friday_bundles;
create trigger black_friday_bundles_updated_at before update on public.black_friday_bundles
  for each row execute function public.set_updated_at();

alter table public.black_friday_discounts enable row level security;
alter table public.black_friday_bundles enable row level security;

-- Both the admin and the public page read these on the server with the
-- service role; the anon key never needs them.
grant select, insert, update, delete on public.black_friday_discounts to service_role;
grant select, insert, update, delete on public.black_friday_bundles to service_role;

notify pgrst, 'reload schema';
