-- Migration 059: Score de talhão + crop_certifications + triggers + seed

-- ── Enum + tabela crop_certifications ────────────────────────────────────────

CREATE TYPE crop_certification_name_enum AS ENUM (
  'origem_certificada', 'organico', 'mapa', 'car_regular', 'sustentavel'
);

CREATE TABLE crop_certifications (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_id             uuid        NOT NULL REFERENCES crop_fields(id) ON DELETE CASCADE,
  certification_name   crop_certification_name_enum NOT NULL,
  issued_at            date,
  expires_at           date,
  status               text        NOT NULL DEFAULT 'ativa',
  issuer               text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_client  ON crop_certifications(client_id);
CREATE INDEX idx_cc_field   ON crop_certifications(field_id);
CREATE INDEX idx_cc_status  ON crop_certifications(status);

ALTER TABLE crop_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_select ON crop_certifications FOR SELECT USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cc_insert ON crop_certifications FOR INSERT WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cc_update ON crop_certifications FOR UPDATE USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cc_delete ON crop_certifications FOR DELETE USING (client_id = get_my_client_id() OR is_admin());

DO $$ BEGIN
  RAISE NOTICE '059 — crop_certifications criada';
END $$;

-- ── Score column em crop_fields ───────────────────────────────────────────────

ALTER TABLE crop_fields ADD COLUMN IF NOT EXISTS score integer;

-- ── Função calculate_field_score ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_field_score(p_field_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field          crop_fields%ROWTYPE;
  v_farm           farms_agriculture%ROWTYPE;

  -- Rastreabilidade
  v_has_polygon    boolean;
  v_has_car        boolean;
  v_s_rastr        numeric := 0;

  -- Fiscal
  v_total_inputs   int;
  v_inputs_nfe     int;
  v_s_fiscal       numeric := 0;

  -- Operacional
  v_total_ships    int;
  v_ships_tracked  int;
  v_s_oper         numeric := 0;

  -- Certificações
  v_cert_count     int;
  v_s_certif       numeric := 0;

  v_final          numeric;
BEGIN
  SELECT * INTO v_field FROM crop_fields       WHERE id = p_field_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_farm  FROM farms_agriculture WHERE id = v_field.farm_id;

  -- ── Rastreabilidade (0–25) ────────────────────────────────────────────────
  v_has_polygon := v_field.polygon_coordinates IS NOT NULL
                   AND v_field.polygon_coordinates::text NOT IN ('null','[]','{}','');
  v_has_car     := v_farm.car_number IS NOT NULL AND trim(v_farm.car_number) <> '';

  v_s_rastr := (CASE WHEN v_has_polygon THEN 12.5 ELSE 0 END)
             + (CASE WHEN v_has_car     THEN 12.5 ELSE 0 END);

  -- ── Fiscal (0–25) ─────────────────────────────────────────────────────────
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE nfe_key IS NOT NULL AND trim(nfe_key) <> '')
    INTO v_total_inputs, v_inputs_nfe
    FROM crop_inputs
   WHERE field_id = p_field_id;

  v_s_fiscal := CASE WHEN v_total_inputs > 0
                     THEN (v_inputs_nfe::numeric / v_total_inputs) * 25
                     ELSE 0 END;

  -- ── Operacional (0–25) ────────────────────────────────────────────────────
  SELECT COUNT(DISTINCT cs.id),
         COUNT(DISTINCT cs.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM crop_shipment_tracking cst WHERE cst.shipment_id = cs.id
           )
         )
    INTO v_total_ships, v_ships_tracked
    FROM crop_shipments cs
   WHERE cs.field_id = p_field_id;

  v_s_oper := CASE WHEN v_total_ships > 0
                   THEN (v_ships_tracked::numeric / v_total_ships) * 25
                   ELSE 0 END;

  -- ── Certificações (0–25) ─────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_cert_count
    FROM crop_certifications
   WHERE field_id = p_field_id AND status = 'ativa';

  v_s_certif := CASE
    WHEN v_cert_count = 0 THEN 0
    WHEN v_cert_count = 1 THEN 15
    WHEN v_cert_count = 2 THEN 22
    ELSE 25
  END;

  -- ── Score final ───────────────────────────────────────────────────────────
  v_final := GREATEST(0, LEAST(100, ROUND(v_s_rastr + v_s_fiscal + v_s_oper + v_s_certif)));

  UPDATE crop_fields SET score = v_final WHERE id = p_field_id;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_field_score(uuid) TO authenticated;

-- ── Funções de trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_recalc_field_score_input()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_field_score(OLD.field_id);
  ELSE
    PERFORM calculate_field_score(NEW.field_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalc_field_score_tracking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_field_id uuid;
BEGIN
  SELECT field_id INTO v_field_id
    FROM crop_shipments
   WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.shipment_id ELSE NEW.shipment_id END;
  IF v_field_id IS NOT NULL THEN
    PERFORM calculate_field_score(v_field_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalc_field_score_cert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_field_score(OLD.field_id);
  ELSE
    PERFORM calculate_field_score(NEW.field_id);
  END IF;
  RETURN NULL;
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_ci_field_score
  AFTER INSERT OR UPDATE OR DELETE ON crop_inputs
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_field_score_input();

CREATE TRIGGER trg_cst_field_score
  AFTER INSERT OR UPDATE OR DELETE ON crop_shipment_tracking
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_field_score_tracking();

CREATE TRIGGER trg_cc_field_score
  AFTER INSERT OR UPDATE OR DELETE ON crop_certifications
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_field_score_cert();

DO $$ BEGIN
  RAISE NOTICE '059 — calculate_field_score() + 3 triggers criados';
END $$;

-- ── Seed: scores para talhões de Lucas ───────────────────────────────────────

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_field     record;
  v_score     integer;
  v_count     int := 0;
BEGIN
  FOR v_field IN
    SELECT id, field_code FROM crop_fields WHERE client_id = v_client_id ORDER BY field_code
  LOOP
    PERFORM calculate_field_score(v_field.id);
    SELECT score INTO v_score FROM crop_fields WHERE id = v_field.id;
    RAISE NOTICE 'Score talhão %: %', v_field.field_code, v_score;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE '059 seed — % talhões com score calculado', v_count;
END $$;

-- ── Seed: certificações demo para TAL-A (primeiro talhão de Lucas) ────────────

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_field_id  uuid;
BEGIN
  SELECT id INTO v_field_id
    FROM crop_fields
   WHERE client_id = v_client_id
   ORDER BY field_code
   LIMIT 1;

  IF v_field_id IS NULL THEN
    RAISE NOTICE '059 seed certif — nenhum talhão encontrado para Lucas';
    RETURN;
  END IF;

  INSERT INTO crop_certifications (client_id, field_id, certification_name, issued_at, expires_at, status, issuer, notes)
  VALUES
    (v_client_id, v_field_id, 'origem_certificada',
     CURRENT_DATE - 120, CURRENT_DATE + 245, 'ativa',
     'MAPA — Ministério da Agricultura', 'Certificado de origem para exportação — auditoria aprovada'),
    (v_client_id, v_field_id, 'car_regular',
     CURRENT_DATE - 200, CURRENT_DATE + 165, 'ativa',
     'SICAR / Receita Federal', 'CAR regularizado após adequação de reserva legal');

  -- O trigger trg_cc_field_score recalculará o score automaticamente
  RAISE NOTICE '059 seed — 2 certificações inseridas para talhão %', v_field_id;
END $$;
