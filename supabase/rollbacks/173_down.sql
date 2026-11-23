-- Rollback da 173 (seed DEMO do /gestao). Apaga SÓ os ids fixos do seed,
-- e só na conta demo do Lucas. Não toca nas notas que já existiam na conta
-- (apenas os títulos criados a partir delas). Idempotente.
BEGIN;

DO $$
DECLARE
  v_client uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
BEGIN
  IF to_regclass('public.titulos_financeiros') IS NOT NULL THEN
    DELETE FROM public.abastecimentos
     WHERE client_id = v_client
       AND id IN (SELECT md5('gestao-demo-ab' || lpad(g::text, 2, '0'))::uuid FROM generate_series(1, 35) g);

    DELETE FROM public.titulos_financeiros
     WHERE client_id = v_client
       AND id IN (SELECT md5('gestao-demo-tt' || lpad(g::text, 2, '0'))::uuid FROM generate_series(1, 41) g);

    DELETE FROM public.maquinas
     WHERE client_id = v_client
       AND id IN (SELECT md5('gestao-demo-mq0' || g)::uuid FROM generate_series(1, 4) g);

    DELETE FROM public.centros_custo
     WHERE client_id = v_client
       AND id IN (SELECT md5('gestao-demo-cc0' || g)::uuid FROM generate_series(1, 7) g);
  END IF;

  -- Itens primeiro (o CASCADE cobriria, mas fica explícito).
  DELETE FROM public.fiscal_invoice_items
   WHERE id IN (SELECT md5('gestao-demo-it0' || g)::uuid FROM generate_series(1, 6) g)
     AND fiscal_invoice_id IN (SELECT id FROM public.fiscal_invoices WHERE client_id = v_client);

  DELETE FROM public.fiscal_invoices
   WHERE client_id = v_client
     AND access_key LIKE 'DEMO-GESTAO-%'
     AND id IN (SELECT md5('gestao-demo-nf0' || g)::uuid FROM generate_series(1, 4) g);
END
$$;

COMMIT;
