-- Migration 018: Seed completo para demo PIF
-- Lucas (admin) — operação premium GO + MS
-- Pedro (client) — operação básica MG

-- Coluna withdrawal_date que faltou na migration 014
ALTER TABLE applications ADD COLUMN IF NOT EXISTS withdrawal_date date;

-- Stubs para compatibilidade com shadow DB da Supabase CLI
-- (migration 002 faz SELECT FROM animal_events que não existe em schema limpo)
CREATE TABLE IF NOT EXISTS animal_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id      uuid,
  event_type     text,
  event_timestamp timestamptz,
  notes          text,
  created_at     timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS farm_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   uuid,
  type        text,
  event_date  date,
  description text,
  created_at  timestamptz DEFAULT now()
);

DO $$
DECLARE
  lucas_client_id uuid;
  pedro_client_id uuid;

  -- Properties
  prop_santa_cruz     uuid := '00000000-0000-0002-0001-000000000001';
  prop_bom_jesus      uuid := '00000000-0000-0002-0001-000000000002';
  prop_boa_esperanca  uuid := '00000000-0000-0002-0002-000000000001';

  -- Animals — Lucas
  a_imperador  uuid := '00000000-0000-0003-0001-000000000001';
  a_estrela    uuid := '00000000-0000-0003-0001-000000000002';
  a_relampago  uuid := '00000000-0000-0003-0001-000000000003';
  a_aurora     uuid := '00000000-0000-0003-0001-000000000004';
  a_trovao     uuid := '00000000-0000-0003-0001-000000000005';
  a_lua        uuid := '00000000-0000-0003-0001-000000000006';
  a_atlantico  uuid := '00000000-0000-0003-0001-000000000007';
  a_serena     uuid := '00000000-0000-0003-0001-000000000008';
  a_vendaval   uuid := '00000000-0000-0003-0001-000000000009';
  a_primavera  uuid := '00000000-0000-0003-0001-000000000010';

  -- Animals — Pedro
  a_forte      uuid := '00000000-0000-0003-0002-000000000001';
  a_bonita     uuid := '00000000-0000-0003-0002-000000000002';
  a_guerreiro  uuid := '00000000-0000-0003-0002-000000000003';
  a_graca      uuid := '00000000-0000-0003-0002-000000000004';
  a_pingo      uuid := '00000000-0000-0003-0002-000000000005';

  -- Lots
  lot_engorda  uuid := '00000000-0000-0004-0001-000000000001';
  lot_export   uuid := '00000000-0000-0004-0001-000000000002';
  lot_cria     uuid := '00000000-0000-0004-0002-000000000001';

  today date := CURRENT_DATE;

