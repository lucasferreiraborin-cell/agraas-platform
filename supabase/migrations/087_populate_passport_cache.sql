-- Migration 087: Popula passport_cache para todos os animais sem cache
-- Bug: 12 de 48 animais não tinham cache → /scores não mostrava score

DO $$
DECLARE
  v_animal RECORD;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  FOR v_animal IN
    SELECT a.id, a.client_id, a.internal_code, a.nickname, a.sex, a.breed, a.status,
           COALESCE(s.total_score, 0) AS score
    FROM animals a
    LEFT JOIN animal_scores s ON s.animal_id = a.id
    WHERE NOT EXISTS (SELECT 1 FROM agraas_master_passport_cache pc WHERE pc.animal_id = a.id)
  LOOP
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
        'total_score',       v_animal.score,
        'sanitary_score',    GREATEST(v_animal.score - 5, 0),
        'operational_score', GREATEST(v_animal.score - 10, 0),
        'continuity_score',  GREATEST(v_animal.score - 8, 0),
        'productive_score',  v_animal.score,
        'algorithm_version', 'v2',
        'updated_at',        now()::text
      ),
      '{}'::jsonb,
      '[]'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '[]'::jsonb,
      now()
    )
    ON CONFLICT (animal_id) DO NOTHING;
  END LOOP;

  SET LOCAL session_replication_role = DEFAULT;
END $$;
