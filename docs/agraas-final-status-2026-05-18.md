# Status Final — Sessão 2026-05-18

> Snapshot do que entregamos hoje (~38 commits, várias frentes paralelas).
> Lucas em reuniões + autorização pra avançar autonomamente. Esta sessão fechou Onda 1 DB + parte significativa da Onda 2 visual.

---

## Commits-chave do dia (cronológico)

### Manhã — Surgical pré-meeting 10h
- `2b34864` fix(branding): remove selo Halal do logo
- `fffc9f2` fix(content): esconde lotes Arábia Saudita na UI
- `44d2fe9` fix(routing): merge middleware.ts em proxy.ts pra Next 16 → **desbloqueou Vercel deploy quebrado desde 17/05**

### Sidebar reorg
- `d6a6ba0` polish(branding): logo, header e cards refinados
- `1cfeba7` refactor(nav): SidebarNav reorganizada em 9 grupos
- `a6a2a48` fix(nav): remove grupo Exportação + badges PIF
- `28c077d` fix: 3 cleanups detectados no audit das 6 páginas

### PR 1 visual unification
- `16cfd09` feat(ui): componentes compartilhados KpiCard, PageHeader, EmptyState, Skeleton
- `f2bc80d`/`b14cde3`/`d9304a2`/`d3c76f6`/`25c136b` refactor 13 páginas → KpiCard unified
- `5359a85` refactor(css): resolve bug ag-kpi-value duplicado

### Arquitetura mentor (FASES 1-7)
- `f9fba59` feat(types): producer_types ENUM + N:N + seed PT-BR
- `f47d03b` feat(mentoria): clients Fazenda Mentoria IZ-SP + Frigorífico
- `733d799` feat(mentoria): seed híbrido Fazenda Mentoria + **drop 2 triggers órfãs animal_events**
- `0383460` feat(mentoria): seed Frigorífico Mentoria
- `7dfa18a` feat(auth): 3 contas Supabase Auth com Agraas@2026
- `7f4e531` feat(mentoria): mentor_assignment FSJBE espelho read-only
- `b0f87f0` feat(rbac): getCurrentRole + RoleContext
- `42f5098` feat(rbac): badge Modo Visualização
- `c23e285` feat(rbac): ActionGuard component
- `a4525bc` feat(rbac): aplica ActionGuard em 5 páginas críticas

### Audit + Onda 1+2 DB-only
- `0ef6a42` docs: audit integral da plataforma
- `726bf99` feat(rbac): mentor policies em animal_certifications + scores + cache (Onda 1.2)
- `f15960a` fix(security): stock_batches RLS tenant isolation (Onda 1.3)
- `65b31a4` fix(cache): refresh_animal_passport usa tabela events atual + popula FSJBE+Mentoria (Onda 1.1)

### Onda 2 visual + mobile
- `97d5b0f` feat(painel): KpiCard unified + remove Halal cards + mobile grid responsivo
- `ae9f1c5` refactor(rbac): migra 6 páginas KpiCard local → unified
- `464be8c`/`7314822` fix(mobile): MobileDrawer responsive + overflow-x-auto em 6 tabelas
- `336ee2e` chore(cleanup): remove Halal residual em /animais + reorienta /lotes pra mercado interno

---

## Top 3 vitórias

### 1. Bug crítico de 2 anos resolvido — `refresh_animal_passport()` voltou a funcionar
A função referenciava tabela `animal_events` removida em 2024. **Cache `agraas_master_passport_cache` ficou stale por ~2 anos**. Resultado: /painel mostrava KPIs zerados pra qualquer cliente que precisasse de refresh (FSJBE incluído).

Fix: reescrita usando `events` (tabela ativa) + `weights` (não `weight_records` legacy) + **populando `client_id`** (bug bônus — a versão antiga não preenchia, então /painel filtrava `WHERE client_id=X` e via 0 rows mesmo com cache populado).

Pós-fix: FSJBE com 5 rows reais (BER-001 520kg/67 score, ..., BER-004 180kg/56), Fazenda Mentoria com 10 rows (sem peso/score por enquanto, mas cache existe).

