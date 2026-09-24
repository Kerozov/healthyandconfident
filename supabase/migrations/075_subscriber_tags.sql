-- 075: The distinct tags of subscribed subscribers, in one query.
--
-- getSubscriberTags() read the `tags` of every subscribed row, 1000 per
-- request and one request after another, just to build a list of a few dozen
-- names. The forms and campaigns pages wait for it on every render — and a
-- server action that revalidates them renders them again — so creating a form
-- took as long as reading the whole subscriber table.
--
-- One array value, not a set of rows: PostgREST's row cap does not apply to it.

create or replace function public.subscriber_tags()
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(distinct tag order by tag), '{}')
  from public.subscribers s
  cross join lateral unnest(s.tags) as tag
  where s.status = 'subscribed'
    and tag <> ''
    and tag <> 'all';
$$;

revoke all on function public.subscriber_tags() from public;
grant execute on function public.subscriber_tags() to service_role;

notify pgrst, 'reload schema';
