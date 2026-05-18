-- Rollback migration 112

BEGIN;

DROP TABLE IF EXISTS public.client_producer_types;
DROP TABLE IF EXISTS public.producer_types;
DROP TYPE  IF EXISTS producer_type_enum;

COMMIT;
