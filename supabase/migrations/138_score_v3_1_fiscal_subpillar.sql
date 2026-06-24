-- =============================================================================
-- Migration 138 -- Score Engine v3.1: sub-pilar fiscal dentro de Rastreabilidade
-- =============================================================================
-- Objetivo: o pilar "Rastreabilidade" precisa refletir nao so a cadeia tecnica
-- (RFID/genealogia/eventos/nascimento) mas TAMBEM a cadeia documental fiscal
-- (GTA + NF-e venda + custo rastreado contabilmente).
--
-- Contexto:
--   - Score v3 (migration 123) pesa rastreabilidade em 29% do total.
--   - Apos 138: rastreabilidade_final = 0.8 * rastreabilidade_legado + 0.2 * fiscal_score
--   - fiscal_score (0-100): 50 GTA + 30 NFe venda + 20 custo contabilizado
--
-- Decisao metodologica:
--   - Nao criamos novo pilar nem alteramos pesos macro (continua 36/25/29/10).
--   - Sub-pilar fiscal e peso INTERNO da rastreabilidade -- mantem score estavel
--     na transicao e Lucas pode evoluir para pilar proprio depois.
-- =============================================================================

-- A) Adiciona fiscal_score em animal_scores
ALTER TABLE public.animal_scores
  ADD COLUMN IF NOT EXISTS fiscal_score numeric DEFAULT 0;

COMMENT ON COLUMN public.animal_scores.fiscal_score IS
  'Sub-pilar fiscal (0-100) = 50*tem_GTA + 30*venda_com_NFe + 20*custo_contabilizado. Migration 138.';

-- B) Funcao compute_fiscal_score
-- (Versao final em migration 140 -- reconhece fiscal_note_id OU fiscal_invoice_id.)
CREATE OR REPLACE FUNCTION public.compute_fiscal_score(p_animal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_gta        boolean;
  v_has_nfe_sale   boolean;
  v_has_acct_cost  boolean;
  v_score          numeric := 0;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.animal_certifications
     WHERE animal_id = p_animal_id
       AND lower(certification_name) = 'gta'
       AND lower(COALESCE(status,'active')) = 'active'
       AND (expires_at IS NULL OR expires_at >= current_date)
  ) INTO v_has_gta;
  IF v_has_gta THEN v_score := v_score + 50; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.sales
     WHERE animal_id = p_animal_id
       AND status = 'confirmed'
       AND fiscal_note_id IS NOT NULL
  ) INTO v_has_nfe_sale;
  IF v_has_nfe_sale THEN v_score := v_score + 30; END IF;

  SELECT EXISTS(
    SELECT 1
      FROM public.accounting_entries ae
      JOIN public.cost_records cr ON cr.id = ae.source_id
     WHERE ae.source_type = 'cost_record'
       AND cr.animal_id = p_animal_id
  ) INTO v_has_acct_cost;
  IF v_has_acct_cost THEN v_score := v_score + 20; END IF;

  RETURN LEAST(100, v_score);
END;
$function$;

COMMENT ON FUNCTION public.compute_fiscal_score(uuid) IS
  'Score fiscal 0-100 do animal = 50*GTA + 30*venda_NFe + 20*custo_contabilizado. Migration 138 (estendido em 140).';

