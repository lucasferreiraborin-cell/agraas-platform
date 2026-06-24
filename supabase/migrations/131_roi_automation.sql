-- 131_roi_automation — Sprint H · B7+B8+B9 do backlog 2026-06-23
--
-- Objetivo (spec controladoria-fiscal):
--   B7. Triggers para popular automaticamente:
--        - animal_cost_summary.other_costs a partir de cost_records (animal_id)
--        - sales.cost_at_sale + sales.roi + sales.roi_net + funrural
--   B8. Lançamentos contábeis (accounting_entries) automáticos para sales e cost_records
--   B9. Plano de contas seed + parametrização FUNRURAL (PF 1,5% padrão)
--
-- Reconciliação com schema atual (verificado em 24/06/2026):
--   - accounting_entries JÁ EXISTE com debit_account_id/credit_account_id UUID
--     referenciando chart_of_accounts(id). NÃO usamos hardcode text como
--     descrito na spec — fazemos lookup por code em chart_of_accounts.
--   - chart_of_accounts JÁ EXISTE (vazia). Esta migration semeia o plano
--     padrão por client_id no momento em que um trigger precisar (lazy seed).
--   - source_type CHECK não contempla 'cost_record'/'reversal'. Estendemos.
--   - sales não tem status/funrural_value/roi_net/cost_estimated. Adicionamos.
--
-- SECURITY DEFINER em todas as funções de trigger para garantir que
-- escrevam em accounting_entries e animal_cost_summary mesmo quando o
-- caller só tem permissão sobre a tabela origem (sales/cost_records).
-- search_path travado em public, pg_temp.

BEGIN;

-- ============================================================
-- PARTE 1 · ALTER TABLE sales
-- ============================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS roi_net          numeric(14,2),
  ADD COLUMN IF NOT EXISTS funrural_value   numeric(14,2),
  ADD COLUMN IF NOT EXISTS cost_estimated   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status           text    NOT NULL DEFAULT 'confirmed';

