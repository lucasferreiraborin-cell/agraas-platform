-- 135_backfill_active — Sprint pós-131 · Lucas exige ZERO bugs
--
-- Contexto: a migration 131 instalou triggers (_trg_sales_compute_roi,
-- _trg_sales_accounting, _trg_cost_records_accounting,
-- _trg_cost_records_to_summary). Esses triggers só disparam em NOVOS
-- INSERT/UPDATE. Os dados HISTÓRICOS estão zerados:
--   - applications.total_cost = 0 / NULL em 64/64 linhas
--   - sales.cost_at_sale  IS NULL em 12/12 linhas
--   - accounting_entries  vazia (0 linhas)
--
-- Esta migration faz BACKFILL de tudo, em 4 partes:
--   A. Backfill applications.unit_cost + total_cost via stock_batches.unit_cost
--   B. Recomputar animal_cost_summary chamando a função 076 diretamente
--      (NÃO usamos "UPDATE id=id" porque dispararia
--       before_application_upsert, que falha em rows com batch_id NULL —
--       60 das 64 applications estão nessa situação)
--   C. Re-disparar _trg_sales_compute_roi via touch
--      → popula cost_at_sale + roi + roi_net + funrural_value
--      Aqui o touch é seguro: sales não tem trigger BEFORE UPDATE
--      problemático (trg_check_withdrawal_before_sale e
--      trg_prevent_sale_of_slaughtered_animal são BEFORE INSERT only).
--   D. Replay manual de _fn_sales_accounting para todas as sales históricas
--      (AFTER INSERT trigger não tem efeito retroativo, replay via INSERT)
--
-- Idempotência: rodável 2x (UPSERT/NOT EXISTS em D, COALESCE em A).
-- Side effects: zero — só preenche o que estava NULL/0.

BEGIN;

-- ============================================================
-- PARTE A · Backfill applications.unit_cost + total_cost
-- ============================================================
-- Apenas applications com batch_id apontando para stock_batch com unit_cost.
-- COALESCE garante idempotência (não sobrescreve valores já preenchidos).
-- total_cost = dose * unit_cost (modelo zootécnico: 1 dose * R$/dose).
--
-- Realidade dos dados (verificado 24/06/2026):
--   - 64 applications totais
--   - 4 com batch_id
--   - destes 4, todos apontam para 3 stock_batches distintos com unit_cost
--   - apenas 3 batches têm unit_cost > 0 (média R$ 9,50)
-- Conclusão: ~3-4 applications serão atualizadas. O resto continua zero —
-- só pode ser preenchido via ingestão NF-e (frente fiscal).

UPDATE public.applications a
SET unit_cost  = COALESCE(a.unit_cost, sb.unit_cost),
    total_cost = COALESCE(
      NULLIF(a.total_cost, 0),
      ROUND(COALESCE(a.dose, 0) * COALESCE(sb.unit_cost, 0), 2)
    )
FROM public.stock_batches sb
WHERE a.batch_id = sb.id
  AND sb.unit_cost IS NOT NULL
  AND sb.unit_cost > 0
  AND (a.total_cost IS NULL OR a.total_cost = 0);

-- ============================================================
-- PARTE B · Recomputar animal_cost_summary via SELECT-cycle
-- ============================================================
-- Por que NÃO "UPDATE applications SET id=id"?
--   → before_application_upsert (BEFORE UPDATE) faz SELECT em stock_batches
--     WHERE id = NEW.batch_id e RAISE se não achar. Com 60/64 applications
--     sem batch_id, o touch quebra tudo.
--
-- Solução: replicar a LÓGICA da função 076 (_trg_cost_summary_update)
-- iterando direto sobre os animais que têm applications. Idempotente,
-- determinístico e não trigger-dependente.

