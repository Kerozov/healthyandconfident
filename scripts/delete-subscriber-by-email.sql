-- =============================================================================
-- Изтриване на абонат + всички свързани данни по имейл
-- Пусни в Supabase → SQL Editor
-- =============================================================================
-- ▼▼▼ СМЕНИ ИМЕЙЛА ТУК ▼▼▼
-- =============================================================================

DO $$
DECLARE
  target_email text := lower(trim('zefirkerozovv@gmail.com'));
  sub_id uuid;
  deleted_automation int;
  deleted_campaign int;
  deleted_clicks int;
  deleted_purchases int;
  deleted_forms int;
  deleted_invites int;
BEGIN
  IF target_email = '' OR target_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Попълни валиден имейл в target_email';
  END IF;

  SELECT id INTO sub_id
  FROM public.subscribers
  WHERE lower(email) = target_email;

  IF sub_id IS NULL THEN
    RAISE NOTICE 'Няма абонат с имейл: %', target_email;
    -- Все пак изтрий останали записи само по имейл (ако има)
  ELSE
    RAISE NOTICE 'Абонат id: %', sub_id;
  END IF;

  DELETE FROM public.automation_deliveries
  WHERE lower(email) = target_email;
  GET DIAGNOSTICS deleted_automation = ROW_COUNT;

  DELETE FROM public.campaign_deliveries
  WHERE lower(email) = target_email;
  GET DIAGNOSTICS deleted_campaign = ROW_COUNT;

  DELETE FROM public.email_link_clicks
  WHERE lower(email) = target_email;
  GET DIAGNOSTICS deleted_clicks = ROW_COUNT;

  DELETE FROM public.subscriber_purchases
  WHERE lower(email) = target_email;
  GET DIAGNOSTICS deleted_purchases = ROW_COUNT;

  DELETE FROM public.form_submissions
  WHERE lower(email) = target_email
     OR subscriber_id = sub_id;
  GET DIAGNOSTICS deleted_forms = ROW_COUNT;

  DELETE FROM public.form_invitations
  WHERE lower(email) = target_email
     OR subscriber_id = sub_id;
  GET DIAGNOSTICS deleted_invites = ROW_COUNT;

  -- contacts / contact_events / contact_worker_jobs → cascade при изтриване на subscriber
  IF sub_id IS NOT NULL THEN
    DELETE FROM public.subscribers WHERE id = sub_id;
    RAISE NOTICE 'Изтрит абонат: %', target_email;
  END IF;

  RAISE NOTICE 'automation_deliveries: %', deleted_automation;
  RAISE NOTICE 'campaign_deliveries: %', deleted_campaign;
  RAISE NOTICE 'email_link_clicks: %', deleted_clicks;
  RAISE NOTICE 'subscriber_purchases: %', deleted_purchases;
  RAISE NOTICE 'form_submissions: %', deleted_forms;
  RAISE NOTICE 'form_invitations: %', deleted_invites;
  RAISE NOTICE 'Готово. Регистрирай се отново със същия имейл за чист тест.';
  RAISE NOTICE 'Worker: стари jobs по имейл не се трият тук — виж scripts/delete-worker-jobs-by-email.sql';
END $$;
