-- ============================================================
-- Migration 152 — Fix SECURITY DEFINER views (advisor de segurança)
-- Sprint L · 06/07/2026
--
-- ORIGEM:
-- O advisor OFICIAL de segurança do Supabase (get_advisors type=security,
-- 06/07/2026) sinalizou 4 views como SECURITY DEFINER — classificado como
-- ERROR de segurança porque essas views FURAM a RLS.
--
-- POR QUE security_invoker IMPORTA:
-- Uma view SECURITY DEFINER executa com os privilégios do DONO da view
-- (normalmente postgres/superuser), ignorando as políticas RLS do usuário
-- que consulta. Isso pode VAZAR dados de outros clients (multi-tenant).
-- Com security_invoker = true, a view passa a rodar com os privilégios de
-- QUEM CONSULTA — então respeita a RLS (client_id = get_my_client_id())
-- das tabelas base, exatamente como uma query direta faria.
--
-- Referência oficial:
-- https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0010_security_definer_view
--
-- IDEMPOTÊNCIA / RESILIÊNCIA:
-- Cada ALTER VIEW é embrulhado em DO $$ ... EXCEPTION WHEN undefined_table
-- THEN NULL, para que a migration não quebre caso alguma view não exista
-- neste ambiente. Rodar 2x é seguro (SET é idempotente).
-- ============================================================

BEGIN;

-- 1) agraas_market_animals
DO $$
BEGIN
  ALTER VIEW public.agraas_market_animals SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 2) animal_events
DO $$
BEGIN
  ALTER VIEW public.animal_events SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 3) lcdpr_entries
DO $$
BEGIN
  ALTER VIEW public.lcdpr_entries SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 4) producer_fiscal_summary
DO $$
BEGIN
  ALTER VIEW public.producer_fiscal_summary SET (security_invoker = true);
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

COMMIT;
