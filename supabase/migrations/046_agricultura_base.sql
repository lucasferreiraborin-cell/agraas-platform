-- Migration 046: Módulo Agricultura — estrutura base (7 tabelas + enums + RLS)

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE crop_culture_enum          AS ENUM ('soja','milho','trigo','acucar','cafe');
CREATE TYPE crop_field_status_enum     AS ENUM ('planejado','plantado','em_desenvolvimento','colhido','em_repouso');
CREATE TYPE crop_input_type_enum       AS ENUM ('semente','fertilizante','defensivo','combustivel');
CREATE TYPE crop_storage_type_enum     AS ENUM ('proprio','terceiro','cooperativa','porto');
CREATE TYPE crop_movement_type_enum    AS ENUM ('entrada','saida','transferencia');
CREATE TYPE crop_shipment_status_enum  AS ENUM ('planejado','carregando','embarcado','em_transito','entregue');
CREATE TYPE crop_stage_enum            AS ENUM ('fazenda','armazem','transportadora','porto_origem','navio','porto_destino','entregue');

-- ─── farms_agriculture ────────────────────────────────────────────────────────

CREATE TABLE farms_agriculture (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  cnpj           text,
  state          text        NOT NULL,
  city           text,
  lat            numeric(10,6),
  lng            numeric(10,6),
  total_area_ha  numeric(12,2),
  car_number     text,
  status         text        NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_farms_agri_client ON farms_agriculture(client_id);
CREATE INDEX idx_farms_agri_state  ON farms_agriculture(state);

-- ─── crop_storage ─────────────────────────────────────────────────────────────

CREATE TABLE crop_storage (
  id                 uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid                   NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name               text                   NOT NULL,
  cnpj               text,
  type               crop_storage_type_enum NOT NULL DEFAULT 'proprio',
  state              text,
  city               text,
  lat                numeric(10,6),
  lng                numeric(10,6),
  capacity_tons      numeric(12,3),
  mapa_registration  text,
  status             text                   NOT NULL DEFAULT 'active',
  created_at         timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_storage_client ON crop_storage(client_id);
CREATE INDEX idx_crop_storage_state  ON crop_storage(state);

-- ─── crop_fields ──────────────────────────────────────────────────────────────

CREATE TABLE crop_fields (
  id                     uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid                    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  farm_id                uuid                    NOT NULL REFERENCES farms_agriculture(id) ON DELETE CASCADE,
  field_code             text                    NOT NULL,
  field_name             text,
  area_ha                numeric(10,2),
  culture                crop_culture_enum       NOT NULL,
  crop_season            text,
  planting_date          date,
  expected_harvest_date  date,
  status                 crop_field_status_enum  NOT NULL DEFAULT 'planejado',
  polygon_coordinates    jsonb,
  created_at             timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_fields_client  ON crop_fields(client_id);
CREATE INDEX idx_crop_fields_farm    ON crop_fields(farm_id);
CREATE INDEX idx_crop_fields_culture ON crop_fields(culture);
CREATE INDEX idx_crop_fields_status  ON crop_fields(status);

-- ─── crop_inputs ──────────────────────────────────────────────────────────────

CREATE TABLE crop_inputs (
  id               uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid                   NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_id         uuid                   NOT NULL REFERENCES crop_fields(id) ON DELETE CASCADE,
  input_type       crop_input_type_enum   NOT NULL,
  product_name     text                   NOT NULL,
  ncm              text,
  manufacturer     text,
  quantity         numeric(12,3)          NOT NULL,
  unit             text                   NOT NULL DEFAULT 'kg',
  unit_cost        numeric(12,4),
  total_cost       numeric(14,2),
  application_date date,
  operator         text,
  nfe_key          text,
  withdrawal_days  integer,
  withdrawal_date  date,
  notes            text,
  created_at       timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_inputs_client   ON crop_inputs(client_id);
CREATE INDEX idx_crop_inputs_field    ON crop_inputs(field_id);
CREATE INDEX idx_crop_inputs_type     ON crop_inputs(input_type);
CREATE INDEX idx_crop_inputs_nfe      ON crop_inputs(nfe_key);

-- ─── crop_shipments ───────────────────────────────────────────────────────────

CREATE TABLE crop_shipments (
  id                  uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid                      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_id            uuid                      REFERENCES crop_fields(id) ON DELETE SET NULL,
  storage_id          uuid                      REFERENCES crop_storage(id) ON DELETE SET NULL,
  destination_country text,
  destination_port    text,
  origin_port         text,
  vessel_name         text,
  departure_date      date,
  arrival_date        date,
  quantity_tons       numeric(12,3)             NOT NULL,
  culture             crop_culture_enum         NOT NULL,
  status              crop_shipment_status_enum NOT NULL DEFAULT 'planejado',
  contract_number     text,
  created_at          timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_shipments_client  ON crop_shipments(client_id);
CREATE INDEX idx_crop_shipments_status  ON crop_shipments(status);
CREATE INDEX idx_crop_shipments_dep     ON crop_shipments(departure_date);

-- ─── crop_storage_movements ───────────────────────────────────────────────────

CREATE TABLE crop_storage_movements (
  id              uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid                     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_id        uuid                     REFERENCES crop_fields(id) ON DELETE SET NULL,
  storage_id      uuid                     NOT NULL REFERENCES crop_storage(id) ON DELETE CASCADE,
  movement_type   crop_movement_type_enum  NOT NULL,
  quantity_tons   numeric(12,3)            NOT NULL,
  humidity_pct    numeric(5,2),
  impurity_pct    numeric(5,2),
  classification  text,
  nfe_key         text,
  responsible     text,
  movement_date   date                     NOT NULL DEFAULT CURRENT_DATE,
  notes           text,
  created_at      timestamptz              NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_movements_client  ON crop_storage_movements(client_id);
CREATE INDEX idx_crop_movements_field   ON crop_storage_movements(field_id);
CREATE INDEX idx_crop_movements_storage ON crop_storage_movements(storage_id);
CREATE INDEX idx_crop_movements_date    ON crop_storage_movements(movement_date);

-- ─── crop_shipment_tracking ───────────────────────────────────────────────────

CREATE TABLE crop_shipment_tracking (
  id                       uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id              uuid             NOT NULL REFERENCES crop_shipments(id) ON DELETE CASCADE,
  client_id                uuid             NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage                    crop_stage_enum  NOT NULL,
  stage_date               timestamptz      NOT NULL DEFAULT now(),
  quantity_confirmed_tons  numeric(12,3),
  quantity_lost_tons       numeric(12,3)    NOT NULL DEFAULT 0,
  loss_cause               text,
  location_name            text,
  location_lat             numeric(10,6),
  location_lng             numeric(10,6),
  responsible_name         text,
  notes                    text,
  created_at               timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_tracking_shipment ON crop_shipment_tracking(shipment_id);
CREATE INDEX idx_crop_tracking_client   ON crop_shipment_tracking(client_id);
CREATE INDEX idx_crop_tracking_stage    ON crop_shipment_tracking(stage);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE farms_agriculture       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_fields             ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_inputs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_storage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_storage_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_shipments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_shipment_tracking  ENABLE ROW LEVEL SECURITY;

-- farms_agriculture
CREATE POLICY fa_sel ON farms_agriculture FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fa_ins ON farms_agriculture FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fa_upd ON farms_agriculture FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fa_del ON farms_agriculture FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_fields
CREATE POLICY cf_sel ON crop_fields FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cf_ins ON crop_fields FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cf_upd ON crop_fields FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cf_del ON crop_fields FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_inputs
CREATE POLICY ci_sel ON crop_inputs FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ci_ins ON crop_inputs FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ci_upd ON crop_inputs FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ci_del ON crop_inputs FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_storage
CREATE POLICY cs_sel ON crop_storage FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cs_ins ON crop_storage FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cs_upd ON crop_storage FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cs_del ON crop_storage FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_storage_movements
CREATE POLICY csm_sel ON crop_storage_movements FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csm_ins ON crop_storage_movements FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csm_upd ON crop_storage_movements FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csm_del ON crop_storage_movements FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_shipments
CREATE POLICY csh_sel ON crop_shipments FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csh_ins ON crop_shipments FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csh_upd ON crop_shipments FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY csh_del ON crop_shipments FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- crop_shipment_tracking
CREATE POLICY cst_sel ON crop_shipment_tracking FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cst_ins ON crop_shipment_tracking FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cst_upd ON crop_shipment_tracking FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cst_del ON crop_shipment_tracking FOR DELETE USING (client_id = get_my_client_id() OR is_admin());
