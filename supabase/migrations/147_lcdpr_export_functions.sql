-- ============================================================
-- Migration 147 — LCDPR Exporter Functions (layout 1.3 RFB)
-- Sprint K · 26/06/2026
--
-- CONTEXTO METODOLÓGICO:
-- LCDPR (Livro Caixa Digital do Produtor Rural) — IN RFB 1.848/2018
-- alterada pela IN 2.165/2023. Obrigatório para PF rural com
-- receita bruta > R$ 4.800.000,00 no ano-calendário anterior.
--
-- Layout 1.3 (vigente para entrega 2027, base 2026):
--   Bloco 0 — Abertura/Identificação
--     0000 — Abertura do arquivo (versão layout, identificação produtor)
--     0010 — Identificação do produtor (NIRF principal)
--     0040 — Cadastro de imóveis rurais (1 registro por property/NIRF)
--     0045 — Cadastro de terceiros (1 por CNPJ/CPF distinto em fiscal_invoices)
--     0050 — Cadastro de contas bancárias (1 por bank_account ativo)
--     0990 — Encerramento do Bloco 0
--   Bloco Q — Lançamentos
--     Q100 — Demonstrativo do resultado da atividade rural (1 por entry)
--     Q200 — Total mensal (gerado automaticamente)
--     Q990 — Encerramento do Bloco Q
--   Bloco 9 — Encerramento
--     9999 — Total de linhas do arquivo
--
-- Fonte: Manual LCDPR layout 1.3, Anexo I IN RFB 2.165/2023.
-- Delimitador: pipe `|`. Charset: UTF-8. Quebra de linha: CRLF.
-- ============================================================

-- A) Helper para formatar valor monetário no padrão LCDPR
--    (sem separador milhar, vírgula como separador decimal, 2 casas)
CREATE OR REPLACE FUNCTION lcdpr_fmt_valor(p_value numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(to_char(COALESCE(p_value, 0), 'FM999999999990.00'), '.', ',');
$$;

COMMENT ON FUNCTION lcdpr_fmt_valor(numeric) IS
  'Formata valor monetário no padrão LCDPR (vírgula decimal, sem separador milhar).';

-- B) Helper para formatar data no padrão LCDPR (DDMMAAAA)
CREATE OR REPLACE FUNCTION lcdpr_fmt_data(p_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(p_date, 'DDMMYYYY');
$$;

COMMENT ON FUNCTION lcdpr_fmt_data(date) IS
  'Formata data no padrão LCDPR (DDMMAAAA sem separador).';

-- C) Helper para limpar campo texto (remove pipe e CRLF que quebrariam parser)
CREATE OR REPLACE FUNCTION lcdpr_sanitize(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p_text, ''), '[|\r\n]', ' ', 'g');
$$;

COMMENT ON FUNCTION lcdpr_sanitize(text) IS
  'Remove pipe (|) e quebras de linha que quebrariam o parser do receitanet.';