WITH animais_afetados AS (
  SELECT DISTINCT a.animal_id
  FROM public.applications a
  WHERE a.animal_id IS NOT NULL
),
totais AS (
  SELECT
    aa.animal_id,
    an.client_id,
    COALESCE(SUM(ap.total_cost), 0)::numeric(10,2) AS total_input
  FROM animais_afetados aa
  JOIN public.animals an ON an.id = aa.animal_id
  LEFT JOIN public.applications ap
    ON ap.animal_id = aa.animal_id AND ap.total_cost IS NOT NULL
  GROUP BY aa.animal_id, an.client_id
)
INSERT INTO public.animal_cost_summary
  (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
SELECT
  t.animal_id, t.client_id, t.total_input, 0, 0, t.total_input, now()
FROM totais t
WHERE t.client_id IS NOT NULL
ON CONFLICT (animal_id) DO UPDATE SET
  total_input_cost = EXCLUDED.total_input_cost,
  total_cost       = EXCLUDED.total_input_cost
                   + public.animal_cost_summary.labor_cost
                   + public.animal_cost_summary.other_costs,
  last_updated     = now();

-- ============================================================
-- PARTE C · Re-disparar _trg_sales_compute_roi (131)
-- ============================================================
-- sales NÃO tem trigger BEFORE UPDATE conflitante:
--   - trg_check_withdrawal_before_sale     → BEFORE INSERT only
--   - trg_prevent_sale_of_slaughtered_animal → BEFORE INSERT only
--   - _trg_sales_compute_roi               → BEFORE INSERT OR UPDATE (queremos)
--   - _trg_sales_accounting                → AFTER INSERT only (não dispara)
-- Touch é seguro.

UPDATE public.sales SET id = id;

-- ============================================================
-- PARTE D · Replay accounting_entries para sales históricas
-- ============================================================
-- O trigger _trg_sales_accounting é AFTER INSERT (não responde a UPDATE em C).
-- Replicamos a lógica via 3 INSERTs SELECT condicionais.
-- Idempotência: NOT EXISTS por (source_type, source_id, debit, credit).
-- Marcamos descrição com "[backfill 135]" para auditoria/rollback.

-- D.1 · Receita · D 1.1.01 (Caixa)  C 3.1.01 (Receita)
INSERT INTO public.accounting_entries
  (client_id, entry_date, debit_account_id, credit_account_id, amount,
   description, source_type, source_id, ai_generated)
SELECT
  COALESCE(s.client_id, an.client_id)                                                      AS client_id,
  COALESCE(s.sale_date, CURRENT_DATE)                                                      AS entry_date,
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '1.1.01')              AS debit_account_id,
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '3.1.01')              AS credit_account_id,
  s.total_value                                                                            AS amount,
  'Receita de venda — sale ' || s.id::text || ' [backfill 135]'                            AS description,
  'sale'                                                                                   AS source_type,
  s.id                                                                                     AS source_id,
  false                                                                                    AS ai_generated
FROM public.sales s
LEFT JOIN public.animals an ON an.id = s.animal_id
WHERE s.status = 'confirmed'
  AND COALESCE(s.total_value, 0) > 0
  AND COALESCE(s.client_id, an.client_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_entries ae
    WHERE ae.source_type = 'sale'
      AND ae.source_id   = s.id
      AND ae.debit_account_id  = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '1.1.01')
      AND ae.credit_account_id = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '3.1.01')
  );

-- D.2 · CMV · D 5.1.01 (CMV)  C 1.1.03 (Estoque)  — apenas se cost_at_sale > 0
INSERT INTO public.accounting_entries
  (client_id, entry_date, debit_account_id, credit_account_id, amount,
   description, source_type, source_id, ai_generated)
SELECT
  COALESCE(s.client_id, an.client_id),
  COALESCE(s.sale_date, CURRENT_DATE),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '5.1.01'),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '1.1.03'),
  s.cost_at_sale,
  'CMV — sale ' || s.id::text || ' [backfill 135]',
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

-- D.3 · FUNRURAL · D 5.1.01 (CMV)  C 2.1.05 (FUNRURAL)  — se funrural_value > 0
INSERT INTO public.accounting_entries
  (client_id, entry_date, debit_account_id, credit_account_id, amount,
   description, source_type, source_id, ai_generated)
SELECT
  COALESCE(s.client_id, an.client_id),
  COALESCE(s.sale_date, CURRENT_DATE),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '5.1.01'),
  public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '2.1.05'),
  s.funrural_value,
  'FUNRURAL 1,5% sobre venda — sale ' || s.id::text || ' [backfill 135]',
  'sale',
  s.id,
  false
FROM public.sales s
LEFT JOIN public.animals an ON an.id = s.animal_id
WHERE s.status = 'confirmed'
  AND COALESCE(s.funrural_value, 0) > 0
  AND COALESCE(s.client_id, an.client_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_entries ae
    WHERE ae.source_type = 'sale'
      AND ae.source_id   = s.id
      AND ae.debit_account_id  = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '5.1.01')
      AND ae.credit_account_id = public._ensure_chart_account(COALESCE(s.client_id, an.client_id), '2.1.05')
  );

COMMIT;

-- ============================================================
-- Notas de auditoria
-- ============================================================
-- 1. Cost_records com lot_id (37 linhas) ainda não somam em animal_cost_summary —
--    isso é tratado na migration 136 (propagação lot→animal). Após a 136 rodar,
--    será preciso novo "touch sales" (incluído na 136) para repropagar
--    cost_at_sale com os custos de lote agora visíveis.
-- 2. Rollback selectivo: DELETE FROM accounting_entries WHERE description LIKE '%[backfill 135]%'
