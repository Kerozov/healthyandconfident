-- Fix worker tenant default FROM (run in notification-worker Supabase, not HC)
-- Replace slug if your tenant slug differs (e.g. healthyandconfident)

update public.tenants
set
  default_from = 'Vessie Nay <vessie@healthyandconfident.co.uk>',
  default_reply_to = 'vessie@healthyandconfident.co.uk'
where slug = 'healthyandconfident';

-- Or update all tenants if you only have one:
-- update public.tenants
-- set
--   default_from = 'Vessie Nay <vessie@healthyandconfident.co.uk>',
--   default_reply_to = 'vessie@healthyandconfident.co.uk';

select slug, default_from, default_reply_to from public.tenants;
