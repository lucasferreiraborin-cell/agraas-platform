-- Migration 092: Seed custos por animal + 3 vendas demo para Lucas

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_atl uuid; v_imp uuid; v_ven uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. Custos por animal (alimentação 180d + sanitário + mão de obra)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM animal_cost_summary WHERE client_id = v_lucas;

  INSERT INTO animal_cost_summary (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
  SELECT
    a.id,
    v_lucas,
    -- Alimentação: R$ 8/cab/dia × 180 dias
    1440::numeric,
    -- Mão de obra: R$ 200-400
    (200 + (random() * 200)::int)::numeric,
    -- Sanitário + infra: R$ 180-750
    (180 + (random() * 570)::int)::numeric,
    -- Total: soma
    (1440 + (200 + (random() * 200)::int) + (180 + (random() * 570)::int))::numeric,
    now()
  FROM animals a
  WHERE a.client_id = v_lucas
    AND COALESCE(a.status, 'Ativo') = 'Ativo';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. Vendas demo (3 transferências como events)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Nota: BON-001 pertence a Pedro; substituído por VEN-001 (Boi Vendaval) que é
  -- novilho em engorda do Lucas, mais coerente com peso 385kg.
  SELECT id INTO v_atl FROM animals WHERE internal_code = 'ATL-001' AND client_id = v_lucas LIMIT 1;
  SELECT id INTO v_imp FROM animals WHERE internal_code = 'IMP-001' AND client_id = v_lucas LIMIT 1;
  SELECT id INTO v_ven FROM animals WHERE internal_code = 'VEN-001' AND client_id = v_lucas LIMIT 1;

  -- Limpa vendas demo prévias para evitar duplicação
  DELETE FROM events
   WHERE source = 'animal'
     AND event_type = 'ownership_transfer'
     AND animal_id IN (COALESCE(v_atl, '00000000-0000-0000-0000-000000000000'),
                       COALESCE(v_imp, '00000000-0000-0000-0000-000000000000'),
                       COALESCE(v_ven, '00000000-0000-0000-0000-000000000000'));

  IF v_atl IS NOT NULL THEN
    INSERT INTO events (animal_id, source, event_type, event_date, notes, document_source) VALUES
    (v_atl, 'animal', 'ownership_transfer', '2026-02-15',
     '{"animal_code":"ATL-001","comprador":"Frigoboi Goiás","preco":7025,"peso":562}',
     'nfe:000123');
  END IF;

  IF v_imp IS NOT NULL THEN
    INSERT INTO events (animal_id, source, event_type, event_date, notes, document_source) VALUES
    (v_imp, 'animal', 'ownership_transfer', '2026-03-10',
     '{"animal_code":"IMP-001","comprador":"Frigoboi Goiás","preco":6305,"peso":485}',
     'nfe:000124');
  END IF;

  IF v_ven IS NOT NULL THEN
    INSERT INTO events (animal_id, source, event_type, event_date, notes, document_source) VALUES
    (v_ven, 'animal', 'ownership_transfer', '2026-03-28',
     '{"animal_code":"VEN-001","comprador":"JBS Goiás","preco":4543,"peso":385}',
     NULL);
  END IF;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 092: custos + vendas inseridos para Lucas';
END $$;
