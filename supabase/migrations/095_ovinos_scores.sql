-- Migration 095: Ovinos — pesos variados + recálculo de scores

DO $$
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ Atualiza pesos para gerar variação de scores ═══════════════════════════
  UPDATE livestock_species SET weight_kg = 55 WHERE internal_code = 'CP-001';
  UPDATE livestock_species SET weight_kg = 42 WHERE internal_code = 'CP-002';
  UPDATE livestock_species SET weight_kg = 71 WHERE internal_code = 'OV-001';
  UPDATE livestock_species SET weight_kg = 58 WHERE internal_code = 'OV-002';
  UPDATE livestock_species SET weight_kg = 78 WHERE internal_code = 'OV-003';
  UPDATE livestock_species SET weight_kg = 49 WHERE internal_code = 'OV-004';
  UPDATE livestock_species SET weight_kg = 63 WHERE internal_code = 'OV-005';
  UPDATE livestock_species SET weight_kg = 47 WHERE internal_code = 'OV-006';

  -- Define scores variados diretamente (caso a função calculate_livestock_score
  -- não atualize automaticamente via trigger)
  UPDATE livestock_species SET score = 84 WHERE internal_code = 'OV-001';
  UPDATE livestock_species SET score = 76 WHERE internal_code = 'OV-002';
  UPDATE livestock_species SET score = 91 WHERE internal_code = 'OV-003';
  UPDATE livestock_species SET score = 68 WHERE internal_code = 'OV-004';
  UPDATE livestock_species SET score = 73 WHERE internal_code = 'OV-005';
  UPDATE livestock_species SET score = 65 WHERE internal_code = 'OV-006';
  UPDATE livestock_species SET score = 88 WHERE internal_code = 'CP-001';
  UPDATE livestock_species SET score = 59 WHERE internal_code = 'CP-002';

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 095: scores variados ovinos/caprinos';
END $$;
