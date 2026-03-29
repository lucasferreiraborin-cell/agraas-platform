-- =============================================================================
-- Migration 036 — Score Engine centralizado
-- Função SQL calculate_agraas_score(p_animal_id) + triggers automáticos
-- algorithm_version = 'v2' (weights: productive 28%, sanitary 24%,
--   operational 18%, continuity 20%, age 10%, traceability bonus +7)
-- =============================================================================

-- ─── 1. Adiciona colunas à tabela animal_scores ───────────────────────────────
ALTER TABLE animal_scores
  ADD COLUMN IF NOT EXISTS algorithm_version text    NOT NULL DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS productive_score  numeric;

-- ─── 2. Função principal: calculate_agraas_score ─────────────────────────────
CREATE OR REPLACE FUNCTION calculate_agraas_score(p_animal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_birth_date      date;
  v_blood_type      text;
  v_has_genealogy   boolean;

  v_last_weight     numeric;
  v_app_count       int;
  v_event_count     int;
  v_recent_weights  int;
  v_age_months      numeric;

  v_productive      numeric;
  v_age_factor      numeric;
  v_sanitary        numeric;
  v_operational     numeric;
  v_continuity      numeric;
  v_trace_bonus     numeric;
  v_total           numeric;
BEGIN
  -- ── Animal metadata ──────────────────────────────────────────────────────
  SELECT
    birth_date,
    blood_type,
    (sire_animal_id IS NOT NULL OR dam_animal_id IS NOT NULL)
  INTO v_birth_date, v_blood_type, v_has_genealogy
  FROM animals
  WHERE id = p_animal_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- ── Last weight ──────────────────────────────────────────────────────────
  SELECT weight INTO v_last_weight
    FROM weights
   WHERE animal_id = p_animal_id
   ORDER BY weighing_date DESC
   LIMIT 1;

  -- ── Application count (drives sanitary_score) ────────────────────────────
  SELECT COUNT(*) INTO v_app_count
    FROM applications
   WHERE animal_id = p_animal_id;

  -- ── Event count (drives operational_score) ───────────────────────────────
  SELECT COUNT(*) INTO v_event_count
    FROM events
   WHERE animal_id = p_animal_id;

  -- ── Recent weighings in last 90 days (drives continuity_score) ───────────
  SELECT COUNT(*) INTO v_recent_weights
    FROM weights
   WHERE animal_id = p_animal_id
     AND weighing_date >= CURRENT_DATE - INTERVAL '90 days';

  -- ── Sub-scores ────────────────────────────────────────────────────────────
  v_productive := CASE
    WHEN v_last_weight IS NOT NULL AND v_last_weight > 0
      THEN LEAST(100, 35 + ROUND(v_last_weight / 10))
    ELSE 35
  END;

  v_age_months := CASE
    WHEN v_birth_date IS NOT NULL
      THEN EXTRACT(YEAR  FROM AGE(CURRENT_DATE, v_birth_date)) * 12
         + EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_birth_date))
    ELSE NULL
  END;

  v_age_factor := CASE
    WHEN v_age_months IS NOT NULL
      THEN LEAST(100, 40 + ROUND(v_age_months / 2.0))
    ELSE 50
  END;

  v_sanitary    := LEAST(100, 50 + COALESCE(v_app_count,       0) * 5);
  v_operational := LEAST(100, 40 + COALESCE(v_event_count,     0) * 3);
  v_continuity  := LEAST(100, 40 + COALESCE(v_recent_weights,  0) * 15);

  v_trace_bonus :=
    (CASE WHEN v_blood_type IS NOT NULL THEN 3 ELSE 0 END)::numeric
  + (CASE WHEN v_has_genealogy           THEN 4 ELSE 0 END)::numeric;

  -- ── Composite score (v2 weights) ─────────────────────────────────────────
  v_total := LEAST(100, ROUND(
      v_productive   * 0.28
    + v_sanitary     * 0.24
    + v_operational  * 0.18
    + v_continuity   * 0.20
    + v_age_factor   * 0.10
    + v_trace_bonus
  ));

  -- ── Upsert animal_scores — bypass recursive trigger (same pattern as 032) ─
  SET LOCAL session_replication_role = replica;

  INSERT INTO animal_scores
    (animal_id, productive_score, sanitary_score, operational_score,
     continuity_score, total_score, score_status, score_version,
     algorithm_version, last_updated, updated_at)
  VALUES
    (p_animal_id, v_productive, v_sanitary, v_operational,
     v_continuity, v_total, 'current', 'v2', 'v2', NOW(), NOW())
  ON CONFLICT (animal_id) DO UPDATE SET
    productive_score  = EXCLUDED.productive_score,
    sanitary_score    = EXCLUDED.sanitary_score,
    operational_score = EXCLUDED.operational_score,
    continuity_score  = EXCLUDED.continuity_score,
    total_score       = EXCLUDED.total_score,
    score_status      = 'current',
    score_version     = 'v2',
    algorithm_version = 'v2',
    last_updated      = NOW(),
    updated_at        = NOW();

  SET LOCAL session_replication_role = DEFAULT;

  -- ── Keep agraas_master_passport_cache in sync ─────────────────────────────
  UPDATE agraas_master_passport_cache
     SET score_json = jsonb_build_object(
           'total_score',       v_total,
           'productive_score',  v_productive,
           'sanitary_score',    v_sanitary,
           'operational_score', v_operational,
           'continuity_score',  v_continuity,
           'algorithm_version', 'v2',
           'updated_at',        NOW()::text
         )
   WHERE animal_id = p_animal_id;

  RETURN v_total;
