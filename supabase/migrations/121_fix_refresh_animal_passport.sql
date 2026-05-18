-- Migration 121: refresh_animal_passport() reescrita para usar tabelas atuais
--
-- Função antiga (definida em migrations anteriores) referenciava:
--   • public.animal_events  → REMOVIDA em 049_drop_legacy_event_tables.sql
--   • public.weight_records → existe mas com apenas 5 rows (legacy/abandonada);
--                              tabela ativa é public.weights (190 rows)
--
-- Resultado: função quebrada → agraas_master_passport_cache ficou stale/vazio
-- pra FSJBE (e qualquer cliente novo que precisar refresh).
--
-- BÔNUS: a versão antiga NÃO populava `client_id` no cache (coluna existe).
-- Como /painel filtra `WHERE client_id = <user_client>`, mesmo se a função
-- rodasse, /painel não veria as linhas. Esta versão corrige.

BEGIN;

DROP FUNCTION IF EXISTS public.refresh_animal_passport(uuid);

CREATE OR REPLACE FUNCTION public.refresh_animal_passport(p_animal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_identity         jsonb;
  v_timeline         jsonb;
  v_health           jsonb;
  v_score            jsonb;
  v_certifications   jsonb;
  v_ownership        jsonb;
  v_client_id        uuid;
BEGIN
  -- 1) Identity + client_id
  SELECT to_jsonb(a.*), a.client_id
    INTO v_identity, v_client_id
    FROM public.animals a
   WHERE a.id = p_animal_id;

  -- 2) Timeline ← agora vem de public.events (não animal_events)
  --    Mapeamento de campos:
  --      event_timestamp     → event_date
  --      related_entity_type → não existe em events; deixa null
  --      related_entity_id   → idem
  --      payload             → idem (events não tem coluna payload)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'event_type',          ev.event_type,
        'event_timestamp',     ev.event_date,
        'notes',               ev.notes,
        'performed_by',        ev.performed_by,
        'source',              ev.source,
        'document_source',     ev.document_source
      )
      ORDER BY ev.event_date
    ),
    '[]'::jsonb
  )
  INTO v_timeline
  FROM public.events ev
  WHERE ev.animal_id = p_animal_id;

  -- 3) Health ← agora usa public.weights (não weight_records)
  --    weighing_date em vez de record_date
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

  -- 4) Score (intacto)
  SELECT COALESCE(to_jsonb(s.*), '{}'::jsonb)
    INTO v_score
    FROM public.animal_scores s
   WHERE s.animal_id = p_animal_id;

  IF v_score IS NULL THEN v_score := '{}'::jsonb; END IF;

  -- 5) Certifications (intacto)
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

  -- 6) Ownership (intacto)
  SELECT jsonb_build_object(
    'current_property_id', a.current_property_id,
    'status',              a.status
  )
  INTO v_ownership
  FROM public.animals a
  WHERE a.id = p_animal_id;

  -- 7) UPSERT no cache — AGORA POPULANDO client_id (era o bug bônus)
  INSERT INTO public.agraas_master_passport_cache (
    animal_id,
    client_id,
    identity_json,
    timeline_json,
    health_json,
    score_json,
    certifications_json,
    ownership_json,
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
    last_generated_at   = now();
END;
$function$;

-- ── Invoca pros 5 animais FSJBE + 10 animais Fazenda Mentoria ──────
DO $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN
    SELECT id FROM public.animals
     WHERE client_id IN (
       '00000000-0000-0000-0003-000000000001',  -- FSJBE
       '00000000-0000-0000-0099-000000000001'   -- Fazenda Mentoria IZ-SP
     )
  LOOP
    PERFORM public.refresh_animal_passport(v_id);
  END LOOP;
END $$;

COMMIT;
