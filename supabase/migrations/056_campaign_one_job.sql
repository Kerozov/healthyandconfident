-- One campaign is one worker job with many recipients.
-- The old unique index assumed every person had their own job id.

drop index if exists public.campaign_deliveries_job_uidx;

delete from public.campaign_deliveries d
using public.campaign_deliveries keep
where d.campaign_id = keep.campaign_id
  and lower(d.email) = lower(keep.email)
  and d.ctid > keep.ctid;

create unique index if not exists campaign_deliveries_campaign_email_key
  on public.campaign_deliveries (campaign_id, lower(email));
