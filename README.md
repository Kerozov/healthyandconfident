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

1. Run `supabase/scripts/SETUP_DATABASE.sql` in the Supabase SQL editor (fresh DB)
2. Set env vars (see `.env.example`)
3. In `notification-worker`: tenant seed with matching `NOTIFICATION_WORKER_API_KEY`
4. `bun run dev` → `/bg`, `/en`, admin at `/admin/login`

```bash
bun run verify:worker   # test worker auth
bun run verify:email    # email block serialisation round-trip
```

`supabase/scripts/SETUP_DATABASE.sql` is the only file you need for a manual
setup — it creates a fresh schema and, at the end, brings an existing database
up to date with every migration. It is idempotent, so re-run it after pulling
changes. `supabase/scripts/RUN_PENDING_MIGRATIONS.sql` does the upgrade half on
its own for projects that were already following it.

## Supabase CI migrations

On push to `main`, when files under `supabase/migrations/` change, GitHub
Actions runs `supabase db push` against production. The workflow baselines every
migration up to `057` (already applied manually) and only runs new ones such as
`058_ci_test.sql` and anything after.

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_ID` | Project → Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Project → Settings → Database → Database password |

After the secrets are set, merge to `main` — the first run should apply only
`058_ci_test.sql` (a no-op notice). Future schema changes: add
`059_your_change.sql`, push to `main`, CI applies it automatically.

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

## Thank-you buttons

In **Admin → Форми → Съдържание**, each form can have an optional thank-you
button with its own label and URL for BG and EN. **Преглед → Thank you страница**
shows the result without submitting a form. Clear both fields to remove a button.

In **Admin → Popup**, the thank-you button for each language is shared by menu
and newsletter signup screens, including programme pages. A configured button
keeps the signup popup open and replaces the automatic offer popup after signup.
The same screen has an independent **Бутон след покупка** for the checkout
confirmation; cancelled payments do not show it.

Requires migration `084_thank_you_buttons.sql` for signup and checkout buttons.
Per-form buttons use the existing form settings and need no schema change.

```bash
bun run verify:thank-you
```

## Team email notifications

In **Admin → Профили и промени**, add a notification email to each profile and
enable **Попълнена форма / ново запитване**, **Нов абонат от сайта**, or both.
Existing profiles start with notifications off. Only active profiles with access
to the corresponding screen receive emails. Duplicate recipient addresses are
sent one copy per event.

Form notifications include the submitted answers and a link to the form in the
admin panel, including when the visitor declines marketing emails. Subscriber
notifications cover first-time signups through the site's subscription forms;
repeat signups and imports do not notify. Sending uses the existing notification
worker. A sending failure is logged and does not reject the saved submission.
Worker requests for staff alerts have a ten-second deadline. Invitation replies
are unique per invitation, so concurrent replies cannot create duplicate alerts.

Requires migration `083_admin_email_notifications.sql` before deploying the app.
The normal migration workflow applies it on push to `main`.

```bash
bun run verify:notifications  # isolated checks; sends no real emails
```

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
