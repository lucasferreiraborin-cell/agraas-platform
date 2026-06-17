# Sprint C · Persona-First UI

> 17 de junho de 2026 — separação visual e funcional radical entre as 3 personas.
> Produtor, Frigorífico e Banco agora têm **paletas distintas**, **rotas isoladas**
> via guards rigorosos e **AdminSwitcher** persistente pra você (Lucas) navegar
> entre todas elas como observador.

---

## O que mudou

### 1. Sistema central de persona

| Arquivo | Função |
|---|---|
| `lib/persona-themes.ts` | Mapa `Persona → tema visual` (cores, sidebar, home, label) |
| `lib/persona-resolver.ts` | Resolve persona efetiva (real + cookie admin "ver como") |
| `app/components/personas/PersonaShell.tsx` | Wrapper visual universal — aplica CSS vars + sidebar + admin badge |

### 2. Paletas radicalmente distintas

| Persona | Sidebar bg | Acento | Sentimento |
|---|---|---|---|
| **Produtor** | `#0d1f17` verde floresta | `#4ade80` verde vivo | Operação, campo, vida |
| **Frigorífico** | `#1a0f08` marrom queimado | `#ea580c` cobre industrial | Indústria, abate, processamento |
| **Banco** | `#0a1124` navy profundo | `#fbbf24` dourado institucional | Crédito, análise, conservador |
| **Admin** (você) | `#1a1a1a` grafite | `#dc2626` vermelho alerta | Controle, operação Agraas |

CSS vars (`--persona-accent`, `--persona-sidebar-bg`, `--persona-main-bg`) são injetadas via `themeToCssVars()` no PersonaShell. Quem renderiza fica desacoplado do tema.

### 3. Route guards rigorosos

Toda página crítica agora chama `requirePersona([...])`. Quem está no perfil errado é redirecionado para a home da sua persona (não para `/`).

Rotas com guard aplicado neste sprint:

- `/comprador` → `FRIGORIFICO_ROUTES` (frigorífico + admin)
- `/comprador/oportunidades` → `FRIGORIFICO_ROUTES`
- `/comprador/produtores` → `FRIGORIFICO_ROUTES`
- `/banco` → `BANCO_ROUTES`
- `/banco/[clientId]` → `BANCO_ROUTES`
- `/banco/produtores` → `BANCO_ROUTES`
- `/banco/analytics` → `BANCO_ROUTES`

Admin sempre passa em qualquer guard — exceto quando ele setou cookie `agraas_view_as`, aí respeita a simulação.

### 4. Admin Switcher (peça nova)

Componente client `AdminSwitcher.tsx` que aparece no header de qualquer página quando o usuário é admin. Permite simular Produtor / Frigorífico / Banco.

- Endpoint: `POST /api/admin/view-as` body `{ persona: "produtor" | "frigorifico" | "banco" | null }`
- Cookie: `agraas_view_as` (httpOnly, sameSite=lax, 8h)
- Quando ativo: banner no topo "Admin simulando perfil X" com indicador piscante âmbar
- Quando desativado: badge vermelho "Modo Admin · acesso total"
- Botão "Voltar para Admin" remove cookie

**Você ativa pelo header do `/painel`** (badge vermelho ao lado da cotação) — clica e escolhe a persona pra simular. O resolver respeita o cookie em todas as rotas subsequentes.

### 5. Páginas novas

- `/comprador/produtores` — catálogo dos produtores associados ao frigorífico via `lot_buyer_access`, com score Embrapa
- `/banco/produtores` — catálogo completo do portfólio, mostra status do consentimento (liberado / aguardando)
- `/banco/analytics` — distribuição por faixa de score, concentração por UF, KPIs agregados do portfólio

### 6. Painel produtor — bridge LGPD reforçado

Já existia o `InstituicoesParceirasCard` (Sprint B). Sprint C adicionou o `AdminSwitcher` no hero do painel — você consegue ativar simulação em 2 cliques sem sair da página.

---

## Setup pra testar

### Admin (você)

Você já é admin (`lucas@agraas.com.br`). Login no `/painel` → badge vermelho "Admin" aparece no hero, ao lado da cotação. Clica → simula qualquer persona.

### Outros perfis pra demo

Já estavam descritos no Sprint B (`docs/sprint-b-personas-2026-06-17.md`).

---

## Filosofia da decisão

Antes, todas as 3 personas tinham fundo escuro + sidebar verde floresta. Visualmente uniforme demais. Funcionalmente também — qualquer buyer poderia adivinhar `/animais` na URL.

Agora cada persona é **uma experiência completa**, com:
- Identidade visual própria (cor de fundo, sidebar, acento)
- Sidebar com itens relevantes àquela persona
- Acesso restrito às próprias rotas (guards)
- Página home customizada (`theme.home`)
- Label contextual no sidebar (`theme.topLabel`)

**Você (admin) é a única exceção** — pode tudo + tem ferramenta de simulação pra validar UX de cada perfil. Quando simulando, vê banner âmbar persistente lembrando do contexto.

---

## Próximas evoluções (não bloqueantes)

| Item | Onde | Prioridade |
|---|---|---|
| Refatorar `/comprador` (CompradorView) pra usar PersonaShell | `app/comprador/page.tsx` | Média — refator visual maior |
| Aplicar `requirePersona` em `/animais`, `/lotes`, `/aplicacoes`, etc | rotas produtor | Alta — fecha últimas brechas |
| Página `/admin` dedicada com dashboard operacional Agraas | nova | Média |
| `/banco/dossies` (histórico de PDFs exportados + audit log) | nova | Baixa |
| `/comprador/compliance` (status EUDR/GTA dos lotes ativos) | nova | Média |
| Persona-aware login redirect (após `/login`) | `app/login` | Baixa |
| Permitir admin esconder o banner via setting persistente | UX polish | Baixa |

---

> *Sprint C · Persona-First UI · Agraas · 17 de junho de 2026*
