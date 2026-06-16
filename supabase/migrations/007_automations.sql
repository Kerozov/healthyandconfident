-- Rule-based automations (email + SMS) with segmentation and sequencing

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

-- Starter rules (disabled — enable in Admin → Automations)
insert into public.automations (
  name, channel, trigger_event, enabled, new_subscribers_only,
  subject_bg, html_bg, subject_en, html_en, sort_order
) values
  (
    'Welcome after signup',
    'email',
    'registration',
    false,
    true,
    'Добре дошла, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Благодарим ти, че се регистрира при нас.</p>',
    'Welcome, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>Thanks for signing up.</p>',
    10
  ),
  (
    'Thank you after purchase',
    'email',
    'purchase',
    false,
    false,
    'Благодарим за покупката, {{name}}!',
    '<h1>Здравей, {{name}}!</h1><p>Получихме поръчката ти. При въпроси — отговори на този имейл.</p>',
    'Thank you for your purchase, {{name}}!',
    '<h1>Hi {{name}}!</h1><p>We received your order. Reply if you have questions.</p>',
    20
  );

notify pgrst, 'reload schema';
