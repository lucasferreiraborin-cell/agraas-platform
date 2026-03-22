-- Migration 016: Campos de exportação na tabela lots

ALTER TABLE lots ADD COLUMN IF NOT EXISTS pais_destino       text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS porto_embarque     text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS data_embarque      date;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS certificacoes_exigidas text[];
ALTER TABLE lots ADD COLUMN IF NOT EXISTS numero_contrato    text;
