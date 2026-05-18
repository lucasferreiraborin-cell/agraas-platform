-- Rollback migration 109

BEGIN;

DROP TABLE IF EXISTS public.carbon_footprint_estimates;
DROP TABLE IF EXISTS public.feed_efficiency_records;
DROP TABLE IF EXISTS public.semen_batch_applications;

ALTER TABLE public.coverings DROP CONSTRAINT IF EXISTS coverings_semen_batch_fk;
DROP INDEX IF EXISTS idx_coverings_semen_batch;

DROP TABLE IF EXISTS public.semen_batches;

COMMIT;
