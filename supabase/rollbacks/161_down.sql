-- Rollback da 161: remove as colunas de rastreio de regra em fiscal_alerts.
BEGIN;

DROP INDEX IF EXISTS public.idx_fiscal_alerts_rule_verificada;

ALTER TABLE public.fiscal_alerts
  DROP COLUMN IF EXISTS rule_id,
  DROP COLUMN IF EXISTS rule_verificado_em,
  DROP COLUMN IF EXISTS rule_classe;

COMMIT;
