---
name: decision-journal
description: Registra decisão estratégica importante com premissas, alternativas consideradas e critério de revisão. Permite revisitar 6 meses depois e avaliar se foi acerto/erro estrutural ou de execução. Trigger keywords: "registra essa decisão", "decisão estratégica", "/decision".
---

# Decision Journal

Skill que transforma decisão importante em registro auditável pelo Lucas-do-futuro.

## Por que importa

Founders sofrem **hindsight bias**: 6 meses depois lembram "claro que era a opção certa" mesmo quando estava no ar. Registro estruturado força clareza ANTES da decisão e permite **revisão honesta** depois.

## Quando invocar

- Lucas escreve "registra essa decisão"
- Final de `desabafo` quando ele decide algo
- Decisão estratégica de produto, captação, parceria, hire/fire

## Estrutura obrigatória

### 1. Decisão (1 frase clara)
"Vou fazer X." Não "estou pensando em X" — registro só se decisão tomada.

### 2. Data
DD/MM/AAAA quando decidiu.

### 3. Contexto (3 linhas)
O que estava acontecendo que levou à decisão? Qual janela de oportunidade ou pressão existia?

### 4. Premissas-chave
Listar **3-5 coisas que você está assumindo verdade**.

Exemplos:
- "Estou assumindo que JBS vai precisar de tecnologia de rastreabilidade externa nos próximos 18 meses"
- "Estou assumindo que pesos do Score Engine v3 (36/25/29/10) são razoáveis o suficiente para validação científica posterior"

Se UMA dessas premissas for falsa, a decisão pode ter sido errada.

### 5. Alternativas consideradas
Listar 2-3 outras opções que estavam na mesa, com 1 linha de por que NÃO foram escolhidas.

### 6. O que vai te dizer se foi a decisão certa?
**Critério de avaliação pré-definido.** Não pode ser "vou ver no feeling".

Exemplo: "Em 90 dias vou saber que foi acerto se [métrica X], e que foi erro se [métrica Y]."

### 7. Quando revisitar?
Data exata em que vai abrir esse registro e julgar honestamente.

## Formato de saída

Salvo em `memory/decisions/AAAA-MM-DD-titulo-curto.md`:

```markdown
---
name: decision-AAAA-MM-DD-titulo
description: [1 linha sobre a decisão]
metadata:
  type: decision
  data_decisao: AAAA-MM-DD
  data_revisao: AAAA-MM-DD (90/180 dias)
  status: ativa | revisada | revertida
---

# Decisão — [título]

## A decisão
[1 frase: "Vou fazer X."]

## Contexto (3 linhas)
[...]

## Premissas-chave
1. [premissa 1]
2. [premissa 2]
3. [premissa 3]

## Alternativas consideradas
- **[opção B]** — não escolhida porque [...]
- **[opção C]** — não escolhida porque [...]

## Critério de avaliação
- **Acerto**: [métrica/sinal observável em data X]
- **Erro**: [métrica/sinal observável em data X]

## Revisitar em
DD/MM/AAAA — quando esta data chegar, abrir este arquivo e julgar.

## Histórico de revisão (preencher depois)
- AAAA-MM-DD: [revisão honesta — foi acerto? erro? revertido?]
```

## Atualizar `memory/MEMORY.md`

Toda decisão registrada vai pro índice:
```
- [Decisão DD/MM: título](decisions/AAAA-MM-DD-titulo.md) — [1 linha]
```

## Casos específicos de decisão para Agraas

- **Score Engine**: pesos finais, ativação de pilar reprodutivo, customização por raça
- **Produto**: refator de UI, módulo novo, deprecation
- **Pricing**: SaaS por animal vs fazenda, take rate marketplace
- **Hire**: contratação de sênior, ramp-up de equipe
- **Captação**: rodada, valuation, lead investor
- **Posicionamento**: ICP shift, narrativa nova

## O que NUNDA fazer

- ❌ Registrar decisão que ainda está em discussão (vira ruído)
- ❌ Reescrever histórico ("não, eu decidi X mesmo") quando arquivo já existe
- ❌ Pular o critério de avaliação ("vou ver depois") — esse é o ponto da skill
