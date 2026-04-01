-- Migration 048: Score agrícola por fazenda — função calculate_farm_score(farm_id uuid)
-- 4 dimensões × 25 pts = 100 pts máximo
-- Dimensão Continuidade: 0 safras=0, 1=20, 2=23, 3+=25

CREATE OR REPLACE FUNCTION calculate_farm_score(p_farm_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_farm            farms_agriculture%ROWTYPE;

  -- Rastreabilidade
  v_has_car         boolean;
  v_total_fields    integer;
  v_fields_polygon  integer;
  v_score_rastr     numeric;

  -- Fiscal
  v_total_inputs    integer;
  v_inputs_nfe      integer;
  v_score_fiscal    numeric;

  -- Operacional
  v_total_ships     integer;
  v_ships_tracked   integer;
  v_score_oper      numeric;

  -- Continuidade
  v_seasons         integer;
  v_score_cont      numeric;

  v_total           integer;
BEGIN
  -- Carrega fazenda
  SELECT * INTO v_farm FROM farms_agriculture WHERE id = p_farm_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- ── Rastreabilidade (0–25) ────────────────────────────────────────────────
  -- CAR ativo = 15 pts
  -- Proporção de talhões com polígono = até 10 pts
  v_has_car := (v_farm.car_number IS NOT NULL AND trim(v_farm.car_number) <> '');

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE polygon_coordinates IS NOT NULL AND polygon_coordinates != 'null'::jsonb)
  INTO v_total_fields, v_fields_polygon
  FROM crop_fields
  WHERE farm_id = p_farm_id;

  v_score_rastr :=
    (CASE WHEN v_has_car THEN 15 ELSE 0 END)
    + (CASE WHEN v_total_fields > 0 THEN (v_fields_polygon::numeric / v_total_fields) * 10 ELSE 0 END);

  -- ── Fiscal (0–25) ─────────────────────────────────────────────────────────
  -- Proporção de insumos com NF-e vinculada × 25
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE nfe_key IS NOT NULL AND trim(nfe_key) <> '')
  INTO v_total_inputs, v_inputs_nfe
  FROM crop_inputs ci
  JOIN crop_fields cf ON cf.id = ci.field_id
  WHERE cf.farm_id = p_farm_id;

  v_score_fiscal :=
    CASE WHEN v_total_inputs > 0 THEN (v_inputs_nfe::numeric / v_total_inputs) * 25 ELSE 0 END;

  -- ── Operacional (0–25) ────────────────────────────────────────────────────
  -- Proporção de embarques com ≥1 checkpoint × 25
  SELECT
    COUNT(DISTINCT cs.id),
    COUNT(DISTINCT cs.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM crop_shipment_tracking cst WHERE cst.shipment_id = cs.id
      )
    )
  INTO v_total_ships, v_ships_tracked
  FROM crop_shipments cs
  JOIN crop_fields cf ON cf.id = cs.field_id
  WHERE cf.farm_id = p_farm_id;

  v_score_oper :=
    CASE WHEN v_total_ships > 0 THEN (v_ships_tracked::numeric / v_total_ships) * 25 ELSE 0 END;

  -- ── Continuidade (0–25) ───────────────────────────────────────────────────
  -- Número de safras distintas registradas nos talhões
  SELECT COUNT(DISTINCT crop_season)
  INTO v_seasons
  FROM crop_fields
  WHERE farm_id = p_farm_id AND crop_season IS NOT NULL AND trim(crop_season) <> '';

  v_score_cont :=
    CASE
      WHEN v_seasons = 0 THEN 0
      WHEN v_seasons = 1 THEN 20
      WHEN v_seasons = 2 THEN 23
      ELSE 25
    END;

  -- ── Total ─────────────────────────────────────────────────────────────────
  v_total := LEAST(100, GREATEST(0,
    ROUND(v_score_rastr + v_score_fiscal + v_score_oper + v_score_cont)
  ));

  RETURN v_total;
END;
$$;

-- Permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION calculate_farm_score(uuid) TO authenticated;
