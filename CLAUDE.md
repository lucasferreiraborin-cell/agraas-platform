# Agraas Platform — Guia Técnico de Onboarding

> Documento de referência para desenvolvedores entrando no projeto.
> Mantido manualmente — atualize após cada sprint significativo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.1.6 (App Router, webpack) |
| Backend/DB | Supabase (PostgreSQL 15 + Auth + RLS + Storage) |
| Linguagem | TypeScript 5 (strict) |
| Estilo | Tailwind CSS 4 (PostCSS) |
| Deploy | Vercel (CI automático via push para `main`) |
| AI | Anthropic Claude Sonnet 4.6 (`@anthropic-ai/sdk`) |
| PDF | `@react-pdf/renderer` v4 |
| Mapas | Leaflet + react-leaflet v5 (client-only via dynamic import) |
| Gráficos | Recharts v3 |
| QR Code | `qrcode.react` |

**Repositório:** `lucasferreiraborin-cell/agraas-platform`
**Produção:** `agraas-platform.vercel.app`
**Supabase project ref:** `ixuxawcgwhrrrnwendxr`

---

## Estrutura de diretórios

```
agraas/
├── app/
│   ├── api/                        # API Routes (server-side)
│   │   ├── export/lot-pdf/         # PDF de lote via @react-pdf
│   │   ├── predict-score/          # Predição IA com Claude
│   │   ├── recalculate-score/      # Recalcula score de animal
│   │   └── migrate-animals/        # Importação CSV
│   ├── components/                 # Componentes React reutilizáveis
│   │   ├── CompradorView.tsx       # Portal do comprador (orquestrador)
│   │   ├── CompradorLivestockTab.tsx
│   │   ├── CompradorTrackingSection.tsx
│   │   ├── CompradorCertificationMatrix.tsx
│   │   ├── CompradorGrainsTab.tsx
│   │   ├── AnimalTimeline.tsx      # Timeline cronológica do animal
│   │   ├── LotValueCalculator.tsx  # Calculadora de valor do lote
│   │   ├── ShipTrackingMap.tsx     # Mapa Leaflet Santos→Jeddah
│   │   ├── ShipTrackingMapWrapper.tsx  # dynamic import wrapper (SSR safe)
│   │   └── ...
│   ├── animais/                    # CRUD + passaporte de animais bovinos
│   ├── ovinos/                     # Ovinos e caprinos
│   ├── aves/                       # Aves/frangos
│   ├── agricultura/                # Módulo de grãos (lavouras, embarques)
│   ├── lotes/                      # Lotes de exportação
│   ├── passaporte/[agraas_id]/     # Passaporte público (sem auth)
│   ├── comprador/                  # Portal PIF (buyer-only)
│   ├── tracking/                   # Rastreio de embarques
│   ├── alertas/                    # Alertas e predições IA
│   ├── dashboard/                  # Dashboard operacional
│   └── ...
├── lib/
│   ├── supabase-server.ts          # Client SSR com cookies (@supabase/ssr)
│   ├── supabase-service.ts         # Client com service role (bypasses RLS)
│   ├── supabase.ts                 # Client browser
│   ├── agraas-analytics.ts         # Funções puras de analytics/score
│   ├── passport-i18n.ts            # Textos bilíngues do passaporte
│   └── rate-limit.ts               # Rate limiting em memória por IP
├── supabase/
│   ├── migrations/                 # Migrations SQL numeradas (001–063)
│   └── functions/
│       └── score-engine/           # Edge Function para recalcular scores
├── middleware.ts                   # Proteção de rotas (redireciona → /login)
└── .env.example                    # Variáveis necessárias (ver arquivo)
```

---

## Módulos implementados

### Pecuária Bovina
- **Animais** — cadastro, passaporte, timeline operacional, QR code, score Agraas
- **Pesagens** — histórico, GMD calculado automaticamente
- **Aplicações sanitárias** — carências ativas, alertas de retirada
- **Certificações** — Halal, MAPA, GTA, SIF por animal
- **Movimentações** — entrada/saída entre propriedades
- **Eventos** — tabela `events` unificada (`source = 'animal' | 'farm'`)
- **Lotes de exportação** — composição, calculadora de valor, PDF, rastreio
- **Predição IA** — Claude analisa histórico e gera risk assessment (tabela `ai_predictions`)

