# Auditoria do Time de IA + Roadmap de Upgrade — Agraas

> Diagnóstico crítico do time de IA (8 subagents · 18 skills · 4 hooks · 4 commands · 1 MCP)
> e mapa do estado da arte do Claude Code aplicável.
> Gerado por 4 auditorias paralelas (agents · skills · infra · estado-da-arte) em **22 de junho de 2026**.
> Status: diagnóstico pronto. Execução priorizada abaixo.

---

## TL;DR

O time é **mais maduro que a média** — os auditores (`triangulacao`, `rastreabilidade`) e os dois engineers são de alto nível. Mas há **3 furos que doem AGORA**, justo no caminho do backend de ingestão NF-e (foco atual):

1. **Colisão de domínio fiscal** — `controladoria-fiscal` × `triangulacao-auditor` × `backend-engineer` disputam "quem escreve o código NF-e". O orquestrador vai rotear errado na 1ª task.
2. **Sem rede de segurança** — fluxo é solo-founder com `git push origin main` **automático**, e não existe `code-reviewer` nem `security/RLS-auditor` independentes. Num sistema fiscal com premissa "zero erros", isso é grave.
3. **Nenhum dos 8 agentes declara `model:`** — todos herdam o default; o agente que constrói o NF-e pode rodar num modelo mais fraco que o trabalho exige.

E uma **divergência realidade × narrativa**: o Operating Model afirma cadências automáticas (weekly-review sexta, 5 monitores mensais, briefing consolidando 5 fontes, digest aos sócios) que **não estão implementadas**. O que roda de verdade são 6 crons Vercel de dados de plataforma — e o digest de sócios está travado em `dryRun` (não envia).

---

## Parte 1 — Diagnóstico

### 1.1 Subagents (8)

| Agente | Veredito | Ação |
|---|---|---|
| `backend-engineer` | FORTE | declarar `model: opus` (executa o NF-e, não tolera erro) |
| `frontend-engineer` | FORTE | declarar `model: sonnet`; enxugar gatilho SEO/Storybook |
| `triangulacao-auditor` | FORTE (o melhor) | parar de recitar "11 bugs de 17/06" como fato fixo — re-verificar via `pg_trigger`/migrations a cada run |
| `rastreabilidade-auditor` | FORTE | `model: opus`; declarar fronteira GTA (sanitário) vs triangulacao (fiscal) |
| `cientifico-zootecnista` | FORTE | tirar `Edit`/`Write`/`execute_sql` de escrita — ele **propõe**, backend implementa |
| `mercado-bovino` | MÉDIO-FORTE | remover MCP supabase (sem caso de uso); `model: sonnet` |
| `captacao-strategy` | MÉDIO (perecível) | mover dados voláteis (contatos, "121 migrações") para `memory/`; **buscar** tração real via SQL |
| `controladoria-fiscal` | FRACO (problemático) | escopo largo demais (5 responsabilidades) + escreve código colidindo com backend. Reduzir a **especialista read-only que propõe** |

**Gaps de papel (faltando):** `code-reviewer` 🔴 · `security-rls-auditor` 🔴 · `test-engineer` 🟠 · `data-analyst` (read-only, SQL) 🟠 · jurídico/LGPD 🟡 · growth/GTM 🟡.

**Colisões críticas:** (1) 3 agentes têm poder de escrever migration mas o modelo diz que só o backend implementa; (2) eixo NF-e/fiscal sem dono declarado.

### 1.2 Skills (18)

**Achado estrutural:** 17 das 18 são **100% prosa, zero scripts** — só `socios-digest` separa prosa de código (`lib/socios-digest.ts`). É o template de como uma skill deveria ser.

- **6 intakes** (`call/paper/news/video/expert/opportunity`) → fundir em **1 skill `intake`** com router + 6 references. `intake-video` admite ser cópia do `intake-news`.
- **5 monitores** (`embrapa/mapa-pnib/mbps/mercados-externos/competitive-radar`) → são pesquisa web pesada = trabalho de **subagent**, não skill. Consolidar em dados (`references/sources-*.md`) + 1-2 subagents. `mbps-monitor` é esqueleto vazio ("a confirmar"/"a descobrir") — matar como skill.
- **Duplicação skill↔subagent:** `embrapa-monitor`+`intake-paper` ↔ `cientifico-zootecnista`; `mapa-pnib`+`mercados-externos` ↔ `rastreabilidade-auditor` (ambos propõem a tabela `target_market_requirements` — dono único pendente).
- **Converter em command** (disparo sob demanda, não auto-trigger por keyword): `daily-briefing`→`/briefing`, `weekly-review`→`/weekly`, `decision-journal`→`/decision`, `pitch-readiness`→`/pitch-ready`, `socios-digest`→`/digest-socios`.
- **Manter intactas** (bem desenhadas): `agraas-fsjbe-guard`, `desabafo`, `socios-digest`.
- **Referências fantasma:** `setor-agro`/`cenario-agro-br` citadas em 3 skills mas não existem.

**Resultado alvo:** de 18 skills → ~4 skills + ~5 commands + 1-2 subagents de monitoramento.

### 1.3 Automação / Infra

**Agendamento — realidade vs narrativa (o achado mais importante):**

