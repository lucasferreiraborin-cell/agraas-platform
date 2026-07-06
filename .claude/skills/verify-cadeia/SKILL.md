---
name: verify-cadeia
description: Verificação automática da cadeia fiscal→estoque→custo→venda→ROI→score no banco vivo da Agraas, via API REST do Supabase (não depende do MCP). Confere se os números fecham e sinaliza inconsistências antes de qualquer demo ou deploy. Trigger keywords "verifica cadeia", "os números fecham?", "/verify-cadeia", "triangulação", "checagem fiscal".
---

# Verify Cadeia — checagem viva da integridade fiscal-contábil

Skill que confirma, em segundos e contra o banco de produção, se a cadeia que sustenta a tese da Agraas está consistente. Roda antes de demo institucional (BTG, Bradesco, JBS), antes de deploy que toca migration, ou sob demanda quando o Lucas pergunta "os números fecham?".

## Por que existe

A cadeia `NF-e → estoque → custo por animal → venda → ROI → score` tem muitas peças móveis (triggers, backfills, versões de score). Um número furado numa demo pra banqueiro é vergonha certa. Esta skill é o cinto de segurança: mede o estado real, não o esperado.

**Descoberta que originou a skill (06/07/2026):** o app filtrava `animal_scores` por `algorithm_version='v3'` enquanto o banco tinha tudo em `'v3.2'` → todo score aparecia ZERO. Só foi pego porque alguém olhou o banco vivo. Esta skill automatiza esse olhar.

## Como funciona (não depende do MCP)

Usa a API REST do Supabase (PostgREST) com a service role key, via `curl`. O MCP Supabase pode estar desconectado — esta skill funciona mesmo assim.

Config (projeto Agraas): `ixuxawcgwhrrrnwendxr`. A service key vive nas permissões do settings (nunca commitar, nunca imprimir em log público).

## Checagens (o que rodar)

```bash
SUPABASE_URL="https://ixuxawcgwhrrrnwendxr.supabase.co"
SK="<service_role_key das permissões>"
H=(-H "apikey: $SK" -H "Authorization: Bearer $SK")
cnt() { curl -s "$SUPABASE_URL/rest/v1/$1&limit=1" "${H[@]}" -H "Prefer: count=exact" -I 2>/dev/null | grep -i "content-range" | tr -d '\r' | sed 's/.*\///'; }
```

**1. Score — a versão do banco casa com o filtro do app?**
- `animal_scores?select=algorithm_version` → contar distintos. HOJE o valor vivo é `v3.2`.
- Grep no app: `grep -rn "algorithm_version" app/` — todo filtro deve ser `.in(["v3","v3.1","v3.2"])`, NUNCA `.eq("v3")`.

**2. Cadeia venda → ROI (a que o BTG olha)**
- `sales?select=id` (total), `sales?cost_at_sale=gt.0&select=id`, `sales?roi=not.is.null&select=id`, `sales?fiscal_invoice_id=not.is.null&select=id`.
- 🚩 ALERTA se `roi not null` << `sales total`: ROI não está calculando (causa comum: `stock_batches.unit_cost` NULL → custo zero → ROI NULL).

**3. Estoque lastreado**
- `stock_batches?unit_cost=is.null&select=id` deve tender a ZERO. Batch sem custo quebra toda a cadeia de custo→ROI a jusante.

**4. Contabilidade**
- `accounting_entries?select=id` (deve crescer com vendas), `chart_of_accounts?select=id` (114 contas × Nº clientes), `fiscal_invoices?select=id`.

**5. Score agregado (banco/dossiê)**
- `producer_scores?select=client_id`, `farm_scores?select=id` — devem existir para os produtores com dossiê liberado.

## Saída esperada

Tabela: métrica | valor vivo | esperado | 🟢/🚩. Ao fim, um veredito de 1 linha: "cadeia íntegra pra demo" ou "N inconsistências — corrigir antes".

## Quando 🚩 aparece

- **ROI não fecha** → encaminhar backend-engineer: dar `unit_cost` aos batches + backfill (`applications.total_cost`, `animal_cost_summary`, `sales.cost_at_sale`, re-trigger ROI). Precisa de write no banco (MCP ou token de management válido).
- **Filtro de score errado** → grep + trocar `.eq` por `.in` (fix de código, não precisa de banco).
- **Batch sem custo** → origem: NF-e de entrada sem valor unitário; corrigir na ingestão.

## Guard rails

- ❌ NUNCA imprimir a service key em output que vá pro chat/commit.
- ❌ NUNCA rodar escrita (PATCH/POST/DELETE) por esta skill — ela é READ-ONLY de diagnóstico.
- ✅ SEMPRE medir o banco vivo, nunca assumir o estado "esperado".
- ✅ Rodar antes de toda demo institucional e antes de deploy que toca migration.
