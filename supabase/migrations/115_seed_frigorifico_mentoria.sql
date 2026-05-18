-- Migration 115: seed Frigorífico Mentoria IZ-SP
--
-- Cliente alvo: 00000000-0000-0000-0099-000000000002 (criado na 113)
-- Producer_type: 'ponta_compradora' (vinculado na 113)
--
-- Conteúdo:
--   1 property representando a unidade industrial
--   2 marketplace_offers DEMO (ofertas de compra) respondendo a listings
--     bovinos do FSJBE — mostra o fluxo operacional do comprador na UI
--
-- Investigação prévia revelou estrutura buyer existente:
--   • clients.role 'buyer' existe (1 cliente usa hoje: PIF — pausado)
--   • Frigorífico Mentoria mantém role 'admin' (igual Fazenda Mentoria) —
--     diferenciação fica pelo producer_type 'ponta_compradora'
--   • marketplace_offers.buyer_client_id é o link pra identificar quem oferta
--   • marketplace_listings é só de VENDA (não tem listing_type='compra')
--
-- Caveat: user pediu volumes "50-100 cabeças cada" em ofertas de "boi gordo".
-- Listings disponíveis FSJBE são vacas descarte (20), bezerros (50), bois
-- magros (25), lote misto (80), novilhas (30). Nenhum é boi gordo puro.
-- Escolhidos os 2 mais próximos do contexto frigorífico: vacas descarte
-- (vão pra abate) + bois magros (representando intenção de adquirir e
-- terminar). Quantidades 20 e 25 — não bate exato com 50-100 mas é o
-- que listings existentes oferecem. Preço unificado R$ 295/@ (mercado atual).

BEGIN;

-- ── 1) Property — Unidade Industrial ─────────────────────────────────
INSERT INTO public.properties (id, client_id, name, city, state, area_hectares, status)
VALUES (
  '11111111-0099-0000-0000-000000000002',
  '00000000-0000-0000-0099-000000000002',
  'Unidade Industrial Mentoria',
  'Barretos',
  'SP',
  NULL,
  'Ativa'
);

-- ── 2) Marketplace offers demo ───────────────────────────────────────
-- Oferta 1: comprar todo o lote de 20 vacas descarte do FSJBE
INSERT INTO public.marketplace_offers (
  id,
  listing_id,
  buyer_client_id,
  offer_price_per_unit,
  offer_quantity,
  message,
  status
)
VALUES (
  '55555555-0099-0000-0000-000000000001',
  'ceccf731-ddbc-4069-89bf-807198fffd52', -- "Lote 20 vacas de descarte — Nelore"
  '00000000-0000-0000-0099-000000000002',
  295.00,
  20,
  'Interesse em adquirir o lote completo pra abate na Unidade Industrial Mentoria (Barretos/SP). Retirada na origem em 7 dias, pagamento à vista mediante GTA emitida.',
  'pendente'
);

-- Oferta 2: comprar todo o lote de 25 bois magros do FSJBE
INSERT INTO public.marketplace_offers (
  id,
  listing_id,
  buyer_client_id,
  offer_price_per_unit,
  offer_quantity,
  message,
  status
)
VALUES (
  '55555555-0099-0000-0000-000000000002',
  '3b504ffc-aed7-4447-bb40-bca527347e82', -- "Lote 25 bois magros para recria — Nelore"
  '00000000-0000-0000-0099-000000000002',
  295.00,
  25,
  'Programa de aquisição pra terminação em confinamento próprio antes do abate. Volume mínimo viável. Preço incluindo frete CIF Barretos.',
  'pendente'
);

COMMIT;
