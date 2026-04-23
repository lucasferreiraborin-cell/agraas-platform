-- Migration 105: 8 anúncios adicionais para o marketplace
-- Completa o catálogo público com variedade (bovinos, ovinos, aves, grãos, insumos)

DO $$
DECLARE
  v_fsjbe uuid := '00000000-0000-0000-0003-000000000001';
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
BEGIN
  -- ── 2 bovinos Nelore (Goiás) ────────────────────────────────────────────
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

  -- ── 1 ovino Santa Inês (Goiás) ──────────────────────────────────────────
    (v_lucas, 'animal',
     'Lote 25 ovelhas Santa Inês — matrizes',
     'Lote de 25 ovelhas Santa Inês, peso médio 45 kg, matrizes aptas à reprodução. Vacinadas e vermifugadas. Rastreabilidade individual via Agraas.',
     'Ovinos · Santa Inês',
     180, 'arroba', 33.7,
     'GO', 'Goiânia', 'ativo', false, 72),

  -- ── 1 lote frangos (SP) ─────────────────────────────────────────────────
    (v_lucas, 'animal',
     'Lote 8.000 frangos de corte — 42 dias',
     'Lote de frangos de corte, idade de abate 42 dias, peso médio 2,8 kg. Criados em sistema integrado, abatedouro SIF vinculado, pronto para escala comercial.',
     'Aves · Corte',
     9.80, 'kg', 22400,
     'SP', 'Bastos', 'ativo', false, 74),

  -- ── 1 safra milho (MT) ──────────────────────────────────────────────────
    (v_lucas, 'safra',
     'Milho safra 2026 — 1.200 toneladas',
     'Milho safrinha 2026 colhido em abril. Classificação tipo 1, umidade 13,5%. CAR verificado, área com polígono georreferenciado. Retirada direto da fazenda em Sorriso.',
     'Grão · Milho',
     72, 'saca', 20000,
     'MT', 'Sorriso', 'ativo', false, 79),

  -- ── 1 safra café (MG) ───────────────────────────────────────────────────
    (v_lucas, 'safra',
     'Café arábica tipo 2 — 300 sacas',
     'Café arábica MG, tipo 2 bebida duro, peneira 16/17. Laudo de qualidade disponível. Talhão georreferenciado, rastreabilidade do talhão ao cliente.',
     'Grão · Café',
     1480, 'saca', 300,
     'MG', 'Patrocínio', 'ativo', false, 81),

  -- ── 1 vacina Aftosa (GO) ────────────────────────────────────────────────
    (v_fsjbe, 'insumo',
     'Vacina Aftosa bivalente — 1.000 doses',
     'Vacina Aftosa bivalente lote 2026-A. Validade 18 meses. Cadeia fria garantida. MAPA registro ativo. Ideal para campanhas de rebanho médio a grande.',
     'Sanitário · Vacina',
     4.20, 'dose', 1000,
     'GO', 'Jandaia', 'ativo', false, NULL),

  -- ── 1 ração mineral (GO) ────────────────────────────────────────────────
    (v_lucas, 'insumo',
     'Ração mineral proteinada — saco 30 kg',
     'Ração mineral proteinada 40% para bovinos de corte em pastagem. Ureia balanceada, microminerais. Saco de 30 kg, produção brasileira com registro MAPA.',
     'Nutrição · Mineral',
     165, 'saco', 200,
     'GO', 'Goiânia', 'ativo', false, NULL);
END $$;
