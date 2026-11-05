-- ============================================================================
-- 166 · search_path fixo em tg_set_updated_at (sobrou do 165)
-- ============================================================================
-- Advisor do Supabase (function_search_path_mutable) apos aplicar a 165
-- (05/11/2026) apontou 1 funcao restante: tg_set_updated_at. A 165 so
-- cobriu funcoes SECURITY DEFINER; esta e SECURITY INVOKER (prosecdef=false),
-- por isso ficou de fora do filtro. Mesma correcao, idempotente.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'tg_set_updated_at'
      AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  ) THEN
    ALTER FUNCTION public.tg_set_updated_at() SET search_path = public, pg_temp;
    RAISE NOTICE '166: search_path fixado em tg_set_updated_at()';
  ELSE
    RAISE NOTICE '166: tg_set_updated_at ja tinha search_path ou nao existe';
  END IF;
END $$;
