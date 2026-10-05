-- 077: adjustable height of the green email header band.
--
-- The band was always 36px padding + 28px title, which pushed the actual email
-- content far down the screen. Default stays 'large' (the original look).

alter table public.email_footer_config
  add column if not exists header_size text not null default 'large';

alter table public.email_footer_config
  drop constraint if exists email_footer_config_header_size_check;

alter table public.email_footer_config
  add constraint email_footer_config_header_size_check
  check (header_size in ('compact', 'normal', 'large'));

notify pgrst, 'reload schema';
