-- ============================================================
-- Migration 145 — Plano de Contas Rural completo (CFC/CPC 29)
-- Sprint J · 24/06/2026
--
-- CONTEXTO METODOLÓGICO:
-- - Estrutura segue NBC TG 1000 (PMEs) + CPC 29 (Ativo Biológico)
-- - Hierarquia: 1 Ativo · 2 Passivo · 3 PL · 4 Receitas · 5 Custos · 6 Despesas
-- - Custos separados por fase produtiva (cria/recria/engorda) — exigência CPC 29
-- - Contas IBS/CBS adicionadas (LC 214/2025)
-- - CPC 29 sinalizado via nova coluna `cpc29_categoria`
--
-- COMPATIBILIDADE LEGADA:
-- - Schema existente usa codes (1.1.01, 2.1.05, 3.1.01 como "Receita", 5.1.01, 5.2.xx)
-- - Plano padrão preserva esses códigos exatos e adiciona novos.
-- - _ensure_chart_account e _fn_sales_accounting continuam funcionando.
-- ============================================================

-- A) Adicionar coluna CPC 29 categoria (ativo biológico)
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS cpc29_categoria text
    CHECK (cpc29_categoria IN ('ativo_biologico_circulante','ativo_biologico_nao_circulante','produto_agricola'));

COMMENT ON COLUMN chart_of_accounts.cpc29_categoria IS
  'Classificação CPC 29 (Ativo Biológico) — exigida para mensuração a valor justo no encerramento.';

