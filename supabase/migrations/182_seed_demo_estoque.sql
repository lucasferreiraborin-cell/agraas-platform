-- ============================================================================
-- 182 · DEMO — conta demo — não aplicar sem ordem
--       Seed de demonstração do estoque gerencial (Onda 1)
-- ============================================================================
-- DADO FICTÍCIO (DEMO). Vale SÓ para a conta demo lucas@agraas.com.br
-- (client_id 79c94a7e-b233-4e85-9d72-6d08477c21c9, papel admin), que já é 100%
-- demo (mesma autorização da 173). NUNCA rodar contra outra conta — em
-- especial a FSJBE, que recebe dado real (decisão de 11/09/2026).
--
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10).
-- Depende da 173 (notas e abastecimentos demo) e da 181 (estoque gerencial).
-- Rollback: supabase/rollbacks/182_down.sql
--
-- O que entra (coerente com o que a 173 já gravou):
--   · categorias da taxonomia sugerida (semear_categorias_gerenciais);
--   · 3 almoxarifados: Diesel (tanque, 15.000 L), Peças, Insumos;
--   · 4 produtos a partir dos itens das notas demo: óleo diesel S10 (L),
--     ureia (T), mancozebe (KG), sal mineral 80P (KG), com categoria,
--     almoxarifado padrão e mínimo/máximo; os 3 produtos que já existiam na
--     conta (vacinas, vitamina) ganham categoria;
--   · entradas das 4 NF-e demo (18452, 7720, 7894, 18731) e as 35 saídas de
--     diesel dos abastecimentos da 173, em ORDEM CRONOLÓGICA, pelas MESMAS
--     funções que o app usa (dar_entrada_nota / registrar_saida_estoque) —
--     custo médio e baixa proporcional idênticos ao uso real, sem conta
--     duplicada aqui.
--   Conferência: diesel 4.800 + 3.000 = 7.800 L comprados − 5.832 L
--   abastecidos = 1.968 L no tanque (o mesmo saldo teórico da 173).
--   De propósito, para a demo: diesel abaixo do mínimo (1.968 < 2.500 L),
--   ureia acima do máximo (16 > 12 T) e a nota legada 12345 (sal mineral,
--   40 SC "saco 30kg") FICA A CONFERIR — mostra a conversão SC → KG e o
--   produto já sugerido.
--
-- Idempotência: almoxarifados e produtos têm id md5('estoque-demo-<chave>')
-- e ON CONFLICT DO NOTHING (e são achados pelo nome se já existirem); as
-- entradas e saídas são idempotentes pela chave natural (item da nota já
-- lançado é pulado; abastecimento gera no máximo uma saída). Rodar 2x não
-- duplica nada. Lotes e movimentos ficam com criado_por NULL ("Sistema").
--
-- Classificação: mínimos/máximos são SIMULADO (configuração de demo);
-- preços e quantidades vêm das notas demo da 173 (também SIMULADO).
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_client     uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_al_diesel  uuid;
  v_al_pecas   uuid;
  v_al_insumos uuid;
  v_diesel     uuid;
  v_ureia      uuid;
  v_mancozebe  uuid;
  v_sal        uuid;
  v_prod       uuid;
  v_almox      uuid;
  v_ab         record;
  r            record;
  v_n_ent      integer := 0;
  v_n_sai      integer := 0;
