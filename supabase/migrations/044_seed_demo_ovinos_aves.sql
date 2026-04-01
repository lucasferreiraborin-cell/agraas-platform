-- Migration 044: Schema extensions + Seed de demonstração — Ovinos e Aves (Lucas only)

-- ─── Extensões do schema ──────────────────────────────────────────────────────

ALTER TABLE livestock_species
  ADD COLUMN IF NOT EXISTS score          integer CHECK (score >= 0 AND score <= 100),
  ADD COLUMN IF NOT EXISTS certifications text[]  NOT NULL DEFAULT '{}';

-- ─── Seed de demonstração — apenas cliente Lucas ──────────────────────────────

DO $$
DECLARE
  v_client_id        uuid;
  v_property_id      uuid;
  v_animal_quarantine uuid;
  v_batch1_id        uuid;
  v_batch2_id        uuid;
BEGIN
  -- Busca cliente Lucas pelo nome
  SELECT id INTO v_client_id FROM clients WHERE name ILIKE '%lucas%' LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Lucas não encontrado em clients.name ILIKE lucas';
  END IF;

  -- Primeira propriedade de Lucas (pode ser NULL — seed funciona sem ela)
  SELECT id INTO v_property_id FROM properties WHERE client_id = v_client_id LIMIT 1;

  -- ── 8 ovinos/caprinos ────────────────────────────────────────────────────────

  INSERT INTO livestock_species
    (client_id, property_id, species, breed, birth_date, sex, weight_kg, status, internal_code, agraas_id, score, certifications)
  VALUES
    (v_client_id, v_property_id, 'ovino',   'Dorper',       '2022-03-15', 'Male',   68.5, 'active',     'OV-001', 'AGR-OV-001', 84, ARRAY['Halal']),
    (v_client_id, v_property_id, 'ovino',   'Dorper',       '2022-05-20', 'Female', 52.0, 'active',     'OV-002', 'AGR-OV-002', 79, ARRAY['Halal']),
    (v_client_id, v_property_id, 'ovino',   'Santa Inês',   '2021-11-08', 'Male',   74.2, 'active',     'OV-003', 'AGR-OV-003', 91, '{}'),
    (v_client_id, v_property_id, 'ovino',   'Santa Inês',   '2022-01-30', 'Female', 48.5, 'active',     'OV-004', 'AGR-OV-004', 76, '{}'),
    (v_client_id, v_property_id, 'ovino',   'Dorper',       '2023-02-14', 'Male',   61.0, 'active',     'OV-005', 'AGR-OV-005', 68, '{}'),
    (v_client_id, v_property_id, 'ovino',   'Santa Inês',   '2022-09-03', 'Female', 45.5, 'active',     'OV-006', 'AGR-OV-006', 72, '{}'),
    (v_client_id, v_property_id, 'caprino', 'Boer',         '2022-07-12', 'Male',   55.0, 'quarantine', 'CP-001', 'AGR-CP-001', 88, '{}'),
    (v_client_id, v_property_id, 'caprino', 'Anglo-Nubiana','2023-04-25', 'Female', 38.0, 'active',     'CP-002', 'AGR-CP-002', 63, '{}');

  -- ── Quarentena pré-embarque (CP-001, aprovada) ────────────────────────────────

  SELECT id INTO v_animal_quarantine
    FROM livestock_species
    WHERE client_id = v_client_id AND internal_code = 'CP-001'
    LIMIT 1;

  INSERT INTO pre_shipment_quarantine
    (client_id, animal_id, start_date, end_date, veterinarian, status, observations)
  VALUES (
    v_client_id, v_animal_quarantine,
    '2024-11-01', '2024-11-21',
    'Dr. Marcos Oliveira — CRMV-SP 12345',
    'aprovado',
    'Quarentena de 21 dias concluída sem intercorrências. Sorologia negativa para Brucella e Tuberculose. Animal apto para embarque internacional.'
  );

  -- ── 2 lotes avícolas ──────────────────────────────────────────────────────────

  INSERT INTO poultry_batches
    (client_id, property_id, batch_code, species, breed, housing_date, initial_count, current_count, mortality_count, average_weight_kg, feed_conversion, integrator_name, status)
  VALUES
    (v_client_id, v_property_id, 'FRG-2025-001', 'frango', 'Ross 308', '2025-01-15', 15000, 14850, 150,  1.82, 1.68, 'BRF S.A.',  'em_crescimento'),
    (v_client_id, v_property_id, 'FRG-2025-002', 'frango', 'Cobb 500', '2024-11-20', 15000, 14200, 800,  2.61, 1.74, 'JBS Aves',  'pronto_abate');

  SELECT id INTO v_batch1_id FROM poultry_batches WHERE client_id = v_client_id AND batch_code = 'FRG-2025-001';
  SELECT id INTO v_batch2_id FROM poultry_batches WHERE client_id = v_client_id AND batch_code = 'FRG-2025-002';

  -- ── Eventos lote FRG-2025-001 (em crescimento) ───────────────────────────────

  INSERT INTO poultry_batch_events (batch_id, client_id, event_type, date, value, notes, operator) VALUES
    (v_batch1_id, v_client_id, 'vacina',     '2025-01-16', NULL, 'Newcastle + Gumboro — aplicação via água', 'José Ferreira'),
    (v_batch1_id, v_client_id, 'pesagem',    '2025-01-22', 0.18, 'Peso médio 7 dias: 0,18 kg',               'José Ferreira'),
    (v_batch1_id, v_client_id, 'mortalidade','2025-01-25', 42,   'Mortalidade semanal normal — estresse calor', 'José Ferreira'),
    (v_batch1_id, v_client_id, 'pesagem',    '2025-02-05', 0.82, 'Peso médio 21 dias: 0,82 kg',              'José Ferreira'),
    (v_batch1_id, v_client_id, 'racao',      '2025-02-10', 4200, 'Troca para ração de crescimento (kg)', 'José Ferreira'),
    (v_batch1_id, v_client_id, 'pesagem',    '2025-02-19', 1.82, 'Peso médio 35 dias: 1,82 kg',              'José Ferreira');

  -- ── Eventos lote FRG-2025-002 (pronto para abate) ────────────────────────────

  INSERT INTO poultry_batch_events (batch_id, client_id, event_type, date, value, notes, operator) VALUES
    (v_batch2_id, v_client_id, 'vacina',     '2024-11-21', NULL, 'Newcastle + Bronquite — aplicação spray', 'Maria Santos'),
    (v_batch2_id, v_client_id, 'pesagem',    '2024-11-28', 0.21, 'Peso médio 7 dias: 0,21 kg',              'Maria Santos'),
    (v_batch2_id, v_client_id, 'mortalidade','2024-12-10', 380,  'Mortalidade elevada — coccidiose. Tratamento iniciado.',  'Dr. Paulo CRMV 9876'),
    (v_batch2_id, v_client_id, 'racao',      '2024-12-15', 5100, 'Troca para ração de engorda (kg)', 'Maria Santos'),
    (v_batch2_id, v_client_id, 'pesagem',    '2024-12-19', 1.94, 'Peso médio 29 dias: 1,94 kg',             'Maria Santos'),
    (v_batch2_id, v_client_id, 'pesagem',    '2025-01-02', 2.61, 'Peso médio 43 dias: 2,61 kg — pronto para abate', 'Maria Santos');

END $$;
