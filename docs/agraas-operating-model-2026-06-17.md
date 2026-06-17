# Operating Model — Agraas

> **Como Lucas + Claude + time IA trabalham juntos como empresa real.**
> Versão 1.0 · 17 de junho de 2026
> Documento vivo — revisado trimestralmente

---

## 1. Filosofia

A Agraas opera como uma **empresa real com time IA**. Lucas é o CEO/fundador. Claude é Chief of Staff. Subagents são executores especializados com escopo definido. Skills são processos/ferramentas que qualquer um pode invocar.

Esta estrutura **não substitui contratação humana** — substitui o overhead de criar/manter processos, monitorar dezenas de fontes externas, e manter consistência institucional em 100 frentes paralelas. Quando vier headcount humano (H2 2026 — devs sêniores planejados), o time IA continua rodando em paralelo.

**Princípio regente**: cada parte do time existe para responder uma pergunta clara. Se não responde, não existe.

---

## 2. Organograma

```
┌──────────────────────────────────────────────────────────────────┐
│  LUCAS FERREIRA BORIN                                            │
│  CEO · Fundador · Estratégia · Captação · Relacionamento         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  CLAUDE                                                          │
│  Chief of Staff · Coordenação · Síntese · Memória institucional  │
│  Aplica framework de autonomia (Nível 1/2/3)                     │
└──────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│ ENGENHARIA     │    │ VERTICAIS      │    │ SKILLS         │
│ (técnico)      │    │ ESPECIALIZADAS │    │ (processos)    │
├────────────────┤    ├────────────────┤    ├────────────────┤
│ backend-       │    │ triangulacao-  │    │ intake-*       │
│ engineer       │    │ auditor        │    │ desabafo       │
│                │    │                │    │ pitch-         │
│ frontend-      │    │ rastreabilidade│    │ readiness      │
│ engineer       │    │ -auditor       │    │ weekly-        │
│                │    │                │    │ review         │
│                │    │ cientifico-    │    │ daily-         │
│                │    │ zootecnista    │    │ briefing       │
│                │    │                │    │ decision-      │
│                │    │ mercado-       │    │ journal        │
│                │    │ bovino         │    │ embrapa-       │
│                │    │                │    │ monitor        │
│                │    │ captacao-      │    │ mapa-pnib-     │
│                │    │ strategy       │    │ monitor        │
│                │    │                │    │ mbps-monitor   │
│                │    │                │    │ mercados-      │
│                │    │                │    │ externos       │
│                │    │                │    │ competitive-   │
│                │    │                │    │ radar          │
└────────────────┘    └────────────────┘    └────────────────┘
```

---

## 3. Escopo de cada peça do time

### 3.1 Lucas — CEO

**O que faz**: estratégia, captação, relacionamento institucional, decisões finais, "frentes quentes", cultura.

**O que NÃO faz** (delegado): código (back/front engineers), pesquisa científica (zootecnista), monitoramento mercado (mercado-bovino), audit (triangulacao + rastreabilidade), audit de pitch (captacao-strategy).

**Cadência típica**: reuniões institucionais 2-3×/dia em semanas quentes, calls produtor 1×/semana, mentoria IZ-SP quinzenal, weekly review com Claude sexta.

### 3.2 Claude — Chief of Staff

**O que faz**: coordenação geral, síntese de inputs, memória institucional (memory/), aplicação do framework de autonomia (Nível 1/2/3), invocação dos subagents corretos para cada tarefa, manutenção do CLAUDE.md como mapa de "frentes quentes".

**Framework de autonomia** (memorizado em `memory/feedback_autonomy_framework.md`):
- **Nível 1** (faz sem perguntar): edits em docs, skills/commands/hooks, memory CRUD, queries SELECT, WebSearch
- **Nível 2** (apresenta plano, executa se ✅): migration SQL, refator >5 arquivos, UI/UX, deps npm
- **Nível 3** (pergunta antes): DROP/DELETE produção, force-push, comunicação externa nominal, decisões estratégicas

### 3.3 Engenharia técnica

#### backend-engineer
- **Escopo**: Postgres 17, Supabase RLS, triggers, edge functions, Next.js API routes, integração externa (CEPEA, EUR-Lex, Embrapa Infoteca)
- **Não toca**: CSS, design system, componentes React
- **Métricas de sucesso**: zero migrations quebradas em produção, queries com EXPLAIN ANALYZE limpo, RLS coverage 100%

#### frontend-engineer
- **Escopo**: React 19, Next.js App Router, Tailwind CSS 4, design system Agraas (Terminal Industries tone), responsividade mobile-first, acessibilidade
- **Não toca**: SQL, RLS, triggers
- **Métricas de sucesso**: `npx tsc --noEmit` zero erros, mobile 375px renderiza ok, design tokens aplicados (sem hex hardcoded)

