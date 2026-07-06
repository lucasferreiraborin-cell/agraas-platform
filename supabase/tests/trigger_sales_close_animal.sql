-- =============================================================================
-- trigger_sales_close_animal.sql
-- Trigger alvo: _trg_sales_close_animal (migration 136)
-- Função:       _fn_sales_close_animal (AFTER INSERT OR UPDATE em sales)
--
-- Garante:
--   1. INSERT sale com status='confirmed' fecha animal Ativo → status='Vendido'
--   2. INSERT sale com status='cancelled' NÃO toca animal
--   3. UPDATE de venda cancelled → confirmed FECHA o animal
--   4. Idempotência: animal já Vendido não é reaberto/sobrescrito
-- =============================================================================

BEGIN;
SELECT plan(4);

DO $$
DECLARE
  v_client_id   uuid;
  v_property_id uuid;
  v_animal_id   uuid;
  v_lot_id      uuid;
  v_animal2_id  uuid;
  v_animal3_id  uuid;
BEGIN
  SELECT * INTO v_client_id, v_property_id, v_animal_id, v_lot_id
    FROM public._test_fixture_client_animal();

  -- Animal extra para UPDATE
  v_animal2_id := gen_random_uuid();
  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
    VALUES (v_animal2_id, v_client_id, 'TEST-UPD-'||substring(v_animal2_id::text,1,6),
            'M', 'Nelore', 'Ativo', v_property_id, '2024-01-01');

  -- Animal já 'Vendido' antes da venda — testa idempotência
  v_animal3_id := gen_random_uuid();
  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
    VALUES (v_animal3_id, v_client_id, 'TEST-CLOSED-'||substring(v_animal3_id::text,1,6),
            'M', 'Nelore', 'Vendido', v_property_id, '2024-01-01');

  PERFORM set_config('test.client_id',  v_client_id::text,  true);
  PERFORM set_config('test.animal_id',  v_animal_id::text,  true);
  PERFORM set_config('test.animal2_id', v_animal2_id::text, true);
  PERFORM set_config('test.animal3_id', v_animal3_id::text, true);
END$$;

-- ============================================================
-- T1: INSERT sale confirmed → animal vira 'Vendido'
-- ============================================================
INSERT INTO public.sales (client_id, animal_id, total_value, sale_date, status, buyer_name)
VALUES (current_setting('test.client_id')::uuid,
        current_setting('test.animal_id')::uuid,
        3000, '2026-06-01', 'confirmed', 'TEST_BUYER');

SELECT is(
  (SELECT status FROM public.animals WHERE id = current_setting('test.animal_id')::uuid),
  'Vendido',
  'T1 · INSERT sale confirmed fecha animal Ativo (status=Vendido)'
);

-- ============================================================
-- T2: INSERT sale cancelled → animal2 continua 'Ativo'
-- ============================================================
INSERT INTO public.sales (client_id, animal_id, total_value, sale_date, status, buyer_name)
VALUES (current_setting('test.client_id')::uuid,
        current_setting('test.animal2_id')::uuid,
        3500, '2026-06-02', 'cancelled', 'TEST_BUYER_CANCEL');

SELECT is(
  (SELECT status FROM public.animals WHERE id = current_setting('test.animal2_id')::uuid),
  'Ativo',
  'T2 · INSERT sale cancelled NÃO fecha animal'
);

-- ============================================================
-- T3: UPDATE sale cancelled → confirmed FECHA animal2
-- ============================================================
DO $$
BEGIN
  UPDATE public.sales SET status='confirmed'
   WHERE animal_id = current_setting('test.animal2_id')::uuid;
END$$;

SELECT is(
  (SELECT status FROM public.animals WHERE id = current_setting('test.animal2_id')::uuid),
  'Vendido',
  'T3 · UPDATE de cancelled→confirmed fecha animal previamente Ativo'
);

-- ============================================================
-- T4: Idempotência — venda confirmed em animal já 'Vendido' não toca
-- (na verdade, o UPDATE só atua se status='Ativo'. Animal 'Vendido' permanece.)
-- ============================================================
-- Como trg_prevent_sale_of_slaughtered_animal só barra 'slaughtered',
-- conseguimos inserir mesmo em animal 'Vendido'. O trigger close_animal
-- não deve sobrescrever updated_at de animal já fora de 'Ativo'.
DO $$
DECLARE
  v_updated_before timestamptz;
BEGIN
  SELECT updated_at INTO v_updated_before
    FROM public.animals WHERE id = current_setting('test.animal3_id')::uuid;
  PERFORM set_config('test.updated_before', v_updated_before::text, true);

  INSERT INTO public.sales (client_id, animal_id, total_value, sale_date, status, buyer_name)
  VALUES (current_setting('test.client_id')::uuid,
          current_setting('test.animal3_id')::uuid,
          1000, '2026-06-03', 'confirmed', 'TEST_BUYER_IDEMP');
END$$;

SELECT is(
  (SELECT updated_at FROM public.animals WHERE id = current_setting('test.animal3_id')::uuid)::text,
  current_setting('test.updated_before'),
  'T4 · Animal já Vendido não é tocado (idempotência — updated_at preservado)'
);

SELECT * FROM finish();
ROLLBACK;
