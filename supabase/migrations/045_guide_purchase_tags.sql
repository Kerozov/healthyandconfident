-- Guide purchase segments (same as site_products.purchase_tags)
alter table public.site_guides
  add column if not exists purchase_tags text[] not null default '{}';

notify pgrst, 'reload schema';
