-- Migration 101: FSJBE — Recria 5 animais BER-001..005 com dados operacionais completos
-- Contexto: migration 078 deletou todos os animais demo. Migration 070 (que os criava)
-- roda ANTES da 078 na ordem numérica, então o banco ficou com 0 animais.

DO $$
DECLARE
  v_client   uuid := '00000000-0000-0000-0003-000000000001';
  v_prop     uuid := '00000000-0000-0002-0003-000000000001';
  v_auth     uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid; v_a4 uuid; v_a5 uuid;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 0. Re-vincula auth_user_id (caso Auth user exista mas vínculo esteja NULL)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO v_auth FROM auth.users WHERE email = 'fsjdbe@gmail.com' LIMIT 1;
  IF v_auth IS NOT NULL THEN
    UPDATE clients SET auth_user_id = v_auth WHERE id = v_client AND auth_user_id IS NULL;
    RAISE NOTICE 'Auth user vinculado: %', v_auth;
  ELSE
    RAISE NOTICE 'Auth user fsjdbe@gmail.com NÃO encontrado — crie manualmente no dashboard';
  END IF;

  -- Garante property com coords reais de Jandaia-GO
  UPDATE properties
     SET lat = -17.048, lng = -50.146,
         area_hectares = COALESCE(area_hectares, 1850),
         animals_count = 5
   WHERE id = v_prop;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. Insere 5 animais Nelore (IDs fixos para idempotência)
  -- ═══════════════════════════════════════════════════════════════════════════
  SET LOCAL session_replication_role = 'replica';

  -- Limpa qualquer resíduo (idempotência)
  DELETE FROM animals WHERE client_id = v_client;

  INSERT INTO animals (id, client_id, current_property_id, internal_code, nickname, sex, breed, birth_date, status, category)
  VALUES
    ('00000000-0000-0003-0003-000000000001', v_client, v_prop, 'BER-001', 'Boi Barroso',     'Male',   'Nelore',         '2021-04-12', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a1;

  INSERT INTO animals (id, client_id, current_property_id, internal_code, nickname, sex, breed, birth_date, status, category)
  VALUES
    ('00000000-0000-0003-0003-000000000002', v_client, v_prop, 'BER-002', 'Vaca Diamante',   'Female', 'Nelore',         '2020-08-30', 'Ativo', 'Vaca gestante')
  RETURNING id INTO v_a2;

  INSERT INTO animals (id, client_id, current_property_id, internal_code, nickname, sex, breed, birth_date, status, category)
  VALUES
    ('00000000-0000-0003-0003-000000000003', v_client, v_prop, 'BER-003', 'Touro Cândido',   'Male',   'Nelore',         '2019-11-05', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a3;

  INSERT INTO animals (id, client_id, current_property_id, internal_code, nickname, sex, breed, birth_date, status, category)
  VALUES
    ('00000000-0000-0003-0003-000000000004', v_client, v_prop, 'BER-004', 'Bezerra Flor',    'Female', 'Nelore',         '2025-02-18', 'Ativo', 'Bezerra')
  RETURNING id INTO v_a4;

  INSERT INTO animals (id, client_id, current_property_id, internal_code, nickname, sex, breed, birth_date, status, category)
  VALUES
    ('00000000-0000-0003-0003-000000000005', v_client, v_prop, 'BER-005', 'Boi Corisco',     'Male',   'Nelore x Angus', '2022-06-01', 'Ativo', 'Novilho em engorda')
  RETURNING id INTO v_a5;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. Pesagens progressivas (nascimento → desmame → recria/terminação)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- BER-001 (Nelore M, nascido 2021-04-12 — touro 5 anos, ~520kg)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a1, 34,  '2021-04-12'),   -- nascimento
    (v_a1, 225, '2021-12-10'),   -- desmame 8m
    (v_a1, 380, '2022-06-15'),   -- recria 14m
    (v_a1, 520, '2026-03-20');   -- peso atual

  -- BER-002 (Nelore F, nascida 2020-08-30 — vaca 5.5 anos, ~420kg)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a2, 32,  '2020-08-30'),
    (v_a2, 195, '2021-04-20'),
    (v_a2, 320, '2021-10-18'),
    (v_a2, 420, '2026-03-22');

  -- BER-003 (Nelore M, nascido 2019-11-05 — touro 6.5 anos, ~620kg)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a3, 36,  '2019-11-05'),
    (v_a3, 240, '2020-07-08'),
    (v_a3, 420, '2021-01-12'),
    (v_a3, 620, '2026-03-18');

  -- BER-004 (Nelore F, nascida 2025-02-18 — bezerra 14 meses, ~180kg)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a4, 33,  '2025-02-18'),
    (v_a4, 95,  '2025-07-15'),
    (v_a4, 180, '2026-04-10');

  -- BER-005 (Nelore×Angus M, nascido 2022-06-01 — novilho 3.8 anos, ~480kg)
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a5, 38,  '2022-06-01'),
    (v_a5, 230, '2023-02-10'),
    (v_a5, 365, '2023-08-05'),
    (v_a5, 480, '2026-03-25');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. Aplicações sanitárias (Aftosa + Brucelose + Ivermectina)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Aftosa (janeiro/2026) — todos, sem carência
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a1, 'Vacina Aftosa',       5, 'mL', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a2, 'Vacina Aftosa',       5, 'mL', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a3, 'Vacina Aftosa',       5, 'mL', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a4, 'Vacina Aftosa',       3, 'mL', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário'),
    (v_a5, 'Vacina Aftosa',       5, 'mL', '2026-01-15', '2026-01-15', 'Dr. Marcos Veterinário');

  -- Brucelose B19 (fevereiro/2026) — fêmeas 3-8 meses (BER-004)
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a4, 'Vacina Brucelose B19', 2, 'mL', '2026-02-10', '2026-02-10', 'Dr. Marcos Veterinário');

  -- Ivermectina (março/2026) — todos, carência 30 dias
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a1, 'Ivermectina 1%', 10, 'mL', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a2, 'Ivermectina 1%',  8, 'mL', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a3, 'Ivermectina 1%', 12, 'mL', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a4, 'Ivermectina 1%',  3, 'mL', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário'),
    (v_a5, 'Ivermectina 1%',  8, 'mL', '2026-03-01', '2026-03-31', 'Dr. Marcos Veterinário');

  -- Clostridiose (abril/2026) — todos, sem carência
  INSERT INTO applications (animal_id, product_name, dose, unit, application_date, withdrawal_date, operator_name) VALUES
    (v_a1, 'Vacina Clostridiose', 5, 'mL', '2026-04-05', '2026-04-05', 'Dr. Marcos Veterinário'),
    (v_a2, 'Vacina Clostridiose', 5, 'mL', '2026-04-05', '2026-04-05', 'Dr. Marcos Veterinário'),
    (v_a3, 'Vacina Clostridiose', 5, 'mL', '2026-04-05', '2026-04-05', 'Dr. Marcos Veterinário'),
    (v_a4, 'Vacina Clostridiose', 3, 'mL', '2026-04-05', '2026-04-05', 'Dr. Marcos Veterinário'),
    (v_a5, 'Vacina Clostridiose', 5, 'mL', '2026-04-05', '2026-04-05', 'Dr. Marcos Veterinário');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4. Eventos de ciclo de vida
  -- ═══════════════════════════════════════════════════════════════════════════

  INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
    -- Nascimentos
    (v_a1, 'animal', 'birth',             '2021-04-12', 'Parto normal, 34kg — Fazenda SJBE Jandaia'),
    (v_a2, 'animal', 'birth',             '2020-08-30', 'Parto normal, 32kg'),
    (v_a3, 'animal', 'birth',             '2019-11-05', 'Parto normal, 36kg — maior peso ao nascer da safra'),
    (v_a4, 'animal', 'birth',             '2025-02-18', 'Parto normal, 33kg'),
    (v_a5, 'animal', 'birth',             '2022-06-01', 'Parto normal, 38kg — cruzamento Nelore × Angus'),
    -- Desmames
    (v_a1, 'animal', 'weighing',          '2021-12-10', 'Desmame aos 8 meses, 225kg — acima da média'),
    (v_a2, 'animal', 'weighing',          '2021-04-20', 'Desmame aos 8 meses, 195kg'),
    (v_a3, 'animal', 'weighing',          '2020-07-08', 'Desmame aos 8 meses, 240kg — destaque GMD'),
    (v_a5, 'animal', 'weighing',          '2023-02-10', 'Desmame aos 8 meses, 230kg'),
    -- Transferências
    (v_a1, 'animal', 'lot_entry',         '2022-01-15', 'Transferido para pasto de recria'),
    (v_a2, 'animal', 'lot_entry',         '2021-05-10', 'Transferida para pasto de recria'),
    (v_a3, 'animal', 'lot_entry',         '2020-08-01', 'Transferido para pasto de recria — selecionado reprodutor'),
    (v_a5, 'animal', 'lot_entry',         '2023-03-01', 'Transferido para pasto de engorda');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5. Certificações (MAPA + Halal)
  -- ═══════════════════════════════════════════════════════════════════════════

  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    -- MAPA para todos
    (v_a1, 'MAPA-FSJBE-001', 'MAPA',  'active', '2026-01-01', '2026-12-31'),
    (v_a2, 'MAPA-FSJBE-002', 'MAPA',  'active', '2026-01-01', '2026-12-31'),
    (v_a3, 'MAPA-FSJBE-003', 'MAPA',  'active', '2026-01-01', '2026-12-31'),
    (v_a4, 'MAPA-FSJBE-004', 'MAPA',  'active', '2026-01-01', '2026-12-31'),
    (v_a5, 'MAPA-FSJBE-005', 'MAPA',  'active', '2026-01-01', '2026-12-31'),
    -- Halal para touros e novilho (aptos exportação)
    (v_a1, 'HALAL-FSJBE-001', 'Halal', 'active', '2026-02-01', '2027-01-31'),
    (v_a3, 'HALAL-FSJBE-003', 'Halal', 'active', '2026-02-01', '2027-01-31'),
    (v_a5, 'HALAL-FSJBE-005', 'Halal', 'active', '2026-02-01', '2027-01-31'),
    -- GTA para todos (Guia de Trânsito Animal)
    (v_a1, 'GTA-FSJBE-001', 'GTA',   'active', '2026-01-15', '2026-07-15'),
    (v_a2, 'GTA-FSJBE-002', 'GTA',   'active', '2026-01-15', '2026-07-15'),
    (v_a3, 'GTA-FSJBE-003', 'GTA',   'active', '2026-01-15', '2026-07-15'),
    (v_a4, 'GTA-FSJBE-004', 'GTA',   'active', '2026-01-15', '2026-07-15'),
    (v_a5, 'GTA-FSJBE-005', 'GTA',   'active', '2026-01-15', '2026-07-15');

  -- Restore triggers
  SET LOCAL session_replication_role = DEFAULT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 6. Calcula scores e popula passport cache
  -- ═══════════════════════════════════════════════════════════════════════════

  PERFORM calculate_agraas_score(v_a1);
  PERFORM calculate_agraas_score(v_a2);
  PERFORM calculate_agraas_score(v_a3);
  PERFORM calculate_agraas_score(v_a4);
  PERFORM calculate_agraas_score(v_a5);

  -- Atualiza contadores da propriedade
  UPDATE properties
     SET animals_count = (SELECT COUNT(*) FROM animals WHERE client_id = v_client)
   WHERE id = v_prop;

  RAISE NOTICE 'Migration 101: FSJBE — 5 animais BER-001..005 + 19 pesagens + 21 aplicações + 13 eventos + 13 certificações + 5 scores';
END $$;
