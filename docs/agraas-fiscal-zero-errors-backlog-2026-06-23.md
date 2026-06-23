# Backlog Zero-Erros — Camada Contábil-Fiscal-Controladoria-Estoque

> Backlog verificado para levar a camada fiscal a **zero erros**. Base: auditoria de 3 ângulos
> (triangulação · RLS · completude) por análise estática das migrations `001`–`126` (fonte de verdade,
> regra "nunca DDL via dashboard") + grep do código. **23 de junho de 2026.**
> ⚠️ Banco vivo NÃO consultado (MCP Supabase pede OAuth) — itens marcados `🔌` só fecham com o banco real.

---

## Veredito em uma frase

Os **3 bugs Tier-1** de 17/06 (score órfão, duplo débito, FEFO double-subtraction) foram **corrigidos pela migration 124** ✅. Mas **toda a camada de gap funcional (bugs 4-8) segue aberta**, há **2 possíveis leaks cross-tenant** (`stock_movements`, `cost_records`), o banco **não reconstrói do zero** (`db reset` quebra), e **não existe contabilidade de verdade** (partida dobrada), **nem idempotência** (re-upload de NF-e duplica tudo), **nem trilha imutável**. Existe registro fiscal + controle de estoque costurados por **seeds manuais** — não uma controladoria.

---

## 🔴 P0 — Críticos (vazam dados, quebram o banco, ou são a fundação ausente)

| # | Defeito | Evidência | Correção |
|---|---|---|---|
| **S1** | `stock_movements` **sem DDL/RLS/`client_id`**, lida por **client component com anon key sem filtro** (`app/estoque/historico/page.tsx`) → **leak cross-tenant** de toda movimentação de estoque | nunca aparece em CREATE/ENABLE RLS; só INSERT em `124:95` (sem client_id) | versionar tabela + `client_id` + RLS; trigger grava `client_id` do batch; `🔌` confirmar RLS real |
| **S2** | `cost_records` **sem migration alguma**; INSERT do app (`app/custos/page.tsx:88`) **sem `client_id`** → estado de RLS desconhecido, leak potencial de custos/ROI | zero ocorrências em `.sql` | versionar com `client_id NOT NULL` + RLS; corrigir INSERT do front; `🔌` confirmar |
| **S3** | UPDATE **sem `WITH CHECK`** em `fiscal_notes`, `fiscal_alerts`, `crop_fiscal_notes/_items` → cliente A pode **re-taggear `client_id`** e injetar NF-e no tenant B | `028` / `060` (só `USING`) | add `WITH CHECK (is_admin() OR client_id = get_my_client_id())` em todo UPDATE |
| **R1** | **`db reset` quebra** — `124` insere em `stock_movements` que não tem DDL; 1º INSERT em `applications` aborta em banco novo. Bug 4 é pior que o catalogado: **5 tabelas órfãs de DDL** (`applications`, `stock_batches`, `stock_movements`, `cost_records`, `sales`) | grep CREATE TABLE = 0 p/ as 5 | **Migration 127**: canonicalizar `CREATE TABLE IF NOT EXISTS` das 5 (colunas reais via `pg_dump` do banco vivo) |
| **C1** | **Contabilidade ausente total** — sem `chart_of_accounts`, `accounting_entries`, partida dobrada. O `accounting_entries (D/C)` do doc de arquitetura é vaporware | grep accounting/ledger/partida = 0 | plano de contas + lançamentos + linhas D/C + **constraint trigger DEFERRABLE** que exige ΣD=ΣC |
| **C2** | **Idempotência ausente** — `fiscal_notes` sem `chave_nfe` e sem UNIQUE → re-upload do XML duplica nota→estoque→custo→ROI | `028` | `chave_nfe` + `UNIQUE` parcial + `ON CONFLICT DO NOTHING`; UNIQUE `(origin_table, origin_id)` nos lançamentos |
| **C3** | **Trilha imutável ausente** — `nf_audit_log`/`accounting_audit_log` do doc não existem; `fiscal_alerts` é mutável | — | log append-only (só SELECT/INSERT policy) + bloquear mutação de lançamento `posted` (estorna, não edita) |

## 🔴/🟡 P1 — Fechar a cadeia NF-e → estoque → custo

| # | Defeito | Evidência | Correção |
|---|---|---|---|
| **B5** | `/api/fiscal/apply-stock` grava no legacy `supply_inventory_items`, **nunca** chama `create_stock_from_fiscal_note` | rota `:44`/`:69` | religar rota para a função (RPC) ou trigger |
| **B6** | **Zero triggers em `fiscal_notes`** → NF-e validada não cria `stock_batch` | inventário de triggers | trigger `AFTER UPDATE OF status WHEN 'validada'` |
| **NB** | `create_stock_from_fiscal_note` tem **bug de sintaxe** (`INTO` depois do `WHERE`), `IF v_note IS NULL` deveria ser `IF NOT FOUND`, e **`product_id = NULL` hardcoded** (lote nunca casa com produto) + é dead code | `075:74-91` | corrigir sintaxe + resolver `product_id` por NCM/nome |
| **FEFO** | seleção FEFO **não existe no banco** — app passa `batch_id`; risco de aplicar lote vencido (não-conformidade MAPA) | — | função `allocate_stock_fefo()` ordenando por `expiration_date`, `FOR UPDATE` |

