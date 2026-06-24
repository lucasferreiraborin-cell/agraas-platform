-- 133_retroactive_sprint_g_fiscal
-- DOCUMENTACAO RETROATIVA do schema fiscal+contabil aplicado direto via dashboard
-- durante o Sprint G (jun/2026). Esta migration NAO MODIFICA producao —
-- objetivo: permitir `supabase db reset` reconstruir o banco do zero.
--
-- Todas as DDL sao idempotentes (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
-- EXISTS, CREATE POLICY ... apos DROP IF EXISTS).
--
-- Tabelas cobertas:
--   - chart_of_accounts
--   - accounting_entries
--   - cash_flow_projections
--   - fiscal_invoices
--   - fiscal_invoice_items
--   - fiscal_alerts
--   - partners_accountants
--   - view producer_fiscal_summary (recriada em 132 com filtro tenant)

-- =========================================================================
-- chart_of_accounts — Plano de contas BR (DRE rural)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  nature text NOT NULL CHECK (nature = ANY (ARRAY['asset','liability','equity','revenue','expense','cost'])),
  subtype text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_client_code ON public.chart_of_accounts (client_id, code);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON public.chart_of_accounts (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_select ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_write  ON public.chart_of_accounts;
CREATE POLICY coa_select ON public.chart_of_accounts FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY coa_write  ON public.chart_of_accounts FOR ALL
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

-- =========================================================================
-- accounting_entries — Razao geral (debit/credit)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  debit_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  credit_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['fiscal_invoice','sale','application','cost_record','reversal','manual','ai_auto','recurring'])),
  source_id uuid,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_confidence numeric CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Adicionados em 132 (imutabilidade SPED)
  posted boolean NOT NULL DEFAULT false,
  posted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ae_client_date  ON public.accounting_entries (client_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ae_source       ON public.accounting_entries (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ae_debit        ON public.accounting_entries (debit_account_id);
CREATE INDEX IF NOT EXISTS idx_ae_credit       ON public.accounting_entries (credit_account_id);

ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ae_select    ON public.accounting_entries;
DROP POLICY IF EXISTS ae_write     ON public.accounting_entries;
DROP POLICY IF EXISTS ae_no_delete ON public.accounting_entries;
CREATE POLICY ae_select   ON public.accounting_entries FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ae_write    ON public.accounting_entries FOR ALL
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY ae_no_delete ON public.accounting_entries FOR DELETE
  USING (is_admin());

-- Trigger imutabilidade (recria — funcao ja existe via 132)
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

-- =========================================================================
-- cash_flow_projections — Fluxo de caixa (realizado + projetado)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.cash_flow_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  projection_date date NOT NULL,
  expected_inflow numeric NOT NULL DEFAULT 0,
  expected_outflow numeric NOT NULL DEFAULT 0,
  net_position numeric,
  category text,
  confidence text NOT NULL DEFAULT 'projected' CHECK (confidence = ANY (ARRAY['confirmed','projected','estimated'])),
  linked_entry_id uuid REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfp_client_date ON public.cash_flow_projections (client_id, projection_date);
CREATE INDEX IF NOT EXISTS idx_cfp_category    ON public.cash_flow_projections (client_id, category, projection_date);
CREATE INDEX IF NOT EXISTS idx_cfp_property    ON public.cash_flow_projections (property_id) WHERE property_id IS NOT NULL;

ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfp_select ON public.cash_flow_projections;
DROP POLICY IF EXISTS cfp_write  ON public.cash_flow_projections;
CREATE POLICY cfp_select ON public.cash_flow_projections FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY cfp_write  ON public.cash_flow_projections FOR ALL
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

-- =========================================================================
-- fiscal_invoices — NF-e/NFP-e multimodal (XML/PDF/audio/CSV/SEFAZ)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  access_key text NOT NULL UNIQUE,
  number text,
  series text,
  direction text NOT NULL CHECK (direction = ANY (ARRAY['entrada','saida'])),
  model text DEFAULT '55',
  issued_at timestamptz,
  received_at timestamptz,
  issuer_cnpj text,
  issuer_name text,
  issuer_state text,
  recipient_cnpj text,
  recipient_name text,
  gross_value numeric,
  net_value numeric,
  total_taxes numeric,
  icms_value numeric,
  ipi_value numeric,
  pis_value numeric,
  cofins_value numeric,
  funrural_value numeric,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status = ANY (ARRAY['pending_review','reviewed','rejected','archived'])),
  source text NOT NULL CHECK (source = ANY (ARRAY['xml_upload','pdf_upload','audio_dictation','csv_import','sefaz_api','manual'])),
  raw_xml text,
  raw_pdf_url text,
  ai_extraction jsonb,
  ai_confidence numeric CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  needs_human_review boolean NOT NULL DEFAULT true,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_client_issued     ON public.fiscal_invoices (client_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_access_key        ON public.fiscal_invoices (access_key);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_direction_issued  ON public.fiscal_invoices (direction, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_status            ON public.fiscal_invoices (status);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_property          ON public.fiscal_invoices (property_id) WHERE property_id IS NOT NULL;

ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_invoices_select ON public.fiscal_invoices;
DROP POLICY IF EXISTS fiscal_invoices_insert ON public.fiscal_invoices;
DROP POLICY IF EXISTS fiscal_invoices_update ON public.fiscal_invoices;
DROP POLICY IF EXISTS fiscal_invoices_delete ON public.fiscal_invoices;
CREATE POLICY fiscal_invoices_select ON public.fiscal_invoices FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fiscal_invoices_insert ON public.fiscal_invoices FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fiscal_invoices_update ON public.fiscal_invoices FOR UPDATE
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fiscal_invoices_delete ON public.fiscal_invoices FOR DELETE
  USING (is_admin());

-- trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fiscal_invoices_updated_at ON public.fiscal_invoices;
CREATE TRIGGER trg_fiscal_invoices_updated_at
  BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================================
-- fiscal_invoice_items — itens NF-e com triangulacao (stock_batch/animal/application)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_invoice_id uuid NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  sequence integer,
  product_code text,
  ncm text,
  cfop text,
  cst text,
  description text,
  quantity numeric,
  unit text,
  unit_price numeric,
  total_price numeric,
  linked_stock_batch_id uuid REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  linked_animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  linked_application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finv_items_invoice      ON public.fiscal_invoice_items (fiscal_invoice_id, sequence);
CREATE INDEX IF NOT EXISTS idx_finv_items_ncm          ON public.fiscal_invoice_items (ncm) WHERE ncm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finv_items_stock_batch  ON public.fiscal_invoice_items (linked_stock_batch_id) WHERE linked_stock_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finv_items_animal       ON public.fiscal_invoice_items (linked_animal_id) WHERE linked_animal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finv_items_application  ON public.fiscal_invoice_items (linked_application_id) WHERE linked_application_id IS NOT NULL;

ALTER TABLE public.fiscal_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finv_items_select ON public.fiscal_invoice_items;
DROP POLICY IF EXISTS finv_items_write  ON public.fiscal_invoice_items;
CREATE POLICY finv_items_select ON public.fiscal_invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.fiscal_invoices fi
                  WHERE fi.id = fiscal_invoice_items.fiscal_invoice_id
                    AND (fi.client_id = get_my_client_id() OR is_admin())));
CREATE POLICY finv_items_write  ON public.fiscal_invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.fiscal_invoices fi
                  WHERE fi.id = fiscal_invoice_items.fiscal_invoice_id
                    AND (fi.client_id = get_my_client_id() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fiscal_invoices fi
                       WHERE fi.id = fiscal_invoice_items.fiscal_invoice_id
                         AND (fi.client_id = get_my_client_id() OR is_admin())));

