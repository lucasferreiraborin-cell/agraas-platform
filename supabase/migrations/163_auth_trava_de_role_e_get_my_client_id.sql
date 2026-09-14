-- ============================================================================
-- 163 · Trava de escalação de papel + get_my_client_id() para todos os papéis
-- ============================================================================
-- Achados AUTH-02 e AUTH-05 do raio-x de 14/09/2026.
--
-- AUTH-02: a policy clients_update (132:195) deixa o usuário alterar a própria
--   linha inteira — inclusive `role`. Um produtor pode virar 'admin' com um
--   UPDATE e, a partir daí, is_admin() libera todas as policies. Não há
--   trigger nem REVOKE de coluna.
-- AUTH-05: get_my_client_id() (010:26-35) filtra `role = 'client'`; contador,
--   frigorífico e banco recebem NULL e falham em toda policy de INSERT/UPDATE
--   que depende dela. A forma correta é a da 004 (sem filtro de role): admin
--   já é coberto por is_admin() nas policies.
--
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10). Idempotente.
-- Rollback: supabase/rollbacks/163_down.sql
-- ============================================================================

BEGIN;

-- ── 1. Trava: só admin ou service_role muda role/plan/billing/auth_user_id ──
CREATE OR REPLACE FUNCTION public.clients_protege_colunas_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
BEGIN
  -- service_role (rotas admin com service key) e admin autenticado passam.
  IF jwt_role = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'clients.role só pode ser alterado por admin' USING ERRCODE = '42501';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'clients.auth_user_id só pode ser alterado por admin' USING ERRCODE = '42501';
  END IF;
  -- Colunas de cobrança, se existirem neste banco (o trigger é genérico via to_jsonb).
  IF to_jsonb(NEW) - 'updated_at' - 'name' - 'email' - 'phone' - 'farm_name' - 'tax_regime' - 'funrural_rate'
     IS DISTINCT FROM to_jsonb(OLD) - 'updated_at' - 'name' - 'email' - 'phone' - 'farm_name' - 'tax_regime' - 'funrural_rate'
  THEN
    -- Qualquer outra coluna (plan, billing_exempt, stripe_*, ...) fica travada
    -- para o próprio usuário; ele edita só nome/e-mail/telefone/fazenda/regime.
    RAISE EXCEPTION 'alteração de coluna protegida em clients requer admin' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_protege_colunas ON public.clients;
CREATE TRIGGER trg_clients_protege_colunas
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clients_protege_colunas_sensiveis();

-- ── 2. get_my_client_id() sem filtro de role ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_client_id() IS
  '163 (14/09/2026): sem filtro de role — contador/frigorífico/banco também resolvem. Admin é coberto por is_admin().';

COMMIT;
