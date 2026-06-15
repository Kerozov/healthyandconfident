-- ═══════════════════════════════════════════════════════════════
-- Healthy & Confident — run this ONCE in Supabase SQL Editor
-- Dashboard → SQL → New query → Paste → Run
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- 002: campaign tracking columns
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

-- 003: audience targeting + bounce count
alter table public.email_campaigns
  add column if not exists bounced_count int not null default 0,
  add column if not exists target_tags text[];

alter table public.sms_campaigns
  add column if not exists target_tags text[];

-- Verify (optional — should show the new columns)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'email_campaigns'
  and column_name in (
    'target_tags', 'bounced_count', 'opened_count',
    'delivered_count', 'not_opened_count', 'last_synced_at'
  )
order by column_name;

-- 004: SMS scheduling
alter table public.sms_campaigns
  add column if not exists worker_job_id text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists sent_count int not null default 0,
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
