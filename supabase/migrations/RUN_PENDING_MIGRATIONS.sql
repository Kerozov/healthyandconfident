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

-- 004: SMS schedule (worker job id stored in provider_ref)
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

-- 006: automated transactional emails
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

insert into public.automated_emails (trigger, locale, enabled, subject, html) values
  ('registration', 'bg', false, 'Добре дошла, {{name}}!',
   '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас.</p>'),
  ('registration', 'en', false, 'Welcome, {{name}}!',
   '<h1>Hi {{name}}!</h1><p>Thanks for signing up.</p>'),
  ('purchase', 'bg', false, 'Благодарим за покупката, {{name}}!',
   '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти.</p>'),
  ('purchase', 'en', false, 'Thank you for your purchase, {{name}}!',
   '<h1>Hi {{name}}!</h1><p>We received your order.</p>')
on conflict (trigger, locale) do nothing;

notify pgrst, 'reload schema';

select 'Upgrade complete' as result;
