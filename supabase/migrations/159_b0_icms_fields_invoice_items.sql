-- =============================================================================
-- Migration 159 — B0: campos de ICMS em fiscal_invoice_items
-- =============================================================================
-- Pré-requisito de:
--   B1 — verificador do Convênio ICMS 100/97 (ICMS pago a mais em insumo)
--   B2 — crédito de ICMS do diesel (monofásico ad rem)
--
-- Diagnóstico (auditoria 2026-09-05):
--   A migration 139 declarou fiscal_invoices/fiscal_invoice_items canônicas e
--   fiscal_notes/fiscal_note_items deprecadas. Porém o ETL da 139 copiou apenas
--   ncm, cfop, descricao, quantidade, unidade e valores — DESCARTOU
--   icms_aliquota e icms_valor, que existiam na origem, porque a tabela de
--   destino não tinha colunas para recebê-los.
--
--   Resultado: o dado de ICMS de que B1 e B2 dependem existe apenas no schema
--   deprecado. Esta migration fecha esse buraco na tabela canônica.
--
-- Escopo: puramente aditivo. Nenhuma coluna alterada ou removida, nenhum
-- CHECK novo sobre dado existente. Rollback em supabase/rollbacks/.
--
-- Fonte dos campos: Manual de Orientação do Contribuinte NF-e, grupo N (ICMS)
-- e NT 2023.001 (monofasia de combustíveis, LC 192/2022).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) ICMS "normal" — grupos ICMS00/10/20/51/70/90 e ICMSSN
-- -----------------------------------------------------------------------------
ALTER TABLE public.fiscal_invoice_items
  ADD COLUMN IF NOT EXISTS icms_base             numeric(14,2),
  ADD COLUMN IF NOT EXISTS icms_reducao_base_pct numeric(7,4),
  ADD COLUMN IF NOT EXISTS icms_aliquota         numeric(7,4),
  ADD COLUMN IF NOT EXISTS icms_valor            numeric(14,2),
  ADD COLUMN IF NOT EXISTS icms_desonerado       numeric(14,2),
  ADD COLUMN IF NOT EXISTS icms_mot_desoneracao  text,
  ADD COLUMN IF NOT EXISTS beneficio_codigo      text;

COMMENT ON COLUMN public.fiscal_invoice_items.icms_base IS
  'vBC — base de cálculo do ICMS destacada na nota.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_reducao_base_pct IS
  'pRedBC — percentual de redução da base. É o campo que o Convênio ICMS 100/97 altera (60% cláusula 1a, 30% cláusula 2a nas interestaduais).';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_aliquota IS
  'pICMS — alíquota do ICMS aplicada.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_valor IS
  'vICMS — valor do ICMS destacado. Comparado com o esperado em B1 para apurar icms_pago_a_mais.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_desonerado IS
  'vICMSDeson — valor do ICMS desonerado (isenção/redução aplicada pelo emitente).';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mot_desoneracao IS
  'motDesICMS — motivo da desoneração (codigo do MOC). Distingue isencao de outros motivos ao avaliar o Convenio 100/97.';
COMMENT ON COLUMN public.fiscal_invoice_items.beneficio_codigo IS
  'cBenef — codigo do beneficio fiscal na UF. Quando presente, identifica diretamente o enquadramento usado pelo emitente.';

-- -----------------------------------------------------------------------------
-- B) ICMS monofásico de combustíveis — CST 61 e correlatos (LC 192/2022)
--    Torna B2 leitura direta da nota, sem inferência sobre litragem.
-- -----------------------------------------------------------------------------
ALTER TABLE public.fiscal_invoice_items
  ADD COLUMN IF NOT EXISTS icms_mono_qtd_bc      numeric(16,4),
  ADD COLUMN IF NOT EXISTS icms_mono_ad_rem      numeric(12,4),
  ADD COLUMN IF NOT EXISTS icms_mono_valor       numeric(14,2),
  ADD COLUMN IF NOT EXISTS icms_mono_qtd_bc_ret  numeric(16,4),
  ADD COLUMN IF NOT EXISTS icms_mono_ad_rem_ret  numeric(12,4),
  ADD COLUMN IF NOT EXISTS icms_mono_valor_ret   numeric(14,2);

COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_qtd_bc IS
  'qBCMono — quantidade tributada na monofasia propria (litros).';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_ad_rem IS
  'adRemICMS — aliquota ad rem propria, em R$ por unidade.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_valor IS
  'vICMSMono — ICMS monofasico proprio.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_qtd_bc_ret IS
  'qBCMonoRet — quantidade tributada com ICMS retido anteriormente (CST 61). Litros para o calculo de credito de diesel em B2.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_ad_rem_ret IS
  'adRemICMSRet — aliquota ad rem retida (CST 61). Conv. ICMS 112/2025 e 113/2025 fixam R$ 1,17/L para diesel em 2026.';
COMMENT ON COLUMN public.fiscal_invoice_items.icms_mono_valor_ret IS
  'vICMSMonoRet — ICMS monofasico retido anteriormente (CST 61). Credito potencial do produtor, sujeito a elegibilidade por UF.';

-- -----------------------------------------------------------------------------
-- C) Paridade com o schema legado + procedência do preenchimento
-- -----------------------------------------------------------------------------
ALTER TABLE public.fiscal_invoice_items
  ADD COLUMN IF NOT EXISTS ipi_valor           numeric(14,2),
  ADD COLUMN IF NOT EXISTS fiscal_parsed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS fiscal_parse_source text;

COMMENT ON COLUMN public.fiscal_invoice_items.ipi_valor IS
  'vIPI — paridade com fiscal_note_items.ipi_valor do schema legado.';
COMMENT ON COLUMN public.fiscal_invoice_items.fiscal_parsed_at IS
  'Quando os campos fiscais deste item foram preenchidos. NULL = ainda nao processado pelo backfill do B0.';
COMMENT ON COLUMN public.fiscal_invoice_items.fiscal_parse_source IS
  'Procedencia: xml_reparse (reparse do raw_xml) | legacy_items (copiado de fiscal_note_items) | live_parse (upload novo).';

-- O campo `cst` ja existente passa a ser documentado como o CST do ICMS.
COMMENT ON COLUMN public.fiscal_invoice_items.cst IS
  'CST/CSOSN do ICMS do item. 61 = monofasico com ICMS retido anteriormente. 40/41/50 = isento/nao tributado/suspensao.';

-- -----------------------------------------------------------------------------
-- D) Índices para as consultas de B1 e B2
-- -----------------------------------------------------------------------------
-- B1 varre itens por NCM para classificar no Convênio 100/97.
CREATE INDEX IF NOT EXISTS idx_fiscal_invoice_items_ncm
  ON public.fiscal_invoice_items (ncm)
  WHERE ncm IS NOT NULL;

-- B2 busca só os itens com ICMS monofásico retido (combustíveis).
CREATE INDEX IF NOT EXISTS idx_fiscal_invoice_items_mono_ret
  ON public.fiscal_invoice_items (fiscal_invoice_id)
  WHERE icms_mono_valor_ret IS NOT NULL;

-- Backfill e reprocessamento buscam o que ainda não foi preenchido.
CREATE INDEX IF NOT EXISTS idx_fiscal_invoice_items_unparsed
  ON public.fiscal_invoice_items (fiscal_invoice_id)
  WHERE fiscal_parsed_at IS NULL;
