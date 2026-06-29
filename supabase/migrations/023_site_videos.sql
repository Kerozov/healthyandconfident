-- YouTube video embeds for homepage "Inspiring stories" section (admin-managed).

insert into public.site_sections (key, enabled, title_bg, title_en)
values ('videos', false, 'Вдъхновяващи истории', 'Inspiring stories')
on conflict (key) do nothing;

create table if not exists public.site_videos (
  id           uuid primary key default gen_random_uuid(),
  title_bg     text not null default '',
  title_en     text not null default '',
  youtube_url  text not null,
  enabled      boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists site_videos_sort_idx
  on public.site_videos (enabled, sort_order, created_at desc);

drop trigger if exists site_videos_updated_at on public.site_videos;
create trigger site_videos_updated_at before update on public.site_videos
  for each row execute function public.set_updated_at();
