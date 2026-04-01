-- Migration 053: Tabelas de suporte para livestock_species
-- livestock_weights, livestock_applications, livestock_events, livestock_certifications

-- ── livestock_weights ─────────────────────────────────────────────────────────

CREATE TABLE livestock_weights (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  animal_id   uuid        NOT NULL REFERENCES livestock_species(id) ON DELETE CASCADE,
  weight_kg   numeric(8,2) NOT NULL,
  weighed_at  date        NOT NULL,
  notes       text,
  operator    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lw_client ON livestock_weights(client_id);
CREATE INDEX idx_lw_animal ON livestock_weights(animal_id);
CREATE INDEX idx_lw_date   ON livestock_weights(weighed_at DESC);

ALTER TABLE livestock_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY lw_select ON livestock_weights FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lw_insert ON livestock_weights FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lw_update ON livestock_weights FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lw_delete ON livestock_weights FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- ── livestock_applications ────────────────────────────────────────────────────

CREATE TABLE livestock_applications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  animal_id        uuid        NOT NULL REFERENCES livestock_species(id) ON DELETE CASCADE,
  product_name     text        NOT NULL,
  dose             numeric(8,3),
  unit             text,
  application_date date        NOT NULL,
  withdrawal_days  int         NOT NULL DEFAULT 0,
  withdrawal_date  date,
  operator         text,
  batch_number     text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_la_client ON livestock_applications(client_id);
CREATE INDEX idx_la_animal ON livestock_applications(animal_id);
CREATE INDEX idx_la_date   ON livestock_applications(application_date DESC);

ALTER TABLE livestock_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY la_select ON livestock_applications FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY la_insert ON livestock_applications FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY la_update ON livestock_applications FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY la_delete ON livestock_applications FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- ── livestock_events ──────────────────────────────────────────────────────────

CREATE TABLE livestock_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  animal_id   uuid        NOT NULL REFERENCES livestock_species(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  event_date  date        NOT NULL,
  notes       text,
  operator    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_le_client ON livestock_events(client_id);
CREATE INDEX idx_le_animal ON livestock_events(animal_id);
CREATE INDEX idx_le_date   ON livestock_events(event_date DESC);

ALTER TABLE livestock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY le_select ON livestock_events FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY le_insert ON livestock_events FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY le_update ON livestock_events FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY le_delete ON livestock_events FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- ── livestock_certifications ──────────────────────────────────────────────────

CREATE TABLE livestock_certifications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  animal_id          uuid        NOT NULL REFERENCES livestock_species(id) ON DELETE CASCADE,
  certification_name text        NOT NULL,
  issued_at          date,
  expires_at         date,
  status             text        NOT NULL DEFAULT 'ativa',
  issuer             text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lc_client ON livestock_certifications(client_id);
CREATE INDEX idx_lc_animal ON livestock_certifications(animal_id);
CREATE INDEX idx_lc_status ON livestock_certifications(status);

ALTER TABLE livestock_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY lc_select ON livestock_certifications FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lc_insert ON livestock_certifications FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lc_update ON livestock_certifications FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY lc_delete ON livestock_certifications FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

DO $$ BEGIN
  RAISE NOTICE 'Migration 053 OK — 4 tabelas criadas: livestock_weights, livestock_applications, livestock_events, livestock_certifications';
END $$;
