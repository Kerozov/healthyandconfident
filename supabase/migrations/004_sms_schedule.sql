-- SMS scheduling + worker job tracking
-- Run after 003_campaign_audience.sql

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
