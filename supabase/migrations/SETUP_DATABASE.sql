-- ═══════════════════════════════════════════════════════════════
-- Healthy & Confident — FULL database setup (fresh Supabase project)
-- Run this ONCE in Supabase SQL Editor if you have NO tables yet.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- Blog
create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  locale          text not null check (locale in ('bg', 'en')),
  slug            text not null,
  title           text not null,
  excerpt         text not null default '',
  content         text not null default '',
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

-- Subscribers
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  phone       text,
  locale      text not null default 'bg' check (locale in ('bg', 'en')),
  source      text not null default 'popup',
  status      text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  tags        text[] not null default '{}',
  consent     boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (email)
);

create index if not exists subscribers_status_idx on public.subscribers (status);
create index if not exists subscribers_tags_idx on public.subscribers using gin (tags);

-- Segments
create table if not exists public.segments (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
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

-- Popup
create table if not exists public.popup_config (
  id              uuid primary key default gen_random_uuid(),
  locale          text not null unique check (locale in ('bg', 'en')),
  enabled         boolean not null default true,
  title           text not null default '',
  message         text not null default '',
  cta_label       text not null default '',
  success_message text not null default '',
  image_url       text,
  segment_tag     text not null default 'all',
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

-- Automated emails (registration, purchase)
create table if not exists public.automated_emails (
  id         uuid primary key default gen_random_uuid(),
  trigger    text not null check (trigger in ('registration', 'purchase')),
  locale     text not null check (locale in ('bg', 'en')),
  enabled    boolean not null default false,
  subject    text not null default '',
  html       text not null default '',
  updated_at timestamptz not null default now(),
  unique (trigger, locale)
);

insert into public.automated_emails (trigger, locale, enabled, subject, html) values
  ('registration', 'bg', false, 'Добре дошла, {{name}}!',
   '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас.</p>'),
  ('registration', 'en', false, 'Welcome, {{name}}!',
   '<h1>Hi {{name}}!</h1><p>Thanks for signing up.</p>'),
  ('purchase', 'bg', false, 'Благодарим за покупката, {{name}}!',
   '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти.</p>'),
  ('purchase', 'en', false, 'Thank you for your purchase, {{name}}!',
   '<h1>Hi {{name}}!</h1><p>We received your order.</p>')
on conflict (trigger, locale) do nothing;

-- Automations (email + SMS rules)
create table if not exists public.automations (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  channel                     text not null check (channel in ('email', 'sms')),
  trigger_event               text not null check (trigger_event in (
    'registration', 'purchase', 'new_subscriber'
  )),
  enabled                     boolean not null default false,
  segment_keys                text[] not null default '{}',
  new_subscribers_only        boolean not null default true,
  after_automation_id         uuid references public.automations(id) on delete set null,
  subject_bg                  text not null default '',
  html_bg                     text not null default '',
  subject_en                  text not null default '',
  html_en                     text not null default '',
  sms_bg                      text not null default '',
  sms_en                      text not null default '',
  sort_order                  int not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table if not exists public.automation_deliveries (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references public.automations(id) on delete cascade,
  subscriber_id   uuid references public.subscribers(id) on delete set null,
  email           text not null,
  phone           text,
  channel         text not null check (channel in ('email', 'sms')),
  status          text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  worker_job_id   text,
  error           text,
  sent_at         timestamptz not null default now(),
  unique (automation_id, email)
);

create index if not exists automation_deliveries_automation_idx
  on public.automation_deliveries (automation_id, sent_at desc);

insert into public.automations (
  name, channel, trigger_event, enabled, new_subscribers_only,
  subject_bg, html_bg, subject_en, html_en, sort_order
) values
  (
    'Welcome after signup', 'email', 'registration', false, true,
    'Добре дошла, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас.</p>',
    'Welcome, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>Thanks for signing up.</p>',
    10
  ),
  (
    'Thank you after purchase', 'email', 'purchase', false, false,
    'Благодарим за покупката, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти.</p>',
    'Thank you for your purchase, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>We received your order.</p>',
    20
  );

-- Email campaigns (full schema)
create table if not exists public.email_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  subject              text not null,
  html                 text not null,
  locale               text,
  segment_tag          text not null default 'all',
  target_tags          text[],
  recipients_count     int not null default 0,
  worker_job_id        text,
  status               text not null default 'draft' check (status in (
    'draft', 'queued', 'sending', 'sent', 'scheduled',
    'failed', 'partial', 'canceled'
  )),
  scheduled_at         timestamptz,
  sent_at              timestamptz,
  error                text,
  sent_count           int not null default 0,
  failed_count         int not null default 0,
  opened_count         int not null default 0,
  machine_opened_count int not null default 0,
  delivered_count      int not null default 0,
  not_opened_count     int not null default 0,
  bounced_count        int not null default 0,
  total_count          int not null default 0,
  last_synced_at       timestamptz,
  parent_campaign_id   uuid references public.email_campaigns(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists email_campaigns_created_idx
  on public.email_campaigns (created_at desc);
create index if not exists email_campaigns_parent_idx
  on public.email_campaigns (parent_campaign_id);

-- Upgrade existing email_campaigns (if 001 ran before SETUP)
alter table public.email_campaigns
  add column if not exists sent_count int not null default 0,
  add column if not exists failed_count int not null default 0,
  add column if not exists opened_count int not null default 0,
  add column if not exists delivered_count int not null default 0,
  add column if not exists not_opened_count int not null default 0,
  add column if not exists bounced_count int not null default 0,
  add column if not exists total_count int not null default 0,
  add column if not exists last_synced_at timestamptz,
  add column if not exists target_tags text[],
  add column if not exists parent_campaign_id uuid;

alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;
alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status in (
    'draft', 'queued', 'sending', 'sent', 'scheduled',
    'failed', 'partial', 'canceled'
  ));

-- SMS campaigns (log + worker job ref — delivery stats live in worker)
create table if not exists public.sms_campaigns (
  id               uuid primary key default gen_random_uuid(),
  message          text not null,
  segment_tag      text not null default 'all',
  recipients_count int not null default 0,
  provider_ref     text,
  sent_count       int not null default 0,
  failed_count     int not null default 0,
  status           text not null default 'draft' check (status in (
    'draft', 'queued', 'scheduled', 'sending', 'sent', 'failed', 'partial', 'canceled'
  )),
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  error            text,
  created_at       timestamptz not null default now()
);

create index if not exists sms_campaigns_scheduled_idx
  on public.sms_campaigns (scheduled_at desc nulls last);

-- Upgrade old sms_campaigns tables (001 had fewer status values)
alter table public.sms_campaigns
  add column if not exists scheduled_at timestamptz;

alter table public.sms_campaigns
  add column if not exists sent_count int not null default 0;

alter table public.sms_campaigns
  add column if not exists failed_count int not null default 0;

alter table public.sms_campaigns
  drop constraint if exists sms_campaigns_status_check;

alter table public.sms_campaigns
  add constraint sms_campaigns_status_check
  check (status in (
    'draft', 'queued', 'scheduled', 'sending', 'sent', 'failed', 'partial', 'canceled'
  ));

-- updated_at trigger
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

-- Done
select 'Setup complete' as result;
