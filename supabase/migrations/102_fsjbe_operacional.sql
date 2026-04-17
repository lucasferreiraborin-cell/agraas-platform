-- Migration 102: FSJBE — fornecedores + estoque + lote + vendas + abate + custo + IA

DO $$
DECLARE
  v_client   uuid := '00000000-0000-0000-0003-000000000001';
  v_prop     uuid := '00000000-0000-0002-0003-000000000001';
  v_a1 uuid := '00000000-0000-0003-0003-000000000001'; -- BER-001
  v_a2 uuid := '00000000-0000-0003-0003-000000000002'; -- BER-002
  v_a3 uuid := '00000000-0000-0003-0003-000000000003'; -- BER-003
  v_a4 uuid := '00000000-0000-0003-0003-000000000004'; -- BER-004
  v_a5 uuid := '00000000-0000-0003-0003-000000000005'; -- BER-005
  v_ourofino uuid; v_elanco uuid; v_zoetis uuid;
  v_prod_aftosa uuid; v_prod_iverm uuid; v_prod_bruc uuid;
  v_lot uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Fornecedores ════════════════════════════════════════════════════════
  DELETE FROM suppliers WHERE client_id = v_client;

  INSERT INTO suppliers (client_id, name, cnpj, category, contact_name, contact_phone, active)
  VALUES
    (v_client, 'Ourofino Saúde Animal', '54.516.661/0001-01', 'vacina',       'Carlos Gerente', '(62) 99999-0001', true)
  RETURNING id INTO v_ourofino;

  INSERT INTO suppliers (client_id, name, cnpj, category, contact_name, contact_phone, active)
  VALUES
    (v_client, 'Elanco Saúde Animal',   '04.058.683/0001-04', 'medicamento',  'Ana Comercial',  '(62) 99999-0002', true)
  RETURNING id INTO v_elanco;

  INSERT INTO suppliers (client_id, name, cnpj, category, contact_name, contact_phone, active)
  VALUES
    (v_client, 'Zoetis Brasil',         '60.534.143/0001-78', 'medicamento',  'Roberto Sales',  '(62) 99999-0003', true)
  RETURNING id INTO v_zoetis;

  -- ═══ 2. Produtos vinculados ═════════════════════════════════════════════════
  INSERT INTO products (client_id, supplier_id, name, category, unit, withdrawal_days, active)
  VALUES (v_client, v_ourofino, 'Vacina Aftosa Ourofino', 'vacina', 'dose', 0, true)
  RETURNING id INTO v_prod_aftosa;

  INSERT INTO products (client_id, supplier_id, name, category, unit, withdrawal_days, active)
  VALUES (v_client, v_elanco, 'Ivermectina 1% Elanco', 'medicamento', 'frasco', 30, true)
  RETURNING id INTO v_prod_iverm;

  INSERT INTO products (client_id, supplier_id, name, category, unit, withdrawal_days, active)
  VALUES (v_client, v_ourofino, 'Vacina Brucelose B19', 'vacina', 'dose', 0, true)
  RETURNING id INTO v_prod_bruc;

  -- ═══ 3. Estoque (3 lotes) ══════════════════════════════════════════════════
  DELETE FROM stock_batches WHERE client_id = v_client;

  INSERT INTO stock_batches (client_id, product_id, batch_number, quantity, quantity_received, expiration_date, unit_cost, entry_date)
  VALUES
    (v_client, v_prod_aftosa, 'AFT-FSJBE-2026-001', 500, 500, CURRENT_DATE + INTERVAL '6 months',  2.50, '2026-01-10'),
    (v_client, v_prod_iverm,  'IVE-FSJBE-2026-002', 200, 200, CURRENT_DATE + INTERVAL '12 months', 18.00, '2026-02-05'),
    (v_client, v_prod_bruc,   'BRU-FSJBE-2026-001', 100, 100, CURRENT_DATE + INTERVAL '4 months',  8.00, '2026-03-01');

  -- ═══ 4. Lote de exportação ═════════════════════════════════════════════════
  DELETE FROM lots WHERE client_id = v_client;

  INSERT INTO lots (client_id, property_id, name, objective, start_date, status,
    pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato)
  VALUES (
    v_client, v_prop, 'Engorda Q2 2026', 'Exportação', '2026-04-01', 'active',
    'Arábia Saudita', 'Porto de Santos', '2026-07-15',
    ARRAY['Halal','MAPA','SIF'], 'EXP-FSJBE-2026-001'
  ) RETURNING id INTO v_lot;

  -- Vincula 3 animais ao lote
  INSERT INTO animal_lot_assignments (lot_id, animal_id, entry_date) VALUES
    (v_lot, v_a1, '2026-04-01'),
    (v_lot, v_a3, '2026-04-01'),
    (v_lot, v_a5, '2026-04-01');

  -- ═══ 5. Vendas (2) ════════════════════════════════════════════════════════
  DELETE FROM events WHERE animal_id IN (v_a2, v_a4) AND event_type = 'ownership_transfer';

  INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
    (v_a2, 'animal', 'ownership_transfer', '2026-03-10',
     '{"animal_code":"BER-002","comprador":"Frigoboi Goiás","preco":4200,"peso":450}'),
    (v_a4, 'animal', 'ownership_transfer', '2026-03-28',
     '{"animal_code":"BER-004","comprador":"Frigoboi Goiás","preco":4560,"peso":480}');

  -- ═══ 6. Abate (BER-002 não está mais no rebanho — status → Vendido) ═════════
  -- Não insere em slaughter_records pois já vendida; update status
  -- (abate real será do comprador)

  -- ═══ 7. Cost summary ══════════════════════════════════════════════════════
  DELETE FROM animal_cost_summary WHERE client_id = v_client;

  INSERT INTO animal_cost_summary (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
  SELECT a.id, v_client,
    COALESCE((SELECT SUM(total_cost) FROM applications WHERE animal_id = a.id AND total_cost IS NOT NULL), 0) + 1440,
    (200 + (random() * 200)::int)::numeric,
    (180 + (random() * 370)::int)::numeric,
    0, now()
  FROM animals a WHERE a.client_id = v_client;

  UPDATE animal_cost_summary
     SET total_cost = total_input_cost + labor_cost + other_costs
   WHERE client_id = v_client;

  -- ═══ 8. AI Prediction (BER-004) ═══════════════════════════════════════════
  DELETE FROM ai_predictions WHERE client_id = v_client;

  INSERT INTO ai_predictions (animal_id, client_id, risk_level, alerts, recommendations, predicted_score_30d, created_at)
  VALUES (v_a4, v_client, 'medium',
    '["Intervalo entre pesagens > 45 dias — monitoramento recomendado"]'::jsonb,
    '["Agendar pesagem esta semana","Verificar condição corporal"]'::jsonb,
    68, now() - INTERVAL '3 hours');

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Migration 102: FSJBE operacional — fornecedores + estoque + lote + vendas + custos + IA';
END $$;
