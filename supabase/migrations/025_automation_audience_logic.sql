-- Automation audience: AND/OR include rules + exclude groups/segments

alter table public.automations
  add column if not exists audience_logic text not null default 'any'
    check (audience_logic in ('any', 'all'));

alter table public.automations
  add column if not exists exclude_group_ids uuid[] not null default '{}';

alter table public.automations
  add column if not exists exclude_segment_keys text[] not null default '{}';

notify pgrst, 'reload schema';
