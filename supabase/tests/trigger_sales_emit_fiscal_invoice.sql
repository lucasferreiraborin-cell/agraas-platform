-- =============================================================================
-- trigger_sales_emit_fiscal_invoice.sql
-- Trigger alvo: _trg_sales_emit_fiscal_invoice (migration 140)
-- Função:       _fn_sales_emit_fiscal_invoice (AFTER INSERT em sales)
--
-- Garante:
--   1. INSERT sale confirmed cria 1 fiscal_invoice de SAÍDA
--   2. fiscal_invoice_id é amarrado de volta à venda
--   3. fiscal_invoice_items inclui linked_animal_id (cadeia rastreio fechada)
--   4. cfop='5102', ncm='01029000' (Bovino vivo) — padrão NF-e venda animal
--   5. sale com status != 'confirmed' NÃO emite invoice
-- =============================================================================

BEGIN;
SELECT plan(6);

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
-- T1: INSERT sale confirmed → fiscal_invoice criada
-- ============================================================
DO $$
DECLARE
  v_sale_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.sales (id, client_id, animal_id, total_value, weight_kg,
                            price_per_kg, sale_date, status, buyer_name)
  VALUES (v_sale_id, current_setting('test.client_id')::uuid,
          current_setting('test.animal_id')::uuid,
          4800, 480, 10.00, '2026-06-20', 'confirmed', 'TEST_BUYER_NFE');
  PERFORM set_config('test.sale_id', v_sale_id::text, true);
END$$;

SELECT isnt(
  (SELECT fiscal_invoice_id FROM public.sales
    WHERE id = current_setting('test.sale_id')::uuid),
  NULL,
  'T1 · sale.fiscal_invoice_id populada após INSERT confirmed'
);

SELECT is(
  (SELECT direction FROM public.fiscal_invoices fi
    JOIN public.sales s ON s.fiscal_invoice_id = fi.id
    WHERE s.id = current_setting('test.sale_id')::uuid),
  'saida',
  'T2 · fiscal_invoice criada com direction=saida'
);

SELECT is(
  (SELECT gross_value FROM public.fiscal_invoices fi
    JOIN public.sales s ON s.fiscal_invoice_id = fi.id
    WHERE s.id = current_setting('test.sale_id')::uuid),
  4800::numeric,
  'T3 · fiscal_invoice.gross_value = sale.total_value'
);

SELECT is(
  (SELECT linked_animal_id FROM public.fiscal_invoice_items fii
    JOIN public.sales s ON s.fiscal_invoice_id = fii.fiscal_invoice_id
    WHERE s.id = current_setting('test.sale_id')::uuid),
  current_setting('test.animal_id')::uuid,
  'T4 · fiscal_invoice_items.linked_animal_id == sale.animal_id (rastreio fechado)'
);

SELECT is(
  (SELECT cfop FROM public.fiscal_invoice_items fii
    JOIN public.sales s ON s.fiscal_invoice_id = fii.fiscal_invoice_id
    WHERE s.id = current_setting('test.sale_id')::uuid),
  '5102',
  'T5 · CFOP=5102 (venda mercadoria adquirida ou recebida de terceiros)'
);

-- ============================================================
-- T6: INSERT sale cancelled NÃO emite invoice
-- ============================================================
DO $$
DECLARE
  v_animal2_id uuid := gen_random_uuid();
  v_sale_id    uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
  VALUES (v_animal2_id, current_setting('test.client_id')::uuid,
          'TEST-CANCEL-'||substring(v_animal2_id::text,1,6),
          'F', 'Nelore', 'Ativo',
          (SELECT current_property_id FROM public.animals WHERE id = current_setting('test.animal_id')::uuid),
          '2024-01-01');

  INSERT INTO public.sales (id, client_id, animal_id, total_value, sale_date, status, buyer_name)
  VALUES (v_sale_id, current_setting('test.client_id')::uuid,
          v_animal2_id, 2000, '2026-06-21', 'cancelled', 'TEST_CANCEL');
  PERFORM set_config('test.sale_cancel_id', v_sale_id::text, true);
END$$;

SELECT is(
  (SELECT fiscal_invoice_id FROM public.sales
    WHERE id = current_setting('test.sale_cancel_id')::uuid),
  NULL,
  'T6 · sale cancelled NÃO emite fiscal_invoice (fiscal_invoice_id permanece NULL)'
);

SELECT * FROM finish();
ROLLBACK;
