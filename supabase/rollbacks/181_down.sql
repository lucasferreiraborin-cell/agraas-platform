-- Rollback da 181 (estoque gerencial). APAGA DADOS: categorias, almoxarifados,
-- trilha de auditoria e as colunas novas de products/stock_batches/
-- stock_movements (almoxarifado, origem da nota, destino, custo, motivo,
-- responsável). Lotes e movimentos continuam existindo, sem essas colunas.
-- Rode antes o rollback da 182 (seed demo), se ela foi aplicada.
-- Idempotente.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.titulos_financeiros') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_titulos_auditoria ON public.titulos_financeiros;
    DROP TRIGGER IF EXISTS trg_titulos_auditoria_exclusao ON public.titulos_financeiros;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_stock_movements_auditoria ON public.stock_movements;
DROP TRIGGER IF EXISTS trg_stock_movements_valida_referencias ON public.stock_movements;
DROP TRIGGER IF EXISTS trg_stock_batches_valida_referencias ON public.stock_batches;
DROP TRIGGER IF EXISTS trg_products_valida_referencias ON public.products;

DROP FUNCTION IF EXISTS public.estornar_entrada_estoque(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.registrar_entrada_avulsa(uuid, uuid, uuid, numeric, text, numeric, date);
DROP FUNCTION IF EXISTS public.registrar_saida_estoque(uuid, uuid, uuid, numeric, text, uuid, uuid, date, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.dar_entrada_nota(uuid, jsonb);
DROP FUNCTION IF EXISTS public.semear_categorias_gerenciais(uuid);
DROP FUNCTION IF EXISTS public._estoque_fornecedor(uuid, text, text, text);
DROP FUNCTION IF EXISTS public._estoque_absorver_negativo(uuid, uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public._estoque_posicao(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public._estoque_guarda_posse(uuid);
DROP FUNCTION IF EXISTS public.tg_estoque_referencias_mesmo_cliente();
DROP FUNCTION IF EXISTS public.tg_auditoria_eventos();
DROP FUNCTION IF EXISTS public._auditar(uuid, text, uuid, text, jsonb, jsonb, text);

DROP INDEX IF EXISTS public.stock_movements_abastecimento_uniq;
DROP INDEX IF EXISTS public.stock_movements_centro_idx;
DROP INDEX IF EXISTS public.stock_movements_maquina_idx;
DROP INDEX IF EXISTS public.stock_movements_almoxarifado_idx;
DROP INDEX IF EXISTS public.stock_movements_batch_idx;
DROP INDEX IF EXISTS public.stock_movements_client_data_idx;
DROP INDEX IF EXISTS public.stock_batches_fiscal_note_idx;
DROP INDEX IF EXISTS public.stock_batches_fiscal_invoice_idx;
DROP INDEX IF EXISTS public.stock_batches_almoxarifado_idx;
DROP INDEX IF EXISTS public.stock_batches_saldo_idx;
DROP INDEX IF EXISTS public.stock_batches_nota_item_uniq;
DROP INDEX IF EXISTS public.products_almoxarifado_padrao_idx;
DROP INDEX IF EXISTS public.products_categoria_gerencial_idx;

ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_motivo_check,
  DROP CONSTRAINT IF EXISTS stock_movements_custo_check,
  DROP CONSTRAINT IF EXISTS stock_movements_destino_tipo_check,
  DROP COLUMN IF EXISTS criado_por,
  DROP COLUMN IF EXISTS data_movimento,
  DROP COLUMN IF EXISTS motivo,
  DROP COLUMN IF EXISTS custo_total,
  DROP COLUMN IF EXISTS custo_unitario,
  DROP COLUMN IF EXISTS centro_custo_id,
  DROP COLUMN IF EXISTS maquina_id,
  DROP COLUMN IF EXISTS destino_tipo,
  DROP COLUMN IF EXISTS almoxarifado_id;

ALTER TABLE public.stock_batches
  DROP COLUMN IF EXISTS criado_por,
  DROP COLUMN IF EXISTS nota_item_id,
  DROP COLUMN IF EXISTS fiscal_note_id,
  DROP COLUMN IF EXISTS fiscal_invoice_id,
  DROP COLUMN IF EXISTS almoxarifado_id;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_gtin_check,
  DROP CONSTRAINT IF EXISTS products_estoque_min_max_check,
  DROP COLUMN IF EXISTS gtin,
  DROP COLUMN IF EXISTS estoque_maximo,
  DROP COLUMN IF EXISTS estoque_minimo,
  DROP COLUMN IF EXISTS almoxarifado_padrao_id,
  DROP COLUMN IF EXISTS categoria_gerencial_id;

DROP TABLE IF EXISTS public.auditoria_eventos;
DROP TABLE IF EXISTS public.almoxarifados;
DROP TABLE IF EXISTS public.categorias_gerenciais;

DROP FUNCTION IF EXISTS public._estoque_chave(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public._data_ou_nula(text);
DROP FUNCTION IF EXISTS public._numero_ou_nulo(text);
DROP FUNCTION IF EXISTS public._uuid_ou_nulo(text);
DROP FUNCTION IF EXISTS public.categoria_nome_generico(text);

COMMIT;
