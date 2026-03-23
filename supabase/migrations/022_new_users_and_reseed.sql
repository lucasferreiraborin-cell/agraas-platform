-- =============================================================================
-- Migration 022 — Novos clientes + re-seed conformidade lote exportação
-- =============================================================================

DO $$
DECLARE
  lucas_client_id   uuid;
  bernardo_client_id uuid;
  paulo_client_id   uuid;

  -- IDs das propriedades novas
  prop_sjbe  uuid := '00000000-0000-0002-0003-000000000001'; -- São João da Boa Esperança, GO (Bernardo)
  prop_sjma  uuid := '00000000-0000-0002-0004-000000000001'; -- São João do Morro Alto, MS (Paulo)

  -- Animais de Bernardo (Nelore, GO)
  b1 uuid := '00000000-0000-0003-0003-000000000001';
  b2 uuid := '00000000-0000-0003-0003-000000000002';
  b3 uuid := '00000000-0000-0003-0003-000000000003';
  b4 uuid := '00000000-0000-0003-0003-000000000004';
  b5 uuid := '00000000-0000-0003-0003-000000000005';

  -- Animais de Paulo (Nelore/Angus, MS)
  p1 uuid := '00000000-0000-0003-0004-000000000001';
  p2 uuid := '00000000-0000-0003-0004-000000000002';
  p3 uuid := '00000000-0000-0003-0004-000000000003';
  p4 uuid := '00000000-0000-0003-0004-000000000004';
  p5 uuid := '00000000-0000-0003-0004-000000000005';

  -- Animais do lote exportação (migration 018)
  a_imperador uuid := '00000000-0000-0003-0001-000000000001';
  a_estrela   uuid := '00000000-0000-0003-0001-000000000002';
  a_relampago uuid := '00000000-0000-0003-0001-000000000003';
  a_aurora    uuid := '00000000-0000-0003-0001-000000000004';
  a_trovao    uuid := '00000000-0000-0003-0001-000000000005';
  a_atlantico uuid := '00000000-0000-0003-0001-000000000007';

  today date := CURRENT_DATE;

