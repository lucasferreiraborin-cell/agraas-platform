-- Migration 078: Reset dados demo FSJBE para tombamento real
-- Mantém: properties, suppliers, products, animal_goals, sanitary_calendar,
--         buyers, reproductive_seasons, clients

DO $$
DECLARE
  v_client uuid := '00000000-0000-0000-0003-000000000001';
  v_animal_ids uuid[];
BEGIN
  -- Collect animal IDs before deleting
  SELECT ARRAY_AGG(id) INTO v_animal_ids FROM animals WHERE client_id = v_client;

  IF v_animal_ids IS NULL OR array_length(v_animal_ids, 1) IS NULL THEN
    RAISE NOTICE 'Nenhum animal para deletar';
    RETURN;
  END IF;

  -- Skip triggers (legacy animal_events, stock debit, score recalc)
  SET LOCAL session_replication_role = 'replica';

  -- Delete operational data linked to animals
  DELETE FROM sales WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_cost_summary WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_photos WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM agraas_master_passport_cache WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_scores WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_certifications WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM applications WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM weights WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM events WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_rfids WHERE animal_id = ANY(v_animal_ids);
  DELETE FROM animal_movements WHERE animal_id = ANY(v_animal_ids);

  -- Delete animals last (FK references cleared above)
  DELETE FROM animals WHERE client_id = v_client;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'FSJBE reset: % animais deletados', array_length(v_animal_ids, 1);
END $$;
