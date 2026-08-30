-- CI pipeline test: safe, idempotent, no schema changes
DO $$
BEGIN
  RAISE NOTICE 'healthyandconfident CI migration test OK at %', now();
END $$;
