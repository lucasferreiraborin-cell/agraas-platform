-- ============================================================================
-- 165 · search_path fixo em toda função SECURITY DEFINER do schema public
-- ============================================================================
-- DB-06 (raio-x 14/09/2026): 13 funções vivas (get_my_client_id, is_admin,
-- score, estoque...) dependem exclusivamente da 153 para ter search_path, e
-- qualquer CREATE OR REPLACE posterior pode regredir. Esta migration é
-- INTROSPECTIVA: percorre pg_proc e aplica `SET search_path = public, pg_temp`
-- em toda função SECURITY DEFINER de `public` que ainda não o tenha. Não
-- reescreve corpo nenhum. Idempotente. Reporta o que alterou.
--
-- Recomendação do advisor do Supabase (function_search_path_mutable).
-- NÃO APLICAR sem ordem expressa do Lucas. Rollback: 165_down.sql.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  r record;
  v_alteradas int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.assinatura);
    v_alteradas := v_alteradas + 1;
    RAISE NOTICE '165: search_path fixado em %', r.assinatura;
  END LOOP;
  RAISE NOTICE '165: % funções SECURITY DEFINER ajustadas', v_alteradas;
END $$;

COMMIT;
