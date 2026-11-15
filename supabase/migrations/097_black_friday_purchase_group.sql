alter table public.site_black_friday
  add column if not exists purchase_segment_key text
    references public.segments (key) on update cascade on delete set null
    check (purchase_segment_key <> 'all');

notify pgrst, 'reload schema';
