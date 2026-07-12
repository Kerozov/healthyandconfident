-- Diagnose why automations did not reach notification-worker
-- Run in HC Supabase SQL Editor (replace email on line 8)

-- 1) Enabled signup automations
SELECT id, name, enabled, trigger_event, channel, segment_keys, group_ids, new_subscribers_only
FROM public.automations
WHERE enabled = true
  AND trigger_event IN ('new_subscriber', 'registration')
ORDER BY sort_order;

-- 2) Delivery attempts for test email
SELECT
  ad.automation_id,
  a.name,
  ad.status,
  ad.error,
  ad.worker_job_id,
  ad.scheduled_for,
  ad.sent_at
FROM public.automation_deliveries ad
JOIN public.automations a ON a.id = ad.automation_id
WHERE lower(ad.email) = lower(trim('zefirkerozovv@gmail.com'))
ORDER BY ad.sent_at DESC NULLS LAST;

-- 3) Subscriber tags (audience matching)
SELECT id, email, tags, source, status, created_at
FROM public.subscribers
WHERE lower(email) = lower(trim('zefirkerozovv@gmail.com'));

-- Interpretation:
-- rulesLoaded=0 in subscribe response → no enabled automations / wrong trigger
-- matchedEmail=0 + skipped[].reason=audience → fix segment/group in /admin/automations
-- prepared=0 → empty subject/body in automation
-- submitted=0 + errors[] → worker URL/key wrong or worker rejected request
-- automation_deliveries has rows but worker empty → wrong worker DB/tenant
