-- ═══════════════════════════════════════════════════════════════
-- UPGRADE ONLY — run AFTER 001_init.sql
-- Fresh project? Use SETUP_DATABASE.sql instead (one file, full schema).
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_campaigns'
  ) THEN
    RAISE EXCEPTION
      'Table email_campaigns does not exist. Run SETUP_DATABASE.sql first (fresh DB) or 001_init.sql then re-run this file.';
  END IF;
END $$;

-- 002: campaign tracking
alter table public.email_campaigns
  add column if not exists sent_count           int not null default 0,
  add column if not exists failed_count         int not null default 0,
  add column if not exists opened_count         int not null default 0,
  add column if not exists machine_opened_count int not null default 0,
  add column if not exists delivered_count      int not null default 0,
  add column if not exists not_opened_count     int not null default 0,
  add column if not exists total_count          int not null default 0,
  add column if not exists last_synced_at       timestamptz,
  add column if not exists parent_campaign_id   uuid
    references public.email_campaigns(id) on delete set null;

alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;

alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status in (
    'draft', 'queued', 'sending', 'sent', 'scheduled',
    'failed', 'partial', 'canceled'
  ));

create index if not exists email_campaigns_parent_idx
  on public.email_campaigns (parent_campaign_id);

-- 003: audience + bounces (email only)
alter table public.email_campaigns
  add column if not exists bounced_count int not null default 0,
  add column if not exists target_tags text[];

-- 004–005: SMS columns
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

create index if not exists sms_campaigns_scheduled_idx
  on public.sms_campaigns (scheduled_at desc nulls last);

-- 006: legacy automated_emails (optional)
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

-- 007: automations — run full file:
-- supabase/migrations/007_automations.sql

-- 008: automation delays
alter table public.automations
  add column if not exists delay_days int not null default 0;

alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped'));

alter table public.automation_deliveries
  add column if not exists scheduled_for timestamptz;

-- 009: canceled deliveries
alter table public.automation_deliveries
  drop constraint if exists automation_deliveries_status_check;

alter table public.automation_deliveries
  add constraint automation_deliveries_status_check
  check (status in ('scheduled', 'sent', 'failed', 'skipped', 'canceled'));

-- 010: delivery tracking (opens, bounces)
alter table public.automation_deliveries
  add column if not exists recipient_status text,
  add column if not exists opened_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_synced_at timestamptz;

alter table public.automations
  add column if not exists send_time text not null default '09:00';

alter table public.automations
  add column if not exists send_date date;

-- 013: optional CTA button per automation email + campaigns
alter table public.automations
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_url_bg text not null default '',
  add column if not exists cta_label_en text not null default '',
  add column if not exists cta_url_en text not null default '';

alter table public.email_campaigns
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '';

