-- Migration 084: Demo PIF — atualiza cotação, pesagens faltantes e eventos

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal RECORD;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Atualiza cotação para hoje ═══════════════════════════════════════
  UPDATE platform_settings
     SET value = '330.00', updated_at = NOW()
   WHERE key = 'cotacao_arroba';

  INSERT INTO platform_settings (key, value, updated_at)
  VALUES ('cotacao_boi_gordo', '330.00', NOW())
  ON CONFLICT (key) DO UPDATE SET value = '330.00', updated_at = NOW();

  -- ═══ 2. Pesagens recentes para animais Lucas sem peso ═════════════════════
  FOR v_animal IN
    SELECT a.id, a.internal_code, a.sex
    FROM animals a
    WHERE a.client_id = v_lucas
      AND NOT EXISTS (
        SELECT 1 FROM weights w
        WHERE w.animal_id = a.id AND w.weighing_date >= CURRENT_DATE - INTERVAL '180 days'
      )
  LOOP
    INSERT INTO weights (animal_id, weight, weighing_date)
    VALUES (
      v_animal.id,
      CASE WHEN v_animal.sex = 'Female' THEN 380 + (RANDOM() * 100)::int
           ELSE 480 + (RANDOM() * 140)::int END,
      CURRENT_DATE - (RANDOM() * 30)::int
    );
  END LOOP;

  -- ═══ 3. Eventos demo para timeline (variados últimos 60 dias) ═════════════
  -- 10+ eventos para os SAU animals (mais visibilidade na demo)
  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  SELECT a.id, 'farm', 'pesagem', CURRENT_DATE - (RANDOM() * 60)::int,
         'Pesagem mensal — ' || COALESCE(a.nickname, a.internal_code)
  FROM animals a
  WHERE a.client_id = v_lucas AND a.internal_code LIKE 'SAU-%';

  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  SELECT a.id, 'farm', 'vacinacao', CURRENT_DATE - (RANDOM() * 45)::int,
         'Vacinação reforço — ' || COALESCE(a.nickname, a.internal_code)
  FROM animals a
  WHERE a.client_id = v_lucas AND a.internal_code LIKE 'SAU-%';

  INSERT INTO events (animal_id, source, event_type, event_date, notes)
  SELECT a.id, 'farm', 'movimentacao', CURRENT_DATE - (RANDOM() * 30)::int,
         'Transferência entre piquetes — ' || COALESCE(a.nickname, a.internal_code)
  FROM animals a
  WHERE a.client_id = v_lucas AND a.internal_code LIKE 'SAU-%'
  LIMIT 3;

  SET LOCAL session_replication_role = DEFAULT;
END $$;
