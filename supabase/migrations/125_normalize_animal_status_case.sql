-- Migration 125 — Normaliza status de animais para 'Ativo' (case PT-BR consistente)
-- ============================================================
-- Aplicada em produção via MCP em 17/06/2026.
--
-- BUG descoberto em audit de rotas (17/06/2026):
-- 7 lugares no código filtram com .eq("status", "Ativo") case-sensitive:
--   - app/animais/page.tsx
--   - app/aplicacoes/page.tsx:62
--   - app/custo-producao/page.tsx:40
--   - app/financeiro/page.tsx:35
--   - app/metas/page.tsx:33
--   - app/movimentacoes/page.tsx:39
--   - app/pesagens/page.tsx:44
--   - app/selos/page.tsx:28
--
-- Banco tinha mix: 50 'Ativo' + 7 'active' + 1 'ACTIVE'.
-- Resultado: 8 animais (~14% da base) invisíveis em telas operacionais críticas.
--
-- Fix: normalizar tudo para padrão PT-BR ('Ativo', 'Vendido', 'Abatido').
-- Decisão de equipe Agraas: PT-BR é a primeira opção institucional do produto.

BEGIN;

UPDATE animals SET status = 'Ativo'
 WHERE lower(status) = 'active' OR lower(status) = 'ativo';

UPDATE animals SET status = 'Vendido'
 WHERE lower(status) IN ('sold', 'vendido', 'venda');

UPDATE animals SET status = 'Abatido'
 WHERE lower(status) IN ('slaughtered', 'abatido', 'abate');

DO $$
DECLARE v_variants int;
BEGIN
  SELECT count(DISTINCT status) INTO v_variants FROM animals WHERE status IS NOT NULL;
  RAISE NOTICE 'Migration 125 OK · status únicos restantes: %', v_variants;
END $$;

COMMIT;
