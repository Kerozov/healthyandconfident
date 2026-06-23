-- Fixed calendar date for automations + CMS sections (events, Stripe products)

alter table public.automations
  add column if not exists send_date date;

create table if not exists public.site_sections (
  key         text primary key,
  enabled     boolean not null default false,
  title_bg    text not null default '',
  title_en    text not null default '',
  updated_at  timestamptz not null default now()
);

insert into public.site_sections (key, enabled, title_bg, title_en)
values
  ('events', false, 'Предстоящи събития', 'Upcoming events'),
  ('products', false, 'Продукти', 'Products')
on conflict (key) do nothing;

create table if not exists public.site_events (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  url             text not null,
  image_url       text,
  event_date      date,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_events_sort_idx
  on public.site_events (enabled, sort_order, created_at desc);

create table if not exists public.site_products (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_products_sort_idx
  on public.site_products (enabled, sort_order, created_at desc);

drop trigger if exists site_events_updated_at on public.site_events;
create trigger site_events_updated_at before update on public.site_events
  for each row execute function public.set_updated_at();

drop trigger if exists site_products_updated_at on public.site_products;
create trigger site_products_updated_at before update on public.site_products
  for each row execute function public.set_updated_at();

drop trigger if exists site_sections_updated_at on public.site_sections;
create trigger site_sections_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
