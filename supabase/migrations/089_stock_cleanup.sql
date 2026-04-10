-- Migration 089: Cleanup nomes de lote + seed movimentações + quantity_available

DO $$
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Renomeia lotes de teste ═══════════════════════════════════════════
  UPDATE stock_batches SET batch_number = 'IVE-FSJBE-2025-001' WHERE batch_number = 'TESTE-001';
  UPDATE stock_batches SET batch_number = 'IVE-FSJBE-2026-001' WHERE batch_number = 'LOT123';
  UPDATE stock_batches SET batch_number = 'VAC-BRU-2026-001'  WHERE batch_number = 'LOTE-DEMO-001';
  UPDATE stock_batches SET batch_number = 'VIT-ADE-2026-001'  WHERE batch_number = 'LOTE-VIT-001';
  UPDATE stock_batches SET batch_number = 'VAC-BRU-2027-001'  WHERE batch_number = 'LOTE-VAC-003';
  UPDATE stock_batches SET batch_number = 'IVE-FSJBE-2027-001' WHERE batch_number = 'LOTE-IVE-002';

  -- ═══ 2. Backfill quantity_available = quantity onde NULL ══════════════════
  UPDATE stock_batches SET quantity_available = quantity WHERE quantity_available IS NULL;

  SET LOCAL session_replication_role = DEFAULT;
END $$;
