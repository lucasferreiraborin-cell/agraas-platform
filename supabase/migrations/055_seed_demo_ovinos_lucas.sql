-- Migration 055: Seed demo ovinos/caprinos para Lucas
-- 3 pesagens + 2 aplicações + 3 eventos por animal + Halal para OV-001 e OV-002
-- Usa subquery para encontrar os animais — não assume IDs fixos

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal    record;
  v_idx       int := 0;
  v_is_ovino  bool;

  -- Pesos base por espécie (kg)
  v_w1 numeric; v_w2 numeric; v_w3 numeric;
BEGIN

  FOR v_animal IN
    SELECT id, species, internal_code
      FROM livestock_species
     WHERE client_id = v_client_id
       AND species IN ('ovino', 'caprino')
     ORDER BY internal_code
  LOOP
    v_idx := v_idx + 1;
    v_is_ovino := v_animal.species = 'ovino';

    -- Pesos realistas por espécie
    IF v_is_ovino THEN
      v_w1 := 28 + (v_idx % 3) * 2;   -- 28-32 kg
      v_w2 := v_w1 + 5;
      v_w3 := v_w2 + 6;
    ELSE
      v_w1 := 22 + (v_idx % 3) * 2;   -- 22-26 kg
      v_w2 := v_w1 + 4;
      v_w3 := v_w2 + 5;
    END IF;

    -- ── 3 Pesagens ──────────────────────────────────────────────────────────
    INSERT INTO livestock_weights (client_id, animal_id, weight_kg, weighed_at, notes, operator)
    VALUES
      (v_client_id, v_animal.id, v_w1, CURRENT_DATE - 150, 'Pesagem inicial do período', 'Carlos Neto'),
      (v_client_id, v_animal.id, v_w2, CURRENT_DATE - 90,  'Pesagem intermediária',      'Carlos Neto'),
      (v_client_id, v_animal.id, v_w3, CURRENT_DATE - 30,  'Pesagem recente',            'Ana Lima');

    -- ── 2 Aplicações sanitárias ─────────────────────────────────────────────
    INSERT INTO livestock_applications (client_id, animal_id, product_name, dose, unit, application_date, withdrawal_days, withdrawal_date, operator, batch_number, notes)
    VALUES
      (v_client_id, v_animal.id, 'Ivermectina 1%', 1.0, 'mL/10kg', CURRENT_DATE - 60, 14, CURRENT_DATE - 46, 'Carlos Neto', 'IVE-2025-01', 'Controle de ecto e endoparasitas'),
      (v_client_id, v_animal.id, 'Vacina Clostridiose', 2.0, 'mL', CURRENT_DATE - 30, 0, CURRENT_DATE - 30, 'Ana Lima', 'VAC-CLO-003', 'Dose anual de reforço');

    -- ── 3 Eventos ────────────────────────────────────────────────────────────
    INSERT INTO livestock_events (client_id, animal_id, event_type, event_date, notes, operator)
    VALUES
      (v_client_id, v_animal.id, 'manejo',    CURRENT_DATE - 90, 'Casqueamento e inspeção geral',          'Carlos Neto'),
      (v_client_id, v_animal.id, 'pesagem',   CURRENT_DATE - 30, 'Pesagem mensal — ganho dentro do esperado', 'Ana Lima'),
      (v_client_id, v_animal.id, 'vacinacao', CURRENT_DATE - 30, 'Clostridiose dose anual aplicada',       'Ana Lima');

    -- ── Halal para os 2 primeiros ovinos (OV-001, OV-002) ───────────────────
    IF v_is_ovino AND v_idx <= 2 THEN
      INSERT INTO livestock_certifications (client_id, animal_id, certification_name, issued_at, expires_at, status, issuer, notes)
      VALUES (
        v_client_id,
        v_animal.id,
        'Halal',
        CURRENT_DATE - 180,
        CURRENT_DATE + 185,
        'ativa',
        'CDIAL Halal Brasil',
        'Certificação Halal emitida para exportação ao mercado árabe'
      );
    END IF;

    RAISE NOTICE 'Seed OK — % (%) — pesagens: %/% /% kg | apps: 2 | eventos: 3',
      v_animal.internal_code, v_animal.species, v_w1, v_w2, v_w3;
  END LOOP;

  RAISE NOTICE 'Migration 055 concluída — % animais processados', v_idx;
END $$;
