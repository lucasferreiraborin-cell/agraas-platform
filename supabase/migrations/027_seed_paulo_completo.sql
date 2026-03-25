-- =============================================================================
-- Migration 027 — Seed completo Paulo (pauloborin@agraas.com.br)
--                 Fazenda São João do Morro Alto, MS
--                 8 animais Nelore/Angus, 6 meses de histórico
--                 2 alertas ativos: sem pesagem + carência
-- =============================================================================

DO $$ DECLARE
  paulo_client_id uuid;
  prop_sjma  uuid := '00000000-0000-0002-0004-000000000001';
  today      date := CURRENT_DATE;

  -- Animais existentes (022)
  p1 uuid := '00000000-0000-0003-0004-000000000001'; -- Boi Trovador
  p2 uuid := '00000000-0000-0003-0004-000000000002'; -- Vaca Bonança
  p3 uuid := '00000000-0000-0003-0004-000000000003'; -- Touro Bravo
  p4 uuid := '00000000-0000-0003-0004-000000000004'; -- Vaca Serenidade
  p5 uuid := '00000000-0000-0003-0004-000000000005'; -- Boi Marajó

  -- Novos animais
  p6 uuid := '00000000-0000-0003-0004-000000000006'; -- Novilha Iguaçu  (alerta: sem pesagem 43d)
  p7 uuid := '00000000-0000-0003-0004-000000000007'; -- Vaca Caraíba
  p8 uuid := '00000000-0000-0003-0004-000000000008'; -- Boi Sertão       (alerta: carência ativa)

