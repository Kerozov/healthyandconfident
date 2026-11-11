-- 092: Black Friday bundles („пакети“) and campaign settings
--
-- A bundle is a Black Friday package sold through one Stripe Payment Link
-- („21 дни“ + два PDF за 39 € и т.н.). The admin creates each package in
-- Админ → Пакети: заглавие, какво включва, стара цена, нова цена, бонус и
-- линк за плащане. The public page `/black-friday` and the top banner read the
-- same rows, so a package created here appears on the site immediately.

create table if not exists public.site_bundles (
  id               uuid primary key default gen_random_uuid(),
  slug             text,
  title_bg         text not null default '',
  title_en         text not null default '',
  subtitle_bg      text not null default '',
  subtitle_en      text not null default '',
  includes_bg      text[] not null default '{}',
  includes_en      text[] not null default '{}',
  old_price_bg     text not null default '',
  old_price_en     text not null default '',
  price_bg         text not null default '',
  price_en         text not null default '',
  bonus_bg         text not null default '',
  bonus_en         text not null default '',
  cta_label_bg     text not null default '',
  cta_label_en     text not null default '',
  stripe_url       text not null default '',
  stripe_url_en    text not null default '',
  image_url        text,
  badge_bg         text not null default '',
  badge_en         text not null default '',
  highlight        boolean not null default false,
  enabled          boolean not null default false,
  enabled_en       boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists site_bundles_slug_key
  on public.site_bundles (slug)
  where slug is not null and slug <> '';

create index if not exists site_bundles_sort_idx
  on public.site_bundles (sort_order, created_at);

create table if not exists public.site_black_friday (
  id                       uuid primary key default gen_random_uuid(),
  enabled                  boolean not null default false,
  deadline                 timestamptz,
  early_access_deadline    timestamptz,
  early_access_form_slug   text not null default '',
  banner_text_bg           text not null default '',
  banner_text_en           text not null default '',
  banner_href              text not null default '/black-friday',
  updated_at               timestamptz not null default now()
);

drop trigger if exists site_bundles_updated_at on public.site_bundles;
create trigger site_bundles_updated_at before update on public.site_bundles
  for each row execute function public.set_updated_at();

drop trigger if exists site_black_friday_updated_at on public.site_black_friday;
create trigger site_black_friday_updated_at before update on public.site_black_friday
  for each row execute function public.set_updated_at();

alter table public.site_bundles enable row level security;
alter table public.site_black_friday enable row level security;

-- Admin writes through the service role (bypasses RLS).
grant select, insert, update, delete on public.site_bundles to service_role;
grant select, insert, update, delete on public.site_black_friday to service_role;

-- The public site reads both with the anon key — read-only, like the other
-- site_* tables.
grant select on public.site_bundles to anon, authenticated;
grant select on public.site_black_friday to anon, authenticated;

drop policy if exists "public read" on public.site_bundles;
create policy "public read" on public.site_bundles
  for select to anon, authenticated using (true);

drop policy if exists "public read" on public.site_black_friday;
create policy "public read" on public.site_black_friday
  for select to anon, authenticated using (true);

notify pgrst, 'reload schema';
