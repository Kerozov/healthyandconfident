# Healthy & Confident

Bilingual (BG / EN) marketing site + admin for **Vessie Ney**.

## Stack

- Next.js 16, React 19, Tailwind v4, TypeScript
- Supabase — blog, subscribers, campaigns
- **notification-worker** — email (ZeptoMail) + SMS (Notifier), scheduling, open tracking

## Setup

```bash
bun install
cp .env.example .env
```

1. Run `supabase/migrations/SETUP_DATABASE.sql` in the Supabase SQL editor
2. Set env vars (see `.env.example`)
3. In `notification-worker`: tenant seed with matching `NOTIFICATION_WORKER_API_KEY`
4. `bun run dev` → `/bg`, `/en`, admin at `/admin/login`

```bash
bun run verify:worker   # test worker auth
bun run verify:email    # email block serialisation round-trip
```

`SETUP_DATABASE.sql` is the only file you need — it creates a fresh schema and,
at the end, brings an existing database up to date with every migration. It is
idempotent, so re-run it after pulling changes.
`RUN_PENDING_MIGRATIONS.sql` does the upgrade half on its own and stays for
projects that were already following it.

## FunnelBrand contact sync

Contacts collected through FunnelBrand funnels are pulled into **Admin → Абонати**
with the „Синхронизирай“ button. This site never signs into FunnelBrand — it holds
an API key and reads a single export endpoint.

```bash
FUNNEL_BRAND_API_URL="https://www.funnel-brand.com"   # optional, this is the default
FUNNEL_BRAND_API_KEY="fbk_..."                        # FunnelBrand → фунията → Контакти → Синхронизация
```

Each imported contact gets two tags: the funnel's segment (where it came from) and
`funnel-brand` (which software collected it), so campaigns can target either.
Only new contacts are fetched on each run; „Пълна синхронизация“ re-reads everything.
People who unsubscribed — here or in FunnelBrand — are never re-subscribed, and
automations do not fire on synced contacts.

Requires migration `049_funnel_brand_sync.sql`.

## Reporting & tracking

- **Admin → Посещения** (`/admin/visits`) — unique visitors, sessions, pageviews,
  bounce, traffic sources, top pages, devices, hours, and a funnel from visit →
  lead → checkout → paid order. Requires `050_site_visits.sql`.
- **Admin → Статистика имейли** (`/admin/engagement`) — deliveries, opens, clicks,
  CTOR, bounce and failure rates, per campaign and per automation, best send hour
  and weekday, deliverability by mailbox provider, engagement tiers, sleeping
  subscribers, top links.
- **Admin → Плащания** (`/admin/payments`) — revenue, orders, AOV, refunds, product
  performance, checkout funnel, repeat customers, revenue by acquisition source.
  Money figures come from Stripe; one checkout session is one order.
- **Admin → Meta пиксел** (`/admin/meta`) — pixel id, Conversions API token, which
  events to track, a test-event button, and a log of everything sent to Meta.

Meta events fire from the browser **and** from the server with a shared `event_id`,
so Meta deduplicates the pair: `PageView`, `ViewContent`, `Lead`,
`CompleteRegistration`, `InitiateCheckout` (exact Stripe amount, from
`/api/checkout`) and `Purchase` (from the Stripe webhook). Personal data is
SHA-256 hashed before it leaves the app.
