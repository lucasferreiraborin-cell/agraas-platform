-- Migration 077: Venda vinculada a compradores + ROI + passaporte

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ALTER sales — novos campos
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_id            uuid REFERENCES buyers(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS price_per_kg        numeric(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_at_sale        numeric(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS roi                 numeric(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS fiscal_note_id      uuid REFERENCES fiscal_notes(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS agraas_passport_url text;

CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales(buyer_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Seed FSJBE: 1 venda demo de BER-003 (Touro Cândido, 620kg)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_client  uuid := '00000000-0000-0000-0003-000000000001';
  v_animal  uuid := '00000000-0000-0003-0003-000000000003'; -- BER-003
  v_buyer   uuid;
  v_agraas  text;
BEGIN
  SELECT id INTO v_buyer FROM buyers WHERE client_id = v_client AND name = 'Frigoboi Goiás' LIMIT 1;
  SELECT agraas_id INTO v_agraas FROM animals WHERE id = v_animal;

  SET LOCAL session_replication_role = 'replica';

  INSERT INTO sales (
    animal_id, client_id, buyer_id, buyer_name, sale_date,
    weight_kg, price_per_kg, price_per_arroba, total_value,
    cost_at_sale, roi, agraas_passport_url
  ) VALUES (
    v_animal, v_client, v_buyer, 'Frigoboi Goiás', '2026-04-05',
    620, 12.00, 360.00, 7440.00,
    800.00, 6640.00,
    'https://agraas-platform.vercel.app/passaporte/' || v_agraas
  );

  SET LOCAL session_replication_role = DEFAULT;
END $$;
