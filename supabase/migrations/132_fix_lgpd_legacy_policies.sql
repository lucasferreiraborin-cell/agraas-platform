-- 132_fix_lgpd_legacy_policies
-- Sprint mega-backend (Lucas + audit security-rls + controladoria) 2026-06-24
-- Aplicada via MCP em producao (project ixuxawcgwhrrrnwendxr).
--
-- OBJETIVO: fechar vazamentos cross-tenant identificados pelo security-rls-auditor
-- (achados C1-C9 + M4). Eliminamos policies legacy permissivas (USING true ou
-- WITH CHECK true) sobreviventes desde a fase pre-RLS multi-tenant, e adicionamos
-- WITH CHECK nas policies UPDATE que tinham apenas USING (M4).
--
-- IMPACTO: produtor X nao consegue mais SELECT/INSERT/UPDATE em linhas de outro
-- produtor Y via tabelas operacionais. accounting_entries ganham coluna `posted`
-- e bloqueio fisico contra mutacao apos posting (compliance contabil/SPED).
--
-- ROLLBACK: re-criar policies allow_all_* e temp_public_*. NAO recomendado.

-- =========================================================================
-- BLOCO A: DROP policies legacy permissivas (USING true / WITH CHECK true)
-- =========================================================================

-- animal_lot_assignments — manter so lot_assignments_access
DROP POLICY IF EXISTS allow_all_insert ON public.animal_lot_assignments;
DROP POLICY IF EXISTS allow_all_select ON public.animal_lot_assignments;
DROP POLICY IF EXISTS allow_all_update ON public.animal_lot_assignments;
DROP POLICY IF EXISTS allow_insert_animal_lot_assignments ON public.animal_lot_assignments;
DROP POLICY IF EXISTS allow_read_animal_lot_assignments ON public.animal_lot_assignments;
DROP POLICY IF EXISTS allow_update_animal_lot_assignments ON public.animal_lot_assignments;

-- animal_scores — manter animal_scores_*_same_property + mentor.
-- Adicionar tambem isolamento via animals.client_id (defesa em profundidade).
DROP POLICY IF EXISTS allow_all_insert ON public.animal_scores;
DROP POLICY IF EXISTS allow_all_select ON public.animal_scores;
DROP POLICY IF EXISTS allow_all_update ON public.animal_scores;
DROP POLICY IF EXISTS allow_insert_animal_scores ON public.animal_scores;
DROP POLICY IF EXISTS allow_read_animal_scores ON public.animal_scores;
DROP POLICY IF EXISTS allow_update_animal_scores ON public.animal_scores;

-- isolamento "belt and suspenders": ALL command + EXISTS no animal pai
DROP POLICY IF EXISTS animal_scores_client_isolation ON public.animal_scores;
CREATE POLICY animal_scores_client_isolation ON public.animal_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.animals
      WHERE animals.id = animal_scores.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.animals
      WHERE animals.id = animal_scores.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  );

-- lots — manter lots_access + lots_select_mentor
DROP POLICY IF EXISTS allow_all_insert ON public.lots;
DROP POLICY IF EXISTS allow_all_select ON public.lots;
DROP POLICY IF EXISTS allow_all_update ON public.lots;
DROP POLICY IF EXISTS allow_insert_lots ON public.lots;
DROP POLICY IF EXISTS allow_read_lots ON public.lots;
DROP POLICY IF EXISTS allow_update_lots ON public.lots;

-- batch_lots — manter batch_lots_*_same_property
DROP POLICY IF EXISTS allow_all_insert ON public.batch_lots;
DROP POLICY IF EXISTS allow_all_select ON public.batch_lots;
DROP POLICY IF EXISTS allow_all_update ON public.batch_lots;
DROP POLICY IF EXISTS temp_public_read_batch_lots ON public.batch_lots;

-- batch_lot_animals — manter batch_lot_animals_*_same_property
DROP POLICY IF EXISTS allow_all_insert ON public.batch_lot_animals;
DROP POLICY IF EXISTS allow_all_select ON public.batch_lot_animals;
DROP POLICY IF EXISTS allow_all_update ON public.batch_lot_animals;

-- slaughter_records — manter slaughter_* (insert/select/update/delete)
DROP POLICY IF EXISTS allow_all_insert ON public.slaughter_records;
DROP POLICY IF EXISTS allow_all_select ON public.slaughter_records;
DROP POLICY IF EXISTS allow_all_update ON public.slaughter_records;
DROP POLICY IF EXISTS temp_public_read_slaughter_records ON public.slaughter_records;

-- animal_seals — manter animal_seals_*_same_property
DROP POLICY IF EXISTS allow_all_insert ON public.animal_seals;
DROP POLICY IF EXISTS allow_all_select ON public.animal_seals;
DROP POLICY IF EXISTS allow_all_update ON public.animal_seals;

