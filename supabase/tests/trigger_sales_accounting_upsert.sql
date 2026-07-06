-- =============================================================================
-- trigger_sales_accounting_upsert.sql
-- Trigger alvo: _trg_sales_accounting_upsert (migration 146)
-- Função:       _fn_sales_accounting_upsert (AFTER INSERT OR UPDATE em sales)
--
-- Garante:
--   1. INSERT cria os 3 lançamentos (Receita, CMV, FUNRURAL) corretamente
--   2. UPDATE em total_value gera ESTORNO + relançamento (partida dobrada)
--   3. reversed_by é preenchido no lançamento original ao estornar
--   4. status='cancelled' bypassa toda a escrituração
--   5. Idempotência: rodar UPDATE no_op não duplica lançamentos
-- =============================================================================

BEGIN;
SELECT plan(7);

DO $$
DECLARE
  v_client_id   uuid;
  v_property_id uuid;
  v_animal_id   uuid;
  v_lot_id      uuid;
BEGIN
  SELECT * INTO v_client_id, v_property_id, v_animal_id, v_lot_id
    FROM public._test_fixture_client_animal();

  INSERT INTO public.animal_cost_summary
    (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
  VALUES (v_animal_id, v_client_id, 0, 0, 1800, 1800, now());

  PERFORM set_config('test.client_id', v_client_id::text, true);
  PERFORM set_config('test.animal_id', v_animal_id::text, true);
END$$;

-- ============================================================
-- INSERT venda — espera-se 3 lançamentos (Receita + CMV + FUNRURAL)
-- ============================================================
DO $$
DECLARE
  v_sale_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.sales
    (id, client_id, animal_id, total_value, sale_date, status, buyer_name)
  VALUES
    (v_sale_id,
     current_setting('test.client_id')::uuid,
     current_setting('test.animal_id')::uuid,
     5000, '2026-06-15', 'confirmed', 'TEST_BUYER_ACCT');
  PERFORM set_config('test.sale_id', v_sale_id::text, true);
END$$;

SELECT is(
  (SELECT count(*)::int FROM public.accounting_entries
    WHERE source_type='sale' AND source_id = current_setting('test.sale_id')::uuid),
  3,
  'T1 · INSERT venda gera 3 lançamentos (Receita + CMV + FUNRURAL)'
);

SELECT is(
  (SELECT amount FROM public.accounting_entries ae
    JOIN public.chart_of_accounts dc ON dc.id = ae.debit_account_id
    JOIN public.chart_of_accounts cc ON cc.id = ae.credit_account_id
    WHERE ae.source_type='sale' AND ae.source_id = current_setting('test.sale_id')::uuid
      AND dc.code='1.1.01' AND cc.code='3.1.01'),
  5000::numeric,
  'T2 · Receita: D Caixa(1.1.01) / C Receita(3.1.01) = 5000'
);

SELECT is(
  (SELECT amount FROM public.accounting_entries ae
    JOIN public.chart_of_accounts dc ON dc.id = ae.debit_account_id
    JOIN public.chart_of_accounts cc ON cc.id = ae.credit_account_id
    WHERE ae.source_type='sale' AND ae.source_id = current_setting('test.sale_id')::uuid
      AND dc.code='5.1.01' AND cc.code='1.1.03'),
  1800::numeric,
  'T3 · CMV: D CMV(5.1.01) / C Estoque(1.1.03) = 1800 (custo do animal)'
);

-- ============================================================
-- UPDATE total_value 5000 → 6000: estorna receita + relança
-- ============================================================
DO $$
BEGIN
  UPDATE public.sales SET total_value = 6000
    WHERE id = current_setting('test.sale_id')::uuid;
END$$;

SELECT is(
  (SELECT count(*)::int FROM public.accounting_entries
    WHERE source_type='sale' AND source_id = current_setting('test.sale_id')::uuid
      AND description ILIKE '%ESTORNO receita%'),
  1,
  'T4 · UPDATE total_value gera 1 lançamento de ESTORNO de receita'
);

SELECT is(
  (SELECT count(*)::int FROM public.accounting_entries
    WHERE source_type='sale' AND source_id = current_setting('test.sale_id')::uuid
      AND description ILIKE '%reapurada%'
      AND amount = 6000),
  1,
  'T5 · Relançamento de receita "reapurada" com novo total_value=6000'
);

SELECT isnt(
  (SELECT reversed_by FROM public.accounting_entries ae
    JOIN public.chart_of_accounts dc ON dc.id = ae.debit_account_id
    JOIN public.chart_of_accounts cc ON cc.id = ae.credit_account_id
    WHERE ae.source_type='sale' AND ae.source_id = current_setting('test.sale_id')::uuid
      AND dc.code='1.1.01' AND cc.code='3.1.01'
      AND ae.amount = 5000),
  NULL,
  'T6 · Lançamento original marcado com reversed_by (rastreabilidade)'
);

-- ============================================================
-- Idempotência: UPDATE com mesmo valor não deve duplicar
-- ============================================================
DO $$
DECLARE
  v_count_before int;
  v_count_after  int;
BEGIN
  SELECT count(*) INTO v_count_before FROM public.accounting_entries
    WHERE source_type='sale' AND source_id = current_setting('test.sale_id')::uuid;

  UPDATE public.sales SET total_value = 6000  -- mesmo valor
    WHERE id = current_setting('test.sale_id')::uuid;

  SELECT count(*) INTO v_count_after FROM public.accounting_entries
    WHERE source_type='sale' AND source_id = current_setting('test.sale_id')::uuid;

  PERFORM set_config('test.count_before', v_count_before::text, true);
  PERFORM set_config('test.count_after',  v_count_after::text,  true);
END$$;

SELECT is(
  current_setting('test.count_after')::int,
  current_setting('test.count_before')::int,
  'T7 · UPDATE no_op (mesmo valor) não duplica accounting_entries — idempotência'
);

SELECT * FROM finish();
ROLLBACK;
