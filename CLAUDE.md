# Agraas Platform — Guia Técnico

> Documento de referência para desenvolvedores. Mantido manualmente —
> atualize quando o foco mudar.
> Última revisão técnica: 2026-05-17 · Modo de trabalho: 2026-09-05.

---

## Como trabalhar comigo (Lucas)

> Gravado em 05/09/2026 na passagem de bastão do Claude (chat) para o Claude Code.
> Vale para **toda** sessão, técnica ou não.

Lucas Borin, CEO e fundador. Primeira viagem como fundador, formado em mercado de
capitais (Guide, Safra, Santander), constrói a Agraas com quatro sócios.
**Quer ser tratado como par: sem elogio, sem enrolação, sem concordância automática.**

**Regra 7 — nunca escolher em silêncio.** Apontar contradição antes de escolher.
Nunca concordar para agradar. Discordância vem marcada: `Discordo:` + motivo +
**o que faria você mudar de ideia**.

**Classificação universal.** Todo número e toda regra com etiqueta:
`FATO` (fonte e data) · `FATO-calculado` · `BENCHMARK` · `PREMISSA` (justificativa +
sensibilidade) · `SIMULADO` · `DESCONHECIDO` (com rota de obtenção).
**Lacuna nunca vira número plausível.** Norma sempre com artigo, vigência, fonte e
`verificado_em`.

**Perguntas no formato dele.** Identificador (Q1…), o que exatamente, por quê (o que
muda), **qual padrão você assume sem resposta**, formato da resposta. No máximo cinco
por vez, por impacto. Ele responde curto — **resposta curta é resposta**: não repetir,
seguir com o padrão declarado.

**Ele está ocupado.** Nada depende dele sem necessidade. Quando precisar: lista
numerada de passos de 5 minutos, sem análise. Manter `docs/decisoes/pendentes.md`
viva e repeti-la só quando fizer diferença, sem cobrar tom.

**Ordem: entregar primeiro, proatividade depois.** A pauta abre a sessão, mas a fila
de entregas vem antes de qualquer exploração nova. Palavras dele: *"isso entra depois
de todas as tarefas que precisamos entregar"*.

**Tom.** Hipótese e cenário, nunca veredito. Número antes de adjetivo. Sem ego.
Português brasileiro direto. Em documento de negócio, "leitura revisável". Sem
"genuinamente/honestamente", sem filler.

**Sem inflar.** Se um número depende de premissa, dizer qual e quanto. Se extrapolou,
dizer. **Autocrítica antes que peçam.**

**Entregas com forma.** Prefere `.docx`/`.xlsx`/`.pptx` formatados a texto inline para
documento; modelos **sempre com fórmulas vivas**, nunca resultado colado. Aqui:
produzir `.md` e `.xlsx` via script (openpyxl) e **dizer quando algo pediria acabamento
de deck** — aí ele leva ao chat.

### Nunca

- Inventar lei, artigo, data ou número.
- Prometer "recuperação tributária" ou "8–12%".
- Usar número não público da iBoi como fato.
- Mandar qualquer coisa a cliente, parceiro ou investidor **sem revisão humana**.
- **Aplicar migration ou fazer deploy sem ordem expressa.**
- Alterar o banco de produção por fora de migration versionada — um único caminho
  de aplicação. *(regra de casa, pendente de confirmação — ver `docs/decisoes/pendentes.md` D-10)*

### Precedência entre fontes

1. **Repositório e norma verificada** vencem qualquer documento.
2. Passagem de bastão de 05/09/2026.
3. Handoff técnico anterior.
4. Documentos mais antigos.

Abertura de sessão: skill `pauta`. Decisões paradas: `docs/decisoes/pendentes.md`.

---

## Foco atual: 100% pecuária bovina

**Decisão 2026-05-17** (pós-Agrishow, mentoria IZ-SP com Dra. Renata Helena Branco Arnandes + Prof. César Franzon):
o caminho crítico é pecuária bovina. Tudo o mais está pausado, não removido.

