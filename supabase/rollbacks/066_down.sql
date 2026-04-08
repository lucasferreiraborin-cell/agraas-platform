-- Rollback migration 066
DROP INDEX IF EXISTS idx_shipment_tracking_client_lot_stage;
DROP INDEX IF EXISTS idx_events_animal_type;
DROP INDEX IF EXISTS idx_clients_email_unique;
DROP INDEX IF EXISTS idx_crop_fields_farm_code;
