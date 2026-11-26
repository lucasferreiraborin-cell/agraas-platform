-- Rollback da 182 (seed DEMO do estoque gerencial). Só na conta demo do
-- Lucas, só o que o seed criou: entradas das notas demo (lotes ligados aos
-- itens gestao-demo-it01..06), saídas dos abastecimentos demo (ab01..35),
-- produtos/almoxarifados com id md5('estoque-demo-*') que não estiverem em uso,
-- categorias criadas sem usuário (criado_por NULL, ou seja, pela semeadura)
-- que nenhum produto usa, fornecedores criados automaticamente pelas notas
-- demo e os eventos de auditoria do sistema (usuario NULL) da conta.
-- Não toca nas notas nem nos abastecimentos (são da 173). Idempotente.
BEGIN;

DO $$
DECLARE
  v_client uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_itens  uuid[];
  v_abs    uuid[];
BEGIN
  IF to_regclass('public.almoxarifados') IS NULL THEN
    RETURN; -- 181 não aplicada (ou já revertida): nada do seed existe
  END IF;
  SELECT array_agg(md5('gestao-demo-it0' || g)::uuid) INTO v_itens FROM generate_series(1, 6) g;
  SELECT array_agg(md5('gestao-demo-ab' || lpad(g::text, 2, '0'))::uuid) INTO v_abs FROM generate_series(1, 35) g;

  DELETE FROM public.stock_movements
   WHERE client_id = v_client AND reference_table = 'abastecimentos' AND reference_id = ANY (v_abs);
  DELETE FROM public.stock_movements
   WHERE client_id = v_client
     AND batch_id IN (SELECT b.id FROM public.stock_batches b WHERE b.client_id = v_client AND b.nota_item_id = ANY (v_itens));
  UPDATE public.fiscal_invoice_items
     SET linked_stock_batch_id = NULL
   WHERE id = ANY (v_itens)
     AND linked_stock_batch_id IN (SELECT b.id FROM public.stock_batches b WHERE b.client_id = v_client AND b.nota_item_id = ANY (v_itens));
  DELETE FROM public.stock_batches WHERE client_id = v_client AND nota_item_id = ANY (v_itens);

  -- Produtos do seed sem lote, movimento ou aplicação.
  DELETE FROM public.products p
   WHERE p.client_id = v_client
     AND p.id IN (SELECT md5('estoque-demo-pr0' || g)::uuid FROM generate_series(1, 4) g)
     AND NOT EXISTS (SELECT 1 FROM public.stock_batches b WHERE b.product_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.stock_movements m WHERE m.product_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.product_id = p.id);
  -- Produtos que ficam: some a ligação com cadastros do seed (só se ainda for a do seed).
  UPDATE public.products p SET almoxarifado_padrao_id = NULL
   WHERE p.client_id = v_client
     AND p.almoxarifado_padrao_id IN (SELECT md5('estoque-demo-al0' || g)::uuid FROM generate_series(1, 3) g);
  UPDATE public.products p SET categoria_gerencial_id = NULL
   WHERE p.client_id = v_client
     AND (p.id IN (SELECT md5('estoque-demo-pr0' || g)::uuid FROM generate_series(1, 4) g)
          OR p.id IN ('9c5e249d-b85d-4cd0-a2ed-ffbd24aa4284', '5f60b415-ddbe-4a95-8756-e48088d6120d', '11111111-0000-0000-0000-000000000001'))
     AND p.categoria_gerencial_id IN (SELECT c.id FROM public.categorias_gerenciais c WHERE c.client_id = v_client AND c.criado_por IS NULL);

  DELETE FROM public.almoxarifados a
   WHERE a.client_id = v_client
     AND a.id IN (SELECT md5('estoque-demo-al0' || g)::uuid FROM generate_series(1, 3) g)
     AND NOT EXISTS (SELECT 1 FROM public.stock_batches b WHERE b.almoxarifado_id = a.id)
     AND NOT EXISTS (SELECT 1 FROM public.stock_movements m WHERE m.almoxarifado_id = a.id);

  DELETE FROM public.categorias_gerenciais c
   WHERE c.client_id = v_client AND c.criado_por IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.categoria_gerencial_id = c.id);

  -- Fornecedores que a entrada das notas demo criou (CNPJs fictícios da 173).
  BEGIN
    DELETE FROM public.suppliers s
     WHERE s.client_id = v_client
       AND s.cnpj IN ('99.999.999/0001-99', '99.999.999/0002-80')
       AND s.notes LIKE 'Criado automaticamente pelo emitente da NF-e%'
       AND NOT EXISTS (SELECT 1 FROM public.stock_batches b WHERE b.supplier_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.supplier_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM public.fiscal_notes n WHERE n.supplier_id = s.id);
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '182_down: fornecedor demo em uso por outra tabela — mantido.';
  END;

  -- Eventos do sistema (sem usuário) da conta demo: carga e esta limpeza.
  DELETE FROM public.auditoria_eventos WHERE client_id = v_client AND usuario IS NULL;
END
$$;

COMMIT;
