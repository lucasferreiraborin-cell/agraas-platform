-- Migration 045: Adiciona halal_certified em poultry_batches + atualiza seed demo

ALTER TABLE poultry_batches
  ADD COLUMN IF NOT EXISTS halal_certified boolean NOT NULL DEFAULT false;

-- Marca FRG-2025-001 (Lucas) como Halal certificado para demonstração PIF
UPDATE poultry_batches
   SET halal_certified = true
 WHERE batch_code = 'FRG-2025-001';