### Pecuária Diversificada
- **Ovinos/Caprinos** — tabela `livestock_species`, score engine dedicado
- **Aves** — tabela `poultry_batches`, score de lote, certificação Halal de abatedouro

### Agricultura
- **Fazendas e talhões** — tabela `farms_agriculture` + `crop_fields`
- **Embarques de grãos** — `crop_shipments` + tracking `crop_shipment_tracking`
- **Culturas** — soja, milho, trigo, açúcar, café
- **Notas fiscais** — `fiscal_notes` com upload de documentos

### Portal do Comprador (PIF)
- **Acesso controlado** — role `buyer` em `clients`, tabela `lot_buyer_access`
- **Visão consolidada** — bovinos + ovinos + aves + grãos
- **Matriz de certificações** — status Halal/MAPA/GTA/SIF por animal
- **Mapa AIS** — navio Santos→Jeddah com interpolação Haversine
- **i18n** — EN/PT com toggle no header

### Infraestrutura
- **Auth** — Supabase Auth (e-mail/senha), middleware.ts protege todas as rotas
- **RLS** — isolamento por `client_id` em todas as tabelas operacionais
- **Rate limiting** — em memória por IP em todas as rotas `/api/*`
- **Passaporte público** — `/passaporte/[agraas_id]` usa service client (sem auth)

---

## Migrations executadas (001–063)

| # | O que faz |
|---|---|
| 001 | Tabela `clients`, `client_id` em todas as tabelas, seed Pedro e Ico |
| 002 | Tabela `events` unificada (`source='animal'|'farm'`) |
| 003 | Coluna `auth_user_id` em `clients` |
| 004 | RLS ativo em 8 tabelas + função `get_my_client_id()` |
| 005 | Vincula Pedro e Ico ao Supabase Auth |
| 006 | Cliente Lucas (`lucas@agraas.com.br`) |
| 007 | `property_id` em `lots` |
| 008 | RLS na tabela `clients` |
| 009 | Drop tabelas legadas de eventos |
| 010 | Lucas como admin |
| 011 | Remove políticas allow-all |
| 012 | Campos extras em `animals` (blood_type, genealogy, etc.) |
| 013 | Campos extras em `lots` (certificações, contrato, destino) |
| 014 | Campos em `applications` (withdrawal_period_days, etc.) |
| 015 | `platform_settings`, `target_arrobas` |
| 016 | Campos de exportação em `lots` |
| 017 | Geração automática de `agraas_id` |
| 018–019 | Seed de dados de demo |
| 020–021 | lat/lng em propriedades |
| 022–023 | Novos clientes, correção de nomes |
| 024 | Certificações SIF/MAPA em exportação |
| 025 | Tabelas de módulos + seed FSJBE |
| 026 | Buyer PIF (`lot_buyer_access`) |
| 027 | Seed Paulo Borin completo |
| 028 | Tabelas fiscais |
| 029–032 | Correções de score e upsert |
| 033–034 | Tabela `shipment_tracking` + seed |
| 035 | Enriquecimento Paulo Borin |
| 036 | `calculate_agraas_score()` SQL + triggers |
| 037 | Tabelas tipadas (weight_records, sanitary_applications, etc.) |
| 038 | Normaliza coluna `sex` para Male/Female canônico |
| 039 | Sincroniza `lots_count` estático |
| 040 | RLS `animal_rfids` com isolamento por `client_id` |
| 042 | Tabela `livestock_species` (ovinos/caprinos) |
| 043 | Tabela `poultry_batches` (aves) |
| 044–045 | Seed demo ovinos/aves + Halal |
| 046–047 | Tabelas agricultura (`farms_agriculture`, `crop_fields`, `crop_shipments`) |
| 048 | `calculate_farm_score()` SQL |
| 049 | Drop tabelas legadas de eventos |
| 050 | Sincroniza `lots_count` para todos os clientes |
| 051 | Auditoria de RLS |
| 052 | Seed auditoria e alertas demo |
| 053 | Tabelas suporte livestock (withdrawals, certifications) |
| 054 | Score engine para ovinos/caprinos |
| 055 | Seed ovinos Lucas |
| 056 | Score engine para aves |
| 057–058 | Seed withdrawals e scores aves |
| 059 | Score e certificações para talhões |
| 060 | Notas fiscais agricultura (`crop_fiscal_notes`) |
| 061 | Campo `document_source` em fiscal |
| 062 | Tabela `ai_predictions` com RLS |
| 063 | Colunas `ship_name`, `arrival_date` em `lots` |

