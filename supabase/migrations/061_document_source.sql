-- Migration 061: document_source em tabelas críticas de entrada de dados
-- Registra qual documento verificado originou cada registro.
-- NULL = inserção manual → exibe badge "Dado não verificado" na UI.

ALTER TABLE stock_batches
  ADD COLUMN IF NOT EXISTS document_source text;

ALTER TABLE slaughter_records
  ADD COLUMN IF NOT EXISTS document_source text;

ALTER TABLE crop_shipment_tracking
  ADD COLUMN IF NOT EXISTS document_source text;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS document_source text;

DO $$ BEGIN
  RAISE NOTICE 'Migration 061: document_source adicionado a stock_batches, slaughter_records, crop_shipment_tracking e events.';
END $$;
