-- Migration 117: vincula auth.users dos clientes mentoria
--
-- Pré-requisito: 3 contas criadas via Supabase Auth Admin API (FASE 5):
--   • mentoria.produtor@agraas.com.br  → user_id de458573-c3ec-4272-b04a-63cc2cfc5d52
--   • mentoria.comprador@agraas.com.br → user_id 79e1362b-70ee-4f8e-ac7a-ad2ff090edf6
--   • mentoria.fsjbe@agraas.com.br     → user_id 36628211-da18-408b-9f98-a318a47715bd
--
-- Esta migration faz APENAS o UPDATE clients.auth_user_id pros 2 clientes
-- mentoria CRUD (produtor + comprador). FSJBE NÃO recebe vínculo direto —
-- acesso da conta mentoria.fsjbe é via mentor_assignments (FASE 6).
--
-- Senha temporária: Agraas@2026 (todas as 3 contas).
--
-- Numeração: usei 117 porque 116 já estava ocupado (role_mentor_externo
-- aplicado em commit 5f4fd4c). Sequência atual: 112 → 113 → 114 → 115 →
-- 116 → 117.

BEGIN;

-- ── Fazenda Mentoria IZ-SP ↔ mentoria.produtor ───────────────────────
UPDATE public.clients
SET auth_user_id = 'de458573-c3ec-4272-b04a-63cc2cfc5d52'
WHERE id = '00000000-0000-0000-0099-000000000001';

-- ── Frigorífico Mentoria IZ-SP ↔ mentoria.comprador ──────────────────
UPDATE public.clients
SET auth_user_id = '79e1362b-70ee-4f8e-ac7a-ad2ff090edf6'
WHERE id = '00000000-0000-0000-0099-000000000002';

COMMIT;
