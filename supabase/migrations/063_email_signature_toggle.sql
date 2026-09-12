-- Per-campaign / per-automation opt-out for the global email signature block.
alter table email_campaigns
  add column if not exists signature_enabled boolean not null default true;

alter table automations
  add column if not exists signature_enabled boolean not null default true;

notify pgrst, 'reload schema';