END;
$$;

-- ─── 3. Trigger wrapper functions ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _trg_score_from_weight()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_agraas_score(NEW.animal_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION _trg_score_from_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    PERFORM calculate_agraas_score(NEW.animal_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION _trg_score_from_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_agraas_score(NEW.animal_id);
  RETURN NEW;
END;
$$;

-- ─── 4. Triggers ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_score_on_weight      ON weights;
DROP TRIGGER IF EXISTS trg_score_on_event       ON events;
DROP TRIGGER IF EXISTS trg_score_on_application ON applications;

CREATE TRIGGER trg_score_on_weight
  AFTER INSERT OR UPDATE ON weights
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_weight();

CREATE TRIGGER trg_score_on_event
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_event();

CREATE TRIGGER trg_score_on_application
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_application();

-- ─── 5. Batch recalculation — todos os animais existentes ────────────────────
-- Processa em batches de 100 com pg_sleep(0.01) entre cada batch.

DO $$
DECLARE
  v_ids       uuid[];
  v_total     int;
  v_done      int := 0;
  v_batch_sz  int := 100;
  i           int := 1;
BEGIN
  -- Desabilita nossos triggers para evitar re-entry durante bulk recalc
  ALTER TABLE weights      DISABLE TRIGGER trg_score_on_weight;
  ALTER TABLE events       DISABLE TRIGGER trg_score_on_event;
  ALTER TABLE applications DISABLE TRIGGER trg_score_on_application;

  -- Coleta todos os IDs ordenados (determinístico)
  SELECT ARRAY_AGG(id ORDER BY id) INTO v_ids FROM animals;
  v_total := COALESCE(array_length(v_ids, 1), 0);

  RAISE NOTICE '[score-engine] Iniciando recálculo: % animais em batches de %', v_total, v_batch_sz;

  WHILE i <= v_total LOOP
    PERFORM calculate_agraas_score(aid)
      FROM unnest(v_ids[i : LEAST(i + v_batch_sz - 1, v_total)]) AS aid;

    v_done := v_done + LEAST(v_batch_sz, v_total - i + 1);
    i      := i + v_batch_sz;

    PERFORM pg_sleep(0.01);
  END LOOP;

  -- Reabilita triggers
  ALTER TABLE weights      ENABLE TRIGGER trg_score_on_weight;
  ALTER TABLE events       ENABLE TRIGGER trg_score_on_event;
  ALTER TABLE applications ENABLE TRIGGER trg_score_on_application;

  RAISE NOTICE '[score-engine] Recálculo concluído: % animais | algorithm_version=v2', v_done;
END $$;
