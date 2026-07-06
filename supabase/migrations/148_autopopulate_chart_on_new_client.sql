-- ============================================================
-- Migration 148 — Auto-popular plano de contas em novos clientes
-- Sprint K · 26/06/2026
--
-- PROBLEMA:
-- Cada novo client_id criado em `clients` precisa de um plano de contas
-- rural completo (114 contas, conforme 145_chart_of_accounts_rural_complete).
-- Hoje o seed só roda manualmente. Esquecer = lançamentos contábeis quebrados
-- (_ensure_chart_account silenciosamente cria uma conta órfã sem hierarquia).
--
-- FIX:
-- Trigger AFTER INSERT em clients que chama _seed_rural_chart_of_accounts.
-- Idempotente: ON CONFLICT DO NOTHING dentro do _seed garante reentrância.
--
-- Backend: este wrapper roda com SECURITY DEFINER porque _seed é DEFINER,
-- mas o trigger precisa ter o mesmo contexto pra inserir em chart_of_accounts
-- via RLS (proprietária é o postgres role).
-- ============================================================

CREATE OR REPLACE FUNCTION _trg_seed_chart_on_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Seed do plano de contas rural completo (114 contas)
  PERFORM _seed_rural_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION _trg_seed_chart_on_new_client() IS
  'Auto-popula plano de contas rural ao criar cliente. Idempotente.';

DROP TRIGGER IF EXISTS trg_seed_chart_on_new_client ON clients;
CREATE TRIGGER trg_seed_chart_on_new_client
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION _trg_seed_chart_on_new_client();
