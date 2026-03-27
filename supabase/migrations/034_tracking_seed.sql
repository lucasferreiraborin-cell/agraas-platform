-- Migration 034: Seed shipment tracking checkpoints for EXP-2026-SAU-001
-- Looks up lot by numero_contrato (not name), deletes existing to avoid dupes

DO $$
DECLARE
  v_lot_id   uuid;
  v_client_id uuid;
BEGIN
  SELECT id, client_id
    INTO v_lot_id, v_client_id
    FROM lots
   WHERE numero_contrato = 'EXP-2026-SAU-001'
   LIMIT 1;

  IF v_lot_id IS NULL THEN
    RAISE NOTICE 'Lot EXP-2026-SAU-001 not found — skipping tracking seed';
    RETURN;
  END IF;

  -- Remove stale checkpoints from prior migration attempts
  DELETE FROM shipment_tracking WHERE lot_id = v_lot_id;

  -- 3 confirmed checkpoints
  INSERT INTO shipment_tracking
    (lot_id, client_id, stage, timestamp, animals_confirmed, animals_lost, loss_cause, location_name)
  VALUES
    (v_lot_id, v_client_id, 'fazenda',      '2026-03-15T08:00:00Z', 500, 0, NULL,                     'Fazenda Santa Cruz, MS'),
    (v_lot_id, v_client_id, 'porto_origem', '2026-04-01T14:00:00Z', 498, 2, 'Stress de transporte',   'Porto de Santos, SP'),
    (v_lot_id, v_client_id, 'navio',        '2026-05-05T09:00:00Z', 498, 0, NULL,                     'Atlântico Sul — em rota');

  RAISE NOTICE 'Tracking seed OK — lot_id=%', v_lot_id;
END $$;
