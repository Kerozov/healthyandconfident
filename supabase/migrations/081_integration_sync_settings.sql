-- 081: per-integration settings for contact syncs
--
-- FunnelBrand sync lets the admin route each funnel's contacts into a segment of
-- their choice. The last choice is remembered here so the next sync starts from it.

alter table public.integration_sync_state
  add column if not exists settings jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
