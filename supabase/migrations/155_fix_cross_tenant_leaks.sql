-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 155 — Fix de vazamentos cross-tenant confirmados
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Origem: achado do security-rls-auditor em 06/07/2026.
--
-- CONTEXTO DE ROLES (fundamental para entender cada bloco):
--   · service_role  → usado por rotas server-side; bypassa RLS e grants PostgREST.
--                     Nunca é afetado pelos REVOKEs abaixo (só revogamos anon/authenticated).
--   · authenticated → usuário logado; auth.uid() real → get_my_client_id() = client dele.
--   · anon          → sem sessão; auth.uid() NULL → get_my_client_id() = NULL.
--
-- ⚠️  ARMADILHA DO GUARD: o guard `p_client_id <> get_my_client_id()` NÃO bloqueia
--     anon, porque `NULL <> x` avalia para NULL e o IF não dispara. Por isso todo
--     alvo 🔴 leva guard de posse (contra authenticated malicioso) E REVOKE de anon
--     (contra sessão nula). Cinto e suspensório.
--
-- Verificação de callers (grep em app/ + pg_proc + pg_trigger, 06/07/2026):
--   · generate_lcdpr_txt / register_lcdpr_export → chamados por
--     app/api/fiscal/export-lcdpr/route.ts via createSupabaseServerClient()
--     (publishable key + cookies = role AUTHENTICATED). ⇒ NÃO podemos revogar de
--     authenticated; mantemos grant + adicionamos guard de posse + REVOKE de anon.
--   · create_stock_from_fiscal_note → SEM caller em app/, SEM trigger, SEM outra
--     função que a invoque. Órfã por ora. Guard de posse + REVOKE de anon;
--     authenticated fica com grant inócuo (o guard blinda) para caso uma rota
--     futura a chame autenticada.
--
-- Idempotência: DROP POLICY IF EXISTS; CREATE OR REPLACE FUNCTION; REVOKE é
-- naturalmente idempotente. Migration roda 2x sem erro.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔴 1. generate_lcdpr_txt(p_client_id uuid, p_ano int)
--    Achado 06/07/2026: SECURITY DEFINER lendo LCDPR completo (contas bancárias
--    0050, contabilidade Q100, imóveis, terceiros) de QUALQUER client informado
--    em p_client_id — vazamento total de dados fiscais/bancários entre tenants.
--    Fix: guard de posse no topo do corpo + REVOKE de anon (mantém authenticated,
--    pois a rota /api/fiscal/export-lcdpr chama como authenticated).
--    Corpo preservado byte-a-byte exceto o bloco de guard.
-- ═══════════════════════════════════════════════════════════════════════════════
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
  -- ── GUARD DE POSSE (achado security-rls-auditor 06/07/2026) ──────────────────
  -- Bloqueia authenticated malicioso pedindo client alheio. anon é bloqueado
  -- pelo REVOKE no fim da migration (NULL <> x não dispara este IF).
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

  -- 0000
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

  -- 0010
  v_buffer := v_buffer
    || v_sep || '0010'
    || v_sep || '1'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 0040
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

  -- 0045
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

  -- 0050
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

  -- 0990
  v_buffer := v_buffer
    || v_sep || '0990'
    || v_sep || (2 + v_qtd_imoveis + v_qtd_terceiros + v_qtd_contas + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- Q100
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

  -- Q990
  v_buffer := v_buffer
    || v_sep || 'Q990'
    || v_sep || (v_qtd_q100 + 1)::text
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 9990
  v_buffer := v_buffer
    || v_sep || '9990'
    || v_sep || '2'
    || v_sep || v_crlf;
  v_total_linhas := v_total_linhas + 1;

  -- 9999
  v_buffer := v_buffer
    || v_sep || '9999'
    || v_sep || (v_total_linhas + 1)::text
    || v_sep || v_crlf;

  RETURN v_buffer;
END;
$function$;

-- anon nunca deve gerar LCDPR (get_my_client_id() = NULL fura o guard).
REVOKE EXECUTE ON FUNCTION public.generate_lcdpr_txt(uuid, integer) FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔴 2. register_lcdpr_export(p_client_id uuid, p_ano int)
--    Achado 06/07/2026: mesmo vetor da #1 — chama generate_lcdpr_txt (agora
--    blindada) E faz INSERT em lcdpr_exports com client_id arbitrário, gravando
--    o TXT completo de outro tenant. Precisa do próprio guard antes do INSERT.
--    Fix: guard de posse no topo + REVOKE de anon. Corpo preservado.
-- ═══════════════════════════════════════════════════════════════════════════════
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
  -- ── GUARD DE POSSE (achado security-rls-auditor 06/07/2026) ──────────────────
  -- Bloqueia INSERT de export com client_id alheio. anon barrado pelo REVOKE.
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