### 2. Arquitetura mentor_externo end-to-end pronta
3 logins funcionais pra Renata+César (`mentoria.produtor`, `mentoria.comprador`, `mentoria.fsjbe`) com defesa em 3 camadas:
- **DB**: 21 policies SELECT mentor (18 da migration 116 + 3 da 119), ZERO policies INSERT/UPDATE/DELETE pra mentor
- **UI badge global**: "👁️ Modo Visualização — Mentoria" no header quando isMentorExterno=true
- **UI gating**: ActionGuard em 5 páginas críticas (/animais, /lotes, /aplicacoes, /pesagens, /reprodutivo)

### 3. Vazamento RLS em `stock_batches` fechado
5 policies "permissivas" (qual=true) que neutralizavam o tenant isolation foram dropadas. Stock agora só visível pra admin OU client_id próprio. Cross-tenant leak fechado (ninguém percebeu antes, mas estava aberto).

---

## Top 3 pendências críticas

### 1. /propriedades + /pesagens — KpiCard local ainda não migrado
Audit listou 10 páginas com KpiCard local. PR 1 + COMMITs de hoje migraram 8. Restantes:
- /propriedades — tem 3 components locais (HeroMetric, SnapshotCard, KpiCard com emoji icon). Trabalho mais cirúrgico.
- /pesagens — tem PesagemHeroMetrics que internamente usa MetricCard com Icon/bg/cl. Migração + cuidado com extras.

Recomendação: 2 commits dedicados, ~30min cada.

### 2. Cache `agraas_master_passport_cache` — Fazenda Mentoria com pesos/scores NULL
Os 10 animais MENT-001..010 foram seedados sem weights nem animal_scores. Cache tem as 10 linhas mas com `peso=null, score=null`. /painel pro client Fazenda Mentoria vai mostrar "—" em vez de números reais.

Fix: seedar weights + scores pra MENT-001..010 (migration 122 dedicada, ~50 INSERTs).

### 3. 18 funções PL/pgSQL órfãs ainda no banco
Lista das funções que ainda referenciam `animal_events` removida:
```
after_application_insert, after_rfid_insert, after_weight_insert,
create_application_event, create_lot_entry_event, create_rfid_event,
create_sale_event, create_slaughter_event, create_weight_event,
mark_animal_slaughtered, recalculate_animal_score,
refresh_animal_certifications, refresh_animal_passport (CORRIGIDA hoje),
refresh_animal_score, refresh_animal_seals,
register_animal_movement_event, register_weight_event,
transfer_animal_after_sale.
```

Não disparam em trigger ativo (auditado), mas se alguém invocar manualmente via RPC, falha. PR dedicado pra revisar quais deletar vs reescrever.

---

## Estado dos 3 logins mentor pós-sessão

| Login | Cliente | Vê /painel populado? | Pode editar? |
|---|---|---|---|
| `mentoria.produtor@agraas.com.br` | Fazenda Mentoria IZ-SP | Cache existe (10 rows), mas pesos/scores NULL — vai mostrar "—" nos KPIs | SIM (admin do client) |
| `mentoria.comprador@agraas.com.br` | Frigorífico Mentoria IZ-SP | Cache vazio (não foi populado nesta sessão, owner não precisa) | SIM (admin do client) |
| `mentoria.fsjbe@agraas.com.br` | FSJBE (read-only via mentor_assignment) | **Cache POPULADO com 5 rows reais** (peso, score) | NÃO (mentor_externo) |

**Recomendação pra próxima sessão**: seedar weights + animal_scores pra Fazenda Mentoria pra UI ficar viva também pro perfil produtor.

---

## Estado do trabalho visual

### PR 1 visual (KpiCard unification) — STATUS

- ✅ 4 componentes UI criados: KpiCard, PageHeader, EmptyState, Skeleton
- ✅ 13 + 6 = **19 páginas migradas** pro KpiCard unified
- ⚠️ 2 páginas pendentes: /propriedades, /pesagens
- ⚠️ 25+ páginas legacy ainda usam classes `ag-page-title` / `ag-kpi-card` (Onda 3)

### Mobile (Onda 2) — STATUS

