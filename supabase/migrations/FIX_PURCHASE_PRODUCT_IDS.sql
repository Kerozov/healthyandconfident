-- Run in Supabase → SQL Editor if you see:
--   Could not find the 'purchase_product_ids' column of 'automations' in the schema cache
-- Safe to run multiple times.

alter table public.site_products
  add column if not exists purchase_tags text[] not null default '{}';

alter table public.automations
  add column if not exists purchase_product_ids uuid[] not null default '{}';

alter table public.automations
  add column if not exists attachment_path_bg text,
  add column if not exists attachment_filename_bg text,
  add column if not exists attachment_path_en text,
  add column if not exists attachment_filename_en text;

create table if not exists public.subscriber_purchases (
  id                 uuid primary key default gen_random_uuid(),
  subscriber_id      uuid references public.subscribers(id) on delete set null,
  email              text not null,
  product_id         uuid references public.site_products(id) on delete set null,
  stripe_session_id  text,
  stripe_price_id    text,
  purchased_at       timestamptz not null default now()
);

create unique index if not exists subscriber_purchases_session_product_idx
  on public.subscriber_purchases (stripe_session_id, product_id);

create index if not exists subscriber_purchases_email_idx
  on public.subscriber_purchases (email, purchased_at desc);

notify pgrst, 'reload schema';

select 'purchase_product_ids column added' as result;
