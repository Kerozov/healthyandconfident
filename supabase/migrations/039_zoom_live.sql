-- Zoom live banner: webhook toggles is_live; admin sets join URL and optional meeting filter.

create table if not exists public.zoom_live_config (
  key                 text primary key default 'default',
  feature_enabled     boolean not null default true,
  watch_meeting_id    text,
  join_url            text not null default '',
  label_bg            text not null default 'Присъедини се на живо',
  label_en            text not null default 'Join live',
  manual_is_live      boolean not null default false,
  is_live             boolean not null default false,
  active_meeting_id   text,
  active_topic        text,
  live_started_at     timestamptz,
  updated_at          timestamptz not null default now()
);

insert into public.zoom_live_config (key)
values ('default')
on conflict (key) do nothing;

drop trigger if exists zoom_live_config_updated_at on public.zoom_live_config;
create trigger zoom_live_config_updated_at
  before update on public.zoom_live_config
  for each row execute function public.set_updated_at();
