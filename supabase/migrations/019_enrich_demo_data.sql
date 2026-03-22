-- =============================================================================
-- Migration 019: Enrich demo data for PIF presentation
-- Lucas: 10 animais completos com RFID, genealogia, pesagens, aplicações, eventos
-- Pedro: 5 animais realistas com dados básicos consistentes
-- Nenhum campo vazio relevante para a demo
-- =============================================================================

-- Coluna cidade nas propriedades (usada no passaporte de exportação)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city text;

DO $$
DECLARE
  lucas_client_id uuid;
  pedro_client_id uuid;

  -- IDs fixos das propriedades (migration 018)
  prop_santa_cruz    uuid := '00000000-0000-0002-0001-000000000001';
  prop_bom_jesus     uuid := '00000000-0000-0002-0001-000000000002';
  prop_boa_esperanca uuid := '00000000-0000-0002-0002-000000000001';

  -- IDs fixos dos animais — Lucas (migration 018)
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

  -- IDs fixos dos animais — Pedro (migration 018)
  a_forte      uuid := '00000000-0000-0003-0002-000000000001';
  a_bonita     uuid := '00000000-0000-0003-0002-000000000002';
  a_guerreiro  uuid := '00000000-0000-0003-0002-000000000003';
  a_graca      uuid := '00000000-0000-0003-0002-000000000004';
  a_pingo      uuid := '00000000-0000-0003-0002-000000000005';

  -- ID do lote exportação (migration 018)
  lot_export   uuid := '00000000-0000-0004-0001-000000000002';

  today date := CURRENT_DATE;

