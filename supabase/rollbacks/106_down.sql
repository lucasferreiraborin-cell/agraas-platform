-- Rollback migration 106: restaura listings da migration 105
-- Remove os 6 listings genéricos bovinos e reinsere os 6 originais
-- (Halal/PO/ovinos/aves/agricultura) que foram substituídos.

BEGIN;

-- Remove os 6 listings inseridos pela 106
DELETE FROM marketplace_listings
WHERE title IN (
  'Lote 30 Novilhas Nelore — reposição',
  'Lote 50 bezerros Nelore — desmama recente',
  'Lote 20 vacas de descarte — Nelore',
  'Lote misto cria/recria — 80 cabeças',
  'Sal mineral proteinado — saco 30 kg',
  'Lote 25 bois magros para recria — Nelore'
);

-- Restaura os 6 originais da migration 105
DO $$
DECLARE
  v_fsjbe uuid := '00000000-0000-0000-0003-000000000001';
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
BEGIN
  INSERT INTO marketplace_listings (
    client_id, listing_type, title, description, category,
    price_per_unit, unit, quantity_available,
    location_state, location_city, status, halal_certified, score_agraas
  ) VALUES
    (v_fsjbe, 'animal',
     'Lote 40 Novilhas Nelore — 18 meses',
     'Lote de 40 novilhas Nelore PO, 18 meses, peso médio 340 kg. Origem Fazenda São João da Boa Esperança. Passaporte digital ativo, vacinação em dia, GTA regular. Score Agraas acima de 75.',
     'Novilhas',
     300, 'arroba', 40,
     'GO', 'Jandaia', 'ativo', true, 76),
    (v_fsjbe, 'animal',
     'Novilha Nelore PO — Reprodutora 2ª cria',
     'Novilha Nelore PO, 3 anos, segunda cria, peso 420 kg. Excelente score reprodutivo. Halal certificado, MAPA ativo, passaporte digital com histórico completo.',
     'Matriz reprodutora',
     380, 'arroba', 12,
     'GO', 'Jandaia', 'ativo', true, 84),
    (v_lucas, 'animal',
     'Lote 25 ovelhas Santa Inês — matrizes',
     'Lote de 25 ovelhas Santa Inês, peso médio 45 kg, matrizes aptas à reprodução. Vacinadas e vermifugadas. Rastreabilidade individual via Agraas.',
     'Ovinos · Santa Inês',
     180, 'arroba', 33.7,
     'GO', 'Goiânia', 'ativo', false, 72),
    (v_lucas, 'animal',
     'Lote 8.000 frangos de corte — 42 dias',
     'Lote de frangos de corte, idade de abate 42 dias, peso médio 2,8 kg. Criados em sistema integrado, abatedouro SIF vinculado, pronto para escala comercial.',
     'Aves · Corte',
     9.80, 'kg', 22400,
     'SP', 'Bastos', 'ativo', false, 74),
    (v_lucas, 'safra',
     'Milho safra 2026 — 1.200 toneladas',
     'Milho safrinha 2026 colhido em abril. Classificação tipo 1, umidade 13,5%. CAR verificado, área com polígono georreferenciado. Retirada direto da fazenda em Sorriso.',
     'Grão · Milho',
     72, 'saca', 20000,
     'MT', 'Sorriso', 'ativo', false, 79),
    (v_lucas, 'safra',
     'Café arábica tipo 2 — 300 sacas',
     'Café arábica MG, tipo 2 bebida duro, peneira 16/17. Laudo de qualidade disponível. Talhão georreferenciado, rastreabilidade do talhão ao cliente.',
     'Grão · Café',
     1480, 'saca', 300,
     'MG', 'Patrocínio', 'ativo', false, 81);
END $$;

COMMIT;
