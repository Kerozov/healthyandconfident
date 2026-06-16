-- SMS delivery counts synced from notification-worker
alter table public.sms_campaigns
  add column if not exists sent_count int not null default 0;

alter table public.sms_campaigns
  add column if not exists failed_count int not null default 0;

-- Refresh PostgREST schema cache (Supabase API)
notify pgrst, 'reload schema';
