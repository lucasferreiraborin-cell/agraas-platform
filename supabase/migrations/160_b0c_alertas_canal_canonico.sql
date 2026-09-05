-- =============================================================================
-- Migration 160 — B0c: unifica os alertas fiscais no canal canônico
-- =============================================================================
-- *** NÃO APLICADA. Escrita em 05/09/2026, aguardando janela operacional. ***
--
-- Diagnóstico:
--   As migrations 028 e 133 criam a MESMA tabela `fiscal_alerts` com shapes
--   incompatíveis:
--     028 (PT):  note_id           | tipo       | descricao | severidade | resolvido
--     133 (EN):  fiscal_invoice_id | alert_type | message   | severity   | resolved
--
--   A 133 usa CREATE TABLE IF NOT EXISTS, então o resultado dependeu do estado
--   do banco. A tabela viva é a EN. O app continuou inserindo colunas PT, o
--   insert era rejeitado em silêncio, e alguém criou `fiscal_notes_alerts_legacy`
--   DIRETAMENTE EM PRODUÇÃO, fora do controle de versão.
--
-- Decisão: o schema EN é o canônico. Esta migration traz o histórico.
--
-- INTROSPECÇÃO (ajuste 2 do handoff): como a tabela legada foi criada fora de
-- migration, o repositório NÃO conhece o shape real dela. Antes de migrar
-- qualquer linha, conferimos coluna por coluna no information_schema e
-- ABORTAMOS com mensagem clara se algo faltar — falhar no início e por inteiro
-- é melhor que falhar no meio com metade migrada.
--
-- Tudo roda numa transação. Qualquer RAISE EXCEPTION desfaz o conjunto.
-- A legada NÃO é dropada aqui: sai em migration própria, depois de validada.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_esperadas  text[] := ARRAY['id','client_id','note_id','tipo','descricao','severidade','resolvido','created_at'];
  v_faltando   text[];
  v_col        text;
  v_total      integer := 0;
  v_orfaos     integer := 0;
  v_duplicados integer := 0;
  v_migrados   integer := 0;
