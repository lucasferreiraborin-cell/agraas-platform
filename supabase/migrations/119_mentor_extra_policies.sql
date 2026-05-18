-- Migration 119: mentor_select policies em 3 tabelas críticas do /painel
--
-- Audit 18/05 detectou que /painel mostra KPIs zerados pra mentoria.fsjbe.
-- Causa raiz #1: cache vazio (resolvido em migration separada). Causa raiz
-- #2: 3 tabelas que /painel consulta NÃO tinham policy mentor_select
-- (migration 116 cobriu 18 tabelas, mas faltaram essas 3):
--
--   • agraas_master_passport_cache  → cache central do passaporte
--   • animal_certifications         → certificações (Halal, MAPA, etc.)
--   • animal_scores                 → scores agronômicos
--
-- Sem essas policies, mentor_externo via consultas filtradas pelos clients
-- que ele NÃO tem acesso E não vê dados do client autorizado (RLS bloqueia
-- por completo). Resultado: /painel zerado mesmo se cache estivesse populado.
--
-- Padrões:
-- - agraas_master_passport_cache TEM client_id direto → policy padrão
-- - animal_certifications / animal_scores NÃO têm client_id direto, mas
--   têm animal_id → subquery via animals (padrão já usado em applications,
--   animal_movements, weights na migration 116)

BEGIN;

-- ── 1) agraas_master_passport_cache (client_id direto) ───────────────
CREATE POLICY agraas_master_passport_cache_select_mentor
  ON public.agraas_master_passport_cache
  FOR SELECT
  USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));

-- ── 2) animal_certifications (indireto via animal_id) ────────────────
CREATE POLICY animal_certifications_select_mentor
  ON public.animal_certifications
  FOR SELECT
  USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );

-- ── 3) animal_scores (indireto via animal_id) ────────────────────────
CREATE POLICY animal_scores_select_mentor
  ON public.animal_scores
  FOR SELECT
  USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );

COMMIT;
