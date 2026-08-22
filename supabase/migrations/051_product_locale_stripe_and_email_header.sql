-- 051: per-locale Stripe on products + editable email header

alter table public.site_products
  add column if not exists stripe_url_en text not null default '',
  add column if not exists stripe_product_id_en text not null default '',
  add column if not exists stripe_price_id_en text not null default '',
  add column if not exists enabled_en boolean not null default true;

alter table public.email_footer_config
  add column if not exists header_enabled boolean not null default true,
  add column if not exists header_title text not null default '',
  add column if not exists header_tagline text not null default '',
  add column if not exists header_subtitle text not null default '',
  add column if not exists header_image_url text,
  add column if not exists header_image_full_width boolean not null default false,
  add column if not exists header_bg_color text not null default '#2D7A47',
  add column if not exists copyright_enabled boolean not null default true;

update public.email_footer_config
set
  header_title = case when header_title = '' then 'Vessie Nay' else header_title end,
  header_tagline = case when header_tagline = '' then 'Healthy & Confident' else header_tagline end,
  header_subtitle = case
    when header_subtitle <> '' then header_subtitle
    when locale = 'en' then 'Holistic Nutritionist'
    else 'Холистичен диетолог'
  end,
  header_bg_color = case
    when header_bg_color is null or header_bg_color = '' then '#2D7A47'
    else header_bg_color
  end;

notify pgrst, 'reload schema';
