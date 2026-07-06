-- ============================================================
-- Migration 151 — ROI com custo de referência setorial (backfill demo BTG)
-- Sprint L · 06/07/2026
--
-- PROPÓSITO:
-- As 12 vendas do FSJBE precisam exibir ROI na demo BTG (André Esteves).
-- Onde NÃO existe custo real registrado (animal_cost_summary.total_cost = 0
-- ou linha ausente), aplicamos um CUSTO DE REFERÊNCIA SETORIAL — rotulado
-- HONESTAMENTE como estimativa (cost_estimated = true) — para que o painel
-- consiga calcular ROI sem inventar custo real nem sujar a escrituração
-- fiscal oficial.
--
-- ⚠️  ESTIMATIVA, NÃO CUSTO REAL:
-- Nenhuma linha com custo real é sobrescrita. O backfill só toca animais
-- vendidos cujo total_cost seja 0/NULL, marcando cost_estimated = true +
-- fonte + data. Custo real sempre prevalece (roi permanece calculado do real).
--
-- FONTES DO CUSTO DE REFERÊNCIA (R$/cabeça, ponto médio, ano 2025):
--   - CNA/CEPEA Campo Futuro 2025 (COT/COE por fase produtiva)
--   - ABIEC Beef Report 2025 (custo de produção do boi gordo)
--   - Scot Consultoria 2025 (reposição bezerro/boi magro)
--   Valores ajustados para o patamar de alta de 2025 (+~30% vs. série
--   histórica pré-2024, refletindo reposição e insumos caros).
--   Custo de referência é uma APROXIMAÇÃO metodológica, não custo auditado.
--
-- CONTABILIZAÇÃO:
-- O CMV estimado NUNCA entra na conta oficial 5.1.01 (CMV fiscal). Criamos
-- a conta 5.1.02 'CMV estimado (referência setorial)' — assim o DRE oficial
-- (fiscal/LCDPR) permanece intacto e a estimativa fica segregada e auditável.
--
-- IDEMPOTÊNCIA: IF NOT EXISTS, ON CONFLICT, NOT EXISTS em todos os blocos.
-- Roda 2x sem erro e sem duplicar lançamentos.
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 1 · Colunas de rotulagem da estimativa em animal_cost_summary
-- ============================================================
ALTER TABLE public.animal_cost_summary
  ADD COLUMN IF NOT EXISTS cost_estimated        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_estimation_source text,
  ADD COLUMN IF NOT EXISTS cost_estimation_date   date;

COMMENT ON COLUMN public.animal_cost_summary.cost_estimated IS
  'true = total_cost é custo de REFERÊNCIA setorial (estimativa), não custo real registrado. Rotulagem honesta para o painel/ROI.';
COMMENT ON COLUMN public.animal_cost_summary.cost_estimation_source IS
  'Fonte metodológica do custo estimado (CNA Campo Futuro / ABIEC / Scot 2025). NULL quando custo é real.';
COMMENT ON COLUMN public.animal_cost_summary.cost_estimation_date IS
  'Data em que o custo de referência foi aplicado (rastreabilidade da estimativa).';

-- ============================================================
-- PARTE 2 · Função de custo de referência por conta contábil / categoria
-- ============================================================
-- IMMUTABLE: entrada → saída determinística, sem I/O. Segura para uso em
-- UPDATE/INSERT em massa. Recebe o code CPC 29 (animals.conta_contabil, vide
-- migration 145/150) e, como fallback, a categoria textual normalizada.
-- Retorna NULL quando não há referência publicada (ex.: touro reprodutor —
-- valor genético muito variável, não estimamos).

