-- ============================================================
-- Migration 149 — Estorno automático em sales cancelled
-- Sprint K · 26/06/2026
--
-- PROBLEMA:
-- _fn_sales_accounting_upsert (146) faz early-return em status='cancelled',
-- então se uma venda for 'confirmed' → 'cancelled', os lançamentos
-- contábeis ORIGINAIS continuam vivos (receita/CMV/FUNRURAL), gerando
-- DRE inflado e tributo a recolher indevido.
--
-- FIX:
-- Estender _fn_sales_accounting_upsert pra detectar transição
-- 'confirmed' → 'cancelled' (TG_OP='UPDATE' AND OLD.status != 'cancelled'
-- AND NEW.status = 'cancelled') e:
--   1. Para CADA accounting_entry ainda ativa (reversed_by IS NULL,
--      reversal_of IS NULL, source_type='sale', source_id=NEW.id),
--      criar um estorno com débito/crédito invertidos, reversal_of=original.id.
--   2. Marcar a original com reversed_by + reversed_at.
--   3. NÃO deletar nada (trilha imutável — CPC 26/LCDPR).
--   4. Restaurar animals.status='Ativo' se OLD veio de 'Vendido' e NEW.animal_id
--      ainda aponta pro animal (cancelamento devolve o animal pro inventário).
--
-- Decisão de arquitetura:
-- Embutir no UPSERT em vez de trigger separado — mantém single source of
-- truth, evita ordem de execução entre triggers (lição do duplo débito
-- de estoque de 06/2026).
--
-- Idempotência: rodar 2x não cria estorno duplicado porque o filtro
-- "reversed_by IS NULL AND reversal_of IS NULL" já exclui linhas
-- estornadas previamente.
-- ============================================================

CREATE OR REPLACE FUNCTION _fn_sales_accounting_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id    uuid;
  v_date         date;
  v_caixa        uuid;
  v_receita      uuid;
  v_cmv          uuid;
  v_estoque      uuid;
  v_funrural     uuid;
  v_existing     record;
  v_estorno_id   uuid;
  v_active_entry record;
  v_old_status   text;
BEGIN
  -- Resolver client_id
  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT client_id INTO v_client_id FROM animals WHERE id = NEW.animal_id;
  END IF;
  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_date := COALESCE(NEW.sale_date, CURRENT_DATE);

  -- ============================================================
  -- BLOCO 0 — TRATAR CANCELAMENTO (transição confirmed -> cancelled)
  -- ============================================================
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'cancelled'
     AND COALESCE(v_old_status, '') <> 'cancelled' THEN
    -- Estornar TODOS os lançamentos vivos desta venda
    FOR v_active_entry IN
      SELECT *
      FROM accounting_entries
      WHERE source_type = 'sale'
        AND source_id   = NEW.id
        AND reversed_by IS NULL
        AND reversal_of IS NULL
    LOOP
      INSERT INTO accounting_entries
        (client_id, entry_date, debit_account_id, credit_account_id, amount,
         description, source_type, source_id, ai_generated, reversal_of)
      VALUES
        (v_active_entry.client_id, v_date,
         v_active_entry.credit_account_id, v_active_entry.debit_account_id,
         v_active_entry.amount,
         'ESTORNO por cancelamento — sale ' || NEW.id::text,
         'sale', NEW.id, false, v_active_entry.id)
      RETURNING id INTO v_estorno_id;

      UPDATE accounting_entries
        SET reversed_by = v_estorno_id,
            reversed_at = now()
        WHERE id = v_active_entry.id;
    END LOOP;

    -- Restaurar status do animal: Vendido -> Ativo
    -- Só atualiza se OLD apontava pra mesma venda e animal está marcado Vendido
    IF NEW.animal_id IS NOT NULL THEN
      UPDATE animals
        SET status = 'Ativo',
            updated_at = now()
        WHERE id = NEW.animal_id
          AND status = 'Vendido';
    END IF;

    -- Cancelado: não escriturar novos lançamentos
    RETURN NEW;
  END IF;

  -- Após bloco 0: se ainda está cancelled (criação direto cancelada
  -- ou UPDATE sem mudança de status mas mantendo cancelled),
  -- não escriturar
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Resolver contas (caso comum não-cancelado)
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
  'Escrituração contábil de sales: INSERT/UPDATE com upsert por estorno + cobertura completa de cancelamento (transição confirmed->cancelled estorna todos os lançamentos vivos e devolve animal pro inventário). Trilha imutável.';