-- 012: Website CMS (events + Stripe upsell)
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
  ('products', false, 'Продукти', 'Products')
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
  enabled         boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists site_products_sort_idx
  on public.site_products (enabled, sort_order, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists site_events_updated_at on public.site_events;
create trigger site_events_updated_at before update on public.site_events
  for each row execute function public.set_updated_at();

drop trigger if exists site_products_updated_at on public.site_products;
create trigger site_products_updated_at before update on public.site_products
  for each row execute function public.set_updated_at();

drop trigger if exists site_sections_updated_at on public.site_sections;
create trigger site_sections_updated_at before update on public.site_sections
  for each row execute function public.set_updated_at();

-- 013: upsell placements + product popup fields
alter table public.site_products
  add column if not exists offer_type text not null default 'upsell'
    check (offer_type in ('upsell', 'downsell'));

alter table public.site_products
  add column if not exists headline_bg text not null default '',
  add column if not exists headline_en text not null default '',
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_label_en text not null default '';

alter table public.site_events
  add column if not exists offer_id uuid references public.site_products(id) on delete set null,
  add column if not exists offer_headline_bg text not null default '',
  add column if not exists offer_headline_en text not null default '',
  add column if not exists offer_enabled boolean not null default false;

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
  ('hero_primary', 'Hero — основен бутон', 'Hero — primary button'),
  ('hero_secondary', 'Hero — втори бутон', 'Hero — secondary button'),
  ('nav_cta', 'Навигация — CTA', 'Navigation — CTA'),
  ('contact_cta', 'Контакти — бутон', 'Contact — button'),
  ('about_cta', 'За мен — бутон', 'About — button'),
  ('programs_0', 'Програма 1 — бутон', 'Program 1 — button'),
  ('programs_1', 'Програма 2 — бутон', 'Program 2 — button'),
  ('programs_2', 'Програма 3 — бутон', 'Program 3 — button')
on conflict (key) do nothing;

drop trigger if exists site_cta_placements_updated_at on public.site_cta_placements;
create trigger site_cta_placements_updated_at before update on public.site_cta_placements
  for each row execute function public.set_updated_at();

-- 014: audience tags (legacy column, kept for compatibility)
alter table public.site_products
  add column if not exists audience_tags text[] not null default '{}';

-- 015–017: speaking placement labels
update public.site_cta_placements set
  label_bg = 'Начало — златен бутон „Виж програмите“ (hero)',
  label_en = 'Home — gold “View programs” button (hero)'
where key = 'hero_primary';

update public.site_cta_placements set
  label_bg = 'Начало — втори бутон „Безплатен наръчник“ (hero)',
  label_en = 'Home — secondary lead magnet button (hero)'
where key = 'hero_secondary';

update public.site_cta_placements set
  label_bg = 'Горно меню — „Запиши безплатен разговор“',
  label_en = 'Top navigation — book a free call CTA'
where key = 'nav_cta';

update public.site_cta_placements set
  label_bg = 'Контакти — WhatsApp (без popup)',
  label_en = 'Contact — WhatsApp (no popup)',
  offer_enabled = false,
  offer_id = null
where key = 'contact_cta';

update public.site_cta_placements set
  label_bg = 'Секция „За мен“ — бутон „Работи с мен“',
  label_en = 'About section — “Work with me” button'
where key = 'about_cta';

insert into public.site_cta_placements (key, label_bg, label_en) values
  ('outcomes_cta', 'Секция „Резултати“ — бутон „Запиши безплатен разговор“', 'Outcomes section — “Book a free call” button'),
  ('leadmagnet_cta', 'Безплатно 2-дневно меню — popup след запис на имейл', 'Free 2-day menu — popup after email signup')
on conflict (key) do nothing;

update public.site_cta_placements
set offer_enabled = false, offer_id = null
where key in ('hero_primary', 'hero_secondary', 'nav_cta');

-- 018: clear audience tags
update public.site_products set audience_tags = '{}';

-- 019: Stripe Price ID (required for product save in admin)
alter table public.site_products
  add column if not exists stripe_price_id text not null default '';

-- 020: rename products section
update public.site_sections
set
  title_bg = 'Специални програми',
  title_en = 'Programs & products'
where key = 'products';

-- 021: 21-day card → events
update public.site_cta_placements set
  label_bg = 'Програми — картичка „Гарнитури“ (€3)',
  label_en = 'Programs — “Side dishes” card (€3)'
where key = 'programs_0';

update public.site_cta_placements set
  label_bg = 'Програма „Живей без резистентност“ — бутон „Кандидатствай“',
  label_en = 'Program “Live Without Resistance” — “Apply now” button'
where key = 'programs_1';

update public.site_cta_placements set
  label_bg = 'Програма „Препрограмирай апетита“ — бутон „Научи повече“',
  label_en = 'Program “Reprogram Your Appetite” — “Learn more” button',
  offer_enabled = coalesce(offer_enabled, false)
where key = 'programs_2';

insert into public.site_cta_placements (key, label_bg, label_en)
select
  'product_' || id::text,
  'Магазин: „' || title_bg || '“ — доп. оферта преди Stripe',
  'Shop: “' || title_en || '” — extra offer before Stripe checkout'
from public.site_products
on conflict (key) do update set
  label_bg = excluded.label_bg,
  label_en = excluded.label_en;

-- 022: Supabase Storage for uploaded images
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

-- 023: YouTube videos section
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

-- 014: segment hierarchy (legacy — converted to groups in 024)
alter table public.segments
  add column if not exists parent_id uuid references public.segments(id) on delete set null;

create index if not exists segments_parent_idx on public.segments (parent_id);

-- 024: segment groups (containers) vs segments (assignable tags)
create table if not exists public.segment_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  parent_id   uuid references public.segment_groups(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists segment_groups_parent_idx
  on public.segment_groups (parent_id);

alter table public.segments
  add column if not exists group_id uuid references public.segment_groups(id) on delete set null;

create index if not exists segments_group_idx on public.segments (group_id);

do $$
declare
  seg record;
  new_group_id uuid;
  parent_group_id uuid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'segments'
      and column_name = 'parent_id'
  ) then
    return;
  end if;

  create temp table _segment_group_map (
    segment_id uuid primary key,
    group_id uuid not null
  ) on commit drop;

  for seg in
    select s.*
    from public.segments s
    where exists (select 1 from public.segments c where c.parent_id = s.id)
    order by s.created_at
  loop
    parent_group_id := null;
    if seg.parent_id is not null then
      select group_id into parent_group_id
      from _segment_group_map
      where segment_id = seg.parent_id;
    end if;

    insert into public.segment_groups (name, description, parent_id)
    values (seg.name, seg.description, parent_group_id)
    returning id into new_group_id;

    insert into _segment_group_map (segment_id, group_id)
    values (seg.id, new_group_id);
  end loop;

  update public.segments s
  set group_id = m.group_id
  from _segment_group_map m
  where s.parent_id = m.segment_id;

  delete from public.segments s
  where exists (select 1 from public.segments c where c.parent_id = s.id);

  alter table public.segments drop column if exists parent_id;
  drop index if exists public.segments_parent_idx;
end $$;

alter table public.automations
  add column if not exists group_ids uuid[] not null default '{}';

-- 025: automation audience AND/OR + exclude rules
alter table public.automations
  add column if not exists audience_logic text not null default 'any'
    check (audience_logic in ('any', 'all'));

alter table public.automations
  add column if not exists exclude_group_ids uuid[] not null default '{}';

alter table public.automations
  add column if not exists exclude_segment_keys text[] not null default '{}';

-- 026: email engagement (opens per delivery already exist; add click tracking)
alter table public.automation_deliveries
  add column if not exists click_count int not null default 0;

alter table public.automation_deliveries
  add column if not exists first_clicked_at timestamptz;

alter table public.email_campaigns
  add column if not exists clicked_count int not null default 0;

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
  clicked_at    timestamptz not null default now()
);

