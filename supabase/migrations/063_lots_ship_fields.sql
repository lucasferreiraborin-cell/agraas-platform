-- Migration 063: adiciona ship_name e arrival_date à tabela lots
-- Campos opcionais para rastreamento de navio no mapa AIS simulado.

ALTER TABLE lots ADD COLUMN IF NOT EXISTS ship_name   text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS arrival_date date;

DO $$ BEGIN
  RAISE NOTICE 'Migration 063: ship_name e arrival_date adicionados a lots.';
END $$;
