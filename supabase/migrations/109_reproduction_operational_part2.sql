-- Migration 109: schema operacional de reprodução (parte 2)
--
-- Tabelas criadas:
--   semen_batches              -- lote de sêmen comprado/armazenado
--   semen_batch_applications   -- junção batch ↔ covering (consumo de doses)
--   feed_efficiency_records    -- registro de eficiência alimentar (CAR / RFI)
--   carbon_footprint_estimates -- estimativa de pegada carbono
--
-- Também adiciona FK retroativa coverings.semen_batch_id -> semen_batches.id

BEGIN;

-- ── 1) semen_batches ─────────────────────────────────────────────────
CREATE TABLE public.semen_batches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sire_name         text NOT NULL,
  sire_registration text,
  central_name      text,
  batch_code        text NOT NULL,
  expiry_date       date,
  total_doses       int NOT NULL CHECK (total_doses >= 0),
  used_doses        int NOT NULL DEFAULT 0 CHECK (used_doses >= 0),
  breed             text,
  genetic_data      jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT semen_batches_doses_check CHECK (used_doses <= total_doses)
);

CREATE INDEX idx_semen_client     ON public.semen_batches(client_id);
CREATE INDEX idx_semen_batch_code ON public.semen_batches(batch_code);

ALTER TABLE public.semen_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY semen_select ON public.semen_batches
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY semen_insert ON public.semen_batches
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY semen_update ON public.semen_batches
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY semen_delete ON public.semen_batches
  FOR DELETE USING (client_id = get_my_client_id());

-- FK retroativa: coverings.semen_batch_id -> semen_batches.id
ALTER TABLE public.coverings
  ADD CONSTRAINT coverings_semen_batch_fk
  FOREIGN KEY (semen_batch_id) REFERENCES public.semen_batches(id) ON DELETE SET NULL;

CREATE INDEX idx_coverings_semen_batch ON public.coverings(semen_batch_id);

-- ── 2) semen_batch_applications ──────────────────────────────────────
CREATE TABLE public.semen_batch_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semen_batch_id uuid NOT NULL REFERENCES public.semen_batches(id) ON DELETE CASCADE,
  covering_id    uuid NOT NULL REFERENCES public.coverings(id) ON DELETE CASCADE,
  applied_at     timestamptz NOT NULL DEFAULT now(),
  dose_count     int NOT NULL DEFAULT 1 CHECK (dose_count > 0)
);

CREATE INDEX idx_sba_batch    ON public.semen_batch_applications(semen_batch_id);
CREATE INDEX idx_sba_covering ON public.semen_batch_applications(covering_id);

ALTER TABLE public.semen_batch_applications ENABLE ROW LEVEL SECURITY;

-- Tenant isolation via semen_batches.client_id
CREATE POLICY sba_select ON public.semen_batch_applications
  FOR SELECT USING (
    is_admin() OR semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE client_id = get_my_client_id()
    )
  );
CREATE POLICY sba_insert ON public.semen_batch_applications
  FOR INSERT WITH CHECK (
    semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE client_id = get_my_client_id()
    )
  );
CREATE POLICY sba_update ON public.semen_batch_applications
  FOR UPDATE USING (
    semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE client_id = get_my_client_id()
    )
  ) WITH CHECK (
    semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE client_id = get_my_client_id()
    )
  );
CREATE POLICY sba_delete ON public.semen_batch_applications
  FOR DELETE USING (
    semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE client_id = get_my_client_id()
    )
  );

-- ── 3) feed_efficiency_records ───────────────────────────────────────
CREATE TABLE public.feed_efficiency_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  animal_id          uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  period_start       date NOT NULL,
  period_end         date NOT NULL,
  intake_kg_dm       numeric NOT NULL CHECK (intake_kg_dm >= 0),
  gain_kg            numeric NOT NULL,
  conversion_ratio   numeric,
  car_value          numeric,
  methodology        text,
  ration_composition jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_eff_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_feed_eff_client ON public.feed_efficiency_records(client_id);
CREATE INDEX idx_feed_eff_animal ON public.feed_efficiency_records(animal_id);
CREATE INDEX idx_feed_eff_period ON public.feed_efficiency_records(period_start, period_end);

ALTER TABLE public.feed_efficiency_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY feed_eff_select ON public.feed_efficiency_records
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY feed_eff_insert ON public.feed_efficiency_records
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY feed_eff_update ON public.feed_efficiency_records
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY feed_eff_delete ON public.feed_efficiency_records
  FOR DELETE USING (client_id = get_my_client_id());

-- ── 4) carbon_footprint_estimates ────────────────────────────────────
CREATE TABLE public.carbon_footprint_estimates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  animal_id             uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  -- lot_id intencionalmente sem FK (compatível com lots OU lotes legados)
  lot_id                uuid,
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  ch4_emission_kg       numeric NOT NULL CHECK (ch4_emission_kg >= 0),
  co2_eq_per_kg_carcass numeric,
  methodology_version   text NOT NULL,
  pasture_type          text,
  ration_data           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carbon_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_carbon_client ON public.carbon_footprint_estimates(client_id);
CREATE INDEX idx_carbon_animal ON public.carbon_footprint_estimates(animal_id);
CREATE INDEX idx_carbon_period ON public.carbon_footprint_estimates(period_start, period_end);

ALTER TABLE public.carbon_footprint_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY carbon_select ON public.carbon_footprint_estimates
  FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY carbon_insert ON public.carbon_footprint_estimates
  FOR INSERT WITH CHECK (client_id = get_my_client_id());
CREATE POLICY carbon_update ON public.carbon_footprint_estimates
  FOR UPDATE USING (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());
CREATE POLICY carbon_delete ON public.carbon_footprint_estimates
  FOR DELETE USING (client_id = get_my_client_id());

COMMIT;
