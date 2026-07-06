-- 154 — Hardening (continuação da 153): fixa search_path nas funções restantes
-- do schema public que ainda estão mutáveis. Após a 153 (que cobriu as
-- SECURITY DEFINER — o risco real de escalonamento), sobraram ~29 funções
-- SECURITY INVOKER. Nelas o risco é bem menor (rodam como o chamador, sem
-- privilégio de owner), mas o advisor oficial ainda as lista — fixar zera o
-- lint "function_search_path_mutable" e deixa o scan de DD 100% limpo.
--
-- `public, pg_temp` é seguro: todo objeto do app vive em public, e referências
-- a auth.*/storage.* já são schema-qualificadas (não dependem do search_path).
--
-- Idempotente: só toca funções sem search_path no proconfig.

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
      AND p.prokind = 'f'
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