## 🟡 P2 — Custo→venda→ROI automático e lastreado

| # | Defeito | Evidência | Correção |
|---|---|---|---|
| **B7** | **Zero triggers em `sales`** → `cost_at_sale`/`roi` só por seed, nunca recalculam | `077`/`092` | trigger `BEFORE INSERT/UPDATE` puxa `animal_cost_summary.total_cost` + calcula ROI + gera lançamento |
| **B8** | **Zero triggers em `cost_records`** → `amount` nunca entra em `animal_cost_summary.other_costs` | `076` só lê `applications` | trigger de soma em `other_costs` |
| **B9/NC** | custo por animal **não vem do estoque** (`applications.total_cost` é digitado à mão; seed 092 é `R$8/cab/dia` random — ROI exibido é ficcional). `076` INSERT path zera labor/other | `073`/`076:46`/`092` | aplicação grava `unit_cost := stock_batches.unit_cost`; corrigir INSERT path |

## 🟡 P2 — RLS de robustez

- `stock_batches`: remover ramo `client_id IS NULL` da policy SELECT + `SET NOT NULL` (`🔌` contar NULLs antes).
- `fiscal_note_items`: faltam policies UPDATE/DELETE (quebra funcional).
- `supply_financials`/`supply_inventory_items`: só SELECT — documentar como read-only ou add escrita com `WITH CHECK`.
- `applications`: isolamento indireto via `animal_id` (ok, mas frágil) — considerar `client_id` denormalizado.
- `dossie-banco-pdf`: `topScores` sem filtro `client_id` (2ª barreira salva, mas endurecer).

## 🟢 P3 — Edge cases & obrigações acessórias

- Enum/CHECK em `stock_movements.movement_type`; `carencia_autofill` ampliar gatilho (bug 11); FK cascade de `animal_cost_summary` (`🔌`).
- **Obrigações:** FUNRURAL **1,63%** automático (a partir 01/04/2026 — **VALIDAR alíquota/IN com contador antes de codar**); Livro-Caixa Atividade Rural (PF); SPED ECD/EFD, EFD-Reinf, ITR/DBR (P3+).

---

## O que SÓ o banco vivo fecha (`🔌`)

1. **Confirmar os leaks S1/S2** — `pg_class.relrowsecurity` + colunas `client_id` de `stock_movements`/`cost_records` + `get_advisors(security)`.
2. **Schema real das 5 tabelas órfãs** (`pg_dump --schema-only`) — pré-requisito para escrever a migration 127 correta (sem isso eu estaria adivinhando DDL = risco de introduzir erro novo).
3. **Métricas de produção** — NF-e órfãs, estoque negativo, `stock_batches` com `client_id NULL`, vendas sem `cost_at_sale`, ROI<0, animais com aplicação sem summary.
4. Confirmar que 124/125/126 foram de fato aplicadas e que os DROP de triggers-dashboard pegaram.
5. **Rodar a suite pgTAP** após cada correção.

---

## Ordem de execução proposta (migrations 127+)

| Migration | Conteúdo | Prio | Depende |
|---|---|---|---|
| **127** | Canonicaliza DDL das 5 tabelas órfãs (`IF NOT EXISTS`) + `client_id` + RLS completa (fecha R1, S1, S2) | P0 | schema real `🔌` |
| **128** | `chave_nfe` + UNIQUE + idempotência na ingestão (C2) | P0 | — |
| **129** | `chart_of_accounts` + `accounting_entries` + linhas D/C + constraint ΣD=ΣC (C1) | P0 | — |
| **130** | `accounting_audit_log` append-only + bloqueio de `posted` (C3) | P0 | 129 |
| **131** | `WITH CHECK` em todos os UPDATE fiscais (S3) | P0 | — |
| **132** | corrigir + religar `create_stock_from_fiscal_note` + trigger NF→estoque (B5/B6/NB) | P1 | 127, 128 |
| **133** | `allocate_stock_fefo()` + custo de aplicação lastreado (FEFO/B9) | P1 | 132 |
| **134** | trigger venda→`cost_at_sale`/`roi` + lançamento contábil (B7/B8) | P2 | 129, 133 |
| **135+** | FUNRURAL, Livro-Caixa, SPED | P2/P3 | 129 |

### Princípios não-negociáveis na implementação
1. Toda tabela nova: `client_id` + RLS `USING (is_admin() OR client_id = get_my_client_id())` com **`WITH CHECK`**.
2. Equilíbrio D=C via **`CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED`** (não linha a linha).
3. Idempotência dupla: UNIQUE em `chave_nfe` **e** em `(origin_table, origin_id)`.
4. Concorrência: todo débito/alocação com `FOR UPDATE` (lição do duplo débito da 124).
5. Imutabilidade: `posted=true` se **estorna**, não se edita.
6. **pgTAP/Jest por trigger** (fixture válida + inválida: desbalanceado, lote vencido, chave duplicada) — nada vai a produção sem teste.

> *Backlog Zero-Erros · Agraas · 23/06/2026 · base do "Sprint H — Fiscal Hardening". Auditoria completa em `tasks/wimnunihh`.*
