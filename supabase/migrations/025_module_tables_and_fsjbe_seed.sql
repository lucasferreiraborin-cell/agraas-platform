-- =============================================================================
-- Migration 025 — Tabelas dos módulos + Seed FSJBE (fsjdbe@gmail.com)
-- =============================================================================

-- ─── REPRODUTIVO ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reproductive_seasons (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid REFERENCES clients(id) ON DELETE CASCADE,
  property_id             uuid REFERENCES properties(id) ON DELETE SET NULL,
  season_start            date NOT NULL,
  season_end              date NOT NULL,
  females_inseminated     int,
  total_inseminations     int,
  apt_count               int,
  to_inseminate           int,
  pregnancy_rate          numeric(6,2),
  avg_conception_rate     numeric(6,2),
  -- Partos
  births_performed        int,
  born_alive              int,
  pregnancy_losses        int,
  gestant_deaths          int,
  -- Desmame
  total_weaned            int,
  males_qty               int,
  males_avg_weight        numeric(7,2),
  males_gpd               numeric(6,3),
  females_qty             int,
  females_avg_weight      numeric(7,2),
  females_gpd             numeric(6,3),
  avg_weaning_weight      numeric(7,2),
  avg_gpd                 numeric(6,3),
  avg_weaning_age_days    int,
  deaths_maternity        int,
  -- Dias perdidos
  lost_vacas_descanso2    int,
  lost_days_descanso2     int,
  lost_vacas_descanso203  int,
  lost_days_descanso203   int,
  lost_vacas_dg687        int,
  lost_days_dg687         int,
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reproductive_ia_services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id        uuid REFERENCES reproductive_seasons(id) ON DELETE CASCADE,
  client_id        uuid REFERENCES clients(id) ON DELETE CASCADE,
  service_number   int NOT NULL,
  inseminated      int,
  diagnosed        int,
  pregnant         int,
  conception_rate  numeric(6,2)
);

CREATE TABLE IF NOT EXISTS reproductive_stock_summary (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    uuid REFERENCES reproductive_seasons(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  category     text NOT NULL,
  total        int,
  pregnant     int,
  served       int,
  empty        int
);

ALTER TABLE reproductive_seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reproductive_ia_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reproductive_stock_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repro_seasons_select"       ON reproductive_seasons       FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "repro_ia_services_select"   ON reproductive_ia_services   FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "repro_stock_select"         ON reproductive_stock_summary FOR SELECT USING (is_admin() OR client_id = get_my_client_id());

-- ─── PRODUÇÃO ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_stock_snapshot (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  category      text NOT NULL,
  initial       int DEFAULT 0,
  entries       int DEFAULT 0,
  exits         int DEFAULT 0,
  deaths        int DEFAULT 0,
  balance       int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_weight_distribution (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  range_label   text NOT NULL,
  range_order   int NOT NULL,
  count         int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_sales_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  sale_date    date NOT NULL,
  sex          text NOT NULL,
  head_count   int,
  avg_weight_kg numeric(7,2)
);

CREATE TABLE IF NOT EXISTS production_calf_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid REFERENCES clients(id) ON DELETE CASCADE,
  year             int NOT NULL,
  month            int NOT NULL,
  births           int DEFAULT 0,
  purchases        int DEFAULT 0,
  avg_weight_male  numeric(7,2),
  avg_weight_female numeric(7,2)
);

CREATE TABLE IF NOT EXISTS production_mortality (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE,
  age_range   text NOT NULL,
  age_order   int NOT NULL,
  deaths      int DEFAULT 0
);

ALTER TABLE production_stock_snapshot       ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_weight_distribution  ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_sales_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_calf_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_mortality            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_stock_select"    ON production_stock_snapshot      FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "prod_weight_select"   ON production_weight_distribution  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "prod_sales_select"    ON production_sales_history        FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "prod_calves_select"   ON production_calf_entries         FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "prod_mort_select"     ON production_mortality            FOR SELECT USING (is_admin() OR client_id = get_my_client_id());

-- ─── INSUMOS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supply_financials (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid REFERENCES clients(id) ON DELETE CASCADE,
  period_label         text NOT NULL,
  initial_stock_value  numeric(12,2),
  purchases_value      numeric(12,2),
  consumption_value    numeric(12,2),
  balance_value        numeric(12,2)
);

CREATE TABLE IF NOT EXISTS supply_inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  product_name    text NOT NULL,
  category        text NOT NULL,
  dose_per_animal numeric(8,3),
  unit            text,
  head_count      int
);

