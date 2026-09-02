-- Editable site contact links (Messenger, phone, WhatsApp) + floating chat toggle
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
