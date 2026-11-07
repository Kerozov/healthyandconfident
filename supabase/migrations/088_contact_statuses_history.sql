-- 088: CRM statuses for people in the list, and a per-person history
--
-- Only the main admin defines the statuses (Абонати → Статуси). Anyone who can
-- see the subscribers can set one on a person, with a comment. The subscriber
-- row keeps the current status, who set it and when; `subscriber_history`
-- keeps every change, plus group changes and Launchify arrivals, so the person
-- screen can show who did what.
--
-- The history copies the status name and colour: renaming or deleting a status
-- later must not rewrite what the history says happened.

create table if not exists public.contact_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default 'slate',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contact_statuses_name_lower_key
  on public.contact_statuses (lower(name));

alter table public.subscribers
  add column if not exists crm_status_id uuid
    references public.contact_statuses (id) on delete set null,
  add column if not exists crm_status_comment text,
  add column if not exists crm_status_changed_at timestamptz,
  add column if not exists crm_status_changed_by text;

create index if not exists subscribers_crm_status_id_idx
  on public.subscribers (crm_status_id);

create table if not exists public.subscriber_history (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null
    references public.subscribers (id) on delete cascade,
  kind text not null check (kind in ('status', 'groups', 'sync')),
  status_id uuid references public.contact_statuses (id) on delete set null,
  status_name text,
  status_color text,
  previous_status_name text,
  comment text,
  details jsonb not null default '{}'::jsonb,
  -- No FK: the virtual owner has no admin_users row, and removing a team
  -- member must not erase what they did.
  actor_id uuid,
  actor_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists subscriber_history_subscriber_created_idx
  on public.subscriber_history (subscriber_id, created_at desc);

alter table public.contact_statuses enable row level security;
alter table public.subscriber_history enable row level security;

grant select, insert, update, delete on public.contact_statuses to service_role;
grant select, insert, update, delete on public.subscriber_history to service_role;

notify pgrst, 'reload schema';
