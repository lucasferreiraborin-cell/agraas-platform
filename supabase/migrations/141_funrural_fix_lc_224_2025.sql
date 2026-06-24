-- =============================================================================
-- Migration 141 — Fix FUNRURAL (LC 224/2025)
-- =============================================================================
-- Bug em produção: migration 131 hardcoded 1,5% PF para FUNRURAL na função
-- _fn_sales_compute_roi. Desde 01/04/2026 a LC 224/2025 alterou as alíquotas:
--   - PF:                1,50% → 1,63%
--   - PJ:                2,05% → 2,23%
--   - Segurado Especial: 1,20% → 1,50%
--
-- Decisão metodológica:
--   - Parametrizar via clients.tax_regime + clients.funrural_rate (numéricos).
--   - tax_regime apenas determina o default a aplicar; funrural_rate sempre
--     pode ser sobrescrita manualmente pelo contador do cliente (caso de
--     suspensão judicial, regime especial, etc.).
--   - Trigger lê funrural_rate dinamicamente em cada INSERT/UPDATE de venda.
--   - Backfill toca apenas vendas com sale_date >= 2026-04-01 (LC 224/2025).
--   - accounting_entries de FUNRURAL pós 01/04/2026 são CORRIGIDOS in-place
--     (UPDATE no amount/description) — alternativa de estorno+relançamento
--     foi descartada para não poluir histórico contábil pré-fechamento.
--
-- Fonte regulatória: LC 224/2025, vigência 01/04/2026.
-- Referência: Aegro Blog "FUNRURAL 2026 — alíquotas LC 224/2025".
-- =============================================================================

BEGIN;

-- ============================================================
-- A) Adiciona colunas tax_regime + funrural_rate em clients
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tax_regime    text          DEFAULT 'pf',
  ADD COLUMN IF NOT EXISTS funrural_rate numeric(8,4)  DEFAULT 0.0163;

-- CHECK no tax_regime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_tax_regime_check'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_tax_regime_check
      CHECK (tax_regime IN ('pf','pj','segurado_especial'));
  END IF;
END$$;

COMMENT ON COLUMN public.clients.tax_regime IS
  'Regime fiscal do produtor (pf/pj/segurado_especial). Determina default de funrural_rate. LC 224/2025.';

COMMENT ON COLUMN public.clients.funrural_rate IS
  'Alíquota FUNRURAL aplicada nas vendas do client. Default 0.0163 (PF pós-LC 224/2025).';

-- Garante que clients existentes (criados antes da migration) tenham valores
-- não-nulos coerentes com o default (DEFAULT só vale em rows novas).
UPDATE public.clients
   SET tax_regime    = COALESCE(tax_regime, 'pf'),
       funrural_rate = COALESCE(funrural_rate, 0.0163)
 WHERE tax_regime IS NULL OR funrural_rate IS NULL;

-- ============================================================
-- B) Reescreve _fn_sales_compute_roi (criada na 131) para
--    ler funrural_rate dinâmica do client da venda.
-- ============================================================
-- Mantemos search_path = public, pg_temp e SECURITY DEFINER como na 131.
-- Resolução de client: NEW.client_id se existir, senão via animals.id.
-- Fallback explícito 0.0163 para protegerem-se de dados legados sem client.

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

  -- Busca a alíquota parametrizada do client (default 1,63% PF pós LC 224/2025)
  IF v_client_id IS NOT NULL THEN
    SELECT funrural_rate INTO v_funrural_rate
      FROM public.clients WHERE id = v_client_id;
  END IF;
  v_funrural_rate := COALESCE(v_funrural_rate, 0.0163);

  -- Puxa custo do animal (se houver animal_id)
  IF NEW.animal_id IS NOT NULL THEN
    SELECT COALESCE(total_cost, 0) INTO v_cost
      FROM public.animal_cost_summary
      WHERE animal_id = NEW.animal_id;
  ELSE
    v_cost := 0;
  END IF;
  v_cost := COALESCE(v_cost, 0);

  -- FUNRURAL parametrizado por client_id
  v_funrural := ROUND(v_total * v_funrural_rate, 2);

  NEW.cost_at_sale   := v_cost;
  NEW.funrural_value := v_funrural;

  IF v_cost = 0 THEN
    NEW.cost_estimated := true;
    NEW.roi            := NULL;
    NEW.roi_net        := NULL;
  ELSE
    NEW.cost_estimated := false;
    NEW.roi     := ROUND(((v_total - v_cost) / v_cost) * 100, 2);
    NEW.roi_net := ROUND(((v_total - v_funrural - v_cost) / v_cost) * 100, 2);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._fn_sales_compute_roi() IS
  'Migration 141 — calcula cost_at_sale, funrural_value (rate dinâmica via clients.funrural_rate), roi e roi_net. LC 224/2025.';

-- ============================================================
-- C) Backfill vendas pós 01/04/2026: dispara re-trigger
--    via UPDATE no_op (status = status) que aciona BEFORE UPDATE.
-- ============================================================
-- Não usamos "SET id = id" (FK / unique constraint risk).
-- Usamos status = status, que é safe — o trigger BEFORE UPDATE recalcula
-- funrural_value, roi, roi_net mesmo se o valor não mudou.

UPDATE public.sales
   SET status = status
 WHERE sale_date >= '2026-04-01';

-- ============================================================
-- D) Corrige accounting_entries de FUNRURAL pós 01/04/2026
-- ============================================================
-- Estratégia: UPDATE in-place no amount + description dos lançamentos
-- de FUNRURAL gerados antes da alíquota correta. Idempotente via
-- marca textual "[corrigido 141]" — re-execução pula linhas já corrigidas.

UPDATE public.accounting_entries ae
   SET amount = s.funrural_value,
       description = 'FUNRURAL ' ||
         to_char(COALESCE(c.funrural_rate, 0.0163) * 100, 'FM999990D00') ||
         '% sobre venda — sale ' || s.id::text || ' [corrigido 141]'
  FROM public.sales s
  LEFT JOIN public.clients c ON c.id = s.client_id
 WHERE ae.source_type = 'sale'
   AND ae.source_id = s.id
   AND ae.description ILIKE 'FUNRURAL%'
   AND s.sale_date >= '2026-04-01'
   AND ae.description NOT LIKE '%[corrigido 141]%';

COMMIT;

-- Notas:
-- 1. Vendas pré 01/04/2026 NÃO são tocadas (alíquota antiga 1,5% PF continua válida historicamente).
-- 2. Se algum cliente precisar alíquota diferente do default (PJ 2,23%, Segurado Especial 1,5%),
--    basta UPDATE clients SET tax_regime='pj', funrural_rate=0.0223 WHERE id=...
-- 3. TODO: API endpoint /api/admin/clients/[id]/tax-config para o contador ajustar.
-- 4. TODO: alertas em fiscal_alerts quando alíquota mudar (parecer regulatório).
