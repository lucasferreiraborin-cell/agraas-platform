-- ============================================================================
-- Migration 126 — Persona Banco / Instituição Financeira
-- ============================================================================
-- Sprint B (17/06/2026): habilita a 3ª persona da Agraas — banco/cooperativa
-- de crédito. Banco vê dossiê de produtores que tem relacionamento, baseado
-- em farm_scores + producer_scores v3. Mascaramento de dados sensíveis fica
-- na camada de aplicação (lib/personas.ts).
-- ============================================================================

-- 1) Estender enum role em clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_role_check;
ALTER TABLE clients ADD CONSTRAINT clients_role_check
  CHECK (role IN ('admin', 'client', 'buyer', 'bank'));

-- 2) Tabela de relacionamento banco ↔ produtor
CREATE TABLE IF NOT EXISTS bank_producer_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  producer_client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  relationship_type text DEFAULT 'credit_analysis' CHECK (
    relationship_type IN ('credit_analysis', 'portfolio_monitoring', 'loan_active')
  ),
  granted_by_producer boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank_client_id, producer_client_id)
);

CREATE INDEX IF NOT EXISTS idx_bpr_bank ON bank_producer_relationships(bank_client_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bpr_producer ON bank_producer_relationships(producer_client_id) WHERE status = 'active';

-- 3) RLS
ALTER TABLE bank_producer_relationships ENABLE ROW LEVEL SECURITY;

-- Banco vê seus próprios relacionamentos
DROP POLICY IF EXISTS bpr_bank_select ON bank_producer_relationships;
CREATE POLICY bpr_bank_select ON bank_producer_relationships
  FOR SELECT USING (bank_client_id = get_my_client_id());

-- Produtor vê quais bancos têm acesso ao seu dossiê
DROP POLICY IF EXISTS bpr_producer_select ON bank_producer_relationships;
CREATE POLICY bpr_producer_select ON bank_producer_relationships
  FOR SELECT USING (producer_client_id = get_my_client_id());

-- Produtor concede/revoga (granted_by_producer toggle)
DROP POLICY IF EXISTS bpr_producer_update ON bank_producer_relationships;
CREATE POLICY bpr_producer_update ON bank_producer_relationships
  FOR UPDATE USING (producer_client_id = get_my_client_id())
  WITH CHECK (producer_client_id = get_my_client_id());

-- Admin gerencia tudo (operação interna Agraas)
DROP POLICY IF EXISTS bpr_admin_all ON bank_producer_relationships;
CREATE POLICY bpr_admin_all ON bank_producer_relationships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM clients WHERE id = get_my_client_id() AND role = 'admin')
  );

-- 4) Extensão de RLS em farm_scores / producer_scores — Banco acessa via relacionamento
-- (sem reescrever policies existentes — adiciona policy nova specifically pra bank)
DROP POLICY IF EXISTS farm_scores_select_bank ON farm_scores;
CREATE POLICY farm_scores_select_bank ON farm_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bank_producer_relationships bpr
      WHERE bpr.bank_client_id = get_my_client_id()
        AND bpr.producer_client_id = farm_scores.client_id
        AND bpr.status = 'active'
        AND bpr.granted_by_producer = true
    )
  );

DROP POLICY IF EXISTS producer_scores_select_bank ON producer_scores;
CREATE POLICY producer_scores_select_bank ON producer_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bank_producer_relationships bpr
      WHERE bpr.bank_client_id = get_my_client_id()
        AND bpr.producer_client_id = producer_scores.client_id
        AND bpr.status = 'active'
        AND bpr.granted_by_producer = true
    )
  );

-- 5) Trigger atualiza updated_at
CREATE OR REPLACE FUNCTION update_bpr_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.granted_by_producer = true AND OLD.granted_by_producer = false THEN
    NEW.granted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bpr_updated_at ON bank_producer_relationships;
CREATE TRIGGER trg_bpr_updated_at
  BEFORE UPDATE ON bank_producer_relationships
  FOR EACH ROW EXECUTE FUNCTION update_bpr_timestamp();

COMMENT ON TABLE bank_producer_relationships IS
  'Relacionamento banco ↔ produtor. Banco só vê dossiê de produtor que (a) tem relacionamento active e (b) concedeu acesso (granted_by_producer=true). LGPD + segurança.';
