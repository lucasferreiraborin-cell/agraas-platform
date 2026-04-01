-- Migration 058: Calcula score inicial para todos os lotes de Lucas

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_batch     record;
  v_score     integer;
  v_count     int := 0;
BEGIN
  FOR v_batch IN
    SELECT id, batch_code FROM poultry_batches
     WHERE client_id = v_client_id
     ORDER BY housing_date
  LOOP
    PERFORM calculate_poultry_score(v_batch.id);

    SELECT score INTO v_score FROM poultry_batches WHERE id = v_batch.id;
    RAISE NOTICE 'Score calculado — lote %: %', v_batch.batch_code, v_score;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migration 058 OK — % lotes com score calculado', v_count;
END $$;
