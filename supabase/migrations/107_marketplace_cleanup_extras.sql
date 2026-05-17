-- Migration 107: complemento da 106 — remove 3 listings extras
-- não cobertos pelo DELETE da 106 (não estavam na migration 105 original).
--
-- Detectado por audit pós-migration 106:
--   - "Touro Nelore PO — BER-001" (halal_certified=true, reivindica PO sem
--     registro confirmado, atribuído a animal fictício BER-001)
--   - "Touro Nelore PO — BER-003" (mesmo problema com BER-003)
--   - "Soja Safra 2026 — 3.500 toneladas disponíveis" (cadeia agricultura
--     pausada conforme decisão 17/05)
--
-- Como a 106 já está aplicada e o schema_migrations registrou, esta é a
-- maneira limpa de complementar.

BEGIN;

DELETE FROM marketplace_listings
WHERE title IN (
  'Touro Nelore PO — BER-001',
  'Touro Nelore PO — BER-003',
  'Soja Safra 2026 — 3.500 toneladas disponíveis'
);

COMMIT;
