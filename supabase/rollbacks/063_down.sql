-- Rollback migration 063: remove colunas ship_name e arrival_date de lots

ALTER TABLE lots DROP COLUMN IF EXISTS arrival_date;
ALTER TABLE lots DROP COLUMN IF EXISTS ship_name;

DO $$ BEGIN
  RAISE NOTICE '063_down — rollback concluído';
END $$;