-- CHECK em status (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_status_check'
      AND conrelid = 'public.sales'::regclass
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_status_check
      CHECK (status IN ('confirmed','cancelled'));
  END IF;
END$$;

-- ============================================================
-- PARTE 2 · Estender CHECK de accounting_entries.source_type
-- (adicionar 'cost_record' e 'reversal' para refletir a spec)
-- ============================================================

ALTER TABLE public.accounting_entries
  DROP CONSTRAINT IF EXISTS accounting_entries_source_type_check;

ALTER TABLE public.accounting_entries
  ADD CONSTRAINT accounting_entries_source_type_check
  CHECK (source_type IN (
    'fiscal_invoice',
    'sale',
    'application',
    'cost_record',
    'reversal',
    'manual',
    'ai_auto',
    'recurring'
  ));

-- Index utilitário para consulta por documento de origem
CREATE INDEX IF NOT EXISTS idx_accounting_entries_client_date
  ON public.accounting_entries (client_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_source
  ON public.accounting_entries (source_type, source_id);

-- ============================================================
-- PARTE 3 · Plano de contas padrão (lazy seed por client)
-- ============================================================
-- Função utilitária: garante o plano de contas mínimo para um client_id.
-- Retorna o uuid da conta dado o code. Cria as 8 contas básicas se não
-- existirem. Roda SECURITY DEFINER para que triggers consigam plantar
-- contas mesmo sob a sessão de um usuário regular.

CREATE OR REPLACE FUNCTION public._ensure_chart_account(
  p_client_id uuid,
  p_code      text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Tenta achar primeiro (caminho quente)
  SELECT id INTO v_id
  FROM public.chart_of_accounts
  WHERE client_id = p_client_id AND code = p_code;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Lazy seed das 8 contas básicas que os triggers usam.
  -- Idempotente via ON CONFLICT(client_id, code).
  INSERT INTO public.chart_of_accounts (client_id, code, name, nature, subtype, is_active)
  VALUES
    (p_client_id, '1.1.01', 'Caixa e equivalentes',           'asset',     'current_asset', true),
    (p_client_id, '1.1.03', 'Estoque (insumos/animais)',      'asset',     'inventory',     true),
    (p_client_id, '2.1.05', 'FUNRURAL a recolher',            'liability', 'tax_payable',   true),
    (p_client_id, '3.1.01', 'Receita de venda de animais',    'revenue',   'sales_revenue', true),
    (p_client_id, '5.1.01', 'CMV — Custo de mercadoria vendida','cost',    'cogs',          true),
    (p_client_id, '5.2.01', 'Despesas com insumos sanitários','expense',   'opex',          true),
    (p_client_id, '5.2.02', 'Despesas com mão de obra',       'expense',   'opex',          true),
    (p_client_id, '5.2.03', 'Outras despesas operacionais',   'expense',   'opex',          true)
  ON CONFLICT (client_id, code) DO NOTHING;

  -- Re-busca após o seed
  SELECT id INTO v_id
  FROM public.chart_of_accounts
  WHERE client_id = p_client_id AND code = p_code;

  RETURN v_id;
END;
$$;

-- ============================================================
-- PARTE 4 · TRIGGER 1 · cost_records → animal_cost_summary.other_costs
-- ============================================================
-- AFTER INSERT/UPDATE/DELETE: recalcula other_costs do animal afetado.
-- Pula se animal_id IS NULL (custo de lote será tratado em B7-fase-2).

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
  v_sum        numeric(14,2);
BEGIN
  -- Coleta animal_ids afetados (INSERT/UPDATE → NEW; DELETE → OLD).
  -- Em UPDATE com mudança de animal_id precisamos recomputar ambos.
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.animal_id IS NOT NULL THEN
    v_animal_ids := v_animal_ids || NEW.animal_id;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.animal_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.animal_id IS DISTINCT FROM OLD.animal_id) THEN
    v_animal_ids := v_animal_ids || OLD.animal_id;
  END IF;

  -- Recomputa each
  FOREACH v_aid IN ARRAY v_animal_ids LOOP
    -- client_id do animal (não confiamos no cost_record.client_id, busca canônica)
    SELECT a.client_id INTO v_client_id
    FROM public.animals a
    WHERE a.id = v_aid;

    IF v_client_id IS NULL THEN
      CONTINUE; -- animal órfão, skip silencioso
    END IF;

    -- Soma absoluta de cost_records do animal
    SELECT COALESCE(SUM(amount), 0)::numeric(14,2) INTO v_sum
    FROM public.cost_records
    WHERE animal_id = v_aid;

    -- Upsert em animal_cost_summary, mantendo total_input_cost e labor_cost
    INSERT INTO public.animal_cost_summary
      (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost, last_updated)
    VALUES
      (v_aid, v_client_id, 0, 0, v_sum, v_sum, now())
    ON CONFLICT (animal_id) DO UPDATE
      SET other_costs  = EXCLUDED.other_costs,
          total_cost   = public.animal_cost_summary.total_input_cost
                       + public.animal_cost_summary.labor_cost
                       + EXCLUDED.other_costs,
          last_updated = now();
  END LOOP;

  RETURN NULL; -- AFTER trigger
END;
$$;

CREATE TRIGGER _trg_cost_records_to_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_records
  FOR EACH ROW EXECUTE FUNCTION public._fn_cost_records_to_summary();

-- ============================================================
-- PARTE 5 · TRIGGER 2 · sales BEFORE INSERT/UPDATE → cost_at_sale + roi
-- ============================================================
-- Calcula cost_at_sale puxando animal_cost_summary.total_cost.
-- FUNRURAL: 1,5% (PF padrão) sobre total_value. TODO: parametrizar por
-- client em platform_settings quando vier o número exato.
-- Se total_cost == 0, marca cost_estimated=true e zera roi/roi_net.
-- Se status='cancelled', NOOP (preserva valores como estavam).

DROP TRIGGER IF EXISTS _trg_sales_compute_roi ON public.sales;
DROP FUNCTION IF EXISTS public._fn_sales_compute_roi();

CREATE OR REPLACE FUNCTION public._fn_sales_compute_roi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cost      numeric(14,2);
  v_funrural  numeric(14,2);
  v_total     numeric(14,2);
BEGIN
  -- Guard de cancelamento: preserva os valores existentes.
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.total_value, 0);

  -- Puxa custo do animal (se houver animal_id)
  IF NEW.animal_id IS NOT NULL THEN
    SELECT COALESCE(total_cost, 0) INTO v_cost
    FROM public.animal_cost_summary
    WHERE animal_id = NEW.animal_id;
  ELSE
    v_cost := 0;
  END IF;

  v_cost := COALESCE(v_cost, 0);

  -- FUNRURAL: 1,5% PF padrão (TODO: parametrizar via platform_settings/client)
  v_funrural := ROUND(v_total * 0.015, 2);

  NEW.cost_at_sale   := v_cost;
  NEW.funrural_value := v_funrural;

  IF v_cost = 0 THEN
    -- Sem custo conhecido: ROI fica nulo e marcamos para o painel mostrar aviso.
    NEW.cost_estimated := true;
    NEW.roi            := NULL;
    NEW.roi_net        := NULL;
  ELSE
    NEW.cost_estimated := false;
    -- ROI bruto: (receita - custo) / custo
    NEW.roi     := ROUND(((v_total - v_cost) / v_cost) * 100, 2);
    -- ROI líquido: deduz FUNRURAL
    NEW.roi_net := ROUND(((v_total - v_funrural - v_cost) / v_cost) * 100, 2);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER _trg_sales_compute_roi
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public._fn_sales_compute_roi();

-- ============================================================
-- PARTE 6 · TRIGGER 3 · sales AFTER INSERT → accounting_entries
-- ============================================================
-- Gera 2-3 lançamentos:
--   1) Receita      D 1.1.01 (Caixa)         C 3.1.01 (Receita venda)
--   2) CMV          D 5.1.01 (CMV)           C 1.1.03 (Estoque)        — se cost > 0
--   3) FUNRURAL     D 5.1.01 (CMV)           C 2.1.05 (FUNRURAL a rec) — se funrural > 0
-- Skip se status='cancelled'.

