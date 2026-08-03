-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 158 — Guard de posse em calculate_farm_score (leak/escrita cross-tenant)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Origem: achado do security-rls-auditor em 03/08/2026.
--
-- BURACO REAL (pré-existente): public.calculate_farm_score(p_property_id uuid) é
--   SECURITY DEFINER e NÃO tinha guard de posse. Um usuário AUTHENTICATED qualquer
--   podia chamar POST /rest/v1/rpc/calculate_farm_score com o UUID de uma
--   propriedade de OUTRO tenant e:
--     (a) receber o score agregado do rebanho alheio (AVG(total_score)) — leak de KPI;
--     (b) disparar um INSERT/UPDATE em farm_scores com o client_id da propriedade
--         alheia (ON CONFLICT ... DO UPDATE) — escrita não-autorizada cross-tenant.
--
--   As funções-irmãs (generate_lcdpr_txt, register_lcdpr_export,
--   create_stock_from_fiscal_note) já receberam este guard na migration 155.
--   calculate_farm_score foi EXPLICITAMENTE deixada de fora (ver comentário da 155,
--   bloco 🟡, ~linha 432) por ser chamada como authenticated pelo front — mas o que
--   faltava não era o REVOKE (anon já caiu na 156 via REVOKE FROM PUBLIC), e sim o
--   GUARD DE POSSE contra authenticated malicioso. Esta migration fecha isso.
--
-- POR QUE O GUARD NÃO QUEBRA NENHUM CALLER LEGÍTIMO/INTERNO:
--   O predicado `v_client_id <> get_my_client_id() AND NOT is_admin()` só DISPARA
--   quando get_my_client_id() é NÃO-NULO e difere do dono real da propriedade.
--   Em Postgres, `<uuid real> <> NULL` avalia para NULL, e um IF com condição NULL
--   NÃO executa o corpo. Logo, todos os caminhos abaixo passam intactos:
--     · TRIGGER  → calculate_agraas_score_v3 (migration 138, linha 279) faz
--                  PERFORM calculate_farm_score(v_current_property_id). Quando um
--                  usuário legítimo mexe no PRÓPRIO animal, get_my_client_id() é o
--                  dono da propriedade ⇒ `id <> id` = false ⇒ não dispara.
--     · SERVICE_ROLE / recompute em DO-block de migration ⇒ auth.uid() NULL ⇒
--                  get_my_client_id() NULL ⇒ `uuid_real <> NULL` = NULL ⇒ não dispara.
--     · ADMIN     ⇒ get_my_client_id() = NULL (só casa role='client'), mas
--                  is_admin() = true; o predicado curto-circuita para NULL/false ⇒
--                  não dispara.
--   O ÚNICO caso em que dispara: authenticated NÃO-admin cujo client_id real é
--   diferente do dono da propriedade — exatamente o vetor de ataque. ✓
--
-- POSICIONAMENTO DO GUARD:
--   O corpo atual JÁ deriva o dono em v_client_id logo no topo e trata propriedade
--   inexistente com `IF NOT FOUND THEN RETURN NULL`. Colocamos o guard imediatamente
--   APÓS esse NOT FOUND, reaproveitando v_client_id — antes de qualquer trabalho
--   (o AVG do score e o INSERT/UPSERT em farm_scores). Propriedade inexistente
--   continua retornando NULL (comportamento preservado; não levanta erro), o que
--   mantém chamadas internas de trigger idempotentes.
--
-- Corpo preservado byte-a-byte (via pg_get_functiondef) exceto o bloco de guard.
-- Idempotência: CREATE OR REPLACE + REVOKE (naturalmente idempotente). Roda 2x OK.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_farm_score(p_property_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid; v_score_avg numeric; v_count integer;
BEGIN
  SELECT pr.client_id INTO v_client_id FROM public.properties pr WHERE pr.id = p_property_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- ── GUARD DE POSSE (achado security-rls-auditor 2026-08-03) ──────────────────
  -- v_client_id é o dono REAL da propriedade (já derivado acima). Bloqueia
  -- authenticated malicioso pedindo score/escrita de propriedade alheia. anon já
  -- está barrado pelo REVOKE FROM PUBLIC da migration 156. Quando get_my_client_id()
  -- é NULL (service_role/trigger/recompute de migration), `uuid_real <> NULL` = NULL
  -- e o IF não dispara — recálculo interno de score segue funcionando.
  IF v_client_id <> get_my_client_id() AND NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  SELECT AVG(s.total_score), count(*) INTO v_score_avg, v_count
    FROM public.animal_scores s JOIN public.animals a ON a.id = s.animal_id
   WHERE a.current_property_id = p_property_id AND s.score_status = 'current';
  INSERT INTO public.farm_scores (property_id, client_id, score_total, score_rebanho, animals_count_active, algorithm_version, updated_at)
  VALUES (p_property_id, v_client_id, COALESCE(v_score_avg, 0), COALESCE(v_score_avg, 0), COALESCE(v_count, 0), 'v3', now())
  ON CONFLICT (property_id) DO UPDATE SET
    score_total = EXCLUDED.score_total, score_rebanho = EXCLUDED.score_rebanho,
    animals_count_active = EXCLUDED.animals_count_active, client_id = EXCLUDED.client_id,
    algorithm_version = 'v3', updated_at = now();
  RETURN v_score_avg;
END;
$function$;

-- Defensivo/idempotente: CREATE OR REPLACE preserva a ACL, mas reafirmamos o
-- REVOKE FROM PUBLIC da migration 156 para garantir que anon permaneça bloqueado
-- mesmo que a função seja algum dia recriada do zero. authenticated/service_role
-- mantêm seus grants explícitos (front chama como authenticated; guard blinda).
REVOKE EXECUTE ON FUNCTION public.calculate_farm_score(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.calculate_farm_score(uuid) IS
  'Recalcula farm_scores da propriedade (AVG dos animal_scores current). Guard de posse '
  'v_client_id <> get_my_client_id() adicionado na migration 158 (achado '
  'security-rls-auditor 2026-08-03) — bloqueia leak/escrita cross-tenant via RPC.';
