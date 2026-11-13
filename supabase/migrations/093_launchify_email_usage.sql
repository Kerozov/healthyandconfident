-- Колко имейла е пратил сайтът на ден — за доклада към Launchify, където се
-- брои лимитът на акаунта. Една заявка вместо да се теглят всички редове.
-- Брои се приетото от worker-а (изпратено и насрочено); отказаното и
-- провалилото се — не, нито писмата на отказана кампания. Денят е в София.
create or replace function public.launchify_email_usage_by_day(p_from date)
returns table (day date, emails bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (t.sent_at at time zone 'Europe/Sofia')::date as day, count(*)::bigint as emails
  from (
    select sent_at from public.automation_deliveries
      where channel = 'email'
        and status in ('sent', 'scheduled')
        and sent_at >= (p_from - 1)::timestamptz
    union all
    select d.sent_at from public.campaign_deliveries d
      join public.email_campaigns c on c.id = d.campaign_id
      where d.status in ('sent', 'scheduled')
        and c.status <> 'canceled'
        and d.sent_at >= (p_from - 1)::timestamptz
  ) t
  where (t.sent_at at time zone 'Europe/Sofia')::date >= p_from
  group by 1
  order by 1;
$$;

revoke all on function public.launchify_email_usage_by_day(date) from public, anon, authenticated;
grant execute on function public.launchify_email_usage_by_day(date) to service_role;

notify pgrst, 'reload schema';