DROP TRIGGER IF EXISTS _trg_sales_accounting ON public.sales;
DROP FUNCTION IF EXISTS public._fn_sales_accounting();

CREATE OR REPLACE FUNCTION public._fn_sales_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_date      date;
  v_caixa     uuid;
  v_receita   uuid;
  v_cmv       uuid;
  v_estoque   uuid;
  v_funrural  uuid;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- client_id pode vir do registro; se não vier, busca pelo animal.
  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT client_id INTO v_client_id FROM public.animals WHERE id = NEW.animal_id;
  END IF;
  IF v_client_id IS NULL THEN
    RETURN NEW; -- sem client não conseguimos contabilizar
  END IF;

  v_date := COALESCE(NEW.sale_date, CURRENT_DATE);

  -- Garante o plano de contas (lazy seed)
  v_caixa    := public._ensure_chart_account(v_client_id, '1.1.01');
  v_estoque  := public._ensure_chart_account(v_client_id, '1.1.03');
  v_funrural := public._ensure_chart_account(v_client_id, '2.1.05');
  v_receita  := public._ensure_chart_account(v_client_id, '3.1.01');
  v_cmv      := public._ensure_chart_account(v_client_id, '5.1.01');

  -- 1) Receita (sempre que total_value > 0)
  IF COALESCE(NEW.total_value, 0) > 0 THEN
    INSERT INTO public.accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated)
    VALUES
      (v_client_id, v_date, v_caixa, v_receita, NEW.total_value,
       'Receita de venda — sale ' || NEW.id::text,
       'sale', NEW.id, false);
  END IF;

  -- 2) CMV (apenas se temos custo confiável)
  IF COALESCE(NEW.cost_at_sale, 0) > 0 AND NOT COALESCE(NEW.cost_estimated, false) THEN
    INSERT INTO public.accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated)
    VALUES
      (v_client_id, v_date, v_cmv, v_estoque, NEW.cost_at_sale,
       'CMV — sale ' || NEW.id::text,
       'sale', NEW.id, false);
  END IF;

  -- 3) FUNRURAL
  IF COALESCE(NEW.funrural_value, 0) > 0 THEN
    INSERT INTO public.accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated)
    VALUES
      (v_client_id, v_date, v_cmv, v_funrural, NEW.funrural_value,
       'FUNRURAL 1,5% sobre venda — sale ' || NEW.id::text,
       'sale', NEW.id, false);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER _trg_sales_accounting
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public._fn_sales_accounting();

