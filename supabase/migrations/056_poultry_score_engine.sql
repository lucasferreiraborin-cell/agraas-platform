-- Migration 056: Score engine para aves — calculate_poultry_score + trigger

-- ── Novas colunas em poultry_batches ─────────────────────────────────────────

ALTER TABLE poultry_batches
  ADD COLUMN IF NOT EXISTS score          integer,
  ADD COLUMN IF NOT EXISTS halal_certified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sif_certified   boolean NOT NULL DEFAULT false;

-- ── Função de cálculo ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_poultry_score(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch           record;
  -- Dimensão: Sanitário (vacinas últimos 90d)
  v_vacina_count    int;
  v_s_sanitario     numeric := 0;
  -- Dimensão: Produtivo (evolução de peso)
  v_peso_count      int;
  v_peso_oldest     numeric;
  v_peso_newest     numeric;
  v_s_produtivo     numeric := 0;
  -- Dimensão: Operacional (eventos últimos 30d)
  v_event_count     int;
  v_s_operacional   numeric := 0;
  -- Dimensão: Conformidade (flags + mortalidade + conversão)
  v_conf_pts        int := 0;
  v_mortality_pct   numeric;
  v_s_conformidade  numeric := 0;
  -- Score final
  v_final_score     numeric;
BEGIN
  SELECT * INTO v_batch FROM poultry_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Sanitário: vacinas nos últimos 90 dias ───────────────────────────────
  SELECT COUNT(*) INTO v_vacina_count
    FROM poultry_batch_events
   WHERE batch_id = p_batch_id
     AND event_type = 'vacina'
     AND date >= CURRENT_DATE - INTERVAL '90 days';

  v_s_sanitario := CASE
    WHEN v_vacina_count = 0 THEN 0
    WHEN v_vacina_count = 1 THEN 50
    WHEN v_vacina_count = 2 THEN 75
    ELSE 100
  END;

  -- ── Produtivo: evolução de peso médio ────────────────────────────────────
  SELECT COUNT(*),
         MIN(value) FILTER (WHERE date = (SELECT MIN(date) FROM poultry_batch_events WHERE batch_id = p_batch_id AND event_type = 'pesagem' AND value IS NOT NULL)),
         MAX(value) FILTER (WHERE date = (SELECT MAX(date) FROM poultry_batch_events WHERE batch_id = p_batch_id AND event_type = 'pesagem' AND value IS NOT NULL))
    INTO v_peso_count, v_peso_oldest, v_peso_newest
    FROM poultry_batch_events
   WHERE batch_id = p_batch_id
     AND event_type = 'pesagem'
     AND value IS NOT NULL;

  IF v_peso_count = 0 THEN
    v_s_produtivo := 20;
  ELSIF v_peso_count = 1 THEN
    v_s_produtivo := 50;
  ELSE
    v_s_produtivo := CASE
      WHEN v_peso_newest > v_peso_oldest THEN 100
      WHEN v_peso_newest = v_peso_oldest THEN 60
      ELSE 20
    END;
  END IF;

  -- ── Operacional: eventos registrados últimos 30d ─────────────────────────
  SELECT COUNT(*) INTO v_event_count
    FROM poultry_batch_events
   WHERE batch_id = p_batch_id
     AND date >= CURRENT_DATE - INTERVAL '30 days';

  v_s_operacional := CASE
    WHEN v_event_count = 0 THEN 20
    WHEN v_event_count <= 3 THEN 60
    ELSE 100
  END;

  -- ── Conformidade: flags + mortalidade + conversão ────────────────────────
  -- Halal certificado: +25pts
  IF v_batch.halal_certified THEN v_conf_pts := v_conf_pts + 25; END IF;
  -- SIF certificado: +25pts
  IF v_batch.sif_certified THEN v_conf_pts := v_conf_pts + 25; END IF;
  -- Mortalidade < 3%: +25pts
  IF v_batch.initial_count > 0 THEN
    v_mortality_pct := (v_batch.mortality_count::numeric / v_batch.initial_count) * 100;
    IF v_mortality_pct < 3 THEN v_conf_pts := v_conf_pts + 25; END IF;
  END IF;
  -- Conversão alimentar < 1.8: +25pts
  IF v_batch.feed_conversion IS NOT NULL AND v_batch.feed_conversion < 1.8 THEN
    v_conf_pts := v_conf_pts + 25;
  END IF;
  v_s_conformidade := v_conf_pts; -- já está em escala 0-100

  -- ── Score final ponderado (Sanitário 30% + Produtivo 30% + Operacional 20% + Conformidade 20%) ──
  v_final_score := ROUND(
    (v_s_sanitario   * 0.30) +
    (v_s_produtivo   * 0.30) +
    (v_s_operacional * 0.20) +
    (v_s_conformidade * 0.20)
  );

  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  UPDATE poultry_batches
     SET score = v_final_score, updated_at = now()
   WHERE id = p_batch_id;
END;
$$;

-- ── Função de trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_recalc_poultry_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_poultry_score(OLD.batch_id);
  ELSE
    PERFORM calculate_poultry_score(NEW.batch_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_pbe_score
  AFTER INSERT OR UPDATE OR DELETE ON poultry_batch_events
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_poultry_score();

DO $$ BEGIN
  RAISE NOTICE 'Migration 056 OK — score/halal_certified/sif_certified adicionados + calculate_poultry_score() + trigger';
END $$;
