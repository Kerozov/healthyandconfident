-- Per-delivery open/delivery tracking (synced from notification-worker)

alter table public.automation_deliveries
  add column if not exists recipient_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_synced_at timestamptz;

create index if not exists automation_deliveries_status_idx
  on public.automation_deliveries (automation_id, status);

notify pgrst, 'reload schema';