BEGIN

  -- ── Client: upsert para garantir auth_user_id correto ─────────────────────
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
    name         = EXCLUDED.name,
    email        = EXCLUDED.email;

  SELECT id INTO paulo_client_id FROM clients WHERE id = '00000000-0000-0000-0004-000000000001';

  -- ── Propriedade: upsert com profile completo ───────────────────────────────
  INSERT INTO properties (id, name, code, region, state, status, profile, client_id, lat, lng, city)
  VALUES (
    prop_sjma,
    'Fazenda São João do Morro Alto',
    'PROP-SJMA-01',
    'Centro-Oeste', 'MS',
    'Ativa',
    'Cria e recria — Nelore e Angus | Campo Grande, MS',
    paulo_client_id,
    -20.44, -54.62,
    'Campo Grande'
  )
  ON CONFLICT (id) DO UPDATE SET
    name    = EXCLUDED.name,
    profile = EXCLUDED.profile,
    lat     = EXCLUDED.lat,
    lng     = EXCLUDED.lng,
    city    = EXCLUDED.city,
    state   = EXCLUDED.state;

  -- Desabilita triggers com referências quebradas antes de qualquer operação
  EXECUTE 'ALTER TABLE applications        DISABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE animal_certifications DISABLE TRIGGER USER';

  -- ── Limpa dados antigos de Paulo para recriar limpo ───────────────────────
  DELETE FROM weights       WHERE animal_id IN (p1,p2,p3,p4,p5);
  DELETE FROM applications  WHERE animal_id IN (p1,p2,p3,p4,p5);
  DELETE FROM agraas_master_passport_cache WHERE animal_id IN (p1,p2,p3,p4,p5);
  DELETE FROM animal_certifications WHERE animal_id IN (p1,p2,p3,p4,p5);

  -- ── 8 Animais ─────────────────────────────────────────────────────────────
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, client_id, current_property_id)
  VALUES
    (p1, 'PAU-001', 'Boi Trovador',    'M', 'Nelore',        '2021-05-10', 'Ativo', 'Novilho em engorda', paulo_client_id, prop_sjma),
    (p2, 'PAU-002', 'Vaca Bonança',    'F', 'Angus',         '2020-09-14', 'Ativo', 'Vaca seca',          paulo_client_id, prop_sjma),
    (p3, 'PAU-003', 'Touro Bravo',     'M', 'Nelore',        '2019-07-22', 'Ativo', 'Touro reprodutor',   paulo_client_id, prop_sjma),
    (p4, 'PAU-004', 'Vaca Serenidade', 'F', 'Angus',         '2021-12-03', 'Ativo', 'Vaca gestante',      paulo_client_id, prop_sjma),
    (p5, 'PAU-005', 'Boi Marajó',      'M', 'Nelore x Angus','2022-03-28', 'Ativo', 'Novilho',            paulo_client_id, prop_sjma),
    (p6, 'PAU-006', 'Novilha Iguaçu',  'F', 'Nelore',        '2023-01-15', 'Ativo', 'Novilha',            paulo_client_id, prop_sjma),
    (p7, 'PAU-007', 'Vaca Caraíba',    'F', 'Angus',         '2020-06-20', 'Ativo', 'Vaca seca',          paulo_client_id, prop_sjma),
    (p8, 'PAU-008', 'Boi Sertão',      'M', 'Nelore',        '2022-09-05', 'Ativo', 'Novilho',            paulo_client_id, prop_sjma)
  ON CONFLICT (id) DO UPDATE SET
    internal_code       = EXCLUDED.internal_code,
    nickname            = EXCLUDED.nickname,
    breed               = EXCLUDED.breed,
    category            = EXCLUDED.category,
    client_id           = EXCLUDED.client_id,
    current_property_id = EXCLUDED.current_property_id;

  -- ── Pesagens — 6 meses de histórico ───────────────────────────────────────
  -- p1 Boi Trovador: evolução crescente em engorda
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p1, 510, today - 7),
    (p1, 490, today - 52),
    (p1, 462, today - 105),
    (p1, 435, today - 165);

  -- p2 Vaca Bonança
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p2, 441, today - 10),
    (p2, 425, today - 60),
    (p2, 408, today - 120),
    (p2, 390, today - 175);

  -- p3 Touro Bravo
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p3, 665, today - 14),
    (p3, 650, today - 65),
    (p3, 638, today - 118),
    (p3, 622, today - 170);

  -- p4 Vaca Serenidade
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p4, 398, today - 8),
    (p4, 378, today - 55),
    (p4, 360, today - 110),
    (p4, 342, today - 168);

  -- p5 Boi Marajó
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p5, 428, today - 11),
    (p5, 405, today - 58),
    (p5, 378, today - 112),
    (p5, 350, today - 172);

  -- p6 Novilha Iguaçu: ÚLTIMA PESAGEM há 43 dias → ALERTA sem pesagem
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p6, 285, today - 43),
    (p6, 265, today - 130);

  -- p7 Vaca Caraíba
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p7, 392, today - 12),
    (p7, 375, today - 62),
    (p7, 358, today - 128);

  -- p8 Boi Sertão
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (p8, 358, today - 9),
    (p8, 334, today - 63),
    (p8, 308, today - 132);

  -- ── Protocolo sanitário ───────────────────────────────────────────────────
  -- Anti Aftosa: todos os 8, carência já expirada
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name) VALUES
    (p1, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p2, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p3, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p4, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p5, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p6, 'Anti Aftosa', today - 90, today - 60, 2.5, 'ml', 'Equipe sanitária'),
    (p7, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária'),
    (p8, 'Anti Aftosa', today - 90, today - 60, 5.0, 'ml', 'Equipe sanitária');

  -- Dectomax: p1, p3, p5, p7 — carência expirada
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name) VALUES
    (p1, 'Dectomax', today - 35, today - 7, 4.9, 'ml', 'Equipe sanitária'),
    (p3, 'Dectomax', today - 35, today - 7, 6.2, 'ml', 'Equipe sanitária'),
    (p5, 'Dectomax', today - 35, today - 7, 4.0, 'ml', 'Equipe sanitária'),
    (p7, 'Dectomax', today - 35, today - 7, 4.9, 'ml', 'Equipe sanitária');

  -- Bimectin: p2, p4, p6 — expirada; p8 — CARÊNCIA ATIVA (withdrawal_date futuro)
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name) VALUES
    (p2, 'Bimectin', today - 55, today - 27, 4.1, 'ml', 'Equipe sanitária'),
    (p4, 'Bimectin', today - 55, today - 27, 4.1, 'ml', 'Equipe sanitária'),
    (p6, 'Bimectin', today - 55, today - 27, 2.0, 'ml', 'Equipe sanitária'),
    (p8, 'Bimectin', today - 8,  today + 21, 4.1, 'ml', 'Equipe sanitária'); -- ALERTA carência ativa

  EXECUTE 'ALTER TABLE applications          ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE animal_certifications ENABLE TRIGGER USER';

  -- ── Passport scores (range 45–82) ─────────────────────────────────────────
  INSERT INTO agraas_master_passport_cache (animal_id, client_id, score_json)
  VALUES
    (p1, paulo_client_id, '{"total_score":78,"sanitary_score":76,"operational_score":75,"continuity_score":80,"productive_score":82}'::jsonb),
    (p2, paulo_client_id, '{"total_score":65,"sanitary_score":62,"operational_score":64,"continuity_score":68,"productive_score":64}'::jsonb),
    (p3, paulo_client_id, '{"total_score":82,"sanitary_score":82,"operational_score":80,"continuity_score":85,"productive_score":82}'::jsonb),
    (p4, paulo_client_id, '{"total_score":70,"sanitary_score":68,"operational_score":70,"continuity_score":72,"productive_score":69}'::jsonb),
    (p5, paulo_client_id, '{"total_score":72,"sanitary_score":70,"operational_score":72,"continuity_score":74,"productive_score":73}'::jsonb),
    (p6, paulo_client_id, '{"total_score":58,"sanitary_score":55,"operational_score":56,"continuity_score":60,"productive_score":60}'::jsonb),
    (p7, paulo_client_id, '{"total_score":45,"sanitary_score":42,"operational_score":44,"continuity_score":48,"productive_score":46}'::jsonb),
    (p8, paulo_client_id, '{"total_score":61,"sanitary_score":58,"operational_score":60,"continuity_score":63,"productive_score":63}'::jsonb)
  ON CONFLICT (animal_id) DO UPDATE SET
    score_json = EXCLUDED.score_json,
    client_id  = EXCLUDED.client_id;

END $$;
