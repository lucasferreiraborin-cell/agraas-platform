-- Migration 080b: Fix agraas_id + add events to boost scores

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal RECORD;
BEGIN
  -- Fix agraas_id for SAU animals (trigger skipped by replica mode)
  FOR v_animal IN SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%' AND agraas_id IS NULL
  LOOP
    UPDATE animals SET agraas_id = 'AGR-' || UPPER(SUBSTRING(MD5(v_animal.id::text), 1, 8))
    WHERE id = v_animal.id;
  END LOOP;

  SET LOCAL session_replication_role = 'replica';

  -- Add events for SAU animals (boosts operational score)
  FOR v_animal IN SELECT id, internal_code, nickname FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
  LOOP
    INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
      (v_animal.id, 'animal', 'nascimento',    '2022-01-15', 'Parto normal — ' || v_animal.nickname),
      (v_animal.id, 'animal', 'desmame',       '2022-09-15', 'Desmame — ' || v_animal.nickname),
      (v_animal.id, 'animal', 'transferencia', '2023-01-10', 'Transferido para pasto de recria'),
      (v_animal.id, 'farm',   'weighing',      '2026-03-20', 'Pesagem pré-embarque — ' || v_animal.nickname),
      (v_animal.id, 'farm',   'inspection',    '2026-04-05', 'Inspeção veterinária — apto para exportação');
  END LOOP;

  -- Add extra recent weights (boosts continuity score — needs >2 weights in 90 days)
  FOR v_animal IN SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
  LOOP
    INSERT INTO weights (animal_id, weight, weighing_date) VALUES
      (v_animal.id, 480 + (RANDOM() * 100)::int, '2026-02-10'),
      (v_animal.id, 500 + (RANDOM() * 100)::int, '2026-04-01');
  END LOOP;

  SET LOCAL session_replication_role = DEFAULT;

  -- Recalculate scores
  FOR v_animal IN SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
  LOOP
    PERFORM calculate_agraas_score(v_animal.id);
  END LOOP;
END $$;
