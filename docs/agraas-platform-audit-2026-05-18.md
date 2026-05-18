# Auditoria Integral da Plataforma Agraas — 2026-05-18

> Read-only. Não modifica nada. Cobertura: todas as rotas, todos os perfis (admin/client/buyer/mentor_externo).
>
> Gatilho: Lucas testou os 3 logins mentoria + reportou 6 problemas concretos em /painel. Esta auditoria identifica que esses sintomas são **manifestações locais de padrões globais** que afetam toda a plataforma — não só perfil mentor.

---

## PARTE 1 — RESUMO EXECUTIVO

### Top 5 problemas críticos (P0)

1. **🔴 `agraas_master_passport_cache` está VAZIO pra FSJBE** — 0 linhas em produção. /painel lê dessa view como fonte primária → todos os KPIs zerados (animals/score/arrobas/valor/halal/aptos). **Bug de dados, não de UI.** Cache precisa ser regenerado.

2. **🔴 KpiCard reimplementado MAIS UMA vez em /painel** — local function linha 952. PR 1 unificou 12 variantes mas /painel ainda tem sua própria. Painel tem `min-h-[180px]` + `flex flex-col p-6` + `ag-kpi-value` (font 2rem). Card estoura quando subtitle tem 30+ chars + valueSuffix.

3. **🔴 Halal/Exportação cards hardcoded** em /painel linhas 620-633 — labels "Halal certificados" + "Aptos exportação" exibidos a todos os usuários após decisão foco bovinos 17/05. 40+ outros arquivos com referências Halal/PIF/Saudita/Jeddah/Exportação.

4. **🔴 Mobile NUNCA validado em 375px** — 10+ páginas com tabelas sem `overflow-x-auto`, grid de 6 KPIs em xl:grid-cols-6 estoura abaixo de 1280px (cards minúsculos), sidebar drawer width 320px aperta em iPhone SE (375px).

5. **🔴 PR 1 visual incompleto** — 25+ páginas ainda usam classes legacy `.ag-page-title` e `.ag-kpi-card` (commit b0f87f0 deixou como `LEGACY` no globals.css mas pages não migraram). 10 páginas ainda tem KpiCard/MetricCard/StatCard local que PR 1 não pegou (auditoria/eventos/inteligencia/movimentacoes/movimentacoes/historico/painel/pesagens/pesagens/historico/propriedades/relatorios).

### Top 3 padrões recorrentes (afetam múltiplas páginas)

1. **Componentes de métrica re-implementados localmente** — 10 páginas ainda têm `function KpiCard/MetricCard/StatCard` local; ~25 páginas usam raw `<div className="ag-kpi-card">`. Single source of truth (KpiCard de PR 1) cobre apenas 13 páginas.

2. **Estados loading/empty/error ausentes** — 10+ páginas server-component sem loading.tsx, ~95% sem `<Skeleton>`, 8+ páginas sem `<EmptyState>` (cada uma tem sua versão inline).

3. **Conteúdo residual "Halal/PIF/Saudita/Jeddah/Exportação"** — 40+ arquivos referenciam. Cleanup parcial em 18/05 (apenas surgical no /produtivo + sidebar). 24 ainda importam `<HalalBadgeSVG>`.

### Estimativa de horas pra resolver P0+P1

| Onda | Escopo | Horas estimadas |
|---|---|---|
| **Onda 1 (P0)** | Cache fix + remover Halal cards + responsividade 6 KPIs + 10 KpiCard locais migrados | **6-8h** |
| **Onda 2 (P1)** | Mobile real audit (Playwright) + Empty/Skeleton em 8 páginas + cleanup Halal/PIF residual | **6-8h** |
| **Onda 3 (P2)** | Migrar 25 páginas legacy ag-* → componentes + polish | **8-10h** |
| **Total P0+P1** | | **~14h** |

---

## PARTE 2 — PROBLEMAS POR DIMENSÃO

> Tabela consolidada. Severidade: **P0** bloqueia/parece quebrado, **P1** funciona mas ruim, **P2** polish.

