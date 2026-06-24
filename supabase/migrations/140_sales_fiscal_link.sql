-- =============================================================================
-- Migration 140 -- sales.fiscal_invoice_id + trigger emit NFe + linked_animal_id
-- =============================================================================
-- Objetivo: toda venda CONFIRMED emite automaticamente uma fiscal_invoice
-- de saida e amarra animal -> invoice -> item via linked_animal_id.
-- Consequencia: cadeia rastreio fechada sale -> invoice -> item -> animal.
-- =============================================================================

-- A) Adiciona FK em sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_fiscal_invoice_id ON public.sales(fiscal_invoice_id);

COMMENT ON COLUMN public.sales.fiscal_invoice_id IS
  'FK para fiscal_invoices (NF-e de saida emitida na venda). Auto-populada por _trg_sales_emit_fiscal_invoice. Migration 140.';

-- B) Funcao que cria fiscal_invoice de saida + item ligado ao animal
CREATE OR REPLACE FUNCTION public._fn_sales_emit_fiscal_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_client_id  uuid;
  v_property_id uuid;
  v_access_key text;
  v_number     text;
  v_animal_code text;
  v_total      numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF NEW.fiscal_invoice_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_client_id := NEW.client_id;
  IF v_client_id IS NULL AND NEW.animal_id IS NOT NULL THEN
    SELECT a.client_id INTO v_client_id
      FROM public.animals a WHERE a.id = NEW.animal_id;
  END IF;

  IF v_client_id IS NULL THEN
    RAISE WARNING '[migration 140] sales % sem client_id resolvivel -- fiscal_invoice nao emitida', NEW.id;
    RETURN NEW;
  END IF;

  SELECT p.id INTO v_property_id
    FROM public.properties p WHERE p.client_id = v_client_id
    ORDER BY p.created_at LIMIT 1;

  v_invoice_id := gen_random_uuid();
  v_access_key := 'SALE-' || NEW.id::text;
  v_number     := 'VENDA-' || to_char(now(), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);
  v_total      := COALESCE(NEW.total_value, 0);

  SELECT a.internal_code INTO v_animal_code
    FROM public.animals a WHERE a.id = NEW.animal_id;

  INSERT INTO public.fiscal_invoices (
    id, client_id, property_id, access_key, number, series, direction,
    model, issued_at, gross_value, status, source,
    issuer_cnpj, issuer_name, recipient_name, created_at
  ) VALUES (
    v_invoice_id, v_client_id, v_property_id, v_access_key, v_number, '1', 'saida', '55',
    COALESCE(NEW.sale_date::timestamptz, now()), v_total, 'reviewed', 'manual',
    NULL, NULL, NEW.buyer_name, now()
  );

  INSERT INTO public.fiscal_invoice_items (
    fiscal_invoice_id, sequence, description, quantity, unit,
    unit_price, total_price, linked_animal_id, cfop, ncm
  ) VALUES (
    v_invoice_id, 1,
    'Bovino vivo ' || COALESCE(v_animal_code, NEW.animal_id::text),
    COALESCE(NEW.weight_kg, 1), 'KG',
    COALESCE(NEW.price_per_kg, CASE WHEN COALESCE(NEW.weight_kg,0) > 0 THEN v_total / NEW.weight_kg ELSE NULL END),
    v_total, NEW.animal_id, '5102', '01029000'
  );

  UPDATE public.sales SET fiscal_invoice_id = v_invoice_id WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public._fn_sales_emit_fiscal_invoice() IS
  'Migration 140 -- emite fiscal_invoice de saida + item linked_animal_id quando sale e confirmada. Idempotente.';

DROP TRIGGER IF EXISTS _trg_sales_emit_fiscal_invoice ON public.sales;
CREATE TRIGGER _trg_sales_emit_fiscal_invoice
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public._fn_sales_emit_fiscal_invoice();

-- D) Backfill: emite invoice para sales confirmadas existentes
DO $$
DECLARE
  r record;
  v_invoice_id uuid;
  v_client_id uuid;
  v_property_id uuid;
  v_count int := 0;
  v_skipped int := 0;
