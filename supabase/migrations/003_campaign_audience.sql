-- Campaign audience targeting + bounce tracking
-- Run after 002_campaign_tracking.sql

alter table public.email_campaigns
  add column if not exists bounced_count int not null default 0,
  add column if not exists target_tags text[];

alter table public.sms_campaigns
  add column if not exists target_tags text[];
