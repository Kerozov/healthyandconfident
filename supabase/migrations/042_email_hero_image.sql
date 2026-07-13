-- Hero/banner image at the top of emails (automations, campaigns, forms).

alter table public.automations
  add column if not exists hero_image_url_bg text,
  add column if not exists hero_image_url_en text;

alter table public.email_campaigns
  add column if not exists hero_image_url text;

alter table public.form_templates
  add column if not exists hero_image_url text;
