-- Per-locale visibility and link for events.
-- Same pattern as products (051) and guides/videos (055): hide BG or EN
-- independently, and point the English card at its own registration page.
-- `url_en` empty falls back to `url`, so existing events keep working.

alter table public.site_events
  add column if not exists enabled_en boolean not null default true,
  add column if not exists url_en text not null default '';

notify pgrst, 'reload schema';
