-- Extended subscriber profile (registration forms)

alter table public.subscribers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists facebook_url text;

notify pgrst, 'reload schema';
