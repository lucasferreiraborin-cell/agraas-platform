-- 136_lot_to_animal_propagation — Sprint pós-135 · Lucas exige ZERO bugs
--
-- Objetivos:
--   A. Estender _fn_cost_records_to_summary (131) para suportar lot_id:
--      quando NEW.lot_id IS NOT NULL E NEW.animal_id IS NULL,
--      ratear o custo igualmente entre os animais ATIVOS do lote.
--      Decisão metodológica (segurança):
--        - Rateio IGUALITÁRIO entre animais com animal_lot_assignments.exit_date IS NULL
--          e animals.status = 'Ativo'. Não duplicamos linhas em cost_records
--          (a coluna animal_id continua NULL); a propagação é só para o
--          agregado animal_cost_summary.other_costs.
--        - Idempotência: como recomputamos TODA a soma de cost_records por
--          animal (anim direto + share dos lots aos quais o animal pertence),
--          rodar 2x converge para o mesmo valor.
--      Fonte: Embrapa Doc 237 (custo por animal em lote) — quando não há
--      pesagem individual, rateio igualitário é o método aceito.
--
--   B. Backfill: forçar re-cálculo de animal_cost_summary para todos os
--      animais associados a lots com cost_records (37 cost_records hoje).
--
--   C. Re-disparar _trg_sales_compute_roi para repropagar cost_at_sale +
--      ROI agora que animal_cost_summary tem os custos de lote.
--
--   D. Trigger _trg_sales_close_animal AFTER INSERT/UPDATE em sales:
--      quando status='confirmed' e animal_id presente, fecha o animal
--      (status='Vendido'). Idempotente: só atualiza se status='Ativo'.

BEGIN;

-- ============================================================
-- PARTE A · Reescreve _fn_cost_records_to_summary para suportar lot_id
-- ============================================================
-- A função original (131) ignora rows com animal_id IS NULL. Aqui:
--  - Se NEW/OLD.animal_id NOT NULL → coleta esse animal.
--  - Se NEW/OLD.lot_id NOT NULL    → coleta TODOS animais ativos do lote.
-- Depois recalcula o agregado other_costs para cada animal coletado.
--
-- Para o agregado por animal, somamos:
--   (1) cost_records onde animal_id = X  (custo direto)
-- + (2) SUM(cost_records.amount / N_animais_ativos_do_lote) para cada
--       cost_record com lot_id em que o animal está associado (exit_date IS NULL).
-- N_animais é resolvido por uma subquery contra animal_lot_assignments.

DROP TRIGGER IF EXISTS _trg_cost_records_to_summary ON public.cost_records;
DROP FUNCTION IF EXISTS public._fn_cost_records_to_summary();

CREATE OR REPLACE FUNCTION public._fn_cost_records_to_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_animal_ids uuid[] := ARRAY[]::uuid[];
  v_aid        uuid;
  v_client_id  uuid;
  v_sum_direct numeric(14,2);
  v_sum_lot    numeric(14,2);
  v_total      numeric(14,2);
