-- 078: "didn't receive" issues an admin has looked at and chose to ignore.
--
-- Statistics lists everyone an automation step did not reach (no delivery row
-- at all, failed, skipped, bounced) with the reason. Ignoring one hides it
-- from that list without touching the delivery row — the catch-up and the
-- automation's own report keep working from the real status.

create table if not exists public.delivery_issue_ignores (
  automation_id uuid not null references public.automations(id) on delete cascade,
  email text not null,
  ignored_at timestamptz not null default now(),
  ignored_by text,
  primary key (automation_id, email)
);

alter table public.delivery_issue_ignores enable row level security;

notify pgrst, 'reload schema';
