-- Migration 007: Adiciona property_id em lots para vincular lotes a propriedades
ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lots_property_id ON lots (property_id);
