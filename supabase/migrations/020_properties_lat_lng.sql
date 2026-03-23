-- Migration 020 — Adiciona lat/lng geográficos reais às propriedades
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

UPDATE properties SET lat = -16.35, lng = -49.25 WHERE id = '00000000-0000-0001-0000-000000000001'; -- Santa Helena, GO
UPDATE properties SET lat = -12.64, lng = -55.42 WHERE id = '00000000-0000-0001-0000-000000000002'; -- Boa Vista, MT
UPDATE properties SET lat = -19.92, lng = -43.93 WHERE id = '00000000-0000-0001-0000-000000000003'; -- Horizonte, MG
UPDATE properties SET lat = -22.63, lng = -47.81 WHERE id = '00000000-0000-0001-0000-000000000004'; -- Vale Verde, SP
UPDATE properties SET lat =  -3.72, lng = -49.07 WHERE id = '00000000-0000-0001-0000-000000000005'; -- Novo Horizonte, PA
UPDATE properties SET lat = -24.89, lng = -51.46 WHERE id = '00000000-0000-0001-0000-000000000006'; -- Serra Dourada, PR
