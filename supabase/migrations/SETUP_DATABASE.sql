-- ═══════════════════════════════════════════════════════════════
-- Healthy & Confident — FULL database setup (fresh Supabase project)
-- Run this ONCE in Supabase SQL Editor if you have NO tables yet.
-- Already have tables? Use RUN_PENDING_MIGRATIONS.sql (+ 007 if needed).
--
-- Schema includes:
--   blog, subscribers, segments, popup
--   automations (email/SMS, delay_days, send_time, send_date)
--   automation_deliveries (scheduled, opens, bounces)
--   site_sections / site_events / site_products (Admin → Website)
--   email_campaigns, sms_campaigns
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Blog ───────────────────────────────────────────────────────
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

-- ── Subscribers ────────────────────────────────────────────────
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

-- ── Segments ───────────────────────────────────────────────────
create table if not exists public.segments (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  parent_id   uuid references public.segments(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Existing DBs: table may exist without parent_id from older schema
alter table public.segments
  add column if not exists parent_id uuid references public.segments(id) on delete set null;

create index if not exists segments_parent_idx on public.segments (parent_id);

insert into public.segments (key, name, description) values
  ('all', 'All subscribers', 'Everyone who opted in'),
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience')
on conflict (key) do nothing;

-- ── Popup ──────────────────────────────────────────────────────
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

-- ── Legacy automated_emails (optional — superseded by automations) ──
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

-- ── Automations (email + SMS rules) ────────────────────────────
create table if not exists public.automations (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  channel              text not null check (channel in ('email', 'sms')),
  trigger_event        text not null check (trigger_event in (
    'registration', 'purchase', 'new_subscriber'
  )),
  enabled              boolean not null default false,
  segment_keys         text[] not null default '{}',
  new_subscribers_only boolean not null default true,
  after_automation_id  uuid references public.automations(id) on delete set null,
  delay_days           int not null default 0,
  send_time            text not null default '09:00',
  send_date            date,
  subject_bg           text not null default '',
  html_bg              text not null default '',
  cta_label_bg         text not null default '',
  cta_url_bg           text not null default '',
  subject_en           text not null default '',
  html_en              text not null default '',
  cta_label_en         text not null default '',
  cta_url_en           text not null default '',
  sms_bg               text not null default '',
  sms_en               text not null default '',
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.automation_deliveries (
  id               uuid primary key default gen_random_uuid(),
  automation_id    uuid not null references public.automations(id) on delete cascade,
  subscriber_id    uuid references public.subscribers(id) on delete set null,
  email            text not null,
  phone            text,
  channel          text not null check (channel in ('email', 'sms')),
  status           text not null default 'sent' check (status in (
    'scheduled', 'sent', 'failed', 'skipped', 'canceled'
  )),
  worker_job_id    text,
  error            text,
  scheduled_for    timestamptz,
  sent_at          timestamptz not null default now(),
  recipient_status text,
  opened_at        timestamptz,
  delivered_at     timestamptz,
  last_synced_at   timestamptz,
  unique (automation_id, email)
);

create index if not exists automation_deliveries_automation_idx
  on public.automation_deliveries (automation_id, sent_at desc);

create index if not exists automation_deliveries_status_idx
  on public.automation_deliveries (automation_id, status);

insert into public.automations (
  name, channel, trigger_event, enabled, new_subscribers_only,
  subject_bg, html_bg, subject_en, html_en, sort_order
)
select * from (values
  (
    'Welcome after signup'::text, 'email'::text, 'new_subscriber'::text,
    false, true,
    'Добре дошла, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас.</p>',
    'Welcome, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>Thanks for signing up.</p>',
    10
  ),
  (
    'Thank you after purchase', 'email', 'purchase',
    false, false,
    'Благодарим за покупката, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти.</p>',
    'Thank you for your purchase, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>We received your order.</p>',
    20
  )
) as v(name, channel, trigger_event, enabled, new_subscribers_only,
       subject_bg, html_bg, subject_en, html_en, sort_order)
where not exists (select 1 from public.automations limit 1);

-- ── Website CMS (Admin → Website: events + Stripe upsell) ────
create table if not exists public.site_sections (
  key         text primary key,
  enabled     boolean not null default false,
  title_bg    text not null default '',
  title_en    text not null default '',
  updated_at  timestamptz not null default now()
);

insert into public.site_sections (key, enabled, title_bg, title_en)
values
  ('events', false, 'Предстоящи събития', 'Upcoming events'),
  ('products', false, 'Upsell / Downsell', 'Upsell / Downsell')
on conflict (key) do nothing;

create table if not exists public.site_events (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  url             text not null,
  image_url       text,
  event_date      date,
  offer_id        uuid references public.site_products(id) on delete set null,
  offer_headline_bg text not null default '',
  offer_headline_en text not null default '',
  offer_enabled   boolean not null default false,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_events_sort_idx
  on public.site_events (enabled, sort_order, created_at desc);

create table if not exists public.site_products (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  offer_type      text not null default 'upsell' check (offer_type in ('upsell', 'downsell')),
  headline_bg     text not null default '',
  headline_en     text not null default '',
  cta_label_bg    text not null default '',
  cta_label_en    text not null default '',
  audience_tags   text[] not null default '{}',
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_products_sort_idx
  on public.site_products (enabled, sort_order, created_at desc);

create table if not exists public.site_cta_placements (
  key               text primary key,
  label_bg          text not null,
  label_en          text not null,
  offer_id          uuid references public.site_products(id) on delete set null,
  offer_headline_bg text not null default '',
  offer_headline_en text not null default '',
  offer_enabled     boolean not null default false,
  updated_at        timestamptz not null default now()
);

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('hero_primary', 'Начало — златен бутон „Виж програмите“ (hero)', 'Home — gold “View programs” button (hero)'),
  ('hero_secondary', 'Начало — втори бутон „Безплатен наръчник“ (hero)', 'Home — secondary lead magnet button (hero)'),
  ('nav_cta', 'Горно меню — „Запиши безплатен разговор“', 'Top navigation — book a free call CTA'),
  ('contact_cta', 'Контакти — основен бутон (WhatsApp / запис)', 'Contact section — main booking button'),
  ('about_cta', 'За мен — бутон към контакт', 'About section — button to contact'),
  ('programs_0', 'Програми — бутон на първата карта', 'Programs — first program card button'),
  ('programs_1', 'Програми — бутон на втората карта', 'Programs — second program card button'),
  ('programs_2', 'Програми — бутон на третата карта', 'Programs — third program card button')
on conflict (key) do nothing;

-- ── Email campaigns ────────────────────────────────────────────
create table if not exists public.email_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  subject              text not null,
  html                 text not null,
  cta_label            text not null default '',
  cta_url              text not null default '',
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

-- ── SMS campaigns ────────────────────────────────────────────────
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

-- ── updated_at triggers ────────────────────────────────────────
drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

drop trigger if exists subscribers_updated_at on public.subscribers;
create trigger subscribers_updated_at before update on public.subscribers
  for each row execute function public.set_updated_at();

drop trigger if exists automations_updated_at on public.automations;
create trigger automations_updated_at before update on public.automations
  for each row execute function public.set_updated_at();

drop trigger if exists site_events_updated_at on public.site_events;
create trigger site_events_updated_at before update on public.site_events
  for each row execute function public.set_updated_at();

drop trigger if exists site_products_updated_at on public.site_products;
create trigger site_products_updated_at before update on public.site_products
  for each row execute function public.set_updated_at();

drop trigger if exists site_sections_updated_at on public.site_sections;
create trigger site_sections_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

drop trigger if exists site_cta_placements_updated_at on public.site_cta_placements;
create trigger site_cta_placements_updated_at before update on public.site_cta_placements
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

select 'Setup complete' as result;
