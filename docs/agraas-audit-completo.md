# Auditoria Completa — Plataforma Agraas

> Snapshot do estado real do código em **2026-05-18**.
> Read-only. Não modifica nada — apenas documenta o que existe.

---

## 1. Trees

### `/app` — 109 rotas/handlers
- **Páginas autenticadas** (~80): operacionais (animais, lotes, pesagens, aplicações, abates, custos, fiscal, etc.)
- **Páginas públicas** (5): `/`, `/login`, `/cadastro`, `/sobre`, `/passaporte/[agraas_id]`, `/planos`, `/reset-password`, `/marketplace` (lista pública)
- **Páginas pausadas (rotas redirecionadas via `proxy.ts`)**: `/ovinos`, `/caprinos`, `/aves`, `/agricultura`, `/comprador`, `/dashboard`
- **Páginas “em-breve”**: `/em-breve` (landing de cadeias pausadas)
- **/api/**: 22 endpoints (Stripe, fiscal parse-xml, predict-score, marketplace, cron, chat, email, export PDF, dashboard-stats)

### `/app/components` — 92 componentes
Hierarquia interna:
- raiz (`app/components/*.tsx`): operacionais e dashboards (CompradorView, AnimalTimeline, MarketTable, etc.)
- `charts/`: 4 charts + 4 wrappers SSR-safe (IABreakdown, InsumosBar, ReproGauge, WeightDist)
- `financeiro/`: FinanceiroCharts, FinanceiroTabs
- `landing/`: 8 seções da landing pública (BrazilAgro, Credibility, FAQ, FSJBECase, HowItWorks, Operational, Portos, Scores)
- `marketplace/`: 4 (ActivityTicker, MarketplacePublicView, MarketplaceTabs, NewListingForm, OfferPanel)
- `ui/`: 9 primitivos (AuroraGlow, AuthShell, HeroParallaxImage, Motion, MotionProvider, PublicFooter, PublicShell, ScoreRing, ScrollToTop, SectionDivider, ShimmerButton)

### `/lib` — 8 arquivos
- `supabase-server.ts`, `supabase-service.ts`, `supabase.ts` — 3 clients (SSR cookies, service-role bypass, browser)
- `agraas-analytics.ts` — funções puras de score
- `passport-i18n.ts` — textos bilingues do passaporte
- `rate-limit.ts` — rate limit em memória
- `email.ts` — wrapper Resend (criado 17/05 do refactor Stripe)
- `with-sentry.ts` — wrapper instrumentação

### `/supabase` — 110 migrations + edge function
- **migrations/**: 001–116 (gap em 041, 117–115 reservados a alocações futuras)
- **functions/score-engine/**: 1 edge function (TS) — auditoria pendente
- **rollbacks/**: 17 rollbacks (cobertura parcial — migrations antigas sem rollback)

---

## 2. Rotas — proteção + propósito

> `P` = protegida (auth obrigatório) · `Pu` = pública · `R` = redirecionada (foco bovinos)

| Rota                                  | Tipo | Propósito |
|---|---|---|
| `/`                                   | Pu   | Landing pública / redireciona logado |
| `/login`                              | Pu   | Auth |
| `/cadastro`, `/sobre`, `/planos`      | Pu   | Marketing / planos |
| `/reset-password`                     | Pu   | Reset senha |
| `/passaporte/[agraas_id]`             | Pu   | Passaporte público de animal (service-role client) |
| `/marketplace`, `/marketplace/[id]`   | Pu   | Marketplace público |
| `/painel`                             | P    | Dashboard principal (1227 linhas; usa `agraas_master_passport_cache`) |
| `/dashboard`                          | R→`/painel` | Versão antiga |
| `/produtivo`                          | P    | Dashboard produtivo (628 linhas) — pesagens, scores, lotes |
| `/inteligencia`                       | P    | IA / predições |
| `/animais`, `/animais/[id]`, `/animais/novo` | P | CRUD bovinos + passaporte completo (1124 linhas detalhe) |
| `/propriedades`, `/.../[id]`, `/.../novo`    | P | CRUD fazendas (855 lista, 695 detalhe) |
| `/lotes`, `/.../[id]`, `/.../novo`, `/.../[id]/adicionar` | P | Lotes de exportação (750 detalhe) |
| `/reprodutivo`                        | P    | **JÁ EXISTE** — 330 linhas (criada abril/26). Lê `reproductive_seasons` |
| `/scores`, `/selos`                   | P    | Scores e selos |
| `/pesagens`, `/pesagens/historico`    | P    | Pesagens (519 lista) |
| `/aplicacoes`, `/aplicacoes/historico` | P   | Sanitário (458 lista) |
| `/estoque`, `/estoque/dashboard`, `/.../historico`, `/.../novo` | P | Estoque + dashboard sanitário |
| `/calendario-sanitario`               | P    | Calendário vacinação |
| `/metas`                              | P    | Metas de peso |
| `/movimentacoes`, `/.../historico`    | P    | Entradas/saídas |
| `/eventos`                            | P    | Tabela `events` unificada |
| `/custos`, `/.../historico`, `/custo-producao` | P | Custos |
| `/vendas`, `/abates`                  | P    | Comercial (416 vendas, 433 abates) |
| `/fiscal`, `/.../[id]`, `/.../relatorio` | P  | NFs |
| `/compradores`                        | P    | Compradores (financeiro produtor) |
| `/fornecedores`, `/produtos`, `/insumos` | P | Cadastros de suprimentos |
| `/producao`, `/operacoes`             | P    | Vistas operacionais |
| `/marketplace/novo`                   | P    | Criar listing |
| `/financeiro`                         | P    | Painel financeiro (highlight "PIF" no sidebar) |
| `/exportacao`                         | P    | Central de exportação (560 linhas) — relacionada PIF |
| `/tracking`                           | P    | Rastreio de embarques |
| `/configuracoes/assinatura`           | P    | Stripe |
| `/migrar-dados`                       | P    | Import CSV |
| `/auditoria`, `/relatorios`, `/alertas`, `/certificacoes`, `/historico`, `/cadeia`, `/market` | P | Relatórios |
| `/comprador`, `/comprador/...`        | R→`/em-breve` | Portal PIF pausado |
| `/ovinos/...`, `/caprinos/...`, `/aves/...` | R→`/em-breve` | Pecuária expandida pausada |
| `/agricultura/...`                    | R→`/em-breve` | Agricultura pausada |
| `/em-breve`                           | P    | Landing de cadeias pausadas |
| `/api/...` (22 endpoints)             | P    | Server-side handlers |

---

## 3. SidebarNav atual

**Arquivo**: `app/components/SidebarNav.tsx` (293 linhas, `"use client"`).

**8 grupos visíveis** + 2 grupos comentados (Pecuária Expandida, Agricultura — pausados 17/05).

| Grupo                | Itens | Items destacados |
|---|---|---|
| (sem rótulo)         | Painel, Inteligência | — |
| Rebanho              | Animais, Propriedades, Lotes, Reprodutivo, Scores | — |
| Exportação           | Central de Exportação, Rastreio | badge PIF em ambos |
| Operações            | 12 itens (Aplicações, Pesagens, Estoque, Metas, Cal. Sanitário, Fornecedores, Produtos, Produção, Insumos, Eventos, Movimentações, Operações) — **mega-grupo** | — |
| Financeiro           | Painel Financeiro, Custos, Custo Produção, Compradores, Vendas, Abates, Fiscal | badge PIF em "Painel Financeiro" |
| Ferramentas          | Importar animais, Planos, Assinatura | — |
| Marketplace          | Marketplace | badge PIF |
| Relatórios           | Market, Relatórios, Auditoria, Alertas, Certificações, Histórico, Cadeia | — |

**Padrões visuais**: 3 estilos de item — primário (azul), highlight (verde forte com badge PIF), sub (recuado).

**Mapeamento item ↔ rota ↔ arquivo**: 1:1 — todo `item.href` casa com `app{href}/page.tsx`.

---

## 4. Top componentes (por LOC e referências)

| Componente | LOC | Onde é importado |
|---|---|---|
| `MarketplacePublicView` | 1054 | `app/marketplace/page.tsx`, `app/page.tsx` |
| `AnimalTimeline` | 584 | `app/animais/[id]/page.tsx`, `app/painel/page.tsx` |
| `ExportPassportModal` | 539 | `app/animais/[id]/page.tsx` |
| `CompradorCertificationMatrix` | ~250 | `app/comprador/page.tsx` (pausado) |
| `MarketplaceTabs`, `NewListingForm` | ~280, 395 | marketplace |
| `CompradorView`, `Comprador*Tab` | — | `/comprador` (pausado) |
| `BrazilMap*`, `ExportRouteMap`, `ShipTrackingMap` | — | mapas Leaflet (dynamic ssr:false) |
| `ScoreRing` | ~80 | passaporte, painel |
| `AuthShell`, `PublicShell` | — | landing e cadastro |
| `HalalBadgeSVG` | ~30 | **24 imports** — referenciado em painel, animais, lotes, marketplace, exportação, passaporte, comprador, ovinos/aves (esses pausados). Removido apenas do **header da sidebar** em 18/05; demais ocorrências mantidas. |
| `LotValueCalculator` | ~200 | `app/lotes/[id]/page.tsx` |
| `TrackingTimeline`, `CompradorTrackingSection` | — | tracking e comprador |
| `AgroAssistant` | — | floating em todas as páginas autenticadas |
| `QuickActions` | — | floating em todas as páginas |
| `Toast` + `ToastContainer` | — | global |
| `MobileDrawer` | — | header (mobile) |
| `LogoutButton` | — | header |
| Charts (4 + wrappers) | — | dashboards específicos |

---

## 5. Dashboard principal — `app/painel/page.tsx` (1227 linhas)

**12 queries Supabase** (`.from(...)`):
- Tabela primária: `agraas_master_passport_cache` (cache pré-calculado de passaporte por animal)
- Demais: `clients`, `properties`, `animals`, `weights`, `applications`, `lots`, `events`, `animal_scores`, `marketplace_listings`, `platform_settings`, `shipment_tracking`

**Padrão**: Server Component async + `Promise.all` paralelo das queries + memoização local + render de blocos.

**Seções renderizadas** (inferido por LOC):
- Hero metrics (cabeças, score médio, GMD)
- Mapa Brasil (BrazilMap dinâmico)
- Cards por propriedade
- Animal Timeline embedded
- Halal badge ainda presente (linha 513) — **escopo de remoção feita só no header**
- Score charts e distribuição
- Lista de animais top-score
- Tracking de embarques

**Risco**: ~1227 linhas em um único arquivo — qualquer mudança tem blast-radius alto. Bom candidato a quebra em sub-componentes.

---

## 6. Tabelas Supabase mais referenciadas no código frontend

| Tabela | Refs |
|---|---|
| `animals` | 56 |
| `clients` | 50 |
| `weights` | 29 |
| `lots` | 23 |
| `applications` | 23 |
| `properties` | 21 |
| `events` | 21 |
| `animal_certifications` | 18 |
| `agraas_master_passport_cache` | 15 |
| `platform_settings` | 13 |
| `animal_lot_assignments` | 12 |
| `products`, `fiscal_notes` | 11 |
| `stock_batches` | 10 |
| `marketplace_listings`, `crop_shipments`, `crop_fields` | 8 |
| `shipment_tracking`, `farms_agriculture`, `animal_scores` | 7 |
| `fiscal_alerts`, `crop_shipment_tracking`, `animal_movements` | 6 |
| `supply_financials`, `subscription_events`, `poultry_batches`, `livestock_species`, `fiscal_note_items` | 5 |
| `suppliers`, `slaughter_records` | 4 |

**Tabelas operacionais novas (108–111, 116) ainda SEM referência no frontend**:
- `coverings`, `pregnancy_diagnostics`, `births`, `bull_breeding_soundness`, `semen_batches`, `semen_batch_applications`, `feed_efficiency_records`, `carbon_footprint_estimates`, `mapa_carencias`, `vaccination_schedules`, `mentor_assignments` — schema pronto, **UI inexistente** (escopo Eixo A/B).

---

## 7. Decisões arquiteturais visíveis

### Server vs Client components
- Total `.tsx`: **194**
- `"use client"`: **167** (86%)
- Server Components (sem `"use client"`): **27** (14%)

Heavy client-side. Páginas de dashboard são Server Components, mas a maioria dos componentes interativos são client. Isso onera o bundle JS.

### Auth pattern
- 62 usos de `createSupabaseServerClient()` (cookies SSR)
- 7 usos de `createBrowserClient(...)` direto
- 6 usos de `createSupabaseServiceClient()` (bypassa RLS — para `/passaporte` público e `/comprador` agregado, ou rota Stripe).

Padrão consistente: Server Components usam `createSupabaseServerClient`. APIs de admin/webhook usam service client.

### Forms
- Apenas **7 arquivos** usam Zod ou react-hook-form. A maioria dos forms é HTML nativo + Server Actions ou submit manual. **Disciplina de validação baixa**.

### Cache
- Não há uso explícito de `unstable_cache`, `revalidate`, ou `cache: 'no-store'` em padrão consistente. Páginas confiam em revalidação implícita do Next 16.

### Loading / Error states
- Poucos `loading.tsx` / `error.tsx`. Componentes lidam inline com `if (error)` ou `if (data.length === 0)`. Falta `<Skeleton />` e `<EmptyState />` reutilizáveis.

---

## 8. Componentes órfãos (existem mas não importados em nenhum lugar)

| Arquivo | Provável status |
|---|---|
| `app/components/AgraasLogo.tsx` | substituído pelo `<h1>Agraas</h1>` inline no layout |
| `app/components/BrazilMapSVG.tsx` | substituído por BrazilMap (Leaflet) |
| `app/components/JourneySection.tsx` | landing antiga removida |
| `app/components/MarketplaceCTAModal.tsx` | refactor marketplace |
| `app/components/ScrollReveal.tsx` | foi removido das landings |
| `app/components/landing/CredibilityStrip.tsx` | landing v2 |
| `app/components/ui/AuroraGlow.tsx` | feedback "evitar cara AI startup" 23/04 |
| `app/components/ui/SectionDivider.tsx` | landing v2 |
| `app/components/ui/ShimmerButton.tsx` | feedback "evitar cara AI startup" 23/04 |

**Recomendação**: 9 arquivos podem ser deletados em PR de limpeza. Total ~500 linhas mortas.

---

## 9. Tags / Features pausadas

### "PIF" em código (4 ocorrências relevantes)
- `app/components/compradorTypes.ts:80,92` — i18n strings do portal comprador
- `app/components/SidebarNav.tsx:254` — badge highlight em itens "Exportação" e "Painel Financeiro" e "Marketplace"
- `app/tracking/page.tsx:142` — badge "PIF · Exportação" em tracking

### "em-breve"
- `proxy.ts` — destino dos redirects de rotas pausadas
- `app/em-breve/page.tsx` — página landing pausa
- `app/planos/page.tsx` — usa string literal `"em-breve"` como feature flag dentro da tabela comparativa de planos (linhas 91, 97, 101, 422)

### Feature flags
**Nenhum sistema de feature flags formal** (GrowthBook, LaunchDarkly, etc.). Pausas são feitas via redirects em `proxy.ts` ou comentários no SidebarNav.

### Strings "Saudita"/"Jeddah"/"SIF" no código
14 arquivos mencionam (lista no audit detalhado). Maioria em `/exportacao`, `/tracking`, `/comprador`, `/lotes/[id]` — coerente com o histórico PIF. **Filtro UI** adicionado em 18/05 só em `/produtivo` (commit fffc9f2). Outras páginas ainda mostram referências.

---

## 10. Pontos de complexidade

### Arquivos > 500 linhas (16 arquivos)
| Arquivo | LOC | Risco |
|---|---|---|
| `app/painel/page.tsx` | **1227** | Mega-arquivo. Cada query/seção isolável. |
| `app/animais/[id]/page.tsx` | 1124 | Passaporte completo + timeline + certs. Quebrar em sub-componentes. |
| `app/components/marketplace/MarketplacePublicView.tsx` | 1054 | Marketplace público — 3 ocorrências de HalalBadge embutidas. |
| `app/animais/page.tsx` | 903 | Lista com filtros, modais, ações em massa. |
| `app/propriedades/page.tsx` | 855 | Mapa + cards + tabela + form. |
| `app/lotes/[id]/page.tsx` | 750 | Composição de lote + calculadora + tracking + PDF. |
| `app/propriedades/[id]/page.tsx` | 695 | Detalhe com 3+ seções. |
| `app/api/export/lot-pdf/route.tsx` | 692 | PDF react-pdf monolítico. |
| `app/planos/page.tsx` | 642 | Tabela de planos comparativa (suporta "em-breve" literal). |
| `app/produtivo/page.tsx` | 628 | Dashboard produtivo — agora com filter Arábia (18/05). |
| `app/dashboard/page.tsx` | 600 | **Vestígio da versão antiga** — redireciona via proxy.ts para /painel mas o arquivo ainda existe. **Candidato a delete.** |
| `app/exportacao/page.tsx` | 560 | Pausável junto com PIF. |
| `app/migrar-dados/page.tsx` | 550 | Import CSV — admin only. |
| `app/components/ExportPassportModal.tsx` | 539 | Modal pesado de exportar passaporte. |
| `app/pesagens/page.tsx` | 519 | Lista + form modal. |

### Sinais de reescrita
- Existência de `/dashboard` (600 linhas) E `/painel` (1227 linhas) — `/dashboard` é redirecionado mas mantido como “código dormente”
- `app/components/JourneySection.tsx` órfão (era da landing v1)
- `landing/CredibilityStrip.tsx`, `ui/AuroraGlow.tsx`, `ui/ShimmerButton.tsx` órfãos — limpeza pós-feedback “evitar cara AI startup” 23/04
- Componentes de "Comprador*" intactos mas rota `/comprador` pausada — débito técnico documentado em comentário no SidebarNav

### Inconsistência crítica detectada
- **`/reprodutivo` existe (rota canônica desde abril)** mas os prompts da fila criam `/reproducao` (PT-BR sem o "ti" final). Mantém-se `/reprodutivo` ou faz-se uma migration de rota (+ redirect)? **Pendente de decisão.**

---

## Apêndice — Estado do banco (pós 108-111, 116 aplicadas)

| Domínio | Tabelas | RLS | Policies |
|---|---|---|---|
| Reprodução (operacional) | 11 (coverings, diagnostics, births, bull soundness, semen, semen apps, feed eff, carbon, repro seasons, ia services, stock summary) | ✅ todas | 44 CRUD + 18 mentor_select |
| Sanitário (novo) | 2 (mapa_carencias, vaccination_schedules) | ✅ | 8 CRUD |
| Auth/RBAC | 1 (mentor_assignments) + 2 functions (is_mentor_externo, mentor_has_access_to_client) | ✅ | 4 |
| Triggers | 4 (3 de agregação repro + 1 de carência sanitária) | — | — |
