-- Migration 073: Conecta applications ↔ suppliers/products, stock debit trigger

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ALTER applications — supplier link + cost tracking
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE applications ADD COLUMN IF NOT EXISTS supplier_id  uuid REFERENCES suppliers(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_by   text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS unit_cost    numeric(10,2);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS total_cost   numeric(10,2);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Trigger: debita estoque ao registrar aplicação
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _trg_application_stock_debit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL AND NEW.dose IS NOT NULL THEN
    UPDATE stock_batches
       SET quantity = quantity - NEW.dose,
           quantity_available = COALESCE(quantity_available, quantity) - NEW.dose
     WHERE id = NEW.batch_id;

    -- Warning if negative (don't block)
    IF (SELECT quantity FROM stock_batches WHERE id = NEW.batch_id) < 0 THEN
      RAISE WARNING 'Estoque negativo para batch %', NEW.batch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_stock_debit ON applications;
CREATE TRIGGER trg_application_stock_debit
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION _trg_application_stock_debit();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ALTER fiscal_notes — supplier link + auto stock entry flag
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE fiscal_notes ADD COLUMN IF NOT EXISTS supplier_id       uuid REFERENCES suppliers(id);
ALTER TABLE fiscal_notes ADD COLUMN IF NOT EXISTS auto_stock_entry  boolean NOT NULL DEFAULT false;
