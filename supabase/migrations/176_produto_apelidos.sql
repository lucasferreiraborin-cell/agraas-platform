-- ============================================================================
-- 176 · Apelidos de produto — de-para do item da nota para o catálogo `products`
-- ============================================================================
-- Portal /gestao, 24/11/2026. A dor: cada fornecedor escreve o mesmo produto
-- de um jeito ("ROUNDUP ORIGINAL DI 20L", "GLIFOSATO 480 SL BB 20 LT"). Sem
-- de-para, cada nome vira um produto e o estoque duplica.
--
-- Decisão de desenho (reunião com a iBoi, 24/11/2026): o estoque tem UM
-- catálogo, a tabela `products` que a plataforma já usa (sanitário, estoque,
-- aplicações, aprovação de NF-e na controladoria). Esta migration NÃO cria
-- catálogo paralelo e NÃO altera `products`: só cria
--   produto_apelidos — cada texto de item de nota (normalizado), por
--     fornecedor, que o produtor confirmou ser aquele product. É o que faz a
--     próxima nota do mesmo fornecedor "ligar sozinha".
-- A regra de normalização vive em lib/gestao/de-para.ts (normalizarTexto): o
-- banco guarda o resultado, não a regra. Mudar a regra exige migrar os textos.
--
-- Por que o GTIN fica aqui e não em products: GTIN identifica o item comercial
-- (marca + embalagem). "Glifosato" pode chegar em 5 L e 20 L, de marcas
-- diferentes — um produto, vários GTIN. Cada apelido guarda o seu.
--
-- RLS: client_id + is_admin() OR client_id = get_my_client_id() (padrão 010/172).
-- ATENÇÃO para as telas: is_admin() enxerga TODOS os clientes e a conta demo é
-- admin — toda query do portal filtra .eq('client_id', clientId).
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10).
-- Rollback: supabase/rollbacks/176_down.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.produto_apelidos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id         uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  texto_normalizado  text NOT NULL CHECK (char_length(texto_normalizado) BETWEEN 1 AND 300),
  texto_original     text CHECK (texto_original IS NULL OR char_length(texto_original) <= 300),
  fornecedor_doc     text CHECK (fornecedor_doc IS NULL OR fornecedor_doc ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$'),
  ncm                text CHECK (ncm IS NULL OR ncm ~ '^[0-9]{8}$'),
  gtin               text CHECK (gtin IS NULL OR gtin ~ '^[0-9]{14}$'),
  unidade_nota       text CHECK (unidade_nota IS NULL OR char_length(unidade_nota) BETWEEN 1 AND 10),
  fator_conversao    numeric(18,6) CHECK (fator_conversao IS NULL OR (fator_conversao > 0 AND fator_conversao <= 1000000)),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produto_apelidos_uniq UNIQUE NULLS NOT DISTINCT (client_id, texto_normalizado, fornecedor_doc)
);

-- Decisões:
--  * ON DELETE CASCADE em product_id: produto apagado leva junto os nomes de
--    nota ligados a ele (o item volta a aparecer como pendente na tela).
--  * UNIQUE NULLS NOT DISTINCT (PG15+): foto/PDF sem CNPJ grava fornecedor_doc
--    NULL; sem isso, dois NULL contariam como distintos e o mesmo texto sem
--    fornecedor viraria dois apelidos.
--  * fornecedor_doc aceita CPF (11 dígitos) e CNPJ de 14 posições com as 12
--    primeiras alfanuméricas (inscrições novas); DV sempre numérico.
--  * gtin em 14 dígitos (o app valida o dígito verificador GS1 e completa com
--    zeros à esquerda).
--  * Conversão de unidade (para o estoque): quantidade na unidade do product
--    = quantidade do item × fator_conversao, VÁLIDO só quando a unidade do
--    item na nota (uCom) é unidade_nota. Ex.: "GLIFOSATO GL 20L", 10 GL,
--    product em L → unidade_nota 'GL', fator 20 → 200 L. NULL = desconhecido:
--    quem consome não converte por conta própria. Sugestão do fator em
--    lib/gestao/de-para.ts (conteúdo da embalagem lido da descrição + SI).
-- FK sem índice vira seq scan no ON DELETE CASCADE de products.
CREATE INDEX IF NOT EXISTS produto_apelidos_product_idx
  ON public.produto_apelidos (product_id);
CREATE INDEX IF NOT EXISTS produto_apelidos_gtin_idx
  ON public.produto_apelidos (client_id, gtin) WHERE gtin IS NOT NULL;

ALTER TABLE public.produto_apelidos ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS: sem isso a migration falha na 2ª execução (idempotência).
-- WITH CHECK amarra product_id a um product do MESMO cliente: FK não passa por
-- RLS, e a policy de products deixa qualquer cliente LER o catálogo global
-- (client_id NULL) — que, por isso mesmo, não pode receber apelido de ninguém.
DROP POLICY IF EXISTS produto_apelidos_access ON public.produto_apelidos;
CREATE POLICY produto_apelidos_access ON public.produto_apelidos FOR ALL
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (
    (is_admin() OR client_id = get_my_client_id())
    AND product_id IN (SELECT p.id FROM public.products p
                        WHERE p.client_id = produto_apelidos.client_id)
  );

COMMENT ON TABLE public.produto_apelidos IS
  '176 (24/11/2026): texto de item de NF-e (normalizado por lib/gestao/de-para.ts) confirmado pelo produtor como um products, por fornecedor. Catálogo único: products.';
COMMENT ON COLUMN public.produto_apelidos.fator_conversao IS
  'Quantidade na unidade do product = quantidade do item × fator, só quando a unidade do item na nota = unidade_nota. NULL = não informado.';

COMMIT;