BEGIN

  -- ── Resolve Lucas ──────────────────────────────────────────────────────────
  SELECT id INTO lucas_client_id FROM clients WHERE name = 'Lucas';
  IF lucas_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Lucas não encontrado';
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- RE-SEED: Certificações + Passport Cache dos animais do lote exportação
  -- Resolve o bug de conformidade 0% (ON CONFLICT DO UPDATE garante upsert)
  -- ══════════════════════════════════════════════════════════════════════════

  -- Desativa triggers para evitar cascata circular (padrão migration 018)
  EXECUTE 'ALTER TABLE animal_certifications DISABLE TRIGGER USER';

  -- Remove certs existentes dos animais do lote (evita duplicatas)
  DELETE FROM animal_certifications
  WHERE animal_id IN (a_imperador, a_estrela, a_atlantico, a_aurora, a_trovao);

  -- Certificações Halal ativas
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  VALUES
    (a_imperador, 'HALAL-IMP-001', 'Halal', 'active', today - 81, today + 284),
    (a_estrela,   'HALAL-EST-001', 'Halal', 'active', today - 81, today + 284),
    (a_atlantico, 'HALAL-ATL-001', 'Halal', 'active', today - 81, today + 284);

  -- Certificações MAPA
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  VALUES
    (a_imperador, 'MAPA-IMP-001', 'MAPA', 'active', today - 66, today + 119),
    (a_atlantico, 'MAPA-ATL-001', 'MAPA', 'active', today - 66, today + 119);

  -- Certificações GTA
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  VALUES
    (a_imperador, 'GTA-IMP-001', 'GTA', 'active', today - 30, today + 150),
    (a_estrela,   'GTA-EST-001', 'GTA', 'active', today - 30, today + 150),
    (a_atlantico, 'GTA-ATL-001', 'GTA', 'active', today - 30, today + 150);

  -- Halal vencida Aurora
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  VALUES (a_aurora, 'HALAL-AUR-001', 'Halal', 'expired', today - 395, today - 30);

  -- Reativa triggers
  EXECUTE 'ALTER TABLE animal_certifications ENABLE TRIGGER USER';

  -- Passport cache — scores reais por animal
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json)
  VALUES
    (a_imperador, lucas_client_id, '{"total_score":85,"sanitary_score":82,"operational_score":80,"continuity_score":90,"productive_score":88}'::jsonb),
    (a_estrela,   lucas_client_id, '{"total_score":82,"sanitary_score":80,"operational_score":78,"continuity_score":86,"productive_score":82}'::jsonb),
    (a_relampago, lucas_client_id, '{"total_score":70,"sanitary_score":68,"operational_score":65,"continuity_score":72,"productive_score":74}'::jsonb),
    (a_aurora,    lucas_client_id, '{"total_score":68,"sanitary_score":65,"operational_score":62,"continuity_score":70,"productive_score":70}'::jsonb),
    (a_trovao,    lucas_client_id, '{"total_score":42,"sanitary_score":48,"operational_score":38,"continuity_score":40,"productive_score":44}'::jsonb),
    (a_atlantico, lucas_client_id, '{"total_score":88,"sanitary_score":90,"operational_score":85,"continuity_score":92,"productive_score":90}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE
    SET score_json = EXCLUDED.score_json, client_id = EXCLUDED.client_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- NOVO USUÁRIO: Bernardo (fsjdbe@gmail.com)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO clients (id, name, email, role, auth_user_id)
  VALUES (
    '00000000-0000-0000-0003-000000000001',
    'Bernardo',
    'fsjdbe@gmail.com',
    'client',
    (SELECT id FROM auth.users WHERE email = 'fsjdbe@gmail.com' LIMIT 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email;

  SELECT id INTO bernardo_client_id FROM clients WHERE name = 'Bernardo';

  -- Propriedade de Bernardo
  INSERT INTO properties (id, name, code, region, state, status, profile, client_id, lat, lng, city)
  VALUES (
    prop_sjbe,
    'Fazenda São João da Boa Esperança',
    'PROP-SJBE-01',
    'Centro-Oeste', 'GO',
    'Ativa',
    'Cria — operação familiar Nelore',
    bernardo_client_id,
    -17.20, -50.65,
    'Jandaia'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Animais de Bernardo
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, client_id, current_property_id)
  VALUES
    (b1, 'BER-001', 'Boi Barroso',    'M', 'Nelore',        '2021-04-12', 'Ativo', 'Novilho em engorda', bernardo_client_id, prop_sjbe),
    (b2, 'BER-002', 'Vaca Diamante',  'F', 'Nelore',        '2020-08-30', 'Ativo', 'Vaca gestante',      bernardo_client_id, prop_sjbe),
    (b3, 'BER-003', 'Touro Cândido',  'M', 'Nelore',        '2019-11-05', 'Ativo', 'Touro reprodutor',   bernardo_client_id, prop_sjbe),
    (b4, 'BER-004', 'Bezerra Flor',   'F', 'Nelore',        '2025-02-18', 'Ativo', 'Bezerra',            bernardo_client_id, prop_sjbe),
    (b5, 'BER-005', 'Boi Corisco',    'M', 'Nelore x Angus','2022-06-01', 'Ativo', 'Novilho',            bernardo_client_id, prop_sjbe)
  ON CONFLICT (id) DO NOTHING;

  -- Pesagens de Bernardo
  INSERT INTO weights (animal_id, weight, weighing_date)
  VALUES
    (b1, 488, today - 10), (b1, 462, today - 40),
    (b2, 412, today - 8),  (b2, 392, today - 38),
    (b3, 620, today - 15), (b3, 608, today - 45),
    (b4, 145, today - 5),  (b4, 120, today - 35),
    (b5, 395, today - 12), (b5, 368, today - 42)
  ON CONFLICT DO NOTHING;

  -- Aplicações sanitárias de Bernardo
  EXECUTE 'ALTER TABLE applications DISABLE TRIGGER USER';
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name)
  VALUES
    (b1, 'Anti Aftosa',  today - 45, today - 15, 5.0,  'ml', 'Equipe sanitária'),
    (b2, 'Anti Aftosa',  today - 45, today - 15, 5.0,  'ml', 'Equipe sanitária'),
    (b3, 'Anti Aftosa',  today - 45, today - 15, 5.0,  'ml', 'Equipe sanitária'),
    (b4, 'Anti Aftosa',  today - 45, today - 15, 2.5,  'ml', 'Equipe sanitária'),
    (b5, 'Anti Aftosa',  today - 45, today - 15, 5.0,  'ml', 'Equipe sanitária'),
    (b1, 'Dectomax',     today - 20, today + 13, 4.9,  'ml', 'Equipe sanitária'),
    (b3, 'Dectomax',     today - 20, today + 13, 6.2,  'ml', 'Equipe sanitária'),
    (b5, 'Dectomax',     today - 20, today + 13, 4.0,  'ml', 'Equipe sanitária'),
    (b2, 'Bimectin',     today - 30, today + 0,  4.1,  'ml', 'Equipe sanitária'),
    (b4, 'Bimectin',     today - 30, today + 0,  1.5,  'ml', 'Equipe sanitária')
  ON CONFLICT DO NOTHING;
  EXECUTE 'ALTER TABLE applications ENABLE TRIGGER USER';

  -- Passport cache de Bernardo
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json)
  VALUES
    (b1, bernardo_client_id, '{"total_score":78,"sanitary_score":75,"operational_score":72,"continuity_score":80,"productive_score":82}'::jsonb),
    (b2, bernardo_client_id, '{"total_score":72,"sanitary_score":70,"operational_score":68,"continuity_score":75,"productive_score":74}'::jsonb),
    (b3, bernardo_client_id, '{"total_score":85,"sanitary_score":84,"operational_score":82,"continuity_score":88,"productive_score":86}'::jsonb),
    (b4, bernardo_client_id, '{"total_score":65,"sanitary_score":60,"operational_score":62,"continuity_score":68,"productive_score":55}'::jsonb),
    (b5, bernardo_client_id, '{"total_score":74,"sanitary_score":72,"operational_score":70,"continuity_score":76,"productive_score":78}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET score_json = EXCLUDED.score_json, client_id = EXCLUDED.client_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- NOVO USUÁRIO: Paulo (pauloborin@agraas.com.br)
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO clients (id, name, email, role, auth_user_id)
  VALUES (
    '00000000-0000-0000-0004-000000000001',
    'Paulo',
    'pauloborin@agraas.com.br',
    'client',
    (SELECT id FROM auth.users WHERE email = 'pauloborin@agraas.com.br' LIMIT 1)
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email;

  SELECT id INTO paulo_client_id FROM clients WHERE name = 'Paulo';

  -- Propriedade de Paulo
  INSERT INTO properties (id, name, code, region, state, status, profile, client_id, lat, lng, city)
  VALUES (
    prop_sjma,
    'Fazenda São João do Morro Alto',
    'PROP-SJMA-01',
    'Centro-Oeste', 'MS',
    'Ativa',
    'Cria e recria — Nelore e Angus',
    paulo_client_id,
    -20.44, -54.62,
    'Campo Grande'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Animais de Paulo
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, client_id, current_property_id)
  VALUES
    (p1, 'PAU-001', 'Boi Trovador',   'M', 'Nelore',  '2021-05-10', 'Ativo', 'Novilho em engorda', paulo_client_id, prop_sjma),
    (p2, 'PAU-002', 'Vaca Bonança',   'F', 'Angus',   '2020-09-14', 'Ativo', 'Vaca seca',          paulo_client_id, prop_sjma),
    (p3, 'PAU-003', 'Touro Bravo',    'M', 'Nelore',  '2019-07-22', 'Ativo', 'Touro reprodutor',   paulo_client_id, prop_sjma),
    (p4, 'PAU-004', 'Vaca Serenidade','F', 'Angus',   '2021-12-03', 'Ativo', 'Vaca gestante',      paulo_client_id, prop_sjma),
    (p5, 'PAU-005', 'Boi Marajó',     'M', 'Nelore x Angus','2022-03-28','Ativo','Novilho',        paulo_client_id, prop_sjma)
  ON CONFLICT (id) DO NOTHING;

  -- Pesagens de Paulo
  INSERT INTO weights (animal_id, weight, weighing_date)
  VALUES
    (p1, 502, today - 7),  (p1, 478, today - 37),
    (p2, 438, today - 9),  (p2, 418, today - 39),
    (p3, 658, today - 14), (p3, 644, today - 44),
    (p4, 395, today - 6),  (p4, 378, today - 36),
    (p5, 421, today - 11), (p5, 396, today - 41)
  ON CONFLICT DO NOTHING;

  -- Aplicações sanitárias de Paulo
  EXECUTE 'ALTER TABLE applications DISABLE TRIGGER USER';
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name)
  VALUES
    (p1, 'Anti Aftosa', today - 50, today - 20, 5.0, 'ml', 'Equipe sanitária'),
    (p2, 'Anti Aftosa', today - 50, today - 20, 5.0, 'ml', 'Equipe sanitária'),
    (p3, 'Anti Aftosa', today - 50, today - 20, 5.0, 'ml', 'Equipe sanitária'),
    (p4, 'Anti Aftosa', today - 50, today - 20, 5.0, 'ml', 'Equipe sanitária'),
    (p5, 'Anti Aftosa', today - 50, today - 20, 5.0, 'ml', 'Equipe sanitária'),
    (p1, 'Ivermectina',  today - 25, today + 7, 5.0, 'ml', 'Equipe sanitária'),
    (p3, 'Ivermectina',  today - 25, today + 7, 6.6, 'ml', 'Equipe sanitária')
  ON CONFLICT DO NOTHING;
  EXECUTE 'ALTER TABLE applications ENABLE TRIGGER USER';

  -- Passport cache de Paulo
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json)
  VALUES
    (p1, paulo_client_id, '{"total_score":76,"sanitary_score":74,"operational_score":72,"continuity_score":78,"productive_score":80}'::jsonb),
    (p2, paulo_client_id, '{"total_score":70,"sanitary_score":68,"operational_score":66,"continuity_score":72,"productive_score":72}'::jsonb),
    (p3, paulo_client_id, '{"total_score":82,"sanitary_score":80,"operational_score":78,"continuity_score":84,"productive_score":84}'::jsonb),
    (p4, paulo_client_id, '{"total_score":68,"sanitary_score":66,"operational_score":64,"continuity_score":70,"productive_score":70}'::jsonb),
    (p5, paulo_client_id, '{"total_score":73,"sanitary_score":71,"operational_score":69,"continuity_score":75,"productive_score":75}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET score_json = EXCLUDED.score_json, client_id = EXCLUDED.client_id;

END $$;
