---
name: pauta
description: Abre a sessão de trabalho com o Lucas. Lê decisões pendentes, confere as datas-gate contra hoje, e entrega 3 a 5 itens com recomendação, alternativa e o que mudaria de ideia, mais as perguntas que mudam a próxima entrega. Aciona no início de toda sessão, ou quando o Lucas disser "pauta", "/pauta", "o que temos hoje", "por onde começo".
---

# Pauta — abertura de sessão

Skill que materializa a seção 9 da passagem de bastão de 05/09/2026. Não é
briefing de notícias (isso é `daily-briefing`) nem review de semana (`weekly-review`).
É a abertura da sessão de trabalho: o que está na mesa **hoje** e o que precisa dele.

## Por que existe

O Lucas está ocupado e trabalha com duas pistas em paralelo. Sem uma abertura
padronizada, cada sessão gasta os primeiros minutos reconstituindo estado — e a
proatividade acaba entrando no lugar da entrega, que é exatamente o que ele
recusou: *"isso entra depois de todas as tarefas que precisamos entregar"*.

## Regra de ouro

**Entregar primeiro, proatividade depois.** A pauta abre a sessão, mas a fila de
entregas vem antes de qualquer exploração nova. Insight e ideia entram no fim,
nunca no lugar do que estava combinado.

## Passos

### 1. Ler o estado
- **`docs/STATUS.md`** — a página viva. É o primeiro arquivo a abrir
- `docs/decisoes/pendentes.md` — decisões paradas e padrões assumidos
- `git log --oneline -10` e o resultado do último `npx jest`

### 2. Conferir as datas contra hoje
Calcular os dias restantes. Marcar 🔴 o que vence em ≤ 7 dias, 🟡 em ≤ 21.

| Data | O que é |
|---|---|
| 12/09/2026 | Dados da FSJBE (Ico + contador). Sem eles, B4 sai do ciclo |
| 25/09/2026 | Gate d30 do C1 — pacote vendável · 3 contadores treinados · 20 conversas iniciadas. Fim da Fase 1 |
| 30/09/2026 | DITR 2026 — relatório assistido para a FSJBE, o contador assina |
| 25/10/2026 | Gate d60 — ≥ 3 fazendas via contadores · ≥ 2 pagantes. Destrava o C2 e a conversa com investidores |
| 24/11/2026 | Gate d90 — 5 pagantes retidas · churn < 2/5 · onboarding ≤ 1 semana |

Ciclo do modelo do C3: **m1 = out/2026**.

### 3. Entregar a pauta
**Três a cinco itens**, ordenados por impacto. Cada um com:
- a **recomendação**
- a **alternativa** que foi descartada
- **o que faria você mudar de ideia**

Discordância vem marcada: `**Discordo:**` + motivo + o que mudaria sua posição.
Contradição entre documento e repositório vem marcada como **regra 7**.

### 4. Perguntar só o que muda a próxima entrega
No máximo **cinco**, ordenadas por impacto, no formato:

```
**Q1 — <o que exatamente>**
Por quê: <o que muda na entrega>
Padrão sem resposta: <o que você assume e segue>
Formato: <como ele responde em 10 segundos>
```

Resposta curta é resposta. Não repetir pergunta já respondida — seguir com o
padrão declarado.

### 5. Trabalhar a fila
Pista A (plataforma) antes da Pista B (estratégia e materiais). Dentro de cada
uma, a ordem acordada.

### 6. Atualizar `docs/STATUS.md` ANTES do commit
Não é opcional e não é no fim do dia — é a cada bloco de trabalho que muda o
estado. O Lucas precisa conseguir abrir essa página a qualquer momento e saber
onde estamos sem perguntar. Atualizar: data e commit do cabeçalho, semáforo,
contagem de dias das datas, o que entrou no ar, o que está em andamento, e os
achados abertos.

### 7. Fechar com relatório curto
- o que foi **feito**
- **contagens** (testes, arquivos, linhas, registros)
- **contradições** encontradas (regra 7)
- o que **depende dele**, como lista de 5 minutos

## O que NUNCA fazer nesta skill

- Abrir com elogio, resumo do que ele já sabe, ou pergunta retórica.
- Trazer exploração nova antes da fila de entregas.
- Repetir a lista inteira de decisões pendentes quando nenhuma mudou —
  citar só as que afetam a entrega do dia.
- Cobrar tom ou insistir em decisão parada.
- Assumir que documento novo revoga o repositório: **repositório e norma
  verificada vencem**, e a contradição é apontada.

## Precedência

1. Repositório e norma verificada
2. Passagem de bastão de 05/09/2026
3. Handoff técnico anterior
4. Documentos mais antigos

## Relacionado

`docs/decisoes/pendentes.md` · `CLAUDE.md` (seção "Como trabalhar comigo") ·
skills `daily-briefing`, `weekly-review`, `decision-journal`
