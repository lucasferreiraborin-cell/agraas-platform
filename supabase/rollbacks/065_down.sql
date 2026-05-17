-- Rollback migration 065: remove crop_quality_reports e campos de embarque
DROP TABLE IF EXISTS crop_quality_reports;
ALTER TABLE crop_shipments
  DROP COLUMN IF EXISTS bill_of_lading,
  DROP COLUMN IF EXISTS phytosanitary_cert,
  DROP COLUMN IF EXISTS phytosanitary_cert_date;
