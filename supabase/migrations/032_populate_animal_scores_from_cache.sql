-- Popula animal_scores para todos os animais que estão no cache mas
-- ainda não têm entrada em animal_scores (15 animais: Lucas + cliente 0001).
-- Desabilita triggers para evitar recursão durante o bulk insert.

SET session_replication_role = 'replica';

INSERT INTO animal_scores
  (animal_id, sanitary_score, operational_score, continuity_score,
   total_score, score_status, score_version, last_updated, updated_at)
SELECT
  c.animal_id,
  (c.score_json->>'sanitary_score')::numeric,
  (c.score_json->>'operational_score')::numeric,
  (c.score_json->>'continuity_score')::numeric,
  (c.score_json->>'total_score')::numeric,
  'current'   AS score_status,
  'v1'        AS score_version,
  NOW()       AS last_updated,
  NOW()       AS updated_at
FROM agraas_master_passport_cache c
WHERE NOT EXISTS (
  SELECT 1 FROM animal_scores s WHERE s.animal_id = c.animal_id
)
AND (c.score_json->>'total_score') IS NOT NULL
ON CONFLICT (animal_id) DO NOTHING;

SET session_replication_role = 'origin';
