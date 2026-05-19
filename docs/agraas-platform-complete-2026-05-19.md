# Agraas — Documento Técnico Completo da Plataforma

> Snapshot técnico-factual. Gerado em **2026-05-19**.
> Auditoria via Management API Supabase (queries reais) + leitura de arquivos.
> Sem opinião estratégica; quando não foi possível confirmar, marcado `[a verificar]`.

---

## PARTE 1 — IDENTIDADE E POSICIONAMENTO

### 1.1 — Produto e versão

- **Nome**: Agraas
- **Versão `package.json`**: `0.1.0` (private; deploy interno via Vercel)
- **Display label da plataforma**: `v0.9 Beta` (header sticky, [app/layout.tsx:87](app/layout.tsx#L87))
- **Repositório GitHub**: `lucasferreiraborin-cell/agraas-platform`
- **Branch produção**: `main` (deploy automático Vercel)
- **URL produção**: https://agraas-platform.vercel.app (HTTP 200 verificado)
- **Domínio adicional**: https://www.agraas.com.br [a verificar — DNS apontando pra Vercel]

### 1.2 — Tagline / posicionamento

| Local | Texto |
|---|---|
| Sidebar (sob "Agraas") | "Plataforma do agro" — text-xs text-white/55 ([app/layout.tsx:143](app/layout.tsx#L143)) |
| Header (verde primary) | "Plataforma Agraas" + h2 "Infraestrutura digital da pecuária bovina" ([app/layout.tsx:212-218](app/layout.tsx#L212)) |
| Meta title raiz | "Agraas — O agro do Brasil, auditável em tempo real." ([app/layout.tsx:19](app/layout.tsx#L19)) |
| Meta description | "Infraestrutura digital do agronegócio brasileiro. Pecuária, grãos e exportação sobre uma única camada de dados verificáveis — do pasto ao porto." ([app/layout.tsx:23](app/layout.tsx#L23)) |

### 1.3 — Foco vertical e decisões estratégicas registradas

**Decisão 2026-05-17** (registrada em [CLAUDE.md](CLAUDE.md)): **100% pecuária bovina**. Tudo o mais está pausado, não removido (código mantido pra eventual retomada).

Frentes ativas mencionadas no CLAUDE.md:
- **JBS** — CFO Alexandre, Mourão Filho (conversas ativas)
- **IZ-SP** — Dra. Renata + César (mentoria quinzenal, próxima sessão 2026-05-29)
- **GPB / Furlan** — em desenvolvimento

### 1.4 — Frentes pausadas

| Frente | Rota afetada | Comportamento |
|---|---|---|
| Portal PIF (comprador institucional) | `/comprador` | Redireciona pra `/em-breve` via [proxy.ts:17](proxy.ts#L17) |
| Ovinos / Caprinos | `/ovinos`, `/caprinos` | Redirect via proxy.ts |
| Aves / Frangos | `/aves` | Redirect via proxy.ts |
| Agricultura / Grãos | `/agricultura` | Redirect via proxy.ts |
| Sidebar grupo "Exportação" | itens visualmente removidos | comentado em [SidebarNav.tsx](app/components/SidebarNav.tsx) |
| Sidebar grupo "Pecuária Expandida" | idem | comentado |
| Sidebar grupo "Agricultura" | idem | comentado |
| Badge "PIF" em Marketplace/Painel Financeiro | removido visualmente | classes highlight removidas |

### 1.5 — Stakeholders e contas vinculadas (em produção, queried via SQL)

**Clientes registrados (8 em produção)**:

| `clients.id` | Nome | Role | Plano |
|---|---|---|---|
| `00000000-0000-0000-0003-000000000001` | Fazenda São João da Boa Esperança | admin | pilot |
| `00000000-0000-0000-0099-000000000001` | Fazenda Mentoria IZ-SP | admin | starter |
| `00000000-0000-0000-0099-000000000002` | Frigorífico Mentoria IZ-SP | admin | starter |
| `79c94a7e-b233-4e85-9d72-6d08477c21c9` | Lucas | admin | enterprise |
| `00000000-0000-0000-0001-000000000001` | Pedro | client | starter |
| `00000000-0000-0000-0001-000000000002` | Ico | client | starter |
| `00000000-0000-0000-0004-000000000001` | Paulo | client | starter |
| `187dc70c-d621-40f6-87b5-9033866fd150` | PIF — Public Investment Fund | buyer | starter (pausado) |

---

## PARTE 2 — STACK TÉCNICO COMPLETO

### 2.1 — Versões exatas (package.json)

**Runtime / framework**:
- `next` `^16.1.6` (App Router, Turbopack/webpack híbrido)
- `react` `^19.2.0`
- `react-dom` `^19.2.0`
- `typescript` `^5` (strict mode)
- `tailwindcss` `^4` (PostCSS plugin `@tailwindcss/postcss`)

**Backend / dados**:
- `@supabase/ssr` `^0.9.0`
- `@supabase/supabase-js` `^2.56.0`

**AI / integrações**:
- `@anthropic-ai/sdk` `^0.80.0` (Claude Sonnet 4.6 — modelo em uso)
- `stripe` `^22.0.1` (subscriptions + webhook)
- `resend` `^6.10.0` (transactional email)
- `@sentry/nextjs` `^10.47.0` (observabilidade)

**UI / componentes**:
- `lucide-react` `^0.577.0` (ícones)
- `recharts` `^3.8.0` (charts)
- `leaflet` `^1.9.4` + `react-leaflet` `^5.0.0` + `@types/leaflet` `^1.9.21` (mapas)
- `framer-motion` `^12.38.0` (animações)
- `cobe` `^2.0.1` (globo 3D opcional)
- `globe.gl` `^2.45.3` (3D mundo)
- `three` `^0.184.0` + `@types/three` `^0.184.0` (3D base)
- `geist` `^1.7.0` (Vercel fonts)
- `@react-pdf/renderer` `^4.3.2` (geração PDF)
- `qrcode.react` `^4.2.0` (QR codes do passaporte)

**Validação / forms**:
- `zod` `^4.3.6` (apenas 7 arquivos consumindo — disciplina baixa)

**Testes (dev)**:
- `jest` `^29.7.0`
- `@testing-library/react` `^16.3.2`
- `@testing-library/jest-dom` `^6.9.1`
- `jest-environment-jsdom` `^29.7.0`
- `ts-jest` `^29.4.9`

### 2.2 — Estrutura de pastas

```
agraas/
├── app/                          ← Next.js App Router
│   ├── api/                      ← 22 endpoints server-side (route.ts)
│   ├── components/               ← 99 componentes React
│   │   ├── ui/                   ← 16 componentes compartilhados PR1
│   │   ├── charts/               ← 8 charts (Recharts + wrappers SSR-safe)
│   │   ├── landing/              ← 8 seções landing pública
│   │   ├── marketplace/          ← 5 componentes marketplace
│   │   ├── financeiro/           ← 2 componentes financeiro
│   │   └── (raiz)                ← 62 componentes diversos
│   ├── animais/, lotes/, etc.    ← 85 page.tsx
│   └── layout.tsx                ← Root layout + RoleProvider
├── lib/
│   ├── auth/getCurrentRole.ts    ← Server helper roles (criado 18/05)
│   ├── supabase-server.ts        ← SSR client (cookies)
│   ├── supabase-service.ts       ← service-role bypass
│   ├── supabase.ts               ← browser client
│   ├── agraas-analytics.ts       ← funções puras de score
│   ├── passport-i18n.ts          ← textos bilíngues do passaporte
│   ├── rate-limit.ts             ← rate limit em memória
│   ├── email.ts                  ← Resend wrapper
│   └── with-sentry.ts            ← Sentry wrapper
├── supabase/
│   ├── migrations/               ← 121 .sql (001..122, gap em 041)
│   ├── rollbacks/                ← rollbacks parciais (cobertura ~25%)
│   ├── functions/
│   │   └── score-engine/         ← 1 Edge Function (TS)
│   └── .temp/                    ← cache CLI (gitignored)
├── docs/                         ← 6 docs versionados (1.612 LOC total)
├── .claude/                      ← settings, hooks, skills, commands
│   ├── settings.json             ← 25+ permissions
│   ├── hooks/                    ← 4 hooks (typecheck, FSJBE compliance, etc.)
│   ├── skills/                   ← agraas-fsjbe-guard
│   └── commands/                 ← 4 slash commands
├── .mcp.json                     ← Supabase MCP config
├── CLAUDE.md                     ← Guia técnico de referência
├── middleware.ts                 ← (deletado, mergeado em proxy.ts)
├── proxy.ts                      ← Next 16 middleware (auth + redirects)
└── package.json                  ← v0.1.0 private
```

### 2.3 — Padrões arquiteturais adotados

| Padrão | Status |
|---|---|
| Server Components vs Client | 194 .tsx totais — 167 `"use client"` (86%) — **bundle pesado** |
| RLS multi-tenant | **86 tabelas com RLS habilitada** (100% das base tables); **327 policies** distribuídas |
| Auth pattern | 3 clients: `createSupabaseServerClient()` (Server, cookies SSR) · `createBrowserClient()` (Client) · `createSupabaseServiceClient()` (admin bypass, só pra rotas específicas) |
| Cache strategy | Server Components com `Promise.all` paralelo; `agraas_master_passport_cache` materializado via função `refresh_animal_passport()` |
| Form pattern | Zod usado em **apenas 7 arquivos** (disciplina baixa, oportunidade de padronização) |
| Error handling | Sentry global + try/catch inline; **sem Error Boundary global** (pendência) |
| Loading state | Class `.ag-skeleton` definida mas **usada em 0 páginas** (oportunidade) |

### 2.4 — Deploy + infra

| Item | Valor |
|---|---|
| **Vercel** | Auto-deploy via push em `main`; Linux x64 native build |
| **URL produção** | https://agraas-platform.vercel.app |
| **Build local** | ❌ broken (SWC ARM64 WASM env issue na máquina Lucas Windows) — Vercel autoritativo |
| **Supabase project ref** | `ixuxawcgwhrrrnwendxr` |
| **Supabase region** | [a verificar — provavelmente sa-east-1 ou us-east-1] |
| **Postgres version** | 17 ([cli-latest cache](supabase/.temp/cli-latest)) |
| **Plano Supabase** | [a verificar — possivelmente Pro pelo uso] |
| **Domínio www.agraas.com.br** | apontando pra Vercel [a verificar DNS] |
| **CI/CD** | Vercel build hook (nativo); sem GitHub Actions adicional |

**Variáveis de ambiente em `.env.local`** (apenas nomes, valores omitidos por segurança):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

**Variáveis em Vercel** [a verificar lista exata — provavelmente inclui também STRIPE_*, RESEND_*, SENTRY_DSN]

---

## PARTE 3 — BANCO DE DADOS COMPLETO

### 3.1 — Inventário de tabelas (86 total no schema `public`, 100% RLS on)

#### 3.1.1 REBANHO (operacional bovino)
| Tabela | Propósito |
|---|---|
| `animals` | Cadastro mestre de animais (uuid, internal_code, agraas_id, sex, breed, birth_date, status, category) |
| `lots` | Lotes operacionais (cria, recria, engorda, etc.) |
| `properties` | Fazendas (lat/lng, área hectares) |
| `animal_lot_assignments` | Junção N:N animais × lotes com entry/exit_date |
| `animal_movements` | Histórico de movimentações |
| `weights` | Pesagens (190 rows em produção) |
| `weight_records` | Legacy, abandonada (5 rows) |
| `livestock_weights` | Cadeias pausadas (ovinos/caprinos/aves) |
| `animal_photos` | Anexos fotográficos |
| `animal_rfids` | Identidade RFID |
| `animal_scores` | Scores de qualidade |
| `animal_certifications` | Certificações por animal |
| `animal_goals` | Metas de peso |
| `animal_seals` | Selos digitais |
| `animal_cost_summary` | Cache de custos consolidados |
| `batch_lots`, `batch_lot_animals` | Legacy de batches |
| `livestock_species`, `livestock_certifications`, `livestock_applications`, `livestock_events`, `livestock_score_config` | Cadeias pausadas (ovinos/caprinos/aves) |

#### 3.1.2 REPRODUÇÃO (8 tabelas operacionais novas + 3 legacy reporting)

**Reporting (pré-existente, 3 tabelas)**:
- `reproductive_seasons` — estações de monta com agregados
- `reproductive_ia_services` — serviços de IA por estação
- `reproductive_stock_summary` — estoque de reprodutores

**Operacional (criadas em migrations 108-110, 2026-05-18)**:
- `coverings` — registro de cobertura (7 modalidades: monta_natural, monta_controlada, ia_convencional, iatf, re_iatf, te_fiv, te_iv)
- `pregnancy_diagnostics` — diagnóstico de gestação (palpação, ultrassom 30/60/90 dias)
- `births` — partos com peso bezerro, sexo, dificuldade
- `bull_breeding_soundness` — exame andrológico (CAP: scrotal, semen quality, libido, classificação apto/apto_restricoes/inapto)
- `semen_batches` — lotes de sêmen comprado (sire, batch_code, total_doses, used_doses, breed)
- `semen_batch_applications` — junção batch × covering (consumo dose-a-dose)

**Triggers de agregação automática** (migration 110): `coverings_recompute_aggregates`, `diagnostics_recompute_aggregates`, `births_recompute_aggregates` — todos chamam `recompute_reproductive_season_aggregates(season_id)` que recalcula `total_inseminations`, `females_inseminated`, `pregnancy_rate`, `avg_conception_rate`, `births_performed`, `born_alive`.

**Estado em produção**: tabelas operacionais existem e estão acessíveis, mas **count=0** (sem seed real ainda — pendente Eixo A UI).

#### 3.1.3 SANIDADE
- `applications` — aplicações sanitárias (80 rows produção)
- `stock_batches` — lotes de produtos
- `mapa_carencias` — catálogo MAPA público (curado por admin) [criada em 111]
- `vaccination_schedules` — calendário sanitário multi-tenant [criada em 111]
- `sanitary_calendar` — legacy calendário
- `stock_movements` — entradas/saídas de estoque
- Trigger `applications_carencia_autofill` (migration 111) — popula `applications.withdrawal_end_date` automaticamente via match com `mapa_carencias`

#### 3.1.4 EFICIÊNCIA + CARBONO (criadas em migration 109)
- `feed_efficiency_records` — registros CAR/RFI (intake_kg_dm, gain_kg, conversion_ratio, car_value, methodology, ration_composition jsonb)
- `carbon_footprint_estimates` — pegada carbono (ch4_emission_kg, co2_eq_per_kg_carcass, methodology_version, pasture_type, ration_data jsonb)

**Alinhamento agenda IZ-SP / Dra. Renata**: estas duas tabelas atendem diretamente as métricas que a mentoria solicitou na sessão de Agrishow 2026-05-17.

#### 3.1.5 FINANCEIRO
- `sales` — vendas individuais
- `cost_records` — custos por animal/lote
- `slaughter_records` — abates registrados
- `slaughterhouses` — frigoríficos cadastrados
- `fiscal_notes` — NF-e importadas (XML parser via `/api/fiscal/parse-xml`)
- `fiscal_note_items` — itens de cada nota
- `fiscal_alerts` — alertas de validação fiscal
- `subscription_events` — eventos Stripe
- `audit_snapshot` — snapshot auditável

#### 3.1.6 MARKETPLACE
- `marketplace_listings` — 9 listings ativos em produção (animal, safra, insumo, maquinário, equipamento, epi, outro)
- `marketplace_offers` — 2 ofertas demo do Frigorífico Mentoria
- `marketplace_transactions` — após oferta aceita
- `buyers` — cadastro mestre por produtor
- `lot_buyer_access` — controle de visibilidade granular

**ENUMs marketplace**:
- `marketplace_listing_type`: animal, safra, insumo, maquinario, equipamento, epi, outro
- `marketplace_listing_status`: ativo, pausado, vendido, expirado
- `marketplace_offer_status`: pendente, aceita, recusada, expirada (default: pendente)
- `marketplace_tx_status`: aguardando_pagamento, pago, entregue, cancelado, disputado

#### 3.1.7 AUTH / RBAC
- `clients` — 8 clients em produção
- `users_profile` — perfil estendido [a verificar uso]
- `mentor_assignments` — atribuição mentor↔client (1 row: Renata→FSJBE)
- `producer_types` — 5 tipos (cria, recria_engorda, confinamento, ponta_compradora, full_cycle)
- `client_producer_types` — N:N cliente×tipo

#### 3.1.8 CACHE
- `agraas_master_passport_cache` — cache de passaporte por animal (15 rows: 5 FSJBE + 10 Mentoria)
- `production_stock_snapshot`, `production_weight_distribution`, `production_sales_history`, `production_calf_entries`, `production_mortality` — caches estáticos do /producao (5 tabelas; views materializadas semi-estáticas)

#### 3.1.9 AGRICULTURA (pausado mas estrutura preservada)
- `crop_fields`, `crop_certifications`, `crop_inputs`, `crop_storage`, `crop_storage_movements`, `crop_shipments`, `crop_shipment_tracking`, `crop_quality_reports`, `crop_fiscal_notes`, `crop_fiscal_note_items`, `farms_agriculture`, `pre_shipment_quarantine` — todas mantidas com RLS, tabelas com dados de demo

#### 3.1.10 AVES (pausado)
- `poultry_batches`, `poultry_batch_events`

#### 3.1.11 INFRAESTRUTURA
- `platform_settings` — chave-valor (cotações CEPEA, configs globais)
- `shipment_tracking` — rastreio de embarques
- `ai_predictions` — cache de predições IA (`/api/predict-score`)
- `supply_financials`, `supply_inventory_items` — financeiro de insumos
- `events` — timeline unificada (206 rows produção)
- `products` — catálogo de produtos sanitários
- `suppliers` — fornecedores

### 3.2 — Migrations versionadas (121 arquivos: 001-122 com gap em 041)

Lista completa em [supabase/migrations/](supabase/migrations/). Marcos:

| Período | Range | Escopo |
|---|---|---|
| Fundação | 001-040 | Multi-tenant, RLS, auth, tabelas base, seed inicial |
| Cadeias adjacentes | 042-067 | Ovinos/caprinos/aves/agricultura (todas pausadas hoje) |
| FSJBE operacional | 068-103 | Seeds reais FSJBE, score engines, cleanup |
| Marketplace | 104-107 | Schema + seed bovinos + cleanup PIF |
| **Reprodução operacional (18/05)** | 108-110 | 8 tabelas novas + triggers de agregação |
| **Sanidade rastreabilidade (18/05)** | 111 | mapa_carencias + vaccination_schedules + trigger carência |
| **Producer types** | 112 | ENUM + N:N + 5 tipos seed |
| **Mentoria IZ-SP** | 113-115 | clients + seed Fazenda + seed Frigorífico |
| **RBAC mentor_externo** | 116-118 | mentor_assignments + functions + auth link + assignment FSJBE |
| **Onda 1 DB-only (18/05)** | 119-120 | mentor policies extras + stock_batches RLS fix |
| **Cache fix (18/05)** | 121 | refresh_animal_passport reescrita pra `events` (resolve bug de 2 anos) |
| **Events mentor (18/05)** | 122 | events_select_mentor policy |

**Cobertura de rollback** em [supabase/rollbacks/](supabase/rollbacks/): ~25% (migrations 059-122 majoritariamente cobertas; 001-058 sem rollback explícito).

### 3.3 — Functions PL/pgSQL ativas (68 functions, 29 SECURITY DEFINER)

**Funções de identidade/auth**:
- `is_admin()` — checa role admin no clients table
- `get_my_client_id()` — resolve via auth.uid() → clients.auth_user_id
- `is_mentor_externo()` — checa se user logado tem mentor_assignment (migration 116)
- `mentor_has_access_to_client(target_client_id uuid)` — checa assignment específico

**Funções de score (5)**:
- `calculate_agraas_score(animal_id)` — score consolidado
- `calculate_farm_score`, `calculate_field_score`, `calculate_livestock_score`, `calculate_poultry_score`

**Funções de cache/refresh**:
- `refresh_animal_passport(animal_id)` — **reescrita em migration 121** (resolve bug 2 anos); popula `agraas_master_passport_cache` com identity_json + timeline_json (events) + health_json (weights+applications) + score_json + certifications_json + ownership_json + client_id

**Funções de agregação**:
- `recompute_reproductive_season_aggregates(season_id)` — chamada por 3 triggers (coverings/diagnostics/births)
- `trg_applications_carencia()` — trigger function pra autofill carência

**Funções triggers de score (em uso ativo, SECURITY DEFINER)**:
- `_trg_score_from_application(_delete)`, `_trg_score_from_event(_delete)`, `_trg_score_from_weight(_delete)`
- `_trg_weight_goal_alert`
- `_trg_application_calendar_update`
- `_trg_application_stock_debit`
- `_trg_cost_summary_update`
- `create_stock_from_fiscal_note` — popula stock_batches a partir de NF-e

**Functions órfãs identificadas (18 — referenciam `animal_events` removida em 049)**:
1. `after_application_insert`
2. `after_rfid_insert`
3. `after_weight_insert`
4. `create_application_event`
5. `create_lot_entry_event`
6. `create_rfid_event`
7. `create_sale_event`
8. `create_slaughter_event`
9. `create_weight_event`
10. `mark_animal_slaughtered`
11. `recalculate_animal_score`
12. `refresh_animal_certifications`
13. `refresh_animal_score`
14. `refresh_animal_seals`
15. `register_animal_movement_event`
16. `register_weight_event`
17. `transfer_animal_after_sale`
18. `trigger_refresh_animal_certifications` (também `trigger_refresh_animal_passport_from_animal_id`, `trigger_refresh_animal_seals`)

**Status**: nenhuma em trigger ATIVA (as 2 que estavam — `trg_create_animal_birth_event` e `trg_animal_lot_entry_event` — foram dropadas em migration 114). Funções órfãs ficam silenciosas até alguém invocar via RPC manual.

### 3.4 — Triggers ativos (88 user-defined no schema public)

Distribuição por finalidade:
- **Aggregação reprodutiva (3)**: `coverings_recompute_aggregates`, `diagnostics_recompute_aggregates`, `births_recompute_aggregates`
- **Carência sanitária (1)**: `applications_carencia_autofill` (BEFORE INSERT/UPDATE em applications)
- **Score recompute em cascata**: triggers em `applications`, `weights`, `events` que invocam `_trg_score_from_*`
- **Stock/calendar/cost summary**: triggers em `applications` (`trg_application_stock_debit`, `trg_cost_summary_on_application`, `trg_application_calendar_update`)
- **updated_at e agraas_id**: `trg_animals_updated_at`, `trg_set_agraas_id`, `trg_set_agraas_id_from_uuid`
- **fiscal**: `create_stock_from_fiscal_note` em fiscal_notes
- **Outros legados**: alguns triggers em tabelas de cadeias pausadas (poultry, crop, livestock)

### 3.5 — Views e cache materializado

- `agraas_master_passport_cache` — tabela (não view) populada via `refresh_animal_passport()` — **15 rows em produção** (5 FSJBE + 10 Mentoria pós migration 121)
- `agraas_market_animals` — view [a verificar definição — provavelmente JOIN animals + scores + certifications]
- `agraas_master_passport` — view com colunas de cadeia (animal_id, internal_code, current_property_name, current_lot_code, slaughterhouse_name, total_score)
- `production_stock_snapshot`, `production_weight_distribution`, `production_sales_history`, `production_calf_entries`, `production_mortality` — tabelas de cache pré-calculado (estáticas)

### 3.6 — Policies RLS total

- **Total**: 327 policies no schema public
- **Mentor SELECT policies**: 22 (18 da migration 116 + 3 da migration 119 + 1 da migration 122)
- **Tabelas sem policies (gaps)**: 0 — todas as 86 tabelas têm pelo menos 1 policy
- **Policies "allow_all" residuais**: ainda presente em algumas tabelas legadas (auditoria pós-migration 120 mostrou stock_batches limpo)

**Tabelas com mais policies (top 10)** [a verificar via query agregada]

---

## PARTE 4 — FUNCIONALIDADES POR MÓDULO

### 4.1 — REBANHO

| Rota | Render | CRUD | Estado | Dados produção |
|---|---|---|---|---|
| `/animais` | Lista de animais com filtros (cliente, status), hero KPIs, cards de animais | C (botão "Novo animal") | ATIVO | 5 FSJBE (BER-001..005) + 10 Mentoria (MENT-001..010) |
| `/animais/[id]` | Passaporte completo: identidade, timeline, scores, certs, PredictiveAlerts, fotos, QR | Edit limitado | ATIVO (1124 LOC) | — |
| `/animais/novo` | Form de criação | Create | ATIVO | — |
| `/lotes` | Lista de lotes + form de criação | C/R/U | ATIVO | 1 FSJBE + 3 Mentoria |
| `/lotes/[id]` | Detalhe de lote: animais vinculados, mapa, calculadora | R/U | ATIVO (750 LOC) | — |
| `/propriedades` | Lista de fazendas com mapa Brasil + cards | CRUD | ATIVO (855 LOC) | 14 properties total |
| `/movimentacoes` | Registro de transferências | CRUD | ATIVO | [count via events] |

### 4.2 — REPRODUÇÃO (`/reprodutivo`)

**Schema operacional pronto (migrations 108-110)** com 7 modalidades de cobertura, 4 métodos de diagnóstico, 3 níveis de dificuldade de parto, 3 classificações andrológicas.

**Tipos de cobertura suportados**: monta_natural, monta_controlada, ia_convencional, iatf, re_iatf, te_fiv, te_iv
**Métodos de diagnóstico**: palpacao, ultrassom_30d, ultrassom_60d, ultrassom_90d
**Resultados**: positivo, negativo, duvida
**Dificuldade parto**: normal, distocia_leve, distocia_severa
**Classificação CAP touros**: apto, apto_restricoes, inapto

**Banco de sêmen**: rastreio dose-a-dose via `semen_batches.total_doses`/`used_doses` + CHECK constraint `used_doses <= total_doses` + tabela junção `semen_batch_applications`.

**Agregação automática**: triggers em coverings/diagnostics/births recalculam `reproductive_seasons.{total_inseminations, females_inseminated, pregnancy_rate, avg_conception_rate, births_performed, born_alive}`.

**Frontend atual** ([app/reprodutivo/page.tsx](app/reprodutivo/page.tsx), 330 LOC): mostra apenas dados das 3 tabelas legacy de reporting. **Extensão A+B (atividade operacional recente + touros e performance) é PENDENTE** — schema pronto, UI ainda não construída.

### 4.3 — SANIDADE

| Funcionalidade | Como funciona |
|---|---|
| Rastreio lote-a-lote | `applications.batch_id` FK→`stock_batches.id` (já existia antes da migration 111) |
| Carência MAPA automática | Trigger `applications_carencia_autofill` (BEFORE INSERT/UPDATE em applications) busca em `mapa_carencias` por `LOWER(product_name)` e popula `applications.withdrawal_end_date = application_date + withholding_days_meat` |
| Calendário sanitário | `vaccination_schedules` multi-tenant com `months_of_age_array int[]`, `frequency` (anual/semestral/dose_unica/sob_demanda), `regulatory_mandatory bool` |
| View animais em carência | Query direta em `applications WHERE withdrawal_end_date > today` |
| Bloqueio preventivo de abate | Lógica em `/animais/[id]` checa carência ativa [a verificar implementação] |

Rotas: `/aplicacoes`, `/aplicacoes/historico`, `/estoque`, `/estoque/dashboard`, `/estoque/historico`, `/estoque/novo`, `/calendario-sanitario`.

Dados produção: 80 applications, [a verificar mapa_carencias count — não populado ainda].

### 4.4 — PERFORMANCE

| Rota | Funcionalidade |
|---|---|
| `/pesagens` | Pesagens individuais OU em lote (tabs); cálculo GMD automático em `PesagemHeroMetrics` |
| `/pesagens/historico` | Listagem histórica |
| `/scores` | Ranking por score + filtros |
| `/metas` | Metas de peso por animal (tabela `animal_goals`) |
| `/eventos` | Timeline consolidada lendo `events` (206 rows) — todos os tipos: birth, lot_entry, health_check, weighing, vacinacao, inspection, pesagem, vaccination, WEIGHT_RECORDED, desmame, transferencia, ownership_transfer, nascimento, observation, BIRTH |

### 4.5 — EFICIÊNCIA + CARBONO

**`feed_efficiency_records`** — schema cobre:
- `intake_kg_dm` (consumo em matéria seca)
- `gain_kg`
- `conversion_ratio`
- `car_value` (CAR / RFI)
- `methodology` (texto livre — futuras opções: RFI Koch, GrowSafe, comportamental, etc.)
- `ration_composition jsonb` (proporções da dieta)

**`carbon_footprint_estimates`** — schema cobre:
- `ch4_emission_kg` (metano em kg)
- `co2_eq_per_kg_carcass` (CO2eq por kg de carcaça)
- `methodology_version` (referencia versão metodologia — IPCC Tier 1/2/3, EMBRAPA, etc.)
- `pasture_type` (braquiária, panicum, capim-mombaça, etc.)
- `ration_data jsonb`

**Alinhamento agenda IZ-SP**: ambas tabelas atendem diretamente o checklist solicitado pela Dra. Renata na mentoria de 2026-05-17. **Frontend ainda não construído** (extensão Eixo A pendente).

### 4.6 — FINANCEIRO

| Rota | Funcionalidade | Estado |
|---|---|---|
| `/custos` | Registro de custos por animal/lote/categoria | ATIVO |
| `/custos/historico` | Histórico | ATIVO |
| `/custo-producao` | Custo de produção consolidado | ATIVO |
| `/vendas` | Registro de vendas/transferências com DocumentGate | ATIVO (KpiCard migrado 18/05) |
| `/abates` | Abates registrados | ATIVO |
| `/fiscal` | Lista NF-e + upload XML | ATIVO (KpiCard migrado 18/05) |
| `/fiscal/[id]` | Detalhe NF-e + itens + alertas + ações | ATIVO |
| `/fiscal/relatorio` | Relatório para contador | ATIVO |
| `/financeiro` | Painel financeiro consolidado | ATIVO (badge PIF removido 18/05) |

**Stripe webhook** [pós-refactor commit `77f6c01` 17/05]: `/api/stripe/webhook` reage a `invoice.paid` → envia email via `lib/email.ts` compartilhado. Subscriptions via `/api/stripe/checkout`.

### 4.7 — COMERCIAL

| Rota | Função | Estado |
|---|---|---|
| `/compradores` | Cadastro de compradores (CNPJ, contato) | ATIVO |
| `/fornecedores` | Cadastro de fornecedores | ATIVO |
| `/produtos` | Catálogo de produtos sanitários (vacinas, vermífugos, etc.) com carência MAPA | ATIVO (botão Editar fantasma removido 18/05) |
| `/insumos` | Dashboard de estoque por categoria | ATIVO mas `CATEGORY_VALUES` hardcoded |
| `/producao` | Indicadores zootécnicos (estoque, peso, vendas, bezerros, mortalidade) | ATIVO mas dados de cache estático (production_*) |
| `/operacoes` | Hub de navegação operacional + KPIs reais | ATIVO (link laboratório removido 18/05) |

### 4.8 — MARKETPLACE (`/market` e `/marketplace`)

**Catálogo público** ([app/marketplace/page.tsx](app/marketplace/page.tsx)): 9 listings ativos em produção, listing_type cobre animal/safra/insumo/maquinario/equipamento/epi/outro.

**`/market`** ([app/market/page.tsx](app/market/page.tsx)): cotações CEPEA (via `platform_settings`), calculadora de valor do rebanho, tabela de animais elegíveis com filtro **Halal** (mantido por decisão Lucas em 18/05).

**Cotações CEPEA armazenadas** em `platform_settings`:
- `cotacao_arroba`, `cotacao_boi_gordo`, `cotacao_bezerro`, `cotacao_vaca_gorda`, `cotacao_novilho_precoce`

**Ofertas demo** (Frigorífico Mentoria): 2 marketplace_offers respondendo a listings FSJBE (vacas descarte e bois magros, R$ 295/@), status pendente.

### 4.9 — RASTREABILIDADE

**`/cadeia`** — visualização narrativa Animal → Propriedade → Lote → Destino via view `agraas_master_passport`. Lê 12 animais top-score.

**`/passaporte/[agraas_id]`** — passaporte PÚBLICO (sem auth, usa `createSupabaseServiceClient` bypass RLS). Layout em [PublicPassportView.tsx](app/passaporte/[agraas_id]/PublicPassportView.tsx). HalalBadgeSVG mantido (dado factual).

Cache: `agraas_master_passport_cache` agora populada (5 FSJBE + 10 Mentoria) via `refresh_animal_passport()` corrigida em migration 121.

### 4.10 — RELATÓRIOS

| Rota | Cobertura |
|---|---|
| `/relatorios` | Hub com 6 KPIs (animais, aplicações, pesagens, custos, lotes, movimentos) + cards de drill-down |
| `/auditoria` | Trilha de auditoria (audit_snapshot) com StatCard in/out pair preservado |
| `/alertas` | Alertas predictivos (`ai_predictions` table) |
| `/certificacoes` | Certificações por animal |
| `/historico` | Timeline geral |
| `/inteligencia` | IA / predições por animal com `<InsightCard>` |
| `/market` | (descrito em 4.8) |

---

## PARTE 5 — SISTEMA DE ROLES E PERMISSÕES

### 5.1 — Roles em uso (em `clients.role`)

| Role | Count | Onde |
|---|---|---|
| `admin` | 4 | Lucas, FSJBE, Fazenda Mentoria, Frigorífico Mentoria |
| `client` | 3 | Pedro, Ico, Paulo |
| `buyer` | 1 | PIF (pausado) |
| `mentor_externo` | virtual | Resolvido via `mentor_assignments` (não é uma role do Postgres) |

A camada `getCurrentRole.ts` retorna union `'admin' \| 'client' \| 'buyer' \| 'mentor_externo' \| 'viewer'`. Roles `manager` e `operator` mencionadas em spec original **não estão implementadas** no DB hoje.

### 5.2 — Function de identificação de role

[lib/auth/getCurrentRole.ts](lib/auth/getCurrentRole.ts) (criada 18/05):

Hierarquia:
1. Anônimo (sem `auth.uid()`) → `'viewer'`, `canEdit=false`
2. RPC `is_mentor_externo()` = true → `'mentor_externo'`, `canEdit=false`
3. `clients.role` via `auth_user_id` lookup → role do tenant, `canEdit=true`
4. Fallback (user existe mas sem `clients` row) → `'viewer'`, `canEdit=false`

Retorna: `{ role, isMentorExterno, canEdit, userId, defaultClientId }`.

### 5.3 — RoleContext + useRole hook

[app/components/RoleContext.tsx](app/components/RoleContext.tsx) — Client Component. Provider populado uma vez em `app/layout.tsx` via `getCurrentRole()`. Hook `useRole()` lê o context em qualquer componente filho.

Integrado em [app/layout.tsx](app/layout.tsx) envolvendo o tree autenticado.

### 5.4 — ActionGuard component

[app/components/ui/ActionGuard.tsx](app/components/ui/ActionGuard.tsx) — wrapper com 3 modos:
- `hide` (default): se canEdit=false, renderiza `fallback` ou null
- `disable`: renderiza com opacity-50 + pointer-events-none + title tooltip + aria-disabled
- `tooltip`: tooltip "Modo Visualização" no hover

**Páginas com ActionGuard aplicado**:
- `/animais` (2 Links "Novo animal" / "Cadastrar animal")
- `/lotes` (2 botões "Criar primeiro lote" / "+ Novo lote")
- `/aplicacoes` (botão "Registrar aplicação")
- `/pesagens` (botões "Registrar pesagens em lote" + "Registrar pesagem")
- `/reprodutivo` — sem CRUD ainda, gating natural quando UI subir

### 5.5 — Badge "Modo Visualização"

[app/components/MentorViewBadge.tsx](app/components/MentorViewBadge.tsx) — Client Component. Lê `useRole()`. Se `isMentorExterno=true`, renderiza pill amber "👁️ Modo Visualização — Mentoria" no header. Outros perfis: retorna null.

Posicionado em [app/layout.tsx](app/layout.tsx) antes do environmentLabel pill no header.

### 5.6 — Arquitetura mentor_externo (defesa em 3 camadas)

**Camada 1 (DB)**:
- `mentor_assignments` (uuid PK, user_id FK auth.users, client_id FK clients, granted_by, granted_at, notes, UNIQUE(user_id, client_id))
- Function `is_mentor_externo()` STABLE SECURITY DEFINER — checa existência de assignment para `auth.uid()`
- Function `mentor_has_access_to_client(target_client_id uuid)` STABLE SECURITY DEFINER — checa assignment específico
- **22 policies SELECT mentor** em tabelas: animals, coverings, pregnancy_diagnostics, births, bull_breeding_soundness, semen_batches, semen_batch_applications, feed_efficiency_records, carbon_footprint_estimates, applications, reproductive_seasons, reproductive_ia_services, reproductive_stock_summary, marketplace_listings, properties, lots, animal_movements, weights, agraas_master_passport_cache, animal_certifications, animal_scores, events
- **ZERO policies INSERT/UPDATE/DELETE** para mentor — read-only enforced no DB

**Camada 2 (UI badge global)**: MentorViewBadge

**Camada 3 (UI gating cirúrgico)**: ActionGuard em 5 páginas críticas

### 5.7 — 3 contas Mentoria IZ-SP em produção

| email | `auth.users.id` | client linkado | acesso |
|---|---|---|---|
| `mentoria.produtor@agraas.com.br` | `de458573-c3ec-4272-b04a-63cc2cfc5d52` | Fazenda Mentoria IZ-SP (`...0099-001`) | admin CRUD |
| `mentoria.comprador@agraas.com.br` | `79e1362b-70ee-4f8e-ac7a-ad2ff090edf6` | Frigorífico Mentoria IZ-SP (`...0099-002`) | admin CRUD |
| `mentoria.fsjbe@agraas.com.br` | `36628211-da18-408b-9f98-a318a47715bd` | FSJBE via mentor_assignment | mentor_externo read-only |

Senha temporária todas: `Agraas@2026`. `email_confirm=true` (sem precisar ativar via email).

---

## PARTE 6 — COMPONENTES UI COMPARTILHADOS

### 6.1 — `app/components/ui/` (16 componentes)

**Foundation PR 1 (criados 2026-05-18)**:
- `KpiCard.tsx` — card de métrica unificado (label/value/sub/icon/iconBg/tone com 4 tones) — **usado em 19+ páginas**
- `PageHeader.tsx` — hero com badge/title/description/actions/panel — usado em 5 páginas
- `EmptyState.tsx` — wrapper de `.ag-empty-state` — usado em 3 páginas (oportunidade de propagar pra mais 8)
- `Skeleton.tsx` + variants `SkeletonKpiCard`, `SkeletonTableRow` — **usado em 0 páginas** (criado mas não consumido)
- `ActionGuard.tsx` — gating por role (3 modos: hide/disable/tooltip)

**Existentes pré-PR 1**:
- `AuthShell.tsx`, `PublicShell.tsx`, `PublicFooter.tsx` — layouts públicos
- `Motion.tsx`, `MotionProvider.tsx`, `HeroParallaxImage.tsx`, `ScrollToTop.tsx` — animação/efeitos
- `ScoreRing.tsx` — visual de score circular
- `AuroraGlow.tsx`, `SectionDivider.tsx`, `ShimmerButton.tsx` — **órfãos** (audit identificou que não são importados; removidos pós-feedback "evitar cara AI startup" 23/04)

### 6.2 — Outros componentes globais (99 total fora de `ui/`)

**Navegação / layout**:
- [SidebarNav.tsx](app/components/SidebarNav.tsx) — 9 grupos pós refactor 18/05: INÍCIO, REBANHO, REPRODUÇÃO, SANIDADE (Operações originalmente), PERFORMANCE, FINANCEIRO, COMERCIAL, FERRAMENTAS, RELATÓRIOS
- `BuyerSidebarNav.tsx` — sidebar buyer-only (pausada)
- `MobileDrawer.tsx` — drawer mobile (`w-[85vw] max-w-[320px]` pós fix 18/05)
- `MentorViewBadge.tsx` — badge no header
- `LogoutButton.tsx`
- `QuickActions.tsx` — floating actions
- `AgroAssistant.tsx` — chat IA flutuante (`/api/chat`)
- `Toast.tsx` + `ToastContainer` — notificações globais

**Componentes de animal/lote**:
- `AnimalTimeline.tsx` (584 LOC) — timeline do passaporte
- `AnimalPhotoUpload.tsx`
- `AnimalQRCode.tsx`
- `AnimalAnalysis.tsx` — análise IA via `/api/analyze-animal`
- `PredictiveAlerts.tsx` — predições via `/api/predict-score` (reescrita 18/05 — dark→light + PT-BR)
- `EventModal.tsx`, `EventsTable.tsx`

**Charts (8)**:
- `ReproGauge`, `IABreakdown`, `WeightDist`, `InsumosBar` (cada um com wrapper SSR-safe `*Wrapper.tsx`)

**Mapas**:
- `BrazilMap.tsx`, `BrazilMapWrapper.tsx`, `BrazilMapSVG.tsx` (órfão)
- `ExportRouteMap.tsx`, `ExportMapGL.tsx`
- `ShipTrackingMap.tsx`, `ShipTrackingMapWrapper.tsx`

**Marketplace (5)**:
- `MarketplacePublicView.tsx` (1054 LOC), `MarketplaceTabs.tsx`, `NewListingForm.tsx`, `OfferPanel.tsx`, `ActivityTicker.tsx`

**Marketing / Landing (8)**:
- `BrazilAgroSection`, `CredibilityStrip` (órfão), `FAQSection`, `FSJBECaseSection`, `HowItWorksSection`, `OperationalSection`, `PortosSection`, `ScoresSection`

**Comprador (pausado mas presente)**:
- `CompradorView`, `CompradorCertificationMatrix`, `CompradorGrainsTab`, `CompradorLivestockTab`, `CompradorTrackingSection`, `compradorTypes.ts`

**Fiscal**:
- `FiscalUpload`, `FiscalUploadAgri`, `FiscalDeleteButton`, `FiscalNoteActions`

**Outros notáveis**:
- `HalalBadgeSVG.tsx` — SVG do selo Halal (mantido em /market + /passaporte por decisão Lucas; removido de /painel, /animais, sidebar)
- `MarketTable.tsx`, `MarketCalculator.tsx`
- `ExportPassportModal.tsx` (539 LOC)
- `HerdPdfButton.tsx`
- `LotValueCalculator.tsx`
- `ProductForm.tsx`, `SupplierForm.tsx`, `BuyerForm.tsx`, `GoalForm.tsx`, `CalendarForm.tsx`, `CropCheckpointForm.tsx`, `PoultryEventForm.tsx`
- `TrackingTimeline.tsx`, `CounterAnimation.tsx`, `NotificationBanner.tsx`, `LanguageToggle.tsx`
- `RoleContext.tsx`, `ScoresFilter.tsx`, `DocumentGate.tsx`, `TargetArrobasEditor.tsx`, `AuditoriaActions.tsx`, `CustoProducaoTable.tsx`, `MarketplaceCTAModal.tsx` (órfão), `JourneySection.tsx` (órfão), `AgraasLogo.tsx` (órfão), `ScrollReveal.tsx` (órfão)

### 6.3 — Componentes órfãos identificados no audit

9 componentes existem mas não são importados em lugar nenhum (~500 LOC mortas):
- `AgraasLogo.tsx`
- `BrazilMapSVG.tsx`
- `JourneySection.tsx`
- `MarketplaceCTAModal.tsx`
- `ScrollReveal.tsx`
- `landing/CredibilityStrip.tsx`
- `ui/AuroraGlow.tsx`
- `ui/SectionDivider.tsx`
- `ui/ShimmerButton.tsx`

Pendência: PR de cleanup.

---

## PARTE 7 — DESIGN SYSTEM E PADRÕES VISUAIS

### 7.1 — Tokens em [app/globals.css](app/globals.css)

**Cores brand**:
- `--primary` `#2E8B3E`
- `--primary-hover` `#236B2D`
- `--primary-soft` `#DCEFCE`
- `--primary-soft-strong` `#C9E5B7`
- Sidebar: `--sidebar` `#2E8B3E`, `--sidebar-2` `#1E5E26`, `--sidebar-soft` `#3DA54C`, `--sidebar-accent` `#3DA54C`, `--sidebar-accent-bg` rgba(46,139,62,0.18), `--sidebar-accent-border` rgba(46,139,62,0.40)

**Cores de superfície**:
- `--bg` `#f4f7f2` (background app)
- `--bg-deep` `#edf3e8`
- `--surface` `#ffffff`
- `--surface-soft` `#fafcf9`
- `--surface-muted` `#f2f6ef`

**Cores de texto**:
- `--text-primary` `#1e2a1b`
- `--text-secondary` `#4b5a47`
- `--text-muted` `#788473`

**Borders**:
- `--border` `rgba(30, 42, 27, 0.08)`
- `--border-strong` `rgba(30, 42, 27, 0.14)`

**Semantic**:
- `--success` `#2f8f4a`
- `--warning` `#d7a21c`
- `--danger` `#d64545`
- `--info` `#4d7ccf`

**Shadows**:
- `--shadow-soft`, `--shadow-card`, `--shadow-green`, `--shadow-strong`

**Classes utility**: `.ag-card`, `.ag-card-strong`, `.ag-table`, `.ag-badge` (+ `-green/-soft/-dark/-white`), `.ag-button-primary`, `.ag-button-secondary`, `.ag-input`, `.ag-select`, `.ag-section-title`, `.ag-section-subtitle`, `.ag-section-header`, `.ag-page-title` (LEGACY), `.ag-kpi-card` (LEGACY), `.ag-kpi-value` (LEGACY), `.ag-kpi-label` (LEGACY), `.ag-empty-state` (+ `-icon/-title/-text`), `.ag-skeleton`, `.ag-hero-panel`, `.ag-divider`, `.ag-form-error`.

### 7.2 — Padrões adotados PR 1 (visual unification)

| Atributo | Valor |
|---|---|
| KpiCard | `rounded-2xl border bg-white p-6 shadow-sm` + label text-sm muted + value text-3xl font-bold tracking-[-0.04em] truncate + 4 tones |
| PageHeader | `ag-card-strong p-7 lg:p-9` + h1 text-3xl semibold tracking-[-0.04em] + grid `xl:grid-cols-[1.08fr_0.92fr]` quando panel |
| EmptyState | `.ag-empty-state` (center + dashed border + ícone opcional) |
| Skeleton | `.ag-skeleton` animação shimmer linear-gradient |

### 7.3 — Padrões documentados

- [docs/agraas-visual-patterns.md](docs/agraas-visual-patterns.md) — spec completa dos padrões PR 1 (352 LOC)
- [docs/agraas-visual-audit.md](docs/agraas-visual-audit.md) — audit das inconsistências pré-PR 1 (269 LOC)

### 7.4 — Componentes que ainda precisam padronização

- **Forms** — Zod usado em apenas 7 arquivos; precisa `<FormField>`, `<Input>`, `<Select>`, `<Textarea>` compartilhados
- **Mapas** — 4+ implementações Leaflet com height/width inconsistentes (BrazilMap, ExportRouteMap, ShipTrackingMap, individuais em propriedades)
- **Cards de animal/lote** em listings — cada página tem layout próprio
- **DataTable** wrapper de `ag-table` com props de colunas/alinhamento

---

## PARTE 8 — GOVERNANÇA E AUTOMAÇÃO

### 8.1 — Camada Claude Code (`.claude/`)

- `settings.json` — 25+ permissions (Read/Write/Edit/Bash em paths específicos)
- `settings.local.json` — config local (gitignored)
- `hooks/` — 4 hooks declarados [a verificar conteúdo exato]:
  - typecheck pre-commit
  - FSJBE compliance check
  - SessionStart git context
  - Stop uncommitted alert
- `skills/agraas-fsjbe-guard/` — skill com regras de tom público FSJBE
- `commands/` — 4 slash commands: `/checkpoint`, `/push`, `/typecheck`, `/test`

### 8.2 — `.mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=ixuxawcgwhrrrnwendxr"],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}" }
    }
  }
}
```

Supabase MCP server official — exporta tools de DB introspection + execute_sql + apply_migration quando o token está no env.

### 8.3 — [CLAUDE.md](CLAUDE.md) — guia técnico

Última revisão registrada: 2026-05-17. Cobre:
- Foco bovino 100%
- Frentes quentes (JBS, IZ-SP, GPB/Furlan) e pausadas
- Stack
- Estrutura de pastas
- Padrões de código (Supabase clients, Server vs Client, migrations, tipos, rate limiting)
- RLS (`get_my_client_id()`)
- Design system (CSS vars + classes utility)
- Clientes ativos
- Regras permanentes (commit ritmo, dados fictícios, tom público)

### 8.4 — Convenções

- Branch única `main`
- Conventional Commits (feat/fix/refactor/chore/docs/polish) + Co-Authored-By Claude
- Migrations em `supabase/migrations/` numeradas
- Rollbacks em `supabase/rollbacks/` (cobertura parcial)
- Aplicação atual via Management API + jq (Docker indisponível) — `migration repair` pendente

---

## PARTE 9 — INTEGRAÇÕES EXTERNAS

### 9.1 — Supabase

| Item | Valor |
|---|---|
| Project ref | `ixuxawcgwhrrrnwendxr` |
| Auth strategy | Email + password; `auth.users.email_confirm=true` em todas contas atuais |
| Storage | [a verificar — buckets ativos não auditados] |
| Edge Functions | 1: `score-engine` (TS, em [supabase/functions/score-engine/](supabase/functions/score-engine/index.ts)) — [não auditada nesta passada] |

### 9.2 — Stripe

- **Subscriptions**: 4 planos (starter, pro, enterprise, pilot) registrados em `clients.plan`
- **Webhook** `/api/stripe/webhook` (131 LOC): reage a `invoice.paid` → envia email confirmação via `lib/email.ts`
- **Checkout** `/api/stripe/checkout`
- `stripe_customer_id` em `clients`
- `billing_email`, `billing_exempt`, `plan_started_at` em `clients`
- `subscription_events` table loga eventos

### 9.3 — Resend

[`lib/email.ts`](lib/email.ts) — wrapper. Templates [a verificar — implementação atual pode ser inline]. Trigger principal: invoice.paid via Stripe webhook.

### 9.4 — Sentry

- `@sentry/nextjs` `^10.47.0`
- `lib/with-sentry.ts` — wrapper instrumentação
- DSN configurado via env (`SENTRY_DSN` ou similar — [a verificar em Vercel env])
- `disableLogger` deprecated warning observada nos builds

### 9.5 — Anthropic SDK (Claude)

- `@anthropic-ai/sdk` `^0.80.0`
- Modelo: Claude Sonnet 4.6 (`claude-sonnet-4-6` ou similar — [a verificar nos endpoints])
- Endpoints que invocam:
  - `/api/predict-score` (predições preditivas por animal — cache em `ai_predictions` table)
  - `/api/analyze-animal` (análise contextual)
  - `/api/chat` (AgroAssistant flutuante)
  - `/api/parse-doc` (extração de documentos)
  - `/api/fiscal/analyze` (análise fiscal)
  - `/api/agriculture/fiscal/parse-xml` (parser XML agrícola — pausado mas presente)

---

## PARTE 10 — EVOLUÇÃO HISTÓRICA (últimas 48h: 60 commits)

### 10.1 — Linha do tempo (últimos 30 commits, 2026-05-18 a 2026-05-19)

| Hash | Data | Escopo |
|---|---|---|
| `4e61c31` | 2026-05-18 | fix(branding): tipografia "Plataforma do agro" alinhada ao design system |
| `c5af194` | 2026-05-18 | fix(kpi+rls): Valor total /fiscal + Receita total /vendas com truncate + mentor vê eventos |
| `2be5d5b` | 2026-05-18 | fix(passaporte): reescreve AI Predictive Analysis pro design system claro |
| `075d361` | 2026-05-18 | docs(status): final status 2026-05-18 |
| `336ee2e` | 2026-05-18 | chore(cleanup): remove Halal residual em /animais + reorienta /lotes pra mercado interno |
| `7314822` | 2026-05-18 | fix(mobile): overflow-x-auto nas 5 tabelas restantes |
| `464be8c` | 2026-05-18 | fix(mobile): MobileDrawer responsive + overflow-x-auto em 6 tabelas |
| `ae9f1c5` | 2026-05-18 | refactor(rbac): migra 6 páginas KpiCard local → unified |
| `97d5b0f` | 2026-05-18 | feat(painel): KpiCard unified + remove Halal cards + mobile grid responsivo |
| `65b31a4` | 2026-05-18 | fix(cache): refresh_animal_passport usa tabela events atual + popula FSJBE+Mentoria |
| `f15960a` | 2026-05-18 | fix(security): stock_batches RLS tenant isolation |
| `726bf99` | 2026-05-18 | feat(rbac): mentor policies em animal_certifications + scores + cache |
| `0ef6a42` | 2026-05-18 | docs: audit integral da plataforma |
| `a4525bc` | 2026-05-18 | feat(rbac): aplica ActionGuard em 5 páginas críticas pra mentor read-only |
| `c23e285` | 2026-05-18 | feat(rbac): ActionGuard component (hide/disable/tooltip modes) |
| `42f5098` | 2026-05-18 | feat(rbac): badge Modo Visualização pra mentor_externo no header |
| `b0f87f0` | 2026-05-18 | feat(rbac): getCurrentRole helper + RoleContext |
| `7f4e531` | 2026-05-18 | feat(mentoria): mentor_assignment FSJBE espelho read-only |
| `7dfa18a` | 2026-05-18 | feat(auth): 3 contas mentoria Renata+César com Agraas@2026 |
| `0383460` | 2026-05-18 | feat(mentoria): seed Frigorífico Mentoria IZ-SP |
| `733d799` | 2026-05-18 | feat(mentoria): seed híbrido Fazenda Mentoria IZ-SP |
| `f47d03b` | 2026-05-18 | feat(mentoria): clients Fazenda Mentoria IZ-SP + Frigorífico Mentoria IZ-SP |
| `f9fba59` | 2026-05-18 | feat(types): producer_types ENUM + N:N + seed PT-BR |
| `5359a85` | 2026-05-18 | refactor(css): resolve bug ag-kpi-value duplicado |
| `25c136b` | 2026-05-18 | refactor(7 pages): MetricCard local → KpiCard |
| `d3c76f6` | 2026-05-18 | refactor(insumos+market+operacoes): componentes UI |
| `d9304a2` | 2026-05-18 | refactor(cadeia): usa KpiCard e PageHeader compartilhados |
| `b14cde3` | 2026-05-18 | refactor(reprodutivo): usa KpiCard, PageHeader e EmptyState |
| `f2bc80d` | 2026-05-18 | refactor(produtivo): usa KpiCard compartilhado |
| `16cfd09` | 2026-05-18 | feat(ui): componentes compartilhados PR 1 |

### 10.2 — Antes/Depois objetivo (snapshot 2026-05-17 → 2026-05-19)

| Métrica | Antes (17/05) | Agora (19/05) | Δ |
|---|---|---|---|
| Tabelas no schema public | ~72 | **86** | +14 (8 reprodução + 2 sanidade + 3 mentor/producer + 1 events corrigida) |
| Policies RLS totais | ~280 | **327** | +47 (mentor + CRUD novas + cleanup) |
| Policies SELECT mentor | 0 | **22** | +22 |
| Triggers user-defined | ~84 | **88** | +4 (3 agregação reprodução + 1 carência) |
| Functions órfãs `animal_events` ativas em trigger | 2 (broken) | **0** | dropadas em migration 114 |
| Functions órfãs total | 20 | **18** | -2 (drop em 114), +1 corrigida (refresh_animal_passport em 121) |
| Migrations versionadas | até 107 | até **122** | +15 |
| Componentes UI compartilhados | 0 unificados | **5 PR 1** (KpiCard, PageHeader, EmptyState, Skeleton, ActionGuard) | +5 |
| Páginas usando KpiCard unified | 0 | **19+** | +19 |
| Bugs críticos resolvidos | — | 4 (Vercel deploy quebrado, 2 triggers órfãs, cache vazio, vazamento stock_batches, AI Predictive dark theme) | — |
| Contas Mentoria IZ-SP | 0 | **3** | +3 |
| Sidebar groups | 8 caóticos | **9 organizados** | reorganizada |
| Commits totais | ~410 | **470** | +60 em 48h |

### 10.3 — Decisões arquiteturais registradas

| Data | Decisão | Documento |
|---|---|---|
| 2026-05-17 | Foco 100% pecuária bovina | [CLAUDE.md](CLAUDE.md) |
| 2026-05-17 | Tom público: sem Halal/Jeddah/Q2 2026/SIF FSJBE | [CLAUDE.md](CLAUDE.md) |
| 2026-05-17 | Multbovinos→Agraas tombamento em segundo plano (FSJBE com 5 fictícios) | [CLAUDE.md](CLAUDE.md) |
| 2026-05-18 | Sidebar reorganizada em 9 grupos (commit 1cfeba7) | [docs/agraas-sidebar-proposta.md](docs/agraas-sidebar-proposta.md) |
| 2026-05-18 | PR 1 visual: KpiCard + PageHeader + EmptyState + Skeleton compartilhados | [docs/agraas-visual-patterns.md](docs/agraas-visual-patterns.md) |
| 2026-05-18 | Arquitetura mentor_externo com 3 contas + 22 policies SELECT + UI gating | — |
| 2026-05-18 | Apply via Management API (Docker indisponível) — drift `schema_migrations` documentado | — |
| 2026-05-18 | Halal mantido em /market + /passaporte (decisão explícita Lucas); removido de /painel, /animais, sidebar | — |

---

## PARTE 11 — DÍVIDA TÉCNICA MAPEADA

### 11.1 — Dívida conhecida

| Item | Severidade | Tempo estimado |
|---|---|---|
| 17 funções PL/pgSQL órfãs `animal_events` (sem trigger ativa, mas poluem) | P2 | 1-2h |
| `schema_migrations` drift (108-122 aplicadas via API, não registradas no CLI) | P2 | 5min `migration repair` quando Docker voltar |
| Build local Windows ARM64 SWC WASM env broken | P1 (dev) | 30min reinstall SWC binary correto |
| `/painel.tsx` 1227 LOC (refactor pendente) | P1 | 4h |
| `/animais/[id]/page.tsx` 1124 LOC | P2 | 4h |
| `/lotes/[id]/page.tsx` 750 LOC | P2 | 3h |
| `/propriedades/page.tsx` 855 LOC | P2 | 3h |
| 86% componentes `"use client"` (bundle JS pesado) | P2 | iterativo |
| 9 componentes órfãos (~500 LOC mortas) | P2 | 30min delete |
| 25+ páginas com classes `ag-page-title` / `ag-kpi-card` legacy | P2 | 4h |
| /dashboard/page.tsx (600 LOC) residual (rota redirect 301) | P2 | 5min delete |

### 11.2 — Pendências do audit P0/P1 não resolvidas

- Seed `weights` + `animal_scores` pra Fazenda Mentoria (10 animais com NULL no cache)
- /propriedades + /pesagens KpiCard migration (KpiCard local complexa — HeroMetric, SnapshotCard, PesagemHeroMetrics)
- Skeleton em listas críticas (animais, lotes, painel, aplicacoes, pesagens) — 0 páginas consomem hoje
- EmptyState compartilhado em 8 páginas residuais (eventos, custos, vendas, abates, fiscal, alertas, movimentacoes, certificacoes)
- Hero h1 responsive mass edit (25 páginas legacy `ag-page-title`)
- Playwright validation 375/768/1440 (mobile audit visual real)

### 11.3 — Frentes pós-mentoria sugeridas

- **Calendário visual** em `/calendario-sanitario` (FullCalendar.js ou similar) — Lucas pediu 19/05
- **/login redesign** (tirar badges crus, ênfase logo, animação frases) — Lucas pediu 19/05
- **Mobile PWA / app campo** (registro offline-first, sync quando online)
- **Integração BLE** (leitor de brinco RFID)
- **WhatsApp Business API** (notificações de carência, parto, etc.)
- **Templates PDF** mais robustos (passaporte, relatório fiscal)
- **Tombamento real Multbovinos → Agraas** (substituir os 5 fictícios FSJBE)
- **Materiais raising** (deck institucional, modelo financeiro)

---

## PARTE 12 — NÚMEROS DUROS

### 12.1 — Banco de dados (queried via Management API em 19/05)

| Métrica | Valor |
|---|---|
| Tabelas no schema public | **86** |
| Tabelas com RLS habilitada | **86 (100%)** |
| Policies totais | **327** |
| Policies SELECT mentor | **22** |
| Triggers user-defined | **88** |
| Functions ativas | **68** |
| Functions SECURITY DEFINER | **29** |
| Functions órfãs `animal_events` | **18** |
| Migrations versionadas | **121** (001-122, gap em 041) |
| ENUMs custom | **24** [contado em audit anterior] |
| Tabelas sem nenhuma policy | **0** |

### 12.2 — Código

| Métrica | Valor |
|---|---|
| Total LOC `.tsx` (em `app/`) | **42.128** |
| Total LOC `.ts` (em `app/` + `lib/`, não-tsx) | **3.393** |
| Total LOC `.md` (em `docs/`) | **2.542** |
| **TOTAL códigos** | **~48.063 LOC** |
| Total `page.tsx` em `app/` | **85** |
| Total `route.ts` em `app/api/` | **22** |
| Componentes `app/components/` raiz | **62** |
| Componentes `app/components/ui/` | **16** |
| Componentes `app/components/charts/` | **8** |
| Componentes `app/components/landing/` | **8** |
| Componentes `app/components/marketplace/` | **5** |
| Componentes `app/components/financeiro/` | **2** |
| Componentes `app/components/` TOTAL | **101** |

### 12.3 — Produção / repo

| Métrica | Valor |
|---|---|
| Commits totais all-time em main | **470** |
| Commits últimas 48h | **60** |
| Branch única | `main` |
| Tags | [a verificar — provavelmente sem tags formais] |
| Deploys Vercel | auto-deploy por commit em main |
| URL produção | https://agraas-platform.vercel.app (HTTP 200 verificado) |

### 12.4 — Dados em produção (queried em 19/05)

| Tabela | Rows |
|---|---|
| `animals` (FSJBE) | 5 (BER-001..005) |
| `animals` (Fazenda Mentoria) | 10 (MENT-001..010) |
| `agraas_master_passport_cache` (FSJBE) | 5 (peso/score populados) |
| `agraas_master_passport_cache` (Mentoria) | 10 (peso/score NULL — pendente seed) |
| `weights` total | 190 |
| `applications` total | 80 |
| `events` total | 206 |
| `marketplace_listings` | 9 |
| `marketplace_offers` | 2 |
| `mentor_assignments` | 1 (Renata→FSJBE) |
| `coverings` | 0 (schema pronto, seed pendente) |
| `births` | 0 |
| `pregnancy_diagnostics` | 0 |
| `producer_types` | 5 |
| `lots` (FSJBE) | 1 |
| `lots` (Mentoria) | 3 |
| `properties` total | 14 |

---

## PARTE 13 — CONTAS E ACESSOS ATIVOS

### 13.1 — Lucas (admin master)

- `auth.users.id`: `816a377b-1336-4c10-b4fc-35b675fe4596`
- `email`: lucas@agraas.com.br
- `client_id` próprio: `79c94a7e-b233-4e85-9d72-6d08477c21c9` (cliente "Lucas")
- `role`: admin
- `plan`: enterprise
- Outros clients onde aparece como `granted_by`: FSJBE mentor_assignment

### 13.2 — FSJBE (Fazenda São João da Boa Esperança)

- `client_id`: `00000000-0000-0000-0003-000000000001`
- `role`: admin
- `plan`: pilot
- Owner / `auth_user_id`: `b3406acf-0217-4b79-ad4a-0375322dcbd2` [a verificar — provavelmente Lucas-linked]
- `producer_type`: `cria` (is_primary=true, vinculado em migration 112)
- **5 animais** BER-001..005 (Nelore, 2 Female / 3 Male, status Ativo) — IDs `00000000-0000-0003-0003-000000000001..005`
- **Property**: Fazenda São João da Boa Esperança, Jandaia/GO, lat=-17.048, lng=-50.146
- **Lots**: 1 lote ativo [a verificar nome]
- **Reproductive seasons**: 1 ativa (id `6601af22-047f-4a17-b0e9-eaf4375ddaae`, period 2025-10-13 → 2026-04-30, 727 fêmeas inseminadas no registro reporting)
- **Cache passport**: 5 rows populadas pós migration 121 (peso real 180-620kg, score real 56-70)

### 13.3 — 3 contas Mentoria IZ-SP

#### Conta 1 — Produtor
- `email`: mentoria.produtor@agraas.com.br
- `password`: Agraas@2026 (temporária)
- `auth.users.id`: `de458573-c3ec-4272-b04a-63cc2cfc5d52`
- `app_metadata.default_client_id`: `00000000-0000-0000-0099-000000000001`
- Cliente vinculado: **Fazenda Mentoria IZ-SP** (admin CRUD)
- Producer type: `cria`
- Dados visíveis: 1 property (Fazenda Modelo IZ-SP, Nova Odessa/SP, 250 ha), 3 lots, 10 animais MENT-001..010, 1 reproductive_season ativa (2026-01-01 → 2026-06-30, to_inseminate=5, apt_count=5)

#### Conta 2 — Comprador
- `email`: mentoria.comprador@agraas.com.br
- `password`: Agraas@2026
- `auth.users.id`: `79e1362b-70ee-4f8e-ac7a-ad2ff090edf6`
- `app_metadata.default_client_id`: `00000000-0000-0000-0099-000000000002`
- Cliente vinculado: **Frigorífico Mentoria IZ-SP** (admin CRUD)
- Producer type: `ponta_compradora`
- Dados visíveis: 1 property (Unidade Industrial Mentoria, Barretos/SP), 2 marketplace_offers respondendo a listings FSJBE (vacas descarte 20cab + bois magros 25cab, ambos @ R$ 295/@ status pendente)

#### Conta 3 — FSJBE Read-Only (espelho)
- `email`: mentoria.fsjbe@agraas.com.br
- `password`: Agraas@2026
- `auth.users.id`: `36628211-da18-408b-9f98-a318a47715bd`
- `app_metadata.default_client_id`: `00000000-0000-0000-0003-000000000001` (FSJBE)
- **NÃO tem `clients.auth_user_id`** — acesso via `mentor_assignments` (id `e89cc4bc-1113-4fda-b4ca-986173ce9a2c`, granted_at 2026-05-18 14:35 UTC, granted_by Lucas)
- `role` efetiva: `mentor_externo`
- `canEdit`: **false** (read-only enforced no DB pelas 22 policies SELECT mentor + ZERO write policies; reforçado na UI por ActionGuard + badge "Modo Visualização")
- Dados visíveis: tudo do FSJBE em modo somente-leitura (animals BER, weights, scores, certs, cache, applications, events, lots, properties, marketplace_listings)

### 13.4 — Outros clients

| Cliente | client_id | Role | Plano | Producer type |
|---|---|---|---|---|
| Pedro | `00000000-0000-0000-0001-000000000001` | client | starter | [a verificar — não vinculado em client_producer_types] |
| Ico | `00000000-0000-0000-0001-000000000002` | client | starter | [a verificar] |
| Paulo | `00000000-0000-0000-0004-000000000001` | client | starter | [a verificar] |
| PIF | `187dc70c-d621-40f6-87b5-9033866fd150` | **buyer** | starter | [pausado — não vinculado em client_producer_types] |

---

## PARTE 14 — DOCUMENTOS VERSIONADOS EM `/docs`

| Arquivo | LOC | Data | Propósito | Status |
|---|---|---|---|---|
| [agraas-audit-completo.md](docs/agraas-audit-completo.md) | 292 | 2026-05-18 | Audit estrutural da plataforma (109 rotas, 92 components, tabelas, queries) | atual |
| [agraas-sidebar-proposta.md](docs/agraas-sidebar-proposta.md) | 208 | 2026-05-18 | Proposta de reorganização sidebar 8→9 grupos (APROVADA + executada) | atual |
| [agraas-visual-audit.md](docs/agraas-visual-audit.md) | 269 | 2026-05-18 | Audit visual P0/P1/P2 (16 cards de métrica variantes, classes legacy, mobile risks) | atual |
| [agraas-visual-patterns.md](docs/agraas-visual-patterns.md) | 352 | 2026-05-18 | Padrões propostos (KpiCard, PageHeader, EmptyState, Skeleton, tabelas, cores, radius) | em-execução (PR 1 parcial) |
| [agraas-platform-audit-2026-05-18.md](docs/agraas-platform-audit-2026-05-18.md) | 293 | 2026-05-18 | Audit integral 30+ rotas × 7 dimensões + plano em 3 ondas | atual |
| [agraas-final-status-2026-05-18.md](docs/agraas-final-status-2026-05-18.md) | 198 | 2026-05-18 | Fechamento sessão Onda 1+2 — top vitórias, pendências, estado 3 logins | atual |
| **agraas-platform-complete-2026-05-19.md** (este) | ~700 | 2026-05-19 | Resumo técnico completo da plataforma para briefing institucional / pitch deck | **atual** |

**Total docs**: 2.542 LOC pré-este + ~700 deste = ~3.250 LOC documentação versionada.

---

## Apêndice — Metodologia desta auditoria

- Queries reais via Supabase Management API + jq (Authorization: Bearer SUPABASE_ACCESS_TOKEN)
- Leitura direta de `package.json`, `CLAUDE.md`, `.mcp.json`, `.env.local` (apenas nomes de envs)
- `git log` para histórico de commits
- `find` + `wc -l` para métricas de LOC
- HTTP HEAD em produção via curl para verificar deploy ativo
- Análise estática de imports/exports em TSX
- **Não validado em browser** (Playwright pendente)
- **Build local não usado** (SWC WASM env broken na máquina de geração)

## Timestamp e identificação

- **Gerado em**: 2026-05-19
- **Arquivo**: `docs/agraas-platform-complete-2026-05-19.md`
- **Autor (operação)**: Claude Code (Opus 4.7)
- **Para**: Lucas Ferreira Borin (briefing institucional + pitch deck + Secretaria de Agricultura SP)
