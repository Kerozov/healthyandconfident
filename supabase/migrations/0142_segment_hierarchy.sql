-- Nested segments (parent → subgroups)

alter table public.segments
  add column if not exists parent_id uuid references public.segments(id) on delete set null;

create index if not exists segments_parent_idx on public.segments (parent_id);

notify pgrst, 'reload schema';
