-- Migration 111: rastreio sanitário com lote + carência MAPA + calendário
--
-- DESCOBERTAS DO AUDIT (Eixo B kickoff via Management API):
--   • applications.batch_id JÁ EXISTE como FK → stock_batches.id
--     (criado em migration anterior; nome 'batch_id' em vez de 'stock_batch_id')
--     → PASSO 1 do plano original é no-op, basta garantir o index
--   • applications.withdrawal_end_date JÁ EXISTE (date)
--     → reaproveitar como carência calculada, sem criar carencia_until
--   • sanitary_calendar JÁ EXISTE
--     → vaccination_schedules é camada complementar multi-tenant rica
--
-- ESCOPO REAL desta migration:
--   1. tabela mapa_carencias  (catálogo público curado de carência MAPA)
--   2. tabela vaccination_schedules  (calendário sanitário multi-tenant)
--   3. trigger trg_applications_carencia que popula applications.withdrawal_end_date
--      via match em mapa_carencias (não sobrescreve se usuário setou)
--   4. indexes em applications(batch_id) e applications(animal_id, application_date)

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1) mapa_carencias — catálogo de referência (público read, admin write)
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE public.mapa_carencias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name          text NOT NULL,
  active_principle      text,
  category              text,
  withholding_days_meat int NOT NULL CHECK (withholding_days_meat >= 0),
  withholding_days_milk int CHECK (withholding_days_milk IS NULL OR withholding_days_milk >= 0),
  source                text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mapa_carencias_product ON public.mapa_carencias(LOWER(product_name));
CREATE UNIQUE INDEX uq_mapa_carencias_product_principle
  ON public.mapa_carencias (LOWER(product_name), COALESCE(LOWER(active_principle), ''));

ALTER TABLE public.mapa_carencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY mapa_carencias_select ON public.mapa_carencias
  FOR SELECT USING (true);
CREATE POLICY mapa_carencias_insert ON public.mapa_carencias
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY mapa_carencias_update ON public.mapa_carencias
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY mapa_carencias_delete ON public.mapa_carencias
  FOR DELETE USING (is_admin());

-- ════════════════════════════════════════════════════════════════════
-- 2) vaccination_schedules — calendário sanitário por cliente
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE public.vaccination_schedules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  animal_category      text NOT NULL,
  vaccine_name         text NOT NULL,
  months_of_age_array  int[] NOT NULL DEFAULT '{}',
  frequency            text NOT NULL
                       CHECK (frequency IN ('anual','semestral','dose_unica','sob_demanda')),
  regulatory_mandatory boolean NOT NULL DEFAULT false,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vac_sched_client   ON public.vaccination_schedules(client_id);
CREATE INDEX idx_vac_sched_category ON public.vaccination_schedules(animal_category);

ALTER TABLE public.vaccination_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY vac_sched_select ON public.vaccination_schedules
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY vac_sched_insert ON public.vaccination_schedules
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY vac_sched_update ON public.vaccination_schedules
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY vac_sched_delete ON public.vaccination_schedules
  FOR DELETE USING (client_id = get_my_client_id());

-- ════════════════════════════════════════════════════════════════════
-- 3) Trigger: popula applications.withdrawal_end_date via mapa_carencias
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_applications_carencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_days int;
BEGIN
  -- Só preenche se usuário não setou explicitamente e há dados pra calcular
  IF NEW.withdrawal_end_date IS NULL
     AND NEW.product_name IS NOT NULL
     AND NEW.application_date IS NOT NULL THEN

    SELECT withholding_days_meat INTO v_days
    FROM public.mapa_carencias
    WHERE LOWER(product_name) = LOWER(NEW.product_name)
    LIMIT 1;

    IF v_days IS NOT NULL THEN
      NEW.withdrawal_end_date := NEW.application_date + v_days;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER applications_carencia_autofill
BEFORE INSERT OR UPDATE OF product_name, application_date ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.trg_applications_carencia();

-- ════════════════════════════════════════════════════════════════════
-- 4) Indexes em applications
-- ════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_applications_batch
  ON public.applications(batch_id);
CREATE INDEX IF NOT EXISTS idx_applications_animal_date
  ON public.applications(animal_id, application_date);

COMMIT;
