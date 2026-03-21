# Agraas Platform — Contexto para Claude Code

## Stack
- **Next.js 16.1.6** (App Router, webpack)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Vercel** (deploy automático via GitHub)
- **Repositório:** `lucasferreiraborin-cell/agraas-platform`
- **Produção:** `agraas-platform.vercel.app`

---

## Migrations executadas (Supabase CLI)

| Arquivo | O que faz |
|---|---|
| `001_multi_client.sql` | Tabela `clients`, `client_id` em todas as tabelas, seed Pedro e Ico com 6 propriedades |
| `002_unify_events.sql` | Tabela `events` unificada (substitui `animal_events` + `farm_events`), campo `source='animal'|'farm'` |
| `003_auth.sql` | Coluna `auth_user_id` na tabela `clients` |
| `004_rls.sql` | RLS ativo em 8 tabelas + função `get_my_client_id()` |
| `005_link_users.sql` | Vincula Pedro e Ico ao Supabase Auth |
| `006_add_lucas_client.sql` | Cria cliente Lucas com `lucas@agraas.com.br` vinculado ao Auth |

---

## Arquivos criados nessa fase

- `middleware.ts` — protege todas as rotas, redireciona para `/login`
- `lib/supabase-server.ts` — client server-side com cookies (`@supabase/ssr`)
- `app/login/page.tsx` — tela de login com e-mail/senha
- `app/components/LogoutButton.tsx` — botão logout no header
- `app/propriedades/[id]/page.tsx` — página de detalhe da fazenda

---

## Arquivos modificados

- `app/layout.tsx` — async, mostra e-mail do usuário logado + botão logout
- `app/animais/[id]/page.tsx` — events unificados, `calculateAgraasScore` importado do lib, textos do passaporte baseados no score real
- `app/propriedades/[id]/page.tsx` — query events atualizada
- `app/propriedades/page.tsx` — `animals_count` calculado em tempo real
- `app/animais/page.tsx` — seletor de clientes
- `app/animais/novo/page.tsx` — `client_id` no cadastro
- `lib/agraas-analytics.ts` — adicionado `getPassportConfidenceText`, `getPassportClassification`, `getMarketPotential`, `getExportEligibility`
- 8 páginas migradas de `animal_events`/`farm_events` → `events`: `historico`, `eventos`, `dashboard`, `inteligencia`, `page`, `produtivo`, `pesagens`, `vendas`

---

## O que está funcionando hoje

- Login real com e-mail/senha
- Cada usuário vê apenas seus próprios dados (RLS no banco)
- 3 clientes ativos: Lucas, Pedro, Ico
- Passaporte com textos gerados pelo score real (não mais hardcoded)
- `animals_count` calculado em tempo real
- Todos os eventos escritos e lidos da tabela `events` unificada
- Migrations automáticas via Supabase CLI (`npx supabase db push`)

---

## Pendências conhecidas

- `middleware.ts` precisa ser renomeado para `proxy.ts` (aviso Next.js 16)
- `lots_count` mostra `—` — tabela `lots` não tem `property_id` (schema incompleto)
- Lucas não tem animais nem propriedades vinculados ainda
- RLS na tabela `clients` não foi ativado (acesso público ainda)
- Tabelas `animal_events` e `farm_events` antigas ainda existem no banco (mantidas por segurança, podem ser dropadas)

---

## Credenciais de infraestrutura

- **Supabase project ref:** `ixuxawcgwhrrrnwendxr`
- **URL:** `https://ixuxawcgwhrrrnwendxr.supabase.co`
- **Supabase CLI:** autenticado via token pessoal (não commitar)

---

## Design system

Variáveis CSS: `--primary-hover`, `--surface-soft`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--primary-soft`, `--danger`, `--warning`, `--info`

Classes utilitárias: `ag-card`, `ag-card-strong`, `ag-badge`, `ag-badge-green`, `ag-badge-dark`, `ag-table`, `ag-button-primary`, `ag-button-secondary`, `ag-kpi-label`, `ag-kpi-value`, `ag-section-title`, `ag-section-subtitle`

---

## Regras permanentes

- Antes de implementar qualquer coisa, apresente um plano resumido e aguarde aprovação
- Após cada etapa: `git add`, `git commit`, `git push origin main`
- Migrations via `npx supabase db push` (nunca colar SQL manualmente no dashboard)
- Nunca criar dados fictícios sem aprovação explícita
- Manter design system consistente em todas as páginas
