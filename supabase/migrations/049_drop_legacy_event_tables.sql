-- Migration 049: Drop tabelas legadas animal_events e farm_events
-- Substituídas pela tabela unificada events na migration 002.
-- Seguro dropar: tabelas foram esvaziadas/nunca mais populadas após migration 009.

DO $$
DECLARE
  v_animal_events_count bigint := 0;
  v_farm_events_count   bigint := 0;
BEGIN
  -- Verifica existência e contagem de animal_events
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'animal_events'
  ) THEN
    SELECT COUNT(*) INTO v_animal_events_count FROM animal_events;
    IF v_animal_events_count > 0 THEN
      RAISE EXCEPTION 'animal_events não está vazia: % registros encontrados. Drop cancelado.', v_animal_events_count;
    END IF;
    DROP TABLE animal_events;
    RAISE NOTICE 'Tabela animal_events removida (estava vazia).';
  ELSE
    RAISE NOTICE 'Tabela animal_events não existe — nada a fazer.';
  END IF;

  -- Verifica existência e contagem de farm_events
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'farm_events'
  ) THEN
    SELECT COUNT(*) INTO v_farm_events_count FROM farm_events;
    IF v_farm_events_count > 0 THEN
      RAISE EXCEPTION 'farm_events não está vazia: % registros encontrados. Drop cancelado.', v_farm_events_count;
    END IF;
    DROP TABLE farm_events;
    RAISE NOTICE 'Tabela farm_events removida (estava vazia).';
  ELSE
    RAISE NOTICE 'Tabela farm_events não existe — nada a fazer.';
  END IF;
END $$;
