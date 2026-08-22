-- 053: clickable links/buttons in the email signature

alter table public.email_footer_config
  add column if not exists signature_links jsonb not null default '[]';

notify pgrst, 'reload schema';
