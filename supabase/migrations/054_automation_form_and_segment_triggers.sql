-- Form-submit + first-time segment-entry automation triggers,
-- plus optional answer filters on the chosen form.

alter table public.automations
  drop constraint if exists automations_trigger_event_check;

alter table public.automations
  add constraint automations_trigger_event_check
  check (trigger_event in (
    'purchase',
    'new_subscriber',
    'form_submit',
    'segment_entry'
  ));

alter table public.automations
  add column if not exists trigger_form_id uuid
    references public.form_templates(id) on delete set null;

alter table public.automations
  add column if not exists form_answer_conditions jsonb not null default '[]';

create index if not exists automations_trigger_form_idx
  on public.automations (trigger_form_id)
  where trigger_form_id is not null;

notify pgrst, 'reload schema';