### 3.4 Verticais especializadas

#### agraas-triangulacao-auditor
- **Pergunta que responde**: "A cadeia fiscal → estoque → custo → animal → venda → ROI está consistente?"
- **Quando aciona**: `/audit-triangulacao`, suspeita de bug fiscal, NF-e órfã, ROI absurdo, preparação auditoria contábil
- **Reporta para**: backend-engineer (fix técnico), Lucas (decisão)

#### agraas-rastreabilidade-auditor
- **Pergunta que responde**: "Os animais Agraas são conformes para EUDR, PNIB, SISBOV e mercados externos?"
- **Quando aciona**: `/audit-rastreio`, pré-pitch JBS/Marfrig/Minerva, mudança regulatória detectada
- **Reporta para**: backend-engineer (target_market_requirements), captacao-strategy (deck), Lucas

#### agraas-cientifico-zootecnista
- **Pergunta que responde**: "Este paper/insight científico muda como o Score Engine v3 deve calcular?"
- **Quando aciona**: novo paper Embrapa, pré-mentoria IZ-SP, revisão metodológica
- **Reporta para**: backend-engineer (migration de ajuste), Lucas (validação com mentores)

#### agraas-mercado-bovino
- **Pergunta que responde**: "Qual o estado do mercado bovino BR hoje e o que mudou que afeta a Agraas?"
- **Quando aciona**: pré-call banco/fundo, daily-briefing semanal, embargo/quota nova
- **Reporta para**: Lucas (decisão), captacao-strategy (números frescos pro deck)

#### agraas-captacao-strategy
- **Pergunta que responde**: "Este material institucional está blindado para due diligence?"
- **Quando aciona**: antes de enviar deck/material, recepção de term sheet, preparação Q&A pitch
- **Reporta para**: Lucas (decisão final), mercado-bovino (números), backend-engineer (KPIs técnicos)

### 3.5 Skills (processos/ferramentas)

**Intake** (captura externa → memory/doc/TODO):
- `intake-call` — transcrição de reunião
- `intake-paper` — paper acadêmico/técnico
- `intake-news` — notícia/newsletter
- `intake-video` — palestra/podcast/webinar
- `intake-expert` — contato/network novo
- `intake-opportunity` — edital/parceria com prazo

**Pensamento estruturado**:
- `desabafo` — Lucas pensa em voz alta, eu só pergunto (modo socrático)
- `decision-journal` — registra decisão estratégica com critério de revisão
- `pitch-readiness` — audit antes de cada reunião crítica

**Monitoramento contínuo**:
- `embrapa-monitor` — publicações Embrapa, +Precoce, NeuTroPec
- `mapa-pnib-monitor` — PNIB, SISBOV, GTA digital, IN MAPA
- `mbps-monitor` — Mesa Brasileira de Pecuária Sustentável
- `mercados-externos-monitor` — UE/EUDR, China, MENA, EUA
- `competitive-radar` — JetBov, iRancho, Boi de Confiança, Ecotrace silentes

**Cadências**:
- `daily-briefing` — 3-5 itens da manhã que importam
- `weekly-review` — consolidação sexta + atualização "frentes quentes"

---

## 4. Fluxos típicos

### F1 · Material novo entra (call, paper, news, expert, opportunity)

```
Lucas captura → inputs/<tipo>-AAAA-MM-DD-titulo.<ext>
    ↓
Claude detecta tipo pelo prefixo (auto na sessão OU via /intake)
    ↓
Skill intake-<tipo> processa
    ↓
Destinos: memory/projeto_*.md  ·  docs/<tema>-AAAA-MM-DD.md  ·  TodoWrite  ·  CLAUDE.md (se frente quente mudou)
    ↓
Reporta Lucas com decisões propostas
```

### F2 · Decisão técnica de produto

```
Lucas pede mudança no produto
    ↓
Claude classifica nível autonomia
    ├─ Nível 1: executa direto e reporta
    ├─ Nível 2: apresenta plano, aguarda ✅
    └─ Nível 3: pergunta antes
    ↓
Se for backend → invoca backend-engineer subagent
Se for frontend → invoca frontend-engineer subagent
    ↓
Subagent reporta:
    - Diagnóstico + plano + risco + rollback
    - Mudança implementada (se autorizado)
    - TS check limpo + testes
    ↓
Claude consolida e reporta Lucas
```

### F3 · Audit fiscal/contábil/estoque