-- ============================================================
-- PARTE 7 · TRIGGER 4 · cost_records AFTER INSERT → accounting_entries
-- ============================================================
-- D 5.2.03 (Outras despesas operacionais)
-- C 1.1.03 (Estoque)
-- Usa ABS(amount) para suportar reversões com valor negativo.

DROP TRIGGER IF EXISTS _trg_cost_records_accounting ON public.cost_records;
DROP FUNCTION IF EXISTS public._fn_cost_records_accounting();

CREATE OR REPLACE FUNCTION public._fn_cost_records_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_amt       numeric(14,2);
  v_despesa   uuid;
  v_estoque   uuid;
BEGIN
  v_amt := ABS(COALESCE(NEW.amount, 0));
  IF v_amt = 0 THEN
    RETURN NEW;
  END IF;

  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT client_id INTO v_client_id FROM public.animals WHERE id = NEW.animal_id;
  END IF;
  IF v_client_id IS NULL THEN
    RETURN NEW; -- sem client, não contabiliza
  END IF;

  v_despesa := public._ensure_chart_account(v_client_id, '5.2.03');
  v_estoque := public._ensure_chart_account(v_client_id, '1.1.03');

  INSERT INTO public.accounting_entries
    (client_id, entry_date, debit_account_id, credit_account_id, amount,
     description, source_type, source_id, ai_generated)
  VALUES
    (v_client_id, COALESCE(NEW.cost_date, CURRENT_DATE),
     v_despesa, v_estoque, v_amt,
     'Custo registrado — cost_record ' || NEW.id::text
       || COALESCE(' (' || NEW.category || ')', ''),
     CASE WHEN NEW.amount < 0 THEN 'reversal' ELSE 'cost_record' END,
     NEW.id, false);

  RETURN NEW;
END;
$$;

CREATE TRIGGER _trg_cost_records_accounting
  AFTER INSERT ON public.cost_records
  FOR EACH ROW EXECUTE FUNCTION public._fn_cost_records_accounting();

COMMIT;

-- ============================================================
-- Notas de operação (não executar)
-- ============================================================
-- 1. Backfill ROI das vendas existentes: rodar manualmente em janela curta
--      UPDATE public.sales SET id = id WHERE roi IS NULL;
--    (toca a linha para disparar BEFORE UPDATE; spec confirma OK em B7-fase-2)
--
-- 2. Backfill accounting_entries para sales/cost_records pré-131:
--    NÃO automatizar — o trigger AFTER INSERT só pega novos. Backfill será
--    feito em script separado por client após validação do plano de contas.
--
-- 3. FUNRURAL PJ (0,8%) vs PF (1,5%) → adicionar coluna em clients
--    (ex.: funrural_rate numeric default 0.015) numa migration futura.
--
-- 4. Custo de lote (cost_records.lot_id IS NOT NULL) ainda não rateia para
--    animal_cost_summary. Adiado para 132 (precisa decisão metodológica:
--    rateio igualitário? por peso? por dias-no-lote?).
