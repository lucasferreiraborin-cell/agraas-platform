-- Migration 072: Suppliers + Products enhancements + Stock client isolation

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Tabela suppliers
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE supplier_category_enum AS ENUM (
  'insumo', 'vacina', 'medicamento', 'racao', 'fertilizante', 'semente', 'equipamento', 'outro'
);

CREATE TABLE IF NOT EXISTS suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES clients(id),
  name         text NOT NULL,
  cnpj         text,
  contact_name text,
  contact_phone text,
  contact_email text,
  category     supplier_category_enum NOT NULL DEFAULT 'outro',
  notes        text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_client ON suppliers(client_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY suppliers_insert ON suppliers FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY suppliers_update ON suppliers FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY suppliers_delete ON suppliers FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. ALTER products — add client isolation + supplier link
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS client_id    uuid REFERENCES clients(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id  uuid REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS ncm          text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active       boolean NOT NULL DEFAULT true;

-- unit and category may already exist, add IF NOT EXISTS
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit     text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_products_client_cat ON products(client_id, category);
CREATE INDEX IF NOT EXISTS idx_products_supplier   ON products(supplier_id);

-- Enable RLS on products (was global before)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_select ON products;
DROP POLICY IF EXISTS products_insert ON products;
DROP POLICY IF EXISTS products_update ON products;
DROP POLICY IF EXISTS products_delete ON products;
CREATE POLICY products_select ON products FOR SELECT USING (client_id IS NULL OR is_admin() OR client_id = get_my_client_id());
CREATE POLICY products_insert ON products FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY products_update ON products FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY products_delete ON products FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ALTER stock_batches — add client isolation + supplier link
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS client_id   uuid REFERENCES clients(id);
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_stock_batches_client ON stock_batches(client_id);

ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_batches_select ON stock_batches;
DROP POLICY IF EXISTS stock_batches_insert ON stock_batches;
DROP POLICY IF EXISTS stock_batches_update ON stock_batches;
DROP POLICY IF EXISTS stock_batches_delete ON stock_batches;
CREATE POLICY stock_batches_select ON stock_batches FOR SELECT USING (client_id IS NULL OR is_admin() OR client_id = get_my_client_id());
CREATE POLICY stock_batches_insert ON stock_batches FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY stock_batches_update ON stock_batches FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY stock_batches_delete ON stock_batches FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Backfill existing products + stock_batches to Lucas
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE products SET client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9' WHERE client_id IS NULL;
UPDATE stock_batches SET client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9' WHERE client_id IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Seed FSJBE: 3 fornecedores + 5 produtos
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_client uuid := '00000000-0000-0000-0003-000000000001';
  v_ourofino uuid;
  v_zoetis   uuid;
  v_elanco   uuid;
BEGIN
  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category) VALUES
    (v_client, 'Ourofino Saúde Animal', '28.460.342/0001-06', 'Representante GO', 'vacina')
  RETURNING id INTO v_ourofino;

  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category) VALUES
    (v_client, 'Zoetis', '54.735.650/0001-44', 'Representante Regional', 'medicamento')
  RETURNING id INTO v_zoetis;

  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category) VALUES
    (v_client, 'Elanco', '63.049.562/0001-50', 'Representante SP', 'medicamento')
  RETURNING id INTO v_elanco;

  INSERT INTO products (client_id, supplier_id, name, unit, category, withdrawal_days) VALUES
    (v_client, v_ourofino, 'Vacina Aftosa',        'ml',   'vacina',          0),
    (v_client, v_ourofino, 'Vacina Brucelose B19',  'ml',   'vacina',          0),
    (v_client, v_zoetis,   'Dectomax',              'ml',   'antiparasitario', 33),
    (v_client, v_elanco,   'Ivermectina 1%',        'ml',   'vermifugo',       30),
    (v_client, v_elanco,   'Bimectin',              'ml',   'vermifugo',       30);
END $$;
