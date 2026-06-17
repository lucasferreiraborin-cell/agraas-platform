---
name: mapa-pnib-monitor
description: Monitora MAPA, PNIB, SISBOV, GTA digital, instruções normativas, portarias de identificação bovina. Detecta mudanças regulatórias que afetam compliance da Agraas. Trigger keywords: "MAPA", "PNIB", "SISBOV", "GTA", "IN", "Portaria SDA", "Defesa Sanitária".
---

# MAPA / PNIB Monitor

Skill regulatória — acompanha o cronograma oficial brasileiro de identificação e rastreabilidade.

## Cadência

- **Semanal** (toda segunda via `daily-briefing`)
- **Sob demanda** quando MAPA publica IN nova
- **Alerta automático** se houver mudança de data oficial em qualquer fase do PNIB

## Fontes monitoradas

| Fonte | URL | Conteúdo |
|---|---|---|
| Diário Oficial da União | `https://www.in.gov.br/` | Publicação oficial de INs e Portarias |
| MAPA Defesa Agropecuária | `https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios` | Decisões oficiais sobre identificação animal |
| ABIEC | `https://www.abiec.com.br/` | Newsletters setoriais sobre regulação |
| Confederação Nacional da Agricultura | `https://www.cnabrasil.org.br/` | Posicionamento sobre regulação |

## Marcos regulatórios em radar

| Marco | Status atual conhecido | Próxima ação |
|---|---|---|
| **PNIB Portaria SDA/MAPA nº 1.331/2025** | Cronograma oficial publicado | Confirmar Fase 1 (2027) e Fase 2 (2030) sem alteração |
| **PNIB Fase 1** | 2027 — manejos sanitários | Monitorar IN complementar com requisitos técnicos |
| **PNIB Fase 2** | 2030 — ampliação total do rebanho | Monitorar comunicações |
| **EUDR (Reg UE 2023/1115)** | Adiado por Reg UE 2025/2650 | Confirmar nova data limite, especialmente para gado bovino |
| **2033 — Movimentação não identificada** | Proibição declarada | Confirmar fonte regulatória |
| **GTA Digital** | Estados implementando gradualmente | Monitorar GO, SP, MT, MS — pilotos atuais |
| **SISBOV** | Voluntário | Confirmar adesão atual (era 1.277 fazendas em 04/2026) |

## Processo

### 1. Varredura semanal
WebSearch + WebFetch nas fontes oficiais com termos-chave:
- "Programa Nacional de Identificação Bovina"
- "Instrução Normativa MAPA bovinos"
- "Portaria SDA/MAPA"
- "GTA eletrônica"
- "rastreabilidade bovina obrigatória"

### 2. Filtro de relevância
Qualquer mudança em:
- Cronograma do PNIB
- Tipo de identificação aceita (ISO 076, alternativas)
- Setor obrigado (grandes/médios/pequenos)
- Penalidade por descumprimento

### 3. Aplicação imediata

| Achado | Ação direta no produto |
|---|---|
| Mudança em data de fase | Atualizar **deck slide 3 (Oportunidade)** + `docs/pitch-deck-respostas-*.md` |
| Mudança em requisito técnico | Atualizar modelo de dados (campo `pnib_registration_id` em `animals` se ainda não existir) |
| Penalidade nova | Atualizar copy do site sobre risco de não-compliance |

### 4. Atualização de memory

Toda mudança regulatória relevante → atualizar `memory/project_regulatorio_br.md` (criar se não existir) com data + fonte + impacto.

## Formato de saída padrão

```markdown
# MAPA/PNIB Monitor — Semana AAAA-MM-DD

## Mudanças encontradas (N)

### 1. [IN/Portaria nº X de DD/MM/AAAA]
**Fonte**: [DOU seção X]
**O que muda**: [...]
**Impacto Agraas**: [...]
**Ação**: [...]

## Sem mudanças
"Varredura realizada DD/MM. PNIB Fase 1 confirmada para 2027. EUDR confirmado para dez/2026 grandes/médios."
```

## Alarmes prioridade máxima

- PNIB **antecipado** ou **postergado** > 6 meses
- EUDR voltando atrás (revogação)
- GTA Digital virando obrigatório em algum estado
- Mudança em órgão competente (transferência MAPA → outros)

Esses alarmes → notificação imediata ao Lucas + skill `pitch-readiness` é re-executada porque deck pode estar com data errada.
