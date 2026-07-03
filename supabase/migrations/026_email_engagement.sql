-- Email engagement: button clicks + campaign per-recipient rows

alter table public.automation_deliveries
  add column if not exists click_count int not null default 0;

alter table public.automation_deliveries
  add column if not exists first_clicked_at timestamptz;

alter table public.email_campaigns
  add column if not exists clicked_count int not null default 0;

create table if not exists public.campaign_deliveries (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.email_campaigns(id) on delete cascade,
  subscriber_id    uuid references public.subscribers(id) on delete set null,
  email            text not null,
  worker_job_id    text,
  status           text not null default 'sent'
    check (status in ('scheduled', 'sent', 'failed', 'canceled')),
  recipient_status text,
  opened_at        timestamptz,
  delivered_at     timestamptz,
  click_count      int not null default 0,
  first_clicked_at timestamptz,
  sent_at          timestamptz not null default now(),
  last_synced_at   timestamptz
);

create index if not exists campaign_deliveries_campaign_idx
  on public.campaign_deliveries (campaign_id);

create index if not exists campaign_deliveries_email_idx
  on public.campaign_deliveries (email);

create unique index if not exists campaign_deliveries_job_uidx
  on public.campaign_deliveries (worker_job_id)
  where worker_job_id is not null;

create table if not exists public.email_link_clicks (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in ('campaign', 'automation')),
  source_id     uuid not null,
  email         text not null,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  target_url    text,
  clicked_at    timestamptz not null default now()
);

create index if not exists email_link_clicks_email_idx
  on public.email_link_clicks (email);

create index if not exists email_link_clicks_source_idx
  on public.email_link_clicks (source_type, source_id);

notify pgrst, 'reload schema';
