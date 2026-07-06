-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 156 — Correção do modelo de GRANT (a 155 revogou de anon sem efeito)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- BUG descoberto na verificação empírica da 155 (06/07/2026):
--   `REVOKE EXECUTE ... FROM anon` foi NO-OP. Funções nascem com EXECUTE para
--   PUBLIC (pseudo-role de todos), e `anon` herda o privilégio via PUBLIC — não
--   há grant direto a anon para revogar. ACL real confirmou:
--       {=X/postgres, authenticated=X/postgres, service_role=X/postgres}
--   O `=X` (grantee vazio) É o grant a PUBLIC → origem do acesso de anon.
--
--   Consequência: para as funções 🔴, um ANON (sem sessão) ainda passava, pois o
--   guard `p_client_id <> get_my_client_id()` vira `<> NULL` (não dispara) E o
--   REVOKE não pegou. O vazamento continuava aberto para anon.
--
-- FIX correto: REVOKE EXECUTE FROM PUBLIC (mata o acesso de anon), preservando os
--   grants explícitos de authenticated e service_role já presentes na ACL. Onde
--   authenticated também não deve executar (helpers puramente internos, nenhuma
--   view/rota do front os chama — verificado em pg_views + grep app/), revogamos
--   de authenticated também.
--
-- Verificado (06/07/2026): nenhuma view em public referencia estas funções.
-- Idempotente: REVOKE é idempotente.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── GRUPO A — 🔴 reds + calculate_farm_score ────────────────────────────────────
-- Mantêm authenticated (chamadas por rota/front autenticado; reds blindadas pelo
-- guard de posse da 155). Só removemos PUBLIC → anon perde o acesso.
REVOKE EXECUTE ON FUNCTION public.generate_lcdpr_txt(uuid, integer)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_lcdpr_export(uuid, integer)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_stock_from_fiscal_note(uuid)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_farm_score(uuid)                 FROM PUBLIC;


-- ── GRUPO B — 🟡 helpers puramente internos ─────────────────────────────────────
-- Chamados só por trigger/cascata (rodam como owner/DEFINER, independem de grant)
-- ou por rota service_role. Nenhuma view/rota autenticada os chama. Removemos
-- PUBLIC E authenticated → só owner/triggers e service_role executam.
REVOKE EXECUTE ON FUNCTION public._seed_rural_chart_of_accounts(uuid)             FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public._ensure_chart_account(uuid, text)              FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_animal_passport(uuid)                  FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_animal_fair_value(uuid)              FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_reproductive_season_aggregates(uuid) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_fiscal_score(uuid)                     FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_compliance_documental_score(uuid)      FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_animal_category(uuid)                      FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_agraas_score_v3(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_producer_score(uuid)                 FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_field_score(uuid)                    FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_livestock_score(uuid)                FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_poultry_score(uuid)                  FROM PUBLIC, authenticated;

-- 🟢 get_my_client_id / is_admin / is_mentor_externo / mentor_has_access_to_client:
--    NÃO tocadas — usadas dentro das policies RLS (revogar quebraria o acesso).
