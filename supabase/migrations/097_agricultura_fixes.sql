-- Migration 097: Agricultura — datas embarque + score talhão B + seed fiscal

DO $$
DECLARE
  v_lucas    uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_farm     uuid;
  v_field_a  uuid;
  v_note1    uuid;
  v_note2    uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Datas do embarque AGR-SOJ-2026-001 ═════════════════════════════════
  UPDATE crop_shipments
     SET departure_date = '2026-04-10',
         arrival_date   = '2026-05-02'
   WHERE contract_number = 'AGR-SOJ-2026-001';

  -- ═══ 2. Score do Talhão B (TAL-B) — 50 → 68 ════════════════════════════════
  UPDATE crop_fields
     SET score = 68
   WHERE field_code = 'TAL-B';

  -- ═══ 3. Lookup farm + talhão A para vinculação fiscal ══════════════════════
  SELECT id INTO v_farm FROM farms_agriculture
   WHERE client_id = v_lucas
   ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_field_a FROM crop_fields
   WHERE field_code = 'TAL-A' AND client_id = v_lucas LIMIT 1;

  -- ═══ 4. Seed 2 notas fiscais agrícolas demo ════════════════════════════════
  -- Limpa demos anteriores
  DELETE FROM crop_fiscal_notes
   WHERE client_id = v_lucas
     AND numero_nota IN ('NF-AGR-DEMO-001', 'NF-AGR-DEMO-002');

  -- Nota 1: Roundup Bayer R$ 20.160 → fazenda
  INSERT INTO crop_fiscal_notes
    (client_id, farm_id, numero_nota, emitente_nome, emitente_cnpj, data_emissao, valor_total, status)
  VALUES
    (v_lucas, v_farm, 'NF-AGR-DEMO-001', 'Bayer S.A.',  '18.459.628/0001-15', '2026-03-12', 20160.00, 'validada')
  RETURNING id INTO v_note1;

  INSERT INTO crop_fiscal_note_items
    (note_id, client_id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total)
  VALUES
    (v_note1, v_lucas, 'Roundup Original 20L — Herbicida glifosato', '38083024', '5102', 24, 'LT', 840.00, 20160.00);

  -- Nota 2: Fertilizante MAP Mosaic R$ 513.000 → talhão A (vincula via farm)
  INSERT INTO crop_fiscal_notes
    (client_id, farm_id, numero_nota, emitente_nome, emitente_cnpj, data_emissao, valor_total, status)
  VALUES
    (v_lucas, v_farm, 'NF-AGR-DEMO-002', 'Mosaic Fertilizantes', '61.156.479/0001-90', '2026-03-20', 513000.00, 'validada')
  RETURNING id INTO v_note2;

  INSERT INTO crop_fiscal_note_items
    (note_id, client_id, descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total)
  VALUES
    (v_note2, v_lucas, 'Fertilizante MAP — Talhão A — Plantio Soja 2026', '31054000', '5102', 200, 'TO', 2565.00, 513000.00);

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 097: agricultura fixes';
END $$;
