-- Migration 035: Enrich pauloborin data
-- 8 → 20 animals (Nelore/Angus, named), weights, 2 lots,
-- Ivermectina withdrawal, DG positivo event, estação de monta,
-- MS property lat/lng confirmed

DO $$
DECLARE
  v_client_id   uuid  := '00000000-0000-0000-0004-000000000001';
  v_property_id uuid  := '00000000-0000-0002-0004-000000000001';
  today         date  := CURRENT_DATE;

  -- New animal IDs
  a09 uuid := '00000000-0000-0003-0004-000000000009';
  a10 uuid := '00000000-0000-0003-0004-000000000010';
  a11 uuid := '00000000-0000-0003-0004-000000000011';
  a12 uuid := '00000000-0000-0003-0004-000000000012';
  a13 uuid := '00000000-0000-0003-0004-000000000013';
  a14 uuid := '00000000-0000-0003-0004-000000000014';
  a15 uuid := '00000000-0000-0003-0004-000000000015';
  a16 uuid := '00000000-0000-0003-0004-000000000016';
  a17 uuid := '00000000-0000-0003-0004-000000000017';
  a18 uuid := '00000000-0000-0003-0004-000000000018';
  a19 uuid := '00000000-0000-0003-0004-000000000019';
  a20 uuid := '00000000-0000-0003-0004-000000000020';

  -- Existing animal IDs (from 027)
  p1 uuid := '00000000-0000-0003-0004-000000000001';
  p2 uuid := '00000000-0000-0003-0004-000000000002';
  p3 uuid := '00000000-0000-0003-0004-000000000003';
  p4 uuid := '00000000-0000-0003-0004-000000000004';
  p5 uuid := '00000000-0000-0003-0004-000000000005';
  p6 uuid := '00000000-0000-0003-0004-000000000006';
  p7 uuid := '00000000-0000-0003-0004-000000000007';
  p8 uuid := '00000000-0000-0003-0004-000000000008';

  v_lot_venda  uuid := '00000000-0000-0004-0004-000000000001';
  v_lot_recria uuid := '00000000-0000-0004-0004-000000000002';
