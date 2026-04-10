-- Migration 096: Aves — datas de alojamento realistas

DO $$
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- FRG-2025-001 "Em crescimento" → alojado há ~25 dias
  UPDATE poultry_batches
     SET housing_date = (CURRENT_DATE - INTERVAL '25 days')::date
   WHERE batch_code = 'FRG-2025-001';

  -- FRG-2025-002 "Pronto para abate" → alojado há ~42 dias
  UPDATE poultry_batches
     SET housing_date = (CURRENT_DATE - INTERVAL '42 days')::date
   WHERE batch_code = 'FRG-2025-002';

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 096: housing_date corrigido em FRG-2025-001 e FRG-2025-002';
END $$;