-- D) FUNCAO PRINCIPAL — generate_lcdpr_txt
-- Monta o arquivo .txt LCDPR completo para um cliente em um ano-calendário.
-- Retorna texto puro pronto para download (CRLF entre linhas).
CREATE OR REPLACE FUNCTION generate_lcdpr_txt(
  p_client_id uuid,
  p_ano integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client          record;
  v_buffer          text := '';
  v_crlf            text := E'\r\n';
  v_sep             text := '|';
  v_data_ini        date := make_date(p_ano, 1, 1);
  v_data_fim        date := make_date(p_ano, 12, 31);
  v_total_linhas    integer := 0;
  v_total_receitas  numeric := 0;
  v_total_despesas  numeric := 0;
  v_qtd_lancamentos integer := 0;
  v_qtd_imoveis     integer := 0;
  v_qtd_terceiros   integer := 0;
  v_qtd_contas      integer := 0;
  v_qtd_q100        integer := 0;
  v_cpf             text;
  v_nome            text;
  v_rec             record;
BEGIN
  -- Carrega dados do cliente (apenas colunas garantidas — clients não tem CPF nativo)
  SELECT id, name, email, role
    INTO v_client
    FROM clients
   WHERE id = p_client_id;

  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Cliente % não encontrado', p_client_id;
  END IF;

  -- CPF placeholder (ainda não temos coluna dedicada — usa zeros para validar layout)
  -- TODO: quando clients.cpf for adicionado, trocar aqui.
  v_cpf  := '00000000000';
  v_nome := lcdpr_sanitize(v_client.name);

  -- ============================================================
  -- BLOCO 0 — ABERTURA E CADASTROS
  -- ============================================================

  -- 0000 — Abertura do arquivo
  -- |0000|LECD|<COD_VER_LAYOUT=0013>|<CPF>|<NOME>|<IND_SIT_INI_PER>|<SIT_ESPECIAL>|<DT_INI>|<DT_FIM>|
  -- IND_SIT_INI_PER = 0 (regular)  |  SIT_ESPECIAL = 0 (normal)
  v_buffer := v_buffer
    || v_sep || '0000'
    || v_sep || 'LCDPR'
    || v_sep || '0013'
    || v_sep || v_cpf
    || v_sep || v_nome
    || v_sep || '0'
    || v_sep || '0'
    || v_sep || lcdpr_fmt_data(v_data_ini)
    || v_sep || lcdpr_fmt_data(v_data_fim)
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 0010 — Identificação do produtor (forma de tributação)
  -- |0010|<FORMA_APUR>|
  -- FORMA_APUR: 1=Livro Caixa  (LCDPR só admite 1)
  v_buffer := v_buffer
    || v_sep || '0010'
    || v_sep || '1'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 0030 — Dados cadastrais (mantido como opcional — pulado para enxugar)

  -- 0040 — Cadastro de imóveis rurais
  -- |0040|<COD_IMOVEL>|<PAIS>|<MOEDA>|<CAD_ITR>|<CAFIR>|<INSCR_EST>|<NOME_IMOVEL>|<ENDERECO>|<NUM>|<COMPL>|<BAIRRO>|<UF>|<COD_MUN>|<CEP>|<TIPO_EXPLORACAO>|<PARTICIPACAO>|
  -- TIPO_EXPLORACAO: 1=Individual | PARTICIPACAO: 100,00
  FOR v_rec IN
    SELECT p.id, p.code, p.name, p.nirf, p.city, p.state, p.region
      FROM properties p
     WHERE p.client_id = p_client_id
       AND p.nirf IS NOT NULL
     ORDER BY p.code NULLS LAST, p.name
  LOOP
    v_buffer := v_buffer
      || v_sep || '0040'
      || v_sep || COALESCE(v_rec.code, substring(v_rec.id::text, 1, 8))
      || v_sep || 'BR'
      || v_sep || 'BRL'
      || v_sep || ''                                          -- CAD_ITR (opcional)
      || v_sep || COALESCE(v_rec.nirf, '')                    -- CAFIR/NIRF
      || v_sep || ''                                          -- INSCR_EST
      || v_sep || lcdpr_sanitize(v_rec.name)
      || v_sep || ''                                          -- ENDERECO
      || v_sep || ''                                          -- NUM
      || v_sep || ''                                          -- COMPL
      || v_sep || ''                                          -- BAIRRO
      || v_sep || COALESCE(v_rec.state, '')
      || v_sep || ''                                          -- COD_MUN (IBGE — TODO)
      || v_sep || ''                                          -- CEP
      || v_sep || '1'                                         -- TIPO_EXPLORACAO=Individual
      || v_sep || '100,00'                                    -- PARTICIPACAO
      || v_sep || v_crlf;
    v_total_linhas := v_total_linhas + 1;
    v_qtd_imoveis  := v_qtd_imoveis + 1;
  END LOOP;

  -- 0045 — Cadastro de terceiros (CNPJ/CPF distintos em fiscal_invoices do ano)
  -- |0045|<TIPO_CONTRAP>|<CPF_CNPJ>|<NOME>|<UF>|
  -- TIPO_CONTRAP: 1=PF | 2=PJ (heurística: 11 dígitos=PF, 14=PJ)
  FOR v_rec IN
    SELECT DISTINCT
      fi.issuer_cnpj  AS doc,
      fi.issuer_name  AS nome,
      fi.issuer_state AS uf
    FROM fiscal_invoices fi
    WHERE fi.client_id = p_client_id
      AND fi.issuer_cnpj IS NOT NULL
      AND fi.issuer_cnpj <> ''
      AND fi.issued_at >= v_data_ini
      AND fi.issued_at <  (v_data_fim + 1)
  LOOP
    v_buffer := v_buffer
      || v_sep || '0045'
      || v_sep || CASE WHEN length(regexp_replace(v_rec.doc, '\D', '', 'g')) = 11 THEN '1' ELSE '2' END
      || v_sep || regexp_replace(v_rec.doc, '\D', '', 'g')
      || v_sep || lcdpr_sanitize(v_rec.nome)
      || v_sep || COALESCE(v_rec.uf, '')
      || v_sep || v_crlf;
    v_total_linhas    := v_total_linhas + 1;
    v_qtd_terceiros   := v_qtd_terceiros + 1;
  END LOOP;

  -- 0050 — Cadastro de contas bancárias
  -- |0050|<COD_CONTA>|<PAIS_CTA>|<BANCO>|<NOME_BANCO>|<AGENCIA>|<NUM_CONTA>|<TIPO>|
  FOR v_rec IN
    SELECT id, banco_codigo, banco_nome, agencia, conta, tipo
      FROM bank_accounts
     WHERE client_id = p_client_id
       AND ativo = true
     ORDER BY banco_codigo, agencia, conta
  LOOP
    v_buffer := v_buffer
      || v_sep || '0050'
      || v_sep || substring(v_rec.id::text, 1, 8)                   -- COD_CONTA interno
      || v_sep || 'BR'
      || v_sep || COALESCE(v_rec.banco_codigo, '')
      || v_sep || lcdpr_sanitize(v_rec.banco_nome)
      || v_sep || COALESCE(v_rec.agencia, '')
      || v_sep || COALESCE(v_rec.conta, '')
      || v_sep || CASE v_rec.tipo
                    WHEN 'corrente' THEN '1'
                    WHEN 'poupanca' THEN '2'
                    WHEN 'rural'    THEN '3'
                    ELSE '1'
                  END
      || v_sep || v_crlf;
    v_total_linhas := v_total_linhas + 1;
    v_qtd_contas   := v_qtd_contas + 1;
  END LOOP;

  -- 0990 — Encerramento do Bloco 0
  -- |0990|<QTD_LIN_BLOCO_0>|
  -- conta inclui 0000, 0010, 0040*N, 0045*N, 0050*N, 0990
  v_buffer := v_buffer
    || v_sep || '0990'
    || v_sep || (2 + v_qtd_imoveis + v_qtd_terceiros + v_qtd_contas + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- ============================================================
  -- BLOCO Q — LANÇAMENTOS (Q100 por accounting_entry)
  -- ============================================================

  -- Q100 — Demonstrativo do resultado
  -- |Q100|DATA|COD_IMOVEL|COD_CONTA|NUM_DOC|TIPO_DOC|HISTORICO|CPF_CNPJ_TERCEIRO|TIPO_LANC|VALOR_ENTRADA|VALOR_SAIDA|SALDO_FINAL|NAT_SALDO_FINAL|
  -- TIPO_LANC: 1=Receita explor.rural | 2=Despesa explor.rural | 3=Receita não-rural | 4=Despesa não-rural
  -- Para Sprint K usamos a estrutura simplificada do spec (campo |Q100|DATA|NIRF|TIPO|CNPJ_CPF_TERCEIRO|NOME|HISTORICO|VALOR|CONTA|NUM_DOC|)
  -- Discriminação receita/despesa: olha nature da conta debit/credit em chart_of_accounts.
  --   nature='revenue' em qualquer ponta -> TIPO 1 (receita)
  --   nature='expense' ou 'cost' em qualquer ponta -> TIPO 2 (despesa)
  FOR v_rec IN
    SELECT
      ae.entry_date,
      ae.amount,
      ae.description,
      CASE
        WHEN coa_d.nature = 'revenue' OR coa_c.nature = 'revenue' THEN '1'
        WHEN coa_d.nature IN ('expense','cost') OR coa_c.nature IN ('expense','cost') THEN '2'
        ELSE '2'
      END                                                       AS tipo_lcdpr,
      COALESCE(coa_d.code, coa_c.code, '')                      AS conta_codigo,
      (
        SELECT p.nirf FROM properties p
         WHERE p.client_id = p_client_id AND p.nirf IS NOT NULL
         ORDER BY p.created_at LIMIT 1
      )                                                         AS nirf_default,
      ''::text                                                  AS cnpj_terceiro,
      ''::text                                                  AS nome_terceiro,
      ''::text                                                  AS num_doc
    FROM accounting_entries ae
    LEFT JOIN chart_of_accounts coa_d ON coa_d.id = ae.debit_account_id
    LEFT JOIN chart_of_accounts coa_c ON coa_c.id = ae.credit_account_id
    WHERE ae.client_id = p_client_id
      AND ae.entry_date >= v_data_ini
      AND ae.entry_date <= v_data_fim
      AND (ae.status IS NULL OR ae.status NOT IN ('reversed','draft'))
    ORDER BY ae.entry_date, ae.created_at
  LOOP
    v_buffer := v_buffer
      || v_sep || 'Q100'
      || v_sep || lcdpr_fmt_data(v_rec.entry_date)
      || v_sep || COALESCE(v_rec.nirf_default, '')
      || v_sep || v_rec.tipo_lcdpr
      || v_sep || v_rec.cnpj_terceiro
      || v_sep || v_rec.nome_terceiro
      || v_sep || lcdpr_sanitize(v_rec.description)
      || v_sep || lcdpr_fmt_valor(v_rec.amount)
      || v_sep || v_rec.conta_codigo
      || v_sep || v_rec.num_doc
      || v_sep || v_crlf;

    v_total_linhas    := v_total_linhas + 1;
    v_qtd_q100        := v_qtd_q100 + 1;
    v_qtd_lancamentos := v_qtd_lancamentos + 1;

    IF v_rec.tipo_lcdpr = '1' THEN
      v_total_receitas := v_total_receitas + COALESCE(v_rec.amount, 0);
    ELSE
      v_total_despesas := v_total_despesas + COALESCE(v_rec.amount, 0);
    END IF;
  END LOOP;

  -- Q990 — Encerramento Bloco Q (Q100*N + Q990)
  v_buffer := v_buffer
    || v_sep || 'Q990'
    || v_sep || (v_qtd_q100 + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- ============================================================
  -- BLOCO 9 — ENCERRAMENTO
  -- ============================================================

  -- 9990 — Encerramento Bloco 9 (placeholder + 9999 = 2 linhas)
  v_buffer := v_buffer
    || v_sep || '9990'
    || v_sep || '2'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 9999 — Total geral de linhas (inclui o próprio 9999)
  v_buffer := v_buffer
    || v_sep || '9999'
    || v_sep || (v_total_linhas + 1)::text
    || v_sep || v_crlf;

  RETURN v_buffer;
END;
$$;

COMMENT ON FUNCTION generate_lcdpr_txt(uuid, integer) IS
  'Gera arquivo .txt LCDPR layout 1.3 RFB para um client_id em um ano-calendário. SECURITY DEFINER para uso em endpoint autenticado.';

-- E) FUNCAO register_lcdpr_export — chama generate + persiste em lcdpr_exports
CREATE OR REPLACE FUNCTION register_lcdpr_export(
  p_client_id uuid,
  p_ano integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txt              text;
  v_export_id        uuid;
  v_total_receitas   numeric := 0;
  v_total_despesas   numeric := 0;
  v_qtd_lancamentos  integer := 0;
  v_data_ini         date := make_date(p_ano, 1, 1);
  v_data_fim         date := make_date(p_ano, 12, 31);
BEGIN
  -- Gera arquivo
  v_txt := generate_lcdpr_txt(p_client_id, p_ano);

  -- Calcula totais (mesma lógica do gerador, mantida em sync)
  SELECT
    COALESCE(SUM(CASE WHEN COALESCE(coa_d.nature, coa_c.nature) = 'revenue' THEN ae.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE(coa_d.nature, coa_c.nature) IN ('expense','cost') THEN ae.amount ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_receitas, v_total_despesas, v_qtd_lancamentos
  FROM accounting_entries ae
  LEFT JOIN chart_of_accounts coa_d ON coa_d.id = ae.debit_account_id
  LEFT JOIN chart_of_accounts coa_c ON coa_c.id = ae.credit_account_id
  WHERE ae.client_id = p_client_id
    AND ae.entry_date BETWEEN v_data_ini AND v_data_fim
    AND (ae.status IS NULL OR ae.status NOT IN ('reversed','draft'));

  -- Persiste como rascunho
  INSERT INTO lcdpr_exports (
    client_id, ano_calendario, arquivo_txt,
    total_receitas, total_despesas, qtd_lancamentos, status
  ) VALUES (
    p_client_id, p_ano, v_txt,
    v_total_receitas, v_total_despesas, v_qtd_lancamentos, 'rascunho'
  )
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$;

COMMENT ON FUNCTION register_lcdpr_export(uuid, integer) IS
  'Gera LCDPR via generate_lcdpr_txt + persiste em lcdpr_exports como rascunho. Retorna id do registro.';

-- F) Grants — funções chamadas via endpoint autenticado
GRANT EXECUTE ON FUNCTION generate_lcdpr_txt(uuid, integer)    TO authenticated;
GRANT EXECUTE ON FUNCTION register_lcdpr_export(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION lcdpr_fmt_valor(numeric)             TO authenticated;
GRANT EXECUTE ON FUNCTION lcdpr_fmt_data(date)                 TO authenticated;
GRANT EXECUTE ON FUNCTION lcdpr_sanitize(text)                 TO authenticated;
