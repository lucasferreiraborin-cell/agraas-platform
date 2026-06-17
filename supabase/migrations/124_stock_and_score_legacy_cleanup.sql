-- Migration 124 — Consolidação de triggers legacy
-- ============================================================
-- Aplicada em produção via MCP em 17/06/2026.
--
-- Resolve 3 bugs T0 críticos descobertos no audit 17/06/2026:
--
-- BUG T0.1: 6 triggers v1 órfãos chamando funções _trg_score_* que
--           internamente invocam calculate_agraas_score() — dropada
--           pela migration 123. Próximo INSERT em applications,
--           weights ou events RAISE EXCEPTION. UI quebra.
--
-- BUG T0.2: 2 triggers debitam stock_batches simultaneamente em
--           applications — application_stock_trigger (register_application_stock)
--           E trg_application_stock_debit (_trg_application_stock_debit).
--           Cada INSERT em applications debita ESTOQUE DUAS VEZES.
--
-- BUG T0.3: _trg_application_stock_debit usa COALESCE(quantity_available, quantity)
--           sem isolamento transacional. Risco de race condition em alta concorrência.
--
-- SOLUÇÃO: drop dos órfãos + função canônica única apply_stock_debit_v3()
-- com validação rigorosa (RAISE EXCEPTION se insuficiente), insert em
-- stock_movements para auditoria, decremento de quantity E quantity_available
-- em sincronia, com FOR UPDATE para isolar.

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- ETAPA 1: Drop triggers v1 órfãos do Score Engine
-- ────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_score_on_application        ON public.applications;
DROP TRIGGER IF EXISTS trg_score_on_application_delete ON public.applications;
DROP TRIGGER IF EXISTS trg_score_on_weight             ON public.weights;
DROP TRIGGER IF EXISTS trg_score_on_weight_delete      ON public.weights;
DROP TRIGGER IF EXISTS trg_score_on_event              ON public.events;
DROP TRIGGER IF EXISTS trg_score_on_event_delete       ON public.events;

DROP FUNCTION IF EXISTS public._trg_score_from_application()         CASCADE;
DROP FUNCTION IF EXISTS public._trg_score_from_application_delete()  CASCADE;
DROP FUNCTION IF EXISTS public._trg_score_from_weight()              CASCADE;
DROP FUNCTION IF EXISTS public._trg_score_from_weight_delete()       CASCADE;
DROP FUNCTION IF EXISTS public._trg_score_from_event()               CASCADE;
DROP FUNCTION IF EXISTS public._trg_score_from_event_delete()        CASCADE;

-- ────────────────────────────────────────────────────────────────
-- ETAPA 2: Drop triggers de estoque duplicados
-- ────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS application_stock_trigger   ON public.applications;
DROP TRIGGER IF EXISTS trg_application_stock_debit ON public.applications;

DROP FUNCTION IF EXISTS public.register_application_stock()    CASCADE;
DROP FUNCTION IF EXISTS public._trg_application_stock_debit()  CASCADE;

-- ────────────────────────────────────────────────────────────────
-- ETAPA 3: Função canônica única apply_stock_debit_v3()
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_stock_debit_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity_available numeric;
  v_dose numeric;
BEGIN
  IF NEW.batch_id IS NULL OR NEW.dose IS NULL THEN
    RETURN NEW;
  END IF;

  v_dose := NEW.dose;

  SELECT COALESCE(quantity_available, quantity)
    INTO v_quantity_available
    FROM public.stock_batches
   WHERE id = NEW.batch_id
   FOR UPDATE;

  IF v_quantity_available IS NULL THEN
    RAISE EXCEPTION 'Lote de estoque % não encontrado', NEW.batch_id;
  END IF;

  IF v_quantity_available < v_dose THEN
    RAISE EXCEPTION 'Estoque insuficiente no lote % (disponível: %, solicitado: %)',
      NEW.batch_id, v_quantity_available, v_dose;
  END IF;

  UPDATE public.stock_batches
     SET quantity = quantity - v_dose,
         quantity_available = v_quantity_available - v_dose
   WHERE id = NEW.batch_id;

  INSERT INTO public.stock_movements (
    product_id, batch_id, movement_type, quantity,
    reference_table, reference_id
  ) VALUES (
    NEW.product_id, NEW.batch_id, 'aplicacao', v_dose,
    'applications', NEW.id
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_stock_debit_v3() IS
'Função canônica de débito de estoque a partir de aplicação sanitária.
 Consolida register_application_stock() e _trg_application_stock_debit()
 que coexistiam causando duplo débito. Migration 124 (17/06/2026).
 Valida disponibilidade rigorosamente (RAISE EXCEPTION) e registra
 movimento em stock_movements para auditoria.';

CREATE TRIGGER trg_apply_stock_debit_v3
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_stock_debit_v3();

-- ────────────────────────────────────────────────────────────────
-- ETAPA 4: Verificações finais (sanity checks)
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_legacy_count int;
  v_stock_triggers int;
BEGIN
  SELECT count(*) INTO v_legacy_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('_trg_score_from_application', '_trg_score_from_application_delete',
                        '_trg_score_from_weight', '_trg_score_from_weight_delete',
                        '_trg_score_from_event', '_trg_score_from_event_delete',
                        'register_application_stock', '_trg_application_stock_debit');

  IF v_legacy_count > 0 THEN
    RAISE EXCEPTION 'Migration 124 falhou: % funções legacy ainda existem', v_legacy_count;
  END IF;

  SELECT count(*) INTO v_stock_triggers
    FROM information_schema.triggers
   WHERE trigger_schema = 'public'
     AND event_object_table = 'applications'
     AND trigger_name = 'trg_apply_stock_debit_v3';

  IF v_stock_triggers <> 1 THEN
    RAISE EXCEPTION 'Migration 124 falhou: trigger canônico não foi criado';
  END IF;

  RAISE NOTICE 'Migration 124 OK · 6 triggers v1 Score órfãos removidos · 2 triggers stock duplicados consolidados em apply_stock_debit_v3';
END $$;

COMMIT;
