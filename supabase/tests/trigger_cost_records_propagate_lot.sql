-- =============================================================================
-- trigger_cost_records_propagate_lot.sql
-- Trigger alvo: _trg_cost_records_to_summary (PARTE A · migration 136)
-- Função:       _fn_cost_records_to_summary (rota lot_id → rateio igualitário)
--
-- Garante:
--   1. cost_record com lot_id rateia igualmente entre N animais ATIVOS do lote
--   2. Animal com exit_date NOT NULL no lote NÃO recebe rateio
--   3. Animal com status != 'Ativo' NÃO recebe rateio
--   4. Lote sem animais ativos → não rateia (NOOP, sem divisão por zero)
--   5. Rateio é absorvido em animal_cost_summary.other_costs
--
-- Fonte: Embrapa Doc 237 (rateio igualitário aceito quando sem pesagem indiv.)
-- =============================================================================

BEGIN;
SELECT plan(5);

DO $$
DECLARE
  v_client_id   uuid;
  v_property_id uuid;
  v_animal1_id  uuid;
  v_lot_id      uuid;
  v_animal2_id  uuid;
  v_animal3_id  uuid;
  v_animal4_id  uuid;
BEGIN
  -- Fixture base (cria 1 animal + lote — não vamos usar este animal no rateio)
  SELECT * INTO v_client_id, v_property_id, v_animal1_id, v_lot_id
    FROM public._test_fixture_client_animal();

  -- Cria 3 animais adicionais e atribui ao lote
  v_animal2_id := gen_random_uuid();
  v_animal3_id := gen_random_uuid();
  v_animal4_id := gen_random_uuid();

  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
  VALUES
    (v_animal2_id, v_client_id, 'LOT-A2-'||substring(v_animal2_id::text,1,6), 'M', 'Nelore', 'Ativo',   v_property_id, '2024-01-01'),
    (v_animal3_id, v_client_id, 'LOT-A3-'||substring(v_animal3_id::text,1,6), 'F', 'Nelore', 'Ativo',   v_property_id, '2024-01-01'),
    (v_animal4_id, v_client_id, 'LOT-A4-'||substring(v_animal4_id::text,1,6), 'M', 'Nelore', 'Vendido', v_property_id, '2024-01-01');
  -- v_animal4 não deve receber rateio (status != 'Ativo')

  -- Aloca os 3 animais no lote. Animal2 com exit_date (saiu) → não rateia.
  INSERT INTO public.animal_lot_assignments (animal_id, lot_id, entry_date, exit_date)
  VALUES
    (v_animal2_id, v_lot_id, '2026-01-01', '2026-05-30'),  -- SAIU
    (v_animal3_id, v_lot_id, '2026-01-01', NULL),          -- ATIVO no lote
    (v_animal4_id, v_lot_id, '2026-01-01', NULL);          -- no lote mas status='Vendido' → não rateia

  -- Resumindo: só animal3 deve receber rateio. N_ativos_do_lote = 1.
  PERFORM set_config('test.client_id',   v_client_id::text,   true);
  PERFORM set_config('test.lot_id',      v_lot_id::text,      true);
  PERFORM set_config('test.animal2_id',  v_animal2_id::text,  true);
  PERFORM set_config('test.animal3_id',  v_animal3_id::text,  true);
  PERFORM set_config('test.animal4_id',  v_animal4_id::text,  true);
END$$;

-- ============================================================
-- T1: INSERT cost_record com lot_id=300 → animal3 recebe 300/1=300
-- ============================================================
INSERT INTO public.cost_records (lot_id, category, amount, cost_date, notes)
VALUES (current_setting('test.lot_id')::uuid, 'lot_cost', 300, '2026-06-10', 'TEST_LOT_C1');

SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal3_id')::uuid),
  300::numeric,
  'T1 · Animal Ativo no lote recebe rateio total (1 elegível: 300/1=300)'
);

-- T2: Animal2 (com exit_date) NÃO recebe rateio
SELECT is(
  (SELECT COALESCE((SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal2_id')::uuid), 0)),
  0::numeric,
  'T2 · Animal com exit_date NÃO recebe rateio (excluído da contagem)'
);

-- T3: Animal4 (status=Vendido) NÃO recebe rateio
SELECT is(
  (SELECT COALESCE((SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal4_id')::uuid), 0)),
  0::numeric,
  'T3 · Animal com status=Vendido NÃO recebe rateio mesmo no lote'
);

-- ============================================================
-- T4: Adicionar mais um animal ativo ao lote, depois inserir novo cost_record
--     com 200 → animal3 e novo recebem 100 cada (rateio entre 2)
-- ============================================================
DO $$
DECLARE
  v_animal5_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
  VALUES (v_animal5_id, current_setting('test.client_id')::uuid,
          'LOT-A5-'||substring(v_animal5_id::text,1,6), 'F', 'Nelore', 'Ativo',
          (SELECT current_property_id FROM public.animals WHERE id = current_setting('test.animal3_id')::uuid),
          '2024-01-01');

  INSERT INTO public.animal_lot_assignments (animal_id, lot_id, entry_date, exit_date)
  VALUES (v_animal5_id, current_setting('test.lot_id')::uuid, '2026-06-09', NULL);

  PERFORM set_config('test.animal5_id', v_animal5_id::text, true);

  -- Novo cost_record de 200 → 100 cada
  INSERT INTO public.cost_records (lot_id, category, amount, cost_date, notes)
  VALUES (current_setting('test.lot_id')::uuid, 'lot_cost', 200, '2026-06-11', 'TEST_LOT_C2');
END$$;

-- Animal3: agora soma rateio das 2 cost_records:
--  - cost_record 300 (T1) com N=2 ativos no momento da CONSULTA → 150
--  - cost_record 200 (T4) com N=2 ativos no momento da CONSULTA → 100
-- Total = 250. Esse é o comportamento documentado da migration 136:
-- "o rateio reflete a composição ATUAL do lote".
SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal3_id')::uuid),
  250::numeric,
  'T4 · Composição do lote ATUAL define divisor (recálculo usa snapshot agora). 300/2 + 200/2 = 250'
);

-- T5: animal5 recém-adicionado também recebe rateio do snapshot atual
SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal5_id')::uuid),
  250::numeric,
  'T5 · Animal recém-adicionado ao lote recebe rateio do snapshot atual também (idempotência)'
);

SELECT * FROM finish();
ROLLBACK;
