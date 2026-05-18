-- Rollback migration 110

BEGIN;

-- ── Triggers ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS births_recompute_aggregates       ON public.births;
DROP TRIGGER IF EXISTS diagnostics_recompute_aggregates  ON public.pregnancy_diagnostics;
DROP TRIGGER IF EXISTS coverings_recompute_aggregates    ON public.coverings;

-- ── Funções ──────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.trg_births_recompute();
DROP FUNCTION IF EXISTS public.trg_diagnostics_recompute();
DROP FUNCTION IF EXISTS public.trg_coverings_recompute();
DROP FUNCTION IF EXISTS public.recompute_reproductive_season_aggregates(uuid);

-- ── Policies write ───────────────────────────────────────────────────
DROP POLICY IF EXISTS repro_stock_delete       ON public.reproductive_stock_summary;
DROP POLICY IF EXISTS repro_stock_update       ON public.reproductive_stock_summary;
DROP POLICY IF EXISTS repro_stock_insert       ON public.reproductive_stock_summary;
DROP POLICY IF EXISTS repro_ia_services_delete ON public.reproductive_ia_services;
DROP POLICY IF EXISTS repro_ia_services_update ON public.reproductive_ia_services;
DROP POLICY IF EXISTS repro_ia_services_insert ON public.reproductive_ia_services;
DROP POLICY IF EXISTS repro_seasons_delete     ON public.reproductive_seasons;
DROP POLICY IF EXISTS repro_seasons_update     ON public.reproductive_seasons;
DROP POLICY IF EXISTS repro_seasons_insert     ON public.reproductive_seasons;

COMMIT;
