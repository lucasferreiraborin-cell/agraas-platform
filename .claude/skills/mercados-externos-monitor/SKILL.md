---
name: mercados-externos-monitor
description: Monitora requisitos sanitários, fitossanitários e regulatórios de mercados externos para carne bovina brasileira — UE (EUDR), China, MENA (Halal real), EUA (Hilton Quota / Cota 481), México, Ásia-Pacífico. Detecta mudanças que afetam compliance pré-embarque. Trigger keywords: "EUDR", "Hilton", "China carne", "Halal", "exportação bovina", "requisitos sanitários".
---

# Mercados Externos — Monitor

Skill estratégica que mapeia o que cada país importador exige da carne bovina brasileira. Insight do mentor Renata Branco Arnandes: **bezerro pode ser destinado a país-alvo desde o nascimento, com protocolo sanitário/manejo específico**. Esta skill alimenta esse roadmap.

## Cadência

- **Mensal** consolidado em relatório
- **Sob demanda** quando Lucas vai apresentar à conta institucional (banco, frigorífico, fundo soberano)
- **Alarme automático** quando muda exigência crítica de qualquer mercado-alvo

## Mercados-alvo monitorados

### 1. União Europeia (UE) — Tier A

| Requisito | Status |
|---|---|
| Regulamento UE 2023/1115 (EUDR) | Em vigor com adiamento via 2025/2650 |
| Rastreabilidade georreferenciada | Obrigatória |
| 7 commodities cobertas | gado bovino, soja, óleo palma, madeira, café, cacau, borracha |
| Documentos exigidos | Due Diligence Statement (DDS) por embarque |
| Sistema de informação UE | TRACES NT |

**Fontes**: EUR-Lex (regulamento), DG SANTE, ABIEC, MAPA

### 2. China — Tier A

| Requisito | Status |
|---|---|
| Acordo sanitário Brasil-China | Vigente |
| Habilitação SIF específica | Cada frigorífico individualmente |
| Embargos esporádicos | Risco recorrente (BSE atípica em 2023, gestão por crises) |
| Volume | 48,2% da exportação BR — maior comprador |

**Fontes**: Secretaria de Comércio Exterior (SECEX), Embaixada da China, Reports ABIEC

### 3. MENA / Mercados Halal — Tier B (longo prazo Agraas)

| Requisito | Status |
|---|---|
| Certificação Halal por entidade reconhecida | CDIAL, Halal Brasil, etc. |
| Abate ritualístico Halal | Frigorífico habilitado |
| Tratamento sanitário | EMI específica (Hoja, etc.) |

**Importante**: Agraas hoje NÃO claim Halal para FSJBE (guard rail). Mas para outros clientes futuros, é mercado real.

**Fontes**: ABCC, SBL (Sistema Brasileiro de Certificação Halal), Embaixadas dos países

### 4. EUA — Tier B

| Requisito | Status |
|---|---|
| Hilton Quota | Cota EU específica para corte Premium |
| Cota 481 | Cota EU adicional para corte de qualidade |
| Tratamento sanitário | EUA aceita carne in natura em 2024+ |

**Fontes**: USDA-APHIS, USTR

### 5. México, Coreia, Japão — Tier C

Monitorar mas sem detalhamento profundo até virar foco.

## Processo de varredura

### 1. Per país, checar mensalmente
- Mudança em regulamentação sanitária
- Embargo novo, embargo levantado
- Quota anual divulgada
- Acordo bilateral em discussão

### 2. Aplicação direta no produto Agraas

Insight Renata: **target_market por animal desde nascimento**. Skill deve manter atualizada a tabela de requisitos por mercado.

Implementação técnica sugerida (proposta para v3.1):

```sql
CREATE TABLE target_market_requirements (
  market_code text PRIMARY KEY,    -- 'eu_eudr', 'china', 'mena_halal', 'usa_hilton', etc.
  market_name_pt text NOT NULL,
  required_certifications text[],   -- ['BR-RAS', 'SIF', 'BV', ...]
  required_vaccines text[],         -- vacinas obrigatórias
  prohibited_treatments text[],     -- antimicrobianos proibidos, hormônios
  carencia_minima_dias integer,     -- carência mínima pré-embarque
  georef_required boolean,           -- EUDR exige
  halal_required boolean,            -- MENA exige
  age_window_months int4range,       -- janela de idade aceita
  weight_window_kg numrange,         -- janela de peso ao abate
  source_doc text,                   -- URL do documento oficial
  last_verified date,                -- quando esta skill confirmou
  updated_at timestamptz DEFAULT now()
);
```

Score Agraas então pode validar **eligibilidade por mercado**: "AG003 é elegível para EU/EUDR? Sim/não — motivo".

### 3. Saída padrão

```markdown
# Mercados Externos — AAAA-MM

## UE / EUDR
[mudanças, status, alertas]

## China
[mudanças, status, alertas]

## MENA (Halal)
[mudanças, status, alertas]

## EUA (Hilton / Cota 481)
[mudanças, status, alertas]

## Tabela de elegibilidade — animais Agraas
[após inserir target_market_requirements:]
- N animais elegíveis para EU/EUDR
- N animais elegíveis para China
- ...
```

## Alarmes prioridade máxima

- Embargo novo contra carne bovina brasileira (qualquer país)
- Mudança em EUDR (data, scope, cobertura)
- Quota Hilton anual divulgada com mudança > 10%
- Habilitação SIF nova ou suspensão

Esses alarmes → notificação imediata + atualizar `CLAUDE.md` "frentes quentes".
