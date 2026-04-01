-- Migration 054: Score engine para ovinos/caprinos
-- Função calculate_livestock_score(p_animal_id uuid) + triggers nas 4 tabelas novas

CREATE OR REPLACE FUNCTION calculate_livestock_score(p_animal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_species        livestock_species_enum;
  v_client_id      uuid;

  -- Pesos da espécie
  v_w_sanidade     numeric;
  v_w_produtivo    numeric;
  v_w_operacional  numeric;
  v_w_rastreab     numeric;
  v_w_certif       numeric;

  -- Scores brutos por dimensão (0-100)
  v_s_sanidade     numeric := 0;
  v_s_produtivo    numeric := 0;
  v_s_operacional  numeric := 0;
  v_s_rastreab     numeric := 0;
  v_s_certif       numeric := 0;

  -- Auxiliares
  v_app_count      int;
  v_weight_count   int;
  v_w_oldest       numeric;
  v_w_newest       numeric;
  v_event_count    int;
  v_cert_count     int;
  v_fields_filled  int;
  v_has_birth      bool;
  v_has_rfid       bool;
  v_has_agraas_id  bool;
  v_has_breed      bool;

  v_final_score    numeric;
BEGIN
  -- Busca espécie e client_id
  SELECT species, client_id
    INTO v_species, v_client_id
    FROM livestock_species
   WHERE id = p_animal_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Busca pesos da configuração por espécie (fallback: padrão ovino)
  SELECT weight_sanidade, weight_produtivo, weight_operacional,
         weight_rastreabilidade, weight_certificacoes
    INTO v_w_sanidade, v_w_produtivo, v_w_operacional, v_w_rastreab, v_w_certif
    FROM livestock_score_config
   WHERE species = v_species;

  IF NOT FOUND THEN
    v_w_sanidade := 35; v_w_produtivo := 20; v_w_operacional := 20;
    v_w_rastreab := 15; v_w_certif := 10;
  END IF;

  -- ── Dimensão: Sanidade (livestock_applications últimos 12 meses) ──────────
  SELECT COUNT(*) INTO v_app_count
    FROM livestock_applications
   WHERE animal_id = p_animal_id
     AND application_date >= CURRENT_DATE - INTERVAL '12 months';

  v_s_sanidade := CASE
    WHEN v_app_count = 0 THEN 0
    WHEN v_app_count = 1 THEN 50
    WHEN v_app_count = 2 THEN 70
    WHEN v_app_count = 3 THEN 85
    ELSE 100
  END;

  -- ── Dimensão: Produtivo (livestock_weights últimos 6 meses) ──────────────
  SELECT COUNT(*),
         MIN(weight_kg) FILTER (WHERE weighed_at = (SELECT MIN(weighed_at) FROM livestock_weights WHERE animal_id = p_animal_id AND weighed_at >= CURRENT_DATE - INTERVAL '6 months')),
         MAX(weight_kg) FILTER (WHERE weighed_at = (SELECT MAX(weighed_at) FROM livestock_weights WHERE animal_id = p_animal_id AND weighed_at >= CURRENT_DATE - INTERVAL '6 months'))
    INTO v_weight_count, v_w_oldest, v_w_newest
    FROM livestock_weights
   WHERE animal_id = p_animal_id
     AND weighed_at >= CURRENT_DATE - INTERVAL '6 months';

  IF v_weight_count = 0 THEN
    v_s_produtivo := 20;
  ELSIF v_weight_count = 1 THEN
    v_s_produtivo := 55;
  ELSE
    -- Ganho positivo = bônus
    v_s_produtivo := CASE
      WHEN v_w_newest > v_w_oldest THEN 100
      WHEN v_w_newest = v_w_oldest THEN 70
      ELSE 40
    END;
  END IF;

  -- ── Dimensão: Operacional (livestock_events últimos 6 meses) ─────────────
  SELECT COUNT(*) INTO v_event_count
    FROM livestock_events
   WHERE animal_id = p_animal_id
     AND event_date >= CURRENT_DATE - INTERVAL '6 months';

  v_s_operacional := CASE
    WHEN v_event_count = 0 THEN 20
    WHEN v_event_count <= 2 THEN 50
    WHEN v_event_count <= 5 THEN 80
    ELSE 100
  END;

  -- ── Dimensão: Rastreabilidade (campos preenchidos em livestock_species) ────
  SELECT
    (birth_date IS NOT NULL)::int +
    (rfid IS NOT NULL AND rfid <> '')::int +
    (agraas_id IS NOT NULL AND agraas_id <> '')::int +
    (breed IS NOT NULL AND breed <> '')::int
  INTO v_fields_filled
  FROM livestock_species
  WHERE id = p_animal_id;

  v_s_rastreab := LEAST(100, v_fields_filled * 25);

  -- ── Dimensão: Certificações (livestock_certifications ativas) ─────────────
  SELECT COUNT(*) INTO v_cert_count
    FROM livestock_certifications
   WHERE animal_id = p_animal_id
     AND status = 'ativa';

  v_s_certif := CASE
    WHEN v_cert_count = 0 THEN 0
    WHEN v_cert_count = 1 THEN 60
    ELSE 100
  END;

  -- ── Score final ponderado ─────────────────────────────────────────────────
  v_final_score := ROUND(
    (v_s_sanidade    * v_w_sanidade    / 100.0) +
    (v_s_produtivo   * v_w_produtivo   / 100.0) +
    (v_s_operacional * v_w_operacional / 100.0) +
    (v_s_rastreab    * v_w_rastreab    / 100.0) +
    (v_s_certif      * v_w_certif      / 100.0)
  );

  -- Garante intervalo 0-100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  -- Atualiza score em livestock_species
  UPDATE livestock_species
     SET score = v_final_score, updated_at = now()
   WHERE id = p_animal_id;
END;
$$;

-- ── Funções de trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_recalc_livestock_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_livestock_score(OLD.animal_id);
  ELSE
    PERFORM calculate_livestock_score(NEW.animal_id);
  END IF;
  RETURN NULL;
END;
$$;

-- ── Triggers nas 4 tabelas ────────────────────────────────────────────────────

CREATE TRIGGER trg_lw_score
  AFTER INSERT OR UPDATE OR DELETE ON livestock_weights
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_livestock_score();

CREATE TRIGGER trg_la_score
  AFTER INSERT OR UPDATE OR DELETE ON livestock_applications
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_livestock_score();

CREATE TRIGGER trg_le_score
  AFTER INSERT OR UPDATE OR DELETE ON livestock_events
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_livestock_score();

CREATE TRIGGER trg_lc_score
  AFTER INSERT OR UPDATE OR DELETE ON livestock_certifications
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_livestock_score();

DO $$ BEGIN
  RAISE NOTICE 'Migration 054 OK — calculate_livestock_score() criada + 4 triggers ativos';
END $$;