-- products — manter products_select/insert/update/delete
DROP POLICY IF EXISTS allow_all_insert ON public.products;
DROP POLICY IF EXISTS allow_all_select ON public.products;
DROP POLICY IF EXISTS allow_all_update ON public.products;
DROP POLICY IF EXISTS allow_read_products ON public.products;

-- users_profile — sem policies seguras, precisamos criar
DROP POLICY IF EXISTS allow_all_insert ON public.users_profile;
DROP POLICY IF EXISTS allow_all_select ON public.users_profile;
DROP POLICY IF EXISTS allow_all_update ON public.users_profile;
DROP POLICY IF EXISTS users_profile_select_own ON public.users_profile;
DROP POLICY IF EXISTS users_profile_update_own ON public.users_profile;
DROP POLICY IF EXISTS users_profile_insert_own ON public.users_profile;

CREATE POLICY users_profile_select_own ON public.users_profile
  FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());
CREATE POLICY users_profile_update_own ON public.users_profile
  FOR UPDATE USING (auth_user_id = auth.uid() OR is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR is_admin());
CREATE POLICY users_profile_insert_own ON public.users_profile
  FOR INSERT WITH CHECK (auth_user_id = auth.uid() OR is_admin());

-- slaughterhouses = catalogo de frigorificos (referencia compartilhada).
-- SELECT publico OK pra produtores escolherem. INSERT/UPDATE/DELETE so admin.
DROP POLICY IF EXISTS allow_all_insert ON public.slaughterhouses;
DROP POLICY IF EXISTS allow_all_select ON public.slaughterhouses;
DROP POLICY IF EXISTS allow_all_update ON public.slaughterhouses;

DROP POLICY IF EXISTS slaughterhouses_select_public ON public.slaughterhouses;
CREATE POLICY slaughterhouses_select_public ON public.slaughterhouses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS slaughterhouses_admin_write ON public.slaughterhouses;
CREATE POLICY slaughterhouses_admin_write ON public.slaughterhouses
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- weight_records = peso por animal (animal_id, sem client_id direto).
-- Isolar via animals (igual ao padrao de animal_rfids).
DROP POLICY IF EXISTS allow_all_insert ON public.weight_records;
DROP POLICY IF EXISTS allow_all_select ON public.weight_records;
DROP POLICY IF EXISTS allow_all_update ON public.weight_records;

DROP POLICY IF EXISTS weight_records_client_isolation ON public.weight_records;
CREATE POLICY weight_records_client_isolation ON public.weight_records
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.animals
            WHERE animals.id = weight_records.animal_id
              AND (animals.client_id = get_my_client_id() OR is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.animals
            WHERE animals.id = weight_records.animal_id
              AND (animals.client_id = get_my_client_id() OR is_admin()))
  );

-- =========================================================================
-- BLOCO B: WITH CHECK em UPDATE policies (achado M4)
-- Cada ALTER POLICY usa o nome real verificado via pg_policies.
-- =========================================================================

ALTER POLICY cc_update                   ON public.crop_certifications     WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY cf_upd                      ON public.crop_fields             WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY ci_upd                      ON public.crop_inputs             WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY crop_quality_reports_update ON public.crop_quality_reports    WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY cst_upd                     ON public.crop_shipment_tracking  WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY csh_upd                     ON public.crop_shipments          WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY cs_upd                      ON public.crop_storage            WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY csm_upd                     ON public.crop_storage_movements  WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY fa_upd                      ON public.farms_agriculture       WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY la_update                   ON public.livestock_applications  WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY lc_update                   ON public.livestock_certifications WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY le_update                   ON public.livestock_events        WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY lw_update                   ON public.livestock_weights       WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY pb_update                   ON public.poultry_batches         WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY pbe_update                  ON public.poultry_batch_events    WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY quar_update                 ON public.pre_shipment_quarantine WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY sc_update                   ON public.sanitary_calendar       WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY suppliers_update            ON public.suppliers               WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY buyers_update               ON public.buyers                  WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY mktl_update                 ON public.marketplace_listings    WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY mkto_update                 ON public.marketplace_offers      WITH CHECK ((buyer_client_id = get_my_client_id()) OR is_admin());
ALTER POLICY sales_update                ON public.sales                   WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY stock_batches_update        ON public.stock_batches           WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY acs_update                  ON public.animal_cost_summary     WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
ALTER POLICY animal_goals_update         ON public.animal_goals            WITH CHECK ((client_id = get_my_client_id()) OR is_admin());
-- animal_rfids usa EXISTS animals (a propria policy ja deriva client_id via animal pai)
ALTER POLICY animal_rfids_update ON public.animal_rfids
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.animals
            WHERE animals.id = animal_rfids.animal_id
              AND ((animals.client_id = get_my_client_id()) OR is_admin()))
  );

