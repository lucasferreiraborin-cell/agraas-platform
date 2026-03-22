-- Adiciona campos de aplicação sanitária na tabela applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS dose numeric;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS operator_name text;
