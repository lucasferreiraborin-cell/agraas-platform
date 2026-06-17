---
name: competitive-radar
description: Monitora concorrentes silenciosamente — JetBov, iRancho, Boi de Confiança, Ecotrace, MF Rural, Conexa Rural, Datacarne, Broto, E-Rancho. Registra features novas, captação, parcerias, posicionamento. NUNCA confronta nominalmente em copy pública (regra interna). Trigger keywords: "JetBov", "iRancho", "concorrência", "agtech BR".
---

# Competitive Radar

Skill silenciosa de inteligência competitiva.

## Princípio fundamental

**Silêncio competitivo.** Internamente acompanhamos tudo. Externamente nunca confrontamos por nome. Esta regra é inegociável e está em `memory/feedback_competitive_tone.md`.

## Cadência

- **Mensal** (consolidado em relatório)
- **Sob demanda** antes de pitch crítico (Bradesco, BB, fundos, harvard angels)
- **Alerta** se concorrente lança feature que toca diretamente nossa tese (rastreabilidade individual + score auditável)

## Concorrentes monitorados

### Tier A — toca core Agraas (rastreabilidade individual + gestão)

| Empresa | URL | Posicionamento | Captação conhecida |
|---|---|---|---|
| **JetBov** | jetbov.com | Gestão pecuária mobile-first | Não público |
| **iRancho** | irancho.com.br | Gestão pecuária, ERP | R$ 7.2M BB Ventures 2023 |
| **Boi de Confiança** | (verificar) | Rastreabilidade premium SP | Não público |
| **Ecotrace** | ecotrace.info | Rastreabilidade EUDR via lote/talhão | Não público |
| **Datacarne** | (verificar) | Rastreabilidade frigorífico | Não público |

### Tier B — adjacente

| Empresa | URL | Posicionamento |
|---|---|---|
| **MF Rural** | mfrural.com.br | Marketplace agro (Mercado Livre do agro) |
| **Conexa Rural** | (verificar) | Gestão integrada |
| **Cogtive** | (verificar) | Financeiro + indicadores agro |
| **AgroSmart** | agrosmart.com.br | IoT + monitoramento climático |
| **Solineu** | (verificar) | Frigorífico SaaS |

### Tier C — programas oficiais / públicos

| Programa | Mantenedor | Toca Agraas |
|---|---|---|
| **SISBOV** | MAPA | Sim — rastreabilidade voluntária |
| **E-Rancho** | (citado pelo Mourão) | Sim — aparente concorrente |
| **Broto (BB)** | Banco do Brasil | Sim — fintech agro |
| **Plataforma +Precoce** | Embrapa | Não competitivo — vetor de validação |

## Processo de varredura

### 1. Site institucional do concorrente
WebFetch da home + página de produto. Comparar com snapshot anterior (se houver). Identificar:
- Mudanças de copy / posicionamento
- Features novas anunciadas
- Logos de clientes adicionados
- Pricing exposto
- Vagas de RH (sinal de prioridade)

### 2. LinkedIn corporativo
WebFetch da página LinkedIn. Sinais:
- Headcount mudou?
- Posts recentes anunciam parceria, prêmio, evento?
- Liderança mudou?

### 3. Imprensa setorial
WebSearch: "[concorrente] capta", "[concorrente] parceria", "[concorrente] lança"
Filtrar últimos 90 dias.

### 4. Comparativo matriz (atualizar mensalmente)

Manter `memory/competitive_matrix.md` com matriz:

| Capacidade | Agraas | JetBov | iRancho | Ecotrace | MF Rural |
|---|---|---|---|---|---|
| Passaporte individual | ✓ | — | — | Parcial | — |
| Score multidimensional | ✓ | — | — | — | — |
| Fiscal integrado | ✓ | — | — | — | — |
| Rastreabilidade EUDR | ✓ | — | — | — | Parcial |
| Marketplace qualificado | ✓ | — | — | — | — |

Esta é exatamente a matriz do **slide 10 do Pitch Deck**. Skill mantém-a viva.

### 5. Aplicação

| Achado | Ação |
|---|---|
| Concorrente lança feature que toca core | Registrar + decidir se Agraas precisa acelerar resposta |
| Concorrente capta rodada grande | Atualizar análise de "TAM/SAM/SOM disputado" |
| Concorrente fecha parceria com frigorífico | ALERTA — toca diretamente tese frigorífico-first |
| Concorrente publica case de cliente | Notar tese de posicionamento |

## Formato de saída

```markdown
# Competitive Radar — AAAA-MM

## Mudanças relevantes (N)
### JetBov
[...]

### iRancho
[...]

## Matriz atualizada
[link para memory/competitive_matrix.md]

## Alertas
- [se houver]

## Salvei em
- memory/competitive_pulse_AAAA-MM.md
- memory/competitive_matrix.md (atualizado)
```

## O que NUNCA fazer

- ❌ Citar concorrente por nome em copy pública (site, deck final, marketing)
- ❌ Mandar e-mail / DM provocando concorrente
- ❌ Usar materiais com copyright sem autorização (screenshots de site, imagens)
- ❌ Sabotar / engano competitivo

## O que sempre fazer

- ✅ Acompanhar produto deles silenciosamente
- ✅ Aprender com erros/acertos visíveis
- ✅ Posicionar Agraas por atributo próprio, não por comparação direta
- ✅ Atualizar slide 10 do deck quando matriz mudar
