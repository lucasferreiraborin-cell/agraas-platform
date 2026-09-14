-- Rollback da 163: remove a trava e devolve get_my_client_id() à forma da 010.
BEGIN;

DROP TRIGGER IF EXISTS trg_clients_protege_colunas ON public.clients;
DROP FUNCTION IF EXISTS public.clients_protege_colunas_sensiveis();

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() AND role = 'client' LIMIT 1;
$$;

COMMIT;
