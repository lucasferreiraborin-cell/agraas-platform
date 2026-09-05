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
--   do banco. A tabela viva é a EN (os índices da 133 são sobre resolved,
--   severity e alert_type). O app continuou inserindo colunas PT, o insert era
--   rejeitado em silêncio, e alguém criou `fiscal_notes_alerts_legacy`
--   DIRETAMENTE EM PRODUÇÃO, fora do controle de versão.
--
-- Decisão: o schema EN é o canônico. Esta migration traz o histórico da tabela
-- legada para ele, sem perder nada e sem duplicar.
--
-- A legada NÃO é dropada aqui. Sai só depois da migração validada, em migration
-- própria e com data — mesma disciplina da fiscal_notes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Guarda: a tabela legada foi criada fora de migration. Pode não existir em
--    ambientes recriados do zero. Todo o corpo roda condicionalmente.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_migrados integer := 0;
  v_orfaos   integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiscal_notes_alerts_legacy'
  ) THEN
    RAISE NOTICE '[160] fiscal_notes_alerts_legacy nao existe — nada a migrar.';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- B) Órfãos: alerta cuja nota não existe na canônica não pode ser migrado,
  --    porque fiscal_alerts.fiscal_invoice_id tem FK para fiscal_invoices.
  --    Contamos e avisamos em vez de descartar em silêncio.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_orfaos
  FROM public.fiscal_notes_alerts_legacy l
  WHERE NOT EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = l.note_id);

  IF v_orfaos > 0 THEN
    RAISE NOTICE '[160] % alertas sem nota correspondente na canonica — NAO migrados, permanecem na legada.', v_orfaos;
  END IF;

  -- ---------------------------------------------------------------------------
  -- C) De-para e cópia. Idempotente: não reinsere o que já foi migrado.
  --
  --    severidade -> severity  : critico->critical, aviso->warning, resto->info
  --                              (o CHECK da 133 só aceita info/warning/critical)
  --    tipo       -> alert_type: preservado como está, é texto livre
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
        WHEN 'aviso'    THEN 'warning'
        WHEN 'warning'  THEN 'warning'
        ELSE 'info'
      END,
      coalesce(nullif(btrim(l.tipo), ''), 'legacy_sem_tipo'),
      coalesce(nullif(btrim(l.descricao), ''), '(alerta legado sem descricao)'),
      -- Marca a procedência: estes vieram de tabela criada fora do versionamento.
      'Alerta migrado da tabela legada em 05/09/2026 (B0c). Conferir com o contador.',
      coalesce(l.resolvido, false),
      coalesce(l.created_at, now())
    FROM public.fiscal_notes_alerts_legacy l
    WHERE EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = l.note_id)
      AND NOT EXISTS (
        -- Chave natural de deduplicação: mesma nota, mesmo tipo, mesma mensagem.
        SELECT 1 FROM public.fiscal_alerts fa
        WHERE fa.fiscal_invoice_id = l.note_id
          AND fa.alert_type = coalesce(nullif(btrim(l.tipo), ''), 'legacy_sem_tipo')
          AND fa.message    = coalesce(nullif(btrim(l.descricao), ''), '(alerta legado sem descricao)')
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_migrados FROM inseridos;

  RAISE NOTICE '[160] % alertas migrados para fiscal_alerts. % orfaos mantidos na legada.', v_migrados, v_orfaos;
END $$;

-- -----------------------------------------------------------------------------
-- D) Marca a legada como deprecada. NÃO dropar — trilha de auditoria e os
--    órfãos ainda vivem aqui.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiscal_notes_alerts_legacy'
  ) THEN
    EXECUTE $c$COMMENT ON TABLE public.fiscal_notes_alerts_legacy IS
      'DEPRECATED (B0c, 05/09/2026). Canal canonico e public.fiscal_alerts (schema EN da migration 133). Criada fora do controle de versao como contorno da colisao 028 PT x 133 EN. Nao escrever mais aqui. Drop so apos validacao da migracao.'$c$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- E) Índice para a consulta que B1 vai fazer: alertas abertos por nota.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_invoice_unresolved
  ON public.fiscal_alerts (fiscal_invoice_id)
  WHERE resolved = false;
