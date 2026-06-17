---
name: intake-expert
description: Registra contato/expert/abertura de network. Nome, área, status do relacionamento, valor potencial para Agraas. Trigger keywords: "conheci", "fui apresentado a", "indicação de", arquivos em inputs/ com prefixo "expert-".
---

# Intake — Expert / Network

Cadastro estruturado de pessoas que entram no radar Agraas.

## Campos obrigatórios

1. **Nome completo**
2. **Área de expertise** (1 frase)
3. **Como chegou** (LinkedIn, indicação de X, evento Y, mentoria Z)
4. **Nível de relacionamento atual**:
   - `primeiro_contato` — só fui apresentado, ainda não conversamos
   - `conversamos` — uma ou mais calls, sem compromisso
   - `mentor_informal` — ajuda recorrente sem vínculo escrito
   - `mentor_formal` — vínculo registrado (carta, contrato)
   - `conselheiro` — Conselho Consultivo formal
   - `parceiro` — parceria institucional ativa
5. **Valor potencial** (1-2 linhas: o que essa pessoa pode contribuir)
6. **Status atual** (última interação, próximos passos)

## Decisão de destino

Toda registrada vai para:
- `memory/network_<sobrenome>.md` (1 arquivo por pessoa)
- Adicionar ao índice `memory/MEMORY.md`

Se for **mentor formal** ou **conselheiro**: também atualizar `CLAUDE.md` seção "Frentes quentes" se for caminho crítico, e `.claude/skills/agraas-fsjbe-guard/SKILL.md` se afeta regras de citação pública.

## Aplicação de guard rails

- **Nunca imprimir nome em doc público** sem autorização explícita
- Quando virar mentor formal e tiver autorização escrita: documentar em `memory/network_*.md` quando e como autorizou citação pública

## Formato de saída

```markdown
## Expert registrado — [Nome]

### Quem é
[1 parágrafo: cargo, instituição, área]

### Valor potencial Agraas
- [bullet 1]

### Status atual
- Última interação: AAAA-MM-DD — [resumo]
- Próximo passo: [...]

### Salvei em
- memory/network_<sobrenome>.md (criado)
- MEMORY.md (índice atualizado)
```

## Pessoas no radar atual (referência)

Manter lista viva em `memory/MEMORY.md`. Hoje (conhecidos pela skill):

- **Dra. Renata Helena Branco Arnandes** — IZ-SP, CAR/RFI Nelore, mentora científica
- **Prof. César Franzon** — IZ-SP, mentor científico conjunto
- **Antonio Mourão (Mourão Filho)** — Banco do Brasil, conversa exploratória
- **Carlos Aguiar Neto** — Santander Agribusiness, conversa exploratória
- **Eder Brambilla** — SALIC (PIF/Minerva)
- **Bernhard L. Kiep** — Harvard Angels + Gávea Angels, agro specialist
- **Rodrigo Iafelice dos Santos** — ex-CEO Solinftec, mentor
- **William Marchió** — consultor veterinário, expert pecuária BR
- **Alexandre Alves** — CFO JBS Miami, diálogo qualificado
- **Eraldo de Paola** — conselheiro estratégico (co-founder Tivit)
