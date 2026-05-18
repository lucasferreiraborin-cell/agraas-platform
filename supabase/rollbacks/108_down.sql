-- Rollback migration 108

BEGIN;

DROP TABLE IF EXISTS public.bull_breeding_soundness;
DROP TABLE IF EXISTS public.births;
DROP TABLE IF EXISTS public.pregnancy_diagnostics;
DROP TABLE IF EXISTS public.coverings;

DROP TYPE IF EXISTS bull_classification_enum;
DROP TYPE IF EXISTS birth_difficulty_enum;
DROP TYPE IF EXISTS pregnancy_diag_result_enum;
DROP TYPE IF EXISTS pregnancy_diag_method_enum;
DROP TYPE IF EXISTS covering_type_enum;

COMMIT;
