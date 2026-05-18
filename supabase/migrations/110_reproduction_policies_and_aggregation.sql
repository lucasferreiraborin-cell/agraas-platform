-- Migration 110: policies write nas 3 tabelas de reporting + agregação automática
--
-- PARTE A — completa CRUD em reproductive_seasons, _ia_services, _stock_summary
--           (audit revelou só SELECT existindo)
-- PARTE B — função recompute_reproductive_season_aggregates(season_id) + triggers
--           AFTER INSERT/UPDATE/DELETE em coverings, pregnancy_diagnostics, births
--           que mantêm reproductive_seasons.{total_inseminations, females_inseminated,
--           pregnancy_rate, avg_conception_rate, births_performed, born_alive} em dia.
--
-- Estratégia: recompute completo por estação afetada (não delta incremental).
-- Mais lento sob inserção massiva, mas evita drift e simplifica manutenção.

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- PARTE A: policies write nas 3 tabelas existentes
-- ════════════════════════════════════════════════════════════════════

CREATE POLICY repro_seasons_insert ON public.reproductive_seasons
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_seasons_update ON public.reproductive_seasons
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_seasons_delete ON public.reproductive_seasons
  FOR DELETE USING (client_id = get_my_client_id());

CREATE POLICY repro_ia_services_insert ON public.reproductive_ia_services
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_ia_services_update ON public.reproductive_ia_services
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_ia_services_delete ON public.reproductive_ia_services
  FOR DELETE USING (client_id = get_my_client_id());

CREATE POLICY repro_stock_insert ON public.reproductive_stock_summary
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_stock_update ON public.reproductive_stock_summary
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY repro_stock_delete ON public.reproductive_stock_summary
  FOR DELETE USING (client_id = get_my_client_id());

-- ════════════════════════════════════════════════════════════════════
-- PARTE B: função central + triggers
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.recompute_reproductive_season_aggregates(p_season_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_ia      int;
  v_females_ia    int;
  v_diag_total    int;
  v_diag_positive int;
  v_births_total  int;
  v_born_alive    int;
BEGIN
  IF p_season_id IS NULL THEN RETURN; END IF;

  -- Inseminações (todas as modalidades artificiais / TE)
  SELECT
    COUNT(*) FILTER (WHERE covering_type IN ('ia_convencional','iatf','re_iatf','te_fiv','te_iv')),
    COUNT(DISTINCT dam_animal_id) FILTER (WHERE covering_type IN ('ia_convencional','iatf','re_iatf','te_fiv','te_iv'))
  INTO v_total_ia, v_females_ia
  FROM public.coverings
  WHERE season_id = p_season_id;

  -- Diagnósticos → taxa prenhez
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE pd.result = 'positivo')
  INTO v_diag_total, v_diag_positive
  FROM public.pregnancy_diagnostics pd
  JOIN public.coverings c ON c.id = pd.covering_id
  WHERE c.season_id = p_season_id;

  -- Partos
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE calf_alive = true)
  INTO v_births_total, v_born_alive
  FROM public.births b
  JOIN public.coverings c ON c.id = b.covering_id
  WHERE c.season_id = p_season_id;

  UPDATE public.reproductive_seasons
  SET
    total_inseminations = v_total_ia,
    females_inseminated = v_females_ia,
    pregnancy_rate      = CASE WHEN v_diag_total > 0
                                THEN ROUND(100.0 * v_diag_positive / v_diag_total, 2)
                                ELSE NULL END,
    avg_conception_rate = CASE WHEN v_diag_total > 0
                                THEN ROUND(100.0 * v_diag_positive / v_diag_total, 2)
                                ELSE NULL END,
    births_performed    = v_births_total,
    born_alive          = v_born_alive
  WHERE id = p_season_id;
END
$$;

-- ── Triggers em coverings ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_coverings_recompute()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.season_id IS NOT NULL THEN
    PERFORM public.recompute_reproductive_season_aggregates(NEW.season_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.season_id IS NOT NULL THEN
      PERFORM public.recompute_reproductive_season_aggregates(NEW.season_id);
    END IF;
    IF OLD.season_id IS NOT NULL AND OLD.season_id IS DISTINCT FROM NEW.season_id THEN
      PERFORM public.recompute_reproductive_season_aggregates(OLD.season_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.season_id IS NOT NULL THEN
    PERFORM public.recompute_reproductive_season_aggregates(OLD.season_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER coverings_recompute_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.coverings
FOR EACH ROW EXECUTE FUNCTION public.trg_coverings_recompute();

-- ── Triggers em pregnancy_diagnostics ────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_diagnostics_recompute()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_season uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT season_id INTO v_season FROM public.coverings WHERE id = NEW.covering_id;
    IF v_season IS NOT NULL THEN
      PERFORM public.recompute_reproductive_season_aggregates(v_season);
    END IF;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT season_id INTO v_season FROM public.coverings WHERE id = OLD.covering_id;
    IF v_season IS NOT NULL THEN
      PERFORM public.recompute_reproductive_season_aggregates(v_season);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER diagnostics_recompute_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.pregnancy_diagnostics
FOR EACH ROW EXECUTE FUNCTION public.trg_diagnostics_recompute();

-- ── Triggers em births ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_births_recompute()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_season uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.covering_id IS NOT NULL THEN
    SELECT season_id INTO v_season FROM public.coverings WHERE id = NEW.covering_id;
    IF v_season IS NOT NULL THEN
      PERFORM public.recompute_reproductive_season_aggregates(v_season);
    END IF;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.covering_id IS NOT NULL THEN
    SELECT season_id INTO v_season FROM public.coverings WHERE id = OLD.covering_id;
    IF v_season IS NOT NULL THEN
      PERFORM public.recompute_reproductive_season_aggregates(v_season);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER births_recompute_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.births
FOR EACH ROW EXECUTE FUNCTION public.trg_births_recompute();

COMMIT;
