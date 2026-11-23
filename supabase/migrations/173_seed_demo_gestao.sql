-- ============================================================================
-- 173 · SEED DE DEMONSTRAÇÃO do portal /gestao (mini ERP) — conta demo do Lucas
-- ============================================================================
-- DADO FICTÍCIO (DEMO). Vale SÓ para a conta demo lucas@agraas.com.br
-- (client_id 79c94a7e-b233-4e85-9d72-6d08477c21c9, papel admin), que já é 100%
-- demo. Dado demo nessa conta foi autorizado pelo Lucas (repassado pelo
-- coordinador em 23/11/2026). NUNCA rodar contra outra conta — em especial a
-- FSJBE, que recebe dado real (decisão de 11/09/2026).
--
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10).
-- Depende da 172 (tabelas centros_custo, titulos_financeiros, maquinas,
-- abastecimentos). Rollback: supabase/rollbacks/173_down.sql
--
-- Cenário: fazenda MISTA (Jataí-GO), safra 2026/27, "hoje" = 23/11/2026.
--   7 centros de custo · 4 máquinas · 35 abastecimentos (01/10 a 22/11)
--   4 NF-e demo de entrada (2 diesel + 2 insumos da batata) com 6 itens
--   40 títulos: 14 ligados às notas que JÁ existiam na conta (valores reais
--   delas), 6 ligados às NF-e demo e 20 manuais.
--
-- Idempotência: todo id é md5('gestao-demo-<chave>')::uuid (determinístico);
-- todo INSERT usa ON CONFLICT DO NOTHING sem alvo — cobre o PK e também os
-- índices únicos de parcela (fiscal_invoice_id, numero_parcela), caso o app
-- já tenha importado parcelas de alguma das notas. Rodar 2x não duplica nada.
--
-- Coerência do diesel (é o carro-chefe da demo):
--   comprado  = 4.800 L (NF 18452, 30/09, R$ 6,09) + 3.000 L (NF 18731, 10/11,
--               R$ 6,29) = 7.800 L
--   abastecido = 5.832 L em 35 abastecimentos  ->  saldo teórico 1.968 L.
--   O lote 1 cobre os abastecimentos até 05/11 (4.428 L <= 4.800 L); o preço
--   gravado em cada abastecimento é o do lote que o cobre (FIFO).
--   Consumo: Trator 1 ~15-17 L/h; Trator 2 ~9,5-10,7 L/h; pulverizador
--   ~14,5-16,6 L/h; caminhonete ~9-10 km/L. UM caso fora do padrão de
--   propósito: Trator 1 em 10/11, 246 L em 11,6 h = 21,2 L/h (~+35% sobre a
--   média das demais leituras) para o alerta de consumo aparecer.
--   Títulos de diesel: natureza 'estoque' (o custo entra pelo abastecimento).
--
-- Classificação (regra de casa): todos os preços (diesel, ureia, fungicida,
-- bezerro, boi, arrendamento, folha, energia) são SIMULADO para demo — ordem de
-- grandeza plausível para GO/MG, não cotação. CNPJs 99999999000199 e
-- 99999999000280 são fictícios de propósito (DV inválido, não é empresa real).
-- NCM 3808.92.99 do fungicida é PREMISSA (subitem não conferido na TIPI);
-- 2710.19.21 (diesel) é o que a tela de diesel exige; 3102.10.10 (ureia).
--
-- Fora do seed, de propósito: a nota "217 · PROTON" (energético, não é
-- operação rural) e "PDF-2026-001" (sem valor) — não viram título.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_client uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_prop   uuid;
BEGIN
  -- Guarda 1: a conta demo precisa existir e ser a do Lucas.
  IF NOT EXISTS (SELECT 1 FROM public.clients
                 WHERE id = v_client AND email = 'lucas@agraas.com.br') THEN
    RAISE NOTICE '173: conta demo % não encontrada — seed ignorado.', v_client;
    RETURN;
  END IF;

  -- Guarda 2: a 172 precisa estar aplicada (falha alto, não em silêncio).
  IF to_regclass('public.titulos_financeiros') IS NULL
     OR to_regclass('public.abastecimentos') IS NULL THEN
    RAISE EXCEPTION '173: aplique a 172 antes deste seed.';
  END IF;

  -- Fazenda Santa Cruz (Jataí-GO) da própria conta; NULL se tiver sido apagada.
  SELECT id INTO v_prop FROM public.properties
   WHERE id = '00000000-0000-0002-0001-000000000001' AND client_id = v_client;

  -- ── Centros de custo ─────────────────────────────────────────────────────
  -- crop_field_id fica NULL: os talhões existentes são de safras antigas e
  -- áreas diferentes; ligar criaria contradição de área.
  INSERT INTO public.centros_custo
    (id, client_id, nome, tipo, atividade, cultura, safra, area_ha, cabecas, property_id)
  SELECT md5('gestao-demo-' || k)::uuid, v_client, nome, tipo, atividade, cultura, safra, area, cab, v_prop
  FROM (VALUES
    ('cc01', 'Cria — Nelore',                 'lote_animal',    'bovino_corte', 'Nelore', NULL,      NULL::numeric, 180),
    ('cc02', 'Recria e engorda — Nelore',     'lote_animal',    'bovino_corte', 'Nelore', NULL,      NULL,          120),
    ('cc03', 'Soja 2026/27 — Talhão 1',       'talhao',         'graos',        'soja',   '2026/27', 220,           NULL),
    ('cc04', 'Milho safrinha — Talhão 2',     'talhao',         'graos',        'milho',  '2026/27', 140,           NULL),
    ('cc05', 'Batata irrigada — Pivô 1',      'talhao',         'hortifruti',   'batata', '2026/27', 35,            NULL),
    ('cc06', 'Máquinas e frota',              'maquina',        'geral',        NULL,     NULL,      NULL,          NULL),
    ('cc07', 'Administrativo',                'administrativo', 'geral',        NULL,     NULL,      NULL,          NULL)
  ) AS v(k, nome, tipo, atividade, cultura, safra, area, cab)
  ON CONFLICT DO NOTHING;

  -- ── Máquinas ─────────────────────────────────────────────────────────────
  INSERT INTO public.maquinas (id, client_id, nome, tipo, medidor)
  SELECT md5('gestao-demo-' || k)::uuid, v_client, nome, tipo, medidor
  FROM (VALUES
    ('mq01', 'Trator 1 — 180 cv',          'trator',       'horimetro'),
    ('mq02', 'Trator 2 — 110 cv',          'trator',       'horimetro'),
    ('mq03', 'Pulverizador autopropelido', 'pulverizador', 'horimetro'),
    ('mq04', 'Caminhonete',                'caminhonete',  'odometro')
  ) AS v(k, nome, tipo, medidor)
  ON CONFLICT DO NOTHING;

  -- ── NF-e demo de entrada (diesel + insumos) ─────────────────────────────
  -- access_key com prefixo DEMO-GESTAO: não é chave SEFAZ, não colide com real.
  -- Sem trigger de estoque/contábil em fiscal_invoices (só updated_at).
  INSERT INTO public.fiscal_invoices
    (id, client_id, property_id, access_key, number, series, direction, model,
     issued_at, received_at, issuer_cnpj, issuer_name, issuer_state,
     gross_value, net_value, status, source, needs_human_review)
  SELECT md5('gestao-demo-' || k)::uuid, v_client, v_prop, 'DEMO-GESTAO-' || upper(k), num, '1', 'entrada', '55',
         em, em, cnpj, nome, 'GO', valor, valor, 'reviewed', 'manual', false
  FROM (VALUES
    ('nf01', '18452', timestamptz '2026-09-30 09:40-03', '99999999000199', 'Posto e Distribuidora Demo Ltda', 29232.00),
    ('nf02', '18731', timestamptz '2026-11-10 08:15-03', '99999999000199', 'Posto e Distribuidora Demo Ltda', 18870.00),
    ('nf03', '7720',  timestamptz '2026-10-08 14:20-03', '99999999000280', 'Revenda Agrícola Demo Ltda',      54540.00),
    ('nf04', '7894',  timestamptz '2026-11-06 10:05-03', '99999999000280', 'Revenda Agrícola Demo Ltda',      40940.00)
  ) AS v(k, num, em, cnpj, nome, valor)
  ON CONFLICT DO NOTHING;

  -- Itens: mesma descrição nas duas compras para o histórico de preço agrupar
  -- (ureia R$ 3.150 -> 3.390/t; mancozebe R$ 38,40 -> 41,20/kg; diesel 6,09 -> 6,29/L).
  -- Só entra item se a nota for desta conta (protege contra id pré-existente alheio).
  INSERT INTO public.fiscal_invoice_items
    (id, fiscal_invoice_id, sequence, ncm, cfop, description, quantity, unit, unit_price, total_price)
  SELECT md5('gestao-demo-' || v.k)::uuid, fi.id, seq, ncm, cfop, descr, qtd, un, pu, tot
  FROM (VALUES
    ('it01', 'nf01', 1, '27101921', '5656', 'Óleo diesel S10',              4800::numeric, 'L',  6.09::numeric,  29232.00::numeric),
    ('it02', 'nf02', 1, '27101921', '5656', 'Óleo diesel S10',              3000,          'L',  6.29,           18870.00),
    ('it03', 'nf03', 1, '31021010', '5102', 'Ureia agrícola 46% N',         10,            'T',  3150.00,        31500.00),
    ('it04', 'nf03', 2, '38089299', '5102', 'Fungicida mancozebe 800 WP',   600,           'KG', 38.40,          23040.00),
    ('it05', 'nf04', 1, '31021010', '5102', 'Ureia agrícola 46% N',         6,             'T',  3390.00,        20340.00),
    ('it06', 'nf04', 2, '38089299', '5102', 'Fungicida mancozebe 800 WP',   500,           'KG', 41.20,          20600.00)
  ) AS v(k, nf, seq, ncm, cfop, descr, qtd, un, pu, tot)
  JOIN public.fiscal_invoices fi ON fi.id = md5('gestao-demo-' || v.nf)::uuid AND fi.client_id = v_client
  ON CONFLICT DO NOTHING;

  -- ── Abastecimentos (35) ──────────────────────────────────────────────────
  -- Leitura do medidor no momento do abastecimento; litros repõem o consumido
  -- desde a leitura anterior (método do tanque cheio, o mesmo da tela).
  INSERT INTO public.abastecimentos
    (id, client_id, maquina_id, data, litros, preco_litro, medidor_leitura, operador,
     centro_custo_id, origem, fiscal_invoice_id)
  SELECT md5('gestao-demo-ab' || lpad(n::text, 2, '0'))::uuid, v_client,
         md5('gestao-demo-' || mq)::uuid, d, l, p, leitura, op,
         md5('gestao-demo-' || cc)::uuid, 'manual',
         (SELECT fi.id FROM public.fiscal_invoices fi
           WHERE fi.id = md5('gestao-demo-' || nf)::uuid AND fi.client_id = v_client)
  FROM (VALUES
      ( 1, 'mq04', DATE '2026-10-01', 63, 6.09, 48230.0, 'Edson', 'cc07', 'nf01'),
      ( 2, 'mq01', DATE '2026-10-02', 244, 6.09, 4210.0, 'Valdeci', 'cc03', 'nf01'),
      ( 3, 'mq02', DATE '2026-10-03', 133, 6.09, 6380.5, 'João', 'cc01', 'nf01'),
      ( 4, 'mq03', DATE '2026-10-05', 209, 6.09, 2150.0, 'Marcos', 'cc03', 'nf01'),
      ( 5, 'mq01', DATE '2026-10-06', 241, 6.09, 4225.5, 'Valdeci', 'cc03', 'nf01'),
      ( 6, 'mq02', DATE '2026-10-08', 115, 6.09, 6391.6, 'João', 'cc02', 'nf01'),
      ( 7, 'mq01', DATE '2026-10-09', 253, 6.09, 4241.4, 'Valdeci', 'cc03', 'nf01'),
      ( 8, 'mq04', DATE '2026-10-09', 67, 6.09, 48851.0, 'Edson', 'cc07', 'nf01'),
      ( 9, 'mq03', DATE '2026-10-11', 179, 6.09, 2161.4, 'Marcos', 'cc05', 'nf01'),
      (10, 'mq01', DATE '2026-10-13', 242, 6.09, 4258.0, 'Valdeci', 'cc03', 'nf01'),
      (11, 'mq02', DATE '2026-10-14', 149, 6.09, 6407.0, 'João', 'cc05', 'nf01'),
      (12, 'mq03', DATE '2026-10-15', 174, 6.09, 2172.8, 'Marcos', 'cc03', 'nf01'),
      (13, 'mq01', DATE '2026-10-16', 220, 6.09, 4272.3, 'Valdeci', 'cc03', 'nf01'),
      (14, 'mq04', DATE '2026-10-17', 63, 6.09, 49418.0, 'Edson', 'cc01', 'nf01'),
      (15, 'mq01', DATE '2026-10-20', 236, 6.09, 4287.2, 'Valdeci', 'cc03', 'nf01'),
      (16, 'mq02', DATE '2026-10-21', 118, 6.09, 6419.4, 'João', 'cc01', 'nf01'),
      (17, 'mq01', DATE '2026-10-23', 239, 6.09, 4302.9, 'Valdeci', 'cc03', 'nf01'),
      (18, 'mq04', DATE '2026-10-25', 70, 6.09, 50082.0, 'Edson', 'cc07', 'nf01'),
      (19, 'mq03', DATE '2026-10-26', 194, 6.09, 2184.5, 'Marcos', 'cc03', 'nf01'),
      (20, 'mq01', DATE '2026-10-27', 240, 6.09, 4318.5, 'Valdeci', 'cc03', 'nf01'),
      (21, 'mq02', DATE '2026-10-28', 125, 6.09, 6431.4, 'João', 'cc02', 'nf01'),
      (22, 'mq01', DATE '2026-10-30', 240, 6.09, 4333.5, 'Valdeci', 'cc03', 'nf01'),
      (23, 'mq03', DATE '2026-11-01', 191, 6.09, 2197.7, 'Marcos', 'cc05', 'nf01'),
      (24, 'mq04', DATE '2026-11-03', 63, 6.09, 50702.0, 'Edson', 'cc07', 'nf01'),
      (25, 'mq01', DATE '2026-11-04', 211, 6.09, 4346.0, 'Valdeci', 'cc03', 'nf01'),
      (26, 'mq02', DATE '2026-11-05', 149, 6.09, 6445.7, 'João', 'cc05', 'nf01'),
      -- 27: fora do padrão de propósito (21,2 L/h no Trator 1) — alerta de consumo
      (27, 'mq01', DATE '2026-11-10', 246, 6.29, 4357.6, 'Valdeci', 'cc03', 'nf02'),
      (28, 'mq02', DATE '2026-11-12', 146, 6.29, 6460.9, 'João', 'cc01', 'nf02'),
      (29, 'mq04', DATE '2026-11-12', 66, 6.29, 51374.0, 'Edson', 'cc02', 'nf02'),
      (30, 'mq03', DATE '2026-11-13', 190, 6.29, 2209.9, 'Marcos', 'cc05', 'nf02'),
      (31, 'mq01', DATE '2026-11-17', 209, 6.29, 4371.2, 'Valdeci', 'cc05', 'nf02'),
      (32, 'mq02', DATE '2026-11-18', 149, 6.29, 6474.8, 'João', 'cc02', 'nf02'),
      (33, 'mq03', DATE '2026-11-20', 183, 6.29, 2221.5, 'Marcos', 'cc03', 'nf02'),
      (34, 'mq04', DATE '2026-11-21', 66, 6.29, 52008.0, 'Edson', 'cc07', 'nf02'),
      (35, 'mq02', DATE '2026-11-22', 149, 6.29, 6489.3, 'João', 'cc05', 'nf02')
  ) AS v(n, mq, d, l, p, leitura, op, cc, nf)
  ON CONFLICT DO NOTHING;

  -- ── Títulos ligados às notas que JÁ existiam na conta (valores reais) ────
  -- Vendas de bovino (saída) -> receber, 1 parcela, D+30, já recebidas.
  -- Contraparte = destinatário (na saída o emitente é a própria fazenda); nas
  -- notas NFE-90000x o nome do frigorífico está em issuer_name.
  INSERT INTO public.titulos_financeiros
    (id, client_id, tipo, descricao, contraparte_nome, numero_parcela, valor, vencimento,
     status, data_baixa, valor_baixa, forma_pagamento, centro_custo_id, conta_contabil_id,
     fiscal_invoice_id, origem, natureza)
  SELECT md5('gestao-demo-tt' || lpad(v.n::text, 2, '0'))::uuid, v_client, 'receber',
         'NF-e ' || fi.number || ' · ' || coalesce(nullif(fi.recipient_name, ''), nullif(fi.issuer_name, ''), 'Frigorífico'),
         coalesce(nullif(fi.recipient_name, ''), nullif(fi.issuer_name, '')),
         '001', fi.gross_value, (fi.issued_at AT TIME ZONE 'America/Sao_Paulo')::date + 30,
         'pago', (fi.issued_at AT TIME ZONE 'America/Sao_Paulo')::date + 30, fi.gross_value, 'Transferência',
         md5('gestao-demo-cc02')::uuid,
         (SELECT c.id FROM public.chart_of_accounts c WHERE c.client_id = v_client AND c.code = '4.1.01' LIMIT 1),
         fi.id, 'nfe', 'custo'
  FROM (VALUES
    ( 1, 'fa638339-f31e-433a-bf5c-41c75d6466cf'::uuid),
    ( 2, '14773868-7114-4d38-aa66-2c92a628148e'::uuid),
    ( 3, 'd55c9f1b-601a-4a16-bf0d-4c1cafb2c8c3'::uuid),
    ( 4, '49a66560-d3e5-4b4f-8baa-f9746cf5f88b'::uuid),
    ( 5, '478f8591-37a2-447b-8ca9-49fb4da99a85'::uuid),
    ( 6, 'ffb7458d-a32d-495c-8c39-6d87515398f2'::uuid),
    ( 7, '94398845-d364-4cff-9041-3e35494986db'::uuid),
    ( 8, '2bf37f1b-88c6-4598-9768-8b862ef4486b'::uuid),
    ( 9, '415fe66a-0736-47a9-a745-c4b98e0025db'::uuid),
    (10, 'f0a66dd1-04df-45db-b2ad-a4fae9479787'::uuid),  -- NFE-900002 Marfrig
    (11, '6aaaad9f-1037-4b29-911e-5840f2fc5221'::uuid)   -- NFE-900001 JBS
  ) AS v(n, inv)
  JOIN public.fiscal_invoices fi
    ON fi.id = v.inv AND fi.client_id = v_client AND fi.direction = 'saida'
   AND fi.gross_value > 0 AND fi.issued_at IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- NFE-900003 (entrada, ração, R$ 3.480) -> pagar em 3x de 60/90/120 dias:
  -- 05/10 paga · 04/11 VENCIDA em aberto · 04/12 a vencer (emissão 07/08 BRT).
  INSERT INTO public.titulos_financeiros
    (id, client_id, tipo, descricao, contraparte_nome, numero_parcela, valor, vencimento,
     status, data_baixa, valor_baixa, forma_pagamento, centro_custo_id, conta_contabil_id,
     fiscal_invoice_id, origem, natureza)
  SELECT md5('gestao-demo-tt' || lpad(v.n::text, 2, '0'))::uuid, v_client, 'pagar',
         'NF-e ' || fi.number || ' · ' || coalesce(nullif(fi.issuer_name, ''), 'Fornecedor') || ' · parcela ' || v.par,
         nullif(fi.issuer_name, ''), v.par,
         CASE WHEN v.n = 14 THEN fi.gross_value - 2 * round(fi.gross_value / 3, 2)
              ELSE round(fi.gross_value / 3, 2) END,
         (fi.issued_at AT TIME ZONE 'America/Sao_Paulo')::date + v.dias,
         CASE WHEN v.n = 12 THEN 'pago' ELSE 'aberto' END,
         CASE WHEN v.n = 12 THEN (fi.issued_at AT TIME ZONE 'America/Sao_Paulo')::date + v.dias END,
         CASE WHEN v.n = 12 THEN round(fi.gross_value / 3, 2) END,
         CASE WHEN v.n = 12 THEN 'Boleto' END,
         md5('gestao-demo-cc02')::uuid,
         (SELECT c.id FROM public.chart_of_accounts c WHERE c.client_id = v_client AND c.code = '5.4.02' LIMIT 1),
         fi.id, 'nfe', 'custo'
  FROM (VALUES (12, '001', 60), (13, '002', 90), (14, '003', 120)) AS v(n, par, dias)
  JOIN public.fiscal_invoices fi
    ON fi.id = 'd3c8de17-0aec-4b5d-bf67-4d42cb0bf027'::uuid AND fi.client_id = v_client
   AND fi.direction = 'entrada' AND fi.gross_value > 0 AND fi.issued_at IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- ── Títulos das NF-e demo (16-21) e manuais (22-41) ─────────────────────
  -- tt15 não é usado (numeração reservada); o rollback tolera o buraco.
  INSERT INTO public.titulos_financeiros
    (id, client_id, tipo, descricao, contraparte_nome, contraparte_doc, numero_parcela, valor,
     vencimento, status, data_baixa, valor_baixa, forma_pagamento, centro_custo_id,
     conta_contabil_id, fiscal_invoice_id, origem, natureza)
  SELECT md5('gestao-demo-tt' || lpad(v.n::text, 2, '0'))::uuid, v_client, v.tipo, v.descr, v.cp, v.cpdoc, v.par, v.valor,
         v.venc, v.st, v.baixa,
         CASE WHEN v.st = 'pago' THEN v.valor END,
         CASE WHEN v.st <> 'pago' THEN NULL
              WHEN v.tipo = 'receber' OR v.descr LIKE 'Folha%' THEN 'Transferência'
              ELSE 'Boleto' END,
         md5('gestao-demo-' || v.cc)::uuid,
         (SELECT c.id FROM public.chart_of_accounts c WHERE c.client_id = v_client AND c.code = v.conta LIMIT 1),
         fi.id,
         CASE WHEN v.nf IS NOT NULL THEN 'nfe' ELSE 'manual' END,
         v.nat
  FROM (VALUES
      (16, 'pagar', 'NF-e 18452 · Óleo diesel S10 (4.800 L)', 'Posto e Distribuidora Demo Ltda', '99999999000199', '001', 14616.00, DATE '2026-10-30', 'pago', DATE '2026-10-30', 'cc06', '5.5.02', 'nf01', 'estoque'),
      (17, 'pagar', 'NF-e 18452 · Óleo diesel S10 (4.800 L)', 'Posto e Distribuidora Demo Ltda', '99999999000199', '002', 14616.00, DATE '2026-11-29', 'aberto', NULL, 'cc06', '5.5.02', 'nf01', 'estoque'),
      (18, 'pagar', 'NF-e 18731 · Óleo diesel S10 (3.000 L)', 'Posto e Distribuidora Demo Ltda', '99999999000199', '001', 18870.00, DATE '2026-12-10', 'aberto', NULL, 'cc06', '5.5.02', 'nf02', 'estoque'),
      (19, 'pagar', 'NF-e 7720 · Ureia e fungicida — batata', 'Revenda Agrícola Demo Ltda', '99999999000280', '001', 27270.00, DATE '2026-11-07', 'pago', DATE '2026-11-07', 'cc05', NULL, 'nf03', 'custo'),
      (20, 'pagar', 'NF-e 7720 · Ureia e fungicida — batata', 'Revenda Agrícola Demo Ltda', '99999999000280', '002', 27270.00, DATE '2026-12-07', 'aberto', NULL, 'cc05', NULL, 'nf03', 'custo'),
      (21, 'pagar', 'NF-e 7894 · Ureia e fungicida — batata', 'Revenda Agrícola Demo Ltda', '99999999000280', '001', 40940.00, DATE '2026-11-27', 'aberto', NULL, 'cc05', NULL, 'nf04', 'custo'),
      (22, 'pagar', 'Folha de pagamento — setembro/2026', 'Folha — 5 funcionários', NULL, NULL, 14800.00, DATE '2026-10-05', 'pago', DATE '2026-10-05', 'cc07', NULL, NULL, 'custo'),
      (23, 'pagar', 'Folha de pagamento — outubro/2026', 'Folha — 5 funcionários', NULL, NULL, 14800.00, DATE '2026-11-05', 'pago', DATE '2026-11-05', 'cc07', NULL, NULL, 'custo'),
      (24, 'pagar', 'Folha de pagamento — novembro/2026 (com horas extras do plantio)', 'Folha — 5 funcionários', NULL, NULL, 15350.00, DATE '2026-12-05', 'aberto', NULL, 'cc07', NULL, NULL, 'custo'),
      (25, 'pagar', 'Energia elétrica — Pivô 1 (consumo de setembro)', 'Distribuidora de energia — UC do pivô', NULL, NULL, 16940.00, DATE '2026-10-20', 'pago', DATE '2026-10-20', 'cc05', '5.5.01', NULL, 'custo'),
      (26, 'pagar', 'Energia elétrica — Pivô 1 (consumo de outubro)', 'Distribuidora de energia — UC do pivô', NULL, NULL, 21380.00, DATE '2026-11-20', 'aberto', NULL, 'cc05', '5.5.01', NULL, 'custo'),
      (27, 'pagar', 'Arrendamento de pasto — Retiro (outubro)', 'Arrendante — pasto do Retiro', NULL, NULL, 9500.00, DATE '2026-10-25', 'pago', DATE '2026-10-26', 'cc01', NULL, NULL, 'custo'),
      (28, 'pagar', 'Arrendamento de pasto — Retiro (novembro)', 'Arrendante — pasto do Retiro', NULL, NULL, 9500.00, DATE '2026-11-25', 'aberto', NULL, 'cc01', NULL, NULL, 'custo'),
      (29, 'pagar', 'Arrendamento de pasto — Retiro (dezembro)', 'Arrendante — pasto do Retiro', NULL, NULL, 9500.00, DATE '2026-12-25', 'aberto', NULL, 'cc01', NULL, NULL, 'custo'),
      (30, 'pagar', 'Peças e mão de obra — revisão do Trator 1', 'Oficina e peças agrícolas', NULL, NULL, 4380.00, DATE '2026-11-18', 'aberto', NULL, 'cc06', NULL, NULL, 'custo'),
      (31, 'pagar', 'Sal mineral — cria (120 sacos)', 'Revenda Agrícola Demo Ltda', '99999999000280', NULL, 6240.00, DATE '2026-11-24', 'aberto', NULL, 'cc01', NULL, NULL, 'custo'),
      (32, 'pagar', 'Protocolo IATF — 80 matrizes', 'Veterinário — reprodução', NULL, NULL, 7200.00, DATE '2026-11-30', 'aberto', NULL, 'cc01', '5.2.04', NULL, 'custo'),
      (33, 'pagar', 'Defensivos — dessecação e pré-emergente da soja', 'Revenda Agrícola Demo Ltda', '99999999000280', NULL, 39600.00, DATE '2026-11-10', 'pago', DATE '2026-11-10', 'cc03', NULL, NULL, 'custo'),
      (34, 'pagar', 'Adubo de plantio da soja — parcela 1/2', 'Revenda Agrícola Demo Ltda', '99999999000280', '1/2', 137500.00, DATE '2026-12-15', 'aberto', NULL, 'cc03', NULL, NULL, 'custo'),
      (35, 'pagar', 'Adubo de plantio da soja — parcela 2/2', 'Revenda Agrícola Demo Ltda', '99999999000280', '2/2', 137500.00, DATE '2027-01-15', 'aberto', NULL, 'cc03', NULL, NULL, 'custo'),
      (36, 'pagar', 'Sementes de milho safrinha — reserva (140 ha)', 'Revenda Agrícola Demo Ltda', '99999999000280', NULL, 58800.00, DATE '2027-01-15', 'aberto', NULL, 'cc04', NULL, NULL, 'custo'),
      (37, 'receber', 'Venda de 15 vacas de descarte', 'Frigorífico — abate de descarte', NULL, NULL, 63000.00, DATE '2026-10-20', 'pago', DATE '2026-10-20', 'cc01', '4.1.04', NULL, 'custo'),
      (38, 'receber', 'Venda de 12 bois gordos — embarque 26/11', 'Frigorífico — embarque 26/11', NULL, NULL, 80640.00, DATE '2026-11-26', 'aberto', NULL, 'cc02', '4.1.01', NULL, 'custo'),
      (39, 'receber', 'Venda de 60 bezerros desmamados — parcela 1/2', 'Recriador — compra de bezerros', NULL, '1/2', 69000.00, DATE '2026-11-28', 'aberto', NULL, 'cc01', '4.1.03', NULL, 'custo'),
      (40, 'receber', 'Venda de 60 bezerros desmamados — parcela 2/2', 'Recriador — compra de bezerros', NULL, '2/2', 69000.00, DATE '2026-12-28', 'aberto', NULL, 'cc01', '4.1.03', NULL, 'custo'),
      (41, 'receber', 'Adiantamento — venda a termo de soja 2026/27', 'Trading — contrato a termo', NULL, NULL, 96000.00, DATE '2026-12-15', 'aberto', NULL, 'cc03', NULL, NULL, 'custo')
  ) AS v(n, tipo, descr, cp, cpdoc, par, valor, venc, st, baixa, cc, conta, nf, nat)
  LEFT JOIN public.fiscal_invoices fi
    ON v.nf IS NOT NULL AND fi.id = md5('gestao-demo-' || v.nf)::uuid AND fi.client_id = v_client
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '173: seed demo do /gestao aplicado na conta %.', v_client;
END
$$;

COMMIT;
