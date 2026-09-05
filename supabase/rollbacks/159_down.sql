-- =============================================================================
-- Rollback da Migration 159 — B0: campos de ICMS em fiscal_invoice_items
-- =============================================================================
-- ATENÇÃO: derruba o dado fiscal preenchido pelo backfill do B0. O raw_xml em
-- fiscal_invoices permanece intacto, então o reparse pode ser refeito depois de
-- reaplicar a 159 — nada é perdido de forma irreversível.
-- =============================================================================

DROP INDEX IF EXISTS public.idx_fiscal_invoice_items_unparsed;
DROP INDEX IF EXISTS public.idx_fiscal_invoice_items_mono_ret;
DROP INDEX IF EXISTS public.idx_fiscal_invoice_items_ncm;

ALTER TABLE public.fiscal_invoice_items
  DROP COLUMN IF EXISTS fiscal_parse_source,
  DROP COLUMN IF EXISTS fiscal_parsed_at,
  DROP COLUMN IF EXISTS ipi_valor,
  DROP COLUMN IF EXISTS icms_mono_valor_ret,
  DROP COLUMN IF EXISTS icms_mono_ad_rem_ret,
  DROP COLUMN IF EXISTS icms_mono_qtd_bc_ret,
  DROP COLUMN IF EXISTS icms_mono_valor,
  DROP COLUMN IF EXISTS icms_mono_ad_rem,
  DROP COLUMN IF EXISTS icms_mono_qtd_bc,
  DROP COLUMN IF EXISTS beneficio_codigo,
  DROP COLUMN IF EXISTS icms_mot_desoneracao,
  DROP COLUMN IF EXISTS icms_desonerado,
  DROP COLUMN IF EXISTS icms_valor,
  DROP COLUMN IF EXISTS icms_aliquota,
  DROP COLUMN IF EXISTS icms_reducao_base_pct,
  DROP COLUMN IF EXISTS icms_base;

-- Restaura o comentário anterior de `cst` (genérico).
COMMENT ON COLUMN public.fiscal_invoice_items.cst IS NULL;
