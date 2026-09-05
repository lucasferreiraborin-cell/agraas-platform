-- =============================================================================
-- Migration 161 — B0c: rastreabilidade de regra nos alertas fiscais
-- =============================================================================
-- *** NÃO APLICADA. Escrita em 05/09/2026, aguardando janela operacional. ***
--
-- Motivo (ajuste 3 do handoff de 05/09/2026):
--   Todo alerta deve carregar o `rule_id` da regra em `rules/` que o originou e
--   a data em que a fonte daquela regra foi verificada. O schema EN da migration
--   133 não tem coluna para nenhum dos dois, e não tem campo jsonb de metadata
--   onde acomodá-los.
--
--   Conforme instrução, a coluna é PROPOSTA aqui — não criada por fora do
--   versionamento, que foi exatamente o erro que gerou a
--   `fiscal_notes_alerts_legacy`.
--
-- Enquanto esta migration não for aplicada, `lib/fiscal/alert-writer.ts`
-- carrega rule_id e verificado_em no fim da `message`, de forma legível.
-- Depois de aplicada, mover para as colunas e limpar o sufixo da mensagem.
-- =============================================================================

ALTER TABLE public.fiscal_alerts
  ADD COLUMN IF NOT EXISTS rule_id            text,
  ADD COLUMN IF NOT EXISTS rule_verificado_em date,
  ADD COLUMN IF NOT EXISTS rule_classe        text;

COMMENT ON COLUMN public.fiscal_alerts.rule_id IS
  'Id da regra em rules/ que originou o alerta (ex.: R-ICMS-CONV100-01). NULL para alerta estrutural sem norma associada, como NCM malformado.';
COMMENT ON COLUMN public.fiscal_alerts.rule_verificado_em IS
  'fonte.verificado_em da regra no momento em que o alerta foi gerado. NULL significa regra A VERIFICAR — o alerta NAO pode ir para material externo.';
COMMENT ON COLUMN public.fiscal_alerts.rule_classe IS
  'Classe da regra: FATO, FATO-calculado, BENCHMARK, PREMISSA, CONVENCAO, DESCONHECIDO. Permite filtrar o que e afirmacao verificada do que e estimativa.';

-- Filtro dos alertas publicáveis: regra com fonte verificada.
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_rule_verificada
  ON public.fiscal_alerts (client_id, rule_id)
  WHERE rule_verificado_em IS NOT NULL;
