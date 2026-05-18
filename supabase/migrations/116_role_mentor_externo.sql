-- Migration 116: RBAC role mentor_externo (acesso de leitura cross-tenant)
-- Crítico antes do acesso da Dra. Renata (IZ-SP).
--
-- Modelo: mentor_externo NÃO é uma role do Postgres — é um padrão de
-- atribuição registrado em mentor_assignments. A função is_mentor_externo()
-- testa se o usuário autenticado tem alguma atribuição; a função
-- mentor_has_access_to_client(target_client_id) testa se ele tem atribuição
-- específica àquele cliente.
--
-- AJUSTES DO SPEC ORIGINAL (validados via audit do schema antes desta migration):
--   • `animal_lots` não existe   → substituído por `lots` (exportação)
--   • `animal_weighings` não existe → substituído por `weights` (pesagens bovinos)
--   • applications, semen_batch_applications, animal_movements NÃO têm
--     client_id direto → policy de mentor usa subquery via animal_id ou
--     semen_batch_id pra resolver o cliente.
--
-- IMPORTANTE: SEM policies INSERT/UPDATE/DELETE pra mentor — read-only por design.

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- PARTE A — Tabela mentor_assignments
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE public.mentor_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  uuid REFERENCES auth.users(id),
  notes       text,
  UNIQUE (user_id, client_id)
);

CREATE INDEX idx_mentor_assignments_user   ON public.mentor_assignments(user_id);
CREATE INDEX idx_mentor_assignments_client ON public.mentor_assignments(client_id);

ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY mentor_assignments_select ON public.mentor_assignments
  FOR SELECT USING (is_admin() OR user_id = auth.uid());
CREATE POLICY mentor_assignments_insert ON public.mentor_assignments
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY mentor_assignments_update ON public.mentor_assignments
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY mentor_assignments_delete ON public.mentor_assignments
  FOR DELETE USING (is_admin());

-- ════════════════════════════════════════════════════════════════════
-- PARTE B — Function is_mentor_externo()
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_mentor_externo()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE user_id = auth.uid()
  );
$$;

-- ════════════════════════════════════════════════════════════════════
-- PARTE C — Function mentor_has_access_to_client(target_client_id)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mentor_has_access_to_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE user_id = auth.uid() AND client_id = target_client_id
  );
$$;

-- ════════════════════════════════════════════════════════════════════
-- PARTE D — Policies SELECT pra mentor_externo
-- ════════════════════════════════════════════════════════════════════

-- ── Grupo 1: tabelas com client_id direto (padrão do spec) ───────────
CREATE POLICY animals_select_mentor ON public.animals
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY coverings_select_mentor ON public.coverings
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY pregnancy_diagnostics_select_mentor ON public.pregnancy_diagnostics
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY births_select_mentor ON public.births
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY bull_breeding_soundness_select_mentor ON public.bull_breeding_soundness
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY semen_batches_select_mentor ON public.semen_batches
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY feed_efficiency_records_select_mentor ON public.feed_efficiency_records
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY carbon_footprint_estimates_select_mentor ON public.carbon_footprint_estimates
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY reproductive_seasons_select_mentor ON public.reproductive_seasons
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY reproductive_ia_services_select_mentor ON public.reproductive_ia_services
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY reproductive_stock_summary_select_mentor ON public.reproductive_stock_summary
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY marketplace_listings_select_mentor ON public.marketplace_listings
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY properties_select_mentor ON public.properties
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));
CREATE POLICY lots_select_mentor ON public.lots
  FOR SELECT USING (is_mentor_externo() AND mentor_has_access_to_client(client_id));

-- ── Grupo 2: indireto via animal_id → animals.client_id ──────────────
CREATE POLICY applications_select_mentor ON public.applications
  FOR SELECT USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );
CREATE POLICY animal_movements_select_mentor ON public.animal_movements
  FOR SELECT USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );
CREATE POLICY weights_select_mentor ON public.weights
  FOR SELECT USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );

-- ── Grupo 3: indireto via semen_batch_id → semen_batches.client_id ───
CREATE POLICY semen_batch_applications_select_mentor ON public.semen_batch_applications
  FOR SELECT USING (
    is_mentor_externo() AND semen_batch_id IN (
      SELECT id FROM public.semen_batches WHERE mentor_has_access_to_client(client_id)
    )
  );

COMMIT;
