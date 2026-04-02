-- Rollback migration 060: remove tabelas NF-e agrícola

DROP TABLE IF EXISTS crop_fiscal_note_items;
DROP TABLE IF EXISTS crop_fiscal_notes;

DO $$ BEGIN
  RAISE NOTICE '060_down — rollback concluído';
END $$;
