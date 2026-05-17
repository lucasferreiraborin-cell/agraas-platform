-- Rollback migration 107: restaura os 3 listings removidos.
-- Conteúdo aproximado baseado no audit pós-106 (valores exatos podem
-- variar pois esses listings não estavam em nenhuma migration anterior
-- — foram criados fora do controle de versão).

BEGIN;

DO $$
DECLARE
  v_fsjbe uuid := '00000000-0000-0000-0003-000000000001';
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
BEGIN
  INSERT INTO marketplace_listings (
    client_id, listing_type, title, description, category,
    price_per_unit, unit, quantity_available,
    location_state, location_city, status, halal_certified
  ) VALUES
    (v_fsjbe, 'animal',
     'Touro Nelore PO — BER-001',
     'Touro Nelore PO BER-001, restaurado via rollback.',
     'Touro PO',
     400, 'arroba', 1,
     'GO', 'Jandaia', 'ativo', true),
    (v_fsjbe, 'animal',
     'Touro Nelore PO — BER-003',
     'Touro Nelore PO BER-003, restaurado via rollback.',
     'Touro PO',
     400, 'arroba', 1,
     'GO', 'Jandaia', 'ativo', true),
    (v_lucas, 'safra',
     'Soja Safra 2026 — 3.500 toneladas disponíveis',
     'Soja safra 2026, restaurado via rollback.',
     'Grão · Soja',
     150, 'saca', 58333,
     'GO', 'Goiânia', 'ativo', false);
END $$;

COMMIT;
