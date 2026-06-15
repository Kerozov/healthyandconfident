-- Healthy & Confident — campaign tracking + resend support
-- Run in the Supabase SQL editor after 001_init.sql.

alter table public.email_campaigns
  add column if not exists sent_count          int not null default 0,
  add column if not exists failed_count        int not null default 0,
  add column if not exists opened_count        int not null default 0,
  add column if not exists machine_opened_count int not null default 0,
  add column if not exists delivered_count     int not null default 0,
  add column if not exists not_opened_count    int not null default 0,
  add column if not exists total_count         int not null default 0,
  add column if not exists last_synced_at      timestamptz,
  add column if not exists parent_campaign_id  uuid
    references public.email_campaigns(id) on delete set null;

-- Allow richer statuses (partial sends + canceled)
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
