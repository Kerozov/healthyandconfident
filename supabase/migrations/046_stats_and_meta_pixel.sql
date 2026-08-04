-- Reporting foundations (email + payments) and Meta Pixel / Conversions API.

-- ── Payments: order total per checkout session ──────────────
-- Line rows keep their own amount_cents. order_total_cents repeats the Stripe
-- session total on every line of that order, so revenue can be summed over
-- distinct sessions without double counting multi-product orders.
alter table public.subscriber_purchases
  add column if not exists order_total_cents int;

-- Backfill: legacy rows stored the session total on every line, so the max per
-- session is the order total (and is exact for single-line orders).
with session_totals as (
  select stripe_session_id, max(amount_cents) as total
  from public.subscriber_purchases
  where stripe_session_id is not null
  group by stripe_session_id
)
update public.subscriber_purchases p
set order_total_cents = t.total
from session_totals t
where p.stripe_session_id = t.stripe_session_id
  and p.order_total_cents is null;

update public.subscriber_purchases
set order_total_cents = amount_cents
where order_total_cents is null
  and stripe_session_id is null;

create index if not exists subscriber_purchases_purchased_at_idx
  on public.subscriber_purchases (purchased_at desc);

create index if not exists subscriber_purchases_status_purchased_idx
  on public.subscriber_purchases (payment_status, purchased_at desc);

create index if not exists subscriber_purchases_email_purchased_idx
  on public.subscriber_purchases (email, purchased_at desc);

-- ── Reporting indexes for email statistics ──────────────────
create index if not exists campaign_deliveries_sent_at_idx
  on public.campaign_deliveries (sent_at desc);

create index if not exists automation_deliveries_sent_at_idx
  on public.automation_deliveries (sent_at desc);

create index if not exists email_link_clicks_clicked_at_idx
  on public.email_link_clicks (clicked_at desc);

create index if not exists contact_events_created_at_idx
  on public.contact_events (created_at desc);

-- ── Meta Pixel / Conversions API ────────────────────────────
create table if not exists public.meta_pixel_config (
  key                 text primary key default 'default',
  enabled             boolean not null default true,
  pixel_id            text not null default '',
  access_token        text not null default '',
  test_event_code     text not null default '',
  capi_enabled        boolean not null default true,
  track_page_view     boolean not null default true,
  track_view_content  boolean not null default true,
  track_lead          boolean not null default true,
  track_checkout      boolean not null default true,
  track_purchase      boolean not null default true,
  log_events          boolean not null default true,
  updated_at          timestamptz not null default now()
);

insert into public.meta_pixel_config (key)
values ('default')
on conflict (key) do nothing;

create table if not exists public.meta_event_log (
  id           uuid primary key default gen_random_uuid(),
  event_name   text not null,
  event_id     text,
  source       text not null default 'server'
    check (source in ('browser', 'server')),
  email        text,
  value_cents  int,
  currency     text,
  status       text not null default 'sent'
    check (status in ('sent', 'failed', 'skipped')),
  error        text,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists meta_event_log_created_idx
  on public.meta_event_log (created_at desc);

create index if not exists meta_event_log_name_idx
  on public.meta_event_log (event_name, created_at desc);

-- Deduplicate retries of the same browser/server event pair.
create unique index if not exists meta_event_log_event_uidx
  on public.meta_event_log (event_id, source)
  where event_id is not null;

-- The access token and the customer emails in the log must never be readable
-- through the public anon key. Service-role writes bypass RLS.
alter table public.meta_pixel_config enable row level security;
alter table public.meta_event_log enable row level security;

revoke all on public.meta_pixel_config from anon, authenticated;
revoke all on public.meta_event_log from anon, authenticated;

notify pgrst, 'reload schema';
