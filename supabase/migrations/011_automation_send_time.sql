-- Send time (Europe/Sofia wall clock) on the target day

alter table public.automations
  add column if not exists send_time text not null default '09:00';

notify pgrst, 'reload schema';
