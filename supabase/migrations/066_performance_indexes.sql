-- Migration 066: Performance indexes
-- Adds missing indexes identified in platform audit

-- Shipment tracking — common lookup pattern
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_client_lot_stage
  ON shipment_tracking(client_id, lot_id, stage);

-- Events — common filter by animal + type
CREATE INDEX IF NOT EXISTS idx_events_animal_type
  ON events(animal_id, event_type);

-- Clients — email must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_unique
  ON clients(email);

-- Crop fields — farm + field_code should be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_crop_fields_farm_code
  ON crop_fields(farm_id, field_code)
  WHERE field_code IS NOT NULL;
