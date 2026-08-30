-- Upsell / downsell: offer types, per-event & per-button placements

alter table public.site_products
  add column if not exists offer_type text not null default 'upsell'
    check (offer_type in ('upsell', 'downsell'));

alter table public.site_products
  add column if not exists headline_bg text not null default '',
  add column if not exists headline_en text not null default '',
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_label_en text not null default '';

alter table public.site_events
  add column if not exists offer_id uuid references public.site_products(id) on delete set null,
  add column if not exists offer_headline_bg text not null default '',
  add column if not exists offer_headline_en text not null default '',
  add column if not exists offer_enabled boolean not null default false;

create table if not exists public.site_cta_placements (
  key               text primary key,
  label_bg          text not null,
  label_en          text not null,
  offer_id          uuid references public.site_products(id) on delete set null,
  offer_headline_bg text not null default '',
  offer_headline_en text not null default '',
  offer_enabled     boolean not null default false,
  updated_at        timestamptz not null default now()
);

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('hero_primary', 'Hero — основен бутон', 'Hero — primary button'),
  ('hero_secondary', 'Hero — втори бутон', 'Hero — secondary button'),
  ('nav_cta', 'Навигация — CTA', 'Navigation — CTA'),
  ('contact_cta', 'Контакти — бутон', 'Contact — button'),
  ('about_cta', 'За мен — бутон', 'About — button'),
  ('programs_0', 'Програма 1 — бутон', 'Program 1 — button'),
  ('programs_1', 'Програма 2 — бутон', 'Program 2 — button'),
  ('programs_2', 'Програма 3 — бутон', 'Program 3 — button')
on conflict (key) do nothing;

update public.site_sections
set title_bg = 'Upsell / Downsell', title_en = 'Upsell / Downsell'
where key = 'products';

drop trigger if exists site_cta_placements_updated_at on public.site_cta_placements;
create trigger site_cta_placements_updated_at before update on public.site_cta_placements
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
