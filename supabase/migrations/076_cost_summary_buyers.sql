-- Migration 076: Custo de produção + Compradores

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Tabela animal_cost_summary
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS animal_cost_summary (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id        uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE UNIQUE,
  client_id        uuid NOT NULL REFERENCES clients(id),
  total_input_cost numeric(10,2) NOT NULL DEFAULT 0,
  labor_cost       numeric(10,2) NOT NULL DEFAULT 0,
  other_costs      numeric(10,2) NOT NULL DEFAULT 0,
  total_cost       numeric(10,2) NOT NULL DEFAULT 0,
  last_updated     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_animal_cost_client ON animal_cost_summary(client_id);

ALTER TABLE animal_cost_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY acs_select ON animal_cost_summary FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY acs_insert ON animal_cost_summary FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY acs_update ON animal_cost_summary FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY acs_delete ON animal_cost_summary FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Trigger: recalcula custo ao registrar/atualizar/deletar aplicação
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _trg_cost_summary_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_animal_id uuid;
  v_client_id uuid;
  v_total     numeric;
BEGIN
  v_animal_id := COALESCE(NEW.animal_id, OLD.animal_id);
  IF v_animal_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT client_id INTO v_client_id FROM animals WHERE id = v_animal_id;
  IF v_client_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(total_cost), 0) INTO v_total
  FROM applications WHERE animal_id = v_animal_id AND total_cost IS NOT NULL;

  INSERT INTO animal_cost_summary (animal_id, client_id, total_input_cost, total_cost, last_updated)
  VALUES (v_animal_id, v_client_id, v_total, v_total, now())
  ON CONFLICT (animal_id) DO UPDATE SET
    total_input_cost = v_total,
    total_cost = v_total + animal_cost_summary.labor_cost + animal_cost_summary.other_costs,
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cost_summary_on_application ON applications;
CREATE TRIGGER trg_cost_summary_on_application
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION _trg_cost_summary_update();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Tabela buyers
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE buyer_type_enum AS ENUM ('frigorifico','trading','exportador','produtor','outro');

CREATE TABLE IF NOT EXISTS buyers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id),
  name          text NOT NULL,
  cnpj          text,
  type          buyer_type_enum NOT NULL DEFAULT 'outro',
  contact_name  text,
  contact_phone text,
  contact_email text,
  notes         text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyers_client ON buyers(client_id);
CREATE INDEX idx_buyers_type   ON buyers(client_id, type);

ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyers_select ON buyers FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY buyers_insert ON buyers FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());
CREATE POLICY buyers_update ON buyers FOR UPDATE USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY buyers_delete ON buyers FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Seed FSJBE: 1 comprador
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO buyers (client_id, name, cnpj, type, contact_name, contact_phone) VALUES
  ('00000000-0000-0000-0003-000000000001', 'Frigoboi Goiás', '12.345.678/0001-90', 'frigorifico', 'Carlos Gerente', '(62) 99999-0001');
