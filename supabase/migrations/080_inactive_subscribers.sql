-- 080: Subscribers who stopped opening email.
--
-- Someone counts as inactive for a window when all of these hold:
--   * still subscribed, and on the list since before the window started
--     (a newcomer has had no chance to open anything yet);
--   * at least one email (campaign or automation) went out to them in the window
--     — no mail sent means nothing to judge by;
--   * no open and no link click in the window. A click proves the email was
--     read even when the tracking pixel was blocked.
--
-- Matched by lower(email): older delivery rows carry no subscriber_id.
-- Service-role only; the admin server action is the sole caller.

create or replace function public.inactive_subscribers(p_since timestamptz)
returns table (
  id             uuid,
  email          text,
  name           text,
  locale         text,
  tags           text[],
  created_at     timestamptz,
  sent_count     bigint,
  last_sent_at   timestamptz,
  last_opened_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with
  sent as (
    select lower(d.email) as email, d.sent_at, d.opened_at
    from public.campaign_deliveries d
    where d.status = 'sent'
    union all
    select lower(d.email), d.sent_at, d.opened_at
    from public.automation_deliveries d
    where d.status = 'sent' and d.channel = 'email'
  ),
  per_email as (
    select
      email,
      count(*) filter (where sent_at >= p_since)     as sent_count,
      max(sent_at)                                    as last_sent_at,
      max(opened_at)                                  as last_opened_at,
      bool_or(opened_at >= p_since)                   as opened_in_window
    from sent
    group by email
  ),
  clicked as (
    select distinct lower(c.email) as email
    from public.email_link_clicks c
    where c.clicked_at >= p_since
  )
  select
    s.id,
    s.email,
    s.name,
    s.locale,
    s.tags,
    s.created_at,
    p.sent_count,
    p.last_sent_at,
    p.last_opened_at
  from public.subscribers s
  join per_email p on p.email = lower(s.email)
  where s.status = 'subscribed'
    and s.created_at < p_since
    and p.sent_count > 0
    and not coalesce(p.opened_in_window, false)
    and not exists (select 1 from clicked c where c.email = lower(s.email));
$$;

revoke all on function public.inactive_subscribers(timestamptz) from public;
grant execute on function public.inactive_subscribers(timestamptz) to service_role;

notify pgrst, 'reload schema';
