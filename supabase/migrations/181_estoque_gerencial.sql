-- ============================================================================
-- 181 · Estoque gerencial (Onda 1): categorias, almoxarifados, entrada por
--       nota, saídas com custo médio e trilha de auditoria
-- ============================================================================
-- Agraas Gestão, 25/11/2026. Especificação: docs/produto/mini-erp-gerencial-
-- especificacao.md ("Transversal" e "Onda 1 — Estoque"). Tudo começa na nota:
-- o item entra num almoxarifado (ou vai direto para uma máquina/centro), a
-- saída leva o custo médio, e cada entrada, saída, baixa e estorno deixa rastro.
--
-- ADITIVA. Tabelas novas: categorias_gerenciais, almoxarifados,
-- auditoria_eventos. Colunas novas (todas nullable) em products, stock_batches
-- e stock_movements — quem já lê essas tabelas (controladoria, /estoque,
-- aplicações sanitárias) continua igual.
--
-- Funções (SECURITY DEFINER, search_path fixo, guarda de posse):
--   semear_categorias_gerenciais(cliente)          taxonomia sugerida (idempotente)
--   dar_entrada_nota(cliente, itens jsonb)         conferência da nota → estoque
--   registrar_saida_estoque(...)                   saída com custo médio
--   registrar_entrada_avulsa(...)                  sobra de inventário / saldo inicial
--   estornar_entrada_estoque(cliente, lote, motivo) desfaz entrada que ainda não saiu
-- Guarda de posse: só o PRÓPRIO cliente (JWT) ou chamada interna (sem JWT:
-- service_role, migration). Diferente da 167, o admin NÃO passa: o portal só
-- grava no próprio cliente, e a conta demo é admin — com a isenção, um
-- client_id trocado gravaria na conta de outro.
--
-- Custo médio (PREMISSA de desenho; sensibilidade: valor do estoque e custo
-- das saídas): custo da saída = Σ(saldo × custo) ÷ Σ saldo dos lotes do produto
-- no almoxarifado. A baixa é PROPORCIONAL em todos os lotes com saldo, para o
-- custo médio do que fica não mudar — com baixa FIFO e custo médio, a soma das
-- saídas não fecharia com o valor comprado. Custo disso: a ordem física de
-- consumo por validade não fica nos lotes. Insumo sanitário com validade
-- crítica continua com lote escolhido na aplicação (apply_stock_debit_v3).
--
-- Saldo negativo: bloqueado. Só passa com p_permitir_negativo + motivo (ex.:
-- abastecimento registrado antes de a nota de diesel entrar). O excedente vira
-- um lote negativo no almoxarifado, que a próxima entrada do produto absorve.
-- Assim Σ saldo dos lotes = entradas − saídas, sempre.
--
-- Convivência com o que já existe (nada duplicado):
--   _stock_movements_set_client_id (BEFORE INSERT): só preenche client_id
--     NULL; as funções daqui gravam client_id explícito, então é no-op.
--   apply_stock_debit_v3 (AFTER INSERT em applications): débito no lote
--     escolhido na aplicação sanitária; não usa almoxarifado nem custo médio.
--     ACHADO (anterior a esta migration, fora do escopo): ele grava
--     movement_type 'aplicacao', que o CHECK de stock_movements não aceita
--     ('entry','application','adjustment','loss') — aplicação COM lote falha
--     hoje. Corrigir em migration própria.
--   Aprovação de NF-e na controladoria (api/controladoria/notas/[id]/review):
--     cria lote sem almoxarifado e marca fiscal_invoice_items.
--     linked_stock_batch_id. dar_entrada_nota marca o mesmo campo e pula item
--     já ligado: a mesma nota não entra duas vezes pelos dois caminhos.
--   Títulos a pagar continuam nascendo na importação (lib/gestao/titulos.ts);
--     a entrada no estoque não gera título de novo.
--
-- RLS: client_id + (is_admin() OR client_id = get_my_client_id()), funções em
-- subselect. WITH CHECK amarra referências ao mesmo cliente nas tabelas novas;
-- nas existentes a amarração é o trigger tg_estoque_referencias_mesmo_cliente,
-- para não reescrever policies que a plataforma inteira usa (FK não passa por
-- RLS). auditoria_eventos: só leitura do próprio cliente; escrita só por
-- trigger/função. A conta demo é admin: as telas filtram client_id sempre.
--
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10).
-- Depende da 172 (maquinas, centros_custo, titulos_financeiros, abastecimentos).
-- Rollback: supabase/rollbacks/181_down.sql
-- ============================================================================

BEGIN;

-- ── 1. Helpers puros ─────────────────────────────────────────────────────────