### Frentes quentes
- **JBS** — CFO Alexandre, Mourão Filho. Conversas ativas.
- **IZ-SP** — Dra. Renata Helena Branco Arnandes (especialista em CAR/RFI em Nelore) + Prof. César Franzon. Mentoria quinzenal, próxima **2026-05-29**.
- **GPB / Furlan** — em desenvolvimento.

### Frentes pausadas (código mantido, fora do caminho crítico)
- ⏸️ **Portal PIF (Comprador)** — rota `/comprador` redireciona para `/em-breve`. Tabelas e RLS intactas (eventual reuso frigorífico).
- ⏸️ **Ovinos / Caprinos** — rotas `/ovinos`, `/caprinos` redirecionam para `/em-breve`. Tabelas, score engine e seeds intactos.
- ⏸️ **Aves** — rota `/aves` redireciona. Tabelas, score engine e seeds intactos.
- ⏸️ **Agricultura / Grãos** — rota `/agricultura` redireciona. Tabelas, score engine e seeds intactos.

### Tombamento Multbovinos → Agraas
Tratado em **segundo plano**, fora do caminho crítico atual. Enquanto o
tombamento real não acontece, **FSJBE no sistema continua com 5 animais
fictícios** (`BER-001` a `BER-005`) — sem alterar até decisão do Lucas.

### Regras do tom público
- Nunca afirmar Halal / Jeddah / Q2 2026 / SIF certificado / "apto exportação" para FSJBE no site público.
- Nunca confrontar concorrentes (Agrofy, MF Rural, etc.) por nome. Silêncio competitivo, posicionamento por atributo.
- Tom **Terminal Industries** — quieto, sem cara de AI startup. Editorial, foto + tipografia, paleta verde-logo.
- Cautela com dados sensíveis (bios founders, scores reais, links passaporte real) — pause e pergunte ao Lucas antes de publicar.
- Marketplace = "Mercado Livre do agro" (vende tudo, não só pecuária).

> Detalhes operacionais dessas regras estão na skill `.claude/skills/agraas-fsjbe-guard/SKILL.md`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.1.6 (App Router, webpack) |
| Backend/DB | Supabase (PostgreSQL 17 + Auth + RLS + Storage) |
| Linguagem | TypeScript 5 (strict) |
| Estilo | Tailwind CSS 4 (PostCSS) |
| Deploy | Vercel (CI automático via push para `main`) |
| AI | Anthropic Claude Sonnet 4.6 (`@anthropic-ai/sdk`) |
| Email | Resend |
| Pagamentos | Stripe |
| PDF | `@react-pdf/renderer` v4 |
| Mapas | Leaflet + react-leaflet v5 (client-only via dynamic import) |
| Gráficos | Recharts v3 |
| QR Code | `qrcode.react` |
| Testes | Jest + Testing Library |

**Repositório:** `lucasferreiraborin-cell/agraas-platform`
**Produção:** `agraas-platform.vercel.app`
**Supabase project ref:** `ixuxawcgwhrrrnwendxr`

---

## Estrutura de diretórios

```
agraas/
├── app/
│   ├── api/                        # API Routes (server-side)
│   ├── components/                 # Componentes React reutilizáveis
│   ├── animais/                    # CRUD + passaporte bovino
│   ├── ovinos/  caprinos/  aves/   # ⏸️ pausados (rota redireciona)
│   ├── agricultura/                # ⏸️ pausado (rota redireciona)
│   ├── comprador/                  # ⏸️ portal PIF pausado
│   ├── lotes/                      # Lotes de exportação bovinos
│   ├── passaporte/[agraas_id]/     # Passaporte público (sem auth)
│   ├── painel/                     # Painel moderno (Server Component)
│   ├── tracking/                   # Rastreio de embarques
│   ├── alertas/                    # Alertas e predições IA
│   ├── em-breve/                   # Página placeholder para rotas pausadas
│   ├── page.tsx                    # Landing pública
│   └── sobre/                      # Página Sobre
├── lib/
│   ├── supabase-server.ts          # Client SSR com cookies
│   ├── supabase-service.ts         # Client com service role
│   ├── supabase.ts                 # Client browser
│   ├── agraas-analytics.ts         # Score engine puro
│   └── rate-limit.ts               # Rate limit em memória
├── middleware.ts                   # Redirects e proteção de rotas
├── supabase/
│   ├── migrations/                 # SQL numeradas 001-106
│   ├── rollbacks/                  # Down migrations (separadas)
│   └── functions/score-engine/     # Edge Function (recalcula scores)
└── .claude/                        # settings, hooks, skills, commands
```

