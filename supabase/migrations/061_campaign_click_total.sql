-- 061: Exact click totals for a campaign, in one query.
--
-- `clicked_count` used to be recomputed by reading every delivery row and summing
-- in Node. PostgREST stops at 1000 rows, so any campaign with more recipients
-- reported a truncated total — and the click-redirect path paid for the reads.

create or replace function public.campaign_click_total(p_campaign_id uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(click_count), 0)::bigint
  from public.campaign_deliveries
  where campaign_id = p_campaign_id;
$$;

create index if not exists campaign_deliveries_campaign_clicks_idx
  on public.campaign_deliveries (campaign_id) include (click_count);

revoke all on function public.campaign_click_total(uuid) from public;
grant execute on function public.campaign_click_total(uuid) to service_role;

notify pgrst, 'reload schema';
