-- Rollback migration 119

BEGIN;

DROP POLICY IF EXISTS animal_scores_select_mentor                 ON public.animal_scores;
DROP POLICY IF EXISTS animal_certifications_select_mentor         ON public.animal_certifications;
DROP POLICY IF EXISTS agraas_master_passport_cache_select_mentor  ON public.agraas_master_passport_cache;

COMMIT;