BEGIN
  -- ---------------------------------------------------------------------------
  -- A) A tabela legada existe? Ambiente recriado do zero não a tem.
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiscal_notes_alerts_legacy'
  ) THEN
    RAISE NOTICE '[160] fiscal_notes_alerts_legacy nao existe neste ambiente. Nada a migrar.';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- B) INTROSPECÇÃO: o shape real bate com o que esperamos?
  --    A tabela nasceu fora do versionamento — presumir o shape seria repetir
  --    o erro que criou este problema.
  -- ---------------------------------------------------------------------------
  v_faltando := ARRAY[]::text[];
  FOREACH v_col IN ARRAY v_esperadas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = 'fiscal_notes_alerts_legacy'
        AND column_name = v_col
    ) THEN
      v_faltando := array_append(v_faltando, v_col);
    END IF;
  END LOOP;

  IF array_length(v_faltando, 1) > 0 THEN
    RAISE EXCEPTION
      '[160] ABORTADO: fiscal_notes_alerts_legacy nao tem a(s) coluna(s) %. Shape real difere do esperado. Rode o inventario do schema (docs/inventario-schema.sql) e ajuste esta migration antes de aplicar.',
      array_to_string(v_faltando, ', ');
  END IF;

  SELECT count(*) INTO v_total FROM public.fiscal_notes_alerts_legacy;

  -- ---------------------------------------------------------------------------
  -- C) Órfãos: fiscal_alerts.fiscal_invoice_id tem FK para fiscal_invoices.
  --    Alerta cuja nota não existe na canônica não pode ser migrado. Contamos e
  --    avisamos; a linha permanece na legada em vez de ser descartada.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_orfaos
  FROM public.fiscal_notes_alerts_legacy l
  WHERE NOT EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = l.note_id);

  -- ---------------------------------------------------------------------------
  -- D) Já migrados: chave natural (nota, tipo, mensagem). Torna idempotente.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_duplicados
  FROM public.fiscal_notes_alerts_legacy l
  WHERE EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = l.note_id)
    AND EXISTS (
      SELECT 1 FROM public.fiscal_alerts fa
      WHERE fa.fiscal_invoice_id = l.note_id
        AND fa.alert_type = coalesce(nullif(btrim(l.tipo), ''), 'legacy_sem_tipo')
        AND fa.message    = coalesce(nullif(btrim(l.descricao), ''), '(alerta legado sem descricao)')
    );

  -- ---------------------------------------------------------------------------
  -- E) De-para e cópia.
  --
  --    severidade -> severity  : conforme rules/alertas/severidade-mapa.yaml
  --                              (R-ALERTA-SEV-01). Desconhecido -> 'warning',
  --                              nao 'info': severidade fora do de-para precisa
  --                              continuar visivel. O CHECK da 133 so aceita
  --                              info/warning/critical.
  --    tipo       -> alert_type: normalizado para a taxonomia namespaced
  --                              (rules/alertas/taxonomia.yaml, R-ALERTA-TAX-01).
  --    descricao  -> message
  --    resolvido  -> resolved
  -- ---------------------------------------------------------------------------
  WITH inseridos AS (
    INSERT INTO public.fiscal_alerts (
      client_id, fiscal_invoice_id, severity, alert_type, message,
      suggested_action, resolved, created_at
    )
    SELECT
      l.client_id,
      l.note_id,
      CASE lower(btrim(coalesce(l.severidade, '')))
        WHEN 'critico'  THEN 'critical'
        WHEN 'crítico'  THEN 'critical'
        WHEN 'critical' THEN 'critical'
        WHEN 'alto'     THEN 'critical'
        WHEN 'aviso'    THEN 'warning'
        WHEN 'warning'  THEN 'warning'
        WHEN 'medio'    THEN 'warning'
        WHEN 'médio'    THEN 'warning'
        WHEN 'info'     THEN 'info'
        WHEN 'baixo'    THEN 'info'
        ELSE 'warning'
      END,
      CASE btrim(coalesce(l.tipo, ''))
        WHEN 'ncm_incorreto'      THEN 'nfe.ncm_incorreto'
        WHEN 'cfop_divergente'    THEN 'nfe.cfop_divergente'
        WHEN 'item_incompleto'    THEN 'nfe.item_incompleto'
        WHEN 'valor_divergente'   THEN 'nfe.valor_divergente'
        WHEN 'pdf_revisao_manual' THEN 'nfe.pdf_revisao_manual'
        WHEN 'ia_fiscal'          THEN 'nfe.ia_fiscal'
        WHEN ''                   THEN 'legacy_sem_tipo'
        ELSE btrim(l.tipo)
      END,
      coalesce(nullif(btrim(l.descricao), ''), '(alerta legado sem descricao)'),
      'Alerta migrado da tabela legada em 05/09/2026 (B0c). Conferir com o contador.',
      coalesce(l.resolvido, false),
      coalesce(l.created_at, now())
    FROM public.fiscal_notes_alerts_legacy l
    WHERE EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = l.note_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.fiscal_alerts fa
        WHERE fa.fiscal_invoice_id = l.note_id
          AND fa.alert_type = coalesce(nullif(btrim(l.tipo), ''), 'legacy_sem_tipo')
          AND fa.message    = coalesce(nullif(btrim(l.descricao), ''), '(alerta legado sem descricao)')
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_migrados FROM inseridos;

  -- ---------------------------------------------------------------------------
  -- F) Relatório. A soma tem que fechar: total = migrados + duplicados + orfaos.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE '[160] total na legada .......... %', v_total;
  RAISE NOTICE '[160] migrados ................. %', v_migrados;
  RAISE NOTICE '[160] deduplicados (ja estavam)  %', v_duplicados;
  RAISE NOTICE '[160] orfaos (sem nota canonica) % — permanecem na legada', v_orfaos;

  IF v_migrados + v_duplicados + v_orfaos <> v_total THEN
    RAISE EXCEPTION
      '[160] ABORTADO: contagens nao fecham (% migrados + % dedup + % orfaos <> % total). Investigar antes de aplicar.',
      v_migrados, v_duplicados, v_orfaos, v_total;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- G) Marca a legada como deprecada. NÃO dropar: trilha de auditoria, e os
--    órfãos ainda vivem aqui.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiscal_notes_alerts_legacy'
  ) THEN
    EXECUTE $c$COMMENT ON TABLE public.fiscal_notes_alerts_legacy IS
      'DEPRECATED (B0c, 05/09/2026). Canal canonico e public.fiscal_alerts (schema EN da migration 133). Criada fora do controle de versao como contorno da colisao 028 PT x 133 EN. Nao escrever mais aqui. Drop so apos validacao.'$c$;
  END IF;
END $$;

-- Consulta que o B1 fará: alertas abertos por nota.
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_invoice_unresolved
  ON public.fiscal_alerts (fiscal_invoice_id)
  WHERE resolved = false;

COMMIT;