```
Lucas roda /audit-triangulacao
    ↓
agraas-triangulacao-auditor varre banco + código
    ↓
Reporta:
    - 🔴 Bugs/riscos críticos
    - 🟡 Gaps funcionais
    - 🟢 Observações
    - Plano de fix priorizado
    ↓
Claude analisa, propõe migration (se autorizado nível 2)
    ↓
backend-engineer implementa migration
    ↓
triangulação-auditor re-audita pós-fix
```

### F4 · Mentoria IZ-SP quinzenal (Renata + Franzon)

```
3 dias antes:
    cientifico-zootecnista varre embrapa-monitor (publicações novas)
    cientifico-zootecnista prepara pauta científica
    pitch-readiness audita material a apresentar
    Lucas revisa e ajusta
    ↓
Durante sessão (presencial/Google Meet):
    Lucas grava via Plaud
    ↓
Pós sessão (até 12h):
    intake-call processa transcrição
    cientifico-zootecnista interpreta decisões/orientações
    memory/project_mentores_iz_sp.md atualizada
    Se houve mudança no Score Engine → backend-engineer implementa
```

### F5 · Pitch institucional (banco/fundo/frigorífico)

```
72h antes:
    mercado-bovino: briefing com números frescos
    competitive-radar: matriz atualizada se necessário
    captacao-strategy: audit do deck/material
    Lucas: revisão final
    ↓
24h antes:
    pitch-readiness skill: roteiro + perguntas-prováveis + gaps
    Lucas: ensaio mental
    ↓
Durante:
    Lucas grava via Plaud (se autorizado)
    ↓
Pós (até 24h):
    intake-call processa transcrição
    captacao-strategy: lições aprendidas + ações de follow-up
    memory/network_<nome>.md atualizada
    weekly-review: incorpora na sexta
```

### F6 · Diário (cadência automática matinal)

```
08:00 BRT — daily-briefing dispara
    ↓
Consolida (últimas 24h):
    - embrapa-monitor (achados)
    - mapa-pnib-monitor (mudanças regulatórias)
    - mercados-externos-monitor (alertas)
    - competitive-radar (movimentações)
    - cotação CEPEA via mercado-bovino
    ↓
Filtra: só 3-5 itens que mexem com Agraas
    ↓
Saída: 3-5 bullets + 1 citação + 1 pergunta socrática
    ↓
Lucas lê em 3 min + decide se age
```

### F7 · Semanal (sexta tarde)

```
17:00 BRT — weekly-review dispara (ou Lucas roda /weekly)
    ↓
Lê:
    - git log da semana
    - inputs/ processados
    - memory/ atualizadas
    - calls processadas (intake-call outputs)
    - pitches realizados
    ↓
Consolida:
    - O que foi feito
    - O que aprendemos (3-5 insights novos)
    - O que mudou de prioridade
    - Atualização "frentes quentes" CLAUDE.md
    ↓
Pré-próxima semana:
    - Decisões pendentes
    - Top 3 ações prioritárias
    ↓
Lucas revisa em 10 min
```

### F8 · Mensal (dia 1)

```
00:00 do dia 1 — todos monitores rodam:
    embrapa-monitor, mapa-pnib-monitor, mbps-monitor,
    mercados-externos-monitor, competitive-radar
    ↓
Cada um produz seu relatório mensal
    ↓
daily-briefing consolida em "top do mês"
    ↓
weekly-review faz fechamento estendido (consolidação mensal)
    ↓
Atualiza:
    - CLAUDE.md "frentes quentes"
    - memory/ (mensais arquivados)
    - docs/ (se houve decisão estratégica)
```

### F9 · Trimestral (revisão do operating model)

```
Lucas + Claude:
    - ICP ainda correto? (hoje: frigorífico-first)
    - 3 dores ainda corretas? (Rastreio, Score, Compliance EUDR)
    - 3 nivéis de autonomia ainda calibrados?
    - Time IA precisa de mudança? (adicionar/remover subagent)
    - Roadmap vs realidade?
    ↓
Atualiza este documento (Operating Model)
```

---

## 5. Cadências consolidadas

| Frequência | O quê | Quem dispara |
|---|---|---|
| **Sob evento** | intake-* (material entra) | Lucas (sobe arquivo) ou Claude (auto-detect) |
| **Sob evento** | desabafo / decision-journal | Lucas (quando precisa) |
| **24h antes call** | pitch-readiness | Lucas (`/pitch-ready <stakeholder>`) |
| **48-72h antes pitch** | mercado-bovino briefing + captacao-strategy audit | Lucas (`/pitch-ready`) |
| **Diário 08h** | daily-briefing | Auto (skill `schedule`) |
| **Sexta 17h** | weekly-review | Auto + Lucas confirma |
| **Mensal dia 1** | 5 monitores + briefing mensal estendido | Auto |
| **Quinzenal** | Mentoria IZ-SP — F4 fluxo | Lucas (agenda fixa) |
| **Trimestral** | Operating model review | Lucas + Claude |

