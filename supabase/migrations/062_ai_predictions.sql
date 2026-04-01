-- Migration 062: tabela ai_predictions
-- Armazena análises preditivas geradas pelo Claude por animal.
-- Cache de 24h evita chamadas repetidas à API.

CREATE TABLE IF NOT EXISTS ai_predictions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id           uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES clients(id),
  risk_level          text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  alerts              jsonb NOT NULL DEFAULT '[]',
  recommendations     jsonb NOT NULL DEFAULT '[]',
  predicted_score_30d integer CHECK (predicted_score_30d BETWEEN 0 AND 100),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS ai_predictions_animal_created
  ON ai_predictions (animal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_predictions_client_risk_created
  ON ai_predictions (client_id, risk_level, created_at DESC);

-- RLS
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_predictions_select" ON ai_predictions
  FOR SELECT USING (client_id = get_my_client_id());

CREATE POLICY "ai_predictions_insert" ON ai_predictions
  FOR INSERT WITH CHECK (client_id = get_my_client_id());

DO $$ BEGIN
  RAISE NOTICE 'Migration 062: tabela ai_predictions criada com RLS.';
END $$;
