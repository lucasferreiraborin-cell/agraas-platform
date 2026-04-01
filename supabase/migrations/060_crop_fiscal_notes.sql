-- Migration 060: Tabelas NF-e agrícola — crop_fiscal_notes + crop_fiscal_note_items

CREATE TABLE crop_fiscal_notes (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  farm_id        uuid          REFERENCES farms_agriculture(id) ON DELETE SET NULL,
  xml_content    text,
  numero_nota    text,
  emitente_cnpj  text,
  emitente_nome  text,
  data_emissao   date,
  valor_total    numeric(14,2),
  status         text          NOT NULL DEFAULT 'pendente',
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfn_client  ON crop_fiscal_notes(client_id);
CREATE INDEX idx_cfn_farm    ON crop_fiscal_notes(farm_id);
CREATE INDEX idx_cfn_status  ON crop_fiscal_notes(status);

ALTER TABLE crop_fiscal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cfn_select ON crop_fiscal_notes FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfn_insert ON crop_fiscal_notes FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfn_update ON crop_fiscal_notes FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfn_delete ON crop_fiscal_notes FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

CREATE TABLE crop_fiscal_note_items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id        uuid          NOT NULL REFERENCES crop_fiscal_notes(id) ON DELETE CASCADE,
  client_id      uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  descricao      text,
  ncm            text,
  cfop           text,
  quantidade     numeric(14,4),
  unidade        text,
  valor_unitario numeric(14,4),
  valor_total    numeric(14,2),
  icms_aliquota  numeric(6,2),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfni_note   ON crop_fiscal_note_items(note_id);
CREATE INDEX idx_cfni_client ON crop_fiscal_note_items(client_id);

ALTER TABLE crop_fiscal_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cfni_select ON crop_fiscal_note_items FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfni_insert ON crop_fiscal_note_items FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfni_update ON crop_fiscal_note_items FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfni_delete ON crop_fiscal_note_items FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

DO $$ BEGIN
  RAISE NOTICE 'Migration 060 OK — crop_fiscal_notes + crop_fiscal_note_items criadas com RLS';
END $$;
