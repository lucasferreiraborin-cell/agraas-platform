-- Migration 120: stock_batches RLS tenant isolation fix
--
-- Audit detectou 5 policies "permissivas" em stock_batches que NEUTRALIZAM
-- o tenant isolation. RLS no PostgreSQL combina policies via OR — então
-- bastava 1 policy com qual=true pra qualquer linha ser visível a qualquer
-- usuário autenticado.
--
-- Policies sendo REMOVIDAS (5):
--   • allow_all_select        (SELECT qual=true)        ← vazamento read
--   • allow_read_stock_batches (SELECT qual=true)       ← duplicata
--   • allow_all_insert        (INSERT with_check=true)  ← vazamento write
--   • allow_all_update        (UPDATE qual=true)        ← vazamento update
--   • allow_update_stock_batches (UPDATE qual=true)     ← duplicata
--
-- Policies PRESERVADAS (tenant-isolated, padrão já existente):
--   • stock_batches_select  USING (client_id IS NULL OR is_admin OR client_id=mine)
--   • stock_batches_insert  WITH CHECK (is_admin OR client_id=mine)
--   • stock_batches_update  USING (is_admin OR client_id=mine)
--   • stock_batches_delete  USING (is_admin OR client_id=mine)
--
-- Caveat: stock_batches_select tem cláusula `client_id IS NULL OR ...` —
-- mantida intencionalmente porque algumas linhas legadas têm client_id=NULL
-- e precisam ser visíveis. Esses NULLs precisam ser corrigidos depois, mas
-- não bloqueia este fix de segurança.

BEGIN;

DROP POLICY IF EXISTS allow_all_select         ON public.stock_batches;
DROP POLICY IF EXISTS allow_read_stock_batches ON public.stock_batches;
DROP POLICY IF EXISTS allow_all_insert         ON public.stock_batches;
DROP POLICY IF EXISTS allow_all_update         ON public.stock_batches;
DROP POLICY IF EXISTS allow_update_stock_batches ON public.stock_batches;

COMMIT;