-- C) Modifica calculate_agraas_score_v3 para incorporar fiscal_score
CREATE OR REPLACE FUNCTION public.calculate_agraas_score_v3(
  p_animal_id uuid,
  p_event_source text DEFAULT 'manual'::text,
  p_event_record_id uuid DEFAULT NULL::uuid,
  p_event_type text DEFAULT 'manual'::text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid; v_birth_date date; v_sex text; v_sire_id uuid; v_dam_id uuid;
  v_current_property_id uuid; v_status text; v_category text; v_age_months integer;
  v_last_weight numeric; v_prev_weight numeric;
  v_last_weight_date date; v_prev_weight_date date;
  v_app_count integer; v_active_withdrawal_count integer; v_days_since_last_app integer;
  v_has_rfid boolean; v_event_count integer; v_has_birth_event boolean;
  v_certifications_count integer;
  v_produtivo numeric := 0; v_sanidade numeric := 0; v_reprodutivo numeric := NULL;
  v_rastreabilidade_legado numeric := 0;
  v_rastreabilidade numeric := 0;
  v_fiscal_score numeric := 0;
  v_certificacoes numeric := 0;
  v_gmd numeric; v_gmd_score numeric;
  v_peso_esperado_min numeric; v_peso_esperado_max numeric;
  v_peso_ratio numeric; v_peso_score numeric;
  v_app_history_score numeric; v_withdrawal_score numeric; v_recency_score numeric;
  v_rfid_score numeric; v_genealogy_score numeric; v_events_score numeric; v_birth_score numeric;
  v_total numeric; v_score_previous numeric; v_delta_total numeric;
BEGIN
  SELECT a.client_id, a.birth_date, lower(a.sex), a.sire_animal_id,
         a.dam_animal_id, a.current_property_id, lower(a.status)
    INTO v_client_id, v_birth_date, v_sex, v_sire_id,
         v_dam_id, v_current_property_id, v_status
    FROM public.animals a WHERE a.id = p_animal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_status IN ('sold', 'vendido', 'slaughtered', 'abatido') THEN
    UPDATE public.animal_scores
       SET score_status = CASE WHEN v_status IN ('sold','vendido') THEN 'frozen_sold' ELSE 'frozen_slaughtered' END,
           algorithm_version = 'v3.1', updated_at = now()
     WHERE animal_id = p_animal_id;
    RETURN (SELECT total_score FROM public.animal_scores WHERE animal_id = p_animal_id);
  END IF;

  v_category := get_animal_category(p_animal_id);

  SELECT w.weight, w.weighing_date INTO v_last_weight, v_last_weight_date
    FROM public.weights w WHERE w.animal_id = p_animal_id
    ORDER BY w.weighing_date DESC, w.created_at DESC LIMIT 1;

  SELECT w.weight, w.weighing_date INTO v_prev_weight, v_prev_weight_date
    FROM public.weights w WHERE w.animal_id = p_animal_id
      AND w.weighing_date < v_last_weight_date
    ORDER BY w.weighing_date DESC, w.created_at DESC LIMIT 1;

  SELECT count(*) INTO v_app_count FROM public.applications WHERE animal_id = p_animal_id;
  SELECT count(*) INTO v_active_withdrawal_count FROM public.applications
   WHERE animal_id = p_animal_id AND withdrawal_end_date IS NOT NULL
     AND withdrawal_end_date >= current_date;
  SELECT (current_date - max(application_date))::integer
    INTO v_days_since_last_app FROM public.applications WHERE animal_id = p_animal_id;
  SELECT EXISTS(SELECT 1 FROM public.animal_rfids WHERE animal_id = p_animal_id) INTO v_has_rfid;
  SELECT count(*) INTO v_event_count FROM public.events WHERE animal_id = p_animal_id;
  SELECT EXISTS(SELECT 1 FROM public.events
     WHERE animal_id = p_animal_id AND lower(event_type) IN ('birth','nascimento')) INTO v_has_birth_event;
  SELECT count(*) INTO v_certifications_count FROM public.animal_certifications
   WHERE animal_id = p_animal_id AND lower(status) = 'active';

  -- PILAR PRODUTIVO
  IF v_last_weight IS NOT NULL AND v_prev_weight IS NOT NULL
     AND v_last_weight_date > v_prev_weight_date THEN
    v_gmd := (v_last_weight - v_prev_weight)
           / GREATEST(1, (v_last_weight_date - v_prev_weight_date)::numeric);
    v_gmd_score := CASE
      WHEN v_gmd < 0.0 THEN 0
      WHEN v_gmd < 0.3 THEN  0 + (v_gmd / 0.3) * 30
      WHEN v_gmd < 0.5 THEN 30 + ((v_gmd - 0.3) / 0.2) * 20
      WHEN v_gmd < 0.8 THEN 50 + ((v_gmd - 0.5) / 0.3) * 20
      WHEN v_gmd < 1.2 THEN 70 + ((v_gmd - 0.8) / 0.4) * 20
      ELSE LEAST(100, 90 + ((v_gmd - 1.2) / 0.4) * 10) END;
  ELSE v_gmd_score := NULL; END IF;

  IF v_last_weight IS NOT NULL AND v_birth_date IS NOT NULL THEN
    v_age_months := EXTRACT(YEAR FROM AGE(current_date, v_birth_date)) * 12
                  + EXTRACT(MONTH FROM AGE(current_date, v_birth_date));
    SELECT pmin, pmax INTO v_peso_esperado_min, v_peso_esperado_max
      FROM (SELECT 150::numeric AS pmin, 180::numeric AS pmax WHERE v_age_months < 6
        UNION ALL SELECT 180, 220 WHERE v_age_months BETWEEN 6 AND 9
        UNION ALL SELECT 240, 280 WHERE v_age_months BETWEEN 10 AND 14
        UNION ALL SELECT 320, 380 WHERE v_age_months BETWEEN 15 AND 20
        UNION ALL SELECT 420, 480 WHERE v_age_months BETWEEN 21 AND 26
        UNION ALL SELECT 480, 540 WHERE v_age_months BETWEEN 27 AND 32
        UNION ALL SELECT 480, 650 WHERE v_age_months > 32) bands LIMIT 1;
    IF v_peso_esperado_min IS NOT NULL THEN
      v_peso_ratio := v_last_weight / ((v_peso_esperado_min + v_peso_esperado_max) / 2);
      v_peso_score := CASE
        WHEN v_peso_ratio < 0.7 THEN 0 + (v_peso_ratio / 0.7) * 30
        WHEN v_peso_ratio < 0.9 THEN 30 + ((v_peso_ratio - 0.7) / 0.2) * 30
        WHEN v_peso_ratio < 1.1 THEN 60 + ((v_peso_ratio - 0.9) / 0.2) * 30
        ELSE LEAST(100, 90 + ((v_peso_ratio - 1.1) / 0.3) * 10) END;
    ELSE v_peso_score := NULL; END IF;
  ELSE v_peso_score := NULL; END IF;

  v_produtivo := CASE
    WHEN v_gmd_score IS NOT NULL AND v_peso_score IS NOT NULL
      THEN (v_gmd_score * 0.5) + (v_peso_score * 0.5)
    WHEN v_gmd_score IS NOT NULL THEN v_gmd_score
    WHEN v_peso_score IS NOT NULL THEN v_peso_score
    ELSE 30 END;
  v_produtivo := GREATEST(0, LEAST(100, v_produtivo));

  -- PILAR SANIDADE
  v_app_history_score := CASE
    WHEN v_app_count = 0  THEN 30
    WHEN v_app_count <= 2 THEN 50
    WHEN v_app_count <= 5 THEN 70
    WHEN v_app_count <= 10 THEN 85
    ELSE 100 END;
  v_withdrawal_score := CASE
    WHEN v_active_withdrawal_count = 0 THEN 100
    WHEN v_active_withdrawal_count = 1 THEN 50
    ELSE 0 END;
  v_recency_score := CASE
    WHEN v_days_since_last_app IS NULL THEN 0
    WHEN v_days_since_last_app <= 90  THEN 100
    WHEN v_days_since_last_app <= 180 THEN 80
    WHEN v_days_since_last_app <= 365 THEN 60
    ELSE 30 END;
  v_sanidade := (v_app_history_score * 0.5) + (v_withdrawal_score * 0.3) + (v_recency_score * 0.2);
  v_sanidade := GREATEST(0, LEAST(100, v_sanidade));

  v_reprodutivo := NULL;

  -- PILAR RASTREABILIDADE LEGADO
  v_rfid_score := CASE WHEN v_has_rfid THEN 100 ELSE 0 END;
  v_genealogy_score := CASE
    WHEN v_sire_id IS NOT NULL AND v_dam_id IS NOT NULL THEN 100
    WHEN v_sire_id IS NOT NULL OR v_dam_id IS NOT NULL THEN 50
    ELSE 0 END;
  v_events_score := CASE
    WHEN v_event_count = 0 THEN 0
    WHEN v_event_count <= 3 THEN 40
    WHEN v_event_count <= 7 THEN 70
    ELSE 100 END;
  v_birth_score := CASE WHEN v_has_birth_event THEN 100 ELSE 50 END;
  v_rastreabilidade_legado := (v_rfid_score * 0.25) + (v_genealogy_score * 0.25)
                            + (v_events_score * 0.25) + (v_birth_score * 0.25);
  v_rastreabilidade_legado := GREATEST(0, LEAST(100, v_rastreabilidade_legado));

  -- Migration 138: sub-pilar fiscal
  v_fiscal_score := public.compute_fiscal_score(p_animal_id);
  v_rastreabilidade := (v_rastreabilidade_legado * 0.8) + (v_fiscal_score * 0.2);
  v_rastreabilidade := GREATEST(0, LEAST(100, v_rastreabilidade));

  -- CERTIFICACOES
  SELECT LEAST(100, COALESCE(SUM(CASE
    WHEN lower(certification_code) LIKE '%boi-verde%' OR lower(certification_name) LIKE '%boi verde%' THEN 25
    WHEN lower(certification_code) LIKE 'br-ras%' OR lower(certification_name) LIKE '%rastreabilidade br%' THEN 25
    WHEN lower(certification_code) LIKE 'bea%' OR lower(certification_name) LIKE '%bem-estar%' OR lower(certification_name) LIKE '%gap%' THEN 25
    WHEN lower(certification_name) LIKE '%angus%' OR lower(certification_name) LIKE '%hereford%' OR lower(certification_name) LIKE '%brangus%' THEN 25
    WHEN lower(certification_code) LIKE 'hilton%' OR lower(certification_name) LIKE '%cota 481%' OR lower(certification_name) LIKE '%hilton%' THEN 30
    ELSE 10 END), 0))
  INTO v_certificacoes FROM public.animal_certifications c
  WHERE c.animal_id = p_animal_id AND lower(c.status) = 'active';
  v_certificacoes := COALESCE(v_certificacoes, 0);

  v_total := ROUND(v_produtivo * 0.36 + v_sanidade * 0.25
                 + v_rastreabilidade * 0.29 + v_certificacoes * 0.10, 2);
  v_total := GREATEST(0, LEAST(100, v_total));

  SELECT total_score INTO v_score_previous FROM public.animal_scores WHERE animal_id = p_animal_id;
  SET LOCAL session_replication_role = replica;
  INSERT INTO public.animal_scores (
    animal_id, sanitary_score, operational_score, continuity_score,
    productive_score, fiscal_score, total_score, score_status, score_version,
    algorithm_version, last_updated, updated_at
  ) VALUES (
    p_animal_id, v_sanidade, v_rastreabilidade, COALESCE(v_reprodutivo, 0),
    v_produtivo, v_fiscal_score, v_total, 'current', 'v3.1', 'v3.1', now(), now())
  ON CONFLICT (animal_id) DO UPDATE SET
    sanitary_score = EXCLUDED.sanitary_score,
    operational_score = EXCLUDED.operational_score,
    continuity_score = EXCLUDED.continuity_score,
    productive_score = EXCLUDED.productive_score,
    fiscal_score = EXCLUDED.fiscal_score,
    total_score = EXCLUDED.total_score,
    score_status = 'current', score_version = 'v3.1', algorithm_version = 'v3.1',
    last_updated = now(), updated_at = now();
  SET LOCAL session_replication_role = DEFAULT;

  v_delta_total := v_total - COALESCE(v_score_previous, 0);
  IF ABS(v_delta_total) >= 0.01 THEN
    INSERT INTO public.score_audit_log (
      animal_id, client_id, property_id, event_source, event_type, event_record_id,
      score_previous, score_new, delta_total, algorithm_version)
    VALUES (p_animal_id, v_client_id, v_current_property_id,
      p_event_source, p_event_type, p_event_record_id,
      v_score_previous, v_total, v_delta_total, 'v3.1');
  END IF;

  PERFORM public.refresh_animal_passport(p_animal_id);
  IF v_current_property_id IS NOT NULL THEN
    PERFORM public.calculate_farm_score(v_current_property_id);
  END IF;
  IF v_client_id IS NOT NULL THEN
    PERFORM public.calculate_producer_score(v_client_id);
  END IF;

  RETURN v_total;
END;
$function$;

COMMENT ON FUNCTION public.calculate_agraas_score_v3(uuid, text, uuid, text) IS
  'Score Engine v3.1 -- Migration 138. Rastreabilidade = 0.8*legado + 0.2*fiscal_score. Pesos macro mantidos.';

-- D) Recompute todos animal_scores de animais ativos
DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.animals
     WHERE lower(COALESCE(status,'ativo')) NOT IN ('sold','vendido','slaughtered','abatido','inactive','inativo')
  LOOP
    PERFORM public.calculate_agraas_score_v3(r.id, 'migration_138', NULL, 'recompute_fiscal_subpillar');
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Migration 138: calculate_agraas_score_v3 recomputado para % animais ativos.', v_count;
END $$;