CREATE OR REPLACE FUNCTION public._fn_reference_cost_by_account(
  p_conta_contabil text,
  p_category       text
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cat_norm text;
BEGIN
  -- 1) Preferência: código de conta CPC 29 (plano rural migration 145)
  CASE p_conta_contabil
    WHEN '1.1.06.03' THEN RETURN 1300;   -- Bezerros (cria)          → reposição bezerro
    WHEN '1.1.06.02' THEN RETURN 2550;   -- Bovinos em recria        → boi magro parcial
    WHEN '1.1.06.01' THEN RETURN 3600;   -- Bovinos em engorda       → custo boi terminado
    WHEN '1.2.01.01' THEN RETURN 2000;   -- Matrizes (vacas)         → custo de formação
    WHEN '1.2.01.02' THEN RETURN NULL;   -- Touros reprodutores      → sem referência (genética)
    WHEN '1.1.06'    THEN RETURN 3600;   -- Fallback ativo biológico circulante genérico
    ELSE NULL;                           -- cai no fallback por categoria abaixo
  END CASE;

  -- 2) Fallback: categoria textual normalizada (dados legados sem conta_contabil)
  v_cat_norm := lower(trim(COALESCE(p_category, '')));

  RETURN CASE
    WHEN v_cat_norm IN ('bezerro','bezerra','cria')                 THEN 1300
    WHEN v_cat_norm IN ('novilha','recria')                         THEN 2550
    WHEN v_cat_norm IN ('novilho','novilho em engorda','boi em engorda','engorda') THEN 3600
    ELSE 3600  -- default conservador: custo de boi terminado
  END;
END;
$$;

COMMENT ON FUNCTION public._fn_reference_cost_by_account(text, text) IS
  'Custo de REFERÊNCIA setorial R$/cabeça por conta CPC 29 (fallback categoria). Fontes: CNA Campo Futuro 2025, ABIEC Beef Report 2025, Scot Consultoria 2025 (ponto médio, ajuste alta +30% 2025). Touro → NULL (sem referência). ESTIMATIVA, não custo real.';

-- ============================================================
-- PARTE 3 · Backfill animal_cost_summary — SÓ animais vendidos, SÓ estimativa
-- ============================================================
-- Regra de ouro: nunca sobrescrever custo real. Só age onde total_cost = 0
-- ou a linha nem existe. Escopo restrito a animais que possuem venda
-- confirmada (sales.status <> 'cancelled'), que são os que a demo precisa.

-- C1) UPDATE: linhas existentes com custo zerado → aplica referência
UPDATE public.animal_cost_summary acs
   SET total_cost            = ref.cost,
       other_costs           = ref.cost,
       cost_estimated        = true,
       cost_estimation_source= 'Referência setorial (CNA Campo Futuro / ABIEC / Scot 2025)',
       cost_estimation_date  = CURRENT_DATE,
       last_updated          = now()
  FROM (
    SELECT DISTINCT a.id AS animal_id,
           public._fn_reference_cost_by_account(a.conta_contabil, a.category) AS cost
    FROM public.animals a
    JOIN public.sales s
      ON s.animal_id = a.id
     AND COALESCE(s.status, 'confirmed') <> 'cancelled'
  ) ref
 WHERE acs.animal_id = ref.animal_id
   AND ref.cost IS NOT NULL
   AND COALESCE(acs.total_cost, 0) = 0;   -- NUNCA toca custo real (> 0)

-- C2) INSERT: animais vendidos SEM linha em animal_cost_summary
INSERT INTO public.animal_cost_summary
  (animal_id, client_id, total_input_cost, labor_cost, other_costs, total_cost,
   cost_estimated, cost_estimation_source, cost_estimation_date, last_updated)
SELECT DISTINCT
  a.id,
  a.client_id,
  0,
  0,
  ref.cost,
  ref.cost,
  true,
  'Referência setorial (CNA Campo Futuro / ABIEC / Scot 2025)',
  CURRENT_DATE,
  now()
FROM public.animals a
JOIN public.sales s
  ON s.animal_id = a.id
 AND COALESCE(s.status, 'confirmed') <> 'cancelled'
CROSS JOIN LATERAL (
  SELECT public._fn_reference_cost_by_account(a.conta_contabil, a.category) AS cost
) ref
WHERE ref.cost IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.animal_cost_summary acs WHERE acs.animal_id = a.id
  )
ON CONFLICT (animal_id) DO NOTHING;