---

## Padrões de código

### Supabase clients
```typescript
// Server / API route — usa cookies, respeita RLS
import { createSupabaseServerClient } from "@/lib/supabase-server";
const supabase = await createSupabaseServerClient();

// Público ou admin — bypassa RLS (service role)
import { createSupabaseServiceClient } from "@/lib/supabase-service";
const db = createSupabaseServiceClient();
```

### Server vs Client components
- Páginas em `app/` são Server Components por padrão (async, sem hooks)
- Componentes com estado/interatividade levam `"use client"` no topo
- Leaflet **sempre** via `next/dynamic` com `ssr: false`

### Migrations
```bash
# SEMPRE via CLI
npx supabase db push
```
- Up migrations em `supabase/migrations/`, numeradas 001-106
- Down migrations em `supabase/rollbacks/`
- Toda tabela operacional precisa de `client_id` + política RLS

### Tipos e casts Supabase
```typescript
function getJoin<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}
const rows = (data ?? []) as unknown as MyType[];
```

### Rate limiting
```typescript
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
const rl = checkRateLimit(req, 60, 60_000);
if (!rl.allowed) return tooManyRequests(rl.retryAfter);
```

---

## RLS

- `get_my_client_id()` resolve via `auth.uid()` → `clients.auth_user_id`
- Política padrão: `USING (client_id = get_my_client_id())`
- Exceções (service role):
  - `passaporte/[agraas_id]` — acesso público
  - `comprador/` — agregação para buyer (pausado)
  - `platform_settings` — leitura pública (cotação arroba)

---

## Design system

### CSS vars
`--primary` `--primary-hover` `--primary-soft` `--surface-soft` `--border`
`--text-primary` `--text-secondary` `--text-muted` `--danger` `--warning` `--info`

### Classes utilitárias (globals.css)
| Classe | Uso |
|---|---|
| `ag-card` / `ag-card-strong` | Card padrão / borda destacada |
| `ag-badge` / `ag-badge-green` / `ag-badge-dark` | Badges |
| `ag-table` | Tabela padrão |
| `ag-button-primary` / `ag-button-secondary` | Botões |
| `ag-kpi-label` / `ag-kpi-value` | KPI cards |
| `ag-section-title` / `ag-section-subtitle` / `ag-page-title` | Tipografia |

---

## Clientes ativos

| Nome | E-mail | Role |
|---|---|---|
| Lucas Ferreira | lucas@agraas.com.br | admin |
| Pedro Borin | pedro@agraas.com.br | admin |
| Paulo Borin | paulo@agraas.com.br | admin |
| Bernardo | bernardo@agraas.com.br | admin |
| Ico | ico@agraas.com.br | admin |
| PIF Buyer | pif@agraas.com.br | buyer ⏸️ |

---

## Regras permanentes

- **Antes de implementar:** apresente plano resumido e aguarde aprovação
- **Após cada etapa:** `git add`, `git commit`, `git push origin main`
- **Migrations:** `npx supabase db push` — nunca SQL manual no dashboard
- **Dados fictícios:** nunca criar sem aprovação explícita do Lucas
- **Frentes pausadas:** não criar copy nova sobre PIF / ovinos / caprinos / aves / agricultura
- **Design system:** manter consistência em todas as páginas
- **Leaflet:** sempre `dynamic(() => import(...), { ssr: false })`
- **RLS:** toda nova tabela precisa de `client_id` + política RLS

> Para regras de tom público + compliance FSJBE, ver `.claude/skills/agraas-fsjbe-guard/SKILL.md`.
