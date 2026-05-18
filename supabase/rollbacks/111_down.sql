-- Rollback migration 111

BEGIN;

DROP INDEX IF EXISTS public.idx_applications_animal_date;
DROP INDEX IF EXISTS public.idx_applications_batch;

DROP TRIGGER IF EXISTS applications_carencia_autofill ON public.applications;
DROP FUNCTION IF EXISTS public.trg_applications_carencia();

DROP TABLE IF EXISTS public.vaccination_schedules;
DROP TABLE IF EXISTS public.mapa_carencias;

COMMIT;
