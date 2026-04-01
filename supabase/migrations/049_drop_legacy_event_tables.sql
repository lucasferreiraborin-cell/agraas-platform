-- Migration 049: Drop tabelas legadas animal_events e farm_events
--
-- Contexto: migration 002 já migrou todos os registros dessas tabelas para
-- a tabela unificada events (INSERT INTO events SELECT FROM animal_events/farm_events).
-- Migration 009 pretendia dropar mas foi mantida por segurança na época.
-- Os dados existentes JÁ estão em events — drop é seguro.
--
-- Schema original de animal_events: animal_id, event_type, event_timestamp, notes, created_at
-- Schema original de farm_events:   animal_id, type, event_date, description, created_at

DO $$
BEGIN
  -- ── animal_events ────────────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'animal_events'
  ) THEN
    -- Inserção defensiva: migra quaisquer registros que possam ter escapado
    -- da migration 002 (apenas os que não têm correspondência em events).
    INSERT INTO events (animal_id, source, event_type, event_date, notes, created_at)
    SELECT
      ae.animal_id,
      'animal',
      ae.event_type,
      ae.event_timestamp,
      ae.notes,
      COALESCE(ae.created_at, now())
    FROM animal_events ae
    WHERE ae.animal_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM events e
        WHERE e.animal_id  = ae.animal_id
          AND e.source     = 'animal'
          AND e.event_type = ae.event_type
          AND e.event_date = ae.event_timestamp
      );

    DROP TABLE animal_events;
    RAISE NOTICE 'Tabela animal_events removida com sucesso.';
  ELSE
    RAISE NOTICE 'Tabela animal_events não existe — nada a fazer.';
  END IF;

  -- ── farm_events ───────────────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'farm_events'
  ) THEN
    INSERT INTO events (animal_id, source, event_type, event_date, notes, created_at)
    SELECT
      fe.animal_id,
      'farm',
      fe.type,
      fe.event_date::timestamptz,
      fe.description,
      COALESCE(fe.created_at, now())
    FROM farm_events fe
    WHERE fe.animal_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM events e
        WHERE e.animal_id  = fe.animal_id
          AND e.source     = 'farm'
          AND e.event_type = fe.type
          AND e.event_date = fe.event_date::timestamptz
      );

    DROP TABLE farm_events;
    RAISE NOTICE 'Tabela farm_events removida com sucesso.';
  ELSE
    RAISE NOTICE 'Tabela farm_events não existe — nada a fazer.';
  END IF;
END $$;