ALTER TABLE supply_financials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_fin_select"   ON supply_financials      FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY "supply_items_select" ON supply_inventory_items FOR SELECT USING (is_admin() OR client_id = get_my_client_id());

-- ─── AUDITORIA ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_snapshot (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date           date NOT NULL,
  inventoried_in          int DEFAULT 0,
  inventoried_out         int DEFAULT 0,
  movements_in            int DEFAULT 0,
  movements_out           int DEFAULT 0,
  not_inventoried_in      int DEFAULT 0,
  not_inventoried_out     int DEFAULT 0,
  total_present_in        int DEFAULT 0,
  total_present_out       int DEFAULT 0,
  total_stock_in          int DEFAULT 0,
  total_stock_out         int DEFAULT 0,
  duplicates              int DEFAULT 0,
  adjustments_inserted    int DEFAULT 0,
  exits_as_adjustment     int DEFAULT 0
);

ALTER TABLE audit_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON audit_snapshot FOR SELECT USING (is_admin() OR client_id = get_my_client_id());

-- =============================================================================
-- SEED FSJBE
-- =============================================================================

DO $$
DECLARE
  fsjbe_client_id uuid;
  fsjbe_prop_id   uuid := '00000000-0000-0002-0003-000000000001';
  season_id       uuid;
