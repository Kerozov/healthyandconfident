-- Raw Zoom session rows (all participants) + webhook debug log.

create table if not exists public.zoom_session_events (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid references public.contacts(id) on delete set null,
  meeting_id        text not null,
  email             text,
  participant_name  text,
  join_time         timestamptz,
  leave_time        timestamptz not null default now(),
  duration_minutes  int not null default 0,
  zoom_event        text,
  created_at        timestamptz not null default now()
);

create index if not exists zoom_session_events_meeting_idx
  on public.zoom_session_events (meeting_id, leave_time desc);

create index if not exists zoom_session_events_email_idx
  on public.zoom_session_events (email, leave_time desc)
  where email is not null;

create table if not exists public.zoom_webhook_log (
  id          uuid primary key default gen_random_uuid(),
  zoom_event  text not null,
  meeting_id  text,
  email       text,
  status      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists zoom_webhook_log_created_idx
  on public.zoom_webhook_log (created_at desc);
