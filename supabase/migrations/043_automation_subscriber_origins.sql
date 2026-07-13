-- 043: granular subscriber origin filter (new / re-signup / manual / import)
alter table public.automations
  add column if not exists subscriber_origins text[] not null default '{}';

-- Backfill from legacy boolean
update public.automations
set subscriber_origins = case
  when new_subscribers_only = false then
    array['new', 'existing_registered', 'manual', 'import']::text[]
  else
    array['new', 'existing_registered']::text[]
end
where coalesce(array_length(subscriber_origins, 1), 0) = 0;
