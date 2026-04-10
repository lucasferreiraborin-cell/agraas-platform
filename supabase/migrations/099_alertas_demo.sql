-- Migration 099: Alertas — fix produto IVE + 1 alerta IA demo SAU-003

DO $$
DECLARE
  v_lucas    uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_fsjbe    uuid := '00000000-0000-0000-0003-000000000001';
  v_sau3     uuid;
  v_sau3_cli uuid;
  v_iverm    uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Garante produto Ivermectina vinculado ao lote IVE-FSJBE-2027-001 ═══
  -- Localiza o lote
  SELECT product_id INTO v_iverm
    FROM stock_batches WHERE batch_number = 'IVE-FSJBE-2027-001' LIMIT 1;

  IF v_iverm IS NULL THEN
    -- Lote sem product_id: cria/usa Ivermectina genérica para FSJBE
    SELECT id INTO v_iverm FROM products
     WHERE client_id = v_fsjbe AND name ILIKE 'ivermectina%' LIMIT 1;
    IF v_iverm IS NULL THEN
      INSERT INTO products (client_id, name, category, unit, withdrawal_days, active)
      VALUES (v_fsjbe, 'Ivermectina', 'medicamento', 'mL', 35, true)
      RETURNING id INTO v_iverm;
    END IF;
    UPDATE stock_batches
       SET product_id = v_iverm
     WHERE batch_number = 'IVE-FSJBE-2027-001';
  ELSE
    -- Lote tem product_id: garante que o produto tem nome
    UPDATE products SET name = 'Ivermectina'
     WHERE id = v_iverm AND (name IS NULL OR name = '' OR name = '-');
  END IF;

  -- ═══ 2. Seed 1 alerta IA preditivo para SAU-003 ════════════════════════════
  SELECT id, client_id INTO v_sau3, v_sau3_cli FROM animals
   WHERE internal_code = 'SAU-003' AND client_id = v_lucas LIMIT 1;

  IF v_sau3 IS NOT NULL THEN
    -- Limpa alertas demo anteriores para SAU-003 nas últimas 24h
    DELETE FROM ai_predictions
     WHERE animal_id = v_sau3
       AND created_at >= (now() - interval '24 hours');

    INSERT INTO ai_predictions
      (animal_id, client_id, risk_level, alerts, recommendations, predicted_score_30d, created_at)
    VALUES (
      v_sau3, v_sau3_cli, 'medium',
      '["Variação de peso atípica detectada — monitoramento recomendado"]'::jsonb,
      '["Aumentar frequência de pesagens","Avaliação veterinária preventiva"]'::jsonb,
      75,
      now() - interval '2 hours'
    );
  END IF;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 099: alertas — produto Ivermectina + 1 alerta IA SAU-003';
END $$;
