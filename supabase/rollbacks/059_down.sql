-- Rollback migration 059: remove triggers, funções, tabela crop_certifications e coluna score

-- Triggers
DROP TRIGGER IF EXISTS trg_cc_field_score  ON crop_certifications;
DROP TRIGGER IF EXISTS trg_cst_field_score ON crop_shipment_tracking;
DROP TRIGGER IF EXISTS trg_ci_field_score  ON crop_inputs;

-- Funções de trigger
DROP FUNCTION IF EXISTS trg_recalc_field_score_cert();
DROP FUNCTION IF EXISTS trg_recalc_field_score_tracking();
DROP FUNCTION IF EXISTS trg_recalc_field_score_input();

-- Função principal
DROP FUNCTION IF EXISTS calculate_field_score(uuid);

-- Tabela e tipo
DROP TABLE IF EXISTS crop_certifications;
DROP TYPE  IF EXISTS crop_certification_name_enum;

-- Coluna score em crop_fields
ALTER TABLE crop_fields DROP COLUMN IF EXISTS score;

DO $$ BEGIN
  RAISE NOTICE '059_down — rollback concluído';
END $$;
