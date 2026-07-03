-- Groups (organizational containers) vs segments (assignable subscriber tags).

create table if not exists public.segment_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  parent_id   uuid references public.segment_groups(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists segment_groups_parent_idx
  on public.segment_groups (parent_id);

alter table public.segments
  add column if not exists group_id uuid references public.segment_groups(id) on delete set null;

create index if not exists segments_group_idx on public.segments (group_id);

-- Migrate old segment parent_id hierarchy → groups (if column still exists).
do $$
declare
  seg record;
  new_group_id uuid;
  parent_group_id uuid;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'segments'
      and column_name = 'parent_id'
  ) then
    return;
  end if;

  create temp table _segment_group_map (
    segment_id uuid primary key,
    group_id uuid not null
  ) on commit drop;

  for seg in
    select s.*
    from public.segments s
    where exists (select 1 from public.segments c where c.parent_id = s.id)
    order by s.created_at
  loop
    parent_group_id := null;
    if seg.parent_id is not null then
      select group_id into parent_group_id
      from _segment_group_map
      where segment_id = seg.parent_id;
    end if;

    insert into public.segment_groups (name, description, parent_id)
    values (seg.name, seg.description, parent_group_id)
    returning id into new_group_id;

    insert into _segment_group_map (segment_id, group_id)
    values (seg.id, new_group_id);
  end loop;

  update public.segments s
  set group_id = m.group_id
  from _segment_group_map m
  where s.parent_id = m.segment_id;

  delete from public.segments s
  where exists (select 1 from public.segments c where c.parent_id = s.id);

  alter table public.segments drop column if exists parent_id;
  drop index if exists public.segments_parent_idx;
end $$;

alter table public.automations
  add column if not exists group_ids uuid[] not null default '{}';

notify pgrst, 'reload schema';
