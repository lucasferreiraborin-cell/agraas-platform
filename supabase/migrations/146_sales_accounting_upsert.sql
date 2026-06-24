-- ============================================================
-- Migration 146 — UPSERT accounting_entries em UPDATE de sales
-- Sprint J · 24/06/2026
--
-- BUG IDENTIFICADO (backend 135):
-- Trigger atual _trg_sales_accounting é AFTER INSERT apenas.
-- Quando UPDATE altera cost_at_sale (ex.: refresh do ROI engine
-- recalculando custo do animal), o lançamento contábil original
-- continua com o valor antigo → DRIFT entre cost_at_sale e
-- accounting_entries.amount.
--
-- FIX:
-- Nova função _fn_sales_accounting_upsert que cobre INSERT + UPDATE.
-- Em UPDATE, se já existir lançamento (source_type='sale',source_id=NEW.id):
--   1. Gera lançamento de ESTORNO (D credit_original / C debit_original)
--   2. Insere novo lançamento com valor atualizado
--   3. Marca lançamento original via reversed_by → estorno
-- Em INSERT (sem lançamento prévio): comportamento idêntico ao anterior.
--
-- Idempotência: rodar 2x mantém saldo final correto.
-- ============================================================

-- A) Adicionar colunas de reversal em accounting_entries (se não existirem)
ALTER TABLE accounting_entries
  ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES accounting_entries(id),
  ADD COLUMN IF NOT EXISTS reversal_of uuid REFERENCES accounting_entries(id),
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

COMMENT ON COLUMN accounting_entries.reversed_by IS
  'ID do lançamento de estorno que cancelou este. NULL se ainda ativo.';
COMMENT ON COLUMN accounting_entries.reversal_of IS
  'Se este lançamento é um estorno, aponta para o lançamento original cancelado.';
COMMENT ON COLUMN accounting_entries.reversed_at IS
  'Timestamp do estorno (preenchido junto com reversed_by).';

CREATE INDEX IF NOT EXISTS idx_accounting_entries_source ON accounting_entries(source_type, source_id);

-- B) Nova função UPSERT
CREATE OR REPLACE FUNCTION _fn_sales_accounting_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_date      date;
  v_caixa     uuid;
  v_receita   uuid;
  v_cmv       uuid;
  v_estoque   uuid;
  v_funrural  uuid;
  v_existing  record;
  v_estorno_id uuid;
