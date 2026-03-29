-- ============================================================
-- Migration 037: Evolui tabelas sales e slaughter_records
--   para esquema tipado com client_id, campos fiscais e
--   coluna gerada yield_pct.
--
-- Ambas as tabelas já existem no banco com schema parcial;
-- usamos ADD COLUMN IF NOT EXISTS para ser idempotente.
-- ============================================================

-- ─── sales: adiciona colunas faltantes ───────────────────────
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS client_id            uuid REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS buyer_document       text,
  ADD COLUMN IF NOT EXISTS nfe_key              text,
  ADD COLUMN IF NOT EXISTS gta_number           text,
  ADD COLUMN IF NOT EXISTS destination_property text,
  ADD COLUMN IF NOT EXISTS weight_kg            numeric(8,2),
  ADD COLUMN IF NOT EXISTS price_per_arroba     numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_value          numeric(12,2),
  ADD COLUMN IF NOT EXISTS notes                text;

-- Backfill client_id a partir do animal dono do registro
UPDATE sales s
SET    client_id = a.client_id
FROM   animals a
WHERE  a.id = s.animal_id
  AND  s.client_id IS NULL;

-- ─── slaughter_records: adiciona colunas faltantes ───────────
ALTER TABLE slaughter_records
  ADD COLUMN IF NOT EXISTS client_id        uuid REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slaughterhouse   text,
  ADD COLUMN IF NOT EXISTS live_weight_kg   numeric(8,2),
  ADD COLUMN IF NOT EXISTS carcass_weight_kg numeric(8,2),
  ADD COLUMN IF NOT EXISTS price_per_kg     numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_value      numeric(12,2),
  ADD COLUMN IF NOT EXISTS notes            text;

-- Backfill client_id
UPDATE slaughter_records sr
SET    client_id = a.client_id
FROM   animals a
WHERE  a.id = sr.animal_id
  AND  sr.client_id IS NULL;

-- Coluna gerada yield_pct (requer live_weight_kg e carcass_weight_kg já existentes)
ALTER TABLE slaughter_records
  ADD COLUMN IF NOT EXISTS yield_pct numeric(5,2) GENERATED ALWAYS AS (
    ROUND((carcass_weight_kg / NULLIF(live_weight_kg, 0)) * 100, 2)
  ) STORED;

-- ─── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_animal_id    ON sales(animal_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id    ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date    ON sales(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_slaughter_animal_id ON slaughter_records(animal_id);
CREATE INDEX IF NOT EXISTS idx_slaughter_client_id ON slaughter_records(client_id);
CREATE INDEX IF NOT EXISTS idx_slaughter_date      ON slaughter_records(slaughter_date DESC);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE slaughter_records ENABLE ROW LEVEL SECURITY;

-- sales — drop antes de recriar para ser idempotente
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;

CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (client_id = get_my_client_id());

CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (client_id = get_my_client_id());

CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (client_id = get_my_client_id());

CREATE POLICY "sales_delete" ON sales
  FOR DELETE USING (client_id = get_my_client_id());

-- slaughter_records
DROP POLICY IF EXISTS "slaughter_select" ON slaughter_records;
DROP POLICY IF EXISTS "slaughter_insert" ON slaughter_records;
DROP POLICY IF EXISTS "slaughter_update" ON slaughter_records;
DROP POLICY IF EXISTS "slaughter_delete" ON slaughter_records;

CREATE POLICY "slaughter_select" ON slaughter_records
  FOR SELECT USING (client_id = get_my_client_id());

CREATE POLICY "slaughter_insert" ON slaughter_records
  FOR INSERT WITH CHECK (client_id = get_my_client_id());

CREATE POLICY "slaughter_update" ON slaughter_records
  FOR UPDATE USING (client_id = get_my_client_id());

CREATE POLICY "slaughter_delete" ON slaughter_records
  FOR DELETE USING (client_id = get_my_client_id());

-- ─── Migração de dados de events → sales ─────────────────────
DO $$
DECLARE
  rec  record;
  j    jsonb;
  ok   int := 0;
BEGIN
  FOR rec IN
    SELECT e.animal_id, e.event_date, e.notes, a.client_id
    FROM   events e
    JOIN   animals a ON a.id = e.animal_id
    WHERE  e.event_type = 'sale'
      AND  e.animal_id IS NOT NULL
  LOOP
    BEGIN j := rec.notes::jsonb; EXCEPTION WHEN OTHERS THEN j := NULL; END;

    INSERT INTO sales (
      client_id, animal_id, sale_date,
      buyer_name, buyer_document, nfe_key, gta_number, destination_property,
      weight_kg, price_per_arroba, total_value, notes
    ) VALUES (
      rec.client_id,
      rec.animal_id,
      COALESCE((j->>'sale_date')::date, rec.event_date::date, CURRENT_DATE),
      j->>'buyer_name',
      j->>'buyer_document',
      j->>'nfe_key',
      j->>'gta_number',
      j->>'destination_property',
      (j->>'weight_kg')::numeric,
      (j->>'price_per_arroba')::numeric,
      (j->>'total_value')::numeric,
      CASE WHEN j IS NULL THEN rec.notes ELSE j->>'notes' END
    )
    ON CONFLICT DO NOTHING;

    ok := ok + 1;
  END LOOP;

  RAISE NOTICE '[migration-037] sales migradas de events: % registros', ok;
END;
$$;

DO $$
DECLARE
  rec  record;
  j    jsonb;
  ok   int := 0;
BEGIN
  FOR rec IN
    SELECT e.animal_id, e.event_date, e.notes, a.client_id
    FROM   events e
    JOIN   animals a ON a.id = e.animal_id
    WHERE  e.event_type = 'slaughter'
      AND  e.animal_id IS NOT NULL
  LOOP
    BEGIN j := rec.notes::jsonb; EXCEPTION WHEN OTHERS THEN j := NULL; END;

    INSERT INTO slaughter_records (
      client_id, animal_id, slaughter_date,
      slaughterhouse, live_weight_kg, carcass_weight_kg,
      price_per_kg, total_value, notes
    ) VALUES (
      rec.client_id,
      rec.animal_id,
      COALESCE((j->>'slaughter_date')::date, rec.event_date::date, CURRENT_DATE),
      j->>'slaughterhouse',
      (j->>'live_weight_kg')::numeric,
      (j->>'carcass_weight_kg')::numeric,
      (j->>'price_per_kg')::numeric,
      (j->>'total_value')::numeric,
      CASE WHEN j IS NULL THEN rec.notes ELSE j->>'notes' END
    )
    ON CONFLICT DO NOTHING;

    ok := ok + 1;
  END LOOP;

  RAISE NOTICE '[migration-037] slaughter_records migrados de events: % registros', ok;
END;
$$;
