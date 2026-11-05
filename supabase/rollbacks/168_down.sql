-- ============================================================================
-- 168 down · Remove o stub automático de client no signUp
-- ============================================================================
BEGIN;

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_auth_user_id_key;
ALTER TABLE public.clients DROP COLUMN IF EXISTS onboarded_at;

COMMIT;
