-- 091: what we know about a person, from sources that have no other home
--
-- Launchify sends each contact's form answers, a message and the ticket type.
-- The sync used to keep only the name and phone and drop the rest. Each answer
-- is now kept here, one row per source and question, so the person screen can
-- show it next to the answers from the site's own questionnaires.

create table if not exists public.subscriber_facts (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null
    references public.subscribers (id) on delete cascade,
  -- 'launchify', 'import', …
  source text not null,
  -- Where inside the source, e.g. the webinar name. Empty when there is one.
  source_label text not null default '',
  label text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (subscriber_id, source, source_label, label)
);

create index if not exists subscriber_facts_subscriber_idx
  on public.subscriber_facts (subscriber_id);

alter table public.subscriber_facts enable row level security;

grant select, insert, update, delete on public.subscriber_facts to service_role;

notify pgrst, 'reload schema';
