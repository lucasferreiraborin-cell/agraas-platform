-- Rollback migration 062: remove tabela ai_predictions

DROP TABLE IF EXISTS ai_predictions;

DO $$ BEGIN
  RAISE NOTICE '062_down — rollback concluído';
END $$;