-- =========================================================================
-- fiscal_alerts — Alertas fiscais (entradas/saidas anomalas, falta NF-e etc.)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['info','warning','critical'])),
  alert_type text NOT NULL,
  message text NOT NULL,
  suggested_action text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fa_client_unresolved ON public.fiscal_alerts (client_id, resolved, severity);
CREATE INDEX IF NOT EXISTS idx_fa_invoice           ON public.fiscal_alerts (fiscal_invoice_id) WHERE fiscal_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fa_type              ON public.fiscal_alerts (alert_type);

ALTER TABLE public.fiscal_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fa_select ON public.fiscal_alerts;
DROP POLICY IF EXISTS fa_write  ON public.fiscal_alerts;
CREATE POLICY fa_select ON public.fiscal_alerts FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());
CREATE POLICY fa_write  ON public.fiscal_alerts FOR ALL
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

-- =========================================================================
-- partners_accountants — Vinculo contador <-> produtor (modelo Omie)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.partners_accountants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contador_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  producer_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','paused','ended'])),
  access_level text NOT NULL DEFAULT 'read_only' CHECK (access_level = ANY (ARRAY['read_only','full_fiscal','full_accounting'])),
  granted_by_producer boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contador_client_id, producer_client_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_contador ON public.partners_accountants (contador_client_id, status);
CREATE INDEX IF NOT EXISTS idx_pa_producer ON public.partners_accountants (producer_client_id, status);

ALTER TABLE public.partners_accountants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pa_select ON public.partners_accountants;
DROP POLICY IF EXISTS pa_insert ON public.partners_accountants;
DROP POLICY IF EXISTS pa_update ON public.partners_accountants;
DROP POLICY IF EXISTS pa_delete ON public.partners_accountants;
CREATE POLICY pa_select ON public.partners_accountants FOR SELECT
  USING (contador_client_id = get_my_client_id() OR producer_client_id = get_my_client_id() OR is_admin());
CREATE POLICY pa_insert ON public.partners_accountants FOR INSERT
  WITH CHECK (producer_client_id = get_my_client_id() OR is_admin());
CREATE POLICY pa_update ON public.partners_accountants FOR UPDATE
  USING (producer_client_id = get_my_client_id() OR is_admin())
  WITH CHECK (producer_client_id = get_my_client_id() OR is_admin());
CREATE POLICY pa_delete ON public.partners_accountants FOR DELETE
  USING (producer_client_id = get_my_client_id() OR is_admin());

-- =========================================================================
-- view producer_fiscal_summary (recriada em 132 com filtro tenant)
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
