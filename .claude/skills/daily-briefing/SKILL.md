---
name: daily-briefing
description: Briefing matinal (5-7h da manhã ou sob demanda) com 3-5 itens da semana que mexem com Agraas. Consolida embrapa-monitor + mapa-pnib-monitor + setor-agro + competitive-radar. Trigger keywords: "/briefing", "resumo do dia", "o que rolou".
---

# Daily Briefing

Skill matinal — entrega 3-5 itens curados, sem ruído.

## Cadência

- **Idealmente diário** às 8h (via skill `schedule` quando agendado)
- **Sob demanda** via `/briefing`
- **Pre-reunião** quando há call importante no dia

## O que entra no briefing (filtros rigorosos)

Item só entra se cumprir **AMBAS** as condições:

1. **Relevância**: toca uma das 6 frentes Agraas:
   - Regulatório BR (PNIB, EUDR, MAPA)
   - Mercados externos (EU, China, MENA, EUA)
   - Concorrentes diretos (Tier A)
   - Mentoria científica (Embrapa, IZ-SP)
   - Stakeholders ativos (BB, Bradesco, JBS, SALIC, Harvard Angels)
   - Cotação @ ou dólar com variação > 5% em 7 dias

2. **Acionável**: gera ao menos um de:
   - Atualização em deck/doc
   - Pauta de call
   - Ajuste em código/produto
   - Memo importante para registrar

Se passar nas duas → entra. Se não → fica fora (mesmo se for "interessante").

## Composição típica

| Bloco | Conteúdo |
|---|---|
| **Top 3 da semana** | Items mais críticos, 1 frase cada |
| **Frente quente atual** | O que está mais ativo (call hoje? deadline?) |
| **Citação útil** | 1 frase de mentor/paper/post que vale pensar |
| **Pergunta do dia** | 1 pergunta sócrática para Lucas refletir |

## Formato de saída

```markdown
# Briefing — AAAA-MM-DD

## Top 3 da semana
1. **[título curto]** — [1 frase explicativa]. Ação: [...]
2. **[título]** — [...]. Ação: [...]
3. **[título]** — [...]. Ação: [...]

## Frente quente hoje
- [se houver reunião / deadline / decisão pendente, listar]

## Citação para o dia
> "frase"
> — fonte

## Pergunta sócrática
[1 pergunta crítica que vale 5 min de reflexão]
```

## Limites

- Máximo 5 itens. Se passou de 5, eu cortei mal o filtro.
- Cada item em 1 frase. Briefing não é relatório.
- Citação só se for realmente boa. Não preenche por preencher.
- Se semana foi vazia, eu digo: "Semana sem novidades relevantes. Use o tempo pra evoluir [X]."

## Por que existir

Lucas roda 100 frentes simultâneas. Sem briefing curado, ou perde sinal (não vê o que importa), ou afoga em ruído (lê de tudo, não age em nada). Briefing é a engrenagem que mantém o sinal alto e o ruído baixo.
