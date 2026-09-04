-- 060: One-query dashboard overview.
--
-- The admin home used to pull rows into Node and count them there, which timed
-- out once site_visits grew. Everything the dashboard shows is aggregated here
-- instead — daily buckets in the business timezone, totals, the previous window
-- for trend arrows — and comes back as a single jsonb payload.
--
-- Service-role only; the admin API route is the sole caller.

create or replace function public.admin_dashboard_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_tz          text        := 'Europe/Sofia';
  v_until       timestamptz := now();
  v_since       timestamptz;
  v_prev_since  timestamptz;
  v_chart_since timestamptz;
  v_currency    text;
  v_result      jsonb;
begin
  if p_days is null or p_days <= 0 then
    v_since      := null;
    v_prev_since := null;
  else
    v_since      := v_until - make_interval(days => p_days);
    v_prev_since := v_until - make_interval(days => p_days * 2);
  end if;

  -- A daily chart over several years is unreadable, so all-time reports still
  -- draw the last 90 days while the totals cover everything.
  v_chart_since := coalesce(v_since, v_until - make_interval(days => 90));

  with
  visits as (
    select
      (created_at at time zone v_tz)::date as day,
      created_at,
      event,
      visitor_id,
      path,
      source
    from public.site_visits
    where v_prev_since is null or created_at >= v_prev_since
  ),
  paid as (
    select
      coalesce(stripe_session_id, id::text)              as order_key,
      min(purchased_at)                                  as purchased_at,
      max(coalesce(order_total_cents, amount_cents, 0))  as cents,
      upper(coalesce(max(currency), 'gbp'))              as currency
    from public.subscriber_purchases
    where payment_status = 'paid'
      and (v_prev_since is null or purchased_at >= v_prev_since)
    group by 1
  ),
  mail as (
    select sent_at, opened_at
    from public.campaign_deliveries
    where status = 'sent'
      and (v_prev_since is null or sent_at >= v_prev_since)
    union all
    select sent_at, opened_at
    from public.automation_deliveries
    where status = 'sent'
      and channel = 'email'
      and (v_prev_since is null or sent_at >= v_prev_since)
  ),
  signups as (
    select created_at
    from public.subscribers
    where v_prev_since is null or created_at >= v_prev_since
  ),
  report_currency as (
    select currency
    from paid
    where v_since is null or purchased_at >= v_since
    group by currency
    order by sum(cents) desc
    limit 1
  ),
  days as (
    select generate_series(
      date_trunc('day', v_chart_since at time zone v_tz),
      date_trunc('day', v_until      at time zone v_tz),
      interval '1 day'
    )::date as day
  ),
  timeline as (
    select
      d.day,
      coalesce(v.pageviews, 0)      as pageviews,
      coalesce(v.visitors, 0)       as visitors,
      coalesce(v.leads, 0)          as leads,
      coalesce(p.revenue_cents, 0)  as revenue_cents,
      coalesce(p.orders, 0)         as orders,
      coalesce(m.sent, 0)           as emails_sent,
      coalesce(m.opened, 0)         as emails_opened,
      coalesce(s.signups, 0)        as new_subscribers
    from days d
    left join (
      select
        day,
        count(*) filter (where event = 'pageview')                  as pageviews,
        count(distinct visitor_id) filter (where event = 'pageview') as visitors,
        count(*) filter (where event = 'lead')                      as leads
      from visits
      where created_at >= v_chart_since
      group by day
    ) v on v.day = d.day
    left join (
      select
        (purchased_at at time zone v_tz)::date as day,
        sum(cents)                             as revenue_cents,
        count(*)                               as orders
      from paid
      where purchased_at >= v_chart_since
        and currency = (select currency from report_currency)
      group by 1
    ) p on p.day = d.day
    left join (
      select
        (sent_at at time zone v_tz)::date              as day,
        count(*)                                       as sent,
        count(*) filter (where opened_at is not null)  as opened
      from mail
      where sent_at >= v_chart_since
      group by 1
    ) m on m.day = d.day
    left join (
      select (created_at at time zone v_tz)::date as day, count(*) as signups
      from signups
      where created_at >= v_chart_since
      group by 1
    ) s on s.day = d.day
    order by d.day
  )
  select jsonb_build_object(
    'days',       coalesce(p_days, 30),
    'since',      v_since,
    'until',      v_until,
    'chartSince', v_chart_since,
    'currency',   coalesce((select currency from report_currency), 'GBP'),

    'totals', jsonb_build_object(
      'visitors',   (select count(distinct visitor_id) from visits
                      where event = 'pageview' and (v_since is null or created_at >= v_since)),
      'pageviews',  (select count(*) from visits
                      where event = 'pageview' and (v_since is null or created_at >= v_since)),
      'leads',      (select count(*) from visits
                      where event = 'lead' and (v_since is null or created_at >= v_since)),
      'checkouts',  (select count(*) from visits
                      where event = 'checkout' and (v_since is null or created_at >= v_since)),
      'revenueCents', (select coalesce(sum(cents), 0) from paid
                        where (v_since is null or purchased_at >= v_since)
                          and currency = (select currency from report_currency)),
      'orders',     (select count(*) from paid
                      where (v_since is null or purchased_at >= v_since)
                        and currency = (select currency from report_currency)),
      'emailsSent',   (select count(*) from mail
                        where v_since is null or sent_at >= v_since),
      'emailsOpened', (select count(*) from mail
                        where opened_at is not null and (v_since is null or sent_at >= v_since)),
      'newSubscribers', (select count(*) from signups
                          where v_since is null or created_at >= v_since)
    ),

    'previous', case when v_prev_since is null then null::jsonb else jsonb_build_object(
      'visitors',  (select count(distinct visitor_id) from visits
                     where event = 'pageview' and created_at >= v_prev_since and created_at < v_since),
      'pageviews', (select count(*) from visits
                     where event = 'pageview' and created_at >= v_prev_since and created_at < v_since),
      'leads',     (select count(*) from visits
                     where event = 'lead' and created_at >= v_prev_since and created_at < v_since),
      'checkouts', (select count(*) from visits
                     where event = 'checkout' and created_at >= v_prev_since and created_at < v_since),
      'revenueCents', (select coalesce(sum(cents), 0) from paid
                        where purchased_at >= v_prev_since and purchased_at < v_since
                          and currency = (select currency from report_currency)),
      'orders',    (select count(*) from paid
                     where purchased_at >= v_prev_since and purchased_at < v_since
                       and currency = (select currency from report_currency)),
      'emailsSent',   (select count(*) from mail
                        where sent_at >= v_prev_since and sent_at < v_since),
      'emailsOpened', (select count(*) from mail
                        where opened_at is not null and sent_at >= v_prev_since and sent_at < v_since),
      'newSubscribers', (select count(*) from signups
                          where created_at >= v_prev_since and created_at < v_since)
    ) end,

    'audience', jsonb_build_object(
      'totalSubscribers',  (select count(*) from public.subscribers),
      'activeSubscribers', (select count(*) from public.subscribers where status = 'subscribed'),
      'totalPosts',        (select count(*) from public.blog_posts),
      'publishedPosts',    (select count(*) from public.blog_posts where status = 'published')
    ),

    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date',           to_char(day, 'YYYY-MM-DD'),
        'visitors',       visitors,
        'pageviews',      pageviews,
        'leads',          leads,
        'revenueCents',   revenue_cents,
        'orders',         orders,
        'emailsSent',     emails_sent,
        'emailsOpened',   emails_opened,
        'newSubscribers', new_subscribers
      ) order by day)
      from timeline
    ), '[]'::jsonb),

    'sources', coalesce((
      select jsonb_agg(item order by value desc)
      from (
        select jsonb_build_object('id', source, 'label', source, 'value', count(*)) as item,
               count(*) as value
        from visits
        where event = 'pageview' and (v_since is null or created_at >= v_since)
        group by source
        order by count(*) desc
        limit 8
      ) t
    ), '[]'::jsonb),

    'topPages', coalesce((
      select jsonb_agg(item order by value desc)
      from (
        select jsonb_build_object('id', path, 'label', path, 'value', count(*)) as item,
               count(*) as value
        from visits
        where event = 'pageview' and (v_since is null or created_at >= v_since)
        group by path
        order by count(*) desc
        limit 8
      ) t
    ), '[]'::jsonb),

    'recentCampaigns', coalesce((
      select jsonb_agg(item order by created_at desc)
      from (
        select jsonb_build_object(
                 'id',              id,
                 'subject',         subject,
                 'segment_tag',     segment_tag,
                 'recipients_count', recipients_count,
                 'status',          status,
                 'created_at',      created_at
               ) as item,
               created_at
        from public.email_campaigns
        order by created_at desc
        limit 5
      ) t
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview(int) from public;
grant execute on function public.admin_dashboard_overview(int) to service_role;

notify pgrst, 'reload schema';
