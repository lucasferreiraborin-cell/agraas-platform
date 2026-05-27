# Score Engine — Changelog v3

> **Aplicado em produção:** 27 de maio de 2026 · Migration `123_score_engine_v3.sql`
> **Status:** ATIVO. Substitui as versões v0, v1 e v2 que coexistiam no banco até 26/05/2026.

---

## Ancoragem científica

Refatoração ancorada em **Embrapa Documento Técnico 237**:

> Costa, F. P.; Dias, F. R. T.; Gomes, R. C.; Pereira, M. A. *Indicadores de desempenho na pecuária de corte: uma revisão no contexto da Plataforma +Precoce.* Embrapa Gado de Corte · Documentos 237 · Brasília, DF, 2018.
> <https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090951>

A escolha dos 5 pilares e a hierarquia relativa de pesos seguem a frequência de citação dos indicadores nas publicações analisadas pela revisão Embrapa. Pesos finais exatos (decisão de equipe Agraas) ficam pendentes de validação científica na mentoria de 29/05/2026 com Dra. Renata Helena Branco Arnandes e Prof. César Franzon.

---

## Resumo de Mudanças entre v2 e v3

### Consolidação técnica (resolve débito crítico)

| Mudança | Justificativa |
|---|---|
| **Três funções legacy eliminadas** (`refresh_animal_score`, `recalculate_animal_score`, `calculate_agraas_score`) | Banco declarava `algorithm_version = 'v2'` mas triggers chamavam v1. Inconsistência grave resolvida. |
| **Função canônica única: `calculate_agraas_score_v3(uuid, text, uuid, text)`** | Uma única fonte de verdade. Aceita contexto do evento disparador (event_source, event_record_id, event_type) para auditoria. |
| **12 triggers + 11 funções órfãs** referenciando tabela legada `animal_events` (removida na migration 049) eliminadas | Limpeza técnica que estava pendente desde antes da v3. |
| **Triggers repointados de `weight_records` (legado) para `weights` (atual)** | Correção de débito histórico. Verificação automática na migration 123 confirma zero triggers em weight_records. |

### Novos artefatos de banco

| Objeto | Função |
|---|---|
| Tabela `score_audit_log` | Auditoria de mudanças materiais (delta_total ≥ 0.01). RLS por client_id + acesso mentor via mentor_assignments. |
| Tabela `farm_scores` | Score Nível 2 — agregado por propriedade. Sub-score `score_rebanho` ATIVO; pilares produtividade/reprodutivo/sanitário/compliance em PREPARADO. |
| Tabela `producer_scores` | Score Nível 3 — agregado por cliente. Sub-score `score_ativos` ATIVO; pilares relacionamento/financeiro/institucional em PREPARADO. |
| Função `get_animal_category(uuid)` | Categoriza animal em bezerro/recria/terminação/matriz/reprodutor/descarte/indefinido. |
| Função `calculate_farm_score(uuid)` | Cascata Nível 2 (chamada automática após animal_score). |
| Função `calculate_producer_score(uuid)` | Cascata Nível 3 (chamada automática após farm_score). |
| Função `trigger_recalculate_score_v3()` | Wrapper que extrai animal_id do trigger + chama função canônica com contexto. |

### Metodologia — 5 pilares com ancoragem Embrapa

| Pilar | Peso v3 inicial | Status | Comentário |
|---|---|---|---|
| **Produtivo** | 36% | ATIVO | GMD + Peso × Idade. Indicadores produtivos aparecem em 85-100% das publicações Embrapa Doc 237. |
| **Sanidade** | 25% | ATIVO | Histórico + carências + recência. Gradação logarítmica substitui binário. |
| **Reprodutivo** | — *(redistribuído)* | **PREPARADO** | Estrutura criada. Peso 15% redistribuído enquanto pilar inteiro inativo (40%→Produtivo, 60%→Rastreabilidade). |
| **Rastreabilidade** | 29% | ATIVO | RFID + genealogia + eventos + nascimento na propriedade. |
| **Certificações** | 10% | ATIVO | Boi Verde, Rastreabilidade BR, GAP, Programa de Raça, Hilton Quota. |

**Composição final v3 (Condição A — sem reprodutivo ativo):**

```
total = produtivo × 0.36 + sanidade × 0.25 + rastreabilidade × 0.29 + certificações × 0.10
```

### Correções de débitos metodológicos

| Débito identificado na v1/v2 | Resolução v3 |
|---|---|
| **Multicolinearidade**: aplicações sanitárias contavam em 2 pilares simultaneamente | Aplicações contam APENAS em Sanidade. Rastreabilidade usa variáveis distintas (RFID, eventos, genealogia, nascimento). |
| **Lógica binária**: 1 vacinação = 50 vacinações | Gradação logarítmica em aplicações (0/1-2/3-5/6-10/10+ → 30/50/70/85/100). Princípio dos retornos decrescentes. |
| **Animal vendido perdia 20 pontos** | Score CONGELA com `score_status = frozen_sold`/`frozen_slaughtered`. Embrapa: taxa de desfrute valoriza venda como métrica de eficiência. |
| **Certificações não entravam no score** | Pilar Certificações & Compliance com 10% do peso total. Boi Verde +25, Rastreabilidade BR +25, GAP +25, Programa de Raça +25, Hilton +30. |
| **Idade como bônus inflado** (v2) | Idade entra agora APENAS como contexto para definir gabarito de peso esperado por categoria. Não é mais bônus aditivo. |
| **Genealogia binária** | Gradação: 100 (ambos pais) / 50 (um só) / 0 (nenhum). |
| **Range saturado** (60-100 efetivo) | Range realista (25-72 observado nos 58 animais reais hoje). Variância útil real. |

