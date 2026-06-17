---
name: weekly-review
description: Toda sexta-feira (ou sob demanda), consolida a semana: o que foi feito, o que aprendemos, o que mudou de prioridade. Atualiza CLAUDE.md "frentes quentes" se mudou. Trigger keywords: "/weekly", "review da semana", "fechamento semanal".
---

# Weekly Review

Skill de fechamento semanal — toda sexta.

## Cadência

- **Sexta 17h** (sob demanda ou via `schedule`)
- **Antes de viagem / pausa longa**
- **Antes de mentoria IZ-SP quinzenal**

## Estrutura da review

### 1. Recap factual (5 min)

Leitura cruzada de:
- `git log` últimos 7 dias (commits)
- `inputs/*.md` processados na semana
- `memory/` atualizadas
- Calls com `intake-call` processado
- Pitches realizados (Bradesco, BB, etc.)

### 2. O que foi feito (lista factual)

| Categoria | Itens |
|---|---|
| Código | N commits, principais features/fixes |
| Documentação | docs criados/atualizados |
| Calls | quem encontrou, decisões |
| Materiais | decks, pitches enviados |

### 3. O que aprendemos (mais importante)

3-5 insights novos. Não recap — **insight novo** que muda algo daqui pra frente.

Critério: se a Agraas operasse os próximos 90 dias sem esse insight, alguma coisa importante daria errado.

### 4. O que mudou de prioridade

- Frente quente nova? (ex: SALIC ganhou peso após reunião Eder)
- Frente esfriou? (ex: marketplace público virou prioridade baixa após mentoria)
- ICP mudou? (ex: frigorífico-first ficou mais claro)

### 5. Atualização de `CLAUDE.md`

Se houve mudança real em "frentes quentes", atualizar arquivo. Se não, marcar "Frentes confirmadas, sem mudança".

### 6. Pré-próxima semana

- 1-3 decisões que precisam ser tomadas
- 1-3 ações de alta prioridade

## Formato de saída

```markdown
# Weekly Review — Semana DD-DD/MM/AAAA

## Recap factual
- N commits, M docs, P calls

## O que foi feito (3-5 bullets)
- [...]

## O que aprendemos
1. **[insight]** — implicação: [...]
2. **[insight]** — implicação: [...]

## Mudanças de prioridade
- [se houve, listar]

## CLAUDE.md
- [atualizado / sem mudança]

## Pré-próxima semana
- Decisões pendentes:
  1. [...]
- Ações de alta prioridade:
  1. [...]

## Sentimento da semana
[1 linha — energia, frustração, momentum — sinal para Lucas calibrar]
```

## O que NÃO fazer

- ❌ Falsa positividade (escrever "ótima semana" se foi difícil — Lucas precisa de leitura honesta)
- ❌ Recap longo — se passou de 1 página, eu fiz mal
- ❌ Esquecer de checar mentoria IZ-SP quinzenal (a próxima sessão é segunda?)
