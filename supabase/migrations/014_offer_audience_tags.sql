-- Target upsell/downsell offers to subscriber segments (empty = everyone)

alter table public.site_products
  add column if not exists audience_tags text[] not null default '{}';

notify pgrst, 'reload schema';
