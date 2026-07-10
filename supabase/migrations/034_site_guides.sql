-- Guides section (admin-managed, similar to shop products)

insert into public.site_sections (key, enabled, title_bg, title_en)
values ('guides', false, 'Ръководства', 'Guides')
on conflict (key) do nothing;

create table if not exists public.site_guides (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  stripe_price_id text not null default '',
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_guides_sort_idx
  on public.site_guides (enabled, sort_order, created_at desc);

drop trigger if exists site_guides_updated_at on public.site_guides;
create trigger site_guides_updated_at before update on public.site_guides
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