BEGIN
  -- Não escriturar vendas canceladas
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Resolver client_id (espelhando _fn_sales_accounting original)
  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT client_id INTO v_client_id FROM animals WHERE id = NEW.animal_id;
  END IF;
  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_date     := COALESCE(NEW.sale_date, CURRENT_DATE);
  v_caixa    := _ensure_chart_account(v_client_id, '1.1.01');
  v_estoque  := _ensure_chart_account(v_client_id, '1.1.03');
  v_funrural := _ensure_chart_account(v_client_id, '2.1.05');
  v_receita  := _ensure_chart_account(v_client_id, '3.1.01');
  v_cmv      := _ensure_chart_account(v_client_id, '5.1.01');

  -- ============================================================
  -- BLOCO 1 — RECEITA (Caixa D / Receita C)
  -- ============================================================
  SELECT * INTO v_existing
  FROM accounting_entries
  WHERE source_type = 'sale'
    AND source_id   = NEW.id
    AND debit_account_id  = v_caixa
    AND credit_account_id = v_receita
    AND reversed_by IS NULL
    AND reversal_of IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    -- INSERT: não existe ainda → cria lançamento normal
    IF COALESCE(NEW.total_value, 0) > 0 THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_caixa, v_receita, NEW.total_value,
         'Receita de venda — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND v_existing.amount IS DISTINCT FROM COALESCE(NEW.total_value, 0) THEN
    -- UPDATE com mudança de valor: estorna + reinsere
    INSERT INTO accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated, reversal_of)
    VALUES
      (v_client_id, v_date, v_existing.credit_account_id, v_existing.debit_account_id,
       v_existing.amount,
       'ESTORNO receita — sale ' || NEW.id::text,
       'sale', NEW.id, false, v_existing.id)
    RETURNING id INTO v_estorno_id;

    UPDATE accounting_entries
      SET reversed_by = v_estorno_id, reversed_at = now()
      WHERE id = v_existing.id;

    IF COALESCE(NEW.total_value, 0) > 0 THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_caixa, v_receita, NEW.total_value,
         'Receita de venda (reapurada) — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  END IF;

  -- ============================================================
  -- BLOCO 2 — CMV (CMV D / Estoque C)
  -- ============================================================
  SELECT * INTO v_existing
  FROM accounting_entries
  WHERE source_type = 'sale'
    AND source_id   = NEW.id
    AND debit_account_id  = v_cmv
    AND credit_account_id = v_estoque
    AND reversed_by IS NULL
    AND reversal_of IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    IF COALESCE(NEW.cost_at_sale, 0) > 0 AND NOT COALESCE(NEW.cost_estimated, false) THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_cmv, v_estoque, NEW.cost_at_sale,
         'CMV — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND v_existing.amount IS DISTINCT FROM COALESCE(NEW.cost_at_sale, 0) THEN
    INSERT INTO accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated, reversal_of)
    VALUES
      (v_client_id, v_date, v_existing.credit_account_id, v_existing.debit_account_id,
       v_existing.amount,
       'ESTORNO CMV — sale ' || NEW.id::text,
       'sale', NEW.id, false, v_existing.id)
    RETURNING id INTO v_estorno_id;

    UPDATE accounting_entries
      SET reversed_by = v_estorno_id, reversed_at = now()
      WHERE id = v_existing.id;

    IF COALESCE(NEW.cost_at_sale, 0) > 0 AND NOT COALESCE(NEW.cost_estimated, false) THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_cmv, v_estoque, NEW.cost_at_sale,
         'CMV (reapurado) — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  END IF;

  -- ============================================================
  -- BLOCO 3 — FUNRURAL (CMV D / FUNRURAL a recolher C)
  -- ============================================================
  SELECT * INTO v_existing
  FROM accounting_entries
  WHERE source_type = 'sale'
    AND source_id   = NEW.id
    AND debit_account_id  = v_cmv
    AND credit_account_id = v_funrural
    AND reversed_by IS NULL
    AND reversal_of IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    IF COALESCE(NEW.funrural_value, 0) > 0 THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_cmv, v_funrural, NEW.funrural_value,
         'FUNRURAL sobre venda — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND v_existing.amount IS DISTINCT FROM COALESCE(NEW.funrural_value, 0) THEN
    INSERT INTO accounting_entries
      (client_id, entry_date, debit_account_id, credit_account_id, amount,
       description, source_type, source_id, ai_generated, reversal_of)
    VALUES
      (v_client_id, v_date, v_existing.credit_account_id, v_existing.debit_account_id,
       v_existing.amount,
       'ESTORNO FUNRURAL — sale ' || NEW.id::text,
       'sale', NEW.id, false, v_existing.id)
    RETURNING id INTO v_estorno_id;

    UPDATE accounting_entries
      SET reversed_by = v_estorno_id, reversed_at = now()
      WHERE id = v_existing.id;

    IF COALESCE(NEW.funrural_value, 0) > 0 THEN
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated)
      VALUES
        (v_client_id, v_date, v_cmv, v_funrural, NEW.funrural_value,
         'FUNRURAL (reapurado) — sale ' || NEW.id::text,
         'sale', NEW.id, false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION _fn_sales_accounting_upsert() IS
  'Reescriture contábil de sales (INSERT + UPDATE) com estorno automático em mudança de cost_at_sale/total_value/funrural_value.';

-- C) Substituir trigger antigo (AFTER INSERT) pelo novo (AFTER INSERT OR UPDATE)
DROP TRIGGER IF EXISTS _trg_sales_accounting ON sales;
DROP TRIGGER IF EXISTS _trg_sales_accounting_upsert ON sales;
CREATE TRIGGER _trg_sales_accounting_upsert
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION _fn_sales_accounting_upsert();
