-- =============================================================================
-- Migration 028 — Tabelas do Módulo Fiscal
-- =============================================================================

-- fiscal_notes
CREATE TABLE IF NOT EXISTS fiscal_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid REFERENCES clients(id) ON DELETE CASCADE,
  xml_content    text,
  numero_nota    text,
  serie          text,
  emitente_cnpj  text,
  emitente_nome  text,
  data_emissao   date,
  valor_total    numeric(14,2),
  status         text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','validada','erro')),
  created_at     timestamptz DEFAULT now()
);

-- fiscal_note_items
CREATE TABLE IF NOT EXISTS fiscal_note_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id        uuid REFERENCES fiscal_notes(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES clients(id) ON DELETE CASCADE,
  descricao      text,
  ncm            text,
  cfop           text,
  quantidade     numeric(12,4),
  unidade        text,
  valor_unitario numeric(14,4),
  valor_total    numeric(14,2),
  icms_aliquota  numeric(6,2),
  icms_valor     numeric(14,2),
  ipi_valor      numeric(14,2)
);

-- fiscal_alerts
CREATE TABLE IF NOT EXISTS fiscal_alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid REFERENCES fiscal_notes(id) ON DELETE CASCADE,
  client_id  uuid REFERENCES clients(id) ON DELETE CASCADE,
  tipo       text NOT NULL,
  descricao  text NOT NULL,
  severidade text NOT NULL DEFAULT 'aviso' CHECK (severidade IN ('info','aviso','critico')),
  resolvido  boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE fiscal_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_alerts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_notes_select"      ON fiscal_notes      FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_notes_insert"      ON fiscal_notes      FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_notes_update"      ON fiscal_notes      FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_items_select"      ON fiscal_note_items FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_items_insert"      ON fiscal_note_items FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_alerts_select"     ON fiscal_alerts     FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_alerts_insert"     ON fiscal_alerts     FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "fiscal_alerts_update"     ON fiscal_alerts     FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
