-- ============================================================================
-- 167 down · Reverte guard de posse para a forma anterior (vulnerável a NULL)
-- ============================================================================
-- Só usar se a 167 causar regressão inesperada (ex.: fluxo legítimo que
-- dependia do comportamento antigo). Reintroduz o furo documentado na 167 —
-- não aplicar sem certeza de que é isso que se quer.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_farm_score(p_property_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid; v_score_avg numeric; v_count integer;
BEGIN
  SELECT pr.client_id INTO v_client_id FROM public.properties pr WHERE pr.id = p_property_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_client_id <> get_my_client_id() AND NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  SELECT AVG(s.total_score), count(*) INTO v_score_avg, v_count
    FROM public.animal_scores s JOIN public.animals a ON a.id = s.animal_id
   WHERE a.current_property_id = p_property_id AND s.score_status = 'current';
  INSERT INTO public.farm_scores (property_id, client_id, score_total, score_rebanho, animals_count_active, algorithm_version, updated_at)
  VALUES (p_property_id, v_client_id, COALESCE(v_score_avg, 0), COALESCE(v_score_avg, 0), COALESCE(v_count, 0), 'v3', now())
  ON CONFLICT (property_id) DO UPDATE SET
    score_total = EXCLUDED.score_total, score_rebanho = EXCLUDED.score_rebanho,
    animals_count_active = EXCLUDED.animals_count_active, client_id = EXCLUDED.client_id,
    algorithm_version = 'v3', updated_at = now();
  RETURN v_score_avg;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_stock_from_fiscal_note(p_note_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_note   RECORD;
  v_item   RECORD;
  v_count  integer := 0;
BEGIN
  SELECT id, client_id, supplier_id, numero_nota FROM fiscal_notes
  WHERE id = p_note_id INTO v_note;

  IF v_note IS NULL THEN
    RAISE EXCEPTION 'Nota fiscal não encontrada';
  END IF;

  IF v_note.client_id <> get_my_client_id() AND NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  FOR v_item IN
    SELECT descricao, ncm, quantidade, valor_unitario, valor_total
    FROM fiscal_note_items
    WHERE note_id = p_note_id
  LOOP
    INSERT INTO stock_batches (
      client_id, product_id, batch_number, quantity, quantity_received, quantity_available,
      unit_cost, entry_date, supplier_id, supplier_name, document_source, expiration_date
    ) VALUES (
      v_note.client_id,
      NULL,
      'NF-' || COALESCE(v_note.numero_nota, 'SN') || '-' || (v_count + 1),
      COALESCE(v_item.quantidade, 0),
      COALESCE(v_item.quantidade, 0),
      COALESCE(v_item.quantidade, 0),
      v_item.valor_unitario,
      now()::date,
      v_note.supplier_id,
      v_item.descricao,
      'nfe_' || v_note.numero_nota,
      (now() + interval '1 year')::date
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE fiscal_notes SET auto_stock_entry = true WHERE id = p_note_id;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_lcdpr_txt(p_client_id uuid, p_ano integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF p_client_id <> get_my_client_id() AND NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  SELECT id, name, email, role
    INTO v_client
    FROM clients
   WHERE id = p_client_id;

  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Cliente % não encontrado', p_client_id;
  END IF;

  v_cpf  := '00000000000';
  v_nome := lcdpr_sanitize(v_client.name);

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

  v_buffer := v_buffer
    || v_sep || '0010'
    || v_sep || '1'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

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
      || v_sep || ''
      || v_sep || COALESCE(v_rec.nirf, '')
      || v_sep || ''
      || v_sep || lcdpr_sanitize(v_rec.name)
      || v_sep || ''
      || v_sep || ''
      || v_sep || ''
      || v_sep || ''
      || v_sep || COALESCE(v_rec.state, '')
      || v_sep || ''
      || v_sep || ''
      || v_sep || '1'
      || v_sep || '100,00'
      || v_sep || v_crlf;
    v_total_linhas := v_total_linhas + 1;
    v_qtd_imoveis  := v_qtd_imoveis + 1;
  END LOOP;

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

  FOR v_rec IN
    SELECT id, banco_codigo, banco_nome, agencia, conta, tipo
      FROM bank_accounts
     WHERE client_id = p_client_id
       AND ativo = true
     ORDER BY banco_codigo, agencia, conta
  LOOP
    v_buffer := v_buffer
      || v_sep || '0050'
      || v_sep || substring(v_rec.id::text, 1, 8)
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

  v_buffer := v_buffer
    || v_sep || '0990'
    || v_sep || (2 + v_qtd_imoveis + v_qtd_terceiros + v_qtd_contas + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

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

  v_buffer := v_buffer
    || v_sep || 'Q990'
    || v_sep || (v_qtd_q100 + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  v_buffer := v_buffer
    || v_sep || '9990'
    || v_sep || '2'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  v_buffer := v_buffer
    || v_sep || '9999'
    || v_sep || (v_total_linhas + 1)::text
    || v_sep || v_crlf;

  RETURN v_buffer;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_lcdpr_export(p_client_id uuid, p_ano integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_txt              text;
  v_export_id        uuid;
  v_total_receitas   numeric := 0;
  v_total_despesas   numeric := 0;
  v_qtd_lancamentos  integer := 0;
  v_data_ini         date := make_date(p_ano, 1, 1);
  v_data_fim         date := make_date(p_ano, 12, 31);
BEGIN
  IF p_client_id <> get_my_client_id() AND NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  v_txt := generate_lcdpr_txt(p_client_id, p_ano);

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
$function$;

GRANT EXECUTE ON FUNCTION public.create_stock_from_fiscal_note(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_farm_score(uuid) TO authenticated;

COMMIT;
