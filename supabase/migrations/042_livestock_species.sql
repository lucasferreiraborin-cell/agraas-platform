-- Migration 042: Ovinos/Caprinos — livestock_species, pre_shipment_quarantine, livestock_score_config

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE livestock_species_enum AS ENUM ('bovino', 'ovino', 'caprino', 'ave');
CREATE TYPE livestock_sex_enum     AS ENUM ('Male', 'Female');
CREATE TYPE livestock_status_enum  AS ENUM ('active', 'sold', 'deceased', 'quarantine');
CREATE TYPE quarantine_status_enum AS ENUM ('em_quarentena', 'aprovado', 'reprovado');

-- ─── livestock_species ────────────────────────────────────────────────────────

CREATE TABLE livestock_species (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id     uuid          REFERENCES properties(id) ON DELETE SET NULL,
  species         livestock_species_enum NOT NULL,
  breed           text,
  birth_date      date,
  sex             livestock_sex_enum,
  weight_kg       numeric(8,2),
  status          livestock_status_enum NOT NULL DEFAULT 'active',
  internal_code   text,
  agraas_id       text          UNIQUE,
  rfid            text,
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_livestock_species_client ON livestock_species(client_id);
CREATE INDEX idx_livestock_species_property ON livestock_species(property_id);
CREATE INDEX idx_livestock_species_species ON livestock_species(species);

-- ─── pre_shipment_quarantine ──────────────────────────────────────────────────

CREATE TABLE pre_shipment_quarantine (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  animal_id       uuid          NOT NULL REFERENCES livestock_species(id) ON DELETE CASCADE,
  start_date      date          NOT NULL,
  end_date        date,
  veterinarian    text,
  status          quarantine_status_enum NOT NULL DEFAULT 'em_quarentena',
  observations    text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_quarantine_client ON pre_shipment_quarantine(client_id);
CREATE INDEX idx_quarantine_animal ON pre_shipment_quarantine(animal_id);

-- ─── livestock_score_config ───────────────────────────────────────────────────
-- Pesos configuráveis por espécie (soma deve ser 100)

CREATE TABLE livestock_score_config (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  species               livestock_species_enum NOT NULL UNIQUE,
  weight_sanidade       numeric(5,2) NOT NULL DEFAULT 30,
  weight_operacional    numeric(5,2) NOT NULL DEFAULT 20,
  weight_rastreabilidade numeric(5,2) NOT NULL DEFAULT 20,
  weight_produtivo      numeric(5,2) NOT NULL DEFAULT 20,
  weight_certificacoes  numeric(5,2) NOT NULL DEFAULT 10,
  notes                 text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Seed: pesos por espécie
INSERT INTO livestock_score_config (species, weight_sanidade, weight_operacional, weight_rastreabilidade, weight_produtivo, weight_certificacoes, notes) VALUES
  ('bovino',  30, 20, 20, 20, 10, 'Pesos padrão bovino — alinhado com score engine existente'),
  ('ovino',   35, 20, 15, 20, 10, 'Ovino: sanidade parasitária tem peso maior'),
  ('caprino', 35, 20, 15, 20, 10, 'Caprino: mesmo perfil do ovino'),
  ('ave',     25, 30, 15, 20, 10, 'Ave: operacional (conversão alimentar) tem peso maior');

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE livestock_species         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_shipment_quarantine   ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock_score_config    ENABLE ROW LEVEL SECURITY;

-- livestock_species
CREATE POLICY ls_select ON livestock_species FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ls_insert ON livestock_species FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ls_update ON livestock_species FOR UPDATE
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ls_delete ON livestock_species FOR DELETE
  USING (client_id = get_my_client_id() OR is_admin());

-- pre_shipment_quarantine
CREATE POLICY quar_select ON pre_shipment_quarantine FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY quar_insert ON pre_shipment_quarantine FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY quar_update ON pre_shipment_quarantine FOR UPDATE
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY quar_delete ON pre_shipment_quarantine FOR DELETE
  USING (client_id = get_my_client_id() OR is_admin());

-- livestock_score_config: leitura pública (configuração global), escrita só admin
CREATE POLICY lsc_select ON livestock_score_config FOR SELECT USING (true);
CREATE POLICY lsc_insert ON livestock_score_config FOR INSERT WITH CHECK (is_admin());
CREATE POLICY lsc_update ON livestock_score_config FOR UPDATE USING (is_admin());
CREATE POLICY lsc_delete ON livestock_score_config FOR DELETE USING (is_admin());
