-- ============================================================================
-- 168 · Fecha "conta órfã" na raiz: stub automático em auth.users
-- ============================================================================
-- A 167 tapou o sintoma (4 RPCs vazando entre tenants quando o usuário
-- autenticado não tem linha em `clients`). Esta migration fecha a causa: o
-- signUp() no navegador cria `auth.users` antes de /api/cadastro/finalizar
-- criar o `client`, e esse segundo passo pode nunca rodar (aba fechada, rede
-- cai, etc) — daí a conta órfã.
--
-- Fix: trigger AFTER INSERT ON auth.users cria o client no mesmo instante do
-- signUp, com role 'client' provisório. Nunca mais existe usuário autenticado
-- sem client_id. /api/cadastro/finalizar passa a UPDATE esse stub (em vez de
-- INSERT) e marca `onboarded_at` quando o formulário real é preenchido —
-- coluna nova, usada só por essa rota para diferenciar "stub" de "finalizado".
--
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10). Idempotente.
-- Rollback: supabase/rollbacks/168_down.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Backfill: toda linha já vinculada a um auth_user_id é tratada como já
-- onboarded, pra /api/cadastro/finalizar nunca reescrever cliente existente.
UPDATE public.clients
   SET onboarded_at = created_at
 WHERE auth_user_id IS NOT NULL
   AND onboarded_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_auth_user_id_key'
  ) THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.clients (auth_user_id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Pendente'), 'client')
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  '168 (05/11/2026): cria client stub no signUp — fecha a conta órfã na raiz (ver 167).';

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
