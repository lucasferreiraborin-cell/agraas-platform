-- Migration 074: Metas de peso por categoria/fase + alert trigger

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Enums + Tabela
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE goal_category_enum AS ENUM ('bezerro','novilha','vaca','touro');
CREATE TYPE goal_phase_enum    AS ENUM ('nascimento','desmame','recria','venda');

CREATE TABLE IF NOT EXISTS animal_goals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id),
  category         goal_category_enum NOT NULL,
  phase            goal_phase_enum NOT NULL,
  target_weight_kg numeric(8,2) NOT NULL,
  target_age_days  integer NOT NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, category, phase)
);

CREATE INDEX idx_animal_goals_client ON animal_goals(client_id);

ALTER TABLE animal_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY animal_goals_select ON animal_goals FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY animal_goals_insert ON animal_goals FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY animal_goals_update ON animal_goals FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY animal_goals_delete ON animal_goals FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Trigger: alerta quando peso < 85% da meta
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _trg_weight_goal_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_animal   RECORD;
  v_goal     RECORD;
  v_age_days integer;
  v_category text;
  v_phase    text;
  v_client   uuid;
BEGIN
  -- Fetch animal info
  SELECT id, client_id, birth_date, sex, category INTO v_animal
  FROM animals WHERE id = NEW.animal_id;

  IF v_animal IS NULL OR v_animal.birth_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_client := v_animal.client_id;
  v_age_days := (NEW.weighing_date::date - v_animal.birth_date::date);

  -- Determine goal category from animal sex
  IF v_age_days < 365 THEN
    v_category := 'bezerro';
  ELSIF v_animal.sex = 'Female' THEN
    v_category := 'novilha';
  ELSE
    v_category := 'touro';
  END IF;

  -- Find closest phase by age
  SELECT * INTO v_goal
  FROM animal_goals
  WHERE client_id = v_client
    AND category = v_category::goal_category_enum
  ORDER BY ABS(target_age_days - v_age_days)
  LIMIT 1;

  IF v_goal IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if weight < 85% of target
  IF NEW.weight < (v_goal.target_weight_kg * 0.85) THEN
    INSERT INTO fiscal_alerts (client_id, tipo, descricao, severidade)
    VALUES (
      v_client,
      'abaixo_da_meta',
      format('Animal %s pesou %.1f kg — abaixo de 85%% da meta de %.0f kg (%s/%s)',
        (SELECT internal_code FROM animals WHERE id = NEW.animal_id),
        NEW.weight, v_goal.target_weight_kg, v_category, v_goal.phase),
      'aviso'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weight_goal_alert ON weights;
CREATE TRIGGER trg_weight_goal_alert
  AFTER INSERT ON weights
  FOR EACH ROW EXECUTE FUNCTION _trg_weight_goal_alert();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Seed FSJBE
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO animal_goals (client_id, category, phase, target_weight_kg, target_age_days, notes) VALUES
  ('00000000-0000-0000-0003-000000000001', 'bezerro', 'desmame',  180, 210, 'Meta desmame Nelore — 8 meses'),
  ('00000000-0000-0000-0003-000000000001', 'bezerro', 'venda',    240, 365, 'Meta venda bezerro — 12 meses'),
  ('00000000-0000-0000-0003-000000000001', 'novilha', 'recria',   320, 540, 'Meta recria novilha — 18 meses'),
  ('00000000-0000-0000-0003-000000000001', 'touro',   'recria',   420, 540, 'Meta recria touro — 18 meses');
