-- 050: First-party site visits — pageviews, unique people, traffic sources.
-- Service-role only. No IP addresses stored.

create table if not exists public.site_visits (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  event           text not null default 'pageview'
    check (event in ('pageview', 'lead', 'checkout')),
  visitor_id      text not null,
  session_id      text not null,
  path            text not null,
  locale          text,
  referrer_host   text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  source          text not null default 'direct',
  device          text not null default 'desktop'
    check (device in ('mobile', 'tablet', 'desktop'))
);

create index if not exists site_visits_created_idx
  on public.site_visits (created_at desc);

create index if not exists site_visits_event_created_idx
  on public.site_visits (event, created_at desc);

create index if not exists site_visits_visitor_idx
  on public.site_visits (visitor_id, created_at desc);

create index if not exists site_visits_session_idx
  on public.site_visits (session_id);

create index if not exists site_visits_path_idx
  on public.site_visits (path, created_at desc);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

notify pgrst, 'reload schema';
