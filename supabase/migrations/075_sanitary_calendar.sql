-- Migration 075: Calendário sanitário + função NF-e → estoque automático

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Tabela sanitary_calendar
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sanitary_calendar (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id),
  product_id      uuid REFERENCES products(id),
  product_name    text NOT NULL,
  animal_category text NOT NULL DEFAULT 'todos',
  interval_days   integer NOT NULL,
  last_applied    date,
  next_due        date GENERATED ALWAYS AS (last_applied + interval_days) STORED,
  notes           text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanitary_calendar_client ON sanitary_calendar(client_id);
CREATE INDEX idx_sanitary_calendar_next   ON sanitary_calendar(next_due);

ALTER TABLE sanitary_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_select ON sanitary_calendar FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY sc_insert ON sanitary_calendar FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY sc_update ON sanitary_calendar FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY sc_delete ON sanitary_calendar FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Trigger: atualiza last_applied no calendário ao registrar aplicação
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _trg_application_calendar_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client uuid;
BEGIN
  -- Get client_id from animal
  SELECT client_id INTO v_client FROM animals WHERE id = NEW.animal_id;
  IF v_client IS NULL THEN RETURN NEW; END IF;

  -- Update calendar entry matching product_name or product_id
  UPDATE sanitary_calendar
     SET last_applied = NEW.application_date::date
   WHERE client_id = v_client
     AND active = true
     AND (
       (product_id IS NOT NULL AND product_id = NEW.product_id)
       OR (product_name IS NOT NULL AND LOWER(product_name) = LOWER(COALESCE(NEW.product_name, '')))
     )
     AND last_applied IS DISTINCT FROM NEW.application_date::date;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_calendar_update ON applications;
CREATE TRIGGER trg_application_calendar_update
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION _trg_application_calendar_update();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Função: cria stock_batches a partir de fiscal_note_items
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_stock_from_fiscal_note(p_note_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_note   RECORD;
  v_item   RECORD;
  v_count  integer := 0;
BEGIN
  SELECT id, client_id, supplier_id, numero_nota FROM fiscal_notes
  WHERE id = p_note_id INTO v_note;

  IF v_note IS NULL THEN
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;

  FOR v_item IN
    SELECT descricao, ncm, quantidade, valor_unitario, valor_total
    FROM fiscal_note_items
    WHERE note_id = p_note_id
  LOOP
    INSERT INTO stock_batches (
      client_id, product_id, batch_number, quantity, quantity_received, quantity_available,
      unit_cost, entry_date, supplier_id, supplier_name, document_source, expiration_date
    ) VALUES (
      v_note.client_id,
      NULL,
      'NF-' || COALESCE(v_note.numero_nota, 'SN') || '-' || (v_count + 1),
      COALESCE(v_item.quantidade, 0),
      COALESCE(v_item.quantidade, 0),
      COALESCE(v_item.quantidade, 0),
      v_item.valor_unitario,
      now()::date,
      v_note.supplier_id,
      v_item.descricao,
      'nfe_' || v_note.numero_nota,
      (now() + interval '1 year')::date
    );
    v_count := v_count + 1;
  END LOOP;

  -- Mark note as auto_stock_entry done
  UPDATE fiscal_notes SET auto_stock_entry = true WHERE id = p_note_id;

  RETURN v_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Seed FSJBE: calendário sanitário
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_client uuid := '00000000-0000-0000-0003-000000000001';
  v_prod_aftosa uuid;
  v_prod_brucelose uuid;
  v_prod_ivermectina uuid;
BEGIN
  SELECT id INTO v_prod_aftosa FROM products WHERE client_id = v_client AND name = 'Vacina Aftosa' LIMIT 1;
  SELECT id INTO v_prod_brucelose FROM products WHERE client_id = v_client AND name = 'Vacina Brucelose B19' LIMIT 1;
  SELECT id INTO v_prod_ivermectina FROM products WHERE client_id = v_client AND name = 'Ivermectina 1%' LIMIT 1;

  INSERT INTO sanitary_calendar (client_id, product_id, product_name, animal_category, interval_days, last_applied, notes) VALUES
    (v_client, v_prod_aftosa,      'Vacina Aftosa',        'todos',    180, '2026-01-15', 'Campanha semestral obrigatória'),
    (v_client, v_prod_brucelose,   'Vacina Brucelose B19', 'bezerras', 365, '2026-02-10', 'Fêmeas 3-8 meses, dose única anual'),
    (v_client, v_prod_ivermectina, 'Ivermectina 1%',       'todos',     90, '2026-03-01', 'Vermifugação trimestral');
END $$;
