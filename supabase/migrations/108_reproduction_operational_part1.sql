-- Migration 108: schema operacional de reprodução (parte 1)
-- Camada operacional sobre as 3 tabelas de reporting existentes
-- (reproductive_seasons, reproductive_ia_services, reproductive_stock_summary).
--
-- Tabelas criadas:
--   coverings              -- registro de cobertura (IA / monta / TE)
--   pregnancy_diagnostics  -- diagnóstico de gestação (palpação / US)
--   births                 -- parto e ficha do bezerro
--   bull_breeding_soundness -- exame andrológico
--
-- ENUMs: covering_type_enum, pregnancy_diag_method_enum, pregnancy_diag_result_enum,
--        birth_difficulty_enum, bull_classification_enum
--
-- RLS pattern: SELECT (is_admin OR client_id=get_my_client_id())
--              INSERT/UPDATE/DELETE com client_id=get_my_client_id()
-- FK pattern:  client_id ON DELETE CASCADE; animais ON DELETE SET NULL/CASCADE
-- Index pattern: client_id, season_id, animal_ids, datas

BEGIN;

-- ── ENUMs ────────────────────────────────────────────────────────────
CREATE TYPE covering_type_enum AS ENUM (
  'monta_natural','monta_controlada','ia_convencional','iatf','re_iatf','te_fiv','te_iv'
);
CREATE TYPE pregnancy_diag_method_enum AS ENUM (
  'palpacao','ultrassom_30d','ultrassom_60d','ultrassom_90d'
);
CREATE TYPE pregnancy_diag_result_enum AS ENUM (
  'positivo','negativo','duvida'
);
CREATE TYPE birth_difficulty_enum AS ENUM (
  'normal','distocia_leve','distocia_severa'
);
CREATE TYPE bull_classification_enum AS ENUM (
  'apto','apto_restricoes','inapto'
);

-- ── 1) coverings ─────────────────────────────────────────────────────
CREATE TABLE public.coverings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  season_id       uuid REFERENCES public.reproductive_seasons(id) ON DELETE SET NULL,
  dam_animal_id   uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  covering_type   covering_type_enum NOT NULL,
  covering_date   date NOT NULL,
  sire_animal_id  uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  -- FK retroativa para semen_batches adicionada na migration 109
  semen_batch_id  uuid,
  technician_name text,
  protocol_notes  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coverings_client ON public.coverings(client_id);
CREATE INDEX idx_coverings_season ON public.coverings(season_id);
CREATE INDEX idx_coverings_dam    ON public.coverings(dam_animal_id);
CREATE INDEX idx_coverings_date   ON public.coverings(covering_date);

ALTER TABLE public.coverings ENABLE ROW LEVEL SECURITY;

CREATE POLICY coverings_select ON public.coverings
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY coverings_insert ON public.coverings
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY coverings_update ON public.coverings
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY coverings_delete ON public.coverings
  FOR DELETE USING (client_id = get_my_client_id());

-- ── 2) pregnancy_diagnostics ─────────────────────────────────────────
CREATE TABLE public.pregnancy_diagnostics (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  covering_id        uuid NOT NULL REFERENCES public.coverings(id) ON DELETE CASCADE,
  diagnostic_date    date NOT NULL,
  method             pregnancy_diag_method_enum NOT NULL,
  result             pregnancy_diag_result_enum NOT NULL,
  gestation_days     int,
  fetal_sex          text,
  veterinarian_name  text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diag_client   ON public.pregnancy_diagnostics(client_id);
CREATE INDEX idx_diag_covering ON public.pregnancy_diagnostics(covering_id);
CREATE INDEX idx_diag_date     ON public.pregnancy_diagnostics(diagnostic_date);

ALTER TABLE public.pregnancy_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY diag_select ON public.pregnancy_diagnostics
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY diag_insert ON public.pregnancy_diagnostics
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY diag_update ON public.pregnancy_diagnostics
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY diag_delete ON public.pregnancy_diagnostics
  FOR DELETE USING (client_id = get_my_client_id());

-- ── 3) births ────────────────────────────────────────────────────────
CREATE TABLE public.births (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  covering_id      uuid REFERENCES public.coverings(id) ON DELETE SET NULL,
  dam_animal_id    uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  sire_animal_id   uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  birth_date       date NOT NULL,
  calf_animal_id   uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  birth_weight_kg  numeric,
  birth_difficulty birth_difficulty_enum NOT NULL DEFAULT 'normal',
  calf_sex         text,
  calf_alive       boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_births_client   ON public.births(client_id);
CREATE INDEX idx_births_covering ON public.births(covering_id);
CREATE INDEX idx_births_dam      ON public.births(dam_animal_id);
CREATE INDEX idx_births_date     ON public.births(birth_date);

ALTER TABLE public.births ENABLE ROW LEVEL SECURITY;

CREATE POLICY births_select ON public.births
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY births_insert ON public.births
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY births_update ON public.births
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY births_delete ON public.births
  FOR DELETE USING (client_id = get_my_client_id());

-- ── 4) bull_breeding_soundness ───────────────────────────────────────
CREATE TABLE public.bull_breeding_soundness (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bull_animal_id           uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  evaluation_date          date NOT NULL,
  scrotal_circumference_cm numeric,
  semen_quality_score      int CHECK (semen_quality_score BETWEEN 1 AND 5),
  libido_score             int CHECK (libido_score BETWEEN 1 AND 5),
  overall_classification   bull_classification_enum NOT NULL,
  veterinarian_name        text,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bull_eval_client ON public.bull_breeding_soundness(client_id);
CREATE INDEX idx_bull_eval_bull   ON public.bull_breeding_soundness(bull_animal_id);
CREATE INDEX idx_bull_eval_date   ON public.bull_breeding_soundness(evaluation_date);

ALTER TABLE public.bull_breeding_soundness ENABLE ROW LEVEL SECURITY;

CREATE POLICY bull_eval_select ON public.bull_breeding_soundness
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY bull_eval_insert ON public.bull_breeding_soundness
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY bull_eval_update ON public.bull_breeding_soundness
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY bull_eval_delete ON public.bull_breeding_soundness
  FOR DELETE USING (client_id = get_my_client_id());

COMMIT;
