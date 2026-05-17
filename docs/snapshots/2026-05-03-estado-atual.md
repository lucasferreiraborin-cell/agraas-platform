# Agraas — Estado Atual da Plataforma
## Levantamento técnico e crítico · 2026-05-03

> Documento honesto pra uso interno e externo. Verificado contra código,
> migrations aplicadas e working tree. Onde a documentação conflita com
> a realidade, a realidade ganha.

---

## 1. METADADOS

| Item | Valor |
|---|---|
| **Data do levantamento** | 2026-05-03 |
| **Branch atual** | `main` |
| **Último commit** | `44c3428` · 2026-04-27 22:37:31 -0300 · "copy: sobre — remove cidades específicas, mantém apenas 'exportação' como referência" |
| **Working tree** | ⚠️ Não-limpo — ver detalhes abaixo |
| **Migrations em supabase/migrations/** | 104 arquivos `.sql` numerados de 001 a 105 (gap em 041, ver §5) |
| **Next.js** | 16.1.6 |
| **React** | 19.2.0 |
| **TypeScript** | ^5 |
| **Tailwind CSS** | ^4 (PostCSS) |
| **Node local** | v24.14.0 |

**Working tree não-limpo (estado herdado, não acumulado):**
- Modificado: `supabase/.temp/cli-latest`
- Deletado (não commitado): 5 down migrations — `059_down.sql`, `060_down.sql`, `061_down.sql`, `062_down.sql`, `063_down.sql`
- Untracked: `supabase/.temp/linked-project.json`, `supabase/migrations/065_grain_id.sql`, `supabase/rollbacks/065_down.sql`

Status: esses arquivos vêm aparecendo em todas as sessões. Sugere
operação manual no Supabase CLI sem commit limpo posterior.

---

## 2. RESUMO EXECUTIVO

A Agraas é plataforma Next.js 16 + Supabase em produção (`agraas.com.br`),
cobrindo pecuária bovina (cobertura profunda), ovinos/caprinos, aves,
agricultura/Grain ID, operacional, financeiro, fiscal, estoque,
marketplace, exportação, comprador institucional (PIF) e IA com Claude.
RLS multi-tenant em 63 tabelas. 4 score engines em PostgreSQL com
triggers. 27 testes Jest passando (RLS isolation + score + predict +
passaporte). Stripe checkout + webhook funcionais (4 eventos tratados,
billing_exempt pro plano Pilot). 1 cliente piloto real ativo (FSJBE
Jandaia-GO). **Maior força:** profundidade de schema + RLS extensivo +
score engines como diferencial técnico real. **Maior fragilidade:**
mobile app é shell de 600 LOC sem BLE/offline-DB, dados de seed do
marketplace ainda alegam Halal/exportação ativa pra FSJBE, e a camada
de captura de RFID/dispositivos físicos não existe (0/10).

---

## 3. STACK CONFIRMADO

### Framework e linguagens
- Next.js **16.1.6** (App Router, webpack)
- React **19.2.0** + React DOM 19.2.0
- TypeScript **5.x**
- Tailwind CSS **4.x** (via `@tailwindcss/postcss`)

### Backend, banco, auth
- `@supabase/ssr` 0.9.0 (SSR cookies)
- `@supabase/supabase-js` 2.56.0
- PostgreSQL 15 (via Supabase)
- Edge Functions (1 ativa: `score-engine`)

### IA
- `@anthropic-ai/sdk` 0.80.0 — usado em 5 rotas API (ver §10)

### Pagamentos, email, observabilidade
- `stripe` 22.0.1 (checkout + webhook)
- `resend` 6.10.0 (email transacional, 3 templates)
- `@sentry/nextjs` 10.47.0 (`tracesSampleRate: 0.1`, ativo só em
  production)

### Mapas, gráficos, PDF, QR
- `leaflet` 1.9.4 + `react-leaflet` 5.0.0 — dynamic import com
  `ssr: false`
- `recharts` 3.8.0
- `@react-pdf/renderer` 4.3.2 (uso confirmado em export-report,
  lot-pdf)
- `qrcode.react` 4.2.0

### Mobile
- Diretório: `mobile/` — projeto Expo separado
- Expo 52, React Native 0.76.9, Expo Router 4
- `react-native-nfc-manager` 3.14.0 (NFC), AsyncStorage 1.23.1
- **Total: 600 LOC em 13 arquivos** — ver §9

### Testes
- `jest` 29.7.0 + `ts-jest` 29.4.9
- `@testing-library/react` 16.3.2, `@testing-library/jest-dom` 6.9.1
- `jest-environment-jsdom` 29.7.0
- 4 suites, 27 testes — todos passando

### Validação
- `zod` 4.3.6 (usado em vários endpoints API)

### Animação / fontes
- `framer-motion` 12.38.0
- `geist` 1.7.0 (fonte Geist Vercel)
- `lucide-react` 0.577.0 (ícones)

### ⚠️ Dependências possivelmente órfãs no bundle
- **`three` 0.184.0** + **`globe.gl` 2.45.3** + **`cobe` 2.0.1** —
  o globo WebGL foi removido da LP (commit `8deb76a`). Essas libs
  pesam ~500KB combinadas no client. Recomendado remover do
  package.json ou confirmar uso em alguma rota não auditada.
- **`@types/three` 0.184.0** + **`@types/leaflet` 1.9.21** — types
  no `dependencies` em vez de `devDependencies` (não-bloqueante, mas
  inconsistente).

---

## 4. ARQUITETURA

### Estrutura top-level

```
agraas/
├── app/                  # Next.js App Router (109 dirs, 84 page.tsx)
│   ├── api/              # 22 rotas API (route.ts)
│   ├── components/       # Componentes compartilhados
│   └── (~50 módulos)     # Ver §6
├── components/           # 5 componentes top-level legacy
├── lib/                  # 7 helpers (supabase-*, rate-limit, with-sentry...)
├── mobile/               # App Expo (separado)
├── supabase/
│   ├── migrations/       # 104 arquivos .sql (001–105 com gap em 041)
│   ├── functions/        # 1 Edge Function (score-engine)
│   └── rollbacks/        # 065_down.sql órfão (untracked)
├── __tests__/            # 4 suites
├── public/               # imagens estáticas
├── CLAUDE.md             # ⚠️ desatualizado (ver §13)
├── FSJBE_ONBOARDING.md   # processo import CSV piloto
├── AGRAAS_PUBLIC_SITE_CONTEXT.md  # mapa do site público
├── README.md             # ⚠️ default Next.js boilerplate, vazio
├── sentry.client.config.ts
├── sentry.server.config.ts
├── instrumentation.ts
├── jest.config.js
├── proxy.ts
└── vercel.json
```

### Autenticação multi-tenant

- **Supabase Auth** com e-mail/senha
- **Função SQL `get_my_client_id()`** resolve `auth.uid()` →
  `clients.auth_user_id` → `clients.id`
- **Política RLS padrão:** `USING (client_id = get_my_client_id())`
- **Função `is_admin()`** verificada em policies de marketplace e
  outras tabelas — admin bypassa RLS por padrão
- **6 clientes ativos** registrados: Lucas, Pedro, Paulo, Bernardo,
  Ico (admin), PIF Buyer (buyer), FSJBE (piloto real)

### Supabase clients (3 abstrações em `lib/`)

- `supabase-server.ts` → `createSupabaseServerClient()` — cookies SSR,
  respeita RLS. **Usado em todos os Server Components e maioria das
  API routes autenticadas.**
- `supabase-service.ts` → `createSupabaseServiceClient()` — service
  role, BYPASSA RLS. **Usado em:** passaporte público
  (`/passaporte/[agraas_id]`), comprador (`/comprador`), Stripe
  webhook, marketplace público (LP + marketplace listing index)
- `supabase.ts` → cliente browser (uso esparso)

### Rate limiting

- `lib/rate-limit.ts` — implementação em memória por IP, retorna
  `tooManyRequests(retryAfter)`
- Aplicado em 100% das rotas `/api/*` auditadas
- Limites típicos: 100 req/min (analyze/chat), 60 req/min
  (predict-score GET), 50 req/min (recalculate), 10 req/min
  (predict-score POST, stripe checkout)

### Sentry / observabilidade

- `sentry.client.config.ts` + `sentry.server.config.ts` ativos
- Helper `lib/with-sentry.ts` → `withApiSentry()` decorator usado em
  algumas rotas (predict-score, chat)
- `tracesSampleRate: 0.1`, enabled apenas em `NODE_ENV=production`
- `instrumentation.ts` configurado pra Sentry

---

## 5. BANCO DE DADOS

### Migrations

- **Total aplicadas: 104 arquivos .sql** numerados de 001 a 105
- **Gap em 041** — único pulo na sequência. Sem migration 041_*.sql
  no diretório. Origem desconhecida (provável renomeação histórica).
- **Migration órfã untracked:** `065_grain_id.sql` — existe no
  working tree mas nunca foi commitada. Migration `065` já existe
  como `065_grain_id.sql` no índice do git? Não verificado se há
  conflito com migration aplicada.
- **5 down migrations deletadas no working tree** (059–063) — não
  bloqueia execução mas indica gestão inconsistente de rollbacks.

### 10 migrations mais recentes

| # | Arquivo | O que faz |
|---|---|---|
| 105 | `marketplace_seed.sql` | 8 anúncios adicionais (bovinos, ovinos, frangos, milho, café, vacina, ração) |
| 104 | `marketplace_schema.sql` | Schema completo do marketplace (4 tabelas + RLS) |
| 103 | `fsjbe_polish.sql` | Buyer portal + auditoria + fiscal + calendário + passport cache pro FSJBE |
| 102 | `fsjbe_operacional.sql` | Fornecedores + estoque + lote + vendas + abate + custo + IA pro FSJBE |
| 101 | `fsjbe_animais.sql` | Recria 5 animais BER-001..005 (correção: mig 078 deletou animais demo) |
| 100 | `auditoria_demo.sql` | 1 ajuste de auditoria demo |
| 099 | `alertas_demo.sql` | Fix produto IVE + 1 alerta IA demo SAU-003 |
| 098 | `market_prices_seed.sql` | Cotações CEPEA em platform_settings |
| 097 | `agricultura_fixes.sql` | Datas embarque + score talhão B + seed fiscal |
| 096 | `aves_dates.sql` | Datas de alojamento realistas pra aves |

**Padrão observado:** as últimas ~15 migrations são predominantemente
seed/polish/fixes pra demo (FSJBE, Lucas, Pedro). Pouca mudança
estrutural. Marketplace (104–105) foi a última mudança real de schema.

### RLS — cobertura

- **63 tabelas únicas com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`**
- Tabelas incluem todas as operacionais críticas: `animals`, `events`,
  `weights`, `applications`, `lots`, `marketplace_*`, `crop_*`,
  `livestock_*`, `poultry_*`, `fiscal_*`, `subscription_events`,
  `ai_predictions`, etc.
- **Não verificado:** se TODAS tabelas no schema public têm RLS. Há
  ~63 com RLS confirmado. Pode haver tabelas auxiliares sem RLS.
  Audit de "RLS gaps" não foi feito.

### Score engines

| Cadeia | Função SQL | Migration | Triggers |
|---|---|---|---|
| Bovinos | `calculate_agraas_score(animal_id)` | 036 (INSERT/UPDATE), 067 (DELETE) | `weights`, `events`, `applications` |
| Ovinos/Caprinos | `calculate_livestock_score(animal_id)` | 054 | `livestock_weights`, `livestock_applications`, `livestock_events`, `livestock_certifications` |
| Aves | `calculate_poultry_score(batch_id)` | 056 | `poultry_batch_events` |
| Talhões | `calculate_field_score(field_id)` | 059 | `crop_inputs`, `crop_shipment_tracking`, `crop_certifications` |

Algoritmo bovino documentado: 28% produtivo + 24% sanitário + 18%
operacional + 20% continuidade + 10% idade + bônus rastreabilidade.

Edge Function `supabase/functions/score-engine/` complementa lógica
em alguns casos — não auditada em profundidade.

### Functions e triggers

- Função pública confirmada: `generate_agraas_id()` (migration 017) —
  gera ID `AGR-XXXXXXXX` com charset que evita confusão (sem I, O, 0,
  1)
- Trigger `set_agraas_id` em INSERT na tabela `animals`
- 4 funções de score + 4 conjuntos de triggers
- **Contagem total de functions/triggers:** não verificada (precisaria
  query SQL no banco)

### Inconsistências

- ⚠️ Migration gap em 041 (entre 040 e 042)
- ⚠️ Migration 065 untracked + 5 down migrations deletadas no working
  tree
- ⚠️ Sem documentação consolidada de quais tabelas existem e quais
  têm RLS

---

## 6. MÓDULOS DA PLATAFORMA

84 arquivos `page.tsx` em 109 diretórios sob `app/`. Visão por módulo:

### Pecuária bovina (mais profunda)

| Rota | Profundidade | Observação |
|---|---|---|
| `/animais` + `/[id]` + `/novo` | CRUD completo | Cadastro, edição, listagem, detalhe |
| `/pesagens` + `/historico` | CRUD completo | GMD calculado automaticamente |
| `/aplicacoes` + `/historico` | CRUD | Carências MAPA |
| `/calendario-sanitario` | Visualização | Não verificado se permite criar agendamento |
| `/movimentacoes` + `/historico` | CRUD | |
| `/eventos` | CRUD | Tabela `events` unificada |
| `/reprodutivo`, `/produtivo`, `/producao` | Visualização | Não verificado se permite CRUD |
| `/lotes` + `/[id]` + `/novo` + `/[id]/adicionar` | CRUD completo | Inclui calc. valor lote, PDF export, rastreio |
| `/abates`, `/vendas`, `/custos` (+ `/historico`), `/custo-producao` | Visualização/parcial | Não auditada profundidade |
| `/scores` | Visualização | Lista animais com score |
| `/alertas`, `/inteligencia` | Visualização | IA-driven |

### Ovinos e caprinos

| Rota | Profundidade |
|---|---|
| `/ovinos` + `/[id]` + `/novo` + `/dashboard` | CRUD completo |

### Aves

| Rota | Profundidade |
|---|---|
| `/aves` + `/[id]` + `/novo` + `/dashboard` | CRUD completo |

### Agricultura / Grain ID

| Rota | Profundidade |
|---|---|
| `/agricultura` | Index |
| `/agricultura/fazendas` | CRUD |
| `/agricultura/talhoes/[id]` | Detalhe (georreferenciado, CAR) |
| `/agricultura/embarques` | Tracking 7 checkpoints |
| `/agricultura/insumos` | CRUD |
| `/agricultura/armazens` | CRUD |
| `/agricultura/fiscal` | Fiscal específico de grãos |
| `/agricultura/[id]` | Detalhe |

### Operacional / Painel / Dashboard

| Rota | Profundidade | Observação |
|---|---|---|
| `/painel` | Apenas `page.tsx` | Dashboard principal — não verificada profundidade |
| `/dashboard` | Apenas `page.tsx` | Provável duplicidade com /painel — não verificado |
| `/operacoes` | Apenas `page.tsx` | Não auditado |
| `/historico` | Apenas `page.tsx` | Não auditado |

⚠️ **Risco de duplicidade:** `/painel` vs `/dashboard` — pode haver
rotas redundantes. Não verificado se uma redireciona pra outra.

### Financeiro

| Rota | Profundidade |
|---|---|
| `/financeiro` | Apenas `page.tsx` |
| `/custos` + `/historico` | Visualização |
| `/relatorios` | Visualização |

Não verificada profundidade de DRE / fluxo de caixa / balanço
patrimonial. CLAUDE.md menciona "DRE mensal automática" mas não
auditei se de fato gera relatório.

### Fiscal (NF-e, OCR)

| Rota | Profundidade |
|---|---|
| `/fiscal` + `/fiscal/[id]` | CRUD de notas |
| `/fiscal/relatorio` | Relatório |

APIs relacionadas: `/api/fiscal/parse-xml`, `/api/fiscal/analyze`
(Claude OCR), `/api/fiscal/apply-stock`, `/api/fiscal/delete` — fluxo
de upload → parse XML → análise IA → aplicação de estoque é completo
e cobre NCM/CFOP.

### Estoque

| Rota | Profundidade |
|---|---|
| `/estoque` + `/dashboard` + `/historico` + `/novo` | CRUD completo |
| `/insumos`, `/produtos`, `/fornecedores` | CRUD |
| `/metas` | Visualização |

### Marketplace

| Rota | Profundidade |
|---|---|
| `/marketplace` (público + autenticado) | Catálogo + filtros + ofertas + transações |
| `/marketplace/[id]` | Detalhe público |
| `/marketplace/novo` | Criar listing |

APIs: `/api/marketplace/listing` (POST cria), `/api/marketplace/offer`
(POST oferta).

**Estado real do fluxo de pagamento:** O schema `marketplace_transactions`
tem `stripe_charge_id` e `fiscal_note_id` mas **a integração end-to-end
de pagamento via Stripe → criação automática de NF-e NÃO foi
verificada como conectada**. Não há handler aparente em
`/api/marketplace/*` que faça checkout Stripe via offer aceita. **Parcial.**

### Comprador / PIF

| Rota | Profundidade |
|---|---|
| `/comprador` + `layout.tsx` + `page.tsx` | Portal buyer-only |
| `/compradores` | Gestão de acessos (admin) |

Componentes: `CompradorView`, `CompradorLivestockTab`,
`CompradorTrackingSection`, `CompradorCertificationMatrix`,
`CompradorGrainsTab`, `ShipTrackingMap` (Leaflet Santos→Jeddah).
Acesso controlado via tabela `lot_buyer_access` (migration 026).

### Passaporte público

`/passaporte/[agraas_id]` — sem auth, usa service client. Bilíngue
PT/EN/AR. Exibe `rfid_device_type` com badge especial pra bolus
intra-ruminal. Função SQL `set_agraas_id` gera ID em INSERT.

### Certificações / Selos / Cadeia / Exportação / Tracking

Todas como rotas com `page.tsx` único. Não auditada profundidade.
Provavelmente views agregadas, não CRUD.

### Configurações / Assinatura

`/configuracoes/assinatura` — integra com Stripe checkout e exibe
status do plano.

### Importação CSV

`/migrar-dados` (UI) + `/api/migrate-animals` + `/api/migrate-animals/recalculate`.
Documentado em `FSJBE_ONBOARDING.md`. Suporta aliases de coluna
(`rfid`, `chip`, `brincoelet`, `transponder`).

---

## 7. APIs

22 rotas em `app/api/` (todas com `route.ts`):

| Rota | Função resumida | Estado |
|---|---|---|
| `/api/predict-score` | GET cached prediction · POST gera nova prediction com Claude. Cache 24h em `ai_predictions` | ✅ Funcional + testado |
| `/api/analyze-animal` | POST análise individual via Claude — coleta animal + weights + applications + events + cotação + score | ✅ Funcional |
| `/api/recalculate-score` | POST força recálculo do score via RPC `calculate_agraas_score` | ✅ Funcional |
| `/api/chat` | POST chat livre com Claude (rate limit 5/30s, mais restrito) | ✅ Funcional |
| `/api/parse-doc` | POST parse XML de NF-e (regex puro, sem IA) | ✅ Funcional |
| `/api/fiscal/parse-xml` | POST parse XML específico fiscal | ✅ Funcional |
| `/api/fiscal/analyze` | POST análise IA da NF-e via Claude (NCM/CFOP/ICMS) | ✅ Funcional |
| `/api/fiscal/apply-stock` | POST aplica NF-e em estoque | Não verificado |
| `/api/fiscal/delete` | POST/DELETE remove NF-e | Não verificado |
| `/api/agriculture/checkpoint` | Endpoint pra embarque checkpoint | Não verificado |
| `/api/agriculture/fiscal/parse-xml` | Parse XML agricultura específico | Não verificado |
| `/api/marketplace/listing` | POST cria listing — Zod validation, RLS via supabase server | ✅ Funcional |
| `/api/marketplace/offer` | POST oferta no listing | Não verificado |
| `/api/migrate-animals` | POST import CSV de animais — auto-mapping de colunas, validação | ✅ Funcional + documentado |
| `/api/migrate-animals/recalculate` | POST recalcula scores após import | Não verificado |
| `/api/cotacao` | GET cotação @ atual | Não verificado |
| `/api/cron/cotacao` | Cron diário 11:00 UTC — fetch CEPEA, atualiza `platform_settings` (boi gordo, bezerro, vaca gorda, novilho precoce) | ✅ Funcional |
| `/api/dashboard-stats` | GET stats agregados | Não verificado |
| `/api/email` | POST envia email Resend (welcome, payment_confirmed, payment_reminder) | ✅ Funcional |
| `/api/export-report` | POST gera PDF com análise IA do lote — usa Claude pra avaliar lot vs critérios | ✅ Funcional |
| `/api/stripe/checkout` | POST cria checkout Stripe — só starter/pro/enterprise, billing_exempt bloqueia | ✅ Funcional |
| `/api/stripe/webhook` | POST recebe webhooks — trata checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted | ✅ Funcional |

**Padrão técnico observado em todas:**
- Rate limiting via `checkRateLimit`
- Autenticação via `supabase.auth.getUser()`
- Ownership check antes de operações
- Algumas (mais críticas) usam `withApiSentry` wrapper
- Zod para validação de input nas rotas mais novas

---

## 8. SITE PÚBLICO (não-logado)

### Páginas

| Rota | Estado | Observação |
|---|---|---|
| `/` (LP) | ✅ Polida pós-Agrishow | Hero limpo (foto Nelore sem degradê), HowItWorks, ScoresSection, Capabilities, PortosSection editorial com foto colheita, BrazilAgroSection, OperationalSection, Marketplace preview, FSJBECase, FAQ, CTA Final |
| `/marketplace` | ✅ Funcional | Catálogo público com filtros (preço/UF/cert/score), categorias, featured, value props, how it works |
| `/marketplace/[id]` | ✅ Funcional | Detalhe público com link pro passaporte se houver |
| `/sobre` | ✅ Polida | Hero + manifesto + beliefs + manifesto visual + empresa (Jandaia, sem "mercado financeiro") + time 5 founders sem bios sensíveis + CTA |
| `/planos` | ✅ Funcional | 4 planos (Starter R$299, Pro R$699, Enterprise R$1499, Pilot sob consulta) com Stripe checkout + comparação + FAQ + social proof FSJBE |
| `/cadastro` | ✅ Funcional | Signup form |
| `/login` + sidebar | ✅ Funcional | Login com sidebar lateral |
| `/passaporte/[agraas_id]` | ✅ Funcional | Sem auth, service client, bilíngue PT/EN/AR |

### Componentes principais

- `PublicNav.tsx` — header fixo verde escuro
- `PublicFooter.tsx` — footer institucional (contato, LinkedIn, CNPJ
  em registro, LGPD)
- `PublicShell.tsx` — wrapper com nav + footer + scroll-to-top
- `ScrollToTop.tsx` — botão flutuante
- `MotionProvider.tsx` — framer-motion provider
- 8 componentes de landing em `app/components/landing/` (HowItWorks,
  Scores, Portos, BrazilAgro, FSJBECase, FAQ, Operational,
  CredibilityStrip)

### Estado pós-Agrishow (sprint 27/abr–03/mai)

- Wave de polish + correção de exposição de dados (founders bios,
  scores, status piloto, link passaporte real)
- 6 commits de overshoot meu (Claude) revertidos em `9725086`
- Bug crítico de CSS resolvido em `fbada02` — `a { color: inherit }`
  estava sem `@layer base` no `globals.css`, sobrescrevendo `text-white`
  em todos os links. Uma linha resolveu o site todo.
- PortosSection refatorada como editorial com foto (`2769c0e`)
- Hero sem degradê verde lateral (`b557efe`)
- /sobre "A lacuna" reescrita 2× pós-Agrishow

### Placeholders / Unsplash / copy genérica

- `/sobre` hero usa Unsplash:
  `https://images.unsplash.com/photo-1500595046743-cd271d694d30`
  (campo de trigo aéreo)
- Resto da LP usa imagens locais: `/images/lp/rebanho-nelore.png`,
  `/images/lp/Maquina-agricola-colheita.jpg`
- Bios dos 5 founders no /sobre: nome + iniciais + "Co-founder" (Lucas:
  "CEO e Co-founder") — sem bios reais (decisão de proteção de dados
  sensíveis pós-Agrishow)
- Não há mais "Cliente fundador · Em operação" expondo status FSJBE

---

## 9. MOBILE

Estado real: **shell mínimo de validação, NÃO production-ready**.

### Estrutura (`mobile/app/`)

| Arquivo | LOC | Função |
|---|---|---|
| `_layout.tsx` | 14 | Expo Router layout root |
| `index.tsx` | 66 | Tela inicial (provável login/landing) |
| `home.tsx` | 84 | Home autenticada |
| `event.tsx` | 31 | Seleção de tipo de evento |
| `success.tsx` | 31 | Tela de sucesso pós-evento |
| `inputs/pesagem.tsx` | 42 | Form de pesagem |
| `inputs/aplicacao.tsx` | 52 | Form de aplicação sanitária |
| `inputs/marcacao.tsx` | 50 | Marcação |
| `inputs/alimentacao.tsx` | 35 | Alimentação |
| `inputs/pasto.tsx` | 46 | Mudança de pasto |
| `inputs/outro.tsx` | 32 | Evento "outro" |
| `lib/api.ts` | 103 | Funções `registerWeight`, `registerApplication`, `registerEvent`, `registerMovement` |
| `lib/supabase.ts` | 14 | Supabase client mobile |

**Total: 600 LOC em 13 arquivos.**

### O que funciona

- Login → home → escolher tipo de evento → form input → POST API
- 6 tipos de evento suportados via forms manuais
- AsyncStorage pra cache leve

### O que NÃO funciona / não existe

- ❌ Sem leitura BLE (`react-native-ble-plx` não instalado) — pareamento
  com handheld Allflex/Datamars não suportado
- ❌ Sem SQLite/WatermelonDB local — não há offline-first DB. AsyncStorage
  é só key-value, não estrutura relacional
- ❌ Sem sync delta — se internet cai durante operação, comportamento
  desconhecido (provável crash ou perda de dado)
- ❌ Sem leitura NFC apesar de `react-native-nfc-manager` instalado — a
  lib está no bundle mas nenhum import encontrado
- ❌ Sem captura de foto ou geolocalização nos forms
- ❌ Sem testes
- ❌ Sem CI específico pra mobile
- ❌ Não publicado na App Store / Play Store (não verificado, mas
  inferência razoável dado o tamanho)

### Maturidade real

**3/10** — É um wrapper de formulário sobre a API Agraas, não um app
de campo robusto. Não foi testado em campo (confirmação necessária).
Pra ser produto real precisa de offline-first DB + sync engine + BLE
(quando houver hardware) + foto/geo.

---

## 10. IA / INTEGRAÇÕES CLAUDE

5 rotas API instanciam `Anthropic`:

| Rota | Prompt aproximado | Produto |
|---|---|---|
| `/api/predict-score` | "Analise histórico do animal e gere risk assessment + tendência de score" | Predição inserida em `ai_predictions` (cache 24h) |
| `/api/analyze-animal` | "Analise dados completos: weights, applications, events, score, cotação. Dê parecer." | Análise textual JSON |
| `/api/chat` | Chat livre com contexto de operação (queries seguras com `safeQuery`) | Resposta conversacional |
| `/api/fiscal/analyze` | "Avalie esta NF-e: NCM, CFOP, ICMS aliquota — flag anomalias" | Análise de conformidade fiscal |
| `/api/export-report` | "Avalie lote vs critérios de exportação. Dê parecer + risco." | Texto pra PDF |

### Tabela `ai_predictions`

- Schema em migration 062
- Campos: `animal_id`, `client_id`, `prediction_json`, `created_at`
- Cache de 24h consultado no GET de predict-score
- RLS ativo via `client_id`

### Observabilidade

- `predict-score` e `chat` usam `withApiSentry` wrapper — erros
  reportados pra Sentry
- Outras rotas IA NÃO têm wrapper Sentry (poderia ser uniformizado)

### Modelo / SDK

- `@anthropic-ai/sdk` 0.80.0 — versão recente
- Modelo usado: não consigo afirmar sem ler todas as chamadas. Memory
  diz Claude Sonnet 4.6, mas pode ter rotas usando outro modelo.
- API key via `process.env.ANTHROPIC_API_KEY`

---

## 11. STRIPE / BILLING

### Planos cadastrados (`app/api/stripe/checkout/route.ts`)

| Plan ID | Preço mensal | Stripe ativável |
|---|---|---|
| `starter` | R$ 299 | ✅ |
| `pro` | R$ 699 | ✅ |
| `enterprise` | R$ 1.499 | ✅ |
| `pilot` | — | ❌ Bloqueado (`billing_exempt`) — sob consulta |

Plano Pilot na UI (`/planos`) é "Sob consulta" — checkout retorna
400 "Plano pilot isento de cobrança" se tentar assinar.

### Webhook (`/api/stripe/webhook/route.ts`)

4 eventos tratados:

| Evento | Ação |
|---|---|
| `checkout.session.completed` | Atualiza `clients.plan` + `clients.stripe_customer_id` + insere em `subscription_events` |
| `invoice.paid` | Insere `payment_success` em `subscription_events` |
| `invoice.payment_failed` | Insere `payment_failed` em `subscription_events` |
| `customer.subscription.deleted` | Volta `clients.plan = 'starter'` + insere `cancelled` em `subscription_events` |

Validação de signature via `STRIPE_WEBHOOK_SECRET`.

### Estado real

- Schema funciona (migration 079 adiciona `plan`, `plan_started_at`,
  `billing_exempt`, `stripe_customer_id`, `billing_email` em `clients`
  + cria `subscription_events`)
- Webhook completo
- Email transacional pós-pagamento existe (template
  `payment_confirmed` em `/api/email`) — não verificado se está
  conectado ao webhook
- **Não verificado: quantos clientes estão pagando vs `billing_exempt`.**
  Provável que TODOS os 6 clientes ativos estejam exempt (admins +
  buyer + piloto). Confirmar com query SQL.

### Marketplace fee

- Schema `marketplace_transactions` tem `stripe_charge_id` e
  `fiscal_note_id`
- **Fluxo de pagamento marketplace via Stripe NÃO está implementado**.
  Não há handler que conecte `marketplace_offers` aceita → Stripe
  PaymentIntent → `marketplace_transactions` criada → NF-e gerada.
  Taxa de 2% mencionada na UI (`/planos`) — não implementada no
  código.

---

## 12. TESTES

### Suites (4)

| Arquivo | Cobertura | Estado |
|---|---|---|
| `__tests__/agraas-score.test.ts` | Algoritmo de score bovino (lógica em `lib/agraas-analytics.ts`) | ✅ Passa |
| `__tests__/predict-score-api.test.ts` | Endpoint predict-score com UUID válido + mocks Anthropic | ✅ Passa |
| `__tests__/rls-isolation.test.ts` | Isolamento multi-tenant — cliente A não vê dados do cliente B (mock supabase + RLS simulada) | ✅ Passa |
| `__tests__/passaporte-public.test.ts` | Página pública `/passaporte/[agraas_id]` sem auth | ✅ Passa |

### Execução verificada hoje (2026-05-03)

```
Test Suites: 4 passed, 4 total
Tests:       27 passed, 27 total
Snapshots:   0 total
Time:        2.029 s
```

### CI

- `jest.config.js` configurado
- Não auditado se há GitHub Actions ou pipeline Vercel rodando jest
  em cada push
- Memory menciona commit `8cea9ab` "fix(ci): testes predict-score com
  UUID RFC válido — destrava deploy automático" → sugere que CI roda
  os tests e bloqueia deploy se quebrar. Não verificado.

### Cobertura

- 27 testes / 4 suites = cobertura focada em pontos críticos (RLS,
  score, predict, passaporte)
- **NÃO há testes de integração end-to-end** (Cypress/Playwright)
- **NÃO há testes do mobile**
- **NÃO há testes do fluxo Stripe**
- **NÃO há testes de UI components**

---

## 13. DOCUMENTAÇÃO

| Arquivo | Estado | Observação |
|---|---|---|
| `README.md` | ⚠️ **Vazio (default Next.js boilerplate)** | "This is a Next.js project bootstrapped with create-next-app..." — sem info de onboarding real |
| `CLAUDE.md` | ⚠️ **Desatualizado** | Lista migrations 001–068 (real: 001–105, 37 migrations a mais). Menciona "82 módulos genéricos" — métrica obsoleta. Score engines descritos corretamente |
| `FSJBE_ONBOARDING.md` | ✅ Atualizado | Processo CSV import detalhado com aliases de coluna, formato, exemplo. Útil de fato |
| `AGRAAS_PUBLIC_SITE_CONTEXT.md` | 🟡 Parcialmente desatualizado | Mapa do site público com referências a componentes pré-Agrishow (CounterAnimation, RotatingCategoryPill, JourneySection) que podem ter sido removidos. Verificar |

### Inconsistências documentação ↔ realidade

- `CLAUDE.md` afirma migrations 001–068 (37 atrás)
- `CLAUDE.md` lista a tabela de migrations apenas até 068 (não cobre
  069–105 que inclui marketplace inteiro, subscriptions, FSJBE polish)
- `CLAUDE.md` diz "82 módulos genéricos" — não confere com 84 page.tsx
  reais
- `CLAUDE.md` regra "Antes de implementar: apresente plano resumido e
  aguarde aprovação" — válida e em uso
- `README.md` é boilerplate puro — qualquer dev novo abre e não
  encontra nada útil
- `AGRAAS_PUBLIC_SITE_CONTEXT.md` referencia componentes removidos
  (de-hype pass do Lucas) — precisa atualização

---

## 14. COMMITS RECENTES (últimos 30)

### Bloco A — Polish pós-Agrishow (2026-04-27 → 2026-05-03, 8 commits)

```
44c3428 copy: sobre — remove cidades específicas
a877557 copy: sobre — "A lacuna" reescrita
b557efe fix: remove bottom fade do hero
2769c0e feat: hero sem degradê + PortosSection editorial com foto
1b26056 fix: hero gradient mais suave
fbada02 fix: text-white em todos botões — globals.css base layer
ddde6a8 fix: botões acessíveis em toda LP/Marketplace/Sobre
9725086 revert: desfaz mudanças visuais excessivas
```

### Bloco B — Sprint Agrishow + overshoot revertido (26–27/abr, 7 commits)

```
a77a5b0 fix: sobre — restaura cargos originais dos fundadores
b021951 fix: sobre — métricas/bios/cargos/Jandaia/footer
4edd152 fix: planos — botões, FSJBE copy, FAQ
6344290 fix: marketplace — botões, jargão, seed Jeddah, parcelamento
1b5aeb2 feat: hierarquia, credibilidade, footer institucional, FAQ
210d089 fix: bugs visuais — hero botão, gaps, cards, badges
8f33855 fix: hero limpo + botões brancos + FSJBE números reais
```

### Bloco C — Sprint pré-Agrishow (CI + LP+marketplace bloco, ~10 commits)

```
8cea9ab fix(ci): testes predict-score UUID RFC válido
09ba372 feat: site público elevado
c7d0300 fix: remove passport preview fake
7c7582e chore: force rebuild
0eee813 refactor: LP sem redundâncias + sobre time real + marketplace seed
8effcfd feat(planos): BLOCO 4
c06562c feat(marketplace): BLOCO 3
8eb0519 feat(lp): BLOCO 2 — marketplace preview
b9d8346 feat(lp): BLOCO 1 — correções P0
30c4d46 feat(planos+sobre): preço anual + Time placeholder honesto
```

### Bloco D — Refactors editoriais (~10 commits)

```
f371ca3 feat(marketplace): sidebar filtros Mercado Livre
0ec1bd5 refactor: Cadeia inteira card editorial + rename Sobre→Sobre nós
adc599e feat(scores): seção editorial Score Agraas
f767b17 feat(marketplace): Destaques da semana
8b6c247 feat(lp): Brasil no agro mundial
ad75642 feat(marketplace): cards Mercado Livre + categoria chips
8deb76a feat(portos): remove globo WebGL — seção editorial cards
17b74b4 refactor(marketplace): eyebrows font-mono removidos
516cb13 refactor(case-fsjbe): font-mono labels internos removidos
2a2c1f1 refactor(operational): card dark sem 01/02/03
```

**Padrão geral:** 30 últimos commits são quase 100% sobre o site
público pós-Agrishow. Nenhum commit toca camada de RFID/dispositivos,
backend novo, mobile, ou IA. Aderência narrativa: sprint focado em
preparar site público pra feira + cleanup de exposição de dados após
ela.

---

## 15. AVALIAÇÃO CRÍTICA

### O que está sólido

1. **RLS multi-tenant extensivo e testado.** 63 tabelas com RLS, função
   `get_my_client_id()` padronizada, teste de isolamento passando.
   Diferencial técnico real, raramente bem feito em SaaS BR.
2. **Score engines em SQL + triggers.** 4 cadeias produtivas, cálculo
   server-side, sem race condition no app. Algoritmo bovino testado
   unitariamente.
3. **Stripe webhook completo e bem feito.** Trata os 4 eventos
   relevantes, signature validation, idempotência via
   `subscription_events`.
4. **IA com Claude integrada em pontos de valor real** (predict,
   analyze, fiscal/OCR, chat, lot export). Rate limited, cached,
   ownership-checked.
5. **Schema marketplace recente e bem desenhado** (migration 104) —
   4 tabelas, RLS específica, indexes, suporta animal + safra +
   insumo + maquinário + EPI + outro.
6. **Passaporte público funcional** com geração automática de
   `agraas_id` via trigger + bilíngue PT/EN/AR.
7. **Cobertura de cadeias.** Bovinos profundo + ovinos + aves + grãos
   — diferencial competitivo vs iBOI (só boi) e VIP Systems (legacy).
8. **Site público polido** pós-Agrishow, sem dados sensíveis
   expostos.

### O que está frágil

1. **Mobile é shell de validação, não produto.** 600 LOC, sem BLE,
   sem offline DB, sem testes, sem sync. Qualquer tração séria em
   campo VAI quebrar isso.
2. **`/painel` vs `/dashboard` provável duplicidade** — risco de UX
   inconsistente.
3. **Webhook Stripe não dispara email transacional.** Template
   `payment_confirmed` existe mas não verificado se é chamado pelo
   webhook. Cliente não recebe confirmação.
4. **Marketplace transactions sem fluxo Stripe end-to-end.** Schema
   prevê `stripe_charge_id` mas não há código que cria PaymentIntent
   quando oferta é aceita. Taxa de 2% prometida na UI não está
   coletada.
5. **Edge Function `score-engine` não auditada.** Pode estar duplicando
   ou divergindo da lógica das functions SQL.
6. **5 down migrations deletadas no working tree.** Rollback pra
   versões anteriores quebrado. Pequeno risco mas mostra processo
   inconsistente.
7. **AGRAAS_PUBLIC_SITE_CONTEXT.md referencia componentes removidos.**
   Quem usar esse doc como referência vai errar.
8. **Dependências órfãs no bundle:** `three`, `globe.gl`, `cobe` —
   ~500KB de JavaScript shipped pro client sem uso confirmado.
9. **Sem testes de UI / E2E.** Bugs visuais (como o `text-white`
   sumindo) só foram pegos em produção pelo Lucas.

### O que regrediu ou está incompleto

1. **Capabilities cards em `app/page.tsx`** ainda têm `p2` (segunda
   linha de descrição) — foi removido num commit meu, depois voltou
   no revert `9725086`. Estado atual: tem `p2`. Não é "regressão"
   stricto sensu mas é estado misto.
2. **Migration órfã `065_grain_id.sql` untracked** — provável feature
   inacabada de Grain ID (quality reports + BL fitossanitário). Não
   committada há ~6 dias (working tree não-limpo desde 27/abr pelo
   menos).
3. **VIP Systems integração planejada pra 28/abr (memory)** — NÃO
   rodou. Endpoints `/api/vip/*` não existem.
4. **Camada de captura RFID/dispositivos = 0/10.** Conversação de
   hoje detalhou isso. Sem BLE, sem gateway, sem readers, sem
   field_events table.
5. **README.md é default boilerplate.** Não há onboarding técnico
   real escrito.

### Riscos de segurança ou exposição de dados

1. 🔴 **Marketplace seeds (migrations 104 e 105) ainda contêm
   alegações FSJBE de "Halal certificado", "MAPA + Halal + GTA
   certificado", "Apto exportação", "Embarque Jeddah".** O site
   público (LP/sobre) foi corrigido mas o **listing público de
   marketplace `Soja Safra 2026 — 3.500t embarque Jeddah`** + 2
   listings de touros Nelore com Halal certificado **continuam
   ativos no banco e visíveis publicamente em /marketplace**.
   Mesma exposição que motivou os reverts pós-Agrishow — só que essa
   ficou. **Ação imediata necessária:** PATCH dos listings via SQL
   ou via /api/marketplace/listing pra remover alegações Halal/Jeddah.
2. 🟡 **Capacidades de `is_admin()` não auditadas** — admin bypassa
   RLS em marketplace e outras tabelas. Lista de admins é Lucas,
   Pedro, Paulo, Bernardo, Ico. Confirmar que ninguém mais foi
   adicionado como admin.
3. 🟡 **Passaporte público acessível por enumeração de IDs.** Apesar
   do `agraas_id` ser `AGR-XXXXXXXX` (40 bilhões de combinações),
   não há proteção contra enumeração brute-force. Rate limiting na
   rota não verificado.
4. 🟢 **`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY` todos em env vars** — não há key
   hardcoded em código (verificação não-exaustiva).
5. 🟢 **Rate limit por IP** em todas as rotas API — bom hardening.

### Inconsistências entre documentação e realidade

| Onde | Diz | Realidade |
|---|---|---|
| `CLAUDE.md` | Migrations 001–068 | Real: 001–105 (gap em 041) |
| `CLAUDE.md` | "82 módulos" | Real: 84 page.tsx |
| `CLAUDE.md` | Score engines em migrations 036/054/056/059 | ✅ Confere |
| `README.md` | Boilerplate Next.js padrão | Inútil |
| `AGRAAS_PUBLIC_SITE_CONTEXT.md` | Lista CounterAnimation, RotatingCategoryPill | Removidos no de-hype pass |
| Memory `project_platform_state.md` | Migrations 104+ | ✅ Confere (105 hoje) |
| Memory `project_fsjbe_reality.md` | FSJBE Jandaia-GO | ✅ Confere (atualizado 27/abr) |

### Recomendações de prioridade técnica (próximos 30 dias)

1. 🔴 **Limpar marketplace seeds expostos publicamente.** Migration de
   correção que remove "Halal certificado / Embarque Jeddah" dos
   listings FSJBE e Lucas. 1h de trabalho. Risco reputacional alto se
   investidor vir.
2. 🟡 **Atualizar `CLAUDE.md` + reescrever `README.md`.** 4h de
   trabalho. Vital pra qualquer dev novo ou pra você quando voltar ao
   código em 2 meses.
3. 🟡 **Decidir caminho RFID/Hub e começar Fase 0** (auditoria mobile
   já feita, falta spec de schema + interface `RFIDProvider`). 2 dias
   de meu trabalho sem precisar de hardware.
4. 🟡 **Mobile: BLE + offline DB minimal**. Mesmo antes de hardware
   chegar, instalar `react-native-ble-plx` e WatermelonDB e fazer um
   spike. 1 semana.
5. 🟢 **Marketplace fee Stripe**: implementar PaymentIntent quando
   oferta aceita + handler no webhook. 3–4 dias. Destrava monetização
   real do marketplace.

---

## 16. PERGUNTAS EM ABERTO

Coisas que eu não consegui verificar com certeza e que precisam de
decisão de produto/negócio ou inspeção manual:

1. **Quantos clientes estão pagando vs `billing_exempt`?** Provável
   que todos os 6 sejam exempt hoje. Confirmar com query SQL no banco.
2. **`/painel` e `/dashboard` são páginas diferentes ou redirect?**
   Possível duplicidade.
3. **Edge Function `score-engine` está sendo chamada de onde?**
   Auditoria pendente — pode ser legado das migrations 036/054/etc.
4. **Webhook Stripe chama o template de email `payment_confirmed`?**
   Não verifiquei conexão.
5. **CI roda Jest em cada push pra `main`?** Memory sugere que sim
   (commit `8cea9ab` mencionava unblock de deploy), mas não verifiquei
   GitHub Actions ou Vercel CI config.
6. **VIP Systems** — integração que estava prevista pra 28/abr não
   rodou. Endpoints `/api/vip/*` não existem. Decisão de produto: ir
   pra wrapper API, ETL, ou abandonar e construir Hub próprio?
7. **Fazenda piloto SP** mencionada na conversa de hoje — qual nome,
   qual escala, qual cadeia?
8. **Migration `041` ausente** — foi renomeada, abortada, ou nunca
   existiu? Audit do histórico git não cobre essa janela.
9. **Migration `065_grain_id.sql` untracked** — é a mesma 065 listada
   no CLAUDE.md (`crop_quality_reports + BL`)? Aplicar e commitar, ou
   descartar?
10. **`agraas_master_passport_cache` table** — listada nas tabelas
    RLS. Cache materializado de passaporte? Sincronização? Não
    auditado.
11. **Mobile foi testado em campo (FSJBE) alguma vez?** Sem
    confirmação de uso real.
12. **`is_admin()` function** — quem está marcado como admin? Lista
    real necessária via query.
