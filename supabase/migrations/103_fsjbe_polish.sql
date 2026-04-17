-- Migration 103: FSJBE — buyer portal + auditoria + fiscal + calendário + passport cache

DO $$
DECLARE
  v_client   uuid := '00000000-0000-0000-0003-000000000001';
  v_a1 uuid := '00000000-0000-0003-0003-000000000001';
  v_a2 uuid := '00000000-0000-0003-0003-000000000002';
  v_a3 uuid := '00000000-0000-0003-0003-000000000003';
  v_a4 uuid := '00000000-0000-0003-0003-000000000004';
  v_a5 uuid := '00000000-0000-0003-0003-000000000005';
  v_lot      uuid;
  v_pif      uuid;
  v_buyer    uuid;
  v_elanco   uuid;
  v_ourofino uuid;
  v_note1    uuid;
  v_note2    uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Buyer — Portal PIF vinculado ao lote FSJBE ═════════════════════════
  SELECT id INTO v_lot FROM lots
   WHERE client_id = v_client AND name = 'Engorda Q2 2026' LIMIT 1;

  -- Localiza PIF buyer existente
  SELECT id INTO v_pif FROM clients WHERE email = 'pif@agraas.com.br' LIMIT 1;

  IF v_pif IS NOT NULL AND v_lot IS NOT NULL THEN
    -- Cria buyer entry se não existir
    SELECT id INTO v_buyer FROM buyers WHERE client_id = v_client AND name ILIKE '%PIF%' LIMIT 1;
    IF v_buyer IS NULL THEN
      INSERT INTO buyers (client_id, name, cnpj, type, contact_name, notes, active)
      VALUES (v_client, 'PIF — Public Investment Fund', NULL, 'exportador', 'PIF Investor', 'Fundo soberano Arábia Saudita', true)
      RETURNING id INTO v_buyer;
    END IF;

    -- Vincula PIF ao lote FSJBE
    INSERT INTO lot_buyer_access (lot_id, buyer_client_id)
    VALUES (v_lot, v_pif)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ═══ 2. Audit Snapshot ═════════════════════════════════════════════════════
  DELETE FROM audit_snapshot WHERE client_id = v_client;

  INSERT INTO audit_snapshot (
    client_id, snapshot_date,
    inventoried_in, inventoried_out,
    movements_in, movements_out,
    not_inventoried_in, not_inventoried_out,
    total_present_in, total_present_out,
    total_stock_in, total_stock_out,
    duplicates, adjustments_inserted, exits_as_adjustment
  ) VALUES (
    v_client, CURRENT_DATE,
    5, 5,        -- inventário = 5 animais ativos
    3, 3,        -- 3 com movimentação (lote)
    0, 0,        -- 0 não inventariados
    5, 5,        -- total presentes
    5, 3,        -- estoque total: 5 entrada, 3 saída (2 vendidas)
    0, 0, 0      -- 0 duplicados, 0 ajustes, 0 saídas como ajuste
  );

  -- ═══ 3. Fiscal — 2 NF-e demo ══════════════════════════════════════════════
  DELETE FROM fiscal_notes WHERE client_id = v_client;

  SELECT id INTO v_elanco FROM suppliers WHERE client_id = v_client AND name ILIKE '%Elanco%' LIMIT 1;
  SELECT id INTO v_ourofino FROM suppliers WHERE client_id = v_client AND name ILIKE '%Ourofino%' LIMIT 1;

  INSERT INTO fiscal_notes (client_id, numero_nota, serie, emitente_nome, emitente_cnpj, data_emissao, valor_total, status, supplier_id)
  VALUES (v_client, 'NF-FSJBE-001', '1', 'Elanco Saúde Animal', '04.058.683/0001-04', '2026-02-15', 3600.00, 'validada', v_elanco)
  RETURNING id INTO v_note1;

  INSERT INTO fiscal_note_items (note_id, client_id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total)
  VALUES (v_note1, v_client, 'Ivermectina 1% — 200 frascos', '30049099', '5102', 200, 'FR', 18.00, 3600.00);

  INSERT INTO fiscal_notes (client_id, numero_nota, serie, emitente_nome, emitente_cnpj, data_emissao, valor_total, status, supplier_id)
  VALUES (v_client, 'NF-FSJBE-002', '1', 'Ourofino Saúde Animal', '54.516.661/0001-01', '2026-03-01', 1250.00, 'validada', v_ourofino)
  RETURNING id INTO v_note2;

  INSERT INTO fiscal_note_items (note_id, client_id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total)
  VALUES (v_note2, v_client, 'Vacina Aftosa — 500 doses', '30029099', '5102', 500, 'DS', 2.50, 1250.00);

  -- ═══ 4. Calendário sanitário — recalcula last_applied ═════════════════════
  UPDATE sanitary_calendar sc
     SET last_applied = sub.max_date
    FROM (
      SELECT product_name, MAX(application_date) AS max_date
        FROM applications
       WHERE animal_id IN (v_a1, v_a2, v_a3, v_a4, v_a5)
       GROUP BY product_name
    ) sub
   WHERE sc.client_id = v_client
     AND LOWER(sc.product_name) LIKE '%' || LOWER(LEFT(sub.product_name, 8)) || '%';

  -- ═══ 5. Passport cache — força repopulação via score recalc ═══════════════
  SET LOCAL session_replication_role = DEFAULT;

  PERFORM calculate_agraas_score(v_a1);
  PERFORM calculate_agraas_score(v_a2);
  PERFORM calculate_agraas_score(v_a3);
  PERFORM calculate_agraas_score(v_a4);
  PERFORM calculate_agraas_score(v_a5);

  -- Atualiza lots_count na propriedade
  UPDATE properties
     SET lots_count = (SELECT COUNT(*) FROM lots WHERE client_id = v_client AND status = 'active')
   WHERE id = '00000000-0000-0002-0003-000000000001';

  RAISE NOTICE 'Migration 103: FSJBE polish — buyer + audit + fiscal + calendar + passport';
END $$;