BEGIN
  -- -------------------------------------------------------
  -- Resolve IDs dos clientes
  -- -------------------------------------------------------
  SELECT id INTO lucas_client_id FROM clients
    WHERE auth_user_id = '816a377b-1336-4c10-b4fc-35b675fe4596';
  SELECT id INTO pedro_client_id FROM clients
    WHERE auth_user_id = '130ccc0c-a130-4536-a845-7f68479aa501';

  IF lucas_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Lucas não encontrado';
  END IF;
  IF pedro_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Pedro não encontrado';
  END IF;

  -- ============================================================
  -- PROPRIEDADES — enriquece com cidade e coordenadas reais
  -- ============================================================
  UPDATE properties SET
    city = 'Jataí', x = -51.71, y = -17.88,
    profile = 'Engorda premium e exportação halal'
  WHERE id = prop_santa_cruz;

  UPDATE properties SET
    city = 'Bonito', x = -56.48, y = -21.12,
    profile = 'Recria e engorda — ciclo semi-intensivo'
  WHERE id = prop_bom_jesus;

  UPDATE properties SET
    city = 'Uberaba', x = -47.93, y = -19.74,
    profile = 'Cria e recria — operação familiar'
  WHERE id = prop_boa_esperanca;

  -- ============================================================
  -- ANIMAIS — enriquece campos individuais (não substitui registros)
  -- ============================================================

  -- Animal 1: Touro Imperador — Nelore, M, score ~88
  UPDATE animals SET
    rfid        = 'BR0076000123456789',
    blood_type  = 'A',
    birth_weight = 36,
    birth_date  = today - INTERVAL '3 years',
    notes       = 'Animal de alto valor genético. Aprovado para exportação halal. Histórico sanitário impecável.'
  WHERE id = a_imperador;

  -- Animal 2: Vaca Estrela — Nelore, F, score ~82
  UPDATE animals SET
    rfid        = 'BR0076000123456790',
    blood_type  = 'B',
    birth_weight = 32,
    birth_date  = today - INTERVAL '4 years',
    notes       = 'Matriz de alta performance. 3 partos registrados. Excelente conversão alimentar.'
  WHERE id = a_estrela;

  -- Animal 3: Boi Relâmpago — Nelore x Angus, M, score ~71
  UPDATE animals SET
    rfid        = 'BR0076000123456791',
    birth_weight = 38,
    notes       = 'Animal em fase final de engorda. GMD consistente acima de 1,1 kg/dia.'
  WHERE id = a_relampago;

  -- Animal 4: Vaca Aurora — Nelore, F, score ~65 — carência ativa + Halal vencida
  UPDATE animals SET
    rfid        = 'BR0076000123456792',
    birth_weight = 30,
    notes       = 'Carência sanitária ativa até próxima semana. Renovar certificação Halal com urgência.'
  WHERE id = a_aurora;

  -- Animal 5: Boi Trovão — Brahman, M, score ~42 — alerta crítico
  UPDATE animals SET
    rfid        = 'BR0076000123456793',
    birth_weight = 40,
    notes       = 'Animal com histórico de registros incompletos. Necessita regularização sanitária.'
  WHERE id = a_trovao;

  -- Animal 6: Bezerra Lua — Nelore, F, jovem 8 meses, score ~55
  UPDATE animals SET
    rfid        = 'BR0076000123456794',
    birth_weight = 29,
    birth_date  = today - INTERVAL '8 months',
    notes       = 'Bezerra de reposição. Filha do Touro Imperador e da Vaca Estrela.'
  WHERE id = a_lua;

  -- Animal 7: Touro Atlântico — Angus, M, score ~88 — elite
  UPDATE animals SET
    rfid        = 'BR0076000123456795',
    blood_type  = 'AB',
    birth_weight = 40,
    birth_date  = today - INTERVAL '5 years',
    notes       = 'Touro de elite. Pai de múltiplos animais cadastrados. Apto para exportação imediata.'
  WHERE id = a_atlantico;

  -- Animal 8: Vaca Serena — Angus, F, score ~79
  UPDATE animals SET
    rfid        = 'BR0076000123456796',
    birth_weight = 33,
    notes       = 'Vaca de corte premium. Excelente marmoreio. Alta valorização no mercado halal.'
  WHERE id = a_serena;

  -- Animal 9: Boi Vendaval — Brahman x Nelore, M, score ~68
  UPDATE animals SET
    rfid        = 'BR0076000123456797',
    birth_weight = 37,
    notes       = 'Animal adaptado ao clima tropical. Resistência parasitária acima da média.'
  WHERE id = a_vendaval;

  -- Animal 10: Vaca Primavera — Nelore, F, score ~63 — alerta leve
  UPDATE animals SET
    rfid        = 'BR0076000123456798',
    birth_weight = 31,
    notes       = 'Vaca em fase de recuperação pós-parto. Acompanhamento nutricional em curso.'
  WHERE id = a_primavera;

  -- Pedro
  UPDATE animals SET rfid = 'BR0076000234560001', birth_weight = 35,
    notes = 'Novilho em fase de engorda. Vacinação em dia. Histórico básico mas consistente.'
  WHERE id = a_forte;

  UPDATE animals SET rfid = 'BR0076000234560002', birth_weight = 31,
    notes = 'Novilha de reposição. Boa genética local. Sem certificações internacionais.'
  WHERE id = a_bonita;

  UPDATE animals SET rfid = 'BR0076000234560003', birth_weight = 34,
    notes = 'Novilho com pesagem atrasada. Necessita regularização sanitária com urgência.'
  WHERE id = a_guerreiro;

  UPDATE animals SET rfid = 'BR0076000234560004', birth_weight = 30,
    notes = 'Vaca mestiça de boa adaptação regional. Produção leiteira anterior acima da média.'
  WHERE id = a_graca;

  UPDATE animals SET rfid = 'BR0076000234560005', birth_weight = 28,
    notes = 'Bezerro em fase de aleitamento. Vacinação inicial realizada conforme protocolo.'
  WHERE id = a_pingo;

  -- ============================================================
  -- GENEALOGIA — vínculos pai/mãe
  -- Atlântico (5 anos) → pai do Imperador (3 anos) ✓ biologicamente consistente
  -- Lua = filha de Imperador e Estrela ✓
  -- ============================================================
  UPDATE animals SET sire_animal_id = a_atlantico, dam_animal_id = a_estrela
    WHERE id = a_imperador;

  UPDATE animals SET sire_animal_id = a_imperador, dam_animal_id = a_estrela
    WHERE id = a_lua;

  -- ============================================================
  -- PESAGENS — limpa e reinsere com histórico completo
  -- ============================================================
  DELETE FROM weights WHERE animal_id IN (
    a_imperador, a_estrela, a_relampago, a_aurora, a_trovao, a_lua,
    a_atlantico, a_serena, a_vendaval, a_primavera,
    a_forte, a_bonita, a_guerreiro, a_graca, a_pingo
  );

  -- Imperador: 6 pesagens mensais — trajetória excelente
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_imperador, 380, today - 150, 'Entrada no sistema — pesagem base'),
    (a_imperador, 410, today - 120, 'GMD 1,00 kg/dia — evolução positiva'),
    (a_imperador, 435, today -  90, 'Peso dentro do esperado para Nelore adulto'),
    (a_imperador, 458, today -  60, 'Ajuste nutricional realizado'),
    (a_imperador, 472, today -  30, 'GMD 1,35 kg/dia — resposta excelente ao confinamento'),
    (a_imperador, 485, today -   7, 'Peso de embarque atingido — apto para exportação');

  -- Estrela: 5 pesagens — recuperação pós-parto consistente
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_estrela, 320, today - 120, 'Pesagem pós-parto — recuperação em andamento'),
    (a_estrela, 335, today -  90, 'Recuperação consistente — GMD 0,50 kg/dia'),
    (a_estrela, 348, today -  60, 'Boa condição corporal'),
    (a_estrela, 355, today -  30, 'Estável — suplementação protéica iniciada'),
    (a_estrela, 362, today -   8, 'Condição corporal 3,5/5 — aprovada para exportação');

  -- Relâmpago: 4 pesagens — engorda consistente
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_relampago, 395, today -  90, 'Entrada no lote de engorda — peso base'),
    (a_relampago, 418, today -  60, 'GMD 0,77 kg/dia — dentro da meta de engorda'),
    (a_relampago, 441, today -  30, 'GMD consistente — 0,77 kg/dia'),
    (a_relampago, 460, today -  10, 'Fase final de engorda — GMD 1,9 kg/dia últimos 20 dias');

  -- Aurora: 3 pesagens + carência ativa (penaliza score)
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_aurora, 298, today -  90, 'Pesagem inicial — recuperação pós-tratamento'),
    (a_aurora, 312, today -  55, 'Evolução lenta — acompanhamento nutricional'),
    (a_aurora, 318, today -  22, 'Leve queda no GMD — carência sanitária em curso');

  -- Trovão: 1 pesagem há 52 dias — alerta crítico no dashboard
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_trovao, 340, today - 52, 'Ganho insuficiente — GMD abaixo de 0,4 kg/dia. Plano corretivo necessário.');

  -- Lua: 2 pesagens — bezerra jovem (8 meses)
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_lua, 180, today -  60, 'Pesagem de entrada no sistema'),
    (a_lua, 205, today -  14, 'Desenvolvimento normal para Nelore de 8 meses');

  -- Atlântico: 6 pesagens — touro de elite
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_atlantico, 490, today - 150, 'Pesagem referência — touro em plena maturidade'),
    (a_atlantico, 512, today - 120, 'GMD 0,73 kg/dia — normal para touro reprodutor'),
    (a_atlantico, 528, today -  90, 'Condição corporal mantida — 4/5'),
    (a_atlantico, 541, today -  60, 'Suplementação mineral ajustada'),
    (a_atlantico, 553, today -  30, 'Condição corporal excelente — 4,5/5'),
    (a_atlantico, 562, today -   5, 'Peso de embarque atingido — pronto para exportação imediata');

  -- Serena: 4 pesagens crescentes — vaca premium
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_serena, 415, today -  90, 'Pesagem base — entrada no lote premium'),
    (a_serena, 428, today -  60, 'GMD 0,43 kg/dia — normal para vaca de corte'),
    (a_serena, 440, today -  30, 'Marmoreio avaliado em A2 — alta valorização'),
    (a_serena, 452, today -  10, 'Peso ideal para abate premium — condição excelente');

  -- Vendaval: 4 pesagens consistentes
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_vendaval, 440, today -  90, 'Pesagem base — Brahman x Nelore em engorda'),
    (a_vendaval, 455, today -  60, 'GMD 0,50 kg/dia — resistência ao calor confirmada'),
    (a_vendaval, 468, today -  30, 'Resposta positiva ao protocolo de engorda intensiva'),
    (a_vendaval, 481, today -  10, 'Fase final — 30 dias para peso de abate');

  -- Primavera: última pesagem 38 dias atrás — alerta leve
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_primavera, 370, today -  90, 'Pós-parto — recuperação em andamento'),
    (a_primavera, 385, today -  38, 'Acompanhamento nutricional iniciado — reagendar pesagem');

  -- Pedro — pesagens espaçadas (operação básica)
  INSERT INTO weights (animal_id, weight, weighing_date, notes) VALUES
    (a_forte,     420, today -  90, NULL),
    (a_forte,     440, today -  45, NULL),
    (a_forte,     455, today -  15, 'GMD 0,33 kg/dia — dentro do padrão regional'),
    (a_bonita,    370, today -  60, NULL),
    (a_bonita,    385, today -  20, 'Boa condição para novilha de reposição'),
    (a_guerreiro, 340, today -  62, 'ALERTA: pesagem há 62 dias — reagendar com urgência'),
    (a_graca,     355, today -  45, NULL),
    (a_graca,     370, today -  15, 'Boa evolução — raça mestiça adaptada'),
    (a_pingo,     110, today -  30, 'Bezerro jovem — acompanhamento quinzenal recomendado');

  -- ============================================================
  -- CERTIFICAÇÕES — limpa e reinsere com trigger desabilitado
  -- ============================================================
  EXECUTE 'ALTER TABLE animal_certifications DISABLE TRIGGER USER';

  DELETE FROM animal_certifications WHERE animal_id IN (
    a_imperador, a_estrela, a_relampago, a_aurora, a_trovao, a_lua,
    a_atlantico, a_serena, a_vendaval, a_primavera,
    a_forte, a_bonita, a_guerreiro, a_graca, a_pingo
  );

  -- Imperador: Halal ativa (válida ~12 meses) + MAPA ativa (6 meses) — apto exportação
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (a_imperador, 'HALAL-IMP-2025', 'Halal Certified', 'active', today -  90, today + 275),
    (a_imperador, 'MAPA-IMP-2025',  'MAPA',            'active', today -  60, today + 120);

  -- Estrela: Halal ativa — apta exportação
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (a_estrela, 'HALAL-EST-2025', 'Halal Certified', 'active', today - 90, today + 275);

  -- Aurora: Halal VENCIDA há 30 dias — gera pendência no lote de exportação
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (a_aurora, 'HALAL-AUR-2024', 'Halal Certified', 'expired', today - 395, today - 30);

  -- Atlântico: Halal ativa + MAPA ativa — apto exportação imediata
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (a_atlantico, 'HALAL-ATL-2025', 'Halal Certified', 'active', today -  90, today + 275),
    (a_atlantico, 'MAPA-ATL-2025',  'MAPA',            'active', today -  60, today + 120);

  -- Serena: Halal ativa
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (a_serena, 'HALAL-SER-2025', 'Halal Certified', 'active', today - 60, today + 305);

  EXECUTE 'ALTER TABLE animal_certifications ENABLE TRIGGER USER';

  -- ============================================================
  -- APLICAÇÕES SANITÁRIAS — doses e carências reais
  -- Trigger de validação de batch_id desabilitado para seed
  -- ============================================================
  EXECUTE 'ALTER TABLE applications DISABLE TRIGGER USER';

  DELETE FROM applications WHERE animal_id IN (
    a_imperador, a_estrela, a_relampago, a_aurora, a_trovao, a_lua,
    a_atlantico, a_serena, a_vendaval, a_primavera,
    a_forte, a_bonita, a_guerreiro, a_graca, a_pingo
  );

  -- Imperador: protocolo completo de exportação (carências todas encerradas)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_imperador, 'Ivermectina 3,5%',  17,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821',  today - 120, today -  85),
    (a_imperador, 'Vacina Aftosa Bivalente', 2, 'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today - 90, NULL),
    (a_imperador, 'Clostan 14',          5,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821',  today -  60, today -  32),
    (a_imperador, 'Dectomax',            9.7,'mL', 'Téc. Rodrigo Santos',                today -  40, today -  12);

  -- Estrela: protocolo completo (carências encerradas)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_estrela, 'Vacina Aftosa Bivalente', 2,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  90, NULL),
    (a_estrela, 'Ivermectina 3,5%',       14,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  75, today -  40),
    (a_estrela, 'Brucelose B19',           2,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  60, NULL);

  -- Relâmpago: protocolo parcial (carências encerradas)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_relampago, 'Ivermectina 3,5%',        16, 'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today - 90, today - 55),
    (a_relampago, 'Vacina Aftosa Bivalente',  2, 'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today - 60, NULL);

  -- Aurora: CARÊNCIA ATIVA — Ivermectina aplicada há 20 dias, carência 35 dias → liberação em 15 dias
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_aurora, 'Ivermectina 3,5%',        13, 'mL', 'Téc. Rodrigo Santos',               today -  20, today +  15),
    (a_aurora, 'Vacina Aftosa Bivalente',  2, 'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  90, NULL);

  -- Lua: vacinação inicial
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_lua, 'Vacina Aftosa Bivalente', 2, 'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today - 45, NULL);

  -- Atlântico: protocolo elite (carências encerradas)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_atlantico, 'Ivermectina 3,5%',        19,  'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today - 120, today -  85),
    (a_atlantico, 'Vacina Aftosa Bivalente',  2,   'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  90, NULL),
    (a_atlantico, 'Clostan 14',               5,   'mL', 'Dr. Paulo Menezes – CRMV-GO 8821', today -  60, today -  32),
    (a_atlantico, 'Dectomax',                 9.7, 'mL', 'Téc. Rodrigo Santos',               today -  40, today -  12);

  -- Serena: protocolo halal (carências encerradas)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_serena, 'Ivermectina 3,5%',        15, 'mL', 'Dr. Paulo Menezes – CRMV-MS 4412', today -  60, today -  25),
    (a_serena, 'Vacina Aftosa Bivalente',  2, 'mL', 'Dr. Paulo Menezes – CRMV-MS 4412', today -  90, NULL);

  -- Vendaval
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_vendaval, 'Ivermectina 3,5%',        17, 'mL', 'Dr. Paulo Menezes – CRMV-MS 4412', today -  70, today -  35),
    (a_vendaval, 'Vacina Aftosa Bivalente',  2, 'mL', 'Dr. Paulo Menezes – CRMV-MS 4412', today -  90, NULL);

  -- Primavera
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_primavera, 'Vacina Aftosa Bivalente', 2, 'mL', 'Dr. Paulo Menezes – CRMV-MS 4412', today - 90, NULL);

  -- Pedro — operação básica (veterinário local, protocolo simples)
  INSERT INTO applications (animal_id, product_name, dose, unit, operator_name, application_date, withdrawal_date) VALUES
    (a_forte,    'Vacina Aftosa Bivalente',  2,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  90, NULL),
    (a_forte,    'Ivermectina 1%',          15,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  45, today - 28),
    (a_bonita,   'Vacina Aftosa Bivalente',  2,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  90, NULL),
    (a_guerreiro,'Vacina Aftosa Bivalente',  2,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today - 150, NULL),
    (a_graca,    'Ivermectina 1%',          13,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  45, today - 28),
    (a_graca,    'Vacina Aftosa Bivalente',  2,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  90, NULL),
    (a_pingo,    'Vacina Aftosa Bivalente',  2,  'mL', 'Dr. Carlos Lima – CRMV-MG 3301', today -  60, NULL);

  EXECUTE 'ALTER TABLE applications ENABLE TRIGGER USER';

  -- ============================================================
  -- EVENTOS — limpa e reinsere com narrativa completa
  -- ============================================================
  DELETE FROM events WHERE animal_id IN (
    a_imperador, a_estrela, a_relampago, a_aurora, a_trovao, a_lua,
    a_atlantico, a_serena, a_vendaval, a_primavera
  );

  INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
    -- Imperador
    (a_imperador, 'animal', 'health_check',      today - 120, 'Exame pré-embarque inicial — score sanitário excelente. Aprovado pelo médico veterinário.'),
    (a_imperador, 'animal', 'reproduction',       today -  90, 'Cobertura natural realizada — 12 fêmeas. Confirmação de fertilidade acima de 90%.'),
    (a_imperador, 'animal', 'health_check',       today -  60, 'Avaliação morfológica classificada como Excelente pelo CRMV-GO'),
    (a_imperador, 'animal', 'health_check',       today -  30, 'Protocolo de exportação concluído — aprovação MAPA emitida'),
    (a_imperador, 'animal', 'health_check',       today -  10, 'Preparado para embarque — documentação completa. GTA emitida.'),

    -- Estrela
    (a_estrela,   'animal', 'reproduction',       today - 150, 'Diagnóstico de prenhez positivo — 45 dias de gestação confirmados por ultrassom'),
    (a_estrela,   'animal', 'health_check',       today - 110, 'Parto normal realizado — bezerra saudável (Bezerra Lua, 29 kg)'),
    (a_estrela,   'animal', 'vaccination',        today -  90, 'Vacinação pós-parto — protocolo de exportação concluído'),
    (a_estrela,   'animal', 'health_check',       today -  30, 'Avaliação pós-parto — recuperação excelente. Condição corporal 3,5/5.'),

    -- Atlântico
    (a_atlantico, 'animal', 'health_check',       today - 120, 'Score corporal 4,5/5 — condição prime de exportação confirmada'),
    (a_atlantico, 'animal', 'reproduction',       today -  90, 'Cobertura natural — 18 fêmeas inseminadas. Taxa de sucesso esperada: 85%.'),
    (a_atlantico, 'animal', 'vaccination',        today -  90, 'Vacina Aftosa Bivalente — protocolo de exportação halal'),
    (a_atlantico, 'animal', 'health_check',       today -  10, 'Documentação de exportação aprovada pelo MAPA. Apto para embarque imediato.'),

    -- Aurora — pendências visíveis na demo
    (a_aurora,    'animal', 'health_check',       today -  90, 'Monitoramento gestação — evolução normal'),
    (a_aurora,    'animal', 'health_check',       today -  30, 'ALERTA: Certificação Halal vencida há 30 dias — renovação pendente'),
    (a_aurora,    'animal', 'observation',        today -  20, 'ALERTA: Carência sanitária ativa (Ivermectina 3,5%) — liberação prevista em 15 dias'),

    -- Trovão — score crítico
    (a_trovao,    'animal', 'observation',        today -  52, 'Pesagem registrada há 52 dias — alerta de atraso crítico. Reagendar.'),
    (a_trovao,    'animal', 'observation',        today -  30, 'Score Agraas baixo (42) — plano de melhora operacional em andamento'),

    -- Lua — bezerra jovem
    (a_lua,       'animal', 'health_check',       today - 240, 'Nascimento — filha do Touro Imperador e da Vaca Estrela. Peso: 29 kg.'),
    (a_lua,       'animal', 'vaccination',        today -  45, 'Primeira vacinação — Aftosa Bivalente. Protocolo de reposição iniciado.'),
    (a_lua,       'animal', 'health_check',       today -  14, 'Bezerra saudável — desenvolvimento dentro do esperado. Peso: 205 kg.'),

    -- Relâmpago
    (a_relampago, 'animal', 'vaccination',        today -  90, 'Aftosa Bivalente — dose 2 mL. Protocolo de engorda iniciado.'),
    (a_relampago, 'animal', 'health_check',       today -  10, 'Fase final de engorda — GMD 1,9 kg/dia nos últimos 20 dias. Excelente.'),

    -- Serena
    (a_serena,    'animal', 'vaccination',        today -  90, 'Vacina Aftosa — protocolo de exportação Retiro Bom Jesus'),
    (a_serena,    'animal', 'health_check',       today -  60, 'Marmoreio classificado A2 — alta valorização no mercado premium'),

    -- Vendaval
    (a_vendaval,  'animal', 'vaccination',        today -  90, 'Vacina Aftosa — protocolo de exportação Retiro Bom Jesus'),
    (a_vendaval,  'animal', 'health_check',       today -  30, 'Resistência parasitária avaliada — acima da média para a raça'),

    -- Primavera
    (a_primavera, 'animal', 'health_check',       today -  90, 'Parto recente — bezerro saudável. Recuperação pós-parto em andamento.'),
    (a_primavera, 'animal', 'health_check',       today -  38, 'Acompanhamento nutricional iniciado. Próxima pesagem em 2 semanas.');

  -- ============================================================
  -- LOTE DE EXPORTAÇÃO — enriquece com dados contratuais reais
  -- ============================================================
  UPDATE lots SET
    name                  = 'Lote Exportação — Arábia Saudita Mar/26',
    numero_contrato       = 'EXP-2026-SAU-001',
    porto_embarque        = 'Porto de Santos — SP',
    pais_destino          = 'Arábia Saudita',
    certificacoes_exigidas = ARRAY['Halal', 'MAPA', 'GTA', 'SIF'],
    data_embarque         = today + 45
  WHERE id = lot_export;

  -- ============================================================
  -- PASSPORT CACHE — scores atualizados e enriquecidos
  -- ============================================================

  -- Imperador: 88 — apto exportação (halal + mapa + peso ideal)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_imperador, lucas_client_id,
    '{"total_score":88,"sanitary_score":86,"operational_score":84,"continuity_score":92,"productive_score":88,"age_score":80}'::jsonb,
    '{"internal_code":"IMP-001","nickname":"Touro Imperador","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Exportação"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Estrela: 82 — apta exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_estrela, lucas_client_id,
    '{"total_score":82,"sanitary_score":80,"operational_score":78,"continuity_score":86,"productive_score":82,"age_score":76}'::jsonb,
    '{"internal_code":"EST-001","nickname":"Vaca Estrela","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Exportação"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Relâmpago: 71 — apto (sem halal, mas score médio-alto)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_relampago, lucas_client_id,
    '{"total_score":71,"sanitary_score":68,"operational_score":65,"continuity_score":74,"productive_score":76,"age_score":70}'::jsonb,
    '{"internal_code":"REL-001","nickname":"Boi Relâmpago","sex":"M","breed":"Nelore x Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Aurora: 65 — pendência (halal vencida + carência ativa)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_aurora, lucas_client_id,
    '{"total_score":65,"sanitary_score":62,"operational_score":60,"continuity_score":68,"productive_score":66,"age_score":64}'::jsonb,
    '{"internal_code":"AUR-001","nickname":"Vaca Aurora","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Exportação"}'::jsonb,
    '{"withdrawal_end_date":"WITHDRAWAL_ACTIVE","active_withdrawal":true}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Trovão: 42 — INAPTO (score baixo, pesagem atrasada, sem certs)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_trovao, lucas_client_id,
    '{"total_score":42,"sanitary_score":45,"operational_score":36,"continuity_score":40,"productive_score":44,"age_score":52}'::jsonb,
    '{"internal_code":"TRO-001","nickname":"Boi Trovão","sex":"M","breed":"Brahman","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Exportação"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Lua: 55 — em construção (bezerra jovem)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_lua, lucas_client_id,
    '{"total_score":55,"sanitary_score":58,"operational_score":48,"continuity_score":52,"productive_score":56,"age_score":60}'::jsonb,
    '{"internal_code":"LUA-001","nickname":"Bezerra Lua","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Fazenda Santa Cruz","current_lot_code":"Lote Engorda GO"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Atlântico: 88 — apto exportação imediata (elite)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_atlantico, lucas_client_id,
    '{"total_score":88,"sanitary_score":90,"operational_score":85,"continuity_score":92,"productive_score":90,"age_score":82}'::jsonb,
    '{"internal_code":"ATL-001","nickname":"Touro Atlântico","sex":"M","breed":"Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"Lote Exportação"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Serena: 79 — apta (halal + bom score)
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_serena, lucas_client_id,
    '{"total_score":79,"sanitary_score":78,"operational_score":74,"continuity_score":82,"productive_score":80,"age_score":74}'::jsonb,
    '{"internal_code":"SER-001","nickname":"Vaca Serena","sex":"F","breed":"Angus","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Vendaval: 68 — médio, apto geral
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_vendaval, lucas_client_id,
    '{"total_score":68,"sanitary_score":66,"operational_score":62,"continuity_score":70,"productive_score":72,"age_score":68}'::jsonb,
    '{"internal_code":"VEN-001","nickname":"Boi Vendaval","sex":"M","breed":"Brahman x Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Primavera: 63 — médio, alerta de pesagem
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES (a_primavera, lucas_client_id,
    '{"total_score":63,"sanitary_score":60,"operational_score":58,"continuity_score":64,"productive_score":66,"age_score":62}'::jsonb,
    '{"internal_code":"PRI-001","nickname":"Vaca Primavera","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
    '{"current_property_name":"Retiro Bom Jesus","current_lot_code":"-"}'::jsonb,
    '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  -- Pedro — scores mais baixos, sem certs de exportação
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json, identity_json, traceability_json, sanitary_json)
  VALUES
    (a_forte, pedro_client_id,
      '{"total_score":58,"sanitary_score":55,"operational_score":50,"continuity_score":60,"productive_score":62,"age_score":58}'::jsonb,
      '{"internal_code":"FOR-001","nickname":"Boi Forte","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb),
    (a_bonita, pedro_client_id,
      '{"total_score":54,"sanitary_score":52,"operational_score":46,"continuity_score":56,"productive_score":58,"age_score":56}'::jsonb,
      '{"internal_code":"BON-001","nickname":"Vaca Bonita","sex":"F","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb),
    (a_guerreiro, pedro_client_id,
      '{"total_score":35,"sanitary_score":38,"operational_score":28,"continuity_score":34,"productive_score":38,"age_score":46}'::jsonb,
      '{"internal_code":"GUE-001","nickname":"Boi Guerreiro","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb),
    (a_graca, pedro_client_id,
      '{"total_score":61,"sanitary_score":58,"operational_score":54,"continuity_score":64,"productive_score":64,"age_score":60}'::jsonb,
      '{"internal_code":"GRA-001","nickname":"Vaca Graça","sex":"F","breed":"Nelore x Gir","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb),
    (a_pingo, pedro_client_id,
      '{"total_score":45,"sanitary_score":48,"operational_score":36,"continuity_score":42,"productive_score":46,"age_score":52}'::jsonb,
      '{"internal_code":"PIN-001","nickname":"Bezerro Pingo","sex":"M","breed":"Nelore","status":"Ativo"}'::jsonb,
      '{"current_property_name":"Fazenda Boa Esperança","current_lot_code":"Lote Cria MG"}'::jsonb,
      '{"withdrawal_end_date":null,"active_withdrawal":false}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json, identity_json = EXCLUDED.identity_json,
    traceability_json = EXCLUDED.traceability_json, sanitary_json = EXCLUDED.sanitary_json;

  RAISE NOTICE 'Migration 019 concluída — demo PIF enriquecida. Lucas: 10 animais completos | Pedro: 5 animais completos';
END;
$$;
