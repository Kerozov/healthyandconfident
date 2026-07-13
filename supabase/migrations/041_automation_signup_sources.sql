-- Optional signup-source filter on automations (not segments).

alter table public.automations
  add column if not exists signup_sources text[] not null default '{}';
