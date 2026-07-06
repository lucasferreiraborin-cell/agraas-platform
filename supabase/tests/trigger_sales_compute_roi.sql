-- =============================================================================
-- trigger_sales_compute_roi.sql
-- Trigger alvo: _trg_sales_compute_roi (migration 131, atualizado em 141)
-- Função: _fn_sales_compute_roi (BEFORE INSERT OR UPDATE em sales)
--
-- Garante:
--   1. Cálculo correto de cost_at_sale a partir de animal_cost_summary.total_cost
--   2. FUNRURAL dinâmico via clients.funrural_rate (LC 224/2025)
--   3. roi = (total - cost) / cost * 100, arredondado para 2 casas
--   4. roi_net deduz funrural antes do cálculo
--   5. cost_estimated=true quando custo = 0 e roi=NULL
--   6. Cancelamento (status='cancelled') em UPDATE preserva valores antigos
-- =============================================================================

BEGIN;
SELECT plan(8);

DO $$
DECLARE
  v_client_id   uuid;
  v_property_id uuid;
  v_animal_id   uuid;
  v_lot_id      uuid;
  v_animal2_id  uuid;
BEGIN
  SELECT * INTO v_client_id, v_property_id, v_animal_id, v_lot_id
    FROM public._test_fixture_client_animal();

  -- Animal SEM custo registrado (para teste 5)
  v_animal2_id := gen_random_uuid();
  INSERT INTO public.animals (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
    VALUES (v_animal2_id, v_client_id, 'TEST-NOCOST-'||substring(v_animal2_id::text,1,6),
            'F', 'Nelore', 'Ativo', v_property_id, '2024-01-01');

  -- Popula animal_cost_summary com total_cost = 2200 para o animal "com custo".
  -- O trigger 131 lê COALESCE(total_cost, 0) — então setamos diretamente.
  INSERT INTO public.animal_cost_summary
    (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
  VALUES (v_animal_id, v_client_id, 1000, 500, 700, 2200, now());

  -- Stash em GUC para os testes lerem
  PERFORM set_config('test.client_id',  v_client_id::text,  true);
  PERFORM set_config('test.animal_id',  v_animal_id::text,  true);
  PERFORM set_config('test.animal2_id', v_animal2_id::text, true);
END$$;

-- ============================================================
-- Teste 1: INSERT venda com animal que TEM custo → cost_at_sale = 2200
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
     4500, '2026-06-01', 'confirmed', 'TEST_BUYER');
  PERFORM set_config('test.sale_id', v_sale_id::text, true);
END$$;

SELECT is(
  (SELECT cost_at_sale FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  2200::numeric,
  'T1 · cost_at_sale puxado de animal_cost_summary.total_cost (2200)'
);

SELECT is(
  (SELECT funrural_value FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  73.35::numeric,
  'T2 · funrural_value = 4500 * 0.0163 = 73.35 (PF default LC 224/2025)'
);

SELECT is(
  (SELECT roi FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  ROUND(((4500 - 2200)::numeric / 2200) * 100, 2),
  'T3 · roi = ((4500 - 2200) / 2200) * 100 = 104.55'
);

SELECT is(
  (SELECT roi_net FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  ROUND(((4500 - 73.35 - 2200)::numeric / 2200) * 100, 2),
  'T4 · roi_net deduz funrural antes do cálculo'
);

SELECT is(
  (SELECT cost_estimated FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  false,
  'T5 · cost_estimated=false quando há custo conhecido > 0'
);

-- ============================================================
-- Teste 6: INSERT venda com animal SEM custo → cost_estimated=true, roi=NULL
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
     current_setting('test.animal2_id')::uuid,
     3000, '2026-06-02', 'confirmed', 'TEST_BUYER_NOCOST');
  PERFORM set_config('test.sale2_id', v_sale_id::text, true);
END$$;

SELECT is(
  (SELECT cost_estimated FROM public.sales WHERE id = current_setting('test.sale2_id')::uuid),
  true,
  'T6 · cost_estimated=true quando animal_cost_summary não tem total_cost'
);

SELECT is(
  (SELECT roi FROM public.sales WHERE id = current_setting('test.sale2_id')::uuid),
  NULL::numeric,
  'T7 · roi=NULL quando custo desconhecido (evita divisão por zero)'
);

-- ============================================================
-- Teste 8: UPDATE com status='cancelled' preserva valores
-- ============================================================
DO $$
BEGIN
  UPDATE public.sales
     SET status = 'cancelled', total_value = 9999
   WHERE id = current_setting('test.sale_id')::uuid;
END$$;

SELECT is(
  (SELECT cost_at_sale FROM public.sales WHERE id = current_setting('test.sale_id')::uuid),
  2200::numeric,
  'T8 · cancelamento (UPDATE status=cancelled) preserva cost_at_sale anterior'
);

SELECT * FROM finish();
ROLLBACK;
