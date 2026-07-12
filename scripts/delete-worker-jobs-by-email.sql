-- Delete notification-worker email jobs for a test address (run in WORKER Supabase)
-- Needed when idempotency blocks resends after HC delete-subscriber-by-email.sql

-- ▼▼▼ CHANGE EMAIL ▼▼▼
-- SELECT id, status, subject, idempotency_key, send_at
-- FROM public.email_jobs
-- WHERE recipients @> ARRAY['your@email.com']::text[]
-- ORDER BY created_at DESC;

DELETE FROM public.email_recipients er
USING public.email_jobs ej
WHERE er.job_id = ej.id
  AND ej.recipients @> ARRAY[lower(trim('zefirkerozovv@gmail.com'))]::text[];

DELETE FROM public.email_jobs
WHERE recipients @> ARRAY[lower(trim('zefirkerozovv@gmail.com'))]::text[];

-- If your worker schema uses different table names, adjust above.
