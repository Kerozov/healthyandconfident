# Healthy & Confident

Bilingual (BG / EN) marketing site, blog and admin panel for **Vessie Ney** —
Holistic Nutritionist & NHS Type 2 Diabetes Practitioner.

Built for serious SEO and conversion: localized content (different copy per
language), structured data, an editable lead-capture popup, a full admin panel
with a blog CMS, subscriber segmentation, and email + SMS campaigns.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + custom design system
- **Supabase** (Postgres) — blog, subscribers, segments, popup, campaigns
- **Clerk** — admin authentication (email allowlist)
- **notification-worker** (`D:\notification-worker`) — email sending + open tracking (ZeptoMail)
- **SMS notifier** — pluggable adapter (wired later)

## Features

### Public site (`/bg`, `/en`)
- Striking, responsive landing page with conversion copywriting
- Separate content per language (not just translations)
- Blog with Markdown content, cover images, tags, reading time
- Editable popup with email capture → Supabase
- SEO: per-page metadata, hreflang alternates, JSON-LD (ProfessionalService,
  FAQ, Article), `sitemap.xml`, `robots.txt`, OpenGraph

### Admin panel (`/admin`)
- Dashboard with subscriber / content / campaign stats
- **Blog CMS** — create / edit / delete, BG & EN, Markdown editor with preview, SEO fields
- **Popup editor** — message, CTA, segment, delay, per language
- **Subscribers** — manual add, segmentation (tags), filters, CSV export, status, delete
- **Campaigns** — segmented Email (via the worker, with open tracking) and SMS

## Setup

1. **Install**

```bash
bun install
```

2. **Environment** — copy and fill in:

```bash
cp .env.example .env.local
```

3. **Database** — open the Supabase SQL editor and run:

```
supabase/migrations/001_init.sql
```

4. **Clerk** — create an app at dashboard.clerk.com, copy the keys into
   `.env.local`, and add admin emails to `ADMIN_EMAILS`.

5. **Email worker** — in `D:\notification-worker`, add a tenant for this site
   (see its README → "Add a new app"), then put the tenant key, worker URL and
   `from` address into `.env.local`.

6. **Run**

```bash
bun run dev
```

- Public site: http://localhost:3000/bg and `/en`
- Admin: http://localhost:3000/admin (sign in via Clerk)

## Notes

- Add a portrait at `public/images/vessie.jpg` and `public/images/vessie-about.jpg`,
  and an OG image at `public/og/default.jpg`.
- The SMS notifier is a stub adapter (`lib/sms/notifier.ts`). When the notifier
  service is ready, set `SMS_NOTIFIER_URL` and `SMS_NOTIFIER_API_KEY` — it posts
  `{ message, recipients }` with a Bearer key, just like the email worker.
- Email open tracking is fetched live from the worker per campaign in the admin
  Campaigns page ("Opens" button), including a copy list of not-opened emails
  for re-sends.