-- B) Função idempotente para popular plano de contas rural completo
CREATE OR REPLACE FUNCTION _seed_rural_chart_of_accounts(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  -- ATIVO (1.x) ----------------------------------------------------
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '1',       'ATIVO',                                    'asset', NULL,            NULL, true),
    (p_client_id, '1.1',     'Ativo Circulante',                         'asset', 'current_asset', NULL, true),
    (p_client_id, '1.1.01',  'Caixa e equivalentes',                     'asset', 'current_asset', NULL, true),
    (p_client_id, '1.1.02',  'Bancos conta movimento',                   'asset', 'current_asset', NULL, true),
    (p_client_id, '1.1.03',  'Estoque (insumos/animais)',                'asset', 'inventory',     NULL, true),
    (p_client_id, '1.1.03.01','Estoque de insumos sanitários',           'asset', 'inventory',     NULL, true),
    (p_client_id, '1.1.03.02','Estoque de rações e suplementos',         'asset', 'inventory',     NULL, true),
    (p_client_id, '1.1.03.03','Estoque de defensivos e fertilizantes',   'asset', 'inventory',     NULL, true),
    (p_client_id, '1.1.04',  'Clientes a receber',                       'asset', 'receivable',    NULL, true),
    (p_client_id, '1.1.05',  'Créditos fiscais a recuperar',             'asset', 'tax_credit',    NULL, true),
    (p_client_id, '1.1.05.01','ICMS a recuperar',                        'asset', 'tax_credit',    NULL, true),
    (p_client_id, '1.1.05.02','PIS/Cofins a recuperar',                  'asset', 'tax_credit',    NULL, true),
    (p_client_id, '1.1.05.03','CBS crédito presumido a recuperar',       'asset', 'tax_credit',    NULL, true),
    (p_client_id, '1.1.05.04','IBS crédito presumido a recuperar',       'asset', 'tax_credit',    NULL, true),
    (p_client_id, '1.1.06',  'Ativos biológicos — circulante',           'asset', 'biological',    'ativo_biologico_circulante', true),
    (p_client_id, '1.1.06.01','Bovinos em engorda (terminação)',         'asset', 'biological',    'ativo_biologico_circulante', true),
    (p_client_id, '1.1.06.02','Bovinos em recria',                       'asset', 'biological',    'ativo_biologico_circulante', true),
    (p_client_id, '1.1.06.03','Bezerros (cria)',                         'asset', 'biological',    'ativo_biologico_circulante', true),
    (p_client_id, '1.2',     'Ativo Não Circulante',                     'asset', 'non_current_asset', NULL, true),
    (p_client_id, '1.2.01',  'Ativos biológicos — não circulante',       'asset', 'biological',    'ativo_biologico_nao_circulante', true),
    (p_client_id, '1.2.01.01','Matrizes (vacas reprodutoras)',           'asset', 'biological',    'ativo_biologico_nao_circulante', true),
    (p_client_id, '1.2.01.02','Touros reprodutores',                     'asset', 'biological',    'ativo_biologico_nao_circulante', true),
    (p_client_id, '1.2.02',  'Imobilizado',                              'asset', 'ppe',           NULL, true),
    (p_client_id, '1.2.02.01','Terras',                                  'asset', 'ppe',           NULL, true),
    (p_client_id, '1.2.02.02','Benfeitorias e instalações',              'asset', 'ppe',           NULL, true),
    (p_client_id, '1.2.02.03','Máquinas e equipamentos',                 'asset', 'ppe',           NULL, true),
    (p_client_id, '1.2.02.04','Veículos',                                'asset', 'ppe',           NULL, true),
    (p_client_id, '1.2.02.99','(-) Depreciação acumulada',               'asset', 'ppe',           NULL, true)
  ON CONFLICT (client_id, code) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- PASSIVO (2.x) --------------------------------------------------
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '2',       'PASSIVO',                                  'liability', NULL, NULL, true),
    (p_client_id, '2.1',     'Passivo Circulante',                       'liability', 'current_liability', NULL, true),
    (p_client_id, '2.1.01',  'Fornecedores a pagar',                     'liability', 'payable',       NULL, true),
    (p_client_id, '2.1.02',  'Salários e encargos a pagar',              'liability', 'payable',       NULL, true),
    (p_client_id, '2.1.03',  'Obrigações fiscais — federais',            'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.03.01','ICMS a recolher',                         'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.03.02','PIS a recolher',                          'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.03.03','Cofins a recolher',                       'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.03.04','CBS a recolher (LC 214/2025)',            'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.03.05','IBS a recolher (LC 214/2025)',            'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.04',  'Empréstimos e financiamentos — curto prazo','liability','loan',         NULL, true),
    (p_client_id, '2.1.05',  'FUNRURAL a recolher',                      'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.1.06',  'IRPF a recolher',                          'liability', 'tax_payable',   NULL, true),
    (p_client_id, '2.2',     'Passivo Não Circulante',                   'liability', 'non_current_liability', NULL, true),
    (p_client_id, '2.2.01',  'Financiamentos rurais — longo prazo (Pronaf/Pronamp)','liability','loan',NULL, true),
    (p_client_id, '2.2.02',  'CPR — Cédula de Produto Rural',            'liability', 'loan',          NULL, true)
  ON CONFLICT (client_id, code) DO NOTHING;

  -- PATRIMÔNIO LÍQUIDO (3.x) ---------------------------------------
  -- IMPORTANTE: 3.1.01 já é usado como "Receita de venda" no legado.
  -- Preservamos esse código e adicionamos PL em 3.2.xx.
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '3',       'PATRIMÔNIO LÍQUIDO',                       'equity',  NULL,             NULL, true),
    (p_client_id, '3.1.01',  'Receita de venda de animais',              'revenue', 'sales_revenue',  NULL, true),
    (p_client_id, '3.2',     'Capital e reservas',                       'equity',  'equity_capital', NULL, true),
    (p_client_id, '3.2.01',  'Capital social',                           'equity',  'equity_capital', NULL, true),
    (p_client_id, '3.2.02',  'Reservas de lucros',                       'equity',  'reserve',        NULL, true),
    (p_client_id, '3.2.03',  'Resultado do exercício',                   'equity',  'retained',       NULL, true),
    (p_client_id, '3.2.04',  'Ajuste de avaliação patrimonial — AVJ ativos biológicos','equity','equity_adjustment',NULL,true)
  ON CONFLICT (client_id, code) DO NOTHING;

  -- RECEITAS (4.x) -------------------------------------------------
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '4',       'RECEITAS',                                 'revenue', NULL,                  NULL, true),
    (p_client_id, '4.1',     'Receita operacional bruta',                'revenue', 'sales_revenue',       NULL, true),
    (p_client_id, '4.1.01',  'Venda de bovinos terminados',              'revenue', 'sales_revenue',       NULL, true),
    (p_client_id, '4.1.02',  'Venda de bovinos para recria',             'revenue', 'sales_revenue',       NULL, true),
    (p_client_id, '4.1.03',  'Venda de bezerros (cria)',                 'revenue', 'sales_revenue',       NULL, true),
    (p_client_id, '4.1.04',  'Venda de matrizes e reprodutores',         'revenue', 'sales_revenue',       NULL, true),
    (p_client_id, '4.2',     'Outras receitas operacionais',             'revenue', 'other_revenue',       NULL, true),
    (p_client_id, '4.2.01',  'Variação a valor justo — ativos biológicos','revenue','fair_value_change',  NULL, true),
    (p_client_id, '4.2.02',  'Subvenções e auxílios governamentais',     'revenue', 'other_revenue',       NULL, true),
    (p_client_id, '4.2.03',  'Receitas com créditos de carbono',         'revenue', 'other_revenue',       NULL, true),
    (p_client_id, '4.9',     '(-) Deduções da receita',                  'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.01',  '(-) ICMS sobre vendas',                    'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.02',  '(-) PIS/Cofins sobre vendas',              'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.03',  '(-) CBS sobre vendas (LC 214/2025)',       'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.04',  '(-) IBS sobre vendas (LC 214/2025)',       'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.05',  '(-) FUNRURAL sobre vendas',                'revenue', 'revenue_deduction',   NULL, true),
    (p_client_id, '4.9.06',  '(-) Devoluções e descontos',               'revenue', 'revenue_deduction',   NULL, true)
  ON CONFLICT (client_id, code) DO NOTHING;

  -- CUSTOS (5.x) — separados por fase produtiva (CPC 29) -----------
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '5',       'CUSTOS DE PRODUÇÃO',                       'cost', NULL,            NULL, true),
    (p_client_id, '5.1.01',  'CMV — Custo de mercadoria vendida',        'cost', 'cogs',          NULL, true),
    (p_client_id, '5.2',     'Custo da fase de CRIA',                    'cost', 'cogs',          NULL, true),
    (p_client_id, '5.2.01',  'Cria — Sanidade (vacinas/medicamentos)',   'cost', 'cogs',          NULL, true),
    (p_client_id, '5.2.02',  'Cria — Nutrição (leite, ração inicial, sal)','cost','cogs',         NULL, true),
    (p_client_id, '5.2.03',  'Cria — Mão de obra direta',                'cost', 'cogs',          NULL, true),
    (p_client_id, '5.2.04',  'Cria — Reprodução e genética (sêmen/IATF)','cost', 'cogs',          NULL, true),
    (p_client_id, '5.3',     'Custo da fase de RECRIA',                  'cost', 'cogs',          NULL, true),
    (p_client_id, '5.3.01',  'Recria — Sanidade',                        'cost', 'cogs',          NULL, true),
    (p_client_id, '5.3.02',  'Recria — Suplementação mineral e proteica','cost', 'cogs',          NULL, true),
    (p_client_id, '5.3.03',  'Recria — Manejo de pasto',                 'cost', 'cogs',          NULL, true),
    (p_client_id, '5.3.04',  'Recria — Mão de obra direta',              'cost', 'cogs',          NULL, true),
    (p_client_id, '5.4',     'Custo da fase de ENGORDA (terminação)',    'cost', 'cogs',          NULL, true),
    (p_client_id, '5.4.01',  'Engorda — Confinamento (ração/silagem)',   'cost', 'cogs',          NULL, true),
    (p_client_id, '5.4.02',  'Engorda — Suplementação a pasto',          'cost', 'cogs',          NULL, true),
    (p_client_id, '5.4.03',  'Engorda — Sanidade (final do ciclo)',      'cost', 'cogs',          NULL, true),
    (p_client_id, '5.4.04',  'Engorda — Mão de obra direta',             'cost', 'cogs',          NULL, true),
    (p_client_id, '5.5',     'Custos comuns (rateáveis por fase)',       'cost', 'cogs',          NULL, true),
    (p_client_id, '5.5.01',  'Energia elétrica rural',                   'cost', 'cogs',          NULL, true),
    (p_client_id, '5.5.02',  'Combustíveis e lubrificantes',             'cost', 'cogs',          NULL, true),
    (p_client_id, '5.5.03',  'Manutenção de cercas e benfeitorias',      'cost', 'cogs',          NULL, true),
    (p_client_id, '5.5.04',  'Depreciação imobilizado rural',            'cost', 'cogs',          NULL, true),
    (p_client_id, '5.6',     'Aquisição de animais',                     'cost', 'animal_purchase', NULL, true),
    (p_client_id, '5.6.01',  'Compra de bezerros para recria',           'cost', 'animal_purchase', NULL, true),
    (p_client_id, '5.6.02',  'Compra de boi magro para engorda',         'cost', 'animal_purchase', NULL, true),
    (p_client_id, '5.6.03',  'Compra de matrizes',                       'cost', 'animal_purchase', NULL, true)
  ON CONFLICT (client_id, code) DO NOTHING;

  -- DESPESAS (6.x) -------------------------------------------------
  INSERT INTO chart_of_accounts (client_id, code, name, nature, subtype, cpc29_categoria, is_active) VALUES
    (p_client_id, '6',       'DESPESAS',                                 'expense', NULL,           NULL, true),
    (p_client_id, '6.1',     'Despesas administrativas',                 'expense', 'opex',         NULL, true),
    (p_client_id, '6.1.01',  'Salários e encargos administrativos',      'expense', 'opex',         NULL, true),
    (p_client_id, '6.1.02',  'Honorários contábeis e jurídicos',         'expense', 'opex',         NULL, true),
    (p_client_id, '6.1.03',  'Material de escritório e TI',              'expense', 'opex',         NULL, true),
    (p_client_id, '6.1.04',  'Telecomunicações e internet rural',        'expense', 'opex',         NULL, true),
    (p_client_id, '6.1.05',  'Seguros administrativos',                  'expense', 'opex',         NULL, true),
    (p_client_id, '6.2',     'Despesas comerciais',                      'expense', 'opex',         NULL, true),
    (p_client_id, '6.2.01',  'Comissões de venda',                       'expense', 'opex',         NULL, true),
    (p_client_id, '6.2.02',  'Fretes sobre vendas (boiadeiro)',          'expense', 'opex',         NULL, true),
    (p_client_id, '6.2.03',  'GTA, brincos RFID, custos de embarque',    'expense', 'opex',         NULL, true),
    (p_client_id, '6.3',     'Despesas financeiras',                     'expense', 'financial',    NULL, true),
    (p_client_id, '6.3.01',  'Juros de financiamentos rurais',           'expense', 'financial',    NULL, true),
    (p_client_id, '6.3.02',  'Tarifas bancárias',                        'expense', 'financial',    NULL, true),
    (p_client_id, '6.3.03',  'IOF',                                      'expense', 'financial',    NULL, true),
    (p_client_id, '6.4',     'Despesas de rastreabilidade e compliance', 'expense', 'opex',         NULL, true),
    (p_client_id, '6.4.01',  'Certificações (Halal, SISBOV, EUDR)',      'expense', 'opex',         NULL, true),
    (p_client_id, '6.4.02',  'Software de gestão (SaaS)',                'expense', 'opex',         NULL, true),
    (p_client_id, '6.4.03',  'Auditorias e consultorias técnicas',       'expense', 'opex',         NULL, true),
    (p_client_id, '6.5',     'Outras despesas operacionais',             'expense', 'opex',         NULL, true)
  ON CONFLICT (client_id, code) DO NOTHING;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION _seed_rural_chart_of_accounts(uuid) IS
  'Popula plano de contas rural completo (CPC 29 / NBC TG 1000) para um cliente. Idempotente via ON CONFLICT.';

-- C) Aplicar plano a TODOS os clientes existentes (idempotente)
DO $$
DECLARE
  r record;
  total_clients integer := 0;
BEGIN
  FOR r IN SELECT id FROM clients LOOP
    PERFORM _seed_rural_chart_of_accounts(r.id);
    total_clients := total_clients + 1;
  END LOOP;
  RAISE NOTICE 'Plano de contas rural aplicado a % clientes.', total_clients;
END $$;
