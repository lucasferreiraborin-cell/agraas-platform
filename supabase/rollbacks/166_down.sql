-- Rollback da 166: remove o search_path fixo de tg_set_updated_at.
BEGIN;

ALTER FUNCTION public.tg_set_updated_at() RESET search_path;

COMMIT;
