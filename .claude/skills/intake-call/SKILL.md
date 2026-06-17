---
name: intake-call
description: Processa transcrição de reunião/call (Plaud, Google Meet, manual). Extrai participantes, decisões, ações com prazo, follow-ups. Atualiza memory, gera TODOs e propõe ajustes em CLAUDE.md se houver frente nova. Trigger keywords: "call", "reunião", "transcrição", "Plaud", "Google Meet", arquivos em inputs/ com prefixo "call-".
---

# Intake — Call / Reunião

Skill que transforma transcrição bruta em ações estruturadas.

## Quando invocar

- Lucas roda `/intake` e há arquivo `inputs/call-*.md`
- Lucas cola transcrição direta na conversa
- Lucas menciona "tive call com X" e quer processar

## Entradas esperadas

1. **Transcrição** (Plaud auto-format, Otter, Fireflies, Google Meet IA, ou texto manual)
2. **Metadado opcional**: participantes confirmados, data, contexto da reunião

## Processo (passos sequenciais)

### 1. Identificação da reunião
- Quem participou? (Lucas + outros)
- Qual era o tema central?
- Esta reunião gera continuidade (próxima sessão prevista?) ou é one-off?
- Confidencialidade — interna, externa, sensível institucionalmente?

### 2. Extração estruturada
Identifique no texto:

| Categoria | O que extrair |
|---|---|
| **Decisões tomadas** | "Vamos fazer X", "ficou definido que Y" |
| **Ações com prazo** | "Lucas vai fazer Z até DD/MM", "fulano se compromete a..." |
| **Follow-ups acordados** | "próxima call em data X", "vou mandar material" |
| **Pontos abertos** | questões sem resposta, debates não resolvidos |
| **Frases-chave** | citações que valem preservar (ex: tese articulada por mentor) |
| **Sinais de novo contexto** | nomes novos, conceitos novos, oportunidades novas |

### 3. Decisão de destino

Para cada item extraído, classifique:

| Conteúdo | Destino |
|---|---|
| Contexto durável sobre projeto/pessoa | `memory/project_*.md` ou `memory/feedback_*.md` |
| Decisão estratégica importante | `memory/decisions/AAAA-MM-DD-titulo.md` |
| Ação com prazo | TodoWrite com data |
| Mudança em "frente quente" | atualizar `CLAUDE.md` |
| Insight valioso recorrente | `docs/sintese-*.md` |
| Citação institucional | arquivo de quotes/citações |

### 4. Aplicação de guard rails

**SEMPRE checar antes de gravar:**
- Skill `agraas-fsjbe-guard`: nada de Halal/Jeddah/Q2 2026/SIF como claim FSJBE
- Nomes de pessoas físicas: não imprimir em docs públicos sem autorização (memory ok, doc público não)
- Confidencialidade dos interlocutores: JBS, banco, etc. — `confidentiality: high` no frontmatter

### 5. Reporte ao Lucas

Sempre devolver:
1. **Resumo executivo** (3-5 linhas)
2. **Lista de decisões** (bullet)
3. **Lista de ações com prazo** (bullet + data)
4. **O que foi salvo onde** (memory, doc, TODO, CLAUDE.md)
5. **O que precisa de confirmação dele** (frase ambígua, decisão não confirmada, ação sem responsável)

## Formato de saída padrão

```markdown
## Call processada — [tema]

**Participantes**: [...]  **Data**: AAAA-MM-DD  **Duração**: X min

### Decisões
- [decisão 1]

### Ações
- [ ] [ação] — [responsável] — [prazo]

### Salvei em
- memory/projeto_X.md (criado)
- TodoWrite: 3 itens

### Pendente confirmação sua
- "[frase ambígua]" — você confirma que significa Y?
```

## O que NÃO fazer

- ❌ Inventar ações/decisões que não estão claras na transcrição
- ❌ Atribuir prazo a quem não se comprometeu
- ❌ Atualizar CLAUDE.md sem necessidade real (só se frente quente mudou)
- ❌ Citar nomes de mentores/parceiros em docs públicos sem autorização explícita
- ❌ Esquecer de aplicar `agraas-fsjbe-guard` para qualquer copy que vá pro site