BEGIN
  -- -------------------------------------------------------
  -- Resolve client IDs pelo auth_user_id
  -- -------------------------------------------------------
  SELECT id INTO lucas_client_id FROM clients
    WHERE auth_user_id = '816a377b-1336-4c10-b4fc-35b675fe4596';
  SELECT id INTO pedro_client_id FROM clients
    WHERE auth_user_id = '130ccc0c-a130-4536-a845-7f68479aa501';

  IF lucas_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Lucas não encontrado — rode as migrations 003–006 primeiro';
  END IF;
  IF pedro_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Pedro não encontrado — rode as migrations 003–006 primeiro';
  END IF;

  -- ============================================================
  -- PROPRIEDADES
  -- ============================================================
  INSERT INTO properties (id, name, code, region, state, area_hectares, status, profile, client_id, target_arrobas)
  VALUES
    (prop_santa_cruz,    'Fazenda Santa Cruz',     'PROP-SC-01', 'Centro-Oeste', 'GO', 1200, 'Ativa', 'Engorda e exportação premium', lucas_client_id, 800),
    (prop_bom_jesus,     'Retiro Bom Jesus',        'PROP-BJ-01', 'Centro-Oeste', 'MS', 850,  'Ativa', 'Recria e engorda',             lucas_client_id, 600),
    (prop_boa_esperanca, 'Fazenda Boa Esperança',   'PROP-BE-01', 'Sudeste',      'MG', 320,  'Ativa', 'Cria e recria',                pedro_client_id, 200)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- ANIMAIS — Lucas / Fazenda Santa Cruz
  -- ============================================================
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, rfid, client_id, current_property_id)
  VALUES
    (a_imperador, 'IMP-001', 'Touro Imperador', 'M', 'Nelore',        '2021-03-10', 'Ativo', 'Touro reprodutor',   'RFID-IMP-001', lucas_client_id, prop_santa_cruz),
    (a_estrela,   'EST-001', 'Vaca Estrela',    'F', 'Nelore',        '2021-07-22', 'Ativo', 'Vaca seca',          NULL,           lucas_client_id, prop_santa_cruz),
    (a_relampago, 'REL-001', 'Boi Relâmpago',   'M', 'Nelore x Angus','2022-01-15', 'Ativo', 'Novilho em engorda', NULL,           lucas_client_id, prop_santa_cruz),
    (a_aurora,    'AUR-001', 'Vaca Aurora',     'F', 'Nelore',        '2021-11-08', 'Ativo', 'Vaca gestante',      NULL,           lucas_client_id, prop_santa_cruz),
    (a_trovao,    'TRO-001', 'Boi Trovão',      'M', 'Brahman',       '2022-05-30', 'Ativo', 'Novilho',            NULL,           lucas_client_id, prop_santa_cruz),
    (a_lua,       'LUA-001', 'Bezerra Lua',     'F', 'Nelore',        '2025-06-14', 'Ativo', 'Bezerra',            NULL,           lucas_client_id, prop_santa_cruz)
  ON CONFLICT (id) DO NOTHING;

  -- Animais — Lucas / Retiro Bom Jesus
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, rfid, client_id, current_property_id)
  VALUES
    (a_atlantico, 'ATL-001', 'Touro Atlântico', 'M', 'Angus',           '2020-09-18', 'Ativo', 'Touro reprodutor',   'RFID-ATL-001', lucas_client_id, prop_bom_jesus),
    (a_serena,    'SER-001', 'Vaca Serena',     'F', 'Angus',           '2021-04-05', 'Ativo', 'Vaca seca',          NULL,           lucas_client_id, prop_bom_jesus),
    (a_vendaval,  'VEN-001', 'Boi Vendaval',    'M', 'Brahman x Nelore','2022-02-20', 'Ativo', 'Novilho em engorda', NULL,           lucas_client_id, prop_bom_jesus),
    (a_primavera, 'PRI-001', 'Vaca Primavera',  'F', 'Nelore',          '2021-08-11', 'Ativo', 'Vaca lactante',      NULL,           lucas_client_id, prop_bom_jesus)
  ON CONFLICT (id) DO NOTHING;

  -- Animais — Pedro / Fazenda Boa Esperança
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, client_id, current_property_id)
  VALUES
    (a_forte,     'FOR-001', 'Boi Forte',    'M', 'Nelore',     '2022-03-12', 'Ativo', 'Novilho',  pedro_client_id, prop_boa_esperanca),
    (a_bonita,    'BON-001', 'Vaca Bonita',  'F', 'Nelore',     '2022-08-20', 'Ativo', 'Novilha',  pedro_client_id, prop_boa_esperanca),
    (a_guerreiro, 'GUE-001', 'Boi Guerreiro','M', 'Nelore',     '2021-11-05', 'Ativo', 'Novilho',  pedro_client_id, prop_boa_esperanca),
    (a_graca,     'GRA-001', 'Vaca Graça',   'F', 'Nelore x Gir','2022-01-28', 'Ativo', 'Vaca seca',pedro_client_id, prop_boa_esperanca),
    (a_pingo,     'PIN-001', 'Bezerro Pingo','M', 'Nelore',     '2025-09-03', 'Ativo', 'Bezerro',  pedro_client_id, prop_boa_esperanca)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- PESAGENS
  -- ============================================================

  -- Imperador: 3 crescentes — excelente GMD
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_imperador, 480, today - 65, 'Entrada no lote'),
    (a_imperador, 498, today - 35, 'Evolução positiva'),
    (a_imperador, 515, today -  7, 'Excelente GMD — 1,45 kg/dia');

  -- Estrela: 3 pesagens
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_estrela, 420, today - 60, NULL),
    (a_estrela, 432, today - 30, NULL),
    (a_estrela, 445, today -  4, 'Boa condição corporal');

  -- Relâmpago: 2 pesagens
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_relampago, 460, today - 50, NULL),
    (a_relampago, 478, today - 12, NULL);

  -- Aurora: 2 pesagens
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_aurora, 390, today - 55, NULL),
    (a_aurora, 405, today - 25, NULL);

  -- Trovão: última pesagem há 45 dias (ALERTA)
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_trovao, 350, today - 45, 'Ganho insuficiente — monitorar');

  -- Lua: bezerra jovem, 1 pesagem
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_lua, 180, today - 21, NULL);

  -- Atlântico: 3 crescentes
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_atlantico, 510, today - 70, NULL),
    (a_atlantico, 528, today - 40, NULL),
    (a_atlantico, 545, today - 10, 'Prime para embarque — score máximo');

  -- Serena: 2 pesagens
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_serena, 435, today - 45, NULL),
    (a_serena, 448, today - 17, NULL);

  -- Vendaval: 2 pesagens
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_vendaval, 465, today - 35, NULL),
    (a_vendaval, 481, today -  7, NULL);

  -- Primavera: última pesagem há 35 dias (alerta leve)
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_primavera, 398, today - 35, NULL);

  -- Pedro — pesagens espaçadas
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_forte,     440, today - 50, NULL),
    (a_forte,     455, today - 17, NULL),
    (a_bonita,    385, today - 30, NULL),
    (a_guerreiro, 360, today - 60, 'Pesagem atrasada — reagendar'),
    (a_graca,     375, today - 40, NULL),
    (a_graca,     388, today - 12, NULL),
    (a_pingo,     120, today - 21, NULL);

  -- ============================================================
  -- APLICAÇÕES SANITÁRIAS
  -- ============================================================
  -- carência encerrada = withdrawal_date no passado → sem bloqueio de exportação

  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    -- Vacina Aftosa (sem carência) — rebanho Lucas
    (a_imperador, 'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_estrela,   'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_relampago, 'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_aurora,    'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_trovao,    'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_atlantico, 'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    (a_serena,    'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Marcos Veterinário', today - 66, NULL),
    -- Ivermectina 1% — carência 21 dias, já encerrada
    (a_imperador, 'Ivermectina 1%', 5.0, 'mL', 'Dr. Marcos Veterinário', today - 49, today - 28),
    (a_estrela,   'Ivermectina 1%', 4.5, 'mL', 'Dr. Marcos Veterinário', today - 49, today - 28),
    (a_atlantico, 'Ivermectina 1%', 5.5, 'mL', 'Dr. Marcos Veterinário', today - 35, today - 14),
    -- Clostan — carência 30 dias, já encerrada
    (a_atlantico, 'Clostan 10%', 3.0, 'mL', 'Dr. Marcos Veterinário', today - 55, today - 25),
    (a_aurora,    'Clostan 10%', 3.0, 'mL', 'Dra. Ana Veterinária',   today - 61, today - 31),
    (a_trovao,    'Ivermectina 1%', 4.0, 'mL', 'Dr. Marcos Veterinário', today - 71, today - 50),
    -- Pedro
    (a_forte,     'Vacina Aftosa Bivalente', 2.0, 'mL', 'Dr. Silva Veterinário', today - 45, NULL);

  -- ============================================================
  -- CERTIFICAÇÕES
  -- ============================================================
  -- Halal ativa: Imperador, Estrela, Atlântico (válida 12 meses)
  INSERT INTO animal_certifications (animal_id, certification_name, status, issued_at, expires_at) VALUES
    (a_imperador, 'Halal', 'active', today - 81,  today + 284),
    (a_estrela,   'Halal', 'active', today - 81,  today + 284),
    (a_atlantico, 'Halal', 'active', today - 81,  today + 284);

  -- Halal vencida: Aurora (venceu há 30 dias → gera alerta no lote exportação)
  INSERT INTO animal_certifications (animal_id, certification_name, status, issued_at, expires_at) VALUES
    (a_aurora, 'Halal', 'expired', today - 395, today - 30);

  -- MAPA: Imperador, Atlântico
  INSERT INTO animal_certifications (animal_id, certification_name, status, issued_at, expires_at) VALUES
    (a_imperador, 'MAPA', 'active', today - 66, today + 119),
    (a_atlantico, 'MAPA', 'active', today - 66, today + 119);

  -- GTA: Imperador, Estrela, Atlântico
  INSERT INTO animal_certifications (animal_id, certification_name, status, issued_at, expires_at) VALUES
    (a_imperador, 'GTA', 'active', today - 30, today + 150),
    (a_estrela,   'GTA', 'active', today - 30, today + 150),
    (a_atlantico, 'GTA', 'active', today - 30, today + 150);

  -- ============================================================
  -- LOTES
  -- ============================================================
  INSERT INTO lots (id, name, objective, start_date, status, client_id, property_id, target_weight)
  VALUES
    (lot_engorda, 'Lote Engorda GO',   'Engorda', today - 60, 'active', lucas_client_id, prop_santa_cruz, 520)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO lots (id, name, objective, start_date, status, client_id, property_id,
                   pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato, target_weight)
  VALUES
    (lot_export, 'Lote Exportação — Arábia Saudita Mar/26', 'Exportação', today - 30, 'active', lucas_client_id, prop_santa_cruz,
     'Arábia Saudita', 'Santos (SP)', today + 45,
     ARRAY['Halal', 'MAPA', 'GTA'],
     'CONT-2026-001', 520)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO lots (id, name, objective, start_date, status, client_id, property_id, target_weight)
  VALUES
    (lot_cria, 'Lote Cria MG', 'Cria', today - 45, 'active', pedro_client_id, prop_boa_esperanca, 250)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- ATRIBUIÇÃO DE ANIMAIS AOS LOTES
  -- ============================================================
  -- Lote Engorda GO: Imperador, Relâmpago, Trovão, Lua
  INSERT INTO animal_lot_assignments (lot_id, animal_id, entry_date) VALUES
    (lot_engorda, a_imperador, today - 60),
    (lot_engorda, a_relampago, today - 60),
    (lot_engorda, a_trovao,    today - 60),
    (lot_engorda, a_lua,       today - 45)
  ON CONFLICT DO NOTHING;

  -- Lote Exportação: Imperador, Estrela, Atlântico (aptos) + Aurora (pendências Halal) + Trovão (inapto — score baixo)
  INSERT INTO animal_lot_assignments (lot_id, animal_id, entry_date) VALUES
    (lot_export, a_imperador, today - 28),
    (lot_export, a_estrela,   today - 28),
    (lot_export, a_atlantico, today - 28),
    (lot_export, a_aurora,    today - 28),
    (lot_export, a_trovao,    today - 28)
  ON CONFLICT DO NOTHING;

  -- Lote Cria MG (Pedro): todos os 5
  INSERT INTO animal_lot_assignments (lot_id, animal_id, entry_date) VALUES
    (lot_cria, a_forte,     today - 45),
    (lot_cria, a_bonita,    today - 45),
    (lot_cria, a_guerreiro, today - 45),
    (lot_cria, a_graca,     today - 45),
    (lot_cria, a_pingo,     today - 30)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- EVENTOS
  -- ============================================================
  INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
    -- Lucas — eventos sanitários e operacionais distribuídos nos últimos 90 dias
    (a_imperador, 'animal', 'health_check',       today - 80, 'Avaliação pré-embarque — score sanitário excelente'),
    (a_imperador, 'animal', 'weight_measurement',  today - 65, 'Pesagem de entrada no lote Engorda GO'),
    (a_imperador, 'animal', 'vaccination',         today - 66, 'Vacina Aftosa Bivalente — dose 2 mL'),
    (a_imperador, 'animal', 'weight_measurement',  today -  7, 'Pesagem mensal — 515 kg — excelente evolução'),
    (a_estrela,   'animal', 'health_check',        today - 70, 'Exame ginecológico — reprodução normal'),
    (a_estrela,   'animal', 'vaccination',         today - 66, 'Vacina Aftosa Bivalente'),
    (a_atlantico, 'animal', 'health_check',        today - 75, 'Score corporal 4/5 — apto para embarque'),
    (a_atlantico, 'animal', 'vaccination',         today - 66, 'Vacina Aftosa Bivalente'),
    (a_aurora,    'animal', 'health_check',        today - 40, 'Monitoramento gestação — normal'),
    (a_trovao,    'animal', 'observation',         today - 30, 'Score baixo — plano de melhora em andamento'),
    (a_lua,       'animal', 'health_check',        today - 21, 'Bezerra saudável — vacinação programada'),
    -- Farm events — Santa Cruz
    (NULL,        'farm',   'routine_inspection',  today - 45, 'Inspeção sanitária semestral — Fazenda Santa Cruz — aprovada sem ressalvas'),
    (NULL,        'farm',   'routine_inspection',  today - 10, 'Visita técnica MAPA — documentação exportação em ordem'),
    -- Bom Jesus
    (a_primavera, 'animal', 'weight_measurement',  today - 35, 'Última pesagem — 398 kg — reagendar próxima'),
    (a_vendaval,  'animal', 'vaccination',         today - 66, 'Vacina Aftosa Bivalente'),
    -- Pedro — eventos espaçados
    (a_forte,     'animal', 'vaccination',         today - 45, 'Vacina Aftosa Bivalente'),
    (a_guerreiro, 'animal', 'observation',         today - 30, 'Pesagem atrasada — marcar urgente'),
    (NULL,        'farm',   'routine_inspection',  today - 60, 'Inspeção básica — Fazenda Boa Esperança');

  -- ============================================================
  -- MOVIMENTAÇÃO: Relâmpago — transferência e retorno
  -- ============================================================
  INSERT INTO animal_movements (animal_id, movement_type, origin_ref, destination_ref, movement_date, notes) VALUES
    (a_relampago, 'Transferência', 'Fazenda Santa Cruz',  'Retiro Bom Jesus',  today - 40, 'Transferido para reforço de engorda'),
    (a_relampago, 'Retorno',       'Retiro Bom Jesus',    'Fazenda Santa Cruz', today - 15, 'Retorno após ciclo de recria');

  -- ============================================================
  -- PASSPORT CACHE (scores consolidados)
  -- ============================================================
  -- Imperador: score 85 — alto, apto exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_imperador, lucas_client_id,
    '{"total_score":85,"sanitary_score":82,"operational_score":80,"continuity_score":90,"productive_score":88,"age_score":75}'::jsonb,
    '{"internal_code":"IMP-001","nickname":"Touro Imperador","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Estrela: score 82 — alta, apta exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_estrela, lucas_client_id,
    '{"total_score":82,"sanitary_score":80,"operational_score":78,"continuity_score":86,"productive_score":82,"age_score":74}'::jsonb,
    '{"internal_code":"EST-001","nickname":"Vaca Estrela","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Relâmpago: score 70 — médio, apto
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_relampago, lucas_client_id,
    '{"total_score":70,"sanitary_score":68,"operational_score":65,"continuity_score":72,"productive_score":74,"age_score":68}'::jsonb,
    '{"internal_code":"REL-001","nickname":"Boi Relâmpago","sex":"M","breed":"Nelore x Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Aurora: score 68 — médio, Halal vencida → pendências no lote exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_aurora, lucas_client_id,
    '{"total_score":68,"sanitary_score":65,"operational_score":62,"continuity_score":70,"productive_score":70,"age_score":66}'::jsonb,
    '{"internal_code":"AUR-001","nickname":"Vaca Aurora","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Trovão: score 42 — BAIXO → inapto exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_trovao, lucas_client_id,
    '{"total_score":42,"sanitary_score":48,"operational_score":38,"continuity_score":40,"productive_score":44,"age_score":55}'::jsonb,
    '{"internal_code":"TRO-001","nickname":"Boi Trovão","sex":"M","breed":"Brahman","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Lua: score 35 — em construção
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_lua, lucas_client_id,
    '{"total_score":35,"sanitary_score":40,"operational_score":28,"continuity_score":30,"productive_score":38,"age_score":45}'::jsonb,
    '{"internal_code":"LUA-001","nickname":"Bezerra Lua","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Atlântico: score 88 — mais alto do rebanho, apto exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_atlantico, lucas_client_id,
    '{"total_score":88,"sanitary_score":90,"operational_score":85,"continuity_score":92,"productive_score":90,"age_score":80}'::jsonb,
    '{"internal_code":"ATL-001","nickname":"Touro Atlântico","sex":"M","breed":"Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Serena: score 80 — alta
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_serena, lucas_client_id,
    '{"total_score":80,"sanitary_score":78,"operational_score":76,"continuity_score":84,"productive_score":80,"age_score":72}'::jsonb,
    '{"internal_code":"SER-001","nickname":"Vaca Serena","sex":"F","breed":"Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Vendaval: score 72 — médio
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_vendaval, lucas_client_id,
    '{"total_score":72,"sanitary_score":70,"operational_score":68,"continuity_score":74,"productive_score":76,"age_score":68}'::jsonb,
    '{"internal_code":"VEN-001","nickname":"Boi Vendaval","sex":"M","breed":"Brahman x Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Primavera: score 65 — médio, alerta de pesagem
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_primavera, lucas_client_id,
    '{"total_score":65,"sanitary_score":62,"operational_score":60,"continuity_score":68,"productive_score":68,"age_score":62}'::jsonb,
    '{"internal_code":"PRI-001","nickname":"Vaca Primavera","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Pedro — scores mais baixos, sem exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES
    (a_forte, pedro_client_id,
      '{"total_score":62,"sanitary_score":58,"operational_score":55,"continuity_score":65,"productive_score":66,"age_score":60}'::jsonb,
      '{"internal_code":"FOR-001","nickname":"Boi Forte","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null}'::jsonb),
    (a_bonita, pedro_client_id,
      '{"total_score":60,"sanitary_score":56,"operational_score":52,"continuity_score":62,"productive_score":64,"age_score":58}'::jsonb,
      '{"internal_code":"BON-001","nickname":"Vaca Bonita","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null}'::jsonb),
    (a_guerreiro, pedro_client_id,
      '{"total_score":38,"sanitary_score":40,"operational_score":32,"continuity_score":38,"productive_score":42,"age_score":50}'::jsonb,
      '{"internal_code":"GUE-001","nickname":"Boi Guerreiro","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null}'::jsonb),
    (a_graca, pedro_client_id,
      '{"total_score":65,"sanitary_score":62,"operational_score":58,"continuity_score":68,"productive_score":68,"age_score":60}'::jsonb,
      '{"internal_code":"GRA-001","nickname":"Vaca Graça","sex":"F","breed":"Nelore x Gir","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null}'::jsonb),
    (a_pingo, pedro_client_id,
      '{"total_score":28,"sanitary_score":32,"operational_score":22,"continuity_score":28,"productive_score":30,"age_score":40}'::jsonb,
      '{"internal_code":"PIN-001","nickname":"Bezerro Pingo","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  RAISE NOTICE 'Seed 018 concluído — Lucas: 10 animais, 3 propriedades, 2 lotes | Pedro: 5 animais, 1 propriedade, 1 lote';
END;
$$;
