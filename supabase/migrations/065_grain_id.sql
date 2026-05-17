-- Migration 065: Grain ID completo
-- crop_quality_reports + documentos de embarque (BL + cert fitossanitário)

-- ── Novos campos em crop_shipments ────────────────────────────────────────────
ALTER TABLE crop_shipments
  ADD COLUMN IF NOT EXISTS bill_of_lading        text,
  ADD COLUMN IF NOT EXISTS phytosanitary_cert    text,
  ADD COLUMN IF NOT EXISTS phytosanitary_cert_date date;

-- ── Tabela de laudos de qualidade ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crop_quality_reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  shipment_id      uuid        NOT NULL REFERENCES crop_shipments(id) ON DELETE CASCADE,
  humidity_pct     numeric(5,2),
  protein_pct      numeric(5,2),
  mycotoxin_ppb    numeric(8,2),
  impurity_pct     numeric(5,2),
  classification   text,
  lab_name         text,
  report_date      date,
  report_number    text,
  document_source  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cqr_shipment  ON crop_quality_reports(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cqr_client    ON crop_quality_reports(client_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE crop_quality_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crop_quality_reports_select" ON crop_quality_reports
  FOR SELECT USING (client_id = get_my_client_id());

CREATE POLICY "crop_quality_reports_insert" ON crop_quality_reports
  FOR INSERT WITH CHECK (client_id = get_my_client_id());

CREATE POLICY "crop_quality_reports_update" ON crop_quality_reports
  FOR UPDATE USING (client_id = get_my_client_id());

CREATE POLICY "crop_quality_reports_delete" ON crop_quality_reports
  FOR DELETE USING (client_id = get_my_client_id());

-- ── Seed: laudo demo AGR-SOJ-2026-001 ────────────────────────────────────────
DO $$
DECLARE
  v_client_id  uuid;
  v_shipment_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM clients WHERE email = 'lucas@agraas.com.br' LIMIT 1;
  IF v_client_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_shipment_id
  FROM crop_shipments
  WHERE client_id = v_client_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_shipment_id IS NULL THEN RETURN; END IF;

  -- Documentos de embarque
  UPDATE crop_shipments SET
    bill_of_lading         = 'BL-2026-SANTOS-001',
    phytosanitary_cert     = 'MAPA-2026-001',
    phytosanitary_cert_date = '2026-03-15'
  WHERE id = v_shipment_id;

  -- Laudo de qualidade
  INSERT INTO crop_quality_reports
    (client_id, shipment_id, humidity_pct, protein_pct, mycotoxin_ppb,
     impurity_pct, classification, lab_name, report_date, report_number)
  VALUES
    (v_client_id, v_shipment_id, 13.2, 38.5, 8.0,
     0.3, 'Premium', 'Lactea Análises Ltda', '2026-03-20', 'LAQ-2026-001')
  ON CONFLICT DO NOTHING;
END $$;
