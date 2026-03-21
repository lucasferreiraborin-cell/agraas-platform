-- Migration 002: Unificar animal_events e farm_events em uma tabela única events
-- Os dados são migrados mas as tabelas antigas são mantidas por segurança

CREATE TABLE IF NOT EXISTS events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id   uuid        REFERENCES animals(id) ON DELETE CASCADE,
  source      text        NOT NULL DEFAULT 'animal', -- 'animal' | 'farm'
  event_type  text,
  event_date  timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_animal_id  ON events (animal_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events (event_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_events_source     ON events (source);

-- Migra registros de animal_events
-- Campos: animal_id, event_type, event_timestamp, event_date, notes, created_at
INSERT INTO events (animal_id, source, event_type, event_date, notes, created_at)
SELECT
  animal_id,
  'animal',
  event_type,
  COALESCE(event_date::timestamptz, event_timestamp),
  notes,
  COALESCE(created_at, now())
FROM animal_events
WHERE animal_id IS NOT NULL;

-- Migra registros de farm_events
-- Campos: animal_id, type, event_date, description, created_at
INSERT INTO events (animal_id, source, event_type, event_date, notes, created_at)
SELECT
  animal_id,
  'farm',
  type,
  event_date::timestamptz,
  description,
  COALESCE(created_at, now())
FROM farm_events
WHERE animal_id IS NOT NULL;