BEGIN

  SELECT id INTO fsjbe_client_id FROM clients WHERE email = 'fsjdbe@gmail.com';
  IF fsjbe_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente FSJBE não encontrado';
  END IF;

  -- ── Estação de monta ──────────────────────────────────────────────────────
  INSERT INTO reproductive_seasons (
    client_id, property_id,
    season_start, season_end,
    females_inseminated, total_inseminations,
    apt_count, to_inseminate,
    pregnancy_rate, avg_conception_rate,
    births_performed, born_alive, pregnancy_losses, gestant_deaths,
    total_weaned,
    males_qty, males_avg_weight, males_gpd,
    females_qty, females_avg_weight, females_gpd,
    avg_weaning_weight, avg_gpd, avg_weaning_age_days, deaths_maternity,
    lost_vacas_descanso2, lost_days_descanso2,
    lost_vacas_descanso203, lost_days_descanso203,
    lost_vacas_dg687, lost_days_dg687
  ) VALUES (
    fsjbe_client_id, fsjbe_prop_id,
    '2025-10-13', '2026-04-30',
    727, 995,
    708, 71,
    74.93, 57.52,
    805, 814, 48, 3,
    766,
    379, 241, 0.894,
    387, 219, 0.810,
    230, 0.851, 232, 34,
    2, 264,
    203, 22,
    687, 5
  )
  RETURNING id INTO season_id;

  -- ── Serviços de IA ────────────────────────────────────────────────────────
  INSERT INTO reproductive_ia_services (season_id, client_id, service_number, inseminated, diagnosed, pregnant, conception_rate)
  VALUES
    (season_id, fsjbe_client_id, 1, 727, 674, 403, 59.79),
    (season_id, fsjbe_client_id, 2, 219, 158,  80, 50.63),
    (season_id, fsjbe_client_id, 3,  49,  41,  22, 53.66);

  -- ── Estoque reprodutores ──────────────────────────────────────────────────
  INSERT INTO reproductive_stock_summary (season_id, client_id, category, total, pregnant, served, empty)
  VALUES
    (season_id, fsjbe_client_id, 'Novilha',     75,   0, 31,  40),
    (season_id, fsjbe_client_id, 'Primípara',  146,  71, 50,  25),
    (season_id, fsjbe_client_id, 'Secundípara',120,  64, 45,  11),
    (season_id, fsjbe_client_id, 'Multípara',  504, 207,224,  73),
    (season_id, fsjbe_client_id, 'Total',      845, 346,350, 149);

  -- ── Estoque animal ────────────────────────────────────────────────────────
  INSERT INTO production_stock_snapshot (client_id, snapshot_date, category, initial, entries, exits, deaths, balance)
  VALUES
    (fsjbe_client_id, CURRENT_DATE, 'Total', 1505, 0, 6, 3, 1496);

  -- ── Distribuição por faixa de peso ───────────────────────────────────────
  INSERT INTO production_weight_distribution (client_id, snapshot_date, range_label, range_order, count)
  VALUES
    (fsjbe_client_id, CURRENT_DATE, 'Até 180 kg',     1, 467),
    (fsjbe_client_id, CURRENT_DATE, '180–270 kg',     2, 284),
    (fsjbe_client_id, CURRENT_DATE, '270–360 kg',     3, 264),
    (fsjbe_client_id, CURRENT_DATE, '360–450 kg',     4, 263),
    (fsjbe_client_id, CURRENT_DATE, '450–540 kg',     5, 429),
    (fsjbe_client_id, CURRENT_DATE, 'Acima de 540 kg',6, 460);

  -- ── Vendas históricas ─────────────────────────────────────────────────────
  INSERT INTO production_sales_history (client_id, sale_date, sex, head_count, avg_weight_kg)
  VALUES
    (fsjbe_client_id, '2024-08-01', 'M', 23,  637),
    (fsjbe_client_id, '2024-10-01', 'M', 130, 242),
    (fsjbe_client_id, '2024-10-01', 'F', 2,   225),
    (fsjbe_client_id, '2024-07-01', 'M', 112, 266),
    (fsjbe_client_id, '2024-07-01', 'F', 27,  537);

  -- ── Entradas mensais de bezerros (ago–nov/2024, 447 total) ───────────────
  INSERT INTO production_calf_entries (client_id, year, month, births, purchases, avg_weight_male, avg_weight_female)
  VALUES
    (fsjbe_client_id, 2024, 8,  112, 0, 35.13, 30.23),
    (fsjbe_client_id, 2024, 9,  112, 0, 35.13, 30.23),
    (fsjbe_client_id, 2024, 10, 112, 0, 35.13, 30.23),
    (fsjbe_client_id, 2024, 11, 111, 0, 35.13, 30.23);

  -- ── Mortalidade por faixa etária ─────────────────────────────────────────
  INSERT INTO production_mortality (client_id, age_range, age_order, deaths)
  VALUES
    (fsjbe_client_id, '0–4 meses',   1,  2),
    (fsjbe_client_id, '5–12 meses',  2,  3),
    (fsjbe_client_id, '13–24 meses', 3,  1),
    (fsjbe_client_id, '25–36 meses', 4,  3),
    (fsjbe_client_id, '+36 meses',   5, 12);

  -- ── Posição financeira insumos ────────────────────────────────────────────
  INSERT INTO supply_financials (client_id, period_label, initial_stock_value, purchases_value, consumption_value, balance_value)
  VALUES (fsjbe_client_id, 'Estação 2025/2026', 8440.00, 61579.72, 45295.01, 24724.71);

  -- ── Itens de estoque ──────────────────────────────────────────────────────
  INSERT INTO supply_inventory_items (client_id, product_name, category, dose_per_animal, unit, head_count)
  VALUES
    (fsjbe_client_id, 'Anti Aftosa',    'Vacinas/Vermífugos',      1.01, 'DS',  180),
    (fsjbe_client_id, 'Dectomax',       'Tratamentos/Hormônios',   4.10, 'mL',  180),
    (fsjbe_client_id, 'Bimectin 1%',    'Tratamentos/Hormônios',   6.58, 'mL',  161),
    (fsjbe_client_id, 'Rai-Vet Biovet', 'Vacinas/Vermífugos',      1.01, 'DS',  180),
    (fsjbe_client_id, 'Abor Vac',       'Vacinas/Vermífugos',      1.00, 'DS',   23),
    (fsjbe_client_id, 'Fortress 7',     'Vacinas/Vermífugos',      1.00, 'DS',   23),
    (fsjbe_client_id, 'Master LP 4%',   'Nutricionais',            3.78, 'mL',   23);

  -- ── Auditoria ─────────────────────────────────────────────────────────────
  INSERT INTO audit_snapshot (
    client_id, snapshot_date,
    inventoried_in, inventoried_out,
    movements_in, movements_out,
    not_inventoried_in, not_inventoried_out,
    total_present_in, total_present_out,
    total_stock_in, total_stock_out,
    duplicates, adjustments_inserted, exits_as_adjustment
  ) VALUES (
    fsjbe_client_id, CURRENT_DATE,
    2032, 1976,
    178, 177,
    226, 228,
    2210, 2153,
    2436, 2381,
    0, 70, 262
  );

END $$;