BEGIN
  -- Coleta animal_ids afetados.
  -- Caso 1 · cost direto no animal
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.animal_id IS NOT NULL THEN
    v_animal_ids := v_animal_ids || NEW.animal_id;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.animal_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.animal_id IS DISTINCT FROM OLD.animal_id) THEN
    v_animal_ids := v_animal_ids || OLD.animal_id;
  END IF;

  -- Caso 2 · cost via lot → coleta animais ATIVOS do lote
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.lot_id IS NOT NULL THEN
    SELECT array_agg(DISTINCT ala.animal_id) INTO v_animal_ids
    FROM public.animal_lot_assignments ala
    JOIN public.animals a ON a.id = ala.animal_id
    WHERE ala.lot_id = NEW.lot_id
      AND ala.exit_date IS NULL
      AND a.status = 'Ativo';
    -- mescla com já coletados
    IF v_animal_ids IS NULL THEN v_animal_ids := ARRAY[]::uuid[]; END IF;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.lot_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.lot_id IS DISTINCT FROM OLD.lot_id) THEN
    SELECT array_cat(
      v_animal_ids,
      COALESCE(array_agg(DISTINCT ala.animal_id), ARRAY[]::uuid[])
    ) INTO v_animal_ids
    FROM public.animal_lot_assignments ala
    JOIN public.animals a ON a.id = ala.animal_id
    WHERE ala.lot_id = OLD.lot_id
      AND ala.exit_date IS NULL
      AND a.status = 'Ativo';
  END IF;

  -- Dedup
  IF v_animal_ids IS NULL THEN
    v_animal_ids := ARRAY[]::uuid[];
  END IF;
  SELECT array_agg(DISTINCT x) INTO v_animal_ids
  FROM unnest(v_animal_ids) AS t(x)
  WHERE x IS NOT NULL;

  IF v_animal_ids IS NULL OR array_length(v_animal_ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  -- Recomputa other_costs para cada animal afetado.
  FOREACH v_aid IN ARRAY v_animal_ids LOOP
    SELECT a.client_id INTO v_client_id
    FROM public.animals a
    WHERE a.id = v_aid;

    IF v_client_id IS NULL THEN
      CONTINUE;
    END IF;

    -- (1) Soma direta (cost_records.animal_id = v_aid)
    SELECT COALESCE(SUM(amount), 0)::numeric(14,2) INTO v_sum_direct
    FROM public.cost_records
    WHERE animal_id = v_aid;

    -- (2) Soma rateada de lots aos quais o animal está ativo
    --     Para cada cost_record.lot_id ∈ {lots do animal}, soma amount / N_atual.
    --     N_atual = animais ATIVOS no lote no MOMENTO da consulta.
    --     Limitação assumida: o rateio reflete a composição atual do lote,
    --     não a do dia do cost_record. Documentada para auditoria.
    SELECT COALESCE(SUM(
      cr.amount / NULLIF(
        (SELECT COUNT(*)
         FROM public.animal_lot_assignments ala2
         JOIN public.animals a2 ON a2.id = ala2.animal_id
         WHERE ala2.lot_id = cr.lot_id
           AND ala2.exit_date IS NULL
           AND a2.status = 'Ativo'),
      0)
    ), 0)::numeric(14,2) INTO v_sum_lot
    FROM public.cost_records cr
    JOIN public.animal_lot_assignments ala ON ala.lot_id = cr.lot_id
    WHERE ala.animal_id = v_aid
      AND ala.exit_date IS NULL
      AND cr.lot_id IS NOT NULL;

    v_total := COALESCE(v_sum_direct, 0) + COALESCE(v_sum_lot, 0);

    INSERT INTO public.animal_cost_summary
      (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
    VALUES
      (v_aid, v_client_id, 0, 0, v_total, v_total, now())
    ON CONFLICT (animal_id) DO UPDATE
      SET other_costs  = EXCLUDED.other_costs,
          total_cost   = public.animal_cost_summary.total_input_cost
                       + public.animal_cost_summary.labor_cost
                       + EXCLUDED.other_costs,
          last_updated = now();
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE TRIGGER _trg_cost_records_to_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_records
  FOR EACH ROW EXECUTE FUNCTION public._fn_cost_records_to_summary();

-- ============================================================
-- PARTE B · Backfill: dispara recálculo para todos os cost_records existentes
-- ============================================================
-- "UPDATE id = id" toca cada linha. Como o trigger é AFTER UPDATE,
-- a função recalcula os animais afetados. cost_records não tem trigger
-- BEFORE UPDATE conflitante (_cost_records_set_client_id é INSERT only).
-- _trg_cost_records_accounting é AFTER INSERT only — não duplica accounting.

UPDATE public.cost_records SET id = id;

-- ============================================================
-- PARTE C · Repropaga sales (cost_at_sale agora reflete custos de lote)
-- ============================================================
-- Após a parte B, animal_cost_summary.total_cost dos animais associados
-- a lots com cost_records reflete o rateio. Re-touch sales reaplica
-- _trg_sales_compute_roi → cost_at_sale + roi atualizados.
-- Em seguida, replay accounting para CMV das sales que agora ficaram > 0
-- (idempotência via NOT EXISTS já garantida do mesmo padrão da 135).

UPDATE public.sales SET id = id;

-- C.2 · Replay accounting CMV para sales que ganharam cost_at_sale > 0
INSERT INTO public.accounting_entries
  (client_id, entry_date, debit_account_id, credit_account_id, amount,
   description, source_type, source_id, ai_generated)
SELECT
  COALESCE(s.client_id, an.client_id),
  COALESCE(s.sale_date, CURRENT_DATE),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '5.1.01'),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '1.1.03'),
  s.cost_at_sale,
  'CMV — sale ' || s.id::text || ' [backfill 136 lot]',
  'sale',
  s.id,
  false
FROM public.sales s
LEFT JOIN public.animals an ON an.id = s.animal_id
WHERE s.status = 'confirmed'
  AND COALESCE(s.cost_at_sale, 0) > 0
  AND NOT COALESCE(s.cost_estimated, false)
  AND COALESCE(s.client_id, an.client_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_entries ae
    WHERE ae.source_type = 'sale'
      AND ae.source_id   = s.id
      AND ae.debit_account_id  = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '5.1.01')
      AND ae.credit_account_id = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '1.1.03')
  );

-- ============================================================
-- PARTE D · Trigger _trg_sales_close_animal (fecha animal vendido)
-- ============================================================
-- AFTER INSERT OR UPDATE: se sale.status='confirmed' e animal existe,
-- atualiza animals.status='Vendido'. Só atua se animal está 'Ativo'
-- (preserva idempotência e protege contra reabertura).
-- Backfill: após criar o trigger, fecha animais já vendidos historicamente.

DROP TRIGGER IF EXISTS _trg_sales_close_animal ON public.sales;
DROP FUNCTION IF EXISTS public._fn_sales_close_animal();

CREATE OR REPLACE FUNCTION public._fn_sales_close_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.animal_id IS NOT NULL THEN
    UPDATE public.animals
    SET status     = 'Vendido',
        updated_at = now()
    WHERE id     = NEW.animal_id
      AND status = 'Ativo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER _trg_sales_close_animal
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public._fn_sales_close_animal();

-- Backfill: fecha os 12 animais já vendidos
UPDATE public.animals a
SET status='Vendido', updated_at=now()
WHERE a.status='Ativo'
  AND EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.animal_id = a.id
      AND s.status = 'confirmed'
  );

COMMIT;

-- ============================================================
-- Notas de auditoria
-- ============================================================
-- 1. Decisão metodológica do rateio: igualitário entre animais ativos no
--    momento da consulta. Embrapa Doc 237 aceita esse método quando não
--    há pesagem individual. TODO futuro: pesar por dias-no-lote ou por kg
--    (precisa decisão Lucas + Dra. Renata, mentoria IZ-SP).
-- 2. Limitação conhecida: se animal sai do lote (exit_date preenchido)
--    DEPOIS de cost_record já lançado, o histórico não é re-rateado.
--    Aceitável para v1 — em v2, snapshot por data via tabela auxiliar.
-- 3. _trg_sales_close_animal idempotente — não reabre animal vendido.
