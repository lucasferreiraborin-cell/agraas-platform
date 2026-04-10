-- Migration 085: Fix GMD bug — normalize SAU weights with realistic progression

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal RECORD;
  v_base_weight int;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Reset SAU weights to coherent progression ═════════════════════════
  -- Delete all SAU weights
  DELETE FROM weights
   WHERE animal_id IN (
     SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
   );

  -- Insert clean progression for each SAU animal
  -- GMD ~0.85 kg/dia (realistic for Nelore in good conditions)
  FOR v_animal IN
    SELECT id, internal_code FROM animals
    WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
    ORDER BY internal_code
  LOOP
    -- Base weight varies by animal for visual diversity
    v_base_weight := CASE v_animal.internal_code
      WHEN 'SAU-001' THEN 480
      WHEN 'SAU-002' THEN 460
      WHEN 'SAU-003' THEN 540
      WHEN 'SAU-004' THEN 500
      WHEN 'SAU-005' THEN 570
      ELSE 480
    END;

    -- 5 weighings spaced ~30 days, GMD ~0.7-0.9 kg/dia
    INSERT INTO weights (animal_id, weight, weighing_date) VALUES
      (v_animal.id, v_base_weight - 100, CURRENT_DATE - INTERVAL '120 days'),
      (v_animal.id, v_base_weight - 75,  CURRENT_DATE - INTERVAL '90 days'),
      (v_animal.id, v_base_weight - 50,  CURRENT_DATE - INTERVAL '60 days'),
      (v_animal.id, v_base_weight - 25,  CURRENT_DATE - INTERVAL '30 days'),
      (v_animal.id, v_base_weight,        CURRENT_DATE - INTERVAL '2 days');
  END LOOP;

  -- ═══ 2. Insert recent weight for ALL Lucas animals without one ═══════════
  -- (overrides any prior incoherent ones from migration 084)
  FOR v_animal IN
    SELECT a.id, a.internal_code, a.sex, a.category
    FROM animals a
    WHERE a.client_id = v_lucas
      AND a.internal_code NOT LIKE 'SAU-%'
      AND NOT EXISTS (
        SELECT 1 FROM weights w
        WHERE w.animal_id = a.id AND w.weighing_date >= CURRENT_DATE - INTERVAL '60 days'
      )
  LOOP
    INSERT INTO weights (animal_id, weight, weighing_date) VALUES
      (v_animal.id,
       CASE WHEN v_animal.sex = 'Female' THEN 380 + (RANDOM() * 80)::int
            ELSE 480 + (RANDOM() * 140)::int END,
       CURRENT_DATE - (RANDOM() * 30)::int);
  END LOOP;

  -- ═══ 3. Update cotação ═══════════════════════════════════════════════════
  UPDATE platform_settings SET value = '330.00', updated_at = NOW() WHERE key = 'cotacao_arroba';

  -- ═══ 4. Insert events for Lucas animals (timeline) ═══════════════════════
  -- 10+ events nos últimos 60 dias para animais ativos
  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  SELECT a.id, 'farm', 'pesagem',
         (CURRENT_DATE - (RANDOM() * 60)::int)::timestamptz,
         'Pesagem mensal — ' || COALESCE(a.nickname, a.internal_code)
  FROM animals a
  WHERE a.client_id = v_lucas AND a.status = 'Ativo'
  LIMIT 5;

  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  SELECT a.id, 'farm', 'vacinacao',
         (CURRENT_DATE - (RANDOM() * 45)::int)::timestamptz,
         'Vacinação reforço — ' || COALESCE(a.nickname, a.internal_code)
  FROM animals a
  WHERE a.client_id = v_lucas AND a.status = 'Ativo'
  LIMIT 5;

  SET LOCAL session_replication_role = DEFAULT;

  -- Recalculate scores for SAU after weight reset
  FOR v_animal IN SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%' LOOP
    PERFORM calculate_agraas_score(v_animal.id);
  END LOOP;
END $$;
