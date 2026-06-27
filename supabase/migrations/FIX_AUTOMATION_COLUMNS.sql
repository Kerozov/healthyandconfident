-- Run in Supabase SQL Editor if automations page errors on delay_days / schema cache.
-- Safe to run multiple times.

alter table public.automations
  add column if not exists delay_days int not null default 0;

alter table public.automations
  add column if not exists send_time text not null default '09:00';

alter table public.automations
  add column if not exists send_date date;

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

notify pgrst, 'reload schema';

select 'Automation columns OK' as result;
