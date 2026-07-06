-- 153 — Hardening de segurança: fixa search_path em todas as funções
-- SECURITY DEFINER do schema public que ainda estão com search_path mutável.
--
-- Motivo (advisor oficial Supabase 06/07/2026 — "function_search_path_mutable",
-- 43 ocorrências): uma função SECURITY DEFINER com search_path mutável pode ser
-- explorada por search_path injection — um chamador manipula o search_path da
-- sessão e faz a função resolver um objeto malicioso em vez do esperado, rodando
-- com os privilégios do owner. Fixar o search_path fecha esse vetor.
--
-- Escolha `public, pg_temp` (não `''`): as funções existentes foram escritas
-- assumindo `public` no path (referenciam tabelas sem qualificar schema). Fixar
-- em `public, pg_temp` remove a mutabilidade/injeção SEM quebrar o corpo delas.
-- pg_temp por último é a recomendação oficial (evita shadowing por objetos temp).
--
-- Idempotente: só altera funções que ainda NÃO têm search_path no proconfig.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
      r.proname, r.args
    );
  END LOOP;
END $$;
