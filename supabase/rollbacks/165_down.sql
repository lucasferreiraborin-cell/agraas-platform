-- Rollback da 165: remove o search_path das funções SECURITY DEFINER de public.
-- Só desfaça se algo depender de search_path dinâmico (não deveria).
BEGIN;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s RESET search_path', r.assinatura);
  END LOOP;
END $$;

COMMIT;