-- =========================================================================
-- BLOCO C: clients UPDATE WITH CHECK
-- clients_access e FOR ALL com qual=(is_admin() OR auth_user_id = auth.uid())
-- mas with_check=null => UPDATE pode mover auth_user_id pra outro user.
-- Refazemos como split: SELECT/INSERT/DELETE (admin) + UPDATE com WITH CHECK.
-- =========================================================================

DROP POLICY IF EXISTS clients_access ON public.clients;

CREATE POLICY clients_select ON public.clients
  FOR SELECT USING (is_admin() OR auth_user_id = auth.uid());

CREATE POLICY clients_insert ON public.clients
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY clients_update ON public.clients
  FOR UPDATE
  USING (is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (is_admin() OR auth_user_id = auth.uid());

CREATE POLICY clients_delete ON public.clients
  FOR DELETE USING (is_admin());

-- =========================================================================
-- BLOCO D: bank_producer_relationships bpr_admin_all corrigida
-- =========================================================================

DROP POLICY IF EXISTS bpr_admin_all ON public.bank_producer_relationships;
CREATE POLICY bpr_admin_all ON public.bank_producer_relationships
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =========================================================================
-- BLOCO E: View producer_fiscal_summary com filtro tenant
-- =========================================================================

CREATE OR REPLACE VIEW public.producer_fiscal_summary AS
SELECT
  c.id AS client_id,
  count(fi.id) FILTER (WHERE (fi.issued_at >= (now() - '30 days'::interval))) AS total_invoices_30d,
  COALESCE(sum(fi.gross_value) FILTER (WHERE ((fi.direction = 'entrada'::text) AND (fi.issued_at >= (now() - '30 days'::interval)))), 0::numeric) AS total_inflow_30d,
  COALESCE(sum(fi.gross_value) FILTER (WHERE ((fi.direction = 'saida'::text)   AND (fi.issued_at >= (now() - '30 days'::interval)))), 0::numeric) AS total_outflow_30d,
  count(fi.id) FILTER (WHERE (fi.status = 'pending_review'::text)) AS pending_review_count,
  (SELECT count(*) FROM public.fiscal_alerts fa
     WHERE fa.client_id = c.id AND fa.severity = 'critical'::text AND fa.resolved = false) AS alert_critical_count,
  COALESCE(sum(fi.funrural_value) FILTER (WHERE ((fi.direction = 'saida'::text) AND (date_trunc('month'::text, fi.issued_at) = date_trunc('month'::text, now())))), 0::numeric) AS funrural_due_current_month
FROM public.clients c
LEFT JOIN public.fiscal_invoices fi ON fi.client_id = c.id
WHERE c.id = get_my_client_id() OR is_admin()
GROUP BY c.id;

-- =========================================================================
-- BLOCO F: accounting_entries — immutable apos posting
-- =========================================================================

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS posted boolean NOT NULL DEFAULT false;

ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

-- backfill: lancamentos com approved_at viram posted (compat retroativa)
UPDATE public.accounting_entries
   SET posted = true, posted_at = approved_at
 WHERE approved_at IS NOT NULL AND posted = false;

-- trigger imutabilidade
CREATE OR REPLACE FUNCTION public._trg_ae_immutable_posted()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.posted = true THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'accounting_entries linha % esta postada (posted=true) e nao pode ser alterada. Crie lancamento de estorno (source_type=reversal).', OLD.id
          USING ERRCODE = 'restrict_violation';
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.posted = true THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'accounting_entries linha % esta postada (posted=true) e nao pode ser deletada. Crie lancamento de estorno (source_type=reversal).', OLD.id
          USING ERRCODE = 'restrict_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ae_immutable_posted ON public.accounting_entries;
CREATE TRIGGER trg_ae_immutable_posted
  BEFORE UPDATE OR DELETE ON public.accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_ae_immutable_posted();

DROP POLICY IF EXISTS ae_no_delete ON public.accounting_entries;
CREATE POLICY ae_no_delete ON public.accounting_entries
  FOR DELETE USING (is_admin());

COMMENT ON COLUMN public.accounting_entries.posted IS 'Lancamento postado/efetivado. Trigger _trg_ae_immutable_posted bloqueia UPDATE/DELETE quando true (compliance SPED).';
COMMENT ON COLUMN public.accounting_entries.posted_at IS 'Timestamp do posting. NULL = ainda em rascunho.';
