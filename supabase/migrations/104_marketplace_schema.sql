-- Migration 104: Marketplace — schema completo

-- ═══ Enums ═══════════════════════════════════════════════════════════════════
CREATE TYPE marketplace_listing_type AS ENUM ('animal','safra','insumo','maquinario','equipamento','epi','outro');
CREATE TYPE marketplace_listing_status AS ENUM ('ativo','pausado','vendido','expirado');
CREATE TYPE marketplace_offer_status AS ENUM ('pendente','aceita','recusada','expirada');
CREATE TYPE marketplace_tx_status AS ENUM ('aguardando_pagamento','pago','entregue','cancelado','disputado');

-- ═══ Listings ════════════════════════════════════════════════════════════════
CREATE TABLE marketplace_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  listing_type      marketplace_listing_type NOT NULL,
  title             text NOT NULL,
  description       text,
  category          text,
  price_per_unit    numeric(14,2) NOT NULL,
  unit              text NOT NULL DEFAULT 'unidade',
  quantity_available numeric(14,2) NOT NULL DEFAULT 1,
  location_state    text,
  location_city     text,
  images            text[] DEFAULT '{}',
  status            marketplace_listing_status NOT NULL DEFAULT 'ativo',
  halal_certified   boolean NOT NULL DEFAULT false,
  score_agraas      integer,
  animal_id         uuid REFERENCES animals(id) ON DELETE SET NULL,
  lot_id            uuid REFERENCES lots(id) ON DELETE SET NULL,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mktl_client   ON marketplace_listings(client_id);
CREATE INDEX idx_mktl_type     ON marketplace_listings(listing_type);
CREATE INDEX idx_mktl_status   ON marketplace_listings(status);
CREATE INDEX idx_mktl_state    ON marketplace_listings(location_state);
CREATE INDEX idx_mktl_created  ON marketplace_listings(created_at DESC);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY mktl_select ON marketplace_listings FOR SELECT USING (status = 'ativo' OR client_id = get_my_client_id() OR is_admin());
CREATE POLICY mktl_insert ON marketplace_listings FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY mktl_update ON marketplace_listings FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY mktl_delete ON marketplace_listings FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

-- ═══ Offers ══════════════════════════════════════════════════════════════════
CREATE TABLE marketplace_offers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id             uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  offer_price_per_unit   numeric(14,2) NOT NULL,
  offer_quantity         numeric(14,2) NOT NULL DEFAULT 1,
  message                text,
  status                 marketplace_offer_status NOT NULL DEFAULT 'pendente',
  stripe_payment_intent_id text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mkto_listing ON marketplace_offers(listing_id);
CREATE INDEX idx_mkto_buyer   ON marketplace_offers(buyer_client_id);
CREATE INDEX idx_mkto_status  ON marketplace_offers(status);

ALTER TABLE marketplace_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY mkto_select ON marketplace_offers FOR SELECT USING (
  buyer_client_id = get_my_client_id()
  OR listing_id IN (SELECT id FROM marketplace_listings WHERE client_id = get_my_client_id())
  OR is_admin()
);
CREATE POLICY mkto_insert ON marketplace_offers FOR INSERT WITH CHECK (buyer_client_id = get_my_client_id() OR is_admin());
CREATE POLICY mkto_update ON marketplace_offers FOR UPDATE USING (buyer_client_id = get_my_client_id() OR is_admin());

-- ═══ Transactions ════════════════════════════════════════════════════════════
CREATE TABLE marketplace_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid NOT NULL REFERENCES marketplace_listings(id),
  offer_id            uuid NOT NULL REFERENCES marketplace_offers(id),
  seller_client_id    uuid NOT NULL REFERENCES clients(id),
  buyer_client_id     uuid NOT NULL REFERENCES clients(id),
  final_price_per_unit numeric(14,2) NOT NULL,
  final_quantity       numeric(14,2) NOT NULL,
  total_value          numeric(14,2) GENERATED ALWAYS AS (final_price_per_unit * final_quantity) STORED,
  stripe_charge_id     text,
  fiscal_note_id       uuid REFERENCES fiscal_notes(id),
  status               marketplace_tx_status NOT NULL DEFAULT 'aguardando_pagamento',
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mktt_seller ON marketplace_transactions(seller_client_id);
CREATE INDEX idx_mktt_buyer  ON marketplace_transactions(buyer_client_id);
CREATE INDEX idx_mktt_status ON marketplace_transactions(status);

ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mktt_select ON marketplace_transactions FOR SELECT USING (
  seller_client_id = get_my_client_id() OR buyer_client_id = get_my_client_id() OR is_admin()
);
CREATE POLICY mktt_insert ON marketplace_transactions FOR INSERT WITH CHECK (is_admin() OR seller_client_id = get_my_client_id());

-- ═══ Seed demo: 4 listings da FSJBE ═════════════════════════════════════════
DO $$
DECLARE
  v_fsjbe uuid := '00000000-0000-0000-0003-000000000001';
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_a1    uuid := '00000000-0000-0003-0003-000000000001';
  v_a3    uuid := '00000000-0000-0003-0003-000000000003';
BEGIN
  INSERT INTO marketplace_listings (client_id, listing_type, title, description, category, price_per_unit, unit, quantity_available, location_state, location_city, status, halal_certified, score_agraas, animal_id) VALUES
    (v_fsjbe, 'animal', 'Touro Nelore PO — BER-001', 'Touro reprodutor Nelore PO com Score Agraas alto. MAPA + Halal + GTA certificado. Peso atual 520kg.', 'Reprodutor', 330, 'arroba', 17.3, 'GO', 'Jandaia', 'ativo', true, 82, v_a1),
    (v_fsjbe, 'animal', 'Touro Nelore PO — BER-003', 'Touro reprodutor Nelore PO 620kg. Certificação Halal ativa. Apto exportação.', 'Reprodutor', 340, 'arroba', 20.6, 'GO', 'Jandaia', 'ativo', true, 88, v_a3),
    (v_fsjbe, 'insumo', 'Ivermectina 1% Elanco — Estoque excedente', '200 frascos de Ivermectina 1% com validade 12 meses. Lote IVE-FSJBE-2026-002.', 'Antiparasitário', 18.00, 'frasco', 50, 'GO', 'Jandaia', 'ativo', false, NULL, NULL);

  INSERT INTO marketplace_listings (client_id, listing_type, title, description, category, price_per_unit, unit, quantity_available, location_state, location_city, status, halal_certified, score_agraas) VALUES
    (v_lucas, 'safra', 'Soja Safra 2026 — 3.500t embarque Jeddah', 'Soja convencional safra 2025/26. Embarque confirmado Porto de Santos. Laudo de qualidade disponível.', 'Grão', 2350, 'tonelada', 500, 'GO', 'Goiânia', 'ativo', false, NULL);
END $$;
