-- Run in Supabase SQL Editor if automations page errors on missing columns / schema cache.
-- Safe to run multiple times.

alter table public.automations
  add column if not exists delay_days int not null default 0;

alter table public.automations
  add column if not exists delay_minutes int not null default 0;

alter table public.automations
  add column if not exists send_time text not null default '09:00';

alter table public.automations
  add column if not exists send_date date;

alter table public.automations
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_url_bg text not null default '',
  add column if not exists cta_label_en text not null default '',
  add column if not exists cta_url_en text not null default '';

alter table public.email_campaigns
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '';

alter table public.automation_deliveries
  add column if not exists scheduled_for timestamptz,
  add column if not exists recipient_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_synced_at timestamptz;

alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped', 'canceled'));

create index if not exists automation_deliveries_status_idx
  on public.automation_deliveries (automation_id, status);

-- 030: PDF attachments + link labels
alter table public.email_link_clicks
  add column if not exists link_label text;

alter table public.email_campaigns
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

alter table public.automations
  add column if not exists attachment_path_bg text,
  add column if not exists attachment_filename_bg text,
  add column if not exists attachment_path_en text,
  add column if not exists attachment_filename_en text;

alter table public.form_templates
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

-- 031: purchase-specific automations
alter table public.site_products
  add column if not exists purchase_tags text[] not null default '{}';

alter table public.automations
  add column if not exists purchase_product_ids uuid[] not null default '{}';

alter table public.automations
  add column if not exists signup_sources text[] not null default '{}';

alter table public.automations
  add column if not exists hero_image_url_bg text,
  add column if not exists hero_image_url_en text;

alter table public.email_campaigns
  add column if not exists hero_image_url text;

alter table public.form_templates
  add column if not exists hero_image_url text;

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

select 'Automation columns OK' as result;
