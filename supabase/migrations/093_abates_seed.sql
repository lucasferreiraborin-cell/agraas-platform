-- Migration 093: Abates seed + SIF + cleanup nome frigorífico

DO $$
DECLARE
  v_lucas    uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_jbs      uuid;
  v_marfrig  uuid;
  v_sau1 uuid; v_sau2 uuid; v_sau3 uuid; v_sau4 uuid;
  v_has_sif  boolean;
  v_has_slhid boolean;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Adiciona coluna sif_number se não existir ═══════════════════════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'slaughter_records' AND column_name = 'sif_number'
  ) INTO v_has_sif;
  IF NOT v_has_sif THEN
    EXECUTE 'ALTER TABLE slaughter_records ADD COLUMN sif_number text';
  END IF;

  -- ═══ 2. Renomeia "Frigorífico Teste" → "JBS Goiânia — Unidade Goiás" ════════
  -- 2a. Tabela slaughterhouses (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slaughterhouses') THEN
    UPDATE slaughterhouses SET name = 'JBS Goiânia — Unidade Goiás'
     WHERE name ILIKE '%teste%' OR name = 'Frigorífico Teste';
  END IF;

  -- 2b. Coluna texto slaughter_records.slaughterhouse (legacy)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'slaughter_records' AND column_name = 'slaughterhouse'
  ) THEN
    UPDATE slaughter_records SET slaughterhouse = 'JBS Goiânia — Unidade Goiás'
     WHERE slaughterhouse ILIKE '%teste%' OR slaughterhouse = 'Frigorífico Teste';
  END IF;

  -- ═══ 3. Garante slaughterhouses JBS e Marfrig (se a tabela existir) ═════════
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'slaughter_records' AND column_name = 'slaughterhouse_id'
  ) INTO v_has_slhid;

  IF v_has_slhid AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slaughterhouses') THEN
    -- JBS
    SELECT id INTO v_jbs FROM slaughterhouses WHERE name = 'JBS Goiânia — Unidade Goiás' LIMIT 1;
    IF v_jbs IS NULL THEN
      EXECUTE 'INSERT INTO slaughterhouses (name) VALUES ($1) RETURNING id'
        INTO v_jbs USING 'JBS Goiânia — Unidade Goiás';
    END IF;
    -- Marfrig
    SELECT id INTO v_marfrig FROM slaughterhouses WHERE name ILIKE 'Marfrig Jata%' LIMIT 1;
    IF v_marfrig IS NULL THEN
      EXECUTE 'INSERT INTO slaughterhouses (name) VALUES ($1) RETURNING id'
        INTO v_marfrig USING 'Marfrig Jataí';
    END IF;
  END IF;

  -- ═══ 4. Lookup animais SAU-001..004 ════════════════════════════════════════
  SELECT id INTO v_sau1 FROM animals WHERE internal_code = 'SAU-001' AND client_id = v_lucas LIMIT 1;
  SELECT id INTO v_sau2 FROM animals WHERE internal_code = 'SAU-002' AND client_id = v_lucas LIMIT 1;
  SELECT id INTO v_sau3 FROM animals WHERE internal_code = 'SAU-003' AND client_id = v_lucas LIMIT 1;
  SELECT id INTO v_sau4 FROM animals WHERE internal_code = 'SAU-004' AND client_id = v_lucas LIMIT 1;

  -- Limpa abates demo SAU prévios
  DELETE FROM slaughter_records WHERE animal_id IN (v_sau1, v_sau2, v_sau3, v_sau4);

  -- ═══ 5. Insere 4 abates demo ════════════════════════════════════════════════
  -- Usa formato dinâmico para suportar slaughterhouse_id ou slaughterhouse text
  IF v_sau1 IS NOT NULL THEN
    IF v_has_slhid THEN
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau1, v_jbs, '2026-03-20'::date, 265, 'A', 'SIF-1234';
    ELSE
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse, slaughter_date, carcass_weight_kg, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau1, 'JBS Goiânia — Unidade Goiás', '2026-03-20'::date, 265, 'A', 'SIF-1234';
    END IF;
  END IF;

  IF v_sau2 IS NOT NULL THEN
    IF v_has_slhid THEN
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau2, v_jbs, '2026-03-20'::date, 272, 'A', 'SIF-1234';
    ELSE
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse, slaughter_date, carcass_weight_kg, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau2, 'JBS Goiânia — Unidade Goiás', '2026-03-20'::date, 272, 'A', 'SIF-1234';
    END IF;
  END IF;

  IF v_sau3 IS NOT NULL THEN
    IF v_has_slhid THEN
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau3, v_marfrig, '2026-03-25'::date, 303, 'A', 'SIF-2876';
    ELSE
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse, slaughter_date, carcass_weight_kg, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau3, 'Marfrig Jataí', '2026-03-25'::date, 303, 'A', 'SIF-2876';
    END IF;
  END IF;

  IF v_sau4 IS NOT NULL THEN
    IF v_has_slhid THEN
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau4, v_marfrig, '2026-03-25'::date, 259, 'B', 'SIF-2876';
    ELSE
      EXECUTE 'INSERT INTO slaughter_records (client_id, animal_id, slaughterhouse, slaughter_date, carcass_weight_kg, classification, sif_number) VALUES ($1,$2,$3,$4,$5,$6,$7)'
        USING v_lucas, v_sau4, 'Marfrig Jataí', '2026-03-25'::date, 259, 'B', 'SIF-2876';
    END IF;
  END IF;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 093: abates SAU + SIF + cleanup frigorífico';
END $$;