BEGIN
  FOR r IN
    SELECT s.* FROM public.sales s
    WHERE s.status = 'confirmed'
      AND s.fiscal_invoice_id IS NULL
  LOOP
    v_client_id := r.client_id;
    IF v_client_id IS NULL AND r.animal_id IS NOT NULL THEN
      SELECT a.client_id INTO v_client_id FROM public.animals a WHERE a.id = r.animal_id;
    END IF;

    IF v_client_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT p.id INTO v_property_id
      FROM public.properties p WHERE p.client_id = v_client_id ORDER BY p.created_at LIMIT 1;

    v_invoice_id := gen_random_uuid();

    INSERT INTO public.fiscal_invoices (
      id, client_id, property_id, access_key, number, series, direction,
      model, issued_at, gross_value, status, source,
      recipient_name, created_at
    ) VALUES (
      v_invoice_id, v_client_id, v_property_id,
      'BACKFILL-' || r.id::text,
      'VENDA-BACKFILL-' || substring(r.id::text, 1, 8),
      '1', 'saida', '55',
      COALESCE(r.sale_date::timestamptz, now()),
      COALESCE(r.total_value, 0),
      'reviewed', 'legacy_migration',
      r.buyer_name, now()
    );

    INSERT INTO public.fiscal_invoice_items (
      fiscal_invoice_id, sequence, description, quantity, unit,
      unit_price, total_price, linked_animal_id, cfop, ncm
    ) VALUES (
      v_invoice_id, 1,
      'Bovino vivo (backfill venda ' || r.id::text || ')',
      COALESCE(r.weight_kg, 1), 'KG',
      COALESCE(r.price_per_kg,
        CASE WHEN COALESCE(r.weight_kg,0) > 0 THEN COALESCE(r.total_value,0) / r.weight_kg ELSE NULL END),
      COALESCE(r.total_value, 0),
      r.animal_id, '5102', '01029000'
    );

    UPDATE public.sales SET fiscal_invoice_id = v_invoice_id WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migration 140 backfill: % vendas linkadas, % puladas (sem client_id).', v_count, v_skipped;
END $$;

-- E) Estende compute_fiscal_score para reconhecer fiscal_invoice_id tambem
CREATE OR REPLACE FUNCTION public.compute_fiscal_score(p_animal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_gta        boolean;
  v_has_nfe_sale   boolean;
  v_has_acct_cost  boolean;
  v_score          numeric := 0;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.animal_certifications
     WHERE animal_id = p_animal_id
       AND lower(certification_name) = 'gta'
       AND lower(COALESCE(status,'active')) = 'active'
       AND (expires_at IS NULL OR expires_at >= current_date)
  ) INTO v_has_gta;
  IF v_has_gta THEN v_score := v_score + 50; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.sales
     WHERE animal_id = p_animal_id
       AND status = 'confirmed'
       AND (fiscal_note_id IS NOT NULL OR fiscal_invoice_id IS NOT NULL)
  ) INTO v_has_nfe_sale;
  IF v_has_nfe_sale THEN v_score := v_score + 30; END IF;

  SELECT EXISTS(
    SELECT 1
      FROM public.accounting_entries ae
      JOIN public.cost_records cr ON cr.id = ae.source_id
     WHERE ae.source_type = 'cost_record'
       AND cr.animal_id = p_animal_id
  ) INTO v_has_acct_cost;
  IF v_has_acct_cost THEN v_score := v_score + 20; END IF;

  RETURN LEAST(100, v_score);
END;
$function$;

-- Recompute scores de animais que agora tem venda com fiscal_invoice
DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT s.animal_id
      FROM public.sales s
     WHERE s.fiscal_invoice_id IS NOT NULL
       AND s.animal_id IS NOT NULL
  LOOP
    PERFORM public.calculate_agraas_score_v3(r.animal_id, 'migration_140', NULL, 'sales_fiscal_link');
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Migration 140: scores recomputados para % animais vendidos com NFe.', v_count;
END $$;