-- "Outros" e variações não são categoria (especificação, Transversal). Os
-- mesmos padrões vivem em lib/gestao/estoque.ts (PADROES_CATEGORIA_GENERICA);
-- __tests__/gestao-estoque.test.ts confere que os dois lados são iguais.
CREATE OR REPLACE FUNCTION public.categoria_nome_generico(p_nome text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT s.n ~ '^(outr[oa]s?|divers[oa]s?|demais)( |$)'
      OR s.n ~ '^(geral|gerais|variad[oa]s|vari[oa]s|miscelanea|sem categoria|a classificar|nao classificad[oa]s?|indefinid[oa]s?)$'
      OR s.n ~ '^(gastos?|despesas?|custos?|receitas?|itens?|materia(l|is)|produtos?|compras?|servicos?) (divers[oa]s?|gera(l|is)|outr[oa]s?|variad[oa]s|vari[oa]s)$'
  FROM (SELECT btrim(regexp_replace(
                 translate(lower(coalesce(p_nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                 '[^a-z0-9]+', ' ', 'g')) AS n) s
$fn$;

CREATE OR REPLACE FUNCTION public._uuid_ou_nulo(p text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT CASE WHEN p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p::uuid END
$fn$;

CREATE OR REPLACE FUNCTION public._numero_ou_nulo(p text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT CASE WHEN p ~ '^-?[0-9]{1,12}(\.[0-9]{1,8})?$' THEN p::numeric END
$fn$;

CREATE OR REPLACE FUNCTION public._data_ou_nula(p text)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT CASE WHEN p ~ '^(19|20)[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' THEN p::date END
$fn$;

-- Chave do lock por produto + almoxarifado (saídas e entradas concorrentes
-- do mesmo saldo esperam uma pela outra).
CREATE OR REPLACE FUNCTION public._estoque_chave(p_cliente uuid, p_produto uuid, p_almox uuid)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT hashtextextended('estoque:' || p_cliente::text || ':' || p_produto::text || ':' || coalesce(p_almox::text, '-'), 0)
$fn$;

-- ── 2. Tabelas novas ─────────────────────────────────────────────────────────

-- Categoria gerencial: nome que o produtor reconhece, editável, com ponte
-- opcional para a conta do plano de contas (contador/IR).
CREATE TABLE IF NOT EXISTS public.categorias_gerenciais (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  grupo             text NOT NULL CHECK (char_length(btrim(grupo)) BETWEEN 2 AND 60),
  nome              text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 60),
  tipo              text NOT NULL CHECK (tipo IN ('despesa','receita','investimento','financeiro')),
  conta_contabil_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  ativo             boolean NOT NULL DEFAULT true,
  ordem             integer NOT NULL DEFAULT 0,
  criado_por        uuid DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_gerenciais_sem_generico
    CHECK (NOT public.categoria_nome_generico(nome) AND NOT public.categoria_nome_generico(grupo))
);
-- Único por cliente sem diferenciar caixa e espaço ("Diesel" = "diesel ").
CREATE UNIQUE INDEX IF NOT EXISTS categorias_gerenciais_nome_uniq
  ON public.categorias_gerenciais (client_id, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS categorias_gerenciais_conta_idx
  ON public.categorias_gerenciais (conta_contabil_id) WHERE conta_contabil_id IS NOT NULL;

-- Almoxarifado: vários por cliente; tanque de combustível tem capacidade.
CREATE TABLE IF NOT EXISTS public.almoxarifados (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome              text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 60),
  tipo              text NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral','combustivel','pecas','insumos')),
  capacidade_litros numeric(12,2) CHECK (capacidade_litros IS NULL OR (capacidade_litros > 0 AND capacidade_litros <= 10000000)),
  ativo             boolean NOT NULL DEFAULT true,
  criado_por        uuid DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT almoxarifados_capacidade_so_tanque CHECK (capacidade_litros IS NULL OR tipo = 'combustivel')
);
CREATE UNIQUE INDEX IF NOT EXISTS almoxarifados_nome_uniq
  ON public.almoxarifados (client_id, lower(btrim(nome)));

-- Trilha de auditoria: quem, quando, o quê, antes/depois. Escrita só por
-- trigger e pelas funções desta migration (sem policy de escrita).
CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tabela      text NOT NULL CHECK (char_length(tabela) BETWEEN 1 AND 63),
  registro_id uuid NOT NULL,
  acao        text NOT NULL CHECK (acao IN ('criacao','alteracao','exclusao','baixa','estorno','cancelamento','entrada','saida','ajuste')),
  antes       jsonb,
  depois      jsonb,
  detalhe     text CHECK (detalhe IS NULL OR char_length(detalhe) <= 300),
  usuario     uuid DEFAULT auth.uid(),
  criado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_eventos_client_idx
  ON public.auditoria_eventos (client_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS auditoria_eventos_registro_idx
  ON public.auditoria_eventos (tabela, registro_id);

-- ── 3. Colunas novas em tabelas existentes (nullable, sem reescrever nada) ───

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS categoria_gerencial_id uuid REFERENCES public.categorias_gerenciais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS almoxarifado_padrao_id uuid REFERENCES public.almoxarifados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estoque_minimo         numeric(14,3),
  ADD COLUMN IF NOT EXISTS estoque_maximo         numeric(14,3),
  ADD COLUMN IF NOT EXISTS gtin                   text;

-- nota_item_id: id do item em fiscal_invoice_items OU fiscal_note_items (por
-- isso sem FK). Único: o mesmo item da nota não entra duas vezes.
ALTER TABLE public.stock_batches
  ADD COLUMN IF NOT EXISTS almoxarifado_id   uuid REFERENCES public.almoxarifados(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_note_id    uuid REFERENCES public.fiscal_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nota_item_id      uuid,
  ADD COLUMN IF NOT EXISTS criado_por        uuid DEFAULT auth.uid();

-- quantity continua sempre positiva; o sentido vem de movement_type e
-- destino_tipo ('entrada' soma; os demais subtraem).
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS almoxarifado_id uuid REFERENCES public.almoxarifados(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS destino_tipo    text,
  ADD COLUMN IF NOT EXISTS maquina_id      uuid REFERENCES public.maquinas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custo_unitario  numeric(14,6),
  ADD COLUMN IF NOT EXISTS custo_total     numeric(14,2),
  ADD COLUMN IF NOT EXISTS motivo          text,
  ADD COLUMN IF NOT EXISTS data_movimento  date,
  ADD COLUMN IF NOT EXISTS criado_por      uuid DEFAULT auth.uid();
-- Sem default no ADD: linhas antigas ficam NULL (as telas caem em created_at).
-- Daqui em diante, quem não informar grava a data de hoje em Brasília.
ALTER TABLE public.stock_movements
  ALTER COLUMN data_movimento SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);

-- CHECKs nas colunas novas (ADD CONSTRAINT não tem IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.products'::regclass AND conname = 'products_estoque_min_max_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_estoque_min_max_check CHECK (
          (estoque_minimo IS NULL OR estoque_minimo >= 0)
      AND (estoque_maximo IS NULL OR estoque_maximo > 0)
      AND (estoque_minimo IS NULL OR estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.products'::regclass AND conname = 'products_gtin_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_gtin_check CHECK (gtin IS NULL OR gtin ~ '^[0-9]{14}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.stock_movements'::regclass AND conname = 'stock_movements_destino_tipo_check') THEN
    ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_destino_tipo_check CHECK (
      destino_tipo IS NULL OR destino_tipo IN ('entrada','abastecimento','manutencao','aplicacao','consumo','ajuste'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.stock_movements'::regclass AND conname = 'stock_movements_custo_check') THEN
    ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_custo_check CHECK (
      (custo_unitario IS NULL OR custo_unitario >= 0) AND (custo_total IS NULL OR custo_total >= 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.stock_movements'::regclass AND conname = 'stock_movements_motivo_check') THEN
    ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_motivo_check CHECK (
      motivo IS NULL OR char_length(motivo) <= 300);
  END IF;
END $$;

-- Índices: FKs (ON DELETE sem seq scan), saldo por produto/almoxarifado,
-- histórico por data e idempotência.
CREATE INDEX IF NOT EXISTS products_categoria_gerencial_idx
  ON public.products (categoria_gerencial_id) WHERE categoria_gerencial_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_almoxarifado_padrao_idx
  ON public.products (almoxarifado_padrao_id) WHERE almoxarifado_padrao_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_batches_nota_item_uniq
  ON public.stock_batches (nota_item_id) WHERE nota_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_batches_saldo_idx
  ON public.stock_batches (client_id, product_id, almoxarifado_id);
CREATE INDEX IF NOT EXISTS stock_batches_almoxarifado_idx
  ON public.stock_batches (almoxarifado_id) WHERE almoxarifado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_batches_fiscal_invoice_idx
  ON public.stock_batches (fiscal_invoice_id) WHERE fiscal_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_batches_fiscal_note_idx
  ON public.stock_batches (fiscal_note_id) WHERE fiscal_note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_client_data_idx
  ON public.stock_movements (client_id, data_movimento DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_batch_idx
  ON public.stock_movements (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_almoxarifado_idx
  ON public.stock_movements (almoxarifado_id) WHERE almoxarifado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_maquina_idx
  ON public.stock_movements (maquina_id) WHERE maquina_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_centro_idx
  ON public.stock_movements (centro_custo_id) WHERE centro_custo_id IS NOT NULL;
-- Um abastecimento gera no máximo UMA saída de diesel (reprocessar não duplica).
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_abastecimento_uniq
  ON public.stock_movements (reference_id) WHERE reference_table = 'abastecimentos';

-- ── 4. Auditoria ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._auditar(
  p_cliente uuid, p_tabela text, p_registro uuid, p_acao text,
  p_antes jsonb, p_depois jsonb, p_detalhe text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  INSERT INTO public.auditoria_eventos (client_id, tabela, registro_id, acao, antes, depois, detalhe)
  SELECT p_cliente, p_tabela, p_registro, p_acao, p_antes, p_depois, left(nullif(btrim(p_detalhe), ''), 300)
   WHERE p_cliente IS NOT NULL AND p_registro IS NOT NULL;
$fn$;

-- Trigger genérico. A ação é derivada da linha; o detalhe legível vem do
-- contexto da transação (agraas.auditoria_detalhe), que as funções desta
-- migration preenchem antes de gravar. Linha sem client_id não é auditada
-- (não há a quem mostrar) — e nunca derruba a operação principal por isso.
CREATE OR REPLACE FUNCTION public.tg_auditoria_eventos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_antes  jsonb;
  v_depois jsonb;
  v_linha  jsonb;
  v_acao   text;
  v_tipo   text;
  v_dest   text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_antes := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_depois := to_jsonb(NEW); END IF;
  v_linha := coalesce(v_depois, v_antes);

  IF TG_TABLE_NAME = 'titulos_financeiros' THEN
    IF TG_OP = 'DELETE' THEN
      v_acao := 'exclusao';
    ELSIF v_depois->>'status' = 'pago' AND (v_antes->>'status') IS DISTINCT FROM 'pago' THEN
      v_acao := 'baixa';
    ELSIF v_antes->>'status' = 'pago' AND v_depois->>'status' = 'aberto' THEN
      v_acao := 'estorno';
    ELSIF v_depois->>'status' = 'cancelado' AND (v_antes->>'status') IS DISTINCT FROM 'cancelado' THEN
      v_acao := 'cancelamento';
    ELSE
      v_acao := 'alteracao';
    END IF;
  ELSIF TG_TABLE_NAME = 'stock_movements' THEN
    IF TG_OP = 'DELETE' THEN
      v_acao := 'estorno';
    ELSIF TG_OP = 'UPDATE' THEN
      v_acao := 'alteracao';
    ELSE
      v_tipo := v_linha->>'movement_type';
      v_dest := v_linha->>'destino_tipo';
      v_acao := CASE
        WHEN v_tipo IN ('adjustment','loss') OR v_dest = 'ajuste' THEN 'ajuste'
        WHEN v_dest = 'entrada' OR (v_dest IS NULL AND v_tipo = 'entry') THEN 'entrada'
        ELSE 'saida'
      END;
    END IF;
  ELSE
    v_acao := CASE TG_OP WHEN 'INSERT' THEN 'criacao' WHEN 'UPDATE' THEN 'alteracao' ELSE 'exclusao' END;
  END IF;

  PERFORM public._auditar(
    public._uuid_ou_nulo(v_linha->>'client_id'), TG_TABLE_NAME, public._uuid_ou_nulo(v_linha->>'id'),
    v_acao, v_antes, v_depois, current_setting('agraas.auditoria_detalhe', true));
  RETURN NULL;
END
$fn$;

DROP TRIGGER IF EXISTS trg_stock_movements_auditoria ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_eventos();

-- Títulos: baixa, estorno, cancelamento e mudança de valor/vencimento; e exclusão.
DROP TRIGGER IF EXISTS trg_titulos_auditoria ON public.titulos_financeiros;
CREATE TRIGGER trg_titulos_auditoria
  AFTER UPDATE ON public.titulos_financeiros
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status
     OR OLD.data_baixa IS DISTINCT FROM NEW.data_baixa
     OR OLD.valor_baixa IS DISTINCT FROM NEW.valor_baixa
     OR OLD.valor IS DISTINCT FROM NEW.valor
     OR OLD.vencimento IS DISTINCT FROM NEW.vencimento)
  EXECUTE FUNCTION public.tg_auditoria_eventos();
DROP TRIGGER IF EXISTS trg_titulos_auditoria_exclusao ON public.titulos_financeiros;
CREATE TRIGGER trg_titulos_auditoria_exclusao
  AFTER DELETE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_eventos();

-- ── 5. Referências do mesmo cliente nas tabelas existentes ──────────────────
-- SECURITY INVOKER de propósito: para o usuário comum, a RLS já esconde a
-- linha de outro cliente (e a busca falha); para admin e service_role a
-- comparação de client_id decide. Lista fechada de tabelas/colunas (o
-- format(%I) só recebe valores daqui).
CREATE OR REPLACE FUNCTION public.tg_estoque_referencias_mesmo_cliente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_novo   jsonb := to_jsonb(NEW);
  v_velho  jsonb := '{}'::jsonb;
  v_ok     boolean;
  r        record;
BEGIN
  IF TG_OP = 'UPDATE' THEN v_velho := to_jsonb(OLD); END IF;
  FOR r IN
    SELECT t.coluna, t.alvo FROM (VALUES
      ('products',        'categoria_gerencial_id', 'categorias_gerenciais'),
      ('products',        'almoxarifado_padrao_id', 'almoxarifados'),
      ('stock_batches',   'almoxarifado_id',        'almoxarifados'),
      ('stock_batches',   'fiscal_invoice_id',      'fiscal_invoices'),
      ('stock_batches',   'fiscal_note_id',         'fiscal_notes'),
      ('stock_movements', 'almoxarifado_id',        'almoxarifados'),
      ('stock_movements', 'maquina_id',             'maquinas'),
      ('stock_movements', 'centro_custo_id',        'centros_custo')
    ) AS t(tabela, coluna, alvo)
    WHERE t.tabela = TG_TABLE_NAME
  LOOP
    CONTINUE WHEN v_novo->>r.coluna IS NULL;
    CONTINUE WHEN TG_OP = 'UPDATE'
              AND (v_novo->>r.coluna) IS NOT DISTINCT FROM (v_velho->>r.coluna)
              AND (v_novo->>'client_id') IS NOT DISTINCT FROM (v_velho->>'client_id');
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND client_id = $2)', r.alvo)
       INTO v_ok
      USING (v_novo->>r.coluna)::uuid, public._uuid_ou_nulo(v_novo->>'client_id');
    IF NOT coalesce(v_ok, false) THEN
      RAISE EXCEPTION '%.% aponta para % de outro cliente ou inexistente', TG_TABLE_NAME, r.coluna, r.alvo
        USING ERRCODE = '23503';
    END IF;
  END LOOP;
  RETURN NEW;
END
$fn$;

-- Nomes com "valida" para disparar DEPOIS de trg_stock_movements_set_client_id
-- (mesmo evento dispara em ordem alfabética).
DROP TRIGGER IF EXISTS trg_products_valida_referencias ON public.products;
CREATE TRIGGER trg_products_valida_referencias
  BEFORE INSERT OR UPDATE OF client_id, categoria_gerencial_id, almoxarifado_padrao_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_estoque_referencias_mesmo_cliente();
DROP TRIGGER IF EXISTS trg_stock_batches_valida_referencias ON public.stock_batches;
CREATE TRIGGER trg_stock_batches_valida_referencias
  BEFORE INSERT OR UPDATE OF client_id, almoxarifado_id, fiscal_invoice_id, fiscal_note_id ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_estoque_referencias_mesmo_cliente();
DROP TRIGGER IF EXISTS trg_stock_movements_valida_referencias ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_valida_referencias
  BEFORE INSERT OR UPDATE OF client_id, almoxarifado_id, maquina_id, centro_custo_id ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.tg_estoque_referencias_mesmo_cliente();

-- updated_at
DROP TRIGGER IF EXISTS trg_categorias_gerenciais_updated_at ON public.categorias_gerenciais;
CREATE TRIGGER trg_categorias_gerenciais_updated_at BEFORE UPDATE ON public.categorias_gerenciais
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_almoxarifados_updated_at ON public.almoxarifados;
CREATE TRIGGER trg_almoxarifados_updated_at BEFORE UPDATE ON public.almoxarifados
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ── 6. Funções internas do estoque ───────────────────────────────────────────

-- Guarda de posse (ver cabeçalho): próprio cliente ou chamada sem JWT.
CREATE OR REPLACE FUNCTION public._estoque_guarda_posse(p_cliente uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF p_cliente IS NULL THEN
    RAISE EXCEPTION 'cliente obrigatório' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND p_cliente IS DISTINCT FROM public.get_my_client_id() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access' USING ERRCODE = '42501';
  END IF;
END
$fn$;

-- Posição do produto no almoxarifado (NULL = lotes sem almoxarifado, como os
-- da aprovação da controladoria). Custo médio sobre os lotes com saldo e
-- custo; sem nenhum, o último custo conhecido (estimativa para saída sem saldo).
CREATE OR REPLACE FUNCTION public._estoque_posicao(
  p_cliente uuid, p_produto uuid, p_almox uuid,
  OUT saldo numeric, OUT saldo_positivo numeric, OUT custo_medio numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_valor numeric;
  v_qtd   numeric;
BEGIN
  SELECT coalesce(sum(b.quantity_available), 0),
         coalesce(sum(b.quantity_available) FILTER (WHERE b.quantity_available > 0), 0),
         sum(b.quantity_available * b.unit_cost) FILTER (WHERE b.quantity_available > 0 AND b.unit_cost IS NOT NULL),
         sum(b.quantity_available) FILTER (WHERE b.quantity_available > 0 AND b.unit_cost IS NOT NULL)
    INTO saldo, saldo_positivo, v_valor, v_qtd
    FROM public.stock_batches b
   WHERE b.client_id = p_cliente
     AND b.product_id = p_produto
     AND b.almoxarifado_id IS NOT DISTINCT FROM p_almox;
  IF coalesce(v_qtd, 0) > 0 THEN
    custo_medio := v_valor / v_qtd;
  ELSE
    SELECT b.unit_cost INTO custo_medio
      FROM public.stock_batches b
     WHERE b.client_id = p_cliente AND b.product_id = p_produto
       AND b.almoxarifado_id IS NOT DISTINCT FROM p_almox AND b.unit_cost IS NOT NULL
     ORDER BY b.entry_date DESC NULLS LAST, b.created_at DESC NULLS LAST
     LIMIT 1;
  END IF;
END
$fn$;

-- Entrada compensa saldo negativo antes de virar saldo novo. Devolve quanto
-- da quantidade entrante sobra para o lote novo.
CREATE OR REPLACE FUNCTION public._estoque_absorver_negativo(
  p_cliente uuid, p_produto uuid, p_almox uuid, p_qtd numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_resta numeric := p_qtd;
  v_abs   numeric;
  r       record;
BEGIN
  FOR r IN
    SELECT b.id, b.quantity_available
      FROM public.stock_batches b
     WHERE b.client_id = p_cliente AND b.product_id = p_produto
       AND b.almoxarifado_id IS NOT DISTINCT FROM p_almox
       AND b.quantity_available < 0
     ORDER BY b.entry_date, b.created_at
       FOR UPDATE
  LOOP
    EXIT WHEN v_resta <= 0;
    v_abs := least(v_resta, -r.quantity_available);
    UPDATE public.stock_batches
       SET quantity_available = quantity_available + v_abs,
           quantity = coalesce(quantity, 0) + v_abs
     WHERE id = r.id;
    v_resta := v_resta - v_abs;
  END LOOP;
  RETURN v_resta;
END
$fn$;

-- Fornecedor pelo emitente da nota: acha por CPF/CNPJ (com ou sem máscara) ou,
-- sem documento, pelo nome; senão cria e registra na auditoria (automação
-- revisável, especificação Transversal).
CREATE OR REPLACE FUNCTION public._estoque_fornecedor(
  p_cliente uuid, p_doc text, p_nome text, p_numero_nota text,
  OUT fornecedor_id uuid, OUT criado boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_doc  text := upper(regexp_replace(coalesce(p_doc, ''), '[^0-9A-Za-z]', '', 'g'));
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
  v_fmt  text;
BEGIN
  criado := false;
  IF v_doc !~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$' THEN v_doc := NULL; END IF;
  IF v_doc IS NULL AND v_nome IS NULL THEN RETURN; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('fornecedor:' || p_cliente::text || ':' || coalesce(v_doc, lower(v_nome)), 0));
  IF v_doc IS NOT NULL THEN
    SELECT s.id INTO fornecedor_id
      FROM public.suppliers s
     WHERE s.client_id = p_cliente
       AND upper(regexp_replace(coalesce(s.cnpj, ''), '[^0-9A-Za-z]', '', 'g')) = v_doc
     ORDER BY s.active DESC, s.created_at
     LIMIT 1;
  ELSE
    SELECT s.id INTO fornecedor_id
      FROM public.suppliers s
     WHERE s.client_id = p_cliente AND lower(btrim(s.name)) = lower(v_nome)
     ORDER BY s.active DESC, s.created_at
     LIMIT 1;
  END IF;
  IF fornecedor_id IS NOT NULL THEN RETURN; END IF;

  v_fmt := CASE
    WHEN length(v_doc) = 14 THEN substr(v_doc, 1, 2) || '.' || substr(v_doc, 3, 3) || '.' || substr(v_doc, 6, 3)
                                 || '/' || substr(v_doc, 9, 4) || '-' || substr(v_doc, 13, 2)
    WHEN length(v_doc) = 11 THEN substr(v_doc, 1, 3) || '.' || substr(v_doc, 4, 3) || '.' || substr(v_doc, 7, 3)
                                 || '-' || substr(v_doc, 10, 2)
  END;
  INSERT INTO public.suppliers (client_id, name, cnpj, active, notes)
  VALUES (p_cliente, left(coalesce(v_nome, 'Fornecedor ' || v_fmt), 200), v_fmt, true,
          'Criado automaticamente pelo emitente da NF-e ' || coalesce(p_numero_nota, 's/n') || ' (Agraas Gestão).')
  RETURNING id INTO fornecedor_id;
  criado := true;
  PERFORM public._auditar(p_cliente, 'suppliers', fornecedor_id, 'criacao', NULL,
    (SELECT to_jsonb(s) FROM public.suppliers s WHERE s.id = fornecedor_id),
    'Fornecedor criado automaticamente pelo emitente da NF-e ' || coalesce(p_numero_nota, 's/n'));
END
$fn$;

-- ── 7. Taxonomia sugerida ────────────────────────────────────────────────────
-- Mesma lista de lib/gestao/estoque.ts (TAXONOMIA_SUGERIDA), conferida pelo
-- teste. Conta contábil: só onde o nome do plano rural (145) casa sem dúvida
-- — PREMISSA de vínculo, editável, o contador confirma. Fase de criação
-- (cria/recria/engorda) ou conta dupla (terras × benfeitorias) fica em branco.
CREATE OR REPLACE FUNCTION public.semear_categorias_gerenciais(p_client uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_n integer;
BEGIN
  PERFORM public._estoque_guarda_posse(p_client);
  INSERT INTO public.categorias_gerenciais (client_id, grupo, nome, tipo, ordem, conta_contabil_id)
  SELECT p_client, t.grupo, t.nome, t.tipo, t.ordem,
         (SELECT c.id FROM public.chart_of_accounts c
           WHERE c.client_id = p_client AND c.code = t.conta AND c.is_active
           LIMIT 1)
    FROM (VALUES
      -- TAXONOMIA:INICIO
      ('Insumos agrícolas', 'Adubos e fertilizantes', 'despesa', 110, NULL::text),
      ('Insumos agrícolas', 'Corretivos de solo', 'despesa', 120, NULL),
      ('Insumos agrícolas', 'Defensivos', 'despesa', 130, NULL),
      ('Insumos agrícolas', 'Sementes e mudas', 'despesa', 140, NULL),
      ('Insumos pecuários', 'Sal mineral e suplementos', 'despesa', 210, NULL),
      ('Insumos pecuários', 'Rações e concentrados', 'despesa', 220, NULL),
      ('Insumos pecuários', 'Vacinas e medicamentos', 'despesa', 230, '5.2.01'),
      ('Insumos pecuários', 'Reprodução (sêmen, IATF)', 'despesa', 240, '5.2.04'),
      ('Insumos pecuários', 'Compra de animais', 'despesa', 250, '5.6'),
      ('Combustíveis e lubrificantes', 'Diesel', 'despesa', 310, '5.5.02'),
      ('Combustíveis e lubrificantes', 'Gasolina e etanol', 'despesa', 320, '5.5.02'),
      ('Combustíveis e lubrificantes', 'Óleos e graxas', 'despesa', 330, '5.5.02'),
      ('Combustíveis e lubrificantes', 'ARLA 32', 'despesa', 340, '5.5.02'),
      ('Máquinas e frota', 'Peças', 'despesa', 410, NULL),
      ('Máquinas e frota', 'Pneus e câmaras', 'despesa', 420, NULL),
      ('Máquinas e frota', 'Serviços de manutenção', 'despesa', 430, NULL),
      ('Máquinas e frota', 'Filtros', 'despesa', 440, NULL),
      ('Mão de obra', 'Salários e encargos', 'despesa', 510, NULL),
      ('Mão de obra', 'Diaristas e empreitas', 'despesa', 520, NULL),
      ('Mão de obra', 'Prestadores de serviço', 'despesa', 530, NULL),
      ('Estrutura', 'Cercas e currais', 'despesa', 610, '5.5.03'),
      ('Estrutura', 'Construções e reformas', 'despesa', 620, NULL),
      ('Estrutura', 'Energia elétrica', 'despesa', 630, '5.5.01'),
      ('Estrutura', 'Água e irrigação', 'despesa', 640, NULL),
      ('Administrativo', 'Contabilidade e jurídico', 'despesa', 710, '6.1.02'),
      ('Administrativo', 'Telefone e internet', 'despesa', 720, '6.1.04'),
      ('Administrativo', 'Software', 'despesa', 730, '6.4.02'),
      ('Administrativo', 'Material de escritório', 'despesa', 740, '6.1.03'),
      ('Administrativo', 'Impostos e taxas', 'despesa', 750, NULL),
      ('Administrativo', 'Seguros', 'despesa', 760, '6.1.05'),
      ('Financeiro', 'Juros', 'financeiro', 810, '6.3.01'),
      ('Financeiro', 'Tarifas bancárias', 'financeiro', 820, '6.3.02'),
      ('Investimentos', 'Máquinas e equipamentos', 'investimento', 910, '1.2.02.03'),
      ('Investimentos', 'Terras e benfeitorias', 'investimento', 920, NULL),
      ('Receitas', 'Venda de gado', 'receita', 1010, NULL),
      ('Receitas', 'Venda de grãos', 'receita', 1020, NULL),
      ('Receitas', 'Venda de leite', 'receita', 1030, NULL),
      ('Receitas', 'Arrendamentos recebidos', 'receita', 1040, NULL),
      ('Receitas', 'Serviços prestados', 'receita', 1050, NULL)
      -- TAXONOMIA:FIM
    ) AS t(grupo, nome, tipo, ordem, conta)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$fn$;

-- ── 8. Entrada por nota ──────────────────────────────────────────────────────
-- p_itens: [{ origem: 'canonica'|'legado', item_id,
--             produto_id | novo_produto: {nome, unidade, ncm?, categoria?,
--                                         categoria_gerencial_id, almoxarifado_padrao_id?},
--             categoria_gerencial_id? (para produto que ainda não tem),
--             destino: 'estoque' (almoxarifado_id; padrão do produto se vazio)
--                    | 'direto' (maquina_id e/ou centro_custo_id; destino_tipo?),
--             quantidade? (na unidade do produto, já convertida pela tela),
--             custo_unitario? (só se a nota não trouxer valor), data? }]
-- Custo unitário = total do item na nota ÷ quantidade que entra: a conversão
-- de unidade (galão → litro) muda a quantidade, nunca o valor da nota.
-- Tudo ou nada (uma transação). Item que já entrou é pulado e devolvido em
-- "ignorados" — clicar duas vezes não duplica.
CREATE OR REPLACE FUNCTION public.dar_entrada_nota(p_cliente uuid, p_itens jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_hoje        date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_item        jsonb;
  v_novo        jsonb;
  v_pos         integer := 0;
  v_rot         text;
  v_origem      text;
  v_item_id     uuid;
  v_nota        record;
  v_prod        uuid;
  v_prod_cat    uuid;
  v_prod_almox  uuid;
  v_cat         uuid;
  v_nome        text;
  v_unidade     text;
  v_destino     text;
  v_dest_tipo   text;
  v_almox       uuid;
  v_almox_nome  text;
  v_maq         uuid;
  v_cc          uuid;
  v_q           numeric;
  v_total       numeric;
  v_custo       numeric;
  v_data        date;
  v_disp        numeric;
  v_lote        uuid;
  v_forn        record;
  v_forn_nota   uuid;
  v_forn_id     uuid;
  v_lancados    integer := 0;
  v_ignorados   jsonb := '[]'::jsonb;
  v_produtos    jsonb := '[]'::jsonb;
  v_lotes       jsonb := '[]'::jsonb;
  v_fornecedores integer := 0;
BEGIN
  PERFORM public._estoque_guarda_posse(p_cliente);
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'nenhum item para dar entrada' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_itens) > 300 THEN
    RAISE EXCEPTION 'itens demais numa entrada (máximo 300)' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT e.value FROM jsonb_array_elements(p_itens) AS e LOOP
    v_pos := v_pos + 1;
    v_rot := 'item ' || v_pos;
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION '%: formato inválido', v_rot USING ERRCODE = '22023';
    END IF;
    v_origem := coalesce(v_item->>'origem', 'canonica');
    v_item_id := public._uuid_ou_nulo(v_item->>'item_id');
    IF v_item_id IS NULL OR v_origem NOT IN ('canonica','legado') THEN
      RAISE EXCEPTION '%: item da nota inválido', v_rot USING ERRCODE = '22023';
    END IF;

    -- Dois cliques no mesmo item: um espera o outro, e o segundo é pulado.
    PERFORM pg_advisory_xact_lock(hashtextextended('estoque-item:' || v_item_id::text, 0));

    IF v_origem = 'canonica' THEN
      SELECT it.id, it.sequence AS seq, it.description AS descricao, it.quantity AS quantidade,
             coalesce(it.total_price, round(it.quantity * it.unit_price, 2)) AS total,
             it.linked_stock_batch_id AS ligado,
             fi.id AS nota_id, fi.number AS numero, fi.issuer_cnpj AS emitente_doc, fi.issuer_name AS emitente_nome,
             coalesce((fi.issued_at AT TIME ZONE 'UTC')::date, (fi.received_at AT TIME ZONE 'UTC')::date) AS emissao,
             fi.status AS status_nota
        INTO v_nota
        FROM public.fiscal_invoice_items it
        JOIN public.fiscal_invoices fi ON fi.id = it.fiscal_invoice_id
       WHERE it.id = v_item_id AND fi.client_id = p_cliente;
    ELSE
      SELECT i.id, NULL::integer AS seq, i.descricao, i.quantidade,
             coalesce(i.valor_total, round(i.quantidade * i.valor_unitario, 2)) AS total,
             NULL::uuid AS ligado,
             fn.id AS nota_id, fn.numero_nota AS numero, fn.emitente_cnpj AS emitente_doc, fn.emitente_nome,
             coalesce(fn.data_emissao, (fn.created_at AT TIME ZONE 'America/Sao_Paulo')::date) AS emissao,
             fn.status AS status_nota
        INTO v_nota
        FROM public.fiscal_note_items i
        JOIN public.fiscal_notes fn ON fn.id = i.note_id
       WHERE i.id = v_item_id AND fn.client_id = p_cliente;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION '%: item não encontrado nas notas desta conta', v_rot USING ERRCODE = 'P0002';
    END IF;
    IF v_nota.status_nota IN ('rejected','archived') THEN
      RAISE EXCEPTION '%: a NF-e % foi rejeitada ou arquivada', v_rot, coalesce(v_nota.numero, 's/n') USING ERRCODE = '22023';
    END IF;

    IF v_nota.ligado IS NOT NULL OR EXISTS (SELECT 1 FROM public.stock_batches b WHERE b.nota_item_id = v_item_id) THEN
      v_ignorados := v_ignorados || to_jsonb(v_item_id::text);
      CONTINUE;
    END IF;

    -- Produto: existente do cliente, ou novo (com categoria obrigatória).
    v_prod := public._uuid_ou_nulo(v_item->>'produto_id');
    v_cat := public._uuid_ou_nulo(v_item->>'categoria_gerencial_id');
    v_novo := v_item->'novo_produto';
    IF v_prod IS NOT NULL THEN
      SELECT p.categoria_gerencial_id, p.almoxarifado_padrao_id INTO v_prod_cat, v_prod_almox
        FROM public.products p WHERE p.id = v_prod AND p.client_id = p_cliente;
      IF NOT FOUND THEN
        RAISE EXCEPTION '%: produto não encontrado', v_rot USING ERRCODE = 'P0002';
      END IF;
    ELSIF v_novo IS NOT NULL AND jsonb_typeof(v_novo) = 'object' THEN
      v_nome := btrim(coalesce(v_novo->>'nome', ''));
      v_unidade := upper(btrim(coalesce(v_novo->>'unidade', '')));
      v_cat := coalesce(public._uuid_ou_nulo(v_novo->>'categoria_gerencial_id'), v_cat);
      v_prod_almox := public._uuid_ou_nulo(v_novo->>'almoxarifado_padrao_id');
      IF char_length(v_nome) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION '%: dê um nome ao produto (2 a 120 letras)', v_rot USING ERRCODE = '22023';
      END IF;
      IF char_length(v_unidade) NOT BETWEEN 1 AND 10 THEN
        RAISE EXCEPTION '%: informe a unidade do produto', v_rot USING ERRCODE = '22023';
      END IF;
      IF v_cat IS NULL OR NOT EXISTS (SELECT 1 FROM public.categorias_gerenciais c
                                       WHERE c.id = v_cat AND c.client_id = p_cliente AND c.ativo) THEN
        RAISE EXCEPTION '%: escolha a categoria do produto', v_rot USING ERRCODE = '22023';
      END IF;
      IF v_prod_almox IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.almoxarifados a
                                                   WHERE a.id = v_prod_almox AND a.client_id = p_cliente) THEN
        RAISE EXCEPTION '%: almoxarifado padrão inválido', v_rot USING ERRCODE = '22023';
      END IF;
      -- Mesmo nome de produto ativo já cadastrado: usa o que existe, não duplica.
      SELECT p.id, p.categoria_gerencial_id, coalesce(p.almoxarifado_padrao_id, v_prod_almox)
        INTO v_prod, v_prod_cat, v_prod_almox
        FROM public.products p
       WHERE p.client_id = p_cliente AND p.active AND lower(btrim(p.name)) = lower(v_nome)
       ORDER BY p.created_at
       LIMIT 1;
      IF v_prod IS NULL THEN
        INSERT INTO public.products (client_id, name, unit, ncm, category, categoria_gerencial_id,
                                     almoxarifado_padrao_id, active, notes)
        VALUES (p_cliente, v_nome, v_unidade,
                CASE WHEN (v_novo->>'ncm') ~ '^[0-9]{8}$' THEN v_novo->>'ncm' END,
                nullif(left(btrim(coalesce(v_novo->>'categoria', '')), 30), ''),
                v_cat, v_prod_almox, true,
                'Criado na entrada da NF-e ' || coalesce(v_nota.numero, 's/n') || ' (Agraas Gestão).')
        RETURNING id INTO v_prod;
        v_prod_cat := v_cat;
        v_produtos := v_produtos || jsonb_build_object('item_id', v_item_id, 'produto_id', v_prod);
        PERFORM public._auditar(p_cliente, 'products', v_prod, 'criacao', NULL,
          (SELECT to_jsonb(p) FROM public.products p WHERE p.id = v_prod),
          'Produto criado na conferência da NF-e ' || coalesce(v_nota.numero, 's/n'));
      END IF;
    ELSE
      RAISE EXCEPTION '%: escolha o produto', v_rot USING ERRCODE = '22023';
    END IF;

    -- Categoria obrigatória antes do primeiro movimento.
    IF v_prod_cat IS NULL THEN
      IF v_cat IS NULL OR NOT EXISTS (SELECT 1 FROM public.categorias_gerenciais c
                                       WHERE c.id = v_cat AND c.client_id = p_cliente AND c.ativo) THEN
        RAISE EXCEPTION '%: defina a categoria do produto', v_rot USING ERRCODE = '22023';
      END IF;
      UPDATE public.products SET categoria_gerencial_id = v_cat WHERE id = v_prod AND client_id = p_cliente;
      PERFORM public._auditar(p_cliente, 'products', v_prod, 'alteracao',
        jsonb_build_object('categoria_gerencial_id', NULL), jsonb_build_object('categoria_gerencial_id', v_cat),
        'Categoria definida na conferência da NF-e ' || coalesce(v_nota.numero, 's/n'));
    END IF;

    -- Destino: estoque (almoxarifado) ou aplicação direta (máquina/centro).
    v_destino := coalesce(v_item->>'destino', 'estoque');
    v_almox := NULL; v_almox_nome := NULL; v_maq := NULL; v_cc := NULL;
    IF v_destino = 'estoque' THEN
      v_almox := coalesce(public._uuid_ou_nulo(v_item->>'almoxarifado_id'), v_prod_almox);
      SELECT a.nome INTO v_almox_nome FROM public.almoxarifados a
       WHERE a.id = v_almox AND a.client_id = p_cliente AND a.ativo;
      IF v_almox_nome IS NULL THEN
        RAISE EXCEPTION '%: escolha o almoxarifado', v_rot USING ERRCODE = '22023';
      END IF;
      v_dest_tipo := 'entrada';
    ELSIF v_destino = 'direto' THEN
      v_maq := public._uuid_ou_nulo(v_item->>'maquina_id');
      v_cc := public._uuid_ou_nulo(v_item->>'centro_custo_id');
      IF v_maq IS NULL AND v_cc IS NULL THEN
        RAISE EXCEPTION '%: escolha a máquina ou o centro de custo', v_rot USING ERRCODE = '22023';
      END IF;
      IF v_maq IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.maquinas m WHERE m.id = v_maq AND m.client_id = p_cliente) THEN
        RAISE EXCEPTION '%: máquina não encontrada', v_rot USING ERRCODE = 'P0002';
      END IF;
      IF v_cc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.centros_custo c WHERE c.id = v_cc AND c.client_id = p_cliente) THEN
        RAISE EXCEPTION '%: centro de custo não encontrado', v_rot USING ERRCODE = 'P0002';
      END IF;
      v_dest_tipo := coalesce(v_item->>'destino_tipo', CASE WHEN v_maq IS NOT NULL THEN 'manutencao' ELSE 'aplicacao' END);
      IF v_dest_tipo NOT IN ('abastecimento','manutencao','aplicacao','consumo') THEN
        RAISE EXCEPTION '%: tipo de aplicação inválido', v_rot USING ERRCODE = '22023';
      END IF;
      IF v_dest_tipo IN ('abastecimento','manutencao') AND v_maq IS NULL THEN
        RAISE EXCEPTION '%: abastecimento e manutenção pedem a máquina', v_rot USING ERRCODE = '22023';
      END IF;
      IF v_dest_tipo IN ('aplicacao','consumo') AND v_cc IS NULL THEN
        RAISE EXCEPTION '%: aplicação e consumo pedem o centro de custo', v_rot USING ERRCODE = '22023';
      END IF;
    ELSE
      RAISE EXCEPTION '%: destino inválido', v_rot USING ERRCODE = '22023';
    END IF;

    -- Quantidade (na unidade do produto) e custo pelo valor da nota.
    v_q := round(coalesce(public._numero_ou_nulo(v_item->>'quantidade'), v_nota.quantidade), 6);
    IF v_q IS NULL OR v_q <= 0 OR v_q > 1000000000 THEN
      RAISE EXCEPTION '%: quantidade inválida', v_rot USING ERRCODE = '22023';
    END IF;
    v_total := v_nota.total;
    IF v_total IS NOT NULL AND v_total > 0 THEN
      v_custo := round(v_total / v_q, 6);
    ELSE
      v_custo := public._numero_ou_nulo(v_item->>'custo_unitario');
      IF v_custo IS NOT NULL AND v_custo < 0 THEN
        RAISE EXCEPTION '%: custo inválido', v_rot USING ERRCODE = '22023';
      END IF;
      v_total := CASE WHEN v_custo IS NOT NULL THEN round(v_custo * v_q, 2) END;
    END IF;
    v_data := least(coalesce(public._data_ou_nula(v_item->>'data'), v_nota.emissao, v_hoje), v_hoje);

    -- Fornecedor pelo emitente (uma vez por nota).
    IF v_forn_nota IS DISTINCT FROM v_nota.nota_id THEN
      v_forn_nota := v_nota.nota_id;
      SELECT * INTO v_forn FROM public._estoque_fornecedor(p_cliente, v_nota.emitente_doc, v_nota.emitente_nome, v_nota.numero);
      v_forn_id := v_forn.fornecedor_id;
      IF v_forn.criado THEN v_fornecedores := v_fornecedores + 1; END IF;
    END IF;

    v_disp := 0;
    IF v_destino = 'estoque' THEN
      PERFORM pg_advisory_xact_lock(public._estoque_chave(p_cliente, v_prod, v_almox));
      v_disp := public._estoque_absorver_negativo(p_cliente, v_prod, v_almox, v_q);
    END IF;

    INSERT INTO public.stock_batches (
      client_id, product_id, batch_number, quantity, quantity_received, quantity_available, unit_cost,
      entry_date, supplier_id, supplier_name, document_source, storage_location,
      almoxarifado_id, fiscal_invoice_id, fiscal_note_id, nota_item_id)
    VALUES (
      p_cliente, v_prod,
      left('NF-' || coalesce(v_nota.numero, 'SN') || '-' || coalesce(v_nota.seq::text, v_pos::text), 60),
      v_disp, v_q, v_disp, v_custo,
      v_data, v_forn_id, v_nota.emitente_nome, left('NF-e ' || coalesce(v_nota.numero, 's/n'), 120), v_almox_nome,
      v_almox,
      CASE WHEN v_origem = 'canonica' THEN v_nota.nota_id
           WHEN EXISTS (SELECT 1 FROM public.fiscal_invoices f WHERE f.id = v_nota.nota_id AND f.client_id = p_cliente)
           THEN v_nota.nota_id END,
      CASE WHEN v_origem = 'legado' THEN v_nota.nota_id
           WHEN EXISTS (SELECT 1 FROM public.fiscal_notes n WHERE n.id = v_nota.nota_id AND n.client_id = p_cliente)
           THEN v_nota.nota_id END,
      v_item_id)
    RETURNING id INTO v_lote;

    PERFORM set_config('agraas.auditoria_detalhe',
      left('NF-e ' || coalesce(v_nota.numero, 's/n') || ' · ' || coalesce(v_nota.emitente_nome, 'fornecedor não identificado')
           || CASE WHEN v_destino = 'direto' THEN ' · aplicação direta' ELSE ' · ' || v_almox_nome END, 300), true);
    INSERT INTO public.stock_movements (
      client_id, product_id, batch_id, movement_type, quantity, reference_table, reference_id,
      almoxarifado_id, destino_tipo, maquina_id, centro_custo_id, custo_unitario, custo_total, motivo, data_movimento)
    VALUES (
      p_cliente, v_prod, v_lote,
      CASE WHEN v_destino = 'estoque' THEN 'entry' ELSE 'application' END,
      v_q,
      CASE WHEN v_origem = 'canonica' THEN 'fiscal_invoices' ELSE 'fiscal_notes' END, v_nota.nota_id,
      v_almox, v_dest_tipo, v_maq, v_cc, v_custo, v_total,
      CASE WHEN v_destino = 'direto' THEN 'Aplicação direta da NF-e ' || coalesce(v_nota.numero, 's/n') END,
      v_data);

    IF v_origem = 'canonica' THEN
      UPDATE public.fiscal_invoice_items SET linked_stock_batch_id = v_lote
       WHERE id = v_item_id AND linked_stock_batch_id IS NULL;
    END IF;

    v_lancados := v_lancados + 1;
    v_lotes := v_lotes || jsonb_build_object('item_id', v_item_id, 'lote_id', v_lote, 'produto_id', v_prod,
                                             'quantidade', v_q, 'custo_unitario', v_custo);
  END LOOP;

  PERFORM set_config('agraas.auditoria_detalhe', '', true);
  RETURN jsonb_build_object(
    'lancados', v_lancados, 'ignorados', v_ignorados, 'produtos_criados', v_produtos,
    'fornecedores_criados', v_fornecedores, 'lotes', v_lotes);
END
$fn$;

-- ── 9. Saída com custo médio ─────────────────────────────────────────────────
-- Tipos: abastecimento/manutenção (pedem máquina), aplicação/consumo (pedem
-- centro), ajuste (pede motivo). p_almoxarifado NULL = lotes sem almoxarifado.
-- Sem saldo: erro 'saldo_insuficiente' (DETAIL = saldo); passa só com
-- p_permitir_negativo + motivo. Referência a abastecimento é idempotente.
CREATE OR REPLACE FUNCTION public.registrar_saida_estoque(
  p_cliente uuid,
  p_produto uuid,
  p_almoxarifado uuid,
  p_quantidade numeric,
  p_destino_tipo text,
  p_maquina uuid DEFAULT NULL,
  p_centro uuid DEFAULT NULL,
  p_data date DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_permitir_negativo boolean DEFAULT false,
  p_referencia_tabela text DEFAULT NULL,
  p_referencia_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_hoje     date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_data     date;
  v_motivo   text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_q        numeric := round(p_quantidade, 6);
  v_pos      record;
  v_custo    numeric;
  v_tirar    numeric;
  v_resto    numeric;
  v_parte    numeric;
  v_excesso  numeric;
  v_n        integer;
  v_i        integer := 0;
  v_lote     record;
  v_neg      uuid;
  v_mov      uuid;
  v_existente uuid;
BEGIN
  PERFORM public._estoque_guarda_posse(p_cliente);
  v_data := coalesce(p_data, v_hoje);
  IF p_produto IS NULL THEN
    RAISE EXCEPTION 'escolha o produto' USING ERRCODE = '22023';
  END IF;
  IF v_q IS NULL OR v_q <= 0 OR v_q > 1000000000 THEN
    RAISE EXCEPTION 'quantidade inválida' USING ERRCODE = '22023';
  END IF;
  IF p_destino_tipo IS NULL OR p_destino_tipo NOT IN ('abastecimento','manutencao','aplicacao','consumo','ajuste') THEN
    RAISE EXCEPTION 'tipo de saída inválido' USING ERRCODE = '22023';
  END IF;
  IF v_data > v_hoje OR v_data < DATE '2000-01-01' THEN
    RAISE EXCEPTION 'data inválida' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(v_motivo, '')) > 300 THEN
    RAISE EXCEPTION 'motivo longo demais (máximo 300 caracteres)' USING ERRCODE = '22023';
  END IF;
  IF p_destino_tipo = 'ajuste' AND char_length(coalesce(v_motivo, '')) < 3 THEN
    RAISE EXCEPTION 'ajuste de inventário pede o motivo' USING ERRCODE = '22023';
  END IF;
  IF p_destino_tipo IN ('abastecimento','manutencao') AND p_maquina IS NULL THEN
    RAISE EXCEPTION 'abastecimento e manutenção pedem a máquina' USING ERRCODE = '22023';
  END IF;
  IF p_destino_tipo IN ('aplicacao','consumo') AND p_centro IS NULL THEN
    RAISE EXCEPTION 'aplicação e consumo pedem o centro de custo' USING ERRCODE = '22023';
  END IF;
  IF p_referencia_tabela IS NOT NULL AND p_referencia_tabela <> 'abastecimentos' THEN
    RAISE EXCEPTION 'referência não suportada' USING ERRCODE = '22023';
  END IF;
  IF (p_referencia_tabela IS NULL) <> (p_referencia_id IS NULL) THEN
    RAISE EXCEPTION 'referência incompleta' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_produto AND p.client_id = p_cliente) THEN
    RAISE EXCEPTION 'produto não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF p_almoxarifado IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.almoxarifados a WHERE a.id = p_almoxarifado AND a.client_id = p_cliente) THEN
    RAISE EXCEPTION 'almoxarifado não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF p_maquina IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.maquinas m WHERE m.id = p_maquina AND m.client_id = p_cliente) THEN
    RAISE EXCEPTION 'máquina não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF p_centro IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.centros_custo c WHERE c.id = p_centro AND c.client_id = p_cliente) THEN
    RAISE EXCEPTION 'centro de custo não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF p_referencia_tabela = 'abastecimentos' THEN
    IF NOT EXISTS (SELECT 1 FROM public.abastecimentos ab WHERE ab.id = p_referencia_id AND ab.client_id = p_cliente) THEN
      RAISE EXCEPTION 'abastecimento não encontrado' USING ERRCODE = 'P0002';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('estoque-ref:' || p_referencia_id::text, 0));
    SELECT m.id INTO v_existente FROM public.stock_movements m
     WHERE m.reference_table = 'abastecimentos' AND m.reference_id = p_referencia_id;
    IF v_existente IS NOT NULL THEN
      RETURN jsonb_build_object('movimento_id', v_existente, 'ja_existia', true);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(public._estoque_chave(p_cliente, p_produto, p_almoxarifado));
  SELECT * INTO v_pos FROM public._estoque_posicao(p_cliente, p_produto, p_almoxarifado);
  v_custo := v_pos.custo_medio;

  IF v_q > v_pos.saldo THEN
    IF NOT coalesce(p_permitir_negativo, false) OR char_length(coalesce(v_motivo, '')) < 3 THEN
      RAISE EXCEPTION 'saldo_insuficiente'
        USING ERRCODE = 'P0001', DETAIL = v_pos.saldo::text,
              HINT = 'Informe o motivo para registrar a saída mesmo sem saldo.';
    END IF;
    IF p_almoxarifado IS NULL THEN
      RAISE EXCEPTION 'saída sem saldo pede um almoxarifado' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Baixa proporcional nos lotes com saldo: o custo médio do que fica não muda.
  v_tirar := least(v_q, v_pos.saldo_positivo);
  IF v_tirar > 0 THEN
    IF v_tirar >= v_pos.saldo_positivo THEN
      UPDATE public.stock_batches b
         SET quantity = b.quantity - b.quantity_available, quantity_available = 0
       WHERE b.client_id = p_cliente AND b.product_id = p_produto
         AND b.almoxarifado_id IS NOT DISTINCT FROM p_almoxarifado AND b.quantity_available > 0;
    ELSE
      v_resto := v_tirar;
      SELECT count(*) INTO v_n FROM public.stock_batches b
       WHERE b.client_id = p_cliente AND b.product_id = p_produto
         AND b.almoxarifado_id IS NOT DISTINCT FROM p_almoxarifado AND b.quantity_available > 0;
      FOR v_lote IN
        SELECT b.id, b.quantity_available FROM public.stock_batches b
         WHERE b.client_id = p_cliente AND b.product_id = p_produto
           AND b.almoxarifado_id IS NOT DISTINCT FROM p_almoxarifado AND b.quantity_available > 0
         ORDER BY b.quantity_available, b.id
           FOR UPDATE
      LOOP
        v_i := v_i + 1;
        v_parte := CASE WHEN v_i = v_n THEN v_resto
                        ELSE trunc(v_tirar * v_lote.quantity_available / v_pos.saldo_positivo, 6) END;
        v_parte := least(v_parte, v_lote.quantity_available, v_resto);
        UPDATE public.stock_batches
           SET quantity_available = quantity_available - v_parte, quantity = quantity - v_parte
         WHERE id = v_lote.id;
        v_resto := v_resto - v_parte;
      END LOOP;
      -- Arredondamento: o que sobrar sai de quem ainda tem saldo.
      IF v_resto > 0 THEN
        FOR v_lote IN
          SELECT b.id, b.quantity_available FROM public.stock_batches b
           WHERE b.client_id = p_cliente AND b.product_id = p_produto
             AND b.almoxarifado_id IS NOT DISTINCT FROM p_almoxarifado AND b.quantity_available > 0
           ORDER BY b.quantity_available DESC, b.id
        LOOP
          v_parte := least(v_resto, v_lote.quantity_available);
          UPDATE public.stock_batches
             SET quantity_available = quantity_available - v_parte, quantity = quantity - v_parte
           WHERE id = v_lote.id;
          v_resto := v_resto - v_parte;
          EXIT WHEN v_resto <= 0;
        END LOOP;
      END IF;
    END IF;
  END IF;

  -- Excedente autorizado: lote negativo que a próxima entrada compensa.
  v_excesso := v_q - v_tirar;
  IF v_excesso > 0 THEN
    SELECT b.id INTO v_neg FROM public.stock_batches b
     WHERE b.client_id = p_cliente AND b.product_id = p_produto
       AND b.almoxarifado_id = p_almoxarifado AND b.quantity_available < 0
     ORDER BY b.created_at
     LIMIT 1
       FOR UPDATE;
    IF v_neg IS NULL THEN
      INSERT INTO public.stock_batches (
        client_id, product_id, batch_number, quantity, quantity_received, quantity_available, unit_cost,
        entry_date, document_source, storage_location, almoxarifado_id)
      VALUES (
        p_cliente, p_produto, 'SALDO-NEGATIVO', -v_excesso, 0, -v_excesso, v_custo, v_data,
        'Saída sem saldo: a próxima entrada compensa',
        (SELECT a.nome FROM public.almoxarifados a WHERE a.id = p_almoxarifado), p_almoxarifado);
    ELSE
      UPDATE public.stock_batches
         SET quantity_available = quantity_available - v_excesso,
             quantity = coalesce(quantity, 0) - v_excesso,
             unit_cost = coalesce(unit_cost, v_custo)
       WHERE id = v_neg;
    END IF;
  END IF;

  PERFORM set_config('agraas.auditoria_detalhe', left(coalesce(v_motivo, 'Saída: ' || p_destino_tipo), 300), true);
  INSERT INTO public.stock_movements (
    client_id, product_id, batch_id, movement_type, quantity, reference_table, reference_id,
    almoxarifado_id, destino_tipo, maquina_id, centro_custo_id, custo_unitario, custo_total, motivo, data_movimento)
  VALUES (
    p_cliente, p_produto, NULL,
    CASE WHEN p_destino_tipo = 'ajuste' THEN 'adjustment' ELSE 'application' END,
    v_q, p_referencia_tabela, p_referencia_id,
    p_almoxarifado, p_destino_tipo, p_maquina, p_centro,
    round(v_custo, 6), CASE WHEN v_custo IS NOT NULL THEN round(v_q * v_custo, 2) END,
    v_motivo, v_data)
  RETURNING id INTO v_mov;
  PERFORM set_config('agraas.auditoria_detalhe', '', true);

  RETURN jsonb_build_object(
    'movimento_id', v_mov,
    'ja_existia', false,
    'custo_unitario', round(v_custo, 6),
    'custo_total', CASE WHEN v_custo IS NOT NULL THEN round(v_q * v_custo, 2) END,
    'saldo_restante', v_pos.saldo - v_q,
    'ficou_negativo', (v_pos.saldo - v_q) < 0);
END
$fn$;

-- ── 10. Entrada avulsa (sobra de inventário, saldo inicial) ──────────────────
-- Sem nota, sempre com motivo. Custo: o informado ou, sem ele, o custo médio
-- atual do produto no almoxarifado (a sobra não muda o custo médio).
CREATE OR REPLACE FUNCTION public.registrar_entrada_avulsa(
  p_cliente uuid,
  p_produto uuid,
  p_almoxarifado uuid,
  p_quantidade numeric,
  p_motivo text,
  p_custo_unitario numeric DEFAULT NULL,
  p_data date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_hoje   date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_data   date;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_q      numeric := round(p_quantidade, 6);
  v_pos    record;
  v_custo  numeric;
  v_disp   numeric;
  v_lote   uuid;
  v_mov    uuid;
  v_nome   text;
BEGIN
  PERFORM public._estoque_guarda_posse(p_cliente);
  v_data := coalesce(p_data, v_hoje);
  IF v_q IS NULL OR v_q <= 0 OR v_q > 1000000000 THEN
    RAISE EXCEPTION 'quantidade inválida' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(v_motivo, '')) NOT BETWEEN 3 AND 300 THEN
    RAISE EXCEPTION 'entrada sem nota pede o motivo' USING ERRCODE = '22023';
  END IF;
  IF v_data > v_hoje OR v_data < DATE '2000-01-01' THEN
    RAISE EXCEPTION 'data inválida' USING ERRCODE = '22023';
  END IF;
  IF p_custo_unitario IS NOT NULL AND (p_custo_unitario < 0 OR p_custo_unitario > 100000000) THEN
    RAISE EXCEPTION 'custo inválido' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_produto AND p.client_id = p_cliente) THEN
    RAISE EXCEPTION 'produto não encontrado' USING ERRCODE = 'P0002';
  END IF;
  SELECT a.nome INTO v_nome FROM public.almoxarifados a
   WHERE a.id = p_almoxarifado AND a.client_id = p_cliente AND a.ativo;
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'escolha o almoxarifado' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(public._estoque_chave(p_cliente, p_produto, p_almoxarifado));
  SELECT * INTO v_pos FROM public._estoque_posicao(p_cliente, p_produto, p_almoxarifado);
  v_custo := coalesce(round(p_custo_unitario, 6), round(v_pos.custo_medio, 6));
  v_disp := public._estoque_absorver_negativo(p_cliente, p_produto, p_almoxarifado, v_q);

  INSERT INTO public.stock_batches (
    client_id, product_id, batch_number, quantity, quantity_received, quantity_available, unit_cost,
    entry_date, document_source, storage_location, almoxarifado_id)
  VALUES (
    p_cliente, p_produto, 'AJUSTE', v_disp, v_q, v_disp, v_custo,
    v_data, left('Entrada sem nota: ' || v_motivo, 120), v_nome, p_almoxarifado)
  RETURNING id INTO v_lote;

  PERFORM set_config('agraas.auditoria_detalhe', left(v_motivo, 300), true);
  INSERT INTO public.stock_movements (
    client_id, product_id, batch_id, movement_type, quantity, almoxarifado_id, destino_tipo,
    custo_unitario, custo_total, motivo, data_movimento)
  VALUES (
    p_cliente, p_produto, v_lote, 'adjustment', v_q, p_almoxarifado, 'entrada',
    v_custo, CASE WHEN v_custo IS NOT NULL THEN round(v_q * v_custo, 2) END, v_motivo, v_data)
  RETURNING id INTO v_mov;
  PERFORM set_config('agraas.auditoria_detalhe', '', true);

  RETURN jsonb_build_object('movimento_id', v_mov, 'lote_id', v_lote, 'custo_unitario', v_custo);
END
$fn$;

-- ── 11. Estorno de entrada ───────────────────────────────────────────────────
-- Desfaz uma entrada (nota ou avulsa) que ainda não teve saída: apaga os
-- movimentos do lote (a auditoria guarda o "antes" com o motivo), solta o
-- item da nota para ser conferido de novo e apaga o lote. Lote que já teve
-- saída, absorveu saldo negativo ou foi usado em aplicação sanitária não é
-- estornado — o caminho é um ajuste.
CREATE OR REPLACE FUNCTION public.estornar_entrada_estoque(p_cliente uuid, p_lote uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_lote   record;
  v_direto boolean;
  v_n      integer;
BEGIN
  PERFORM public._estoque_guarda_posse(p_cliente);
  IF char_length(coalesce(v_motivo, '')) NOT BETWEEN 3 AND 300 THEN
    RAISE EXCEPTION 'estorno pede o motivo' USING ERRCODE = '22023';
  END IF;
  SELECT b.id, b.product_id, b.almoxarifado_id, b.quantity_received, b.quantity_available
    INTO v_lote
    FROM public.stock_batches b
   WHERE b.id = p_lote AND b.client_id = p_cliente;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lote não encontrado' USING ERRCODE = 'P0002';
  END IF;
  PERFORM pg_advisory_xact_lock(public._estoque_chave(p_cliente, v_lote.product_id, v_lote.almoxarifado_id));
  PERFORM 1 FROM public.stock_batches b WHERE b.id = p_lote FOR UPDATE;

  v_direto := EXISTS (SELECT 1 FROM public.stock_movements m
                       WHERE m.batch_id = p_lote AND m.movement_type = 'application'
                         AND m.destino_tipo IN ('abastecimento','manutencao','aplicacao','consumo'));
  IF EXISTS (SELECT 1 FROM public.applications a WHERE a.batch_id = p_lote) THEN
    RAISE EXCEPTION 'lote_movimentado' USING ERRCODE = 'P0001', DETAIL = 'usado em aplicação sanitária';
  END IF;
  IF NOT v_direto AND (v_lote.quantity_available IS DISTINCT FROM v_lote.quantity_received) THEN
    RAISE EXCEPTION 'lote_movimentado' USING ERRCODE = 'P0001', DETAIL = 'parte do lote já saiu';
  END IF;
  IF EXISTS (SELECT 1 FROM public.stock_movements m
              WHERE m.batch_id = p_lote
                AND NOT (m.destino_tipo = 'entrada'
                         OR (m.destino_tipo IS NULL AND m.movement_type = 'entry')
                         OR (v_direto AND m.movement_type = 'application'))) THEN
    RAISE EXCEPTION 'lote_movimentado' USING ERRCODE = 'P0001', DETAIL = 'o lote tem outras movimentações';
  END IF;

  PERFORM set_config('agraas.auditoria_detalhe', left('Estorno: ' || v_motivo, 300), true);
  DELETE FROM public.stock_movements WHERE batch_id = p_lote;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE public.fiscal_invoice_items SET linked_stock_batch_id = NULL WHERE linked_stock_batch_id = p_lote;
  DELETE FROM public.stock_batches WHERE id = p_lote;
  PERFORM set_config('agraas.auditoria_detalhe', '', true);

  RETURN jsonb_build_object('estornado', true, 'movimentos', v_n);
END
$fn$;

-- ── 12. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.categorias_gerenciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almoxarifados         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_eventos     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_gerenciais_access ON public.categorias_gerenciais;
CREATE POLICY categorias_gerenciais_access ON public.categorias_gerenciais FOR ALL
  USING ((SELECT public.is_admin()) OR client_id = (SELECT public.get_my_client_id()))
  WITH CHECK (
    ((SELECT public.is_admin()) OR client_id = (SELECT public.get_my_client_id()))
    AND (conta_contabil_id IS NULL OR conta_contabil_id IN
          (SELECT c.id FROM public.chart_of_accounts c WHERE c.client_id = categorias_gerenciais.client_id))
  );

DROP POLICY IF EXISTS almoxarifados_access ON public.almoxarifados;
CREATE POLICY almoxarifados_access ON public.almoxarifados FOR ALL
  USING ((SELECT public.is_admin()) OR client_id = (SELECT public.get_my_client_id()))
  WITH CHECK ((SELECT public.is_admin()) OR client_id = (SELECT public.get_my_client_id()));

-- Só leitura; nenhuma policy de escrita (o trigger e as funções gravam como owner).
DROP POLICY IF EXISTS auditoria_eventos_leitura ON public.auditoria_eventos;
CREATE POLICY auditoria_eventos_leitura ON public.auditoria_eventos FOR SELECT
  USING ((SELECT public.is_admin()) OR client_id = (SELECT public.get_my_client_id()));

-- ── 13. Privilégios ──────────────────────────────────────────────────────────
-- Sessão anônima não lê nem grava cadastro de estoque (defesa em profundidade;
-- a RLS já barraria). Auditoria: authenticated só lê.
REVOKE ALL ON public.categorias_gerenciais, public.almoxarifados, public.auditoria_eventos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.auditoria_eventos FROM authenticated;
GRANT SELECT ON public.auditoria_eventos TO authenticated;

-- Funções chamadas pelo portal: authenticated (com guarda de posse); nunca anon.
REVOKE EXECUTE ON FUNCTION public.semear_categorias_gerenciais(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dar_entrada_nota(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_saida_estoque(uuid, uuid, uuid, numeric, text, uuid, uuid, date, text, boolean, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_entrada_avulsa(uuid, uuid, uuid, numeric, text, numeric, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.estornar_entrada_estoque(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.semear_categorias_gerenciais(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dar_entrada_nota(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(uuid, uuid, uuid, numeric, text, uuid, uuid, date, text, boolean, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_avulsa(uuid, uuid, uuid, numeric, text, numeric, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estornar_entrada_estoque(uuid, uuid, text) TO authenticated, service_role;

-- Internas (rodam dentro das funções acima, como owner): ninguém chama direto.
REVOKE EXECUTE ON FUNCTION public._estoque_guarda_posse(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._estoque_posicao(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._estoque_absorver_negativo(uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._estoque_fornecedor(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._auditar(uuid, text, uuid, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_auditoria_eventos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_estoque_referencias_mesmo_cliente() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.categorias_gerenciais IS
  '181 (25/11/2026): taxonomia gerencial por cliente (sem "Outros"), com ponte opcional para chart_of_accounts.';
COMMENT ON TABLE public.almoxarifados IS
  '181 (25/11/2026): locais de estoque do cliente; tipo combustivel tem capacidade em litros.';
COMMENT ON TABLE public.auditoria_eventos IS
  '181 (25/11/2026): trilha de auditoria (baixas, estornos, entradas, saídas, cadastros automáticos). Escrita só por trigger/função.';
COMMENT ON COLUMN public.stock_batches.nota_item_id IS
  'Item de nota que originou o lote (fiscal_invoice_items.id ou fiscal_note_items.id). Único.';
COMMENT ON COLUMN public.stock_movements.destino_tipo IS
  'entrada (soma) | abastecimento | manutencao | aplicacao | consumo | ajuste (subtraem). NULL = movimento anterior à 181.';

COMMIT;
