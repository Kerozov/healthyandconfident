-- Healthy & Confident — initial schema
-- Run in the Supabase SQL editor (or via `bun run db:migrate`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Blog posts (bilingual: one row per locale + slug)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  locale          text not null check (locale in ('bg', 'en')),
  slug            text not null,
  title           text not null,
  excerpt         text not null default '',
  content         text not null default '',           -- markdown
  cover_image     text,
  author          text not null default 'Vessie Ney',
  tags            text[] not null default '{}',
  seo_title       text,
  seo_description text,
  reading_minutes int not null default 4,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  featured        boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists blog_posts_locale_status_idx
  on public.blog_posts (locale, status, published_at desc);

-- ─────────────────────────────────────────────────────────────
-- Subscribers (email + optional phone for SMS), with segmentation
-- ─────────────────────────────────────────────────────────────
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  phone       text,
  locale      text not null default 'bg' check (locale in ('bg', 'en')),
  source      text not null default 'popup',          -- popup | lead-magnet | manual | import
  status      text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  tags        text[] not null default '{}',           -- segments
  consent     boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (email)
);

create index if not exists subscribers_status_idx on public.subscribers (status);
create index if not exists subscribers_tags_idx on public.subscribers using gin (tags);

-- ─────────────────────────────────────────────────────────────
-- Segments (named lists for the admin UI)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.segments (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,                   -- used as a tag value
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.segments (key, name, description) values
  ('all', 'All subscribers', 'Everyone who opted in'),
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Popup configuration (one row per locale)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.popup_config (
  id              uuid primary key default gen_random_uuid(),
  locale          text not null unique check (locale in ('bg', 'en')),
  enabled         boolean not null default true,
  title           text not null default '',
  message         text not null default '',
  cta_label       text not null default '',
  success_message text not null default '',
  image_url       text,
  segment_tag     text not null default 'all',        -- tag applied to captured emails
  delay_seconds   int not null default 6,
  updated_at      timestamptz not null default now()
);

insert into public.popup_config (locale, enabled, title, message, cta_label, success_message)
values
  ('bg', true,
   'Безплатно: Наръчник за енергия',
   'Вземи безплатното 2-дневно меню за стройна фигура и трикове за повече енергия — директно в пощата ти.',
   'Изпрати ми го',
   'Готово! Провери пощата си. 🎉'),
  ('en', true,
   'FREE: Tame Your Cravings',
   'Get the free 2-day slimming menu and learn how to set yourself free from cravings.',
   'Send it to me',
   'Done! Check your inbox. 🎉')
on conflict (locale) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Email campaigns (sent via the notification-worker)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  html             text not null,
  locale           text,
  segment_tag      text not null default 'all',
  recipients_count int not null default 0,
  worker_job_id    text,                              -- job id returned by the worker
  status           text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'scheduled', 'failed')),
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  error            text,
  created_at       timestamptz not null default now()
);

create index if not exists email_campaigns_created_idx on public.email_campaigns (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- SMS campaigns (sent via the SMS notifier — wired later)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sms_campaigns (
  id               uuid primary key default gen_random_uuid(),
  message          text not null,
  segment_tag      text not null default 'all',
  recipients_count int not null default 0,
  provider_ref     text,
  status           text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  sent_at          timestamptz,
  error            text,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

drop trigger if exists subscribers_updated_at on public.subscribers;
create trigger subscribers_updated_at before update on public.subscribers
  for each row execute function public.set_updated_at();
