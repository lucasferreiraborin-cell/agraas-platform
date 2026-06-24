-- 134_fiscal_quick_wins
-- Sprint mega-backend 2026-06-24 — quick wins controladoria fiscal.
-- Aplicada via MCP em producao (project ixuxawcgwhrrrnwendxr).
--
-- A) fiscal_notes ganha chave_acesso (44 digitos) + modelo_nf (4=NFC-e, 55=NF-e)
--    + indice unico (client_id, chave_acesso) para deduplicacao automatica
--    de ingestao multimodal (XML/PDF/audio).
--
-- B) accounting_entries.status ('draft'|'posted'|'reversed') — complementa
--    coluna `posted` boolean da 132. Status fica derivado mas presenca explicita
--    facilita queries (WHERE status='posted') e exporta SPED.
--
-- C) View lcdpr_entries — Livro Caixa Digital do Produtor Rural (IRPF anexo
--    "Atividade Rural", obrigatorio para produtor PF com receita > R$ 4,8mi/ano,
--    IN RFB 1.848/2018). Receitas (contas iniciadas com '3.') / despesas ('5.').

-- =========================================================================
-- A) fiscal_notes.chave_acesso + modelo_nf
-- =========================================================================

ALTER TABLE public.fiscal_notes
  ADD COLUMN IF NOT EXISTS chave_acesso text,
  ADD COLUMN IF NOT EXISTS modelo_nf smallint;

-- check constraint: chave de acesso NF-e/NFC-e tem exatamente 44 digitos numericos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='fiscal_notes_chave_acesso_format'
  ) THEN
    ALTER TABLE public.fiscal_notes
      ADD CONSTRAINT fiscal_notes_chave_acesso_format
      CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44}$');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='fiscal_notes_modelo_nf_valid'
  ) THEN
    ALTER TABLE public.fiscal_notes
      ADD CONSTRAINT fiscal_notes_modelo_nf_valid
      CHECK (modelo_nf IS NULL OR modelo_nf IN (4, 55, 65));  -- 4=NFC-e legacy, 55=NF-e, 65=NFC-e atual
  END IF;
END$$;

-- indice unico tenant-scoped: mesma chave em mesmo client = mesma nota
CREATE UNIQUE INDEX IF NOT EXISTS uq_fiscal_notes_chave
  ON public.fiscal_notes (client_id, chave_acesso)
  WHERE chave_acesso IS NOT NULL;

COMMENT ON COLUMN public.fiscal_notes.chave_acesso IS 'Chave de acesso 44 digitos NF-e/NFC-e (cUF+AAMM+CNPJ+modelo+serie+nNF+tpEmis+cNF+cDV).';
COMMENT ON COLUMN public.fiscal_notes.modelo_nf IS '4=NFC-e legacy, 55=NF-e (B2B padrao agro), 65=NFC-e atual.';

-- =========================================================================
-- B) accounting_entries.status complementar a `posted`
-- =========================================================================

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='accounting_entries_status_check'
  ) THEN
    ALTER TABLE public.accounting_entries
      ADD CONSTRAINT accounting_entries_status_check
      CHECK (status IN ('draft','posted','reversed'));
  END IF;
END$$;

-- backfill: alinhar status com coluna posted (132)
UPDATE public.accounting_entries
   SET status = CASE
     WHEN source_type = 'reversal' THEN 'reversed'
     WHEN posted = true            THEN 'posted'
     ELSE 'draft'
   END
 WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_ae_status ON public.accounting_entries (client_id, status)
  WHERE status IN ('draft','posted');

COMMENT ON COLUMN public.accounting_entries.status IS 'draft = rascunho editavel; posted = efetivado (immutable via trigger); reversed = estorno aplicado.';

-- =========================================================================
-- C) View lcdpr_entries — Livro Caixa Digital Produtor Rural
-- IRPF anexo "Atividade Rural" (IN RFB 1.848/2018 + Lei 9.250/95 Art. 4)
-- =========================================================================

CREATE OR REPLACE VIEW public.lcdpr_entries AS
SELECT
  ae.entry_date AS data,
  ae.description AS historico,
  CASE
    WHEN credit_acc.code LIKE '3.%' THEN ae.amount
    ELSE 0
  END AS receita,
  CASE
    WHEN debit_acc.code LIKE '5.%' THEN ae.amount
    ELSE 0
  END AS despesa,
  ae.client_id,
  ae.id AS entry_id,
  ae.source_type,
  ae.source_id
FROM public.accounting_entries ae
LEFT JOIN public.chart_of_accounts debit_acc  ON debit_acc.id  = ae.debit_account_id
LEFT JOIN public.chart_of_accounts credit_acc ON credit_acc.id = ae.credit_account_id
WHERE (ae.posted = true OR ae.status = 'posted')
  AND ae.source_type <> 'reversal';

COMMENT ON VIEW public.lcdpr_entries IS 'Livro Caixa Digital do Produtor Rural (LCDPR) — IRPF anexo Atividade Rural, IN RFB 1.848/2018. Receitas via contas 3.x, despesas via 5.x. So inclui lancamentos posted (status=posted ou posted=true). RLS herdada via SECURITY INVOKER de accounting_entries.';
