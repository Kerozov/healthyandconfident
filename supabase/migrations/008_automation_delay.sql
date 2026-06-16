-- Delayed automations (worker schedules send_at)

alter table public.automations
  add column if not exists delay_days int not null default 0;

alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped'));

alter table public.automation_deliveries
  add column if not exists scheduled_for timestamptz;

notify pgrst, 'reload schema';
