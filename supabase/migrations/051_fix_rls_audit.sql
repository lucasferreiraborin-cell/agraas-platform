-- Migration 051: Corrige 4 problemas de RLS identificados em auditoria (01/04/2026)
--
-- P1/P2 — Backfill client_id NULL em animals e properties → Lucas
-- P3     — shipment_tracking: adiciona OR is_admin() na policy SELECT/INSERT
-- P4     — lot_buyer_access: corrige policy para role=buyer

-- ── P1: Backfill animals com client_id NULL ──────────────────────────────────

UPDATE animals
SET client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9'
WHERE client_id IS NULL;

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM animals WHERE client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  RAISE NOTICE 'P1 OK — animais vinculados ao Lucas: %', v_count;
END $$;

-- ── P2: Backfill properties com client_id NULL ───────────────────────────────

UPDATE properties
SET client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9'
WHERE client_id IS NULL;

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM properties WHERE client_id = '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  RAISE NOTICE 'P2 OK — propriedades vinculadas ao Lucas: %', v_count;
END $$;

-- ── P3: shipment_tracking — adiciona is_admin() nas policies ─────────────────

DROP POLICY IF EXISTS "client_own_shipment_tracking" ON shipment_tracking;

CREATE POLICY "client_own_shipment_tracking"
  ON shipment_tracking
  FOR SELECT
  USING (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS "client_own_insert_shipment_tracking" ON shipment_tracking;

CREATE POLICY "client_own_insert_shipment_tracking"
  ON shipment_tracking
  FOR INSERT
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DO $$ BEGIN
  RAISE NOTICE 'P3 OK — shipment_tracking policies atualizadas com is_admin()';
END $$;

-- ── P4: lot_buyer_access — corrige policy para role=buyer ────────────────────

DROP POLICY IF EXISTS "buyer_lot_access_select" ON lot_buyer_access;

CREATE POLICY "buyer_lot_access_select"
  ON lot_buyer_access
  FOR SELECT
  USING (
    is_admin()
    OR buyer_client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'P4 OK — lot_buyer_access policy corrigida para role=buyer';
END $$;
