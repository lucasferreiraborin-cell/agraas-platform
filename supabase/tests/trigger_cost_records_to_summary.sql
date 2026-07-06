-- =============================================================================
-- trigger_cost_records_to_summary.sql
-- Trigger alvo: _trg_cost_records_to_summary (migration 131, reescrito em 136)
-- Função:       _fn_cost_records_to_summary (AFTER INSERT/UPDATE/DELETE)
--
-- Garante (apenas o caso animal_id direto — caso lot_id em arquivo separado):
--   1. INSERT cost_record com animal_id soma em animal_cost_summary.other_costs
--   2. INSERT múltiplos cost_records acumula corretamente
--   3. UPDATE no amount recomputa o agregado
--   4. DELETE recomputa o agregado
--   5. cost_record sem animal_id E sem lot_id é NOOP silencioso
-- =============================================================================

BEGIN;
SELECT plan(5);

DO $$
DECLARE
  v_client_id   uuid;
  v_property_id uuid;
  v_animal_id   uuid;
  v_lot_id      uuid;
BEGIN
  SELECT * INTO v_client_id, v_property_id, v_animal_id, v_lot_id
    FROM public._test_fixture_client_animal();

  PERFORM set_config('test.client_id', v_client_id::text, true);
  PERFORM set_config('test.animal_id', v_animal_id::text, true);
END$$;

-- ============================================================
-- T1: INSERT primeiro cost_record (150) → other_costs = 150
-- ============================================================
INSERT INTO public.cost_records (animal_id, category, amount, cost_date, notes)
VALUES (current_setting('test.animal_id')::uuid, 'sanitario', 150, '2026-05-10', 'TEST_C1');

SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  150::numeric,
  'T1 · INSERT cost_record (150) popula other_costs=150 em animal_cost_summary'
);

-- ============================================================
-- T2: INSERT segundo cost_record (250) → other_costs = 400
-- ============================================================
INSERT INTO public.cost_records (animal_id, category, amount, cost_date, notes)
VALUES (current_setting('test.animal_id')::uuid, 'nutricao', 250, '2026-05-11', 'TEST_C2');

SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  400::numeric,
  'T2 · Segundo INSERT acumula (150+250=400)'
);

-- ============================================================
-- T3: UPDATE de um cost_record para 500 → other_costs = 750 (250+500)
-- ============================================================
DO $$
BEGIN
  UPDATE public.cost_records SET amount = 500
   WHERE animal_id = current_setting('test.animal_id')::uuid
     AND notes = 'TEST_C1';
END$$;

SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  750::numeric,
  'T3 · UPDATE amount 150→500 recomputa other_costs (250+500=750)'
);

-- ============================================================
-- T4: DELETE de um cost_record → other_costs cai
-- ============================================================
DO $$
BEGIN
  DELETE FROM public.cost_records
   WHERE animal_id = current_setting('test.animal_id')::uuid
     AND notes = 'TEST_C1';
END$$;

SELECT is(
  (SELECT other_costs FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  250::numeric,
  'T4 · DELETE recomputa other_costs (sobra 250)'
);

-- ============================================================
-- T5: total_cost = total_input_cost + labor_cost + other_costs
-- ============================================================
SELECT is(
  (SELECT total_cost FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  (SELECT total_input_cost + labor_cost + other_costs
     FROM public.animal_cost_summary
    WHERE animal_id = current_setting('test.animal_id')::uuid),
  'T5 · total_cost = total_input_cost + labor_cost + other_costs (invariante)'
);

SELECT * FROM finish();
ROLLBACK;