-- ============================================================
-- PARTE 4 · _fn_sales_compute_roi — lê e propaga cost_estimated
-- ============================================================
-- Reescreve a função da 141 para LER animal_cost_summary.cost_estimated e
-- PROPAGAR para sales.cost_estimated. Mantém FUNRURAL dinâmico (clients.
-- funrural_rate, COALESCE 0.0163). Quando v_cost > 0 usa o flag REAL do
-- summary (custo real → false; custo de referência → true, mas ainda calcula
-- ROI). Quando v_cost = 0 (nenhum custo, nem estimado), cost_estimated = true
-- e roi/roi_net = NULL.

CREATE OR REPLACE FUNCTION public._fn_sales_compute_roi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cost           numeric(14,2);
  v_funrural       numeric(14,2);
  v_total          numeric(14,2);
  v_client_id      uuid;
  v_funrural_rate  numeric(8,4);
  v_cost_estimated boolean := false;
BEGIN
  -- Guard de cancelamento: preserva valores existentes.
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.total_value, 0);

  -- Resolve client (NEW.client_id ou via animal)
  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT client_id INTO v_client_id
      FROM public.animals WHERE id = NEW.animal_id;
  END IF;

  -- Alíquota FUNRURAL parametrizada (default 1,63% PF pós LC 224/2025)
  IF v_client_id IS NOT NULL THEN
    SELECT funrural_rate INTO v_funrural_rate
      FROM public.clients WHERE id = v_client_id;
  END IF;
  v_funrural_rate := COALESCE(v_funrural_rate, 0.0163);

  -- Puxa custo + flag de estimativa do summary do animal
  IF NEW.animal_id IS NOT NULL THEN
    SELECT COALESCE(total_cost, 0), COALESCE(cost_estimated, false)
      INTO v_cost, v_cost_estimated
      FROM public.animal_cost_summary
      WHERE animal_id = NEW.animal_id;
  END IF;
  v_cost           := COALESCE(v_cost, 0);
  v_cost_estimated := COALESCE(v_cost_estimated, false);

  -- FUNRURAL parametrizado por client_id
  v_funrural := ROUND(v_total * v_funrural_rate, 2);

  NEW.cost_at_sale   := v_cost;
  NEW.funrural_value := v_funrural;

  IF v_cost = 0 THEN
    -- Sem custo algum (nem real, nem estimado): ROI nulo, marca estimado.
    NEW.cost_estimated := true;
    NEW.roi            := NULL;
    NEW.roi_net        := NULL;
  ELSE
    -- Há custo: usa o flag REAL do summary (real → false; referência → true).
    -- Em ambos os casos calculamos ROI (a rotulagem honesta fica no flag).
    NEW.cost_estimated := v_cost_estimated;
    NEW.roi     := ROUND(((v_total - v_cost) / v_cost) * 100, 2);
    NEW.roi_net := ROUND(((v_total - v_funrural - v_cost) / v_cost) * 100, 2);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._fn_sales_compute_roi() IS
  'Migration 151 — calcula cost_at_sale, funrural_value (rate dinâmica clients.funrural_rate), roi e roi_net; PROPAGA animal_cost_summary.cost_estimated para sales.cost_estimated (custo de referência ainda gera ROI, rotulado como estimativa). LC 224/2025.';

-- ============================================================
-- PARTE 5 · Seed da conta 5.1.02 'CMV estimado (referência setorial)'
-- ============================================================
-- Cria a conta segregada para cada client que tenha AO MENOS uma venda que
-- receberá custo estimado. Natureza 'cost', code 5.1.02 (irmã da 5.1.01
-- oficial). Idempotente via ON CONFLICT (client_id, code).

INSERT INTO public.chart_of_accounts (client_id, code, name, nature, subtype, is_active)
SELECT DISTINCT
  a.client_id,
  '5.1.02',
  'CMV estimado (referência setorial)',
  'cost',
  'cogs',
  true
FROM public.animals a
JOIN public.animal_cost_summary acs ON acs.animal_id = a.id AND acs.cost_estimated = true
JOIN public.sales s
  ON s.animal_id = a.id
 AND COALESCE(s.status, 'confirmed') <> 'cancelled'
WHERE a.client_id IS NOT NULL
ON CONFLICT (client_id, code) DO NOTHING;

