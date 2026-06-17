# Sprint B · Personas Frigorífico + Banco

> 17 de junho de 2026 — destrava de 2 das 3 personas da arquitetura Agraas.
> Objetivo: ter material visual pronto para conversas com JBS (Frigorífico) e
> Bradesco/Sicredi/BB (Banco) sem precisar improvisar.

---

## O que entrou no ar

### Persona Frigorífico (`/comprador`)

Já existia parcial. Sprint B adicionou:

| Adição | Localização |
|---|---|
| Subpágina **Oportunidades** com cards de lotes ofertados | `/comprador/oportunidades` |
| Endpoint agregador score quali+quanti + EUDR/GTA/SIF/Sanitário | `/api/frigorifico/lotes-disponiveis` |
| Item "Oportunidades" no `BuyerSidebarNav` | `app/components/BuyerSidebarNav.tsx` |
| Tipos compartilhados `LoteOfertadoCard` + `maskEarTag` | `lib/personas.ts` |

**Fluxo de demo (JBS):**
1. Login com usuário role `'buyer'`
2. Sidebar mostra: Visão Geral, Oportunidades, Pecuária BR, Commodities, Rastreio, Relatórios
3. Em "Oportunidades", cards de lotes abertos com score médio, compliance flags, origem rastreada
4. Botão "Solicitar contato com produtor" (TODO: hookar com workflow real)

### Persona Banco (`/banco`)

Frente totalmente nova. Sprint B entregou:

| Adição | Localização |
|---|---|
| Migration 126 — role `'bank'` + tabela `bank_producer_relationships` + RLS | `supabase/migrations/126_persona_banco.sql` |
| Página **Portfólio** com lista de produtores | `/banco/page.tsx` |
| Dossiê individual por produtor com breakdown completo | `/banco/[clientId]/page.tsx` |
| Endpoint PDF do dossiê (formato A4 institucional) | `/api/export/dossie-banco-pdf` |
| Sidebar dedicada | `app/components/BankSidebarNav.tsx` |
| Layout standalone | `app/banco/layout.tsx` |

**Fluxo de demo (Bradesco):**
1. Login com usuário role `'bank'`
2. Sidebar mostra: Portfólio, Produtores, Indicadores, Dossiês exportados
3. Portfólio lista TODOS produtores que liberaram acesso (banco_producer_relationships.granted_by_producer=true)
4. KPIs agregados: score médio, alertas, alto padrão
5. Clica em produtor → dossiê completo: Producer Score + breakdown 4 dimensões + fazendas + amostra animais (ear tag mascarado)
6. Botão "Exportar PDF" gera dossiê A4 pronto para análise de crédito

### Bridge UI no painel produtor

| Adição | Localização |
|---|---|
| Card **Instituições parceiras** com toggle de transparência | `app/components/InstituicoesParceirasCard.tsx` |
| Endpoint `/api/banco/toggle-access` (POST) | `app/api/banco/toggle-access/route.ts` |
| Query + render no painel | `app/painel/page.tsx` |

Produtor vê quais bancos pediram acesso e libera/revoga em 1 clique. Aderência LGPD Art. 7º, V (consentimento expresso).

---

## Setup para demo (one-time)

### 1. Criar usuário banco no Supabase Auth + clients

```sql
-- 1.1 Cliente banco (executar como admin)
INSERT INTO clients (id, name, email, role, auth_user_id)
VALUES (
  gen_random_uuid(),
  'Bradesco Agro · Demo',
  'banco-demo@agraas.com.br',
  'bank',
  '<UUID do auth.users criado via Supabase Auth>'
);

-- 1.2 Relacionamento com FSJBE (ou outro produtor de demo)
INSERT INTO bank_producer_relationships (
  bank_client_id, producer_client_id, relationship_type, granted_by_producer, granted_at
) VALUES (
  '<id-do-cliente-banco-criado-acima>',
  '00000000-0000-0000-0003-000000000001',  -- FSJBE
  'credit_analysis',
  true,
  now()
);
```

### 2. Variáveis de ambiente Vercel

Opcionais — defaults TRUE em produção:

```
NEXT_PUBLIC_BUYER_VIEW_ENABLED=true
NEXT_PUBLIC_BANK_VIEW_ENABLED=true
```

Para esconder rotas em demos seletivas, setar `=false` e redeployar.

### 3. Teste

- Login `banco-demo@agraas.com.br` → redireciona para `/banco`
- Em `/banco`, vê FSJBE no portfólio
- Clica → `/banco/<fsjbe-id>` mostra dossiê completo
- Botão PDF gera arquivo institucional

---

## O que **NÃO** está pronto (próxima onda)

| Pendência | Prioridade | Estimativa |
|---|---|---|
| Botão "Solicitar contato" em Oportunidades realmente abrir workflow | Média | 1d |
| Página `/banco/produtores` (catálogo + busca) | Baixa | 1d |
| Página `/banco/analytics` (heatmap regional, distribuição de score) | Média | 2d |
| Página `/banco/dossies` (histórico de PDFs exportados, audit log) | Baixa | 1d |
| Onboarding institucional fluxo público para banco se cadastrar | Média | 2d |
| Cards score 4 dimensões do producer_score realmente populados | Alta | 2d (depende de lógica adicional no score engine) |
| `relationship_type='loan_active'` com dados de empréstimo | Baixa | 2d |
| Watermark "Confidencial · Bradesco" no PDF baseado no banco | Baixa | 0.5d |

Hoje os campos `score_relacionamento/financeiro/institucional` do `producer_scores` aparecem como placeholder ("não calculado"). A peça que falta é a lógica de cálculo — mantida intencionalmente em escopo separado pra não bloquear o release das telas.

---

## Decisão arquitetural reforçada

O Score Engine v3 (migration 123) já popula `farm_scores` e `producer_scores` via trigger toda vez que `animal_scores` muda. **Não precisa edge function nova**. A persona Banco consome o que já está sendo calculado em tempo real pelo Score Engine — apenas com RLS adicional via `bank_producer_relationships`.

Isso confirma que a arquitetura de **3 personas sobre mesmo core** funciona: dados unitários (animais) sobem para fazenda (farm_scores) e produtor (producer_scores), e cada persona acessa o nível certo via RLS.

---

> *Sprint B · Personas Frigorífico + Banco · Agraas · 17 de junho de 2026*
