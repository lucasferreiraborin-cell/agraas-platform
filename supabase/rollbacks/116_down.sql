-- Rollback migration 116

BEGIN;

-- ── Drop policies SELECT mentor (grupo 3) ────────────────────────────
DROP POLICY IF EXISTS semen_batch_applications_select_mentor ON public.semen_batch_applications;

-- ── Drop policies SELECT mentor (grupo 2) ────────────────────────────
DROP POLICY IF EXISTS weights_select_mentor          ON public.weights;
DROP POLICY IF EXISTS animal_movements_select_mentor ON public.animal_movements;
DROP POLICY IF EXISTS applications_select_mentor     ON public.applications;

-- ── Drop policies SELECT mentor (grupo 1, direto) ────────────────────
DROP POLICY IF EXISTS lots_select_mentor                       ON public.lots;
DROP POLICY IF EXISTS properties_select_mentor                 ON public.properties;
DROP POLICY IF EXISTS marketplace_listings_select_mentor       ON public.marketplace_listings;
DROP POLICY IF EXISTS reproductive_stock_summary_select_mentor ON public.reproductive_stock_summary;
DROP POLICY IF EXISTS reproductive_ia_services_select_mentor   ON public.reproductive_ia_services;
DROP POLICY IF EXISTS reproductive_seasons_select_mentor       ON public.reproductive_seasons;
DROP POLICY IF EXISTS carbon_footprint_estimates_select_mentor ON public.carbon_footprint_estimates;
DROP POLICY IF EXISTS feed_efficiency_records_select_mentor    ON public.feed_efficiency_records;
DROP POLICY IF EXISTS semen_batches_select_mentor              ON public.semen_batches;
DROP POLICY IF EXISTS bull_breeding_soundness_select_mentor    ON public.bull_breeding_soundness;
DROP POLICY IF EXISTS births_select_mentor                     ON public.births;
DROP POLICY IF EXISTS pregnancy_diagnostics_select_mentor      ON public.pregnancy_diagnostics;
DROP POLICY IF EXISTS coverings_select_mentor                  ON public.coverings;
DROP POLICY IF EXISTS animals_select_mentor                    ON public.animals;

-- ── Drop functions ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mentor_has_access_to_client(uuid);
DROP FUNCTION IF EXISTS public.is_mentor_externo();

-- ── Drop mentor_assignments ──────────────────────────────────────────
DROP TABLE IF EXISTS public.mentor_assignments;

COMMIT;
