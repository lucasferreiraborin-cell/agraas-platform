-- Migration 114: seed híbrido — Fazenda Mentoria IZ-SP
--
-- Cliente alvo: 00000000-0000-0000-0099-000000000001 (criado na 113)
--
-- Conteúdo:
--   1 property: Fazenda Modelo IZ-SP (Nova Odessa, SP, 250 ha)
--   3 lots: Matrizes Cria (cap 30), Bezerros Pós-Desmame (cap 20), Touros (cap 5)
--   10 animals (MENT-001..010): 5 matrizes F, 3 bezerros M, 2 touros M
--   1 reproductive_season ativa (2026-01-01 → 2026-06-30)
--
-- Ajustes ao spec original baseados no schema real:
--   • properties.location não existe → city + state
--   • lots.capacity não existe → encoded em description "Capacidade: N cabeças"
--   • reproductive_seasons usa season_start/season_end (não start_date/end_date)
--   • total_females não existe → to_inseminate=5 + apt_count=5
--   • sex: 'Male'/'Female' (capitalized) per padrão atual
--   • status: 'Ativo' per padrão FSJBE
--
-- IDs determinísticos com prefixo 0099 pra grep/traceability:
--   property: 11111111-0099-...
--   lots:     22222222-0099-...
--   animals:  33333333-0099-...
--   season:   44444444-0099-...

BEGIN;

-- ── 0) Pre-seed cleanup — triggers órfãs ──────────────────────────────
-- Banco tem 20 funções referenciando tabela legacy animal_events (removida
-- em 049_drop_legacy_event_tables.sql). 2 dessas funções estão atadas a
-- triggers AFTER INSERT que bloqueiam o seed:
--
--   trg_create_animal_birth_event ON animals    → create_animal_birth_event()
--   trg_animal_lot_entry_event ON animal_lot_assignments → register_animal_lot_event()
--
-- Resultado em produção: QUALQUER INSERT em animals OU em animal_lot_assignments
-- falha com "relation animal_events does not exist". UI provavelmente está
-- quebrada pra criar animal novo.
--
-- Drop aqui antes do seed. Demais 18 funções broken permanecem (fora do escopo).
-- Issue documentada em commit message pra Lucas avaliar.
DROP TRIGGER IF EXISTS trg_create_animal_birth_event ON public.animals;
DROP FUNCTION IF EXISTS public.create_animal_birth_event();

DROP TRIGGER IF EXISTS trg_animal_lot_entry_event ON public.animal_lot_assignments;
DROP FUNCTION IF EXISTS public.register_animal_lot_event();

-- ── 1) Property ──────────────────────────────────────────────────────
INSERT INTO public.properties (id, client_id, name, city, state, area_hectares, status)
VALUES (
  '11111111-0099-0000-0000-000000000001',
  '00000000-0000-0000-0099-000000000001',
  'Fazenda Modelo IZ-SP',
  'Nova Odessa',
  'SP',
  250,
  'Ativa'
);

-- ── 2) Lots ──────────────────────────────────────────────────────────
INSERT INTO public.lots (id, client_id, property_id, name, description, phase, status, start_date)
VALUES
  (
    '22222222-0099-0000-0000-000000000001',
    '00000000-0000-0000-0099-000000000001',
    '11111111-0099-0000-0000-000000000001',
    'Lote 01 — Matrizes Cria',
    'Capacidade: 30 cabeças. Matrizes em manejo reprodutivo.',
    'cria',
    'ativo',
    '2026-01-01'
  ),
  (
    '22222222-0099-0000-0000-000000000002',
    '00000000-0000-0000-0099-000000000001',
    '11111111-0099-0000-0000-000000000001',
    'Lote 02 — Bezerros Pós-Desmame',
    'Capacidade: 20 cabeças. Bezerros recém-desmamados em recria.',
    'recria',
    'ativo',
    '2026-01-01'
  ),
  (
    '22222222-0099-0000-0000-000000000003',
    '00000000-0000-0000-0099-000000000001',
    '11111111-0099-0000-0000-000000000001',
    'Lote 03 — Touros',
    'Capacidade: 5 cabeças. Reprodutores aptos pra monta natural / coleta.',
    'reproducao',
    'ativo',
    '2026-01-01'
  );

