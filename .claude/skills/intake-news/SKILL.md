---
name: intake-news
description: Processa notícia, newsletter, artigo de setor (agro/financeiro/regulatório). Detecta impacto sobre tese Agraas, frentes quentes, pitch deck e gera ações curtas. Trigger keywords: "notícia", "newsletter", "ABIEC", "Beef Report", "MAPA", "PNIB", arquivos em inputs/ com prefixo "news-".
---

# Intake — Notícia / Newsletter

Skill rápida (< 1 min) que filtra notícia setorial pelo crivo "isso muda algo na Agraas?".

## Quando invocar

- `/intake` detecta arquivo `inputs/news-*.md`
- Skill `cenario-agro-br` ou `competitive-radar` despeja notícia relevante
- Lucas cola link ou texto da notícia

## Filtro de relevância (10 perguntas binárias)

1. Toca **PNIB / SISBOV / identificação obrigatória**?
2. Toca **EUDR** ou **mercado UE**?
3. Toca **JBS, Marfrig, Minerva, MBRF** especificamente?
4. Toca **mercados externos** (China, EUA, MENA, Hilton, Cota 481)?
5. Toca **concorrente direto** (JetBov, iRancho, Boi de Confiança, Ecotrace, Conexa)?
6. Toca **crédito rural / financiamento agro** (BB, Sicredi, BNDES, Pronaf, Plano Safra)?
7. Toca **regulação sanitária** (febre aftosa, brucelose, aftosa-livre)?
8. Toca **Embrapa, IZ-SP, USP, ESALQ, MAPA**?
9. Toca **carbono, ESG, manejo regenerativo**?
10. Toca **cotação @, milho, soja, dólar** com magnitude ≥ 5%?

Se **0 SIM** → descarta, registra como lido. Se **≥1 SIM** → processa.

## Saída padrão (curta)

```markdown
## News — [manchete]

**Fonte**: [veículo]  **Data**: AAAA-MM-DD  **URL**: [...]

### Em 3 linhas
[ideia central]

### Por que importa para Agraas
- [impacto sobre tese / produto / pitch]

### Ação
- [ ] [memory? doc? mudança UI? pauta de call? nada — só ler]
```

## Casos especiais

### Notícia citável em pitch deck
Se vira citação útil em deck (ex: "Brasil bate recorde de export bovino — Abrafrigo/Secex"), adicionar como fonte em `docs/pitch-deck-respostas-*.md`.

### Notícia que muda "frentes quentes"
Se mostra que JBS lançou programa de bonificação por rastreabilidade, ou que Bradesco tem produto novo de crédito agro, atualizar `CLAUDE.md` seção "Frentes quentes".

### Notícia sobre concorrente
Registrar em `memory/competitive_pulse_AAAA-MM.md` (mensal). NÃO confrontar publicamente, só monitorar.