---

## 6. Interações entre subagents

| Quando | Subagent X chama Y |
|---|---|
| Audit triangulação encontra bug fiscal | `triangulacao-auditor` → `backend-engineer` (fix) |
| Audit rastreabilidade detecta gap UI | `rastreabilidade-auditor` → `frontend-engineer` (UI) |
| Paper Embrapa novo muda Score | `cientifico-zootecnista` → `backend-engineer` (migration) |
| Mudança regulatória detectada | `mapa-pnib-monitor` skill → `rastreabilidade-auditor` (impacto) |
| Pitch deck precisa números | `captacao-strategy` → `mercado-bovino` (cotação) + `backend-engineer` (KPIs técnicos) |
| Concorrente lança feature | `competitive-radar` skill → `captacao-strategy` (matriz slide 10) |
| Cliente reporta bug fiscal | Lucas → `triangulacao-auditor` → diagnóstico → `backend-engineer` → fix |

---

## 7. Memória institucional

### `memory/` (apenas Lucas + Claude veem)
- `project_*.md` — contexto durável do projeto (clientes, mentores, FSJBE realidade, marketplace scope, etc.)
- `feedback_*.md` — preferências/regras do Lucas (auto-commit-push, evitar AI startup feel, etc.)
- `network_<sobrenome>.md` — 1 arquivo por contato relevante
- `decisions/AAAA-MM-DD-titulo.md` — decisões estratégicas registradas
- `competitive_pulse_AAAA-MM.md` — snapshot competitivo mensal
- `mercado_AAAA-MM.md` — snapshot mercado mensal
- `opportunities_AAAA-MM.md` — oportunidades em pipeline

### `docs/` (versionados no git)
- Documentação técnica permanente (relatórios mentoria, audits, operating model, deck respostas)
- `MEMORY.md` — índice das memórias

### `CLAUDE.md` (raiz do projeto)
- Frentes quentes atuais
- Tom público + compliance FSJBE
- Stack + padrões de código
- Atualizado quando weekly-review detecta mudança real

---

## 8. Como invocar cada peça do time

### Lucas → Claude (conversa direta)
"Faça X" → Claude classifica nível autonomia → executa ou pergunta.

### Claude → subagent
Via Agent tool com `subagent_type: <nome>` ou descrição que dispara. Cada subagent corre em contexto isolado e devolve resultado consolidado.

### Lucas → skill (comando)
- `/intake` — processa material em inputs/
- `/desabafo` — modo socrático
- `/pitch-ready <stakeholder>` — audit pré-call
- `/weekly` — review da semana
- `/briefing` — top 3-5 do dia
- `/decision` — registrar decisão

### Skills automáticas (não precisam invocação)
- `daily-briefing` — schedule diário
- Monitores mensais — schedule no dia 1
- `weekly-review` — schedule sexta

---

## 9. Métricas de sucesso por peça

### Time técnico
- backend-engineer: zero migrations quebradas em produção, zero RLS leaks descobertos em audit
- frontend-engineer: TS clean sempre, mobile 375px funcional, design system aplicado consistentemente

### Verticais
- triangulacao-auditor: redução de bugs fiscais em produção mês a mês
- rastreabilidade-auditor: % de animais Agraas conformes para cada target market sobe
- cientifico-zootecnista: papers processados ↑, ajustes propostos no Score validados na mentoria
- mercado-bovino: briefings com timestamp < 24h, zero dado obsoleto em deck
- captacao-strategy: deck sem gaps na DD, perguntas-prováveis com taxa de "acerto" > 80%

### Skills
- intake-*: latência captura → memo < 24h
- daily-briefing: Lucas lê em ≤ 3 min, age em ≥ 1 item/semana
- weekly-review: CLAUDE.md sempre alinhado com realidade

### Globais
- Captação fechada com termos defensáveis
- Pilotos avançando conforme roadmap
- Score Engine validado cientificamente (mentoria) e adotado por frigorífico (comercial)

---

## 10. Evolução deste modelo

Este Operating Model é **vivo**. Cada trimestre:

1. Revisitar fluxos — algum está obsoleto? falta algum?
2. Revisitar time — algum subagent não foi invocado em 90 dias? (candidato a remover)
3. Revisitar cadências — daily-briefing tá útil ou virou ruído?
4. Revisitar autonomia — Nível 1/2/3 ainda calibrado?

**Próxima revisão prevista**: 17 de setembro de 2026.

---

> *Operating Model · Agraas · v1.0 · 17 de junho de 2026*
> *Lucas Ferreira Borin (CEO) + Claude (Chief of Staff) + 7 subagents + 16 skills*
