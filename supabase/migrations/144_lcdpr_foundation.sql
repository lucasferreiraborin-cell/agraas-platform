-- ============================================================
-- Migration 144 — LCDPR Foundation
-- Sprint J · 24/06/2026
--
-- CONTEXTO METODOLÓGICO:
-- LCDPR (Livro Caixa Digital do Produtor Rural) é obrigatório
-- para PF com receita bruta > R$ 4,8mi/ano (IN RFB 1.848/2018,
-- alterada pela IN 2.165/2023). Entrega anual em arquivo .txt
-- estruturado com registros 0000-9999.
--
-- Estruturas:
-- - Registro 0010 — Identificação do imóvel (exige NIRF)
-- - Registro 0050 — Conta bancária do produtor (banco/ag/conta)
-- - Registro Q100 — Lançamentos (receita/despesa por data/doc)
--
-- Esta migration adiciona suporte completo a essas estruturas.
-- ============================================================

-- A) properties: NIRF (Número do Imóvel Rural na Receita Federal) + área total
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS nirf text,
  ADD COLUMN IF NOT EXISTS area_total_hectares numeric(10,2);

COMMENT ON COLUMN properties.nirf IS
  'Número do Imóvel na Receita Federal (NIRF) — obrigatório para LCDPR registro 0010.';
COMMENT ON COLUMN properties.area_total_hectares IS
  'Área total do imóvel em hectares — referência LCDPR/CAR.';

CREATE INDEX IF NOT EXISTS idx_properties_nirf ON properties(nirf) WHERE nirf IS NOT NULL;

-- B) bank_accounts — registro 0050 do LCDPR
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  banco_codigo text NOT NULL,
  banco_nome text NOT NULL,
  agencia text NOT NULL,
  conta text NOT NULL,
  tipo text DEFAULT 'corrente' CHECK (tipo IN ('corrente','poupanca','rural')),
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE bank_accounts IS
  'Contas bancárias do produtor — mapeia registro 0050 do LCDPR.';

CREATE INDEX IF NOT EXISTS idx_bank_accounts_client ON bank_accounts(client_id) WHERE ativo = true;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_select ON bank_accounts;
CREATE POLICY bank_accounts_select ON bank_accounts
  FOR SELECT
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS bank_accounts_insert ON bank_accounts;
CREATE POLICY bank_accounts_insert ON bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS bank_accounts_update ON bank_accounts;
CREATE POLICY bank_accounts_update ON bank_accounts
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS bank_accounts_delete ON bank_accounts;
CREATE POLICY bank_accounts_delete ON bank_accounts
  FOR DELETE
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id());

-- C) cost_records: tipo LCDPR + número documento (registro Q100)
ALTER TABLE cost_records
  ADD COLUMN IF NOT EXISTS lcdpr_tipo text CHECK (lcdpr_tipo IN ('receita','despesa')),
  ADD COLUMN IF NOT EXISTS num_doc text;

COMMENT ON COLUMN cost_records.lcdpr_tipo IS
  'Classifica lançamento LCDPR (receita ou despesa). Padrão custo = despesa.';
COMMENT ON COLUMN cost_records.num_doc IS
  'Número do documento fiscal vinculado ao lançamento (NF, recibo, contrato).';

-- D) lcdpr_exports — histórico de gerações .txt
CREATE TABLE IF NOT EXISTS lcdpr_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ano_calendario integer NOT NULL,
  arquivo_txt text,
  total_receitas numeric(14,2),
  total_despesas numeric(14,2),
  qtd_lancamentos integer,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho','validado','transmitido')),
  gerado_em timestamptz DEFAULT now(),
  transmitido_em timestamptz
);

COMMENT ON TABLE lcdpr_exports IS
  'Histórico de gerações de LCDPR — guarda .txt + totais para auditoria.';

CREATE INDEX IF NOT EXISTS idx_lcdpr_exports_client_year ON lcdpr_exports(client_id, ano_calendario);

ALTER TABLE lcdpr_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lcdpr_exports_select ON lcdpr_exports;
CREATE POLICY lcdpr_exports_select ON lcdpr_exports
  FOR SELECT
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS lcdpr_exports_insert ON lcdpr_exports;
CREATE POLICY lcdpr_exports_insert ON lcdpr_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS lcdpr_exports_update ON lcdpr_exports;
CREATE POLICY lcdpr_exports_update ON lcdpr_exports
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS lcdpr_exports_delete ON lcdpr_exports;
CREATE POLICY lcdpr_exports_delete ON lcdpr_exports
  FOR DELETE
  TO authenticated
  USING (is_admin() OR client_id = get_my_client_id());