-- ============================================================
-- PARTE 6 · Re-disparar ROI em todas as vendas (padrão seguro da 141)
-- ============================================================
-- UPDATE no-op via status = status aciona BEFORE UPDATE → _fn_sales_compute_roi
-- recalcula cost_at_sale/roi/roi_net/cost_estimated. NÃO usamos "SET id = id"
-- (risco de FK/unique). O trigger de escrituração (146/149) NÃO gera CMV para
-- vendas estimadas (guard NOT cost_estimated), então o UPDATE não polui 5.1.01.

UPDATE public.sales
   SET status = status
 WHERE animal_id IS NOT NULL;

-- ============================================================
-- PARTE 7 · Lançamentos contábeis de CMV ESTIMADO (segregados em 5.1.02)
-- ============================================================
-- Para cada venda com cost_estimated = true e cost_at_sale > 0, lança:
--   D 5.1.02 (CMV estimado)   C 1.1.03 (Estoque)
-- NUNCA em 5.1.01 (CMV oficial fiscal). Idempotente via NOT EXISTS na marca
-- textual do lançamento ('CMV estimado').

DO $$
DECLARE
  r          record;
  v_cmv_est  uuid;
  v_estoque  uuid;
BEGIN
  FOR r IN
    SELECT s.id AS sale_id,
           s.sale_date,
           s.cost_at_sale,
           COALESCE(s.client_id,
                    (SELECT a.client_id FROM public.animals a WHERE a.id = s.animal_id)) AS client_id
    FROM public.sales s
    WHERE COALESCE(s.status, 'confirmed') <> 'cancelled'
      AND COALESCE(s.cost_estimated, false) = true
      AND COALESCE(s.cost_at_sale, 0) > 0
  LOOP
    IF r.client_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Idempotência: pula se já existe lançamento de CMV estimado vivo desta venda
    IF EXISTS (
      SELECT 1 FROM public.accounting_entries
      WHERE source_type = 'sale'
        AND source_id   = r.sale_id
        AND description ILIKE 'CMV estimado%'
        AND reversed_by IS NULL
        AND reversal_of IS NULL
    ) THEN
      CONTINUE;
    END IF;

    -- Garante as contas (lazy seed 5.1.02 já semeado na PARTE 5, mas defensivo)
    v_cmv_est := public._ensure_chart_account(r.client_id, '5.1.02');
    IF v_cmv_est IS NULL THEN
      -- _ensure_chart_account só semeia as 8 básicas; garante 5.1.02 aqui
      INSERT INTO public.chart_of_accounts (client_id, code, name, nature, subtype, is_active)
      VALUES (r.client_id, '5.1.02', 'CMV estimado (referência setorial)', 'cost', 'cogs', true)
      ON CONFLICT (client_id, code) DO NOTHING;
      SELECT id INTO v_cmv_est FROM public.chart_of_accounts
        WHERE client_id = r.client_id AND code = '5.1.02';
    END IF;
    v_estoque := public._ensure_chart_account(r.client_id, '1.1.03');

    IF v_cmv_est IS NULL OR v_estoque IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated)
    VALUES
      (r.client_id, COALESCE(r.sale_date, CURRENT_DATE), v_cmv_est, v_estoque, r.cost_at_sale,
       'CMV estimado (referência setorial) — sale ' || r.sale_id::text,
       'sale', r.sale_id, false);
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- Notas de operação (não executar)
-- ============================================================
-- 1. Quando o custo REAL do animal for registrado (applications/cost_records),
--    os triggers 076/131 recomputam total_cost. IMPORTANTE: aqueles triggers
--    NÃO resetam cost_estimated=false — se o custo real substituir o estimado,
--    o contador deve rodar UPDATE animal_cost_summary SET cost_estimated=false,
--    cost_estimation_source=NULL WHERE animal_id=... (ou migration futura que
--    zere o flag quando total_input_cost/labor/other reais > 0).
-- 2. O lançamento de CMV estimado (5.1.02) é segregado do CMV fiscal (5.1.01)
--    de propósito — LCDPR/DRE oficial só considera 5.1.01.
