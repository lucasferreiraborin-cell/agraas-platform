-- Migration 082: Boost SAU animal scores to >75 for PIF demo

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal RECORD;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  FOR v_animal IN SELECT id, nickname FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
  LOOP
    -- Additional recent events (boost operational score)
    INSERT INTO events (animal_id, source, event_type, event_date, notes) VALUES
      (v_animal.id, 'farm', 'weighing',   '2026-04-08', 'Pesagem semanal — ' || v_animal.nickname),
      (v_animal.id, 'farm', 'inspection', '2026-04-07', 'Verificação sanitária semanal');

    -- Recent weight in April (boost continuity)
    INSERT INTO weights (animal_id, weight, weighing_date) VALUES
      (v_animal.id, 510 + (RANDOM() * 100)::int, '2026-04-08');

    -- GTA certification (boost traceability)
    INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
      (v_animal.id, 'GTA-SAU-' || v_animal.id::text, 'GTA', 'active', '2026-04-01', '2026-12-31');
  END LOOP;

  SET LOCAL session_replication_role = DEFAULT;

  -- Recalculate
  FOR v_animal IN SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%'
  LOOP
    PERFORM calculate_agraas_score(v_animal.id);
  END LOOP;
END $$;
