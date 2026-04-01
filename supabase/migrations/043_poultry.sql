-- Migration 043: Aves/Frangos — poultry_batches, poultry_batch_events

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE poultry_species_enum     AS ENUM ('frango', 'peru', 'pato');
CREATE TYPE poultry_status_enum      AS ENUM ('alojado', 'em_crescimento', 'pronto_abate', 'abatido');
CREATE TYPE poultry_event_type_enum  AS ENUM ('vacina', 'racao', 'mortalidade', 'pesagem', 'abate');

-- ─── poultry_batches ──────────────────────────────────────────────────────────

CREATE TABLE poultry_batches (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  property_id         uuid          REFERENCES properties(id) ON DELETE SET NULL,
  batch_code          text          NOT NULL,
  species             poultry_species_enum NOT NULL DEFAULT 'frango',
  breed               text,
  housing_date        date          NOT NULL,
  initial_count       integer       NOT NULL CHECK (initial_count > 0),
  current_count       integer       NOT NULL CHECK (current_count >= 0),
  mortality_count     integer       NOT NULL DEFAULT 0 CHECK (mortality_count >= 0),
  average_weight_kg   numeric(6,3),
  feed_conversion     numeric(5,3),  -- kg ração / kg ganho de peso
  integrator_name     text,
  status              poultry_status_enum NOT NULL DEFAULT 'alojado',
  notes               text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (client_id, batch_code)
);

CREATE INDEX idx_poultry_batches_client   ON poultry_batches(client_id);
CREATE INDEX idx_poultry_batches_property ON poultry_batches(property_id);
CREATE INDEX idx_poultry_batches_status   ON poultry_batches(status);

-- ─── poultry_batch_events ─────────────────────────────────────────────────────

CREATE TABLE poultry_batch_events (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid          NOT NULL REFERENCES poultry_batches(id) ON DELETE CASCADE,
  client_id   uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type  poultry_event_type_enum NOT NULL,
  date        date          NOT NULL DEFAULT CURRENT_DATE,
  value       numeric(10,3),   -- contexto: qtd mortos, peso médio kg, kg ração, etc.
  notes       text,
  operator    text,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_poultry_events_batch  ON poultry_batch_events(batch_id);
CREATE INDEX idx_poultry_events_client ON poultry_batch_events(client_id);
CREATE INDEX idx_poultry_events_type   ON poultry_batch_events(event_type);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE poultry_batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE poultry_batch_events  ENABLE ROW LEVEL SECURITY;

-- poultry_batches
CREATE POLICY pb_select ON poultry_batches FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pb_insert ON poultry_batches FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pb_update ON poultry_batches FOR UPDATE
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pb_delete ON poultry_batches FOR DELETE
  USING (client_id = get_my_client_id() OR is_admin());

-- poultry_batch_events (client_id redundante → RLS simples)
CREATE POLICY pbe_select ON poultry_batch_events FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pbe_insert ON poultry_batch_events FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pbe_update ON poultry_batch_events FOR UPDATE
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY pbe_delete ON poultry_batch_events FOR DELETE
  USING (client_id = get_my_client_id() OR is_admin());
