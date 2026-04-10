-- Migration 094: Fiscal — cleanup nomes/datas + 6 notas validadas + 1 estoque

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_ourofino uuid;
  v_zoetis   uuid;
  v_elanco   uuid;
  v_supplier_id uuid;
  v_product_id  uuid;
  v_note_id     uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Cleanup nome 'PDF importado--' ═════════════════════════════════════
  UPDATE fiscal_notes
     SET numero_nota = 'PDF-2026-001'
   WHERE numero_nota = 'PDF importado--' OR numero_nota ILIKE 'pdf importado%';

  -- ═══ 2. Cleanup data PROTON ═════════════════════════════════════════════════
  UPDATE fiscal_notes
     SET data_emissao = '2026-03-24'
   WHERE emitente_nome ILIKE '%PROTON%' AND data_emissao = '2026-03-23';

  -- ═══ 3. Garante adiciona auto_stock_entry column (se não existir) ═══════════
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'fiscal_notes' AND column_name = 'auto_stock_entry'
  ) THEN
    ALTER TABLE fiscal_notes ADD COLUMN auto_stock_entry boolean NOT NULL DEFAULT false;
  END IF;

  -- ═══ 4. Seed 6 notas validadas (sem alertas) ═══════════════════════════════
  -- Limpa notas demo prévias (mantém PROTON e PDF-2026-001)
  DELETE FROM fiscal_notes
   WHERE client_id = v_lucas
     AND emitente_nome IN ('Ourofino Saúde Animal', 'Zoetis Brasil', 'Elanco Saúde Animal')
     AND numero_nota LIKE 'NF-DEMO-%';

  INSERT INTO fiscal_notes (client_id, numero_nota, serie, emitente_nome, emitente_cnpj, data_emissao, valor_total, status)
  VALUES
    (v_lucas, 'NF-DEMO-001', '1', 'Ourofino Saúde Animal', '54.516.661/0001-01', '2026-02-12', 1200.00, 'validada'),
    (v_lucas, 'NF-DEMO-002', '1', 'Zoetis Brasil',         '60.534.143/0001-78', '2026-02-25', 3450.00, 'validada'),
    (v_lucas, 'NF-DEMO-003', '1', 'Elanco Saúde Animal',   '04.058.683/0001-04', '2026-03-05',  890.00, 'validada'),
    (v_lucas, 'NF-DEMO-004', '1', 'Ourofino Saúde Animal', '54.516.661/0001-01', '2026-03-12', 2100.00, 'validada'),
    (v_lucas, 'NF-DEMO-005', '1', 'Zoetis Brasil',         '60.534.143/0001-78', '2026-03-22', 4780.00, 'validada'),
    (v_lucas, 'NF-DEMO-006', '1', 'Elanco Saúde Animal',   '04.058.683/0001-04', '2026-04-02',  670.00, 'validada');

  -- ═══ 5. Marca uma nota como auto_stock_entry e cria stock_batch ════════════
  UPDATE fiscal_notes
     SET auto_stock_entry = true
   WHERE client_id = v_lucas AND numero_nota = 'NF-DEMO-001'
   RETURNING id INTO v_note_id;

  -- Tenta criar item da nota + lote de estoque vinculado
  IF v_note_id IS NOT NULL THEN
    INSERT INTO fiscal_note_items (note_id, client_id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total)
    VALUES (v_note_id, v_lucas, 'Bimectin 500ml — Vermífugo injetável', '30049099', '5102', 4, 'FR', 300.00, 1200.00);

    -- Localiza um produto Bimectin existente para vincular ao lote
    SELECT id, supplier_id INTO v_product_id, v_supplier_id
      FROM products WHERE client_id = v_lucas AND name ILIKE '%bimectin%' LIMIT 1;

    -- Se a tabela stock_batches existe, cria lote vinculado
    IF v_product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_batches'
    ) THEN
      INSERT INTO stock_batches (client_id, product_id, batch_number, expiration_date, quantity)
      VALUES (v_lucas, v_product_id, 'NFE-DEMO-001', '2027-03-01', 4);
    END IF;
  END IF;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 094: fiscal — 6 notas validadas + 1 vinculada ao estoque';
END $$;
