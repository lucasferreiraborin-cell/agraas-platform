---
name: pitch-readiness
description: Audit antes de cada reunião/pitch crítico. Lista o que sabemos do stakeholder + o que temos para mostrar + gaps de credibilidade + perguntas prováveis + roteiro de demo. Trigger keywords: "/pitch-ready", "vou apresentar para", "reunião com", "demo para".
---

# Pitch Readiness

Skill de preparação pré-reunião.

## Quando invocar

- Lucas digita `/pitch-ready <stakeholder>` (ex: `/pitch-ready Bradesco`)
- Lucas escreve "vou ter reunião com X amanhã"
- 24h antes de qualquer reunião marcada via skill `schedule`

## Stakeholders conhecidos hoje

| Stakeholder | Tipo | Status | Foco esperado |
|---|---|---|---|
| **Banco do Brasil (Mourão)** | financeiro | Avaliação positiva, conexões prometidas | Score como crédito, frigorífico-first |
| **Santander (Aguiar)** | financeiro | Conversa exploratória, convergente | Idem BB |
| **Bradesco** | financeiro | Reunião 08/06 | Crédito agro, dados |
| **SALIC (Eder Brambilla)** | fundo soberano | Pitch deck enviado, pendente retorno | Minerva/MBRF/JBS — frigorífico |
| **Harvard Angels (Bernhard Kiep)** | angel network | Filtro passou | Must have / need to have |
| **JBS (Alexandre Alves, CFO Miami)** | frigorífico | Diálogo qualificado | Cadeia integrada |
| **GPB Furlan** | grupo pecuário | Em desenvolvimento | Adoção produtor |
| **Mentoria IZ-SP (Renata + Franzon)** | científico | Mentoria ativa quinzenal | Score, metodologia, +Precoce |

## Processo

### 1. Identificação do stakeholder

Quem é? Que tipo? Qual o histórico de interações? (Lê `memory/network_*.md`)

### 2. Mapeamento do que sabemos

| Categoria | Info |
|---|---|
| Posição | Cargo, instituição |
| Histórico Agraas | Última interação, decisões tomadas |
| Stack mental | O que essa pessoa valoriza/teme |
| Conexões mútuas | Quem do nosso lado já tocou nesse contato |
| Materiais já compartilhados | Pitch deck v?, doc institucional?, prints? |

### 3. O que TEMOS pra mostrar (lista factual)

Roda queries reais no banco para mostrar dados frescos:
- Quantidade real de animais com score v3
- Range de scores observado
- Animais elegíveis para X (EUDR, Halal, etc.)
- 3 telas-demo críveis: passaporte do animal, /scores ranking, /fiscal

### 4. GAPS de credibilidade

Pergunta seca: o que **pode falhar** durante a demo?
- Tela em branco?
- Dado zerado em local crítico?
- Texto inadequado para audiência?
- Claim que não temos como sustentar se questionado?

Roda audit técnico via subagents `agraas-fiscal-auditor`, `agraas-rastreabilidade-auditor`, `agraas-estoque-auditor` antes de cada pitch.

### 5. Perguntas prováveis

Lista 5-10 perguntas que esse stakeholder muito provavelmente vai fazer.

Para banco: "Qual o ticket?", "Como vocês escalonam custo de aquisição?", "Quem é meu interlocutor para crédito rural se isso virar produto?"
Para fundo: "Captação alvo?", "Valuation?", "Burn?"
Para frigorífico: "Como integro com meu ERP atual?", "API pública?", "SLA?"
Para mentor: "Pesos finais entre pilares?", "Customização por raça?"

### 6. Roteiro de demo (5-15 min)

Sequência exata: o que mostrar, em que ordem, em que tela.

### 7. Pós-reunião

`pitch-readiness` automaticamente sugere `intake-call` 12h após reunião para capturar transcrição/notas.

## Formato de saída

```markdown
# Pitch Readiness — [Stakeholder] · [Data]

## Quem é
[2 linhas]

## Histórico
[última interação, próximos passos acordados]

## O que vamos mostrar — dados reais hoje
- N animais com score v3 (range X-Y)
- N animais elegíveis para EU/EUDR
- 3 telas demo: ...

## Gaps identificados
- [gap 1] → ação: [fix antes da reunião / aceitar como conhecido]

## Perguntas prováveis + respostas preparadas
1. "..." → [resposta]
2. "..." → [resposta]

## Roteiro de demo
1. /painel (2 min) — abrir com card v3 Embrapa
2. /animais/[id] (5 min) — passaporte
3. ...

## Próximo passo
- [ ] Após a reunião, rodar /intake com transcrição
```
