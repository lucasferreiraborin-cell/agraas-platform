# Suíte pgTAP · Triggers críticos da cadeia fiscal-estoque-animal

Sprint L — anti-regressão de triggers que sustentam o ROI, a partida dobrada
contábil e a propagação fiscal de venda → NF-e → animal.

## Por que existe

Toda nova migration que mexe em `sales`, `cost_records`, `animal_cost_summary`,
`accounting_entries` ou `fiscal_invoices` pode quebrar SILENCIOSAMENTE a cadeia
financeira. Esta suíte trava o contrato dos seis triggers que estruturam o
pipeline:

| Trigger                          | Migration | Cobertura                                  |
| -------------------------------- | --------- | ------------------------------------------ |
| `_trg_sales_compute_roi`         | 131 + 141 | `trigger_sales_compute_roi.sql`            |
| `_trg_sales_accounting_upsert`   | 146       | `trigger_sales_accounting_upsert.sql`      |
| `_trg_cost_records_to_summary`   | 131 (animal) | `trigger_cost_records_to_summary.sql`   |
| `_trg_cost_records_to_summary`   | 136 (lot)    | `trigger_cost_records_propagate_lot.sql`|
| `_trg_sales_close_animal`        | 136       | `trigger_sales_close_animal.sql`           |
| `_trg_sales_emit_fiscal_invoice` | 140       | `trigger_sales_emit_fiscal_invoice.sql`    |

## Como rodar localmente

```bash
# 1. Inicie o stack local (porta 54322)
supabase start

# 2. Aponta o env para o db local
export SUPABASE_DB_URL_SERVICE='postgresql://postgres:postgres@localhost:54322/postgres'

# 3. Roda a suíte
bash supabase/tests/run-all.sh
```

Cada arquivo `trigger_*.sql` roda em `BEGIN … ROLLBACK` — não persiste dados.

## Como rodar contra produção (read-only)

Não recomendado. Use staging. Se for inevitável:

```bash
export SUPABASE_DB_URL_SERVICE='postgresql://postgres:SENHA@db.<PROJECT_REF>.supabase.co:5432/postgres'
bash supabase/tests/run-all.sh
```

O `ROLLBACK` garante que nada é gravado, **desde que** nenhuma falha de psql
force commit parcial. Para máxima segurança, rode contra branch isolada.

## CI

O workflow `.github/workflows/ci.yml` adicionou um job opcional `pgtap` que só
roda quando o secret `SUPABASE_DB_URL_SERVICE` está configurado. Caso não
esteja, o job é pulado (não bloqueia o PR).

## Adicionando um teste novo

1. Criar `trigger_<nome>.sql`
2. Estrutura mínima:
   ```sql
   BEGIN;
   SELECT plan(N);
   -- setup via _test_fixture_client_animal()
   -- N asserções com is/isnt/cmp_ok/throws_ok
   SELECT * FROM finish();
   ROLLBACK;
   ```
3. O `run-all.sh` descobre automaticamente via glob `trigger_*.sql`.
