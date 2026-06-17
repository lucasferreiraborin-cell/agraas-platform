---
name: intake-video
description: Processa transcrição de vídeo (YouTube, podcast, palestra, webinar) com filtro Agraas. Funciona com transcript bruto ou link. Trigger keywords: "vídeo", "YouTube", "podcast", "palestra", "webinar", arquivos em inputs/ com prefixo "video-".
---

# Intake — Vídeo / Podcast / Webinar

## Quando invocar

- Lucas assistiu palestra/podcast, joga transcrição em `inputs/video-*.md`
- Lucas cola link YouTube; eu uso WebFetch da página + transcript
- Skill `embrapa-monitor` ou `cenario-agro-br` encontra vídeo institucional relevante

## Processo

### 1. Identificação
- Quem fala? (pesquisador, executivo, produtor, jornalista)
- Tema central
- Duração (filtra: < 5 min = quick note; > 30 min = sessão de extração estruturada)

### 2. Captura de "frases-ouro"
Vídeos costumam ter 2-5 frases muito boas para citar. Listar:
> "citação exata"
> — Pessoa, contexto

### 3. Aplicação do filtro Agraas (mesmo do intake-news)
1. Tema toca PNIB / EUDR / SISBOV / mercados externos / concorrência?
2. Argumento confirma ou contradiz tese Agraas (Rastreio + Gestão Eficiente)?
3. Vira pauta de mentoria, pitch deck, ou ação de produto?

### 4. Destinos
- Frase-ouro citável → `docs/citacoes.md`
- Mudança estratégica → atualizar `CLAUDE.md` ou criar memory
- Insight de produto → TODO no código
- Nada relevante → registra "assistido em DD/MM"

## Formato de saída

```markdown
## Vídeo processado — [título]

**Quem fala**: [pessoa, instituição]
**Canal/origem**: [YouTube, podcast X]
**URL**: [...]

### Tese central (3 linhas)
[...]

### Citações-ouro
> "[frase exata]"
> — [Pessoa, timestamp]

### Aplicabilidade Agraas
- [memory? doc? CLAUDE.md? pauta?]

### Salvei em
- [...]
```

## Casos específicos

### Palestra de mentor (Renata, Franzon, Iafelice, Marchió)
Tratamento de **alta prioridade**. Vai para `memory/feedback_*.md` específico do mentor + `docs/sintese-mentoria-*.md`.

### Podcast de concorrente
Mesma regra do `competitive-radar`: silencioso, registrar em memory, nunca confrontar publicamente.

### Webinar institucional (Embrapa, MAPA, ABIEC)
Tratamento de **alta prioridade institucional**. Frase-ouro pode virar citação em deck/relatório.
