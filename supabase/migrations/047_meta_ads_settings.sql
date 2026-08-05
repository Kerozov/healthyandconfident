-- ═══════════════════════════════════════════════════════════════
-- 047: Meta ads settings — everything an ad account needs pasted in
-- one place: domain verification, extra pixels, ad account reference.
-- ═══════════════════════════════════════════════════════════════

alter table public.meta_pixel_config
  add column if not exists domain_verification   text not null default '',
  add column if not exists additional_pixel_ids  text not null default '',
  add column if not exists ad_account_id         text not null default '',
  add column if not exists catalog_id            text not null default '',
  add column if not exists notes                 text not null default '';

comment on column public.meta_pixel_config.domain_verification is
  'Token from Business Manager → Brand safety → Domains. Rendered as <meta name="facebook-domain-verification">.';
comment on column public.meta_pixel_config.additional_pixel_ids is
  'Comma separated extra pixel ids (agency / second account). Browser events fire to all of them.';
comment on column public.meta_pixel_config.ad_account_id is
  'act_XXXXXXXX — reference only, used for the Ads Manager shortcut in the admin.';
comment on column public.meta_pixel_config.catalog_id is
  'Commerce catalog id — reference only.';
