-- =============================================================================
-- Migration 137 — Dimensão fiscal no passaporte do animal
-- =============================================================================
-- Objetivo: passaporte deixa de ser "só animal" e passa a refletir custo real
-- (NF-e de insumos + lançamentos contábeis) + GTA + venda + ROI projetado.
--
-- Contexto (auditoria 2026-06-24):
--   - /passaporte/[agraas_id] hoje ignora completamente fiscal/custo.
--   - cliente JBS pergunta "qual o ROI deste boi?" -> nao tem resposta.
--   - Lucas: "tudo conversa entre si, dado real, zero invencao".
--
-- Decisoes:
--   - fiscal_json e COMPUTADO em refresh_animal_passport (single source of truth)
--   - cost_per_arroba usa ultimo peso de weights (nao NEW; refresh e funcao, nao trigger)
--   - ROI projetado = (preco_arroba_atual * peso_em_@_atual - custo_total) / custo_total
--   - sale = ultima venda confirmada (status='confirmed')
-- =============================================================================

-- A) Adiciona coluna fiscal_json em agraas_master_passport_cache
ALTER TABLE public.agraas_master_passport_cache
  ADD COLUMN IF NOT EXISTS fiscal_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.agraas_master_passport_cache.fiscal_json IS
  'Dimensao fiscal/financeira do passaporte: cost_summary, cost_per_arroba, gta_records, sale, roi_projected. Populado por refresh_animal_passport.';

