-- Rollback migration 064: remove rfid_device_type
ALTER TABLE animals DROP COLUMN IF EXISTS rfid_device_type;
ALTER TABLE livestock_species DROP COLUMN IF EXISTS rfid_device_type;
DROP TYPE IF EXISTS rfid_device_type_enum;
