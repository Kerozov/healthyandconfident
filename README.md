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

1. Run `supabase/migrations/001_init.sql` then `RUN_PENDING_MIGRATIONS.sql` in Supabase SQL editor
2. Set env vars (see `.env.example`)
3. In `notification-worker`: tenant seed with matching `NOTIFICATION_WORKER_API_KEY`
4. `bun run dev` → `/bg`, `/en`, admin at `/admin/login`

```bash
bun run verify:worker   # test worker auth
```
