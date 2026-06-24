-- =============================================================================
-- Migration 139 -- ETL fiscal_notes -> fiscal_invoices (reconciliacao SCHISM)
-- =============================================================================
-- Diagnostico (auditoria 2026-06-24):
--   - /fiscal/* UI escreve em fiscal_notes (legacy desde 094).
--   - /controladoria (Sprint G) le fiscal_invoices -- TABELA VAZIA em producao.
--   - Dois produtos no mesmo banco. Score, ROI e Passaporte nao enxergam fiscal_notes.
--
-- Decisao arquitetural:
--   - fiscal_invoices vira a tabela canonica (schema mais rico, source enum, RLS limpa).
--   - fiscal_notes vira DEPRECATED mas NAO e dropada -- preserva trilha de auditoria.
--   - ETL copia tudo. Acesso via view fiscal_notes_unified para UIs antigas.
-- =============================================================================

-- A.0) Adiciona 'legacy_migration' ao CHECK de source
ALTER TABLE public.fiscal_invoices
  DROP CONSTRAINT IF EXISTS fiscal_invoices_source_check;
ALTER TABLE public.fiscal_invoices
  ADD CONSTRAINT fiscal_invoices_source_check
  CHECK (source = ANY (ARRAY[
    'xml_upload','pdf_upload','audio_dictation','csv_import',
    'sefaz_api','manual','legacy_migration'
  ]));

-- A.1) ETL fiscal_notes -> fiscal_invoices
INSERT INTO public.fiscal_invoices (
  id, client_id, property_id, access_key, number, series, direction,
  model, issued_at, gross_value, status, source,
  issuer_cnpj, issuer_name, raw_xml, created_at
)
SELECT
  fn.id,
  fn.client_id,
  (SELECT p.id FROM public.properties p WHERE p.client_id = fn.client_id ORDER BY p.created_at LIMIT 1) AS property_id,
  COALESCE(fn.id::text, gen_random_uuid()::text) AS access_key,
  fn.numero_nota AS number,
  fn.serie AS series,
  CASE
    WHEN EXISTS(
      SELECT 1 FROM public.fiscal_note_items fni
      WHERE fni.note_id = fn.id
        AND substring(COALESCE(fni.cfop,'') from 1 for 1) IN ('5','6','7')
    ) THEN 'saida'
    ELSE 'entrada'
  END AS direction,
  '55' AS model,
  fn.data_emissao::timestamptz AS issued_at,
  fn.valor_total AS gross_value,
  'reviewed' AS status,
  'legacy_migration' AS source,
  fn.emitente_cnpj,
  fn.emitente_nome,
  fn.xml_content AS raw_xml,
  fn.created_at
FROM public.fiscal_notes fn
ON CONFLICT (id) DO NOTHING;

-- A.2) ETL fiscal_note_items -> fiscal_invoice_items
INSERT INTO public.fiscal_invoice_items (
  fiscal_invoice_id, sequence, ncm, cfop, description,
  quantity, unit, unit_price, total_price
)
SELECT
  fni.note_id,
  ROW_NUMBER() OVER (PARTITION BY fni.note_id ORDER BY fni.id),
  fni.ncm,
  fni.cfop,
  fni.descricao,
  fni.quantidade,
  fni.unidade,
  fni.valor_unitario,
  fni.valor_total
FROM public.fiscal_note_items fni
WHERE EXISTS (SELECT 1 FROM public.fiscal_invoices fi WHERE fi.id = fni.note_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.fiscal_invoice_items fii
    WHERE fii.fiscal_invoice_id = fni.note_id
  );

-- B) Marca fiscal_notes como deprecated
COMMENT ON TABLE public.fiscal_notes IS
  'DEPRECATED 2026-06-24 (migration 139) -- somente leitura legacy. Dados migrados para fiscal_invoices via ETL.';

COMMENT ON TABLE public.fiscal_note_items IS
  'DEPRECATED 2026-06-24 (migration 139) -- somente leitura legacy. Dados migrados para fiscal_invoice_items.';

-- C) View de retrocompatibilidade fiscal_notes_unified
CREATE OR REPLACE VIEW public.fiscal_notes_unified AS
SELECT
  fi.id,
  fi.client_id,
  fi.number AS numero_nota,
  fi.series AS serie,
  fi.issuer_cnpj AS emitente_cnpj,
  fi.issuer_name AS emitente_nome,
  fi.issued_at::date AS data_emissao,
  fi.gross_value AS valor_total,
  fi.status,
  fi.direction,
  fi.source,
  fi.access_key,
  fi.created_at,
  'fiscal_invoices' AS source_table
FROM public.fiscal_invoices fi;

COMMENT ON VIEW public.fiscal_notes_unified IS
  'Migration 139 -- view consolidando fiscal_invoices (canonica). UIs antigas devem ler desta view.';

ALTER VIEW public.fiscal_notes_unified SET (security_invoker = true);
