-- Minutes after previous automation (chain spacing without day delay).
-- Safe to run multiple times.

alter table public.automations
  add column if not exists delay_minutes int not null default 0;

notify pgrst, 'reload schema';
