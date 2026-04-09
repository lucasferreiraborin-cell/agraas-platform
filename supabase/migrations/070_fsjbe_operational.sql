-- Migration 070: FSJBE — preparação completa para operação real
-- Client: Fazenda São João da Boa Esperança (fsjdbe@gmail.com)

DO $$
DECLARE
  v_client uuid := '00000000-0000-0000-0003-000000000001';
  v_a1 uuid := '00000000-0000-0003-0003-000000000001'; -- BER-001 Nelore M 2021-04
  v_a2 uuid := '00000000-0000-0003-0003-000000000002'; -- BER-002 Nelore F 2020-08
  v_a3 uuid := '00000000-0000-0003-0003-000000000003'; -- BER-003 Nelore M 2019-11
  v_a4 uuid := '00000000-0000-0003-0003-000000000004'; -- BER-004 Nelore F 2025-02
  v_a5 uuid := '00000000-0000-0003-0003-000000000005'; -- BER-005 Nelore×Angus M 2022-06
BEGIN

  -- ══════════════════════════════════════════════════════════════════════════
  -- 1. Role → admin
  -- ══════════════════════════════════════════════════════════════════════════
  UPDATE clients SET role = 'admin' WHERE id = v_client;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 2. RFID bolus intra-ruminal
  -- ══════════════════════════════════════════════════════════════════════════
  UPDATE animals SET
    rfid = 'BRA076' || SUBSTRING(id::text, 1, 12),
    rfid_device_type = 'bolus_intra_ruminal'
  WHERE client_id = v_client;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 3. Pesagens históricas (3 por animal: nascimento, ~8m, ~14m)
  -- ══════════════════════════════════════════════════════════════════════════

  -- BER-001 (nasc 2021-04-12, Nelore M)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a1, 34,  '2021-04-12'),
    (v_a1, 225, '2021-12-10'),
    (v_a1, 380, '2022-06-15');

  -- BER-002 (nasc 2020-08-30, Nelore F)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a2, 32,  '2020-08-30'),
    (v_a2, 195, '2021-04-20'),
    (v_a2, 320, '2021-10-18');

  -- BER-003 (nasc 2019-11-05, Nelore M)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a3, 36,  '2019-11-05'),
    (v_a3, 240, '2020-07-08'),
    (v_a3, 420, '2021-01-12');

  -- BER-004 (nasc 2025-02-18, Nelore F — bezerra)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a4, 33,  '2025-02-18'),
    (v_a4, 95,  '2025-07-15');

  -- BER-005 (nasc 2022-06-01, Nelore×Angus M)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a5, 38,  '2022-06-01'),
    (v_a5, 230, '2023-02-10'),
    (v_a5, 365, '2023-08-05');

  -- Skip triggers for seed data (stock_batches trigger + legacy animal_events)
  SET LOCAL session_replication_role = 'replica';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 4. Aplicações sanitárias
  -- ══════════════════════════════════════════════════════════════════════════

  -- Aftosa (janeiro/2026) — todos os 5
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a1, 'Vacina Aftosa', 5, 'ml', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a2, 'Vacina Aftosa', 5, 'ml', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a3, 'Vacina Aftosa', 5, 'ml', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a4, 'Vacina Aftosa', 3, 'ml', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a5, 'Vacina Aftosa', 5, 'ml', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário');

  -- Brucelose (fevereiro/2026) — fêmeas 3-8 meses (BER-004)
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a4, 'Vacina Brucelose B19', 2, 'ml', '2026-02-10', '2026-02-10', 'Dr. Marcos Veterinário');

  -- Vermifugação (março/2026) — todos os 5 com carência de 30 dias
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a1, 'Ivermectina 1%', 10, 'ml', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a2, 'Ivermectina 1%', 8,  'ml', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a3, 'Ivermectina 1%', 12, 'ml', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a4, 'Ivermectina 1%', 3,  'ml', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a5, 'Ivermectina 1%', 8,  'ml', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 5. Eventos de ciclo de cria
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
    -- Nascimentos
    (v_a1, 'animal', 'nascimento',     '2021-04-12', 'Parto normal, 34kg'),
    (v_a2, 'animal', 'nascimento',     '2020-08-30', 'Parto normal, 32kg'),
    (v_a3, 'animal', 'nascimento',     '2019-11-05', 'Parto normal, 36kg'),
    (v_a4, 'animal', 'nascimento',     '2025-02-18', 'Parto normal, 33kg'),
    (v_a5, 'animal', 'nascimento',     '2022-06-01', 'Parto normal, 38kg — cruzamento Nelore×Angus'),
    -- Desmames
    (v_a1, 'animal', 'desmame',        '2021-12-10', 'Desmame aos 8 meses, 225kg'),
    (v_a2, 'animal', 'desmame',        '2021-04-20', 'Desmame aos 8 meses, 195kg'),
    (v_a3, 'animal', 'desmame',        '2020-07-08', 'Desmame aos 8 meses, 240kg'),
    (v_a5, 'animal', 'desmame',        '2023-02-10', 'Desmame aos 8 meses, 230kg'),
    -- Transferências para recria
    (v_a1, 'animal', 'transferencia',  '2022-01-15', 'Transferido para pasto de recria'),
    (v_a2, 'animal', 'transferencia',  '2021-05-10', 'Transferida para pasto de recria'),
    (v_a3, 'animal', 'transferencia',  '2020-08-01', 'Transferido para pasto de recria'),
    (v_a5, 'animal', 'transferencia',  '2023-03-01', 'Transferido para pasto de recria');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 6. Certificações
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    -- MAPA para todos
    (v_a1, 'MAPA-FSJBE-001', 'MAPA',                      'active', '2026-01-01', '2026-12-31'),
    (v_a2, 'MAPA-FSJBE-002', 'MAPA',                      'active', '2026-01-01', '2026-12-31'),
    (v_a3, 'MAPA-FSJBE-003', 'MAPA',                      'active', '2026-01-01', '2026-12-31'),
    (v_a4, 'MAPA-FSJBE-004', 'MAPA',                      'active', '2026-01-01', '2026-12-31'),
    (v_a5, 'MAPA-FSJBE-005', 'MAPA',                      'active', '2026-01-01', '2026-12-31'),
    -- Propriedade Rural Certificada
    (v_a1, 'PRC-FSJBE-001',  'Propriedade Rural Certificada', 'active', '2026-01-01', '2026-12-31'),
    (v_a2, 'PRC-FSJBE-002',  'Propriedade Rural Certificada', 'active', '2026-01-01', '2026-12-31'),
    (v_a3, 'PRC-FSJBE-003',  'Propriedade Rural Certificada', 'active', '2026-01-01', '2026-12-31'),
    (v_a4, 'PRC-FSJBE-004',  'Propriedade Rural Certificada', 'active', '2026-01-01', '2026-12-31'),
    (v_a5, 'PRC-FSJBE-005',  'Propriedade Rural Certificada', 'active', '2026-01-01', '2026-12-31');

  -- Restore triggers before score calculation
  SET LOCAL session_replication_role = DEFAULT;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 7. Calcula score para todos os animais
  -- ══════════════════════════════════════════════════════════════════════════

  PERFORM calculate_agraas_score(v_a1);
  PERFORM calculate_agraas_score(v_a2);
  PERFORM calculate_agraas_score(v_a3);
  PERFORM calculate_agraas_score(v_a4);
  PERFORM calculate_agraas_score(v_a5);

END $$;
