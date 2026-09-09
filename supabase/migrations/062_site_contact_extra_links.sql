-- 062: admin-editable extra links under the site contact block.
--
-- Also re-issues 059's table body: 059 was recorded as applied by the old CI
-- baseline step without ever running, so `site_contact_config` may not exist in
-- production. Everything here is idempotent, so it is safe either way.

create table if not exists public.site_contact_config (
  id                  uuid primary key default gen_random_uuid(),
  messenger_url       text not null default '',
  messenger_enabled   boolean not null default true,
  email               text not null default '',
  phone               text not null default '',
  phone_href          text not null default '',
  whatsapp_url        text not null default '',
  updated_at          timestamptz not null default now()
);

alter table public.site_contact_config
  add column if not exists extra_links jsonb not null default '[]'::jsonb;

insert into public.site_contact_config (
  id,
  messenger_url,
  messenger_enabled,
  email,
  phone,
  phone_href,
  whatsapp_url
)
values (
  '00000000-0000-0000-0000-000000000001',
  'https://m.me/healthyandconfident',
  true,
  'vessie@healthyandconfident.co.uk',
  '+44 7876 565 263',
  'tel:+447876565263',
  'https://wa.me/447876565263'
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
