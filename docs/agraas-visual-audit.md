# Auditoria Visual — Plataforma Agraas

> Snapshot estático da inconsistência visual em **2026-05-18**.
> Read-only. Achados via análise de código + globals.css. Rendering real em browser (pixels exatos, overflow concreto) **não foi possível** — flagado onde aplicável.

---

## Sumário Executivo

A plataforma tem **fundação CSS sólida em `globals.css`** (classes `.ag-*` definidas), mas **cada página reimplementa seus próprios componentes de métrica** em vez de consumir as classes. Resultado: **12+ implementações locais de "card de métrica"** com font-size, padding, weight e border-radius diferentes.

**Causa raiz**: não há `<KpiCard>` único compartilhado em `app/components/`. Cada página declara um localmente.

**Sintoma**: números desalinhados entre seções, padding desigual, hierarquia visual quebrada quando o usuário navega entre páginas.

---

## 1.1 — Padrões de Card de Métrica

### Variantes locais detectadas

| Arquivo | Nome local | Card classes | Label classes | Value classes |
|---|---|---|---|---|
| [app/produtivo/page.tsx:559](app/produtivo/page.tsx#L559) | `HeroMetric` | `rounded-2xl border bg-white p-6 shadow-sm` | `text-sm text-muted` | `text-3xl font-bold tracking-[-0.05em]` |
| [app/cadeia/page.tsx:176](app/cadeia/page.tsx#L176) | `MetricCard` | `ag-kpi-card` | `text-sm text-muted` | `text-3xl font-semibold tracking-[-0.05em]` |
| [app/reprodutivo/page.tsx:5](app/reprodutivo/page.tsx#L5) | `KpiCard` | `ag-card flex flex-col gap-1 p-5` | `ag-kpi-label` | `ag-kpi-value` |
| [app/insumos/page.tsx:21](app/insumos/page.tsx#L21) | `KpiCard` | idem reprodutivo + `valueClass` opcional | `ag-kpi-label` | `ag-kpi-value ${valueClass}` |
| [app/alertas/page.tsx:351](app/alertas/page.tsx#L351) | `MetricCard` | (não lido em detalhe) | — | — |
| [app/aplicacoes/page.tsx:431](app/aplicacoes/page.tsx#L431) | `MetricCard` | — | — | — |
| [app/aplicacoes/historico/page.tsx:220](app/aplicacoes/historico/page.tsx#L220) | `MetricCard` | — | — | — |
| [app/custos/page.tsx:306](app/custos/page.tsx#L306) | `MetricCard` | + Icon + bg + cl | — | — |
| [app/custos/historico/page.tsx:190](app/custos/historico/page.tsx#L190) | `MetricCard` | — | — | — |
| [app/certificacoes/page.tsx:415](app/certificacoes/page.tsx#L415) | `MetricCard` | — | — | — |
| [app/auditoria/page.tsx:38](app/auditoria/page.tsx#L38) | `StatCard` | shape diferente (in/out pair) | — | — |

### Inconsistências detectadas

#### A. **Font-weight do número não bate** entre variantes
- `produtivo` HeroMetric: `font-bold` (700)
- `cadeia` MetricCard: `font-semibold` (600)
- `reprodutivo/insumos` KpiCard via `ag-kpi-value` standalone class: `font-weight: 700`
- mas a class `.ag-kpi-card .ag-kpi-value` override pra `font-weight: 600`

Resultado: o **mesmo "número grande"** renderiza com peso diferente dependendo da página.

#### B. **Font-size do número varia 3 valores**
- 1.875rem (`text-3xl` em produtivo/cadeia)
- 2rem (`.ag-kpi-value` standalone)
- 1.875rem (`.ag-kpi-card .ag-kpi-value`)

#### C. **Border-radius do card varia 5 valores diferentes**
- 16px (`rounded-2xl` em produtivo HeroMetric — recém polish 18/05)
- 24px (`ag-kpi-card`)
- 24px (`rounded-3xl` no Tailwind)
- 28px (`ag-card`)
- 32px (`ag-card-strong`)

#### D. **Padding interno varia 2 valores**
- p-5 (1.25rem) em reprodutivo/insumos
- p-6 (1.5rem) em produtivo HeroMetric (recém polish)

#### E. **Cor de subtitle/sub varia**
- `text-xs text-muted` (reprodutivo, insumos)
- `text-sm leading-6 text-secondary` (produtivo, cadeia)
- class `p.sub` definida em globals.css (operacoes)

#### F. **🚨 BUG CRÍTICO em globals.css**: `.ag-kpi-value` definida **2 vezes** com valores diferentes:
- [globals.css:314-319](app/globals.css#L314-L319) — standalone: `2rem`, weight `700`
- [globals.css:385-392](app/globals.css#L385-L392) — dentro de `.ag-kpi-card`: `1.875rem`, weight `600`, com `margin-top: 0.75rem`

Quem usa `.ag-kpi-value` fora de `.ag-kpi-card` (raro) vê o valor "grande/bold". Dentro do card, vê "médio/semibold". Não é bug do navegador — é **conflito intencional na cascata** que ninguém documentou.

---

## 1.2 — Páginas auditadas (análise por arquivo)

> **Limitação**: análise estática de classes Tailwind/ag-*. Renderização real em viewport 375px **não validada** — recomendo passar Playwright pra cobertura visual.

### `/produtivo` ([app/produtivo/page.tsx](app/produtivo/page.tsx) — 628 linhas)
- **Status pós-polish 18/05**: HeroMetric usa `rounded-2xl bg-white shadow-sm p-6 font-bold` — **não usa `ag-kpi-card`**, criou variante isolada
- Hero h1 `text-3xl semibold` (após polish, era `ag-page-title` 3rem)
- Hero grid `xl:grid-cols-[1.08fr_0.92fr]` — proporção ímpar
- Lista "Ranking de evolução": cards `block rounded-3xl` (24px) — outro radius
- Tabela "Performance por lote": usa `ag-table` (padrão) ✅

### `/painel` ([app/painel/page.tsx](app/painel/page.tsx) — **1227 linhas**)
- **Risco visual ALTO** pela escala. Cada bloco potencialmente reescrito.
- **Sem auditoria detalhada** nesta passada — flag pra audit dedicado posterior

### `/reprodutivo` ([app/reprodutivo/page.tsx](app/reprodutivo/page.tsx) — 330 linhas)
- KpiCard local `ag-card flex flex-col gap-1 p-5` — usa `ag-card` (28px radius) em vez de `ag-kpi-card` (24px)
- Hero: `text-3xl semibold lg:text-4xl` — diferente do produtivo e do `ag-page-title`
- 7 seções, cada uma `ag-card p-6 lg:p-8` ✅ consistente entre si
- Empty state local (inline) em vez de `<EmptyState>` class shared

### `/animais` (903 linhas) + `/animais/[id]` (1124 linhas)
- **Sem auditoria detalhada** — duas das maiores páginas, risco visual alto
- Sabidamente tem `HalalBadgeSVG` ainda em [animais/[id]:558](app/animais/[id]/page.tsx#L558) e [animais/page.tsx:6](app/animais/page.tsx#L6) — UI ainda mostra Halal mesmo no foco-bovinos

### `/lotes` + `/lotes/[id]` (750 linhas detalhe)
- **Sem auditoria detalhada** — escala alta, contém `HalalBadgeSVG` em [lotes/[id]:441,519](app/lotes/[id]/page.tsx#L441) (2 usos)

### `/aplicacoes` ([app/aplicacoes/page.tsx](app/aplicacoes/page.tsx) — 458 linhas)
- `MetricCard` local em linha 431
- Hero próprio
- **Risco**: tabela com colunas técnicas (CRMV, dose, via) — strings longas

### `/pesagens` ([app/pesagens/page.tsx](app/pesagens/page.tsx) — 519 linhas)
- **Sem auditoria detalhada** — flagado pra leitura

### `/market` ([app/market/page.tsx](app/market/page.tsx) — 192 linhas)
- Usa `ag-kpi-card` diretamente (sem wrapper local) ✅ — modelo a seguir
- KPIs com Icon dentro: layout `inline-flex h-9 w-9` padronizado
- 4 cards de cotação CEPEA + 4 KPIs + tabela `MarketTable`
- `MarketTable` tem `text-right` em peso (numérico) e `text-center` em status ✅ correto
- Hero grid `xl:grid-cols-[1.1fr_0.9fr]` — DIFERENTE de produtivo (1.08/0.92)
- HalalBadgeSVG ainda visível em MarketTable (intencional, confirmado)

### `/cadeia` ([app/cadeia/page.tsx](app/cadeia/page.tsx) — 224 linhas)
- `MetricCard` local linha 176 — usa `ag-kpi-card` MAS override manual com `text-3xl font-semibold` (não `ag-kpi-value`)
- ChainPill component inline — chega a quebrar em mobile com nomes longos de propriedade

### `/operacoes` ([app/operacoes/page.tsx](app/operacoes/page.tsx) — 99 linhas)
- Usa `ag-kpi-card` direto (sem wrapper) ✅
- Mas adiciona class custom de cor inline (`text-purple-600`, `text-blue-600`, etc.) por KPI
- Grid de módulos com card padronizado entre si ✅

### `/produtos` ([app/produtos/page.tsx](app/produtos/page.tsx) — 124 linhas)
- Sem KpiCard — só header + tabela
- Tabela com 6 colunas, badges coloridos por categoria ✅
- Coluna "Editar" removida hoje (18/05)
- **Risco**: coluna "Nome" pode estourar com nomes longos de produto — sem truncate explícito

### `/insumos` ([app/insumos/page.tsx](app/insumos/page.tsx) — 218 linhas)
- KpiCard local com `valueClass` opcional
- `CATEGORY_VALUES` hardcoded — 4 categorias com cores diferentes
- Grid de cards de categoria com barra de progresso — visual consistente
- Hero diferente (full-width, sem grid)

### `/sanitario`
- **Não existe** como rota. As páginas sanitárias atuais são `/aplicacoes`, `/estoque`, `/estoque/dashboard`, `/calendario-sanitario`.

---

## 1.3 — Tipografia

### Hierarquia em uso

| Token / Class | Tamanho | Peso | Uso |
|---|---|---|---|
| `ag-page-title` | 2.25rem / 3rem lg | 600 | Hero h1 (algumas páginas) |
| `text-3xl semibold lg:text-4xl` | 1.875rem / 2.25rem lg | 600 | Hero h1 (insumos, reprodutivo) — **alternativa** |
| `text-3xl semibold` | 1.875rem | 600 | Hero h1 (produtivo após polish 18/05) — **3ª variante** |
| `ag-section-title` | 1.5rem | 600 | h2 |
| `ag-section-subtitle` | 0.95rem | normal | sub-h2 |
| `ag-kpi-value` standalone | 2rem | 700 | número (conflito) |
| `ag-kpi-card .ag-kpi-value` | 1.875rem | 600 | número dentro card |
| `ag-kpi-label` | 0.9rem / 0.875rem (no card) | normal | label muted |
| `text-base font-semibold` | 1rem | 600 | h2 mini (algumas listas) |
| `text-sm` | 0.875rem | normal | body |
| `text-xs` | 0.75rem | normal | meta/captions |
| `text-[10px]` / `text-[11px]` | inline | varia | badges, labels uppercase |
| `text-[12px]` / `text-[13px]` | inline | varia | nav sub-items |

**Problema**: 3 variantes diferentes pra h1 hero (`ag-page-title`, `text-3xl lg:text-4xl`, `text-3xl semibold`). Cada página renderiza tamanho diferente.

---

## 1.4 — Espaçamento

| Contexto | Padrão observado | Variantes |
|---|---|---|
| Padding card padrão | `p-6 lg:p-8` | `p-8`, `p-8 lg:p-10`, `p-5`, `p-6` (5 padrões) |
| Padding KPI card | `p-5` ou `p-6` | depende da variante local |
| Gap em grid de KPIs | `gap-4` ✅ consistente | — |
| Margin entre seções `<section>` | `space-y-8` no `<main>` ✅ consistente | — |
| Margin top de elementos dentro de card | `mt-3`, `mt-5`, `mt-6`, `mt-8`, `mt-10` | 5 valores |

---

## 1.5 — Cores

### Tokens definidos em globals.css ✅
- `--primary` `--primary-hover` `--primary-soft` — verdes Agraas
- `--text-primary` `--text-secondary` `--text-muted` — hierarquia texto
- `--success` `--warning` `--danger` `--info` — semântica
- `--border` `--border-strong`

### Inconsistências
- **Verde**: páginas usam **às vezes** `var(--primary)`, **às vezes** `text-emerald-600`, `text-green-600`, `text-emerald-300` (sidebar). Sem regra.
- **Vermelho**: `text-red-500`, `text-red-600`, `var(--danger)`, `text-rose-*` — múltiplos usos pra "negativo"
- **Amarelo/atenção**: `text-amber-600`, `text-yellow-700`, `text-[#D97706]` (hex direto em /operacoes), `var(--warning)`
- **Hover states**: alguns links têm `hover:underline`, outros `hover:bg-*`, outros mudam só cor. Inconsistente.

---

## 1.6 — Componentes truncados (riscos de overflow)

Strings que **podem** estourar layout (não validado em browser, mas detectado no código):

| Lugar | Risco | Mitigação atual |
|---|---|---|
| MarketTable col Fazenda | Nome propriedade longo | `max-w-[150px] truncate` ✅ |
| MarketTable col Animal | `internal_code` curto ok, `agraas_id` longo (AGR-XXXXXXXX) | sem truncate |
| /cadeia ChainPill | Nome propriedade longo dentro de pill | sem truncate — pode quebrar layout |
| /produtos coluna Nome | Nome produto longo | sem truncate |
| Sidebar item label | Labels curtos (Animais, Lotes, etc.) | ok, mas "Histórico Movimentações" tem 23 chars |
| /painel listings de animais | IDs longos podem extrapolar cards | flag pra audit visual |
| Tabela de aplicações col CRMV | Sigla curta ok | — |

**Datas formatadas**: maioria usa `toLocaleDateString("pt-BR")` ✅ consistente.

---

## 1.7 — Mobile / Responsividade (375px)

### Não auditado em browser, mas detectado no código:

| Item | Status |
|---|---|
| Sidebar (lg:flex) | Hidden < 1024px ✅, substituída por MobileDrawer ✅ |
| MobileDrawer | Largura fixa `w-[320px]` — pode ser estreita em 320-360px |
| Grid de KPIs | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` em operacoes — **5 colunas em lg** pode apertar |
| Hero em produtivo/market | `xl:grid-cols-[ratio]` — em mobile vira 1 coluna ✅ |
| Tabelas `ag-table` | Têm `overflow-x-auto` wrapper em ~70% dos casos — algumas faltam |
| MarketTable | `overflow-x-auto` ✅ |
| /produtivo tabela "Performance por lote" | `overflow-x-auto` ✅ |
| /cadeia ChainPill row | `flex flex-wrap` ✅ envolve em mobile, mas pills podem ficar gigantes individuais |
| Header sticky `h-20` | Pode comer espaço útil em telas pequenas |

---

## 1.8 — Top 20 bugs visuais prioritários

> Severidade: **P0** = quebra layout / inacessível · **P1** = visual ruim mas funciona · **P2** = polish / consistência

| # | Sev | Arquivo:linha | Descrição | Tempo fix |
|---|---|---|---|---|
| 1 | **P0** | [globals.css:314, 385](app/globals.css#L314) | `.ag-kpi-value` definida 2× com weight/size diferentes — fonte raiz da inconsistência de números entre páginas | 15min |
| 2 | **P0** | 12 páginas | 12 implementações locais de "card de métrica" reimplementadas — substituir por componente único | 4h |
| 3 | **P1** | [app/produtivo/page.tsx:559](app/produtivo/page.tsx#L559) | HeroMetric usa `rounded-2xl bg-white shadow-sm` enquanto resto usa `ag-kpi-card` 24px — destoa visualmente | 5min |
| 4 | **P1** | [app/cadeia/page.tsx:176](app/cadeia/page.tsx#L176) | MetricCard override manual de `text-3xl font-semibold` em vez de usar `ag-kpi-value` da class | 5min |
| 5 | **P1** | [app/reprodutivo/page.tsx:5](app/reprodutivo/page.tsx#L5) | KpiCard usa `ag-card` (28px radius) em vez de `ag-kpi-card` (24px) — destoa | 5min |
| 6 | **P1** | [app/insumos/page.tsx:21](app/insumos/page.tsx#L21) | KpiCard tem `valueClass` opcional que outros não — passa cor de forma fora do padrão | 10min |
| 7 | **P1** | 3 páginas (produtivo, market, cadeia) | Heros com proporções `xl:grid-cols-[ratio]` diferentes (1.08/0.92 vs 1.1/0.9 vs full) | 30min |
| 8 | **P1** | [app/cadeia/page.tsx:152](app/cadeia/page.tsx#L152) | ChainPill com nome longo de propriedade pode quebrar layout em mobile | 20min |
| 9 | **P1** | [app/produtos/page.tsx:101](app/produtos/page.tsx#L101) | Coluna "Nome" sem `truncate` — produto longo estoura | 10min |
| 10 | **P1** | [app/operacoes/page.tsx:54](app/operacoes/page.tsx#L54) | Grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` aperta números em 5 colunas | 5min |
| 11 | **P2** | Múltiplos | Cores semânticas misturadas (`text-emerald-*` vs `var(--primary)` vs `text-green-*`) | 1h |
| 12 | **P2** | Múltiplos | Hover states inconsistentes (underline vs bg vs color) | 30min |
| 13 | **P2** | Múltiplos | 3 variantes de h1 hero (`ag-page-title`, `text-3xl lg:text-4xl`, `text-3xl`) | 15min |
| 14 | **P2** | Múltiplos | Empty states: alguns usam class `ag-empty-state` shared, outros inline (`flex items-center min-h-[80px]` etc) | 30min |
| 15 | **P2** | Toda plataforma | **Nenhum `<Skeleton />` reutilizável** — class `.ag-skeleton` existe mas não é usada | 1h |
| 16 | **P2** | [app/lotes/[id]/page.tsx](app/lotes/[id]/page.tsx), [app/animais/[id]/page.tsx](app/animais/[id]/page.tsx), [app/painel/page.tsx](app/painel/page.tsx) | `HalalBadgeSVG` ainda renderiza em pages internas após decisão foco-bovinos 17/05 | 30min |
| 17 | **P2** | [app/animais/page.tsx](app/animais/page.tsx), [app/lotes/[id]/page.tsx](app/lotes/[id]/page.tsx) | Pages com mais de 900 linhas — qualquer mudança trinca tectônica. Quebrar em sub-componentes | 4-6h |
| 18 | **P2** | Sidebar accent | Cor hover `var(--sidebar-accent-bg)` aplicada inconsistente entre highlight / primário / sub | 20min |
| 19 | **P2** | Múltiplos | `mt-3`, `mt-5`, `mt-6`, `mt-8`, `mt-10` usados sem padrão dentro de cards | 30min |
| 20 | **P2** | Sem `<EmptyState>` componente único | Cada página re-declara `function EmptyState` localmente | 30min |

**Total tempo estimado**: ~14-16h pra padronizar tudo (incluindo painel/animais refactors).

---

## Limitações desta auditoria

1. **Sem inspeção em browser**: ninguém validou pixels reais em viewport 375px, 768px, 1024px, 1440px. Recomendo: 1 hora com DevTools + Playwright capturando screenshots.
2. **Páginas grandes lidas só superficialmente**: `/painel` (1227 linhas), `/animais/[id]` (1124), `/lotes/[id]` (750), `/marketplace/page.tsx` (1054). Cada uma merece audit dedicado.
3. **Cores hardcoded inline (hex)** não totalmente mapeadas — fazer grep `text-\[#` revela vários.
4. **Componentes que falham em estados específicos** (loading lento, erro de query, lista 1000+ itens) não testados.