-- ── 3) Animals (10) ──────────────────────────────────────────────────
-- 5 matrizes F (36-60 meses) → MENT-001..005, lote 01
-- 3 bezerros M (8-12 meses)  → MENT-006..008, lote 02
-- 2 touros M (48 meses)      → MENT-009..010, lote 03
INSERT INTO public.animals (id, client_id, current_property_id, internal_code, agraas_id, sex, breed, category, birth_date, status)
VALUES
  -- Matrizes (idade decrescente: 60, 54, 48, 42, 36 meses)
  ('33333333-0099-0000-0000-000000000001', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-001', 'AGR-MEN00001', 'Female', 'Nelore', 'vaca', '2021-05-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000002', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-002', 'AGR-MEN00002', 'Female', 'Nelore', 'vaca', '2021-11-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000003', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-003', 'AGR-MEN00003', 'Female', 'Nelore', 'vaca', '2022-05-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000004', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-004', 'AGR-MEN00004', 'Female', 'Nelore', 'vaca', '2022-11-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000005', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-005', 'AGR-MEN00005', 'Female', 'Nelore', 'vaca', '2023-05-01', 'Ativo'),
  -- Bezerros (8, 10, 12 meses)
  ('33333333-0099-0000-0000-000000000006', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-006', 'AGR-MEN00006', 'Male',   'Nelore', 'bezerro', '2025-05-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000007', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-007', 'AGR-MEN00007', 'Male',   'Nelore', 'bezerro', '2025-07-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000008', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-008', 'AGR-MEN00008', 'Male',   'Nelore', 'bezerro', '2025-09-01', 'Ativo'),
  -- Touros (48 meses)
  ('33333333-0099-0000-0000-000000000009', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-009', 'AGR-MEN00009', 'Male',   'Nelore', 'touro',   '2022-05-01', 'Ativo'),
  ('33333333-0099-0000-0000-000000000010', '00000000-0000-0000-0099-000000000001', '11111111-0099-0000-0000-000000000001', 'MENT-010', 'AGR-MEN00010', 'Male',   'Nelore', 'touro',   '2022-05-01', 'Ativo');

-- ── 4) Vinculação animais ↔ lots ─────────────────────────────────────
INSERT INTO public.animal_lot_assignments (animal_id, lot_id, entry_date)
VALUES
  -- Matrizes no Lote 01
  ('33333333-0099-0000-0000-000000000001', '22222222-0099-0000-0000-000000000001', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000002', '22222222-0099-0000-0000-000000000001', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000003', '22222222-0099-0000-0000-000000000001', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000004', '22222222-0099-0000-0000-000000000001', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000005', '22222222-0099-0000-0000-000000000001', '2026-01-01'),
  -- Bezerros no Lote 02
  ('33333333-0099-0000-0000-000000000006', '22222222-0099-0000-0000-000000000002', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000007', '22222222-0099-0000-0000-000000000002', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000008', '22222222-0099-0000-0000-000000000002', '2026-01-01'),
  -- Touros no Lote 03
  ('33333333-0099-0000-0000-000000000009', '22222222-0099-0000-0000-000000000003', '2026-01-01'),
  ('33333333-0099-0000-0000-000000000010', '22222222-0099-0000-0000-000000000003', '2026-01-01');

-- ── 5) Reproductive season ativa ─────────────────────────────────────
INSERT INTO public.reproductive_seasons (id, client_id, property_id, season_start, season_end, to_inseminate, apt_count, females_inseminated, total_inseminations)
VALUES (
  '44444444-0099-0000-0000-000000000001',
  '00000000-0000-0000-0099-000000000001',
  '11111111-0099-0000-0000-000000000001',
  '2026-01-01',
  '2026-06-30',
  5,
  5,
  0,
  0
);

COMMIT;
