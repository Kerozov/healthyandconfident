-- ═══════════════════════════════════════════════════════════════
-- UPGRADE ONLY — run AFTER 001_init.sql
-- Fresh project? Use SETUP_DATABASE.sql instead (one file, full schema).
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_campaigns'
  ) THEN
    RAISE EXCEPTION
      'Table email_campaigns does not exist. Run SETUP_DATABASE.sql first (fresh DB) or 001_init.sql then re-run this file.';
  END IF;
END $$;

-- 002: campaign tracking
alter table public.email_campaigns
  add column if not exists sent_count           int not null default 0,
  add column if not exists failed_count         int not null default 0,
  add column if not exists opened_count         int not null default 0,
  add column if not exists machine_opened_count int not null default 0,
  add column if not exists delivered_count      int not null default 0,
  add column if not exists not_opened_count     int not null default 0,
  add column if not exists total_count          int not null default 0,
  add column if not exists last_synced_at       timestamptz,
  add column if not exists parent_campaign_id   uuid
    references public.email_campaigns(id) on delete set null;

alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;

alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status in (
    'draft', 'queued', 'sending', 'sent', 'scheduled',
    'failed', 'partial', 'canceled'
  ));

create index if not exists email_campaigns_parent_idx
  on public.email_campaigns (parent_campaign_id);

-- 003: audience + bounces (email only)
alter table public.email_campaigns
  add column if not exists bounced_count int not null default 0,
  add column if not exists target_tags text[];

-- 004–005: SMS columns
alter table public.sms_campaigns
  add column if not exists scheduled_at timestamptz;

alter table public.sms_campaigns
  add column if not exists sent_count int not null default 0;

alter table public.sms_campaigns
  add column if not exists failed_count int not null default 0;

alter table public.sms_campaigns
  drop constraint if exists sms_campaigns_status_check;

alter table public.sms_campaigns
  add constraint sms_campaigns_status_check
  check (status in (
    'draft', 'queued', 'scheduled', 'sending', 'sent', 'failed', 'partial', 'canceled'
  ));

create index if not exists sms_campaigns_scheduled_idx
  on public.sms_campaigns (scheduled_at desc nulls last);

-- 006: legacy automated_emails (optional)
create table if not exists public.automated_emails (
  id         uuid primary key default gen_random_uuid(),
  trigger    text not null check (trigger in ('registration', 'purchase')),
  locale     text not null check (locale in ('bg', 'en')),
  enabled    boolean not null default false,
  subject    text not null default '',
  html       text not null default '',
  updated_at timestamptz not null default now(),
  unique (trigger, locale)
);

-- 007: automations — run full file:
-- supabase/migrations/007_automations.sql

-- 008: automation delays
alter table public.automations
  add column if not exists delay_days int not null default 0;

alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped'));

alter table public.automation_deliveries
  add column if not exists scheduled_for timestamptz;

-- 009: canceled deliveries
alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped', 'canceled'));

-- 010: delivery tracking (opens, bounces)
alter table public.automation_deliveries
  add column if not exists recipient_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_synced_at timestamptz;

alter table public.automations
  add column if not exists send_time text not null default '09:00';

alter table public.automations
  add column if not exists send_date date;

-- 012: Website CMS (events + Stripe upsell)
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

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists site_events_updated_at on public.site_events;
create trigger site_events_updated_at before update on public.site_events
  for each row execute function public.set_updated_at();

drop trigger if exists site_products_updated_at on public.site_products;
create trigger site_products_updated_at before update on public.site_products
  for each row execute function public.set_updated_at();

drop trigger if exists site_sections_updated_at on public.site_sections;
create trigger site_sections_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

-- 014: segment subgroups (parent → child)
alter table public.segments
  add column if not exists parent_id uuid references public.segments(id) on delete set null;

create index if not exists segments_parent_idx on public.segments (parent_id);

notify pgrst, 'reload schema';

select 'Upgrade complete — also run 007_automations.sql if not yet applied' as result;