| Operating Model afirma | Realidade |
|---|---|
| daily-briefing 08h consolidando 5 fontes | `/api/digest/daily` 07h57 só lê tabelas Supabase — **monitores não alimentam** |
| weekly-review sexta 17h automático | **NÃO EXISTE** — nenhum cron/routine |
| 5 monitores no dia 1 do mês | **NÃO EXISTE** — só rodam se invocados à mão |
| socios-digest envia aos 5 sócios sexta | cron existe mas travado em `?dryRun=true` — **não envia** |

O que **existe de verdade** (`vercel.json`, robusto): `self-heal` (hora), `cotacao` CEPEA (08h), `market/refresh` (6h), `generate-insights` (07h), `digest/daily` snapshot (07h57), `digest/socios` dryRun (sex).

**Hooks:** 3 de ~8 eventos cobertos (SessionStart, PostToolUse, Stop). **Falta crítico: `PreToolUse`** — a única defesa real contra `git push --force`/`DROP`/`db reset`; hoje o "Nível 3 pergunta antes" é só texto. *(Parcialmente mitigado em 22/06 pela deny-list em `settings.json`.)*

**Permissões:** `settings.local.json` re-declara 8 permissões que já estão no `settings.json` + 4 resíduos de debug — limpar.

**MCP:** só `supabase`. Maior ROI faltando: **GitHub** > **Vercel** > **Sentry** > Resend > Drive (este prometido no doc, ausente do `.mcp.json`).

**Commands prometidos que não existem:** `/intake`, `/weekly`, `/briefing`, `/pitch-ready`, `/decision`, `/audit-*`.

### 1.4 Estado da arte do Claude Code que você ainda não usa

| Capacidade | O que te daria | Adotar? |
|---|---|---|
| **`model:` por subagent** | opus onde não pode errar, sonnet/haiku onde é rotina (economia + qualidade certa) | ✅ já |
| **Tool restriction por subagent** | auditor não escreve no banco; menor privilégio | ✅ já |
| **Agentes cloud agendados (`/schedule` / routines)** | rodar weekly-review, monitores mensais e compliance-check **de verdade**, na nuvem, sem você abrir o laptop | ✅ estratégico |
| **Workflows multi-agente** | fan-out paralelo (migrações em massa, audits 10x mais rápidos) — já usei 2 nesta sessão | ✅ usar |
| **PreToolUse / hooks novos** | validação automática antes de SQL/commit destrutivo | ✅ |
| **MCP GitHub/Vercel/Sentry** | code-review pós-PR, logs de cron/deploy, bug-discovery proativo | ✅ |
| **Plan mode** | explorar+propor migrations grandes sem editar até aprovar | ✅ usar |
| **Agent SDK** | embutir um "Compliance Bot" no próprio produto Agraas (cliente auto-audita 24/7) — diferenciador vs concorrentes | 🔭 pós-MVP |

---

## Parte 2 — Roadmap priorizado

### Tier 0 — Hardening que de-risca o NF-e (fazer JÁ · Nível 1 · ~reversível via git)
1. Declarar `model:` nos 8 agentes (opus: backend, triangulacao, rastreabilidade, +novos auditores; sonnet: frontend, mercado, captacao, cientifico, controladoria).
2. Criar `code-reviewer` (read-only, adversarial, roda antes de push que toca migration/RLS/trigger).
3. Criar `security-rls-auditor` (único com `get_advisors`; caça leak multi-tenant + rota service_role + passaporte público).
4. Resolver a colisão fiscal: `controladoria-fiscal` vira read-only que **propõe**; `backend-engineer` **implementa**; `triangulacao` **audita**. Fronteiras no header de cada um.
5. Tirar tools de escrita de quem não implementa (`cientifico-zootecnista`, MCP supabase do `mercado-bovino`).
6. Limpar `settings.local.json` (duplicação + debug).

### Tier 1 — Consolidação skills/commands (Nível 2 · apresentar antes)
7. Fundir 6 intakes → 1 skill `intake` + references (1º progressive-disclosure de verdade).
8. Rebaixar 5 monitores → dados + 1-2 subagents; matar `mbps-monitor` skill.
9. Materializar commands prometidos: `/briefing`, `/weekly`, `/decision`, `/pitch-ready`, `/audit-*`.
10. Definir dono único de `target_market_requirements`; corrigir refs fantasma.

### Tier 2 — Automação real (Nível 2)
11. Hook `PreToolUse` de contenção (push --force, DROP, db push sem confirmação).
12. Decidir o digest de sócios: ligar envio real ou documentar como piloto.
13. MCP GitHub + Vercel + Sentry.
14. Routines agendadas reais: compliance-check noturno, weekly-review, monitores mensais.

### Tier 3 — Estratégico (pós-MVP)
15. Agent SDK: "Compliance Bot" embutido no produto (cliente auto-audita).

### Sincronização
16. Atualizar o Operating Model: 7→8 subagents (depois do refator, o número final), e marcar cadências não-implementadas como "planejado" até existirem.

---

## Notas de precisão
- A auditoria de **infra** leu `vercel.json` e os route handlers reais — os achados de agendamento são factuais.
- A matriz de **estado da arte** teve imprecisões na lista de subagents (confundiu skills disponíveis com os subagents Agraas); as **capacidades** em si (model override, routines, workflows, MCP, Agent SDK) estão corretas e foram filtradas aqui.

> *Auditoria do Time de IA · Agraas · 22 de junho de 2026 · base para o "Sprint H — Team Hardening".*
