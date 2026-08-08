-- 049: FunnelBrand contact sync
--
-- The site pulls its own contacts from FunnelBrand's export endpoint. This table
-- remembers where the last run stopped, so a sync only fetches what is new.

create table if not exists public.integration_sync_state (
  integration text primary key,
  -- Newest `created_at` seen upstream; sent back as `since` on the next run.
  last_cursor text,
  last_run_at timestamptz,
  last_created int not null default 0,
  last_updated int not null default 0,
  last_skipped int not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

-- Only service-role writes here; the anon key must never see sync internals.
alter table public.integration_sync_state enable row level security;
revoke all on public.integration_sync_state from anon, authenticated;

notify pgrst, 'reload schema';
