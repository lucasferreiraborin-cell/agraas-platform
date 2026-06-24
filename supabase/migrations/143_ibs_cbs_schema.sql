-- ============================================================
-- Migration 143 — IBS/CBS schema (LC 214/2025 Reforma Tributária)
-- Sprint J · 24/06/2026
--
-- CONTEXTO METODOLÓGICO:
-- LC 214/2025 institui CBS (federal) e IBS (estados+municípios) em
-- substituição a PIS/Cofins/ICMS/ISS. Fase de transição 2026-2032.
-- Em 2026/2027 alíquotas-teste de 0,9% CBS + 0,1% IBS (art. 343).
-- Produtor rural pessoa física fica fora do regime regular, mas
-- adquirentes geram crédito presumido sobre suas compras.
--
-- Esta migration prepara os campos para captura desses tributos em
-- toda NF-e (fiscal_invoices novo + fiscal_notes legacy) e cadastra
-- alíquotas oficiais em ibs_cbs_config.
-- ============================================================

-- A) clients: marcar contribuinte e receita bruta anual
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_contribuinte_ibs_cbs boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS receita_bruta_anual numeric(14,2);

COMMENT ON COLUMN clients.is_contribuinte_ibs_cbs IS
  'Se o cliente é contribuinte regular de IBS/CBS (true) ou não (false). Produtor rural PF normalmente é false.';
COMMENT ON COLUMN clients.receita_bruta_anual IS
  'Receita bruta anual em R$ — referência para enquadramento LC 214/2025 (limite produtor rural R$ 3,6mi).';

-- B) fiscal_invoices (Sprint G) — colunas IBS/CBS + crédito presumido + valor líquido
ALTER TABLE fiscal_invoices
  ADD COLUMN IF NOT EXISTS cbs_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ibs_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cbs_credito_presumido numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ibs_credito_presumido numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido_fiscal numeric(12,2);

COMMENT ON COLUMN fiscal_invoices.cbs_value IS 'CBS destacado na nota (LC 214/2025 art. 343 — 0,9% em 2026/2027).';
COMMENT ON COLUMN fiscal_invoices.ibs_value IS 'IBS destacado na nota (LC 214/2025 art. 343 — 0,1% em 2026/2027).';
COMMENT ON COLUMN fiscal_invoices.cbs_credito_presumido IS 'Crédito presumido CBS apurado pelo adquirente sobre compra de produtor PF.';
COMMENT ON COLUMN fiscal_invoices.ibs_credito_presumido IS 'Crédito presumido IBS apurado pelo adquirente sobre compra de produtor PF.';
COMMENT ON COLUMN fiscal_invoices.valor_liquido_fiscal IS 'Valor líquido = gross_value - total_taxes - funrural - cbs - ibs.';

-- B2) fiscal_notes (legacy): apenas cbs_value e ibs_value
ALTER TABLE fiscal_notes
  ADD COLUMN IF NOT EXISTS cbs_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ibs_value numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN fiscal_notes.cbs_value IS 'CBS destacado (legacy — espelha fiscal_invoices.cbs_value).';
COMMENT ON COLUMN fiscal_notes.ibs_value IS 'IBS destacado (legacy — espelha fiscal_invoices.ibs_value).';

-- C) ibs_cbs_config — tabela de referência de alíquotas anuais
CREATE TABLE IF NOT EXISTS ibs_cbs_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_calendario integer NOT NULL UNIQUE,
  cbs_pct numeric(6,4) NOT NULL,
  ibs_pct numeric(6,4) NOT NULL,
  fonte_legal text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE ibs_cbs_config IS
  'Alíquotas anuais CBS/IBS por ano-calendário. Fonte oficial: LC 214/2025.';

INSERT INTO ibs_cbs_config (ano_calendario, cbs_pct, ibs_pct, fonte_legal) VALUES
  (2026, 0.0090, 0.0010, 'LC 214/2025 art. 343 — fase teste'),
  (2027, 0.0090, 0.0010, 'LC 214/2025 art. 343 — fase teste')
ON CONFLICT (ano_calendario) DO NOTHING;

-- D) RLS em ibs_cbs_config — leitura pública (autenticados), escrita só admin
ALTER TABLE ibs_cbs_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ibs_cbs_config_select ON ibs_cbs_config;
CREATE POLICY ibs_cbs_config_select ON ibs_cbs_config
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS ibs_cbs_config_insert_admin ON ibs_cbs_config;
CREATE POLICY ibs_cbs_config_insert_admin ON ibs_cbs_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS ibs_cbs_config_update_admin ON ibs_cbs_config;
CREATE POLICY ibs_cbs_config_update_admin ON ibs_cbs_config
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS ibs_cbs_config_delete_admin ON ibs_cbs_config;
CREATE POLICY ibs_cbs_config_delete_admin ON ibs_cbs_config
  FOR DELETE
  TO authenticated
  USING (is_admin());
