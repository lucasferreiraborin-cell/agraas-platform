-- Migration 083: Demo PIF — fix passport cache + split MAPA-SIF + lot certs

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animal RECORD;
  v_score numeric;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Split MAPA-SIF into MAPA + SIF for SAU animals ═════════════════════
  -- Update existing MAPA-SIF rows to MAPA, then insert new SIF rows
  UPDATE animal_certifications
     SET certification_name = 'MAPA',
         certification_code = REPLACE(certification_code, 'MAPA-SIF', 'MAPA')
   WHERE animal_id IN (SELECT id FROM animals WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%')
     AND certification_name = 'MAPA-SIF';

  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  SELECT id, 'SIF-SAU-' || internal_code, 'SIF', 'active', '2026-01-15', '2026-12-31'
  FROM animals
  WHERE client_id = v_lucas AND internal_code LIKE 'SAU-%';

  -- ═══ 2. Update lot to require Halal + MAPA + SIF + GTA ═════════════════════
  UPDATE lots
     SET certificacoes_exigidas = ARRAY['Halal', 'MAPA', 'SIF', 'GTA']
   WHERE name = 'Saudi Premium Export #001';

  -- ═══ 3. Populate agraas_master_passport_cache for SAU animals ══════════════
  FOR v_animal IN
    SELECT a.id, a.client_id, a.internal_code, a.nickname, a.sex, a.breed, a.status,
           s.total_score
    FROM animals a
    LEFT JOIN animal_scores s ON s.animal_id = a.id
    WHERE a.client_id = v_lucas AND a.internal_code LIKE 'SAU-%'
  LOOP
    v_score := COALESCE(v_animal.total_score, 0);

    INSERT INTO agraas_master_passport_cache (
      animal_id, client_id,
      identity_json, score_json, health_json, certifications_json, ownership_json,
      sanitary_json, traceability_json, timeline_json,
      last_generated_at
    ) VALUES (
      v_animal.id, v_animal.client_id,
      jsonb_build_object(
        'internal_code', v_animal.internal_code,
        'nickname',      v_animal.nickname,
        'sex',           v_animal.sex,
        'breed',         v_animal.breed,
        'status',        v_animal.status
      ),
      jsonb_build_object(
        'total_score',       v_score,
        'sanitary_score',    85,
        'operational_score', 80,
        'continuity_score',  75,
        'productive_score',  v_score,
        'algorithm_version', 'v2',
        'updated_at',        now()::text
      ),
      jsonb_build_object('applications', 3, 'active_withdrawal', 0),
      '[]'::jsonb,
      jsonb_build_object('current_property_id', NULL, 'status', v_animal.status),
      jsonb_build_object('active_withdrawal', false, 'withdrawal_end_date', NULL),
      jsonb_build_object('current_property_name', 'Fazenda Santa Cruz'),
      '[]'::jsonb,
      now()
    )
    ON CONFLICT (animal_id) DO UPDATE SET
      score_json = EXCLUDED.score_json,
      identity_json = EXCLUDED.identity_json,
      last_generated_at = now();
  END LOOP;

  SET LOCAL session_replication_role = DEFAULT;
END $$;
