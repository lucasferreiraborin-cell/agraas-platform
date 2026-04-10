-- Migration 100: Auditoria — 1 ajuste inserido demo

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_id    uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- Atualiza snapshot mais recente para demonstrar 1 ajuste real detectado
  SELECT id INTO v_id FROM audit_snapshot
   WHERE client_id = v_lucas
   ORDER BY snapshot_date DESC LIMIT 1;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM audit_snapshot
    ORDER BY snapshot_date DESC LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE audit_snapshot
       SET adjustments_inserted = 1
     WHERE id = v_id;
  END IF;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 100: 1 ajuste demo inserido em audit_snapshot';
END $$;
