-- Rollback migration 121
-- Restaura a versão antiga (broken — referencia animal_events removida).
-- Use APENAS em incidente de regressão; o real fix é mantido em 121_up.

BEGIN;

DROP FUNCTION IF EXISTS public.refresh_animal_passport(uuid);

CREATE OR REPLACE FUNCTION public.refresh_animal_passport(p_animal_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
declare
  v_identity jsonb;
  v_timeline jsonb;
  v_health jsonb;
  v_score jsonb;
  v_certifications jsonb;
  v_ownership jsonb;
begin
  select to_jsonb(a.*) into v_identity from public.animals a where a.id = p_animal_id;

  select coalesce(jsonb_agg(jsonb_build_object('event_type', ev.event_type)), '[]'::jsonb)
  into v_timeline
  from public.animal_events ev where ev.animal_id = p_animal_id;  -- BROKEN

  insert into public.agraas_master_passport_cache (
    animal_id, identity_json, timeline_json, health_json, score_json,
    certifications_json, ownership_json, last_generated_at
  )
  values (
    p_animal_id, v_identity, v_timeline, '{}'::jsonb, '{}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, now()
  )
  on conflict (animal_id) do update set last_generated_at = now();
end;
$function$;

COMMIT;
