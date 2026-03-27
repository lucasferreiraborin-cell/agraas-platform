-- 1) Corrige nome do cliente fsjdbe@gmail.com
UPDATE clients
SET name = 'Fazenda São João da Boa Esperança'
WHERE email = 'fsjdbe@gmail.com';

-- 2) Recalcula scores para todos os animais dos clientes
--    pauloborin@agraas.com.br e fsjdbe@gmail.com

WITH
  target_clients AS (
    SELECT id FROM clients
    WHERE email IN ('pauloborin@agraas.com.br', 'fsjdbe@gmail.com')
  ),
  target_animals AS (
    SELECT
      a.id,
      a.internal_code,
      a.sex,
      a.breed,
      a.status,
      a.birth_date,
      a.blood_type,
      a.sire_animal_id,
      a.dam_animal_id,
      a.client_id
    FROM animals a
    JOIN target_clients tc ON a.client_id = tc.id
  ),
  last_weights AS (
    SELECT DISTINCT ON (animal_id)
      animal_id,
      weight,
      weighing_date
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
      ta.id                           AS animal_id,
      ta.client_id,
      ta.internal_code,
      ta.sex,
      ta.breed,
      ta.status,
      lw.weight                       AS last_weight,

      -- productive (28%)
      CASE
        WHEN lw.weight IS NOT NULL AND lw.weight > 0
          THEN LEAST(100, 35 + ROUND(lw.weight::numeric / 10))
        ELSE 35
      END                             AS productive_score,

      -- age factor (10%)
      CASE
        WHEN ta.birth_date IS NOT NULL
          THEN LEAST(100,
            40 + ROUND(
              (EXTRACT(YEAR  FROM AGE(CURRENT_DATE, ta.birth_date)) * 12
             + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ta.birth_date))) / 2.0
            )
          )
        ELSE 50
      END                             AS age_factor,

      -- sanitary (24%)
      LEAST(100, 50 + COALESCE(ac.cnt, 0) * 5)  AS sanitary_score,

      -- operational (18%)
      LEAST(100, 40 + COALESCE(ec.cnt, 0) * 3)  AS operational_score,

      -- continuity (20%)
      LEAST(100, 40 + COALESCE(rwc.cnt, 0) * 15) AS continuity_score,

      -- traceability bonus
      (CASE WHEN ta.blood_type IS NOT NULL THEN 3 ELSE 0 END
     + CASE WHEN ta.sire_animal_id IS NOT NULL
              OR ta.dam_animal_id  IS NOT NULL THEN 4 ELSE 0 END
      )                               AS trace_bonus

    FROM target_animals ta
    LEFT JOIN last_weights          lw  ON lw.animal_id  = ta.id
    LEFT JOIN app_counts            ac  ON ac.animal_id  = ta.id
    LEFT JOIN event_counts          ec  ON ec.animal_id  = ta.id
    LEFT JOIN recent_weight_counts  rwc ON rwc.animal_id = ta.id
  )
INSERT INTO agraas_master_passport_cache
  (animal_id, client_id, identity_json, score_json)
SELECT
  animal_id,
  client_id,

  jsonb_build_object(
    'internal_code', internal_code,
    'sex',           sex,
    'breed',         breed,
    'status',        status
  ) AS identity_json,

  jsonb_build_object(
    'total_score',       LEAST(100, ROUND(
                           productive_score * 0.28
                         + sanitary_score   * 0.24
                         + operational_score* 0.18
                         + continuity_score * 0.2
                         + age_factor       * 0.1
                         + trace_bonus
                         )),
    'productive_score',  productive_score,
    'sanitary_score',    sanitary_score,
    'operational_score', operational_score,
    'continuity_score',  continuity_score,
    'last_weight',       last_weight,
    'updated_at',        NOW()::text
  ) AS score_json

FROM computed
ON CONFLICT (animal_id) DO UPDATE SET
  client_id     = EXCLUDED.client_id,
  identity_json = EXCLUDED.identity_json,
  score_json    = EXCLUDED.score_json;
