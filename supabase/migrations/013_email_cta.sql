-- Optional CTA button per email (label + URL stored separately; body stays in html_*)

alter table public.automations
  add column if not exists cta_label_bg text not null default '',
  add column if not exists cta_url_bg text not null default '',
  add column if not exists cta_label_en text not null default '',
  add column if not exists cta_url_en text not null default '';

alter table public.email_campaigns
  add column if not exists cta_label text not null default '',
  add column if not exists cta_url text not null default '';
