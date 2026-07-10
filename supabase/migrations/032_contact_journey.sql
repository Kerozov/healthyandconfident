-- Contact journey: payment status, worker job tracking, events timeline

create table if not exists public.contacts (
  id                    uuid primary key references public.subscribers(id) on delete cascade,
  email                 text not null,
  name                  text,
  payment_status        text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  paid_at               timestamptz,
  last_stripe_session_id text,
  zoom_attended         boolean not null default false,
  zoom_last_joined_at   timestamptz,
  zoom_last_left_at     timestamptz,
  zoom_total_minutes    int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists contacts_email_idx on public.contacts (email);
create index if not exists contacts_payment_status_idx on public.contacts (payment_status);

create table if not exists public.contact_worker_jobs (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  worker_job_id    text not null,
  sequence_key     text not null,
  idempotency_key  text,
  status           text not null default 'pending'
    check (status in ('pending', 'canceled', 'sent', 'failed')),
  scheduled_at     timestamptz,
  canceled_at      timestamptz,
  created_at       timestamptz not null default now()
);

create unique index if not exists contact_worker_jobs_idempotency_idx
  on public.contact_worker_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists contact_worker_jobs_contact_sequence_idx
  on public.contact_worker_jobs (contact_id, sequence_key, status);

create table if not exists public.contact_events (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references public.contacts(id) on delete cascade,
  event_type     text not null,
  source         text,
  campaign_id    text,
  worker_job_id  text,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists contact_events_contact_idx
  on public.contact_events (contact_id, created_at desc);

create index if not exists contact_events_type_idx
  on public.contact_events (event_type);

-- Backfill contacts from existing subscribers
insert into public.contacts (id, email, name)
select s.id, s.email, s.name
from public.subscribers s
on conflict (id) do nothing;

notify pgrst, 'reload schema';