BEGIN
  -- Confirm MS property coordinates
  UPDATE properties
     SET lat = -20.44, lng = -54.62
   WHERE id = v_property_id;

  -- ── 12 new animals ────────────────────────────────────────────────────────
  INSERT INTO animals (id, internal_code, nickname, sex, breed, birth_date, status, category, client_id, current_property_id)
  VALUES
    (a09, 'PAU-009', 'Guerreiro',   'M', 'Nelore',          '2022-04-10', 'Ativo', 'Novilho em engorda', v_client_id, v_property_id),
    (a10, 'PAU-010', 'Trovão II',   'M', 'Nelore',          '2022-07-22', 'Ativo', 'Novilho em engorda', v_client_id, v_property_id),
    (a11, 'PAU-011', 'Imperador',   'M', 'Angus',           '2023-01-05', 'Ativo', 'Novilho',            v_client_id, v_property_id),
    (a12, 'PAU-012', 'Cristal',     'F', 'Nelore',          '2021-11-18', 'Ativo', 'Vaca seca',          v_client_id, v_property_id),
    (a13, 'PAU-013', 'Aurora',      'F', 'Angus',           '2022-03-28', 'Ativo', 'Vaca gestante',      v_client_id, v_property_id),
    (a14, 'PAU-014', 'Sultão',      'M', 'Nelore Mocho',    '2022-09-14', 'Ativo', 'Novilho em engorda', v_client_id, v_property_id),
    (a15, 'PAU-015', 'Pérola',      'F', 'Nelore',          '2021-06-30', 'Ativo', 'Vaca seca',          v_client_id, v_property_id),
    (a16, 'PAU-016', 'Faroeste',    'M', 'Angus',           '2023-03-11', 'Ativo', 'Novilho',            v_client_id, v_property_id),
    (a17, 'PAU-017', 'Brisa',       'F', 'Nelore',          '2022-05-17', 'Ativo', 'Vaca seca',          v_client_id, v_property_id),
    (a18, 'PAU-018', 'Diamante',    'M', 'Nelore Mocho',    '2022-12-02', 'Ativo', 'Novilho em engorda', v_client_id, v_property_id),
    (a19, 'PAU-019', 'Maravilha',   'F', 'Angus',           '2021-08-25', 'Ativo', 'Vaca seca',          v_client_id, v_property_id),
    (a20, 'PAU-020', 'Valente',     'M', 'Nelore',          '2023-02-14', 'Ativo', 'Novilho',            v_client_id, v_property_id)
  ON CONFLICT (id) DO NOTHING;

  -- ── Weights for new animals (5 per animal, last 12 months) ───────────────
  INSERT INTO weights (animal_id, weight, weighing_date)
  VALUES
    (a09, 510, today -   5), (a09, 482, today -  65), (a09, 454, today - 125), (a09, 426, today - 185), (a09, 398, today - 245),
    (a10, 498, today -   8), (a10, 468, today -  68), (a10, 438, today - 128), (a10, 408, today - 188), (a10, 378, today - 248),
    (a11, 445, today -  12), (a11, 415, today -  72), (a11, 385, today - 132), (a11, 355, today - 192), (a11, 325, today - 252),
    (a12, 390, today -   9), (a12, 368, today -  69), (a12, 346, today - 129), (a12, 324, today - 189), (a12, 302, today - 249),
    (a13, 405, today -   6), (a13, 382, today -  66), (a13, 359, today - 126), (a13, 336, today - 186), (a13, 313, today - 246),
    (a14, 520, today -  11), (a14, 492, today -  71), (a14, 464, today - 131), (a14, 436, today - 191), (a14, 408, today - 251),
    (a15, 368, today -   7), (a15, 348, today -  67), (a15, 328, today - 127), (a15, 308, today - 187), (a15, 288, today - 247),
    (a16, 432, today -  10), (a16, 402, today -  70), (a16, 372, today - 130), (a16, 342, today - 190), (a16, 312, today - 250),
    (a17, 372, today -   4), (a17, 351, today -  64), (a17, 330, today - 124), (a17, 309, today - 184), (a17, 288, today - 244),
    (a18, 505, today -   3), (a18, 477, today -  63), (a18, 449, today - 123), (a18, 421, today - 183), (a18, 393, today - 243),
    (a19, 380, today -  14), (a19, 360, today -  74), (a19, 340, today - 134), (a19, 320, today - 194), (a19, 300, today - 254),
    (a20, 412, today -  36), (a20, 388, today -  96), (a20, 364, today - 156), (a20, 340, today - 216), (a20, 316, today - 276);

  -- a20 Valente: last weighing 36 days ago → "sem pesagem" alert
  -- (existing p6 Novilha Iguaçu already has 43-day gap from migration 027)

  -- ── Lots ─────────────────────────────────────────────────────────────────
  INSERT INTO lots (id, client_id, property_id, name, objective, status)
  VALUES
    (v_lot_venda,  v_client_id, v_property_id, 'MS-VENDA-001',  'venda',  'active'),
    (v_lot_recria, v_client_id, v_property_id, 'MS-RECRIA-002', 'recria', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Lot assignments: 5 animais para venda, 8 para recria
  DELETE FROM animal_lot_assignments WHERE lot_id IN (v_lot_venda, v_lot_recria);
  INSERT INTO animal_lot_assignments (lot_id, animal_id, entry_date)
  VALUES
    -- Venda (5 machos em engorda, avg ~500 kg)
    (v_lot_venda, p1,  today), -- Boi Trovador
    (v_lot_venda, p3,  today), -- Touro Bravo
    (v_lot_venda, a09, today), -- Guerreiro
    (v_lot_venda, a14, today), -- Sultão
    (v_lot_venda, a18, today), -- Diamante
    -- Recria (8 novilhas/novilhos jovens)
    (v_lot_recria, a11, today), (v_lot_recria, a12, today), (v_lot_recria, a13, today),
    (v_lot_recria, a15, today), (v_lot_recria, a16, today), (v_lot_recria, a17, today),
    (v_lot_recria, a19, today), (v_lot_recria, a20, today);

  -- ── Ivermectina withdrawal — a14 Sultão (carência ativa ~8 dias) ─────────
  EXECUTE 'ALTER TABLE applications DISABLE TRIGGER USER';
  INSERT INTO applications (animal_id, product_name, application_date, withdrawal_date, dose, unit, operator_name)
  VALUES (a14, 'Ivermectina 1%', today - 7, today + 8, 4.9, 'ml', 'Equipe sanitária')
  ON CONFLICT DO NOTHING;
  EXECUTE 'ALTER TABLE applications ENABLE TRIGGER USER';

  -- ── DG positivo — a13 Aurora ─────────────────────────────────────────────
  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  VALUES (a13, 'animal', 'reprodutivo', (today - 5)::timestamptz,
          'DG positivo — 45 dias de gestação confirmados')
  ON CONFLICT DO NOTHING;

  -- ── Estação de monta 2025/26 — summary event on first female ────────────
  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  VALUES (p2, 'farm', 'estacao_monta', (today - 60)::timestamptz,
          'Estação de monta 2025/26 encerrada — 18 fêmeas, 11 prenhas (62% prenhez)')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'pauloborin enrichment OK — 12 novos animais, pesos, 2 lotes, carência Ivermectina, DG Aurora';
END $$;
