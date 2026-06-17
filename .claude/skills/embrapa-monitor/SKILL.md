---
name: embrapa-monitor
description: Monitora novas publicações Embrapa relevantes para Agraas — Plataforma +Precoce, NeuTroPec, Documentos Técnicos da Embrapa Gado de Corte, RFI/CAR, manejo regenerativo, estimativa CO2eq. Roda mensal via /briefing ou manualmente. Trigger keywords: "Embrapa", "+Precoce", "NeuTroPec", "novo paper Embrapa".
---

# Embrapa Monitor

Skill de pesquisa proativa sobre publicações Embrapa que afetam Score Engine ou tese Agraas.

## Cadência

- **Padrão**: mensal (todo dia 1º via skill `daily-briefing`)
- **Sob demanda**: Lucas pede "viu algo novo da Embrapa?"
- **Após mentoria**: quando Renata/Franzon mencionam paper específico, validar imediatamente

## Fontes monitoradas

| Fonte | URL base | Por quê |
|---|---|---|
| Infoteca Embrapa | `https://www.infoteca.cnptia.embrapa.br/infoteca/` | Repositório oficial — onde está o Doc 237 |
| Embrapa Gado de Corte | `https://www.embrapa.br/gado-de-corte` | Unidade-mãe da +Precoce |
| Embrapa Pantanal | `https://www.embrapa.br/pantanal` | Co-autora da +Precoce |
| Embrapa Pecuária Sudeste | `https://www.embrapa.br/pecuaria-sudeste` | Onde está Renata Helena Branco Arnandes |
| Revista Brasileira de Zootecnia | `https://www.sbz.org.br/revista` | Onde Score Engine eventualmente publicaria |
| Pesquisa Agropecuária Brasileira | `https://seer.sct.embrapa.br/index.php/pab` | Mesma faixa |

## Termos-chave de busca

- "Plataforma +Precoce"
- "indicadores de desempenho pecuária"
- "RFI", "consumo alimentar residual", "CAR"
- "neutralidade tropical"
- "manejo regenerativo bovino"
- "pecuária de baixo carbono"
- "score multidimensional", "índice qualidade rebanho"
- "rastreabilidade individual"
- "Nelore peso × idade"

## Processo

### 1. Busca
WebSearch + WebFetch nas fontes acima. Recente = últimos 90 dias.

### 2. Filtro
Toca um dos termos-chave? Se sim → vai para análise. Se não → descarta.

### 3. Análise
Chamar skill `intake-paper` para extração estruturada.

### 4. Decisão

| Achado | Ação |
|---|---|
| Doc Embrapa que contradiz peso atual no Score v3 | Alerta + TODO técnico + pauta de mentoria |
| Doc Embrapa que valida peso atual | Citação adicional no `docs/score-engine-relatorio-mentoria-*.md` |
| Doc sobre cadeia/cenário sem impacto técnico | News-style, vai para memory |
| Paper de Renata/Franzon novo | Tratamento prioritário, atualizar `memory/project_mentores_iz_sp.md` |

## Formato de saída (relatório mensal)

```markdown
# Embrapa Monitor — AAAA-MM

## Publicações relevantes encontradas (N)

### 1. [Autor, Ano. Título]
**URL**: [...]
**Por que importa**: [1 linha]
**Ação**: [aplicado / pauta mentoria / arquivado]

### 2. ...

## Nenhuma publicação relevante
Se zero achados, registrar como "varredura realizada, zero achados — próxima em AAAA-MM".
```

## Sinais de alarme

Se a Embrapa publicar:
- **Novo Documento Técnico sobre +Precoce** com revisão de pesos → ALERTA URGENTE para Lucas
- **Paper questionando metodologia da +Precoce** → ALERTA
- **Renata Branco Arnandes** como autora de qualquer paper novo → ALERTA (mentora ativa)

Esses alarmes interrompem a cadência mensal — viram notificação imediata.
