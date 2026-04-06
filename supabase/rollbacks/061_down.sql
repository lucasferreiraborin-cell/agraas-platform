-- Rollback migration 061: remove coluna document_source das 4 tabelas

ALTER TABLE events                  DROP COLUMN IF EXISTS document_source;
ALTER TABLE crop_shipment_tracking  DROP COLUMN IF EXISTS document_source;
ALTER TABLE slaughter_records       DROP COLUMN IF EXISTS document_source;
ALTER TABLE stock_batches           DROP COLUMN IF EXISTS document_source;

DO $$ BEGIN
  RAISE NOTICE '061_down — rollback concluído';
END $$;
