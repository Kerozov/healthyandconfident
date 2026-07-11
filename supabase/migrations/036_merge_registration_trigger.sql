-- Merge "registration" (site signup) into "new_subscriber".
-- Audience tags (e.g. exclude "manual") replace the old trigger split.

update public.automations
set trigger_event = 'new_subscriber'
where trigger_event = 'registration';

alter table public.automations
  drop constraint if exists automations_trigger_event_check;

alter table public.automations
  add constraint automations_trigger_event_check
  check (trigger_event in ('purchase', 'new_subscriber'));

notify pgrst, 'reload schema';
