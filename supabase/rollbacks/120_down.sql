-- Rollback migration 120
-- Recria as 5 policies permissivas (NÃO recomendado fora de cenário de incidente)

BEGIN;

CREATE POLICY allow_all_select ON public.stock_batches FOR SELECT USING (true);
CREATE POLICY allow_read_stock_batches ON public.stock_batches FOR SELECT USING (true);
CREATE POLICY allow_all_insert ON public.stock_batches FOR INSERT WITH CHECK (true);
CREATE POLICY allow_all_update ON public.stock_batches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY allow_update_stock_batches ON public.stock_batches FOR UPDATE USING (true) WITH CHECK (true);

COMMIT;