create index if not exists email_link_clicks_email_idx
  on public.email_link_clicks (email);

create index if not exists email_link_clicks_source_idx
  on public.email_link_clicks (source_type, source_id);

-- 027: dynamic forms
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

create index if not exists form_invitations_form_idx
  on public.form_invitations (form_id, sent_at desc);

-- 028: editable email signature + footer
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
  locale,
  signature_closing,
  signature_name,
  signature_title,
  signature_email,
  signature_phone,
  brand_name,
  website_url,
  footer_email,
  footer_phone,
  address_line1,
  address_line2,
  disclaimer
)
values
  (
    'bg',
    '❤️ С обич и подкрепа,',
    'Веси',
    'Холистичен Диетолог B.Med.Sc. (Hons) & СПРАВЯНЕ с Инсулинова резистентност и Диабет 2',
    'vessie@healthyandconfident.co.uk',
    '00 44 7876 565 263',
    'Healthy and Confident',
    'https://www.healthyandconfident.co.uk/bg',
    'vessie@healthyandconfident.co.uk',
    'M: 0044 7876 565 263',
    'Фарнбъро',
    'Обединеното кралство',
    'Получихте този имейл, защото сте се регистрирали на наша платформа или сте участвали в наше обучение или програма.'
  ),
  (
    'en',
    'With love and support,',
    'Vesi',
    'Holistic Dietitian B.Med.Sc. (Hons) — insulin resistance & type 2 diabetes',
    'vessie@healthyandconfident.co.uk',
    '00 44 7876 565 263',
    'Healthy and Confident',
    'https://www.healthyandconfident.co.uk/en',
    'vessie@healthyandconfident.co.uk',
    'M: 0044 7876 565 263',
    'Farnborough',
    'United Kingdom',
    'You received this email because you registered on our platform or took part in one of our trainings or programmes.'
  )
on conflict (locale) do nothing;

-- 029: subscriber profile fields (registration forms)
alter table public.subscribers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists facebook_url text;

-- 030: engagement link labels + PDF attachments
alter table public.email_link_clicks
  add column if not exists link_label text;

alter table public.email_campaigns
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

alter table public.automations
  add column if not exists attachment_path_bg text,
  add column if not exists attachment_filename_bg text,
  add column if not exists attachment_path_en text,
  add column if not exists attachment_filename_en text;

alter table public.form_templates
  add column if not exists attachment_path text,
  add column if not exists attachment_filename text;

-- 031: purchase-specific automations
alter table public.site_products
  add column if not exists purchase_tags text[] not null default '{}';

alter table public.automations
  add column if not exists purchase_product_ids uuid[] not null default '{}';

create table if not exists public.subscriber_purchases (
  id                 uuid primary key default gen_random_uuid(),
  subscriber_id      uuid references public.subscribers(id) on delete set null,
  email              text not null,
  product_id         uuid references public.site_products(id) on delete set null,
  stripe_session_id  text,
  stripe_price_id    text,
  purchased_at       timestamptz not null default now()
);

create unique index if not exists subscriber_purchases_session_product_idx
  on public.subscriber_purchases (stripe_session_id, product_id);

create index if not exists subscriber_purchases_email_idx
  on public.subscriber_purchases (email, purchased_at desc);

-- 032: contact journey (payment, worker jobs, events)
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

insert into public.contacts (id, email, name)
select s.id, s.email, s.name
from public.subscribers s
on conflict (id) do nothing;

-- 034: guides section (admin-managed PDF / Stripe products)
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

-- 035: minutes after previous automation in a chain
alter table public.automations
  add column if not exists delay_minutes int not null default 0;

-- 036: merge registration → new_subscriber
update public.automations
set trigger_event = 'new_subscriber'
where trigger_event = 'registration';

alter table public.automations
  drop constraint if exists automations_trigger_event_check;

alter table public.automations
  add constraint automations_trigger_event_check
  check (trigger_event in ('purchase', 'new_subscriber'));

notify pgrst, 'reload schema';

-- 037: interest + activity segments
insert into public.segments (key, name, description) values
  ('insulin-resistance', 'Insulin resistance', 'Interested in IR / blood sugar'),
  ('weight-loss', 'Weight loss', 'Interested in losing weight'),
  ('diabetes', 'Type 2 Diabetes', 'Diabetes remission audience'),
  ('free-menu', 'Free menu', 'Downloaded the free menu lead magnet')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

select 'Upgrade complete (012–037 applied). Also run 007_automations.sql if not yet applied.' as result;