---

## Padrões de código

### Supabase clients
```typescript
// Server component / API route — usa cookies, respeita RLS
import { createSupabaseServerClient } from "@/lib/supabase-server";
const supabase = await createSupabaseServerClient();

// Dados públicos ou admin — bypassa RLS (service role)
import { createSupabaseServiceClient } from "@/lib/supabase-service";
const db = createSupabaseServiceClient();
```

### Server vs Client components
- Páginas em `app/` são **Server Components** por padrão (async, sem hooks)
- Componentes com estado/interatividade levam `"use client"` no topo
- Componentes Leaflet **sempre** usam `next/dynamic` com `ssr: false`

### Migrations
```bash
# SEMPRE via CLI — nunca colar SQL no dashboard
npx supabase db push
```

### Tipos e casts Supabase
```typescript
// Supabase joins podem retornar object | object[] | null — use helper:
function getJoin<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}
// Para casts largos:
const rows = (data ?? []) as unknown as MyType[];
```

### Rate limiting
```typescript
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
const rl = checkRateLimit(req, 60, 60_000); // 60 req/min
if (!rl.allowed) return tooManyRequests(rl.retryAfter);
```

---

## Regras de RLS

- Todas as tabelas operacionais têm `client_id uuid NOT NULL REFERENCES clients(id)`
- Políticas padrão: `USING (client_id = get_my_client_id())`
- `get_my_client_id()` resolve via `auth.uid()` → `clients.auth_user_id`
- **Exceções** (sem RLS ou service role):
  - `passaporte/[agraas_id]` — usa service client para acesso público
  - `comprador/` — usa service client para dados agregados do buyer
  - `platform_settings` — leitura pública (cotação arroba)

---

## Design system

### Variáveis CSS
```
--primary         --primary-hover   --primary-soft
--surface-soft    --border
--text-primary    --text-secondary  --text-muted
--danger          --warning         --info
```

### Classes utilitárias (globals.css)
| Classe | Uso |
|---|---|
| `ag-card` | Card padrão |
| `ag-card-strong` | Card com borda destacada |
| `ag-badge` | Badge neutro |
| `ag-badge-green` | Badge verde (exportação, PIF) |
| `ag-badge-dark` | Badge escuro |
| `ag-table` | Tabela padrão |
| `ag-button-primary` | Botão primário |
| `ag-button-secondary` | Botão secundário |
| `ag-kpi-label` / `ag-kpi-value` | KPI cards |
| `ag-section-title` | Título de seção |
| `ag-section-subtitle` | Subtítulo de seção |
| `ag-page-title` | Título de página |

---

## Clientes ativos

| Nome | E-mail | Role |
|---|---|---|
| Lucas Ferreira | lucas@agraas.com.br | admin |
| Pedro Borin | pedro@agraas.com.br | admin |
| Paulo Borin | paulo@agraas.com.br | admin |
| Bernardo | bernardo@agraas.com.br | admin |
| Ico | ico@agraas.com.br | admin |
| PIF Buyer | pif@pif.sa | buyer |

---

## Regras permanentes

- **Antes de implementar:** apresente plano resumido e aguarde aprovação
- **Após cada etapa:** `git add`, `git commit`, `git push origin main`
- **Migrations:** `npx supabase db push` — nunca SQL manual no dashboard
- **Dados fictícios:** nunca criar sem aprovação explícita
- **Design system:** manter consistência em todas as páginas
- **Leaflet:** sempre `dynamic(() => import(...), { ssr: false })`
- **RLS:** toda nova tabela precisa de `client_id` + política RLS
