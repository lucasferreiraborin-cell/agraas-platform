-- Migration 106: alinha marketplace ao foco 100% pecuária bovina
-- Decisão 2026-05-17 (mentoria IZ-SP com Dra. Renata + César).
--
-- Remove os 6 listings que (a) afirmam Halal/SIF como diferencial,
-- (b) reivindicam origem PO sem registro confirmado, ou (c) pertencem
-- a cadeias pausadas (ovinos, aves, agricultura). Insere 6 listings
-- genéricos bovinos sem reivindicar origem específica FSJBE — o
-- tombamento Multbovinos → Agraas é segundo plano e os dados reais
-- entram quando ele acontecer.
--
-- Mantidos da migration 105:
--   - "Vacina Aftosa bivalente — 1.000 doses" (insumo bovino)
--   - "Ração mineral proteinada — saco 30 kg" (insumo bovino)

BEGIN;

-- ── 1) Remove os 6 listings problemáticos da migration 105 ───────────
DELETE FROM marketplace_listings
WHERE title IN (
  'Lote 40 Novilhas Nelore — 18 meses',
  'Novilha Nelore PO — Reprodutora 2ª cria',
  'Lote 25 ovelhas Santa Inês — matrizes',
  'Lote 8.000 frangos de corte — 42 dias',
  'Milho safra 2026 — 1.200 toneladas',
  'Café arábica tipo 2 — 300 sacas'
);

-- ── 2) Insere 6 listings bovinos genéricos ───────────────────────────
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
    -- Novilhas Nelore para reposição (sem PO, sem Halal)
    (v_fsjbe, 'animal',
     'Lote 30 Novilhas Nelore — reposição',
     'Lote de 30 novilhas Nelore aptas à reposição de matrizes, idade 18-24 meses, peso médio 320 kg. Rastreabilidade individual ativa via Agraas, vacinação em dia, GTA regular. Manejo extensivo em Goiás.',
     'Novilhas',
     290, 'arroba', 30,
     'GO', 'Jandaia', 'ativo', false, 74),

    -- Bezerros desmamados após cobertura
    (v_fsjbe, 'animal',
     'Lote 50 bezerros Nelore — desmama recente',
     'Lote de 50 bezerros Nelore desmamados após cobertura natural, 7-9 meses, peso médio 180 kg. Vacinação de bezerro completa, manejo sanitário rastreado. Disponível para retirada na origem (GO).',
     'Bezerros',
     270, 'arroba', 50,
     'GO', 'Jandaia', 'ativo', false, 71),

    -- Vacas de descarte
    (v_fsjbe, 'animal',
     'Lote 20 vacas de descarte — Nelore',
     'Lote de 20 vacas Nelore de descarte (idade reprodutiva esgotada), peso médio 440 kg. Condição corporal 3-4. Documentação sanitária regular, GTA disponível.',
     'Vacas descarte',
     250, 'arroba', 20,
     'GO', 'Jandaia', 'ativo', false, 65),

    -- Lote misto cria/recria
    (v_fsjbe, 'animal',
     'Lote misto cria/recria — 80 cabeças',
     'Lote misto Nelore composto por novilhas, bezerros e vacas em produção. 80 cabeças no total, peso médio 280 kg. Ideal para fazenda em fase de formação ou recomposição de plantel. Rastreabilidade individual.',
     'Lote misto',
     280, 'arroba', 80,
     'GO', 'Jandaia', 'ativo', false, 72),

    -- Sal mineral proteinado (insumo bovino, complementa o ração mineral preservado)
    (v_lucas, 'insumo',
     'Sal mineral proteinado — saco 30 kg',
     'Sal mineral proteinado 20% para bovinos de cria em pastagem, com microminerais quelatados. Saco de 30 kg, indicado para estação seca. Registro MAPA ativo.',
     'Nutrição · Sal mineral',
     145, 'saco', 250,
     'GO', 'Goiânia', 'ativo', false, NULL),

    -- Boi magro para recria (complementa cadeia cria → recria)
    (v_fsjbe, 'animal',
     'Lote 25 bois magros para recria — Nelore',
     'Lote de 25 bois Nelore magros, 14-18 meses, peso médio 280 kg. Saídos diretos da fazenda de cria para terminação em recria/engorda. Manejo sanitário rastreado, documentação regular.',
     'Bois magros',
     265, 'arroba', 25,
     'GO', 'Jandaia', 'ativo', false, 69);
END $$;

COMMIT;