-- anon nunca deve registrar export (fura o guard via NULL).
REVOKE EXECUTE ON FUNCTION public.register_lcdpr_export(uuid, integer) FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔴 3. create_stock_from_fiscal_note(p_note_id uuid)
--    Achado 06/07/2026: SECURITY DEFINER que, dado o UUID de uma nota fiscal de
--    OUTRO tenant, cria stock_batches com o client_id da nota alheia (linha
--    `v_note.client_id`) e marca a nota como auto_stock_entry — escrita
--    cross-tenant. Sem caller em app/, sem trigger, sem outra função a invocar.
--    Fix: guard de posse contra v_note.client_id logo após carregar a nota +
--    REVOKE de anon. authenticated mantém grant (guard blinda). Corpo preservado.
-- ═══════════════════════════════════════════════════════════════════════════════
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

  -- ── GUARD DE POSSE (achado security-rls-auditor 06/07/2026) ──────────────────
  -- v_note.client_id é o dono real da nota; se não for o solicitante (e não
  -- admin), aborta. anon é barrado pelo REVOKE abaixo (v_note.client_id <> NULL
  -- não dispara o IF).
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

  -- Mark note as auto_stock_entry done
  UPDATE fiscal_notes SET auto_stock_entry = true WHERE id = p_note_id;

  RETURN v_count;
END;
$function$;

-- anon nunca deve materializar estoque a partir de nota (fura o guard via NULL).
REVOKE EXECUTE ON FUNCTION public.create_stock_from_fiscal_note(uuid) FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔴 4. Policy applications — remover allow_insert_applications
--    Achado 06/07/2026: a policy INSERT `allow_insert_applications` tem
--    WITH CHECK = true, ou seja, permite inserir aplicação sanitária para
--    QUALQUER animal (inclusive de outro tenant), pois políticas PERMISSIVE são
--    OR'd e essa aceita tudo.
--
--    Confirmado via pg_policies (06/07/2026) que a policy `applications_access`
--    (cmd=ALL) EXISTE e cobre INSERT: seu USING é
--       is_admin() OR animal_id IN (SELECT id FROM animals WHERE client_id = get_my_client_id())
--    e, por ter WITH CHECK ausente numa policy ALL, o Postgres reaproveita o USING
--    como WITH CHECK do INSERT — logo o check de posse via animal_id é aplicado.
--    Portanto basta dropar a policy permissiva-demais; a cobertura correta
--    permanece por `applications_access`.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS allow_insert_applications ON public.applications;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟡 5. REVOKE EXECUTE de helpers internos (chamados só por trigger/cascata/rota
--        service). Triggers SECURITY DEFINER rodam com privilégio do owner,
--        independentes do grant de execução ao chamador — então revogar de
--        anon/authenticated não quebra a cascata interna.
--        Assinaturas confirmadas via pg_proc em 06/07/2026 (não inventadas).
--
--    ⚠️  EXCEÇÃO — calculate_farm_score(p_property_id uuid) NÃO está neste bloco:
--        app/agricultura/fazendas/page.tsx a chama como AUTHENTICATED
--        (Server Component + cookies). Revogá-la de authenticated quebraria essa
--        rota. Mantemos grant a authenticated e revogamos só de anon (mais abaixo).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Seed / chart of accounts — só cascata de novo cliente e rota service.
REVOKE EXECUTE ON FUNCTION public._seed_rural_chart_of_accounts(uuid)        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._ensure_chart_account(uuid, text)          FROM anon, authenticated;

-- Recomputes acionados por trigger de eventos (peso, aplicação, venda, etc.).
REVOKE EXECUTE ON FUNCTION public.refresh_animal_passport(uuid)              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_animal_fair_value(uuid)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_reproductive_season_aggregates(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_fiscal_score(uuid)                 FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_compliance_documental_score(uuid)  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_animal_category(uuid)                  FROM anon, authenticated;

-- Motores de score que aceitam UUID arbitrário — só trigger/edge/rota service os
-- chamam. Nenhuma rota do front chama estas assinaturas (a única RPC de score do
-- front aponta para "calculate_agraas_score", função que NEM EXISTE no schema —
-- rota já quebrada; ver risco reportado). Seguro revogar de ambos.
REVOKE EXECUTE ON FUNCTION public.calculate_agraas_score_v3(uuid, text, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_producer_score(uuid)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_field_score(uuid)              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_livestock_score(uuid)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_poultry_score(uuid)            FROM anon, authenticated;

-- calculate_farm_score: revoga só anon (authenticated preservado — ver exceção acima).
REVOKE EXECUTE ON FUNCTION public.calculate_farm_score(uuid)               FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 🟢 NÃO TOCADAS DE PROPÓSITO
--    As funções abaixo são invocadas DENTRO das expressões das próprias policies
--    RLS. Revogar EXECUTE delas de anon/authenticated faria o PostgREST negar o
--    acesso legítimo (a policy não conseguiria avaliar), quebrando toda a app:
--       · get_my_client_id()
--       · is_admin()
--       · is_mentor_externo()
--       · mentor_has_access_to_client(uuid)
--    Deixadas intactas intencionalmente (achado security-rls-auditor 06/07/2026).
-- ═══════════════════════════════════════════════════════════════════════════════