### Auditabilidade

- Toda mudança material (|delta_total| ≥ 0.01) grava linha em `score_audit_log` com contexto completo: animal_id, client_id, property_id, event_source (tabela que disparou), event_type (INSERT/UPDATE/DELETE), event_record_id, score_previous, score_new, delta_total, algorithm_version.
- Deltas individuais por pilar (delta_produtivo, delta_sanidade, etc.) ficam preparados em colunas próprias — implementação refinada planejada para v3.1.
- RLS multi-tenant: cliente vê seu próprio histórico, mentor vê via mentor_assignments.

### Verificações automáticas da migration 123

A migration inclui DO blocks de verificação que reportam ao final:

```
✅ 58 animais recalculados em batch (Lucas + outros admins + Mentoria IZ-SP)
✅ Função canônica calculate_agraas_score_v3 estabelecida como única fonte de verdade
✅ Funções legacy (refresh_animal_score, recalculate_animal_score, calculate_agraas_score) inexistentes
✅ Nenhum trigger ativo em weight_records (legado)
✅ score_audit_log com 58 entries de migração registradas
✅ 6 farm_scores criados
✅ 4 producer_scores criados
```

---

## Status de indicadores

### ATIVO (operando com dados reais hoje)

- GMD (Ganho Médio Diário)
- Peso × Idade-categoria (gabarito Nelore)
- Histórico de aplicações sanitárias
- Carências sanitárias ativas
- Recência da última aplicação
- RFID (ISO 11784/11785)
- Genealogia (sire + dam)
- Continuidade documental (eventos estruturados)
- Registro de nascimento na propriedade
- Certificações ativas (Boi Verde, Rastreabilidade BR, GAP, Programa de Raça, Hilton)

### PREPARADO (estrutura criada, aguardando dados)

- **Pilar Reprodutivo integral** — IEP, taxa de prenhez individual, idade ao primeiro parto
- **Rendimento de carcaça** (subindicador 1.3 do pilar Produtivo)
- **Conformidade com PNIB** — `pnib_registration_id` ainda não modelado em `animals`
- **Sub-scores Nível 2** — `score_produtividade`, `score_reprodutivo`, `score_sanitario`, `score_compliance` da fazenda (placeholders NULL)
- **Sub-scores Nível 3** — `score_relacionamento`, `score_financeiro`, `score_institucional` do produtor (placeholders NULL)
- **Delta por pilar** em `score_audit_log` — colunas existem, implementação refinada em v3.1

### FUTURO (não modelado, aguardando decisão metodológica)

- CAR/RFI (Consumo Alimentar Residual / Residual Feed Intake)
- Carbono / CO2eq por cabeça (alinhamento NeuTroPec)
- Métricas de manejo regenerativo (rotação de pasto, lotação ajustada)
- Customização de gabarito de peso × idade por raça
- Normalização por peer group (categoria + região + raça)
- Histórico temporal do próprio score (derivada)
- Integração de predições IA (Claude Sonnet) ao score determinístico

---

## Roadmap pós-v3 (dependente da mentoria 29/05)

**v3.1** (curto prazo, após validação científica)
- Calibração de pesos finais com base no retorno dos mentores
- Implementação dos deltas por pilar em `score_audit_log`
- Customização inicial de gabarito de peso × idade por raça
- Eventos reprodutivos estruturados (ativando pilar Reprodutivo)

**v3.2** (médio prazo, 3-6 meses)
- Debouncing / throttling em farm_scores e producer_scores (quando rebanho passar de 10k animais)
- UI completa de histórico de score (consumir score_audit_log)
- Conformidade com PNIB (`pnib_registration_id`)
- Integração inicial CAR/RFI quando dados existirem

**v3.3+** (longo prazo, dependente de Plataforma +Precoce + NeuTroPec)
- CO2eq por cabeça (IPCC Tier 2 ou metodologia Embrapa)
- Métricas de manejo regenerativo auditáveis
- Score relativo a peer group
- Componente temporal (derivada do score)

---

## Decisões pendentes de validação científica

Marcadas explicitamente no código SQL como `DECISÃO DE EQUIPE AGRAAS PENDENTE`. Todas serão revisitadas na mentoria 29/05 com IZ-SP:

1. **Pesos finais entre pilares**: 36/25/29/10 vs alternativas zootecnicamente defensáveis
2. **Gabarito Nelore para todos os animais**: customização por raça é necessária? Existe gabarito brasileiro consolidado?
3. **Faixas de GMD** (0,3/0,5/0,8/1,2 kg/dia): alinhadas com literatura Embrapa?
4. **Pesos individuais de certificações** (Boi Verde 25, Rastreabilidade BR 25, etc.): justificáveis vs métricas oficiais?
5. **Tratamento de animal vendido como `frozen_sold`**: correto zootecnicamente, ou existe abordagem melhor?

---

> *Changelog v3 · 27 de maio de 2026 · Migration 123 aplicada em produção.*
> *Próxima revisão prevista: pós-mentoria 29/05/2026.*