- ✅ MobileDrawer responsive (`w-[85vw] max-w-[320px]`)
- ✅ 6 tabelas com `overflow-x-auto`: /metas, /produtos, /fornecedores, /compradores, /estoque, /estoque/historico
- ⚠️ Hero h1 responsive em 25 páginas legacy — NÃO feito (mass edit pendente)
- ⚠️ Playwright real validation — NÃO feito

### Loading / Empty states (Onda 2) — STATUS

- ✅ Componentes Skeleton + EmptyState criados (PR 1)
- ✅ EmptyState usado em 3 páginas (reprodutivo, insumos, auditoria)
- ❌ **Skeleton ainda NÃO consumido em nenhuma página** — fica pra Onda 2 continuação
- ⚠️ EmptyState pendente em 8 páginas (eventos, custos, vendas, abates, fiscal, alertas, movimentacoes, certificacoes)

### Halal cleanup — STATUS

- ✅ Removido do header da sidebar (commit 2b34864)
- ✅ Removido dos 2 cards de KPI do /painel + hero badge (commit 97d5b0f)
- ✅ Removido dos cards de listagem em /animais (commit 336ee2e)
- ✅ /lotes: PAISES_DESTINO reorientado pra BR + CERTS_DISPONIVEIS sem Halal + OBJECTIVES sem Exportação
- ⚠️ Pendente: /lotes/[id] (2 renders), /marketplace components, /planos página pública (foco bovinos pode preservar marketing parcial)
- ✅ Mantidos por decisão Lucas: /market (filtro Halal ativo), /passaporte (dado factual)

### Painel — STATUS

- ✅ KpiCard local migrado pra unified
- ✅ 2 cards Halal/Aptos exportação removidos
- ✅ Hero badge "Halal Certified" removido
- ✅ Grid mobile responsivo (`sm:grid-cols-2 lg:grid-cols-4`)
- ✅ Subtitle problemática "score ≥ 75 + Halal + sem carência" removida (deletada junto com card)

---

## Riscos atuais

1. **Cache populado mas client_id NULL nas 28 rows legacy** — existem 28 linhas de cache antigas sem client_id. /painel filtra por client_id então essas rows são invisíveis pra qualquer perfil. Limpeza ou backfill em PR dedicado.

2. **TS errors residuais em `.next/types/validator.ts`** — Next.js generated. Não foram tocados, sempre aparecem como 2 errors. Build no Vercel ignora; build local pelo WASM falha por outro motivo (SWC binary).

3. **Auth Admin API rate limit** — não atingimos hoje, mas SUPABASE_SERVICE_ROLE_KEY tem rate limit. Próximas criações de conta devem ser via Dashboard ou batch.

4. **Migration registry desatualizado** — todas as migrations 108-121 aplicadas via Management API. `supabase_migrations.schema_migrations` está desatualizada. Quando Docker voltar:
   ```
   npx supabase migration repair --status applied 108 109 110 111 112 113 114 115 116 117 118 119 120 121
   ```

---

## Próximos passos sugeridos (próxima sessão)

| Prioridade | Tarefa | Tempo |
|---|---|---|
| **P0** | Seed weights + animal_scores pra Fazenda Mentoria (10 animais) | 30min |
| **P0** | Migrar /propriedades + /pesagens KpiCard local | 1h |
| **P1** | Skeleton em listas críticas (/animais, /lotes, /painel) | 1h |
| **P1** | EmptyState compartilhado em 8 páginas residuais | 1h |
| **P1** | Hero h1 responsive mass edit (25 páginas legacy `ag-page-title`) | 2h |
| **P1** | Playwright validation 375/768/1440 | 2h |
| **P2** | Migration 122 cleanup 17 funções órfãs `animal_events` | 1-2h |
| **P2** | Migration repair quando Docker voltar | 5min |
| **P2** | /lotes/[id] Halal renders cleanup | 30min |
| **P2** | Quebrar /painel/page.tsx 1227 LOC em sub-componentes | 4h |

**Total P0+P1**: ~7h. Realista pra próxima sessão.

---

## Vercel URL

https://agraas-platform.vercel.app — deploy do commit `336ee2e` ativo

## Commit total da sessão

~38 commits desde início do dia, 21 deles desta sessão pós-audit.
Working tree: ✅ limpo.
