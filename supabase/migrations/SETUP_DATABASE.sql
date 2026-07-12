-- ═══════════════════════════════════════════════════════════════
-- Healthy & Confident — FULL database setup
-- Run in Supabase → SQL Editor.
--
-- • НОВА база: създава всички таблици от нулата.
-- • СЪЩЕСТВУВАЩА база: безопасно за повторно пускане — секцията
--   UPGRADE по-долу добавя липсващи колони (вкл. purchase_product_ids).
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
  first_name  text,
  last_name   text,
  facebook_url text,
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

-- ── Segment groups + segments ──────────────────────────────────
create table if not exists public.segment_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  parent_id   uuid references public.segment_groups(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists segment_groups_parent_idx
  on public.segment_groups (parent_id);

create table if not exists public.segments (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  group_id    uuid references public.segment_groups(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists segments_group_idx on public.segments (group_id);

insert into public.segments (key, name, description) values
  ('all', 'All subscribers', 'Everyone who opted in'),
  ('free-menu', 'Free menu', 'Signed up for the free menu lead magnet'),
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
    'purchase', 'new_subscriber'
  )),
  enabled              boolean not null default false,
  segment_keys         text[] not null default '{}',
  group_ids            uuid[] not null default '{}',
  audience_logic       text not null default 'any'
    check (audience_logic in ('any', 'all')),
  exclude_group_ids    uuid[] not null default '{}',
  exclude_segment_keys text[] not null default '{}',
  new_subscribers_only boolean not null default true,
  after_automation_id  uuid references public.automations(id) on delete set null,
  delay_days           int not null default 0,
  delay_minutes        int not null default 0,
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
  attachment_path_bg   text,
  attachment_filename_bg text,
  attachment_path_en   text,
  attachment_filename_en text,
  purchase_product_ids uuid[] not null default '{}',
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
  click_count      int not null default 0,
  first_clicked_at timestamptz,
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
  ('products', false, 'Специални програми', 'Programs & products'),
  ('videos', false, 'Вдъхновяващи истории', 'Inspiring stories'),
  ('guides', false, 'Ръководства', 'Guides')
on conflict (key) do nothing;

create table if not exists public.site_products (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  stripe_product_id text not null default '',
  stripe_price_id text not null default '',
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  offer_type      text not null default 'upsell' check (offer_type in ('upsell', 'downsell')),
  headline_bg     text not null default '',
  headline_en     text not null default '',
  cta_label_bg    text not null default '',
  cta_label_en    text not null default '',
  audience_tags   text[] not null default '{}',
  purchase_tags   text[] not null default '{}',
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_products_sort_idx
  on public.site_products (enabled, sort_order, created_at desc);

create table if not exists public.site_guides (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  stripe_price_id text not null default '',
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_guides_sort_idx
  on public.site_guides (enabled, sort_order, created_at desc);

create table if not exists public.subscriber_purchases (
  id                 uuid primary key default gen_random_uuid(),
  subscriber_id      uuid references public.subscribers(id) on delete set null,
  email              text not null,
  product_id         uuid references public.site_products(id) on delete set null,
  stripe_session_id  text,
  stripe_price_id    text,
  stripe_product_id  text,
  payment_status     text not null default 'paid',
  amount_cents       int,
  currency           text,
  purchased_at       timestamptz not null default now()
);

alter table public.subscriber_purchases
  drop constraint if exists subscriber_purchases_payment_status_check;

alter table public.subscriber_purchases
  add constraint subscriber_purchases_payment_status_check
  check (payment_status in ('paid', 'refunded', 'failed'));

create unique index if not exists subscriber_purchases_session_product_idx
  on public.subscriber_purchases (stripe_session_id, product_id);

create unique index if not exists subscriber_purchases_session_stripe_product_idx
  on public.subscriber_purchases (stripe_session_id, stripe_product_id)
  where stripe_session_id is not null
    and stripe_product_id is not null
    and stripe_product_id <> '';

create index if not exists subscriber_purchases_email_idx
  on public.subscriber_purchases (email, purchased_at desc);

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
  ('programs_0', 'Програми — картичка „Гарнитури“ (€3)', 'Programs — “Side dishes” card (€3)'),
  ('programs_1', 'Програма „Живей без резистентност“ — бутон „Кандидатствай“', 'Program “Live Without Resistance” — “Apply now” button'),
  ('programs_2', 'Програма „Препрограмирай апетита“ — бутон „Научи повече“', 'Program “Reprogram Your Appetite” — “Learn more” button'),
  ('about_cta', 'Секция „За мен“ — бутон „Работи с мен“', 'About section — “Work with me” button'),
  ('outcomes_cta', 'Секция „Резултати“ — бутон „Запиши безплатен разговор“', 'Outcomes section — “Book a free call” button'),
  ('leadmagnet_cta', 'Безплатно 2-дневно меню — popup след запис на имейл', 'Free 2-day menu — popup after email signup'),
  ('contact_cta', 'Контакти — WhatsApp (без popup)', 'Contact — WhatsApp (no popup)'),
  ('hero_primary', 'Начало — златен бутон „Виж програмите“ (hero)', 'Home — gold “View programs” button (hero)'),
  ('hero_secondary', 'Начало — втори бутон „Безплатен наръчник“ (hero)', 'Home — secondary lead magnet button (hero)'),
  ('nav_cta', 'Горно меню — „Запиши безплатен разговор“', 'Top navigation — book a free call CTA')
on conflict (key) do nothing;

update public.site_cta_placements
set offer_enabled = false, offer_id = null
where key in ('hero_primary', 'hero_secondary', 'nav_cta', 'contact_cta');

insert into public.site_cta_placements (key, label_bg, label_en)
select
  'product_' || id::text,
  'Магазин: „' || title_bg || '“ — доп. оферта преди Stripe',
  'Shop: “' || title_en || '” — extra offer before Stripe checkout'
from public.site_products
on conflict (key) do update set
  label_bg = excluded.label_bg,
  label_en = excluded.label_en;

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
  clicked_count        int not null default 0,
  attachment_path      text,
  attachment_filename  text,
  last_synced_at       timestamptz,
  parent_campaign_id   uuid references public.email_campaigns(id) on delete set null,
  created_at           timestamptz not null default now()
);

create table if not exists public.campaign_deliveries (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.email_campaigns(id) on delete cascade,
  subscriber_id    uuid references public.subscribers(id) on delete set null,
  email            text not null,
  worker_job_id    text,
  status           text not null default 'sent'
    check (status in ('scheduled', 'sent', 'failed', 'canceled')),
  recipient_status text,
  opened_at        timestamptz,
  delivered_at     timestamptz,
  click_count      int not null default 0,
  first_clicked_at timestamptz,
  sent_at          timestamptz not null default now(),
  last_synced_at   timestamptz
);

create index if not exists campaign_deliveries_campaign_idx
  on public.campaign_deliveries (campaign_id);

create index if not exists campaign_deliveries_email_idx
  on public.campaign_deliveries (email);

create unique index if not exists campaign_deliveries_job_uidx
  on public.campaign_deliveries (worker_job_id)
  where worker_job_id is not null;

create table if not exists public.email_link_clicks (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in ('campaign', 'automation')),
  source_id     uuid not null,
  email         text not null,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  target_url    text,
  link_label    text,
  clicked_at    timestamptz not null default now()
);

create index if not exists email_link_clicks_email_idx
  on public.email_link_clicks (email);

create index if not exists email_link_clicks_source_idx
  on public.email_link_clicks (source_type, source_id);

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

drop trigger if exists site_guides_updated_at on public.site_guides;
create trigger site_guides_updated_at before update on public.site_guides
  for each row execute function public.set_updated_at();

drop trigger if exists site_videos_updated_at on public.site_videos;
create trigger site_videos_updated_at before update on public.site_videos
  for each row execute function public.set_updated_at();

drop trigger if exists site_sections_updated_at on public.site_sections;
create trigger site_sections_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

drop trigger if exists site_cta_placements_updated_at on public.site_cta_placements;
create trigger site_cta_placements_updated_at before update on public.site_cta_placements
  for each row execute function public.set_updated_at();

-- ── Supabase Storage (site images) ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
on storage.objects for select
to public
using (bucket_id = 'media');

-- ── Dynamic forms ───────────────────────────────────────────────
create table if not exists public.form_templates (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  title_bg         text not null default '',
  title_en         text not null default '',
  description_bg   text not null default '',
  description_en   text not null default '',
  fields           jsonb not null default '[]',
  settings         jsonb not null default '{}',
  email_subject_bg text not null default '',
  email_subject_en text not null default '',
  email_intro_bg   text not null default '',
  email_intro_en   text not null default '',
  attachment_path  text,
  attachment_filename text,
  enabled          boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.form_templates(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  email         text,
  answers       jsonb not null default '{}',
  submitted_at  timestamptz not null default now()
);

create index if not exists form_submissions_form_idx
  on public.form_submissions (form_id, submitted_at desc);

create table if not exists public.form_invitations (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.form_templates(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  email         text not null,
  token         text not null unique,
  sent_at       timestamptz not null default now(),
  completed_at  timestamptz
);

drop trigger if exists form_templates_updated_at on public.form_templates;
create trigger form_templates_updated_at before update on public.form_templates
  for each row execute function public.set_updated_at();

-- ── Contact journey (payment, worker jobs, Zoom events) ────────
create table if not exists public.contacts (
  id                     uuid primary key references public.subscribers(id) on delete cascade,
  email                  text not null,
  name                   text,
  payment_status         text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  paid_at                timestamptz,
  last_stripe_session_id text,
  zoom_attended          boolean not null default false,
  zoom_last_joined_at    timestamptz,
  zoom_last_left_at      timestamptz,
  zoom_total_minutes     int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists contacts_email_idx on public.contacts (email);
create index if not exists contacts_payment_status_idx on public.contacts (payment_status);

create table if not exists public.contact_worker_jobs (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  worker_job_id   text not null,
  sequence_key    text not null,
  idempotency_key text,
  status          text not null default 'pending'
    check (status in ('pending', 'canceled', 'sent', 'failed')),
  scheduled_at    timestamptz,
  canceled_at     timestamptz,
  created_at      timestamptz not null default now()
);

create unique index if not exists contact_worker_jobs_idempotency_idx
  on public.contact_worker_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists contact_worker_jobs_contact_sequence_idx
  on public.contact_worker_jobs (contact_id, sequence_key, status);

create table if not exists public.contact_events (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  event_type    text not null,
  source        text,
  campaign_id   text,
  worker_job_id text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists contact_events_contact_idx
  on public.contact_events (contact_id, created_at desc);

create index if not exists contact_events_type_idx
  on public.contact_events (event_type);

insert into public.contacts (id, email, name)
select s.id, s.email, s.name
from public.subscribers s
on conflict (id) do nothing;

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ── Email footer ───────────────────────────────────────────────
create table if not exists public.email_footer_config (
  id                  uuid primary key default gen_random_uuid(),
  locale              text not null unique check (locale in ('bg', 'en')),
  signature_enabled   boolean not null default true,
  signature_image_url text,
  signature_closing   text not null default '',
  signature_name      text not null default '',
  signature_title     text not null default '',
  signature_email     text not null default '',
  signature_phone     text not null default '',
  brand_name          text not null default '',
  brand_color         text not null default '#2563eb',
  website_url         text not null default '',
  footer_email        text not null default '',
  footer_phone        text not null default '',
  address_line1       text not null default '',
  address_line2       text not null default '',
  facebook_url        text,
  youtube_url         text,
  disclaimer          text not null default '',
  preferences_url     text,
  updated_at          timestamptz not null default now()
);

insert into public.email_footer_config (
  locale, signature_closing, signature_name, signature_title,
  signature_email, signature_phone, brand_name, website_url,
  footer_email, footer_phone, address_line1, address_line2, disclaimer
)
values
  ('bg', '❤️ С обич и подкрепа,', 'Веси',
   'Холистичен Диетолог B.Med.Sc. (Hons) & СПРАВЯНЕ с Инсулинова резистентност и Диабет 2',
   'vessie@healthyandconfident.co.uk', '00 44 7876 565 263', 'Healthy and Confident',
   'https://www.healthyandconfident.co.uk/bg', 'vessie@healthyandconfident.co.uk',
   'M: 0044 7876 565 263', 'Фарнбъро', 'Обединеното кралство',
   'Получихте този имейл, защото сте се регистрирали на наша платформа или сте участвали в наше обучение или програма.'),
  ('en', 'With love and support,', 'Vesi',
   'Holistic Dietitian B.Med.Sc. (Hons) — insulin resistance & type 2 diabetes',
   'vessie@healthyandconfident.co.uk', '00 44 7876 565 263', 'Healthy and Confident',
   'https://www.healthyandconfident.co.uk/en', 'vessie@healthyandconfident.co.uk',
   'M: 0044 7876 565 263', 'Farnborough', 'United Kingdom',
   'You received this email because you registered on our platform or took part in one of our trainings or programmes.')
on conflict (locale) do nothing;

-- ═══════════════════════════════════════════════════════════════
-- UPGRADE (idempotent) — fixes existing databases missing new columns
-- If you see "Could not find column in schema cache", run THIS FILE again.
-- ═══════════════════════════════════════════════════════════════

-- subscribers profile
alter table public.subscribers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists facebook_url text;

-- automations: attachments + purchase filter
alter table public.automations
  add column if not exists delay_days int not null default 0,
  add column if not exists delay_minutes int not null default 0,
  add column if not exists send_time text not null default '09:00',
  add column if not exists send_date date,
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_url_bg text not null default '',
  add column if not exists cta_label_en text not null default '',
  add column if not exists cta_url_en text not null default '',
  add column if not exists group_ids uuid[] not null default '{}',
  add column if not exists audience_logic text not null default 'any',
  add column if not exists exclude_group_ids uuid[] not null default '{}',
  add column if not exists exclude_segment_keys text[] not null default '{}',
  add column if not exists attachment_path_bg text,
  add column if not exists attachment_filename_bg text,
  add column if not exists attachment_path_en text,
  add column if not exists attachment_filename_en text,
  add column if not exists purchase_product_ids uuid[] not null default '{}';

-- site products
alter table public.site_products
  add column if not exists stripe_product_id text not null default '',
  add column if not exists stripe_price_id text not null default '',
  add column if not exists offer_type text not null default 'upsell',
  add column if not exists headline_bg text not null default '',
  add column if not exists headline_en text not null default '',
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_label_en text not null default '',
  add column if not exists audience_tags text[] not null default '{}',
  add column if not exists purchase_tags text[] not null default '{}';

-- email campaigns
alter table public.email_campaigns
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '',
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text,
  add column if not exists clicked_count int not null default 0,
  add column if not exists bounced_count int not null default 0,
  add column if not exists target_tags text[],
  add column if not exists machine_opened_count int not null default 0,
  add column if not exists not_opened_count int not null default 0,
  add column if not exists parent_campaign_id uuid references public.email_campaigns(id) on delete set null;

-- engagement clicks
alter table public.email_link_clicks
  add column if not exists link_label text;

alter table public.automation_deliveries
  add column if not exists scheduled_for timestamptz,
  add column if not exists recipient_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists click_count int not null default 0,
  add column if not exists first_clicked_at timestamptz,
  add column if not exists last_synced_at timestamptz;

alter table public.form_templates
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

-- purchase history
create table if not exists public.subscriber_purchases (
  id                 uuid primary key default gen_random_uuid(),
  subscriber_id      uuid references public.subscribers(id) on delete set null,
  email              text not null,
  product_id         uuid references public.site_products(id) on delete set null,
  stripe_session_id  text,
  stripe_price_id    text,
  stripe_product_id  text,
  payment_status     text not null default 'paid',
  amount_cents       int,
  currency           text,
  purchased_at       timestamptz not null default now()
);

alter table public.subscriber_purchases
  drop constraint if exists subscriber_purchases_payment_status_check;

alter table public.subscriber_purchases
  add constraint subscriber_purchases_payment_status_check
  check (payment_status in ('paid', 'refunded', 'failed'));

create unique index if not exists subscriber_purchases_session_product_idx
  on public.subscriber_purchases (stripe_session_id, product_id);

create unique index if not exists subscriber_purchases_session_stripe_product_idx
  on public.subscriber_purchases (stripe_session_id, stripe_product_id)
  where stripe_session_id is not null
    and stripe_product_id is not null
    and stripe_product_id <> '';

create index if not exists subscriber_purchases_email_idx
  on public.subscriber_purchases (email, purchased_at desc);

-- guides section
insert into public.site_sections (key, enabled, title_bg, title_en)
values ('guides', false, 'Ръководства', 'Guides')
on conflict (key) do nothing;

create table if not exists public.site_guides (
  id              uuid primary key default gen_random_uuid(),
  title_bg        text not null,
  title_en        text not null,
  description_bg  text not null default '',
  description_en  text not null default '',
  stripe_url      text not null,
  stripe_price_id text not null default '',
  price_label_bg  text not null default '',
  price_label_en  text not null default '',
  image_url       text,
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_guides_sort_idx
  on public.site_guides (enabled, sort_order, created_at desc);

drop trigger if exists site_guides_updated_at on public.site_guides;
create trigger site_guides_updated_at before update on public.site_guides
  for each row execute function public.set_updated_at();

-- contact journey
create table if not exists public.contacts (
  id                     uuid primary key references public.subscribers(id) on delete cascade,
  email                  text not null,
  name                   text,
  payment_status         text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  paid_at                timestamptz,
  last_stripe_session_id text,
  zoom_attended          boolean not null default false,
  zoom_last_joined_at    timestamptz,
  zoom_last_left_at      timestamptz,
  zoom_total_minutes     int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists contacts_email_idx on public.contacts (email);
create index if not exists contacts_payment_status_idx on public.contacts (payment_status);

create table if not exists public.contact_worker_jobs (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  worker_job_id   text not null,
  sequence_key    text not null,
  idempotency_key text,
  status          text not null default 'pending'
    check (status in ('pending', 'canceled', 'sent', 'failed')),
  scheduled_at    timestamptz,
  canceled_at     timestamptz,
  created_at      timestamptz not null default now()
);

create unique index if not exists contact_worker_jobs_idempotency_idx
  on public.contact_worker_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists contact_worker_jobs_contact_sequence_idx
  on public.contact_worker_jobs (contact_id, sequence_key, status);

create table if not exists public.contact_events (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  event_type    text not null,
  source        text,
  campaign_id   text,
  worker_job_id text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists contact_events_contact_idx
  on public.contact_events (contact_id, created_at desc);

create index if not exists contact_events_type_idx
  on public.contact_events (event_type);

insert into public.contacts (id, email, name)
select s.id, s.email, s.name
from public.subscribers s
on conflict (id) do nothing;

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

select 'Setup complete — schema up to date (incl. purchase_product_ids)' as result;
