-- =============================================================================
-- Migration 026 — PIF Buyer: cliente, acesso a lotes, role constraint
-- =============================================================================

-- Amplia constraint de role para aceitar 'buyer'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_role_check;
ALTER TABLE clients ADD CONSTRAINT clients_role_check
  CHECK (role IN ('admin', 'client', 'buyer'));

-- Tabela de acesso de compradores a lotes
CREATE TABLE IF NOT EXISTS lot_buyer_access (
  lot_id          uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  buyer_client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  granted_at      timestamptz DEFAULT now(),
  PRIMARY KEY (lot_id, buyer_client_id)
);

ALTER TABLE lot_buyer_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_lot_access_select" ON lot_buyer_access
  FOR SELECT USING (
    is_admin()
    OR buyer_client_id = get_my_client_id()
  );

-- Seed PIF + vínculo com lote exportação
DO $$
DECLARE
  pif_id   uuid;
  lot_id   uuid := '00000000-0000-0004-0001-000000000002'; -- Lote Exportação SAU
BEGIN
  INSERT INTO clients (name, email, role, auth_user_id)
  VALUES (
    'PIF — Public Investment Fund',
    'pif@agraas.com.br',
    'buyer',
    (SELECT id FROM auth.users WHERE email = 'pif@agraas.com.br' LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO pif_id;

  -- Se já existia, busca pelo email
  IF pif_id IS NULL THEN
    SELECT id INTO pif_id FROM clients WHERE email = 'pif@agraas.com.br';
  END IF;

  IF pif_id IS NULL THEN
    RAISE EXCEPTION 'PIF client não encontrado após insert';
  END IF;

  INSERT INTO lot_buyer_access (lot_id, buyer_client_id)
  VALUES (lot_id, pif_id)
  ON CONFLICT DO NOTHING;
END $$;