### 2.1 — Dados (Dimensão 1)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| `agraas_master_passport_cache` zerado pra FSJBE | DB cache view, [painel/page.tsx:178](app/painel/page.tsx#L178) | /painel mostra 0 em tudo | **P0** |
| Mentor policies faltando em `animal_certifications`, `animal_scores`, `agraas_master_passport_cache` | DB | Mentor vê dados incompletos | **P0** |
| Policies duplicadas/conflitantes em `stock_batches` (allow_all_* sobrescrevendo tenant) | DB | Vazamento cross-tenant em stock_batches | **P0** |
| `production_*` tabelas seedadas estaticamente — não atualizam | /producao | Dashboard zootécnico defasado | **P1** |
| `CATEGORY_VALUES` hardcoded em /insumos | [insumos/page.tsx:66](app/insumos/page.tsx#L66) | Chart insumos fake | **P1** |
| Top 5 animais `/painel` lê de `agraas_market_animals` view sem filtro client_id | [painel/page.tsx:200](app/painel/page.tsx#L200) | View pode vazar (LIMIT 6 mascarado) | **P1** |
| 18 funções PL/pgSQL órfãs (`animal_events`) ainda no banco | DB | Não disparam mas poluem | **P2** |
| `sales`, `slaughter_records`, `applications` sem cache view — queries diretas | múltiplos dashboards | Performance baixa em N animais | **P2** |

### 2.2 — Layout Desktop 1440px (Dimensão 2)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| Grid `xl:grid-cols-6` em /painel | [painel/page.tsx:593](app/painel/page.tsx#L593) | KPIs cabem só >= 1280px; entre 1024-1280 vira 3 cols apertadas | **P0** |
| Subtitle "score ≥ 75 + Halal + sem carência" cabe mal | [painel/page.tsx:631](app/painel/page.tsx#L631) | `line-clamp-2` corta mid-word | **P0** |
| Local KpiCard com `min-h-[180px]` força altura uniforme — quando 1 card tem valor longo (R$ 1.234.567,89) outros 5 ficam vazios sob | painel/page.tsx | Painel | **P1** |
| `ag-page-title` desktop = 3rem (48px), localKpiCard desktop ainda usa `ag-kpi-value` (32px) — desequilíbrio | 25 páginas | Hero/KPIs sem ritmo | **P1** |
| Hero proporção `xl:grid-cols-[1.08fr_0.92fr]` vs `[1.1fr_0.9fr]` vs full | /produtivo, /market, /cadeia, /reprodutivo, /insumos | Heros assimétricos | **P2** |
| `ag-table` com >7 colunas (animais, custos, fiscal) sem horizontal scroll wrapper em algumas | /metas, /produtos, /fornecedores | Tabelas estouram em < 1366px | **P1** |

### 2.3 — Mobile 375px (Dimensão 3)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| MobileDrawer width fixa 320px | [MobileDrawer.tsx:43](app/components/MobileDrawer.tsx#L43) | iPhone SE (320px viewport) sobra 0px | **P1** |
| 10 páginas com `<table>` sem `overflow-x-auto` wrapper | metas, produtos, fornecedores, compradores, estoque, estoque/historico, pesagens, agricultura/* | Mobile: tabela estoura página | **P0** |
| Hero h1 sem responsive size em pages legacy | 25 páginas com `ag-page-title` (3rem fixo lg, 2.25rem mobile — mas algumas overridam) | h1 estoura container | **P1** |
| Cards `xl:grid-cols-6` colapsa em mobile pra 1 coluna — funcional mas com 6 cards = scroll vertical longo | /painel | UX ruim mobile | **P1** |
| Mapa Leaflet (BrazilMapWrapper) sem responsive height | [painel/page.tsx:645](app/painel/page.tsx#L645) | Em mobile pode quebrar layout | **P1** |
| ChainPill com nome longo em /cadeia quebra em mobile | [cadeia/page.tsx:152](app/cadeia/page.tsx#L152) | UX ruim | **P2** |
| Header sticky h-20 = 80px — consome 20% do viewport mobile | [layout.tsx:207](app/layout.tsx#L207) | Pouco espaço útil | **P2** |

### 2.4 — Conteúdo / Copy (Dimensão 4)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| Cards Halal + Aptos exportação hardcoded em /painel | [painel/page.tsx:620-633](app/painel/page.tsx#L620) | Todos veem post-foco-bovinos | **P0** |
| 24 imports de `<HalalBadgeSVG>` em UI visível | animais, lotes, marketplace, painel, exportacao, passaporte, etc. | Marketing residual | **P1** |
| `MarketTable` filter checkbox "Apenas Halal certificados" | [MarketTable.tsx:51](app/components/MarketTable.tsx#L51) | Foco bovinos ⚠️ Lucas aprovou manter | **P2** |
| String "PIF" em compradorTypes.ts + tracking | [compradorTypes.ts:80](app/components/compradorTypes.ts#L80), [tracking/page.tsx:142](app/tracking/page.tsx#L142) | Referência institucional | **P2** |
| /planos com strings "Halal" em features | [planos/page.tsx](app/planos/page.tsx) | Planos públicos | **P1** |
| "Saudita/Arábia/Jeddah" em /exportacao, /lotes, /tracking, /compradores | 8+ arquivos | Discurso PIF | **P2** |
| Hero subtitles inconsistentes ("Plataforma do agro", "Infraestrutura digital da pecuária bovina", "Inteligência produtiva", etc.) | múltiplos | Tom inconsistente | **P2** |

### 2.5 — Estados loading/empty/error (Dimensão 5)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| Sem `loading.tsx` em ~0 páginas (default Next 16 vazio) | toda plataforma | Tela em branco | **P1** |
| `<Skeleton>` criado em PR 1 mas usado em 0 páginas | UI fundação | Loading invisível | **P1** |
| `<EmptyState>` usado em 3 páginas (reprodutivo, insumos, auditoria); demais usam div inline | 8+ páginas | Inconsistência | **P2** |
| Error boundary ausente — erro de query exibe stack trace técnico | toda plataforma | Mau impressão | **P1** |
| 10 páginas sem nenhuma menção a 'loading' ou 'empty' state | agricultura/*, alertas, animais/[id], aplicacoes/historico, ... | Estados implícitos | **P2** |

### 2.6 — Botões / Ações (Dimensão 6)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| `/operacoes` linkava para `/laboratorio` 404 (já fixado 18/05) | resolved | — | ✅ |
| `/produtos` botão "Editar" fantasma sem onClick (já fixado 18/05) | resolved | — | ✅ |
| `/cadeia` link `/dashboard` → /painel (já fixado 18/05) | resolved | — | ✅ |
| Botões CRUD ausentes em /reprodutivo (página é visualização-only) | reprodutivo | Eixo A UI ainda não subiu | **P0** |
| Botão "Importar animais" em /migrar-dados existe mas é admin-only sem ActionGuard | migrar-dados | Outros perfis veem | **P1** |
| Sub-itens "Histórico" em sidebar (PR 1 anteriormente sugeriu virar aba) | aplicacoes/historico, pesagens/historico, custos/historico, movimentacoes/historico, etc. | Sidebar inflada | **P2** |

### 2.7 — Performance percebida (Dimensão 7)

| PROBLEMA | LOCAL | AFETA | SEV |
|---|---|---|---|
| /painel faz **12 queries paralelas** + 1 view + render | [painel/page.tsx:163](app/painel/page.tsx#L163) | TTFB ~500-800ms | **P1** |
| /animais/[id] (1124 linhas) sem code splitting | animais/[id] | Bundle JS pesado mobile | **P2** |
| 86% componentes "use client" | toda plataforma | Bundle JS sobrecarregado | **P2** |
| Mapas Leaflet carregados sempre (sem dynamic) | algumas pages OK, outras não | Mobile lento | **P2** |

---

## PARTE 3 — MOBILE AUDIT (375px) — análise estática

> Não validado em browser real (Playwright pendente). Análise via CSS classes.

| Rota | Status | Detalhe |
|---|---|---|
| /painel | ⚠️ Quebra | xl:grid-cols-6 colapsa pra 1 col → scroll vertical longo; mapa Leaflet sem height responsivo |
| /produtivo | ✅ OK | Polish recente; grid md:grid-cols-4 colapsa OK |
| /animais | ⚠️ Quebra | Lista 903 LOC; cards possivelmente OK; filtros podem estourar |
| /animais/[id] | ❌ Inutilizável | 1124 LOC, layout complexo, sem responsive testado |
| /lotes | ⚠️ Quebra | Botão "Novo lote" hero pode estourar |
| /lotes/[id] | ❌ Inutilizável | 750 LOC, mapa + tabelas |
| /propriedades | ❌ Inutilizável | 855 LOC, mapa + cards + tabela |
| /movimentacoes | ⚠️ Quebra | Local MetricCard, sem audit detalhado |
| /reprodutivo | ✅ OK | KpiCard novo + EmptyState, grids responsive |
| /aplicacoes | ⚠️ Quebra | Forms longos sem responsive |
| /pesagens | ⚠️ Quebra | Tabs Individual/Lote, form sem responsive |
| /metas | ❌ Inutilizável | Tabela sem overflow-x-auto |
| /scores | ⚠️ Quebra | Filtros + tabela |
| /eventos | ⚠️ Quebra | KpiCard local, tabela |
| /custos | ⚠️ Quebra | Forms |
| /vendas, /abates, /fiscal | ⚠️ Quebra | Tabelas + forms |
| /produtos, /fornecedores | ❌ Inutilizável | Tabelas sem overflow-x-auto |
| /insumos | ✅ OK | PR 1 polish |
| /producao | ✅ OK | PR 1 polish (cards) |
| /operacoes | ✅ OK | PR 1 polish |
| /market | ✅ OK | PR 1 polish |
| /cadeia | ⚠️ Quebra | ChainPill com nomes longos |
| /alertas | ⚠️ Quebra | Local MetricCard |
| /certificacoes | ⚠️ Quebra | Tabela colunas |
| /auditoria | ✅ OK | PR 1 polish StatCard preserved |

**Resumo**: 5 ✅ OK · 14 ⚠️ Quebra · 5 ❌ Inutilizável

---

## PARTE 4 — DADOS ZERADOS

| Página/KPI | Esperado | Real | Causa |
|---|---|---|---|
| /painel — todos os 6 cards LIVE (FSJBE) | Animais 5, Score ~64, Arrobas ~225, Valor ~R$ 74k, Halal 0, Aptos 0 | Tudo zero | **Cache `agraas_master_passport_cache` tem 0 rows pra FSJBE** (verificado via SQL) |
| /painel — Top 5 animais | 5 BERs ordenados por score | (vazio?) | Lê de `agraas_market_animals` view sem filtro client_id correto |
| /painel — Fazendas ativas (mapa) | 1 ponto Jandaia/GO | Funcionando (lat=-17.048, lng=-50.146) | OK |
| /insumos — Distribuição grupo | Real data | CATEGORY_VALUES hardcoded | Demo data |
| /producao — todos os 5 quadros | Real op data | Production cache views | Cache estático |
| /reprodutivo — KPIs estação | Reais | OK pra clients que têm season | FSJBE tem season real seedada |

**Conclusão**: o gatilho do user (KPIs zerados FSJBE) é causado por **cache vazio**, não por bug de RLS mentor. Refresh do cache resolve, OU fallback no /painel pra queries diretas (mais lento mas seguro).

---

## PARTE 5 — CONTEÚDO RESIDUAL

Strings/símbolos que precisam ser revisados pós-decisão 17/05 (foco bovinos):

### Halal (24 imports `<HalalBadgeSVG>` + texto)
- [app/painel/page.tsx:5,513,620-625](app/painel/page.tsx#L5) — card KPI + section hero
- [app/animais/page.tsx:6,558](app/animais/page.tsx#L6) — import + render condicional
- [app/lotes/[id]/page.tsx:441,519](app/lotes/[id]/page.tsx#L441) — 2 renders
- [app/marketplace/page.tsx + [id] + components](app/marketplace) — múltiplos
- [app/passaporte/[agraas_id]/PublicPassportView.tsx:263](app/passaporte/[agraas_id]/PublicPassportView.tsx#L263)
- [app/components/MarketTable.tsx:94](app/components/MarketTable.tsx#L94) — **APROVADO MANTER** (Lucas confirmou)
- [app/components/marketplace/MarketplacePublicView.tsx](app/components/marketplace/MarketplacePublicView.tsx) — 3 ocorrências
- ovinos/aves/dashboards — pausados mas com Halal código
- exportacao, tracking — PIF/Halal residuais
- comprador/* — pausado mas referencia Halal

### PIF
- [app/components/compradorTypes.ts:80,92](app/components/compradorTypes.ts#L80) — i18n PIF strings
- [app/tracking/page.tsx:142](app/tracking/page.tsx#L142) — badge "PIF · Exportação"
- Sidebar removeu badges PIF (commit a6a2a48) ✅

### Saudita / Arábia / Jeddah
- [app/lotes/page.tsx:9](app/lotes/page.tsx#L9) — `PAISES_DESTINO` array com "Arábia Saudita", "Emirados", "Kuwait", etc.
- [app/exportacao/page.tsx](app/exportacao/page.tsx) — referências
- [app/tracking/page.tsx](app/tracking/page.tsx) — destinos
- [app/api/export/lot-pdf/route.tsx](app/api/export/lot-pdf/route.tsx) — PDF gera com destinos

### Exportação (palavra)
- 40+ arquivos com "Exporta*" — alguns são copy ("apto exportação"), outros são funcionalidade (/exportacao, /tracking rotas)

### Recomendação
1. Manter rotas /exportacao, /tracking funcionais mas escondidas (já feito na sidebar)
2. Remover cards/badges Halal de dashboards admin/produtor (painel, animais, lotes)
3. Manter Halal em /market + /passaporte (informativo, não decorativo)
4. Limpar PAISES_DESTINO de /lotes pra incluir mercado interno BR

---

## PARTE 6 — PLANO DE ATAQUE

### Onda 1 (P0) — 6-8h — Desbloqueadores

| # | Tarefa | Tempo |
|---|---|---|
| 1 | Refresh do `agraas_master_passport_cache` pra FSJBE (rodar função/job que repopula) | 1h |
| 2 | Adicionar mentor policies em `animal_certifications`, `animal_scores`, `agraas_master_passport_cache` | 30min |
| 3 | Drop policies `allow_all_*` conflitantes em `stock_batches` | 30min |
| 4 | Refactor /painel KpiCard local → unified `<KpiCard>` PR 1 | 1h |
| 5 | Remover cards "Halal certificados" + "Aptos exportação" do /painel grid (esconder via prop) | 30min |
| 6 | Mobile: grid `xl:grid-cols-6` → `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (4 KPIs sobrevivem pós-Halal-remove) | 30min |
| 7 | Adicionar `overflow-x-auto` em 10 páginas com tabelas: metas, produtos, fornecedores, compradores, estoque, estoque/historico, pesagens, agricultura/* | 1h |
| 8 | Migrar 10 páginas com KpiCard local pra `<KpiCard>` unified | 2h |

### Onda 2 (P1) — 6-8h — Visual ruim mas funciona

| # | Tarefa | Tempo |
|---|---|---|
| 1 | Implementar `<Skeleton>` em listas críticas (animais, lotes, painel) | 1h |
| 2 | Substituir EmptyStates inline por componente compartilhado em 8 páginas | 1h |
| 3 | Cleanup Halal cards/badges em /animais (linha 558), /lotes/[id], /painel section hero | 1h |
| 4 | Hero unification — converter ~10 páginas legacy `ag-page-title` pra `<PageHeader>` (PR 1 component) | 2h |
| 5 | Mobile responsive real validation (Playwright 375/768/1440 screenshots) | 2h |
| 6 | Error boundary global + página de erro amigável | 1h |

### Onda 3 (P2) — 8-10h — Polish e consistência

| # | Tarefa | Tempo |
|---|---|---|
| 1 | Migrar 25 páginas legacy `ag-page-title` / `ag-kpi-card` → PR 1 components | 4h |
| 2 | Padronizar cores semânticas (grep+replace text-green/red/amber → tokens) | 1h |
| 3 | Padronizar hover states | 1h |
| 4 | Cleanup conteúdo "Saudita/Arábia/Jeddah" em /lotes, /exportacao, /tracking | 1h |
| 5 | Delete 9 componentes órfãos + /dashboard residual (audit anterior) | 30min |
| 6 | Quebrar painel.tsx (1227 LOC) em sub-componentes | 4h |

---

## PARTE 7 — DEPENDÊNCIAS COM PR 1 VISUAL

### O que conecta com PR 1 (já feito)
- **`<KpiCard>`** em `app/components/ui/KpiCard.tsx` é fonte de verdade. 13 páginas já usam.
- **`<PageHeader>`** em `app/components/ui/PageHeader.tsx` — usado em 5 páginas. Onda 2 deveria propagar pra mais 10.
- **`<EmptyState>`** — usado em 3 páginas. Onda 2 deveria propagar pra ~8 mais.
- **`<Skeleton>`** + variantes — usado em **0 páginas** (criado mas não consumido). Onda 2 começa o uso.

### O que está fora do PR 1 e precisa nova padronização
- **Tabelas** — todas usam `ag-table` mas regras de alinhamento de colunas inconsistentes. Spec em [docs/agraas-visual-patterns.md §2.2](docs/agraas-visual-patterns.md#22--padrão-único-pra-tabelas) — Onda 2 aplicar
- **Forms** — sem padrão (Zod usado em apenas 7 arquivos). Precisa de `<FormField>`, `<Input>`, `<Select>` compartilhados
- **Mapas** — Leaflet em 4+ lugares com height/width inconsistentes
- **Cards de animal/lote** (lists) — cada página tem seu próprio layout de card de listagem

### O que vai precisar de novos componentes UI compartilhados
- `<Skeleton>` variants além de SkeletonKpiCard e SkeletonTableRow: SkeletonCard, SkeletonHero, SkeletonList
- `<ErrorBoundary>` + página de fallback
- `<DataTable>` (wrapper de ag-table com props de colunas/alinhamento configuráveis)
- `<MapContainer>` (Leaflet wrapper com height responsivo)
- `<FormField>`, `<Input>`, `<Select>`, `<Textarea>` (substituir HTML nativo + classes ag-input/ag-select inline)

---

## Metodologia

- **Não validado em browser**: Playwright pendente.
- **Análise estática**: Tailwind classes, ag-* classes em globals.css, imports.
- **Queries Supabase**: validadas via Management API + jq.
- **Dimensão "Performance percebida"**: análise das queries no código, sem profiling real.

## Próximos passos imediatos

**Recomendação**: começar Onda 1, foco nos itens 1-3 (cache refresh + mentor policies + drop policies conflitantes). Esses 3 são DB-only, baixo risco, alto impacto:
- Cache → desbloqueia KPIs zerados (painel volta vivo)
- Mentor policies → Renata vê FSJBE completo
- Drop policies conflitantes → fecha gap de segurança em stock_batches

Depois disso, Onda 1 itens 4-8 (UI: KpiCard unification + Halal cleanup + mobile fix).

**Não recomendo começar Onda 3** antes de Onda 1+2 — refactor de painel.tsx 1227 LOC é alto risco, melhor depois que padrões estiverem consolidados em mais páginas.
