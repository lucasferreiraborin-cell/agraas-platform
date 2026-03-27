-- A view agraas_master_passport lê da tabela animal_scores (não de score_json).
-- Insere/atualiza scores na tabela correta para PAU e BER.

WITH
  target_clients AS (
    SELECT id FROM clients
    WHERE email IN ('pauloborin@agraas.com.br', 'fsjdbe@gmail.com')
  ),
  target_animals AS (
    SELECT
      a.id,
      a.birth_date,
      a.blood_type,
      a.sire_animal_id,
      a.dam_animal_id
    FROM animals a
    JOIN target_clients tc ON a.client_id = tc.id
  ),
  last_weights AS (
    SELECT DISTINCT ON (animal_id)
      animal_id, weight
    FROM weights
    WHERE animal_id IN (SELECT id FROM target_animals)
    ORDER BY animal_id, weighing_date DESC
  ),
  app_counts AS (
    SELECT animal_id, COUNT(*)::int AS cnt
    FROM applications
    WHERE animal_id IN (SELECT id FROM target_animals)
    GROUP BY animal_id
  ),
  event_counts AS (
    SELECT animal_id, COUNT(*)::int AS cnt
    FROM events
    WHERE animal_id IN (SELECT id FROM target_animals)
    GROUP BY animal_id
  ),
  recent_weight_counts AS (
    SELECT animal_id, COUNT(*)::int AS cnt
    FROM weights
    WHERE animal_id IN (SELECT id FROM target_animals)
      AND weighing_date >= NOW() - INTERVAL '90 days'
    GROUP BY animal_id
  ),
  computed AS (
    SELECT
      ta.id AS animal_id,

      CASE
        WHEN lw.weight IS NOT NULL AND lw.weight > 0
          THEN LEAST(100, 35 + ROUND(lw.weight::numeric / 10))
        ELSE 35
      END AS productive_score,

      CASE
        WHEN ta.birth_date IS NOT NULL
          THEN LEAST(100,
            40 + ROUND(
              (EXTRACT(YEAR  FROM AGE(CURRENT_DATE, ta.birth_date)) * 12
             + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ta.birth_date))) / 2.0
            )
          )
        ELSE 50
      END AS age_factor,

      LEAST(100, 50 + COALESCE(ac.cnt, 0) * 5)   AS sanitary_score,
      LEAST(100, 40 + COALESCE(ec.cnt, 0) * 3)   AS operational_score,
      LEAST(100, 40 + COALESCE(rwc.cnt, 0) * 15) AS continuity_score,

      (CASE WHEN ta.blood_type IS NOT NULL THEN 3 ELSE 0 END
     + CASE WHEN ta.sire_animal_id IS NOT NULL
              OR ta.dam_animal_id  IS NOT NULL THEN 4 ELSE 0 END
      ) AS trace_bonus

    FROM target_animals ta
    LEFT JOIN last_weights          lw  ON lw.animal_id  = ta.id
    LEFT JOIN app_counts            ac  ON ac.animal_id  = ta.id
    LEFT JOIN event_counts          ec  ON ec.animal_id  = ta.id
    LEFT JOIN recent_weight_counts  rwc ON rwc.animal_id = ta.id
  )
INSERT INTO animal_scores
  (animal_id, sanitary_score, operational_score, continuity_score,
   total_score, score_status, score_version, last_updated, updated_at)
SELECT
  animal_id,
  sanitary_score,
  operational_score,
  continuity_score,
  LEAST(100, ROUND(
    productive_score * 0.28
    + sanitary_score   * 0.24
    + operational_score* 0.18
    + continuity_score * 0.2
    + age_factor       * 0.1
    + trace_bonus
  ))::numeric            AS total_score,
  'current'              AS score_status,
  'v1'                   AS score_version,
  NOW()                  AS last_updated,
  NOW()                  AS updated_at
FROM computed
ON CONFLICT (animal_id) DO UPDATE SET
  sanitary_score    = EXCLUDED.sanitary_score,
  operational_score = EXCLUDED.operational_score,
  continuity_score  = EXCLUDED.continuity_score,
  total_score       = EXCLUDED.total_score,
  score_status      = 'current',
  score_version     = 'v1',
  last_updated      = NOW(),
  updated_at        = NOW();