BEGIN
  -- Guarda 1: a conta demo precisa existir e ser a do Lucas.
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client AND email = 'lucas@agraas.com.br') THEN
    RAISE NOTICE '182: conta demo % não encontrada — seed ignorado.', v_client;
    RETURN;
  END IF;
  -- Guarda 2: 172/173 e 181 aplicadas (falha alto, não em silêncio).
  IF to_regclass('public.abastecimentos') IS NULL THEN
    RAISE EXCEPTION '182: aplique a 172 e a 173 antes deste seed.';
  END IF;
  IF to_regclass('public.almoxarifados') IS NULL OR to_regprocedure('public.dar_entrada_nota(uuid, jsonb)') IS NULL THEN
    RAISE EXCEPTION '182: aplique a 181 antes deste seed.';
  END IF;

  -- ── Categorias (taxonomia sugerida) ──────────────────────────────────────
  PERFORM public.semear_categorias_gerenciais(v_client);

  -- ── Almoxarifados ────────────────────────────────────────────────────────
  INSERT INTO public.almoxarifados (id, client_id, nome, tipo, capacidade_litros)
  VALUES (md5('estoque-demo-al01')::uuid, v_client, 'Diesel',  'combustivel', 15000),
         (md5('estoque-demo-al02')::uuid, v_client, 'Peças',   'pecas',       NULL),
         (md5('estoque-demo-al03')::uuid, v_client, 'Insumos', 'insumos',     NULL)
  ON CONFLICT DO NOTHING;
  -- Pelo nome: se a conta já tinha um "Diesel", usa o dela.
  SELECT id INTO v_al_diesel  FROM public.almoxarifados WHERE client_id = v_client AND lower(btrim(nome)) = 'diesel'  ORDER BY created_at LIMIT 1;
  SELECT id INTO v_al_pecas   FROM public.almoxarifados WHERE client_id = v_client AND lower(btrim(nome)) = 'peças'   ORDER BY created_at LIMIT 1;
  SELECT id INTO v_al_insumos FROM public.almoxarifados WHERE client_id = v_client AND lower(btrim(nome)) = 'insumos' ORDER BY created_at LIMIT 1;

  -- ── Produtos (a partir dos itens das notas demo) ─────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      ('pr01', 'Óleo diesel S10',            'L',  '27101921', 'diesel',     'Diesel',                    'diesel',  2500::numeric, 15000::numeric),
      ('pr02', 'Ureia agrícola 46% N',       'T',  '31021010', 'fertilizante','Adubos e fertilizantes',   'insumos', 2,             12),
      ('pr03', 'Fungicida mancozebe 800 WP', 'KG', '38089299', 'defensivo',  'Defensivos',                'insumos', 200,           1500),
      ('pr04', 'Sal mineral 80P',            'KG', '23099090', 'suplemento', 'Sal mineral e suplementos', 'insumos', 600,           3600)
    ) AS t(k, nome, unidade, ncm, cat_plataforma, categoria, almox, minimo, maximo)
  LOOP
    v_almox := CASE r.almox WHEN 'diesel' THEN v_al_diesel ELSE v_al_insumos END;
    SELECT p.id INTO v_prod FROM public.products p
     WHERE p.client_id = v_client AND p.active AND lower(btrim(p.name)) = lower(r.nome)
     ORDER BY (p.id = md5('estoque-demo-' || r.k)::uuid) DESC, p.created_at
     LIMIT 1;
    IF v_prod IS NULL THEN
      INSERT INTO public.products (id, client_id, name, unit, ncm, category, active, notes)
      VALUES (md5('estoque-demo-' || r.k)::uuid, v_client, r.nome, r.unidade, r.ncm, r.cat_plataforma, true,
              'DEMO — criado pelo seed do estoque gerencial (182).')
      ON CONFLICT DO NOTHING;
      v_prod := md5('estoque-demo-' || r.k)::uuid;
    END IF;
    -- Completa só o que está em branco (não sobrescreve escolha feita na tela).
    UPDATE public.products p
       SET categoria_gerencial_id = coalesce(p.categoria_gerencial_id,
             (SELECT c.id FROM public.categorias_gerenciais c WHERE c.client_id = v_client AND c.nome = r.categoria LIMIT 1)),
           almoxarifado_padrao_id = coalesce(p.almoxarifado_padrao_id, v_almox),
           estoque_minimo = coalesce(p.estoque_minimo, r.minimo),
           estoque_maximo = coalesce(p.estoque_maximo, r.maximo),
           unit = coalesce(p.unit, r.unidade),
           ncm = coalesce(p.ncm, r.ncm)
     WHERE p.id = v_prod AND p.client_id = v_client;
    CASE r.k
      WHEN 'pr01' THEN v_diesel := v_prod;
      WHEN 'pr02' THEN v_ureia := v_prod;
      WHEN 'pr03' THEN v_mancozebe := v_prod;
      ELSE v_sal := v_prod;
    END CASE;
  END LOOP;

  -- Produtos sanitários que já existiam na conta ganham categoria (se não tiverem).
  UPDATE public.products p
     SET categoria_gerencial_id = (SELECT c.id FROM public.categorias_gerenciais c
                                    WHERE c.client_id = v_client AND c.nome = 'Vacinas e medicamentos' LIMIT 1)
   WHERE p.client_id = v_client AND p.categoria_gerencial_id IS NULL
     AND p.id IN ('9c5e249d-b85d-4cd0-a2ed-ffbd24aa4284', '5f60b415-ddbe-4a95-8756-e48088d6120d', '11111111-0000-0000-0000-000000000001');

  -- ── Entradas e saídas em ordem cronológica ───────────────────────────────
  -- No mesmo dia, a entrada vem antes do abastecimento (a nota de 10/11 cobre
  -- o abastecimento de 10/11).
  FOR r IN
    SELECT e.* FROM (
      SELECT (fi.issued_at AT TIME ZONE 'UTC')::date AS dia, 0 AS ordem, 'entrada' AS tipo, it.id AS ref,
             it.sequence AS seq, fi.id AS nota
        FROM public.fiscal_invoice_items it
        JOIN public.fiscal_invoices fi ON fi.id = it.fiscal_invoice_id
       WHERE fi.client_id = v_client
         AND it.id IN (SELECT md5('gestao-demo-it0' || g)::uuid FROM generate_series(1, 6) g)
      UNION ALL
      SELECT ab.data, 1, 'saida', ab.id, NULL::integer, NULL::uuid
        FROM public.abastecimentos ab
       WHERE ab.client_id = v_client
         AND ab.id IN (SELECT md5('gestao-demo-ab' || lpad(g::text, 2, '0'))::uuid FROM generate_series(1, 35) g)
    ) e
    ORDER BY e.dia, e.ordem, e.seq NULLS LAST, e.ref
  LOOP
    IF r.tipo = 'entrada' THEN
      v_prod := CASE r.ref
        WHEN md5('gestao-demo-it01')::uuid THEN v_diesel
        WHEN md5('gestao-demo-it02')::uuid THEN v_diesel
        WHEN md5('gestao-demo-it03')::uuid THEN v_ureia
        WHEN md5('gestao-demo-it05')::uuid THEN v_ureia
        ELSE v_mancozebe
      END;
      v_almox := CASE WHEN v_prod = v_diesel THEN v_al_diesel ELSE v_al_insumos END;
      PERFORM public.dar_entrada_nota(v_client, jsonb_build_array(jsonb_build_object(
        'origem', 'canonica', 'item_id', r.ref, 'produto_id', v_prod,
        'destino', 'estoque', 'almoxarifado_id', v_almox)));
      v_n_ent := v_n_ent + 1;
    ELSE
      SELECT ab.id, ab.maquina_id, ab.centro_custo_id, ab.litros, ab.data INTO v_ab
        FROM public.abastecimentos ab WHERE ab.id = r.ref;
      PERFORM public.registrar_saida_estoque(
        v_client, v_diesel, v_al_diesel, v_ab.litros, 'abastecimento',
        v_ab.maquina_id, v_ab.centro_custo_id, v_ab.data, NULL, false,
        'abastecimentos', v_ab.id);
      v_n_sai := v_n_sai + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '182: seed do estoque aplicado na conta % (% itens de nota, % abastecimentos processados).', v_client, v_n_ent, v_n_sai;
END
$$;

COMMIT;
