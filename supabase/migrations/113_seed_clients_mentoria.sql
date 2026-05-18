-- Migration 113: clients da Mentoria IZ-SP
--
-- Contexto: Dra. Renata + César (NeuTroPec / IZ-SP) precisam de 2 clients
-- próprios pra exercitar CRUD + 1 espelho read-only da FSJBE (via mentor_externo
-- assignment, criado na FASE 6).
--
-- Este migration cria os 2 clients CRUD:
--   00000000-0000-0000-0099-000000000001 = Fazenda Mentoria IZ-SP (produtor cria)
--   00000000-0000-0000-0099-000000000002 = Frigorífico Mentoria IZ-SP (comprador)
--
-- Producer_types vinculados via FK em client_producer_types (UNIQUE por par).

BEGIN;

-- ── 1) Fazenda Mentoria IZ-SP ───────────────────────────────────────
INSERT INTO public.clients (id, name, role, created_at)
VALUES (
  '00000000-0000-0000-0099-000000000001',
  'Fazenda Mentoria IZ-SP',
  'admin',
  now()
);

INSERT INTO public.client_producer_types (client_id, producer_type_id, is_primary)
SELECT
  '00000000-0000-0000-0099-000000000001',
  pt.id,
  true
FROM public.producer_types pt
WHERE pt.code = 'cria';

-- ── 2) Frigorífico Mentoria IZ-SP ───────────────────────────────────
INSERT INTO public.clients (id, name, role, created_at)
VALUES (
  '00000000-0000-0000-0099-000000000002',
  'Frigorífico Mentoria IZ-SP',
  'admin',
  now()
);

INSERT INTO public.client_producer_types (client_id, producer_type_id, is_primary)
SELECT
  '00000000-0000-0000-0099-000000000002',
  pt.id,
  true
FROM public.producer_types pt
WHERE pt.code = 'ponta_compradora';

COMMIT;