-- B) Reescreve refresh_animal_passport adicionando bloco fiscal
CREATE OR REPLACE FUNCTION public.refresh_animal_passport(p_animal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_identity         jsonb;
  v_timeline         jsonb;
  v_health           jsonb;
  v_score            jsonb;
  v_certifications   jsonb;
  v_ownership        jsonb;
  v_fiscal           jsonb;
  v_client_id        uuid;
  v_last_weight      numeric;
  v_cotacao_arroba   numeric;
BEGIN
  -- 1) Identity + client_id
  SELECT to_jsonb(a.*), a.client_id
    INTO v_identity, v_client_id
    FROM public.animals a
   WHERE a.id = p_animal_id;

  -- 2) Timeline
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_type',          ev.event_type,
        'event_timestamp',     ev.event_date,
        'notes',                ev.notes,
        'performed_by',         ev.performed_by,
        'source',               ev.source,
        'document_source',      ev.document_source
      )
      ORDER BY ev.event_date
    ),
    '[]'::jsonb
  )
  INTO v_timeline
  FROM public.events ev
  WHERE ev.animal_id = p_animal_id;

  -- 3) Health
  SELECT jsonb_build_object(
    'applications', (
      SELECT COUNT(*) FROM public.applications a WHERE a.animal_id = p_animal_id
    ),
    'active_withdrawal', (
      SELECT COUNT(*) FROM public.applications a
       WHERE a.animal_id = p_animal_id
         AND a.withdrawal_end_date IS NOT NULL
         AND a.withdrawal_end_date >= current_date
    ),
    'last_weight', (
      SELECT w.weight
        FROM public.weights w
       WHERE w.animal_id = p_animal_id
       ORDER BY w.weighing_date DESC, w.created_at DESC
       LIMIT 1
    ),
    'last_weight_date', (
      SELECT w.weighing_date
        FROM public.weights w
       WHERE w.animal_id = p_animal_id
       ORDER BY w.weighing_date DESC, w.created_at DESC
       LIMIT 1
    )
  )
  INTO v_health;

  -- Captura ultimo peso para calculos fiscais (peso vivo em kg -> @ = kg/15)
  SELECT w.weight INTO v_last_weight
    FROM public.weights w
   WHERE w.animal_id = p_animal_id
   ORDER BY w.weighing_date DESC, w.created_at DESC
   LIMIT 1;

  -- Cotacao da arroba (R$/@) -- fallback 250,00 se setting ausente
  SELECT COALESCE(NULLIF(value, '')::numeric, 250.00) INTO v_cotacao_arroba
    FROM public.platform_settings
   WHERE key = 'cotacao_arroba'
   LIMIT 1;
  IF v_cotacao_arroba IS NULL THEN v_cotacao_arroba := 250.00; END IF;

  -- 4) Score
  SELECT COALESCE(to_jsonb(s.*), '{}'::jsonb)
    INTO v_score
    FROM public.animal_scores s
   WHERE s.animal_id = p_animal_id;
  IF v_score IS NULL THEN v_score := '{}'::jsonb; END IF;

  -- 5) Certifications
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'certification_code', c.certification_code,
        'certification_name', c.certification_name,
        'status',             c.status,
        'issued_at',          c.issued_at
      )
    ),
    '[]'::jsonb
  )
  INTO v_certifications
  FROM public.animal_certifications c
  WHERE c.animal_id = p_animal_id;

  -- 6) Ownership
  SELECT jsonb_build_object(
    'current_property_id', a.current_property_id,
    'status',              a.status
  )
  INTO v_ownership
  FROM public.animals a
  WHERE a.id = p_animal_id;

  -- 7) Fiscal -- NOVO BLOCO (migration 137)
  --    cost_summary: agregado de custo (input + labor + other = total)
  --    cost_per_arroba: total_cost / (peso_kg / 15) -- referencia JBS/frigorifico
  --    gta_records: certificacoes com nome 'GTA' (Guia de Transito Animal)
  --    sale: ultima venda confirmada (status='confirmed')
  --    roi_projected: ((cotacao_@ * peso_em_@) - custo) / custo * 100
  SELECT jsonb_build_object(
    'cost_summary', (
      SELECT to_jsonb(acs.*)
        FROM public.animal_cost_summary acs
       WHERE acs.animal_id = p_animal_id
    ),
    'cost_per_arroba', (
      SELECT CASE
        WHEN v_last_weight IS NULL OR v_last_weight <= 0 THEN NULL
        ELSE ROUND(acs.total_cost / NULLIF(v_last_weight / 15.0, 0), 2)
      END
      FROM public.animal_cost_summary acs
      WHERE acs.animal_id = p_animal_id
    ),
    'gta_records', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ac.*)), '[]'::jsonb)
        FROM public.animal_certifications ac
       WHERE ac.animal_id = p_animal_id
         AND lower(ac.certification_name) = 'gta'
    ),
    'sale', (
      SELECT to_jsonb(s.*)
        FROM public.sales s
       WHERE s.animal_id = p_animal_id
         AND s.status = 'confirmed'
       ORDER BY s.sale_date DESC NULLS LAST
       LIMIT 1
    ),
    'roi_projected', (
      SELECT CASE
        WHEN acs.total_cost > 0 AND v_last_weight IS NOT NULL AND v_last_weight > 0
          THEN ROUND(
            ((v_cotacao_arroba * (v_last_weight / 15.0)) - acs.total_cost)
            / acs.total_cost * 100, 2)
        ELSE NULL
      END
      FROM public.animal_cost_summary acs
      WHERE acs.animal_id = p_animal_id
    ),
    'cotacao_arroba_ref', v_cotacao_arroba,
    'computed_at', now()
  )
  INTO v_fiscal;

  -- 8) UPSERT no cache
  INSERT INTO public.agraas_master_passport_cache (
    animal_id,
    client_id,
    identity_json,
    timeline_json,
    health_json,
    score_json,
    certifications_json,
    ownership_json,
    fiscal_json,
    last_generated_at
  )
  VALUES (
    p_animal_id,
    v_client_id,
    COALESCE(v_identity, '{}'::jsonb),
    COALESCE(v_timeline, '[]'::jsonb),
    COALESCE(v_health, '{}'::jsonb),
    COALESCE(v_score, '{}'::jsonb),
    COALESCE(v_certifications, '[]'::jsonb),
    COALESCE(v_ownership, '{}'::jsonb),
    COALESCE(v_fiscal, '{}'::jsonb),
    now()
  )
  ON CONFLICT (animal_id) DO UPDATE SET
    client_id           = EXCLUDED.client_id,
    identity_json       = EXCLUDED.identity_json,
    timeline_json       = EXCLUDED.timeline_json,
    health_json         = EXCLUDED.health_json,
    score_json          = EXCLUDED.score_json,
    certifications_json = EXCLUDED.certifications_json,
    ownership_json      = EXCLUDED.ownership_json,
    fiscal_json         = EXCLUDED.fiscal_json,
    last_generated_at   = now();
END;
$function$;

COMMENT ON FUNCTION public.refresh_animal_passport(uuid) IS
  'Recomputa cache do passaporte (identity + timeline + health + score + cert + ownership + fiscal). Migration 137 adicionou fiscal_json com cost_summary, cost_per_arroba, GTA, sale e ROI projetado vs cotacao atual da arroba.';

-- C) Force recompute para todos os animais ativos
DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.animals
     WHERE lower(COALESCE(status,'ativo')) NOT IN ('sold','vendido','slaughtered','abatido','inactive','inativo')
  LOOP
    PERFORM public.refresh_animal_passport(r.id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Migration 137: refresh_animal_passport executado em % animais ativos.', v_count;
END $$;
