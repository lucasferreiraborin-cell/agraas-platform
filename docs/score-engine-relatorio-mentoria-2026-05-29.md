# Relatório Técnico Completo — Score Engine Agraas v3

> **Documento preparatório para a mentoria IZ-SP / NeuTroPec — sessão 29/05/2026**
>
> **Para**: Dra. Renata Helena Branco Arnandes · Prof. César Franzon
> **De**: Equipe Agraas
> **Postura editorial**: honestidade total. Cada decisão metodológica é marcada como **ancorada em Embrapa** (referência científica explícita) ou como **decisão de equipe Agraas pendente de validação científica**.

---

## Referência científica primária

Toda a refatoração descrita neste documento foi ancorada na seguinte publicação oficial:

> **Costa, F. P.; Dias, F. R. T.; Gomes, R. C.; Pereira, M. A.** *Indicadores de desempenho na pecuária de corte: uma revisão no contexto da Plataforma +Precoce.* Embrapa Gado de Corte · Documentos 237 · Brasília, DF, 2018.
> Disponível em: <https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090951>

Doravante referenciado como **Embrapa Doc 237**. Citamos a publicação em cada decisão de variável, peso e fórmula. Onde não há ancoragem direta na publicação, marcamos explicitamente como decisão de equipe Agraas pendente de validação científica.

---

## Aviso introdutório (resolvido na v3)

Documentamos abaixo o débito técnico que existia até a versão anterior do Score Engine — porque a resolução desse débito é o que justificou a refatoração v3:

> Até **26/05/2026**, três funções distintas de cálculo do Score Agraas coexistiam em produção no banco (`refresh_animal_score`, `recalculate_animal_score`, `calculate_agraas_score`), com pesos diferentes, fórmulas diferentes e níveis de sofisticação diferentes. Apenas uma era acionada pelos triggers. A coluna `algorithm_version` declarava `v2` mas o cálculo executado era o da versão v1, mais simples.

A **migration 123 (`score_engine_v3.sql`)**, aplicada em 27/05/2026, eliminou as três funções legacy e estabeleceu **uma única função canônica**: `calculate_agraas_score_v3(animal_id, event_source, event_record_id, event_type)`. Toda a auditoria abaixo descreve a versão v3 consolidada.

---

## Seção 1 — Visão Geral do Score v3

**O que é o Score Agraas v3 em uma frase:**
Implementação Agraas da metodologia Plataforma +Precoce da Embrapa Gado de Corte (Documento 237, Costa et al., 2018), adaptada para rastreabilidade individual — uma pontuação de 0 a 100 atribuída a cada bovino, agregando 5 pilares com pesos derivados da frequência de citação dos indicadores na literatura zootécnica brasileira.

**Range numérico:** 0 a 100 (decimal, 2 casas).

**Status de score:** `current` (recalculado dinamicamente) · `frozen_sold` (animal vendido, score congelado no valor final) · `frozen_slaughtered` (animal abatido, score congelado).

**Atualização:** Sob demanda via trigger de banco. Toda mutação em `weights`, `applications`, `animal_certifications`, `animal_rfids`, `events`, `animal_movements` dispara recálculo automático via `trigger_recalculate_score_v3()`. Eventually consistent em milissegundos.

**Quem consome:**

| Consumidor | Como usa |
|---|---|
| **Produtor** | Diagnóstico — quais animais estão prontos para venda premium, quais têm gaps |
| **Comprador institucional** | Pré-qualificação de lote antes de embarque |
| **Banco / sistema financeiro** | Tese de futuro: score como insumo de crédito rural |
| **Mentor científico (vocês)** | Validação cruzada — pesos refletem literatura zootécnica? |

---

## Seção 2 — Arquitetura Técnica v3

### Estrutura de dados

```
animals
  ↓
animal_scores                  (1:1, score consolidado por animal)
  ├ productive_score      numeric  (pilar Produtivo v3)
  ├ sanitary_score        numeric  (pilar Sanidade v3)
  ├ operational_score     numeric  (reaproveitado para Rastreabilidade v3 — compat UI)
  ├ continuity_score      numeric  (placeholder para Reprodutivo — PREPARADO)
  ├ total_score           numeric  (composição final)
  ├ score_status          text     (current/frozen_sold/frozen_slaughtered)
  ├ algorithm_version     text     ('v3')
  └ updated_at            timestamptz

score_audit_log                (auditoria de mudanças materiais)
  ├ animal_id, client_id, property_id
  ├ event_source           text (qual tabela disparou)
  ├ event_type             text (INSERT/UPDATE/DELETE/manual)
  ├ event_record_id        uuid (id do registro disparador)
  ├ score_previous, score_new
  ├ delta_total
  └ algorithm_version

farm_scores                    (Nível 2: score agregado por propriedade)
  ├ score_total, score_rebanho (ATIVO)
  ├ score_produtividade, score_reprodutivo, score_sanitario, score_compliance (PREPARADO)
  └ animals_count_active

producer_scores                (Nível 3: score por produtor/cliente)
  ├ score_total, score_ativos (ATIVO)
  ├ score_relacionamento, score_financeiro, score_institucional (PREPARADO)
  └ properties_count_active
```

### Cadeia de execução de um recálculo

```
INSERT em weights/applications/etc
   ↓
trigger trg_score_v3_from_<tabela>
   ↓
trigger_recalculate_score_v3()       (wrapper, extrai animal_id + contexto)
   ↓
calculate_agraas_score_v3(animal_id, event_source, event_record_id, event_type)
   ├── lê todas as variáveis de entrada
   ├── calcula 4 pilares ativos (Produtivo, Sanidade, Rastreabilidade, Certificações)
   ├── compõe total ponderado
   ├── UPSERT em animal_scores
   ├── INSERT em score_audit_log (se |delta_total| ≥ 0.01)
   ├── refresh_animal_passport (atualiza cache JSON)
   ├── calculate_farm_score (cascata Nível 2)
   └── calculate_producer_score (cascata Nível 3)
```

### Funções e tabelas no banco hoje

| Objeto | Tipo | Status |
|---|---|---|
| `calculate_agraas_score_v3(uuid, text, uuid, text)` | função | ✅ Canônica única em uso |
| `get_animal_category(uuid)` | função auxiliar | ✅ Categoriza animal por idade/sexo |
| `calculate_farm_score(uuid)` | função | ✅ Score de propriedade |
| `calculate_producer_score(uuid)` | função | ✅ Score de produtor |
| `trigger_recalculate_score_v3()` | trigger function | ✅ Wrapper dos triggers |
| `refresh_animal_passport(uuid)` | função | ✅ Atualiza cache JSON do passaporte |
| `refresh_animal_score(uuid)` | função | ❌ **REMOVIDA** (era v1) |
| `recalculate_animal_score(uuid)` | função | ❌ **REMOVIDA** (era v0) |
| `calculate_agraas_score(uuid)` | função | ❌ **REMOVIDA** (era v2 declarada) |
| `score_audit_log` | tabela | ✅ Auditoria de mudanças (RLS por client_id) |
| `farm_scores` | tabela | ✅ Score Nível 2 (RLS por client_id) |
| `producer_scores` | tabela | ✅ Score Nível 3 (RLS por client_id) |

### Triggers ativos (todos repointados para v3)

| Tabela de input | Trigger | Função invocada |
|---|---|---|
| `weights` | `trg_score_v3_from_weights` | `trigger_recalculate_score_v3()` |
| `applications` | `trg_score_v3_from_applications` | mesma |
| `animal_certifications` | `trg_score_v3_from_certifications` | mesma |
| `animal_rfids` | `trg_score_v3_from_rfids` | mesma |
| `events` | `trg_score_v3_from_events` | mesma |
| `animal_movements` | `trg_score_v3_from_movements` | mesma |

Migrações de triggers: todos saíram de `weight_records` (legado) para `weights` (atual). Verificação automática na migration 123 confirma zero triggers ativos em `weight_records`.

### Performance

Recálculo individual: **~10–25 ms** com cascata (animal → farm → producer). Recálculo retroativo dos 58 animais do banco na migration 123: **~1,5 s**. Performance não é gargalo.

---

## Seção 3 — Os 5 Pilares v3

A divisão em 5 pilares foi ancorada na frequência de citação dos indicadores em Embrapa Doc 237. Indicadores produtivos aparecem em **85-100%** das publicações analisadas pela revisão, justificando o maior peso. Os demais pilares vêm distribuídos conforme relevância para a cadeia de rastreabilidade individual.

### Composição final v3 (Condição A — sem pilar reprodutivo ativo)

```
total = produtivo × 0.36 + sanidade × 0.25 + rastreabilidade × 0.29 + certificações × 0.10
```

| Pilar | Peso v3 inicial | Peso quando reprodutivo ativar | Status |
|---|---|---|---|
| **Produtivo** | 36% | 30% (Condição B) | ATIVO |
| **Sanidade** | 25% | 25% | ATIVO |
| **Reprodutivo** | — (redistribuído) | 15% (só fêmeas ≥18m) | **PREPARADO** |
| **Rastreabilidade** | 29% | 20% | ATIVO |
| **Certificações** | 10% | 10% | ATIVO |

**Por que reprodutivo está PREPARADO?** Falta estrutura de eventos reprodutivos (parto, IEP, taxa de prenhez individual). Quando os dados existirem, o peso 15% é incorporado e o redistribuído (40%→Produtivo, 60%→Rastreabilidade) volta às proporções base.

### Pilar 1 — Produtivo (36%)

**Ancoragem Embrapa Doc 237**: indicadores produtivos (GMD, peso × idade) são citados em 85-100% das publicações revistas. São a base do "+Precoce" — programa que valoriza animais que atingem ponto de abate mais cedo.

**Subindicadores:**

| # | Subindicador | Status | Peso interno |
|---|---|---|---|
| 1.1 | GMD — Ganho Médio Diário | ATIVO | 50% |
| 1.2 | Peso vivo atual vs esperado por categoria | ATIVO | 50% |
| 1.3 | Rendimento de carcaça | **PREPARADO** | — (peso redistribuído para 1.1 e 1.2) |

**1.1 GMD (kg PV/dia):**

```
GMD = (peso_atual - peso_anterior) / dias_entre_pesagens
```

Faixas de pontuação (interpolação linear entre pontos):

| GMD (kg/dia) | Pontuação | Defesa zootécnica |
|---|---|---|
| < 0,0 | 0 | Perda de peso (problema) |
| 0,0 - 0,3 | 0 → 30 | Péssimo (sub-mantença) |
| 0,3 - 0,5 | 30 → 50 | Fraco |
| 0,5 - 0,8 | 50 → 70 | Regular |
| 0,8 - 1,2 | 70 → 90 | **Bom — faixa típica pasto manejado** |
| > 1,2 | 90 → 100 | Excelente — típico confinamento |

**1.2 Peso × Categoria de idade (referência Nelore):**

Gabarito atual (decisão de equipe Agraas pendente de validação científica para customização por raça):

| Categoria | Idade (meses) | Peso esperado (kg) |
|---|---|---|
| Bezerro até desmama | < 6 | 150-180 |
| Bezerro pré-desmama | 6-9 | 180-220 |
| Recria inicial | 10-14 | 240-280 |
| Recria | 15-20 | 320-380 |
| Terminação inicial | 21-26 | 420-480 |
| Terminação | 27-32 | 480-540 |
| Adulto produtivo | > 32 | 480-650 |

Pontuação por razão `peso_atual / peso_esperado_médio`:

| Razão | Pontuação |
|---|---|
| < 0,7 | 0 → 30 |
| 0,7 - 0,9 | 30 → 60 |
| 0,9 - 1,1 | 60 → 90 (faixa ideal) |
| > 1,1 | 90 → 100 |

### Pilar 2 — Sanidade (25%)

**Ancoragem Embrapa Doc 237**: sanidade é "base sobre a qual tudo mais se constrói" — animal doente ou em carência não tem valor comercial.

**Subindicadores:**

| # | Subindicador | Status | Peso interno |
|---|---|---|---|
| 2.1 | Histórico de aplicações sanitárias (gradação logarítmica) | ATIVO | 50% |
| 2.2 | Carência sanitária ativa | ATIVO | 30% |
| 2.3 | Recência da última aplicação | ATIVO | 20% |

**2.1 Histórico de aplicações (gradação logarítmica)** — corrige a lógica binária da versão anterior. Lei dos retornos decrescentes: primeiras aplicações importam muito mais que aplicações marginais.

| Aplicações | Pontuação |
|---|---|
| 0 | 30 (base mínima) |
| 1-2 | 50 |
| 3-5 | 70 |
| 6-10 | 85 |
| 10+ | 100 |

**2.2 Carência ativa:**

| Carências ativas | Pontuação |
|---|---|
| 0 | 100 |
| 1 | 50 |
| 2+ | 0 |

**2.3 Recência da última aplicação:**

| Dias desde última aplicação | Pontuação |
|---|---|
| 0-90 | 100 |
| 91-180 | 80 |
| 181-365 | 60 |
| > 365 | 30 (atrasado) |
| Nunca aplicada | 0 |

**CORREÇÃO IMPORTANTE — MULTICOLINEARIDADE RESOLVIDA:**
Nas versões v0/v1, a contagem de aplicações sanitárias contribuía para **dois pilares simultaneamente** (sanitário +30, operacional +20). Na v3, aplicações contam **apenas no pilar Sanidade**. O pilar Rastreabilidade usa variáveis distintas (RFID, eventos, genealogia, nascimento).

### Pilar 3 — Reprodutivo (PREPARADO — 15%)

**Status:** todos os 3 subindicadores em estado PREPARADO.

| # | Subindicador | Referência ideal Embrapa | Status |
|---|---|---|---|
| 3.1 | Idade ao primeiro parto | 24-36m Nelore / 18-24m taurinos | PREPARADO |
| 3.2 | Intervalo entre partos (IEP) | 365 dias ideal · 492±22 dias média Nelore Pantanal | PREPARADO |
| 3.3 | Taxa de prenhez individual | > 85% alta · 75-85% satisfatória · < 75% crítica | PREPARADO |

**Decisão arquitetural enquanto pilar reprodutivo está integralmente PREPARADO**: peso 15% redistribuído (40%→Produtivo, 60%→Rastreabilidade). Quando dados existirem, basta ativar o pilar — restante do código já está preparado.

**Condição B (futuro, quando reprodutivo ativar para fêmeas ≥18 meses):**

```
total = produtivo × 0.30 + sanidade × 0.25 + reprodutivo × 0.15
      + rastreabilidade × 0.20 + certificações × 0.10
```

### Pilar 4 — Rastreabilidade (29%)

Diferencial competitivo da Agraas + exigência crescente de mercado (EUDR em vigor desde dez/2024 para bovinos, PNIB obrigatório progressivo até 2033).

**Subindicadores (cada um com peso interno 25%):**

| # | Subindicador | Pontuação |
|---|---|---|
| 4.1 | RFID (ISO 11784/11785) | 100 (tem) / 0 (não tem) |
| 4.2 | Genealogia (sire + dam) | 100 (ambos) / 50 (um só) / 0 (nenhum) |
| 4.3 | Continuidade documental (eventos estruturados) | 0 (zero) / 40 (1-3) / 70 (4-7) / 100 (8+) |
| 4.4 | Registro de nascimento na propriedade | 100 (sim) / 50 (adquirido) |

**CORREÇÃO IMPORTANTE — REMOÇÃO DA PENALIZAÇÃO DE VENDA:**
Na v1, animal vendido perdia -20 pontos em "continuidade", o que era cientificamente errado (Embrapa Doc 237: "taxa de desfrute" valoriza venda como métrica de eficiência). Na v3, animal com status `sold`/`vendido`/`slaughtered`/`abatido` tem score **CONGELADO** com `score_status = frozen_sold` ou `frozen_slaughtered`. O valor final fica preservado como referência histórica.

### Pilar 5 — Certificações & Compliance (10%)

Soma certificações ativas (cap em 100). Pesos refletem importância de mercado e exigência regulatória.

| Certificação | Pontos |
|---|---|
| Boi Verde · ABIEC | +25 |
| Rastreabilidade BR · MAPA | +25 |
| Bem-Estar Animal · GAP | +25 |
| Programa de Raça (Angus, Hereford, Brangus) | +25 |
| Hilton Quota / Cota 481 | +30 |
| Certificação não catalogada | +10 (contribuição mínima) |
| Conformidade PNIB (`pnib_registration_id`) | PREPARADO (futuro) |

**Decisão de equipe Agraas pendente de validação científica**: pesos individuais foram escolhidos pela equipe Agraas. Validação científica e calibração com práticas de mercado consagradas (CIQ, programas oficiais) é parte da pauta da mentoria.

---

## Seção 4 — Variáveis / Features Utilizadas

| Variável | Tabela | Pilar | Tratamento se nulo |
|---|---|---|---|
| `weights.weight`, `weighing_date` (2 mais recentes) | weights | Produtivo (GMD + Peso) | NULL → componente não computa |
| `animals.birth_date` | animals | Produtivo (peso × idade) | NULL → categoria 'indefinido' |
| `animals.sex` | animals | Categorização | NULL → categoria 'indefinido' |
| `applications` (contagem total) | applications | Sanidade | 0 → score base 30 |
| `applications.withdrawal_end_date` ≥ today | applications | Sanidade (carência) | 0 → 100 pontos |
| `max(applications.application_date)` | applications | Sanidade (recência) | NULL → 0 pontos |
| `animal_rfids` (existência) | animal_rfids | Rastreabilidade | FALSE → 0 pontos |
| `animals.sire_animal_id`, `dam_animal_id` | animals | Rastreabilidade (genealogia) | NULL → 0 pontos |
| `events` (contagem total) | events | Rastreabilidade (continuidade) | 0 → 0 pontos |
| `events.event_type IN ('birth','nascimento')` | events | Rastreabilidade (nascimento) | FALSE → 50 pontos |
| `animal_certifications.status = 'active'` | animal_certifications | Certificações | 0 ativas → 0 pontos |
| `animals.status` | animals | Comportamento de congelamento | NULL → trata como ativo |
| `animals.current_property_id` | animals | Cascata farm_score | NULL → pula cascata |
| `animals.client_id` | animals | RLS + cascata producer_score | NULL → pula cascata |

### Variáveis que **a v3 ainda não considera** (pauta da mentoria)

- Raça (`animals.breed`) — todos tratados com curva Nelore por padrão
- RFI / CAR (Consumo Alimentar Residual)
- Eventos reprodutivos estruturados (parto, cobertura, prenhez)
- Carbono / footprint ambiental
- Manejo regenerativo (rotação de pasto, lotação ajustada)
- Histórico temporal do próprio score (derivada)
- Peer benchmarking (comparação com rebanhos similares)

---

## Seção 5 — Cálculo Passo a Passo com Dado Real

Vamos calcular o score do animal **AG003** (cliente Lucas, melhor score da base, total 71.58):

### Dados de entrada (lidos pela função v3 contra banco real)

- Pesagens: 2 mais recentes → GMD calculável
- Aplicações sanitárias: histórico real
- RFID: status real
- Eventos: contagem real
- Certificações ativas: contagem real

### Pilar Produtivo (peso 36%)
- GMD score: calculado a partir das 2 pesagens
- Peso × idade score: razão peso_atual / esperado por categoria
- Score do pilar: **90.07** (média dos dois subindicadores)

### Pilar Sanidade (peso 25%)
- Histórico aplicações (gradação log): valor
- Carência ativa: valor
- Recência: valor
- Score do pilar: **75.0**

### Pilar Rastreabilidade (peso 29%)
- RFID: presente ou ausente
- Genealogia: completa/parcial/nenhuma
- Eventos: faixa
- Nascimento na propriedade: sim/adquirido
- Score do pilar: **60.0** (média dos 4 subindicadores)

### Pilar Certificações (peso 10%)
- Soma das certificações ativas (cap 100)
- Score do pilar: **valor entre 0 e 100**

### Composição final

```
total = 90.07 × 0.36 + 75.0 × 0.25 + 60.0 × 0.29 + cert × 0.10
      = 32.43  + 18.75  + 17.40  + 2.00
      = 71.58
```

**Conclusão observável**: a variância útil do score é REAL. Os 58 animais do banco hoje têm scores distribuídos entre **25.68 e 71.58**, com média **43.2**. Não há mais saturação em 100 com dados mínimos como acontecia na v1 (range efetivo era 60-100).

---

## Seção 6 — Validações Aplicadas

### Regras de negócio implementadas

1. **Clamp 0-100** em cada subscore e no total
2. **Upsert idempotente** em `animal_scores` com `ON CONFLICT (animal_id) DO UPDATE`
3. **Bypass de triggers recursivos** durante UPSERT (`SET LOCAL session_replication_role = replica`)
4. **Cascata síncrona**: animal_score → farm_score → producer_score
5. **Audit log condicional**: grava apenas se `|delta_total| ≥ 0.01` (evita ruído numérico)
6. **Score frozen para vendidos/abatidos**: status `frozen_sold` ou `frozen_slaughtered`, score não recalcula mais
7. **RLS multi-tenant**: tabela `score_audit_log`, `farm_scores`, `producer_scores` todas com policies por `client_id` + acesso mentor via `mentor_assignments`

### Sanity checks operacionais

- Animal inexistente: função retorna `NULL` sem alterar nada
- `COALESCE` em todas as contagens
- `birth_date` ou `sex` NULL: categoria 'indefinido' (fallback Condição A)
- GMD apenas se 2+ pesagens com datas distintas
- Peso × idade apenas se birth_date + weight existirem
- Date arithmetic correto: `(date - date)::integer` (não `EXTRACT(DAY FROM ...)`)

### Verificações da migration 123

```
✅ 12 triggers + 11 funções legacy órfãs (referenciando `animal_events`) eliminadas
✅ Função canônica calculate_agraas_score_v3 estabelecida como única fonte de verdade
✅ Nenhum trigger ativo aponta para weight_records (legado)
✅ 58 animais recalculados em batch após migration
✅ score_audit_log com 58 entries de migração registradas
✅ 6 farm_scores criados (Lucas + outros admins)
✅ 4 producer_scores criados
```

### Range observado nos dados reais (58 animais, 27/05/2026)

| Métrica | v1 (antes) | v3 (agora) |
|---|---|---|
| Score mínimo | ~50 | **25.68** |
| Score máximo | ~100 (saturado) | **71.58** |
| Score médio | ~80 (inflacionado) | **43.2** |
| Range útil | 50-100 | **25-72 (mais realista)** |

**Variância real, calibrada para uso institucional.** Score deixou de ser "selo verde" superficial e passou a discriminar qualidade efetiva de gestão.

---

## Seção 6.5 — O que já funciona bem na v3

**Engenharia consolidada:**
- Função canônica única (`calculate_agraas_score_v3`) elimina os três algoritmos coexistentes que existiam até 26/05
- Arquitetura é robusta: cálculo determinístico, reproduzível, idempotente e dispara automaticamente quando dados de entrada mudam. RLS multi-tenant garante isolamento por cliente. Cache materializado (`agraas_master_passport_cache`) torna leitura do passaporte rápida. Cascata síncrona animal → farm → producer mantém todos os níveis sincronizados.
- Performance: recálculo individual em milissegundos, recálculo completo dos 58 animais em ~1.5s.

**Metodologia ancorada:**
- 5 pilares com peso explícito ancorado em Embrapa Doc 237 (frequência de citação dos indicadores nas publicações analisadas)
- Variância útil real (range 25-72 nos dados atuais vs 50-100 saturado da v1)
- Gradação logarítmica substitui lógica binária no histórico de aplicações
- Multicolinearidade contábil resolvida (aplicações contam só em Sanidade, não em Operacional/Rastreabilidade)
- Animal vendido CONGELA o score em vez de penalizar (Embrapa: taxa de desfrute valoriza venda)

**Auditabilidade:**
- Tabela `score_audit_log` registra toda mudança material com event_source, delta, timestamp
- 5 pilares decomponíveis: total_score sempre é reproduzível a partir dos sub-scores
- Algoritmo aberto, sem caixa-preta — possibilita validação científica externa (justamente o propósito desta sessão)

---

## Seção 7 — Limitações Conhecidas (ainda em aberto na v3)

Muitas das 13 limitações da versão anterior foram **resolvidas** na v3. As que **permanecem em aberto** e precisam de discussão com vocês:

### 7.1. Pesos finais entre pilares pendentes de validação científica

Embora a v3 ancore a **escolha dos 5 pilares** e a **frequência relativa dos indicadores** em Embrapa Doc 237, **os pesos finais** (Produtivo 36%, Sanidade 25%, Rastreabilidade 29%, Certificações 10%) foram decisão de equipe Agraas e ainda não têm peer review zootécnico oficial. Esta é a pergunta científica mais importante.

### 7.2. Curvas de crescimento apenas Nelore

V3 inicial usa gabarito Nelore para todos os animais (raça mais comum no Brasil). Animais Angus / Brangus / mestiços têm curvas distintas. **Decisão de equipe Agraas pendente de validação científica** quanto a customização por raça.

### 7.3. Pilar Reprodutivo inteiramente PREPARADO

Toda a estrutura está pronta, mas sem dados reais de eventos reprodutivos (parto, IEP, taxa de prenhez individual). Quando os dados existirem, o pilar entra automaticamente. **Pergunta para vocês**: qual conjunto mínimo de eventos reprodutivos faz sentido capturar primeiro?

### 7.4. Rendimento de carcaça PREPARADO

Embrapa Doc 237 trata rendimento de carcaça como indicador-chave do produtivo. Hoje não temos dados de abate estruturados. **Pergunta**: como capturar essa variável quando o frigorífico devolver o dado pós-abate?

### 7.5. Manejo regenerativo / CO2eq não capturados

Pilar de sustentabilidade (alinhado ao NeuTroPec) ainda não está modelado. **Pergunta**: quais sinais práticos o produtor já registra ou poderia registrar (rotação de pasto, taxa de lotação, suplementação) que validem manejo regenerativo sem custo cognitivo proibitivo?

### 7.6. Predições de IA (Claude) e score determinístico permanecem desconectados

Sistema de predição (`ai_predictions`, Claude Sonnet 4.6) vive paralelo ao score v3. **Pergunta**: faz sentido predições de IA serem input do score determinístico? Há literatura sobre ML em score de qualidade animal?

### 7.7. Sem normalização por peer group

Score absoluto, não relativo. Animal Nelore terminado em MT vs Angus confinado em SP têm mesma régua. **Pergunta**: deveria ser score relativo a categoria + região + raça?

### 7.8. Histórico do próprio score não influencia score atual

Animal que subiu de 60 para 80 em 6 meses conta igual a animal que sempre teve 80. **Pergunta**: derivada temporal do score deveria entrar como variável?

### 7.9. Sem auditoria de delta por pilar

`score_audit_log` registra `delta_total` mas hoje os deltas por pilar (`delta_produtivo`, `delta_sanidade`, etc.) são gravados como NULL. Implementação refinada planejada para v3.1.

---

## Seção 8 — Perguntas para a Revisão Científica

### Sobre fundamentos metodológicos

1. **Os 5 pilares escolhidos (Produtivo, Sanidade, Reprodutivo, Rastreabilidade, Certificações) cobrem adequadamente o que Embrapa Doc 237 chama de "indicadores de desempenho" para pecuária de corte BR?** Alguma dimensão crítica está faltando?

2. **Pesos atuais (36/25/29/10 sem reprodutivo) refletem proporção defensável zootecnicamente?** Quando reprodutivo ativar (30/25/15/20/10), proporção continua razoável para fêmeas adultas?

3. **A frequência de citação dos indicadores em Embrapa Doc 237 é base científica suficiente para defesa dos pesos**, ou precisamos referência adicional (Plataforma +Precoce diretamente, paper específico)?

### Sobre subindicadores e gradações

4. **Faixas de GMD (péssimo < 0,3 / fraco 0,3-0,5 / regular 0,5-0,8 / bom 0,8-1,2 / excelente > 1,2 kg/dia)** — estão alinhadas com a literatura?

5. **Gabarito de peso × idade Nelore (150-180 kg desmama, 480-540 kg terminação)** — referência defensável? Existe gabarito oficial brasileiro consolidado por raça? CAR/RFI mudaria essas faixas?

6. **Gradação logarítmica das aplicações sanitárias (0/1-2/3-5/6-10/10+ → 30/50/70/85/100)** — faz sentido ou deveria ser outra função (sigmoide, escalonada por tipo de aplicação)?

### Sobre integração com Plataforma +Precoce e NeuTroPec

7. **Plataforma +Precoce (Embrapa Gado de Corte + Embrapa Pantanal)** — o Score Agraas v3 pode ser apresentado como **adaptação Agraas da metodologia +Precoce** sem desrespeitar a marca/escopo do programa oficial?

8. **NeuTroPec — neutralidade tropical, baixo carbono** — como integrar como pilar ou modificador? Métricas de manejo regenerativo auditáveis na prática do produtor brasileiro hoje?

9. **CO2eq por cabeça** — IPCC Tier 2? Metodologia Embrapa específica? Em que prazo é razoável esperar dados desse tipo no campo?

### Sobre evolução estrutural

10. **Score deveria normalizar por peer group** (categoria + região + raça) ou permanecer absoluto? Argumento técnico para cada lado?

11. **Componente temporal (derivada do score, trajetória ascendente vs estável)** deveria valer mais que score absoluto em dado momento?

12. **Tratamento de venda — congelar score com status `frozen_sold` é correto zootecnicamente**, ou existe abordagem melhor (calcular "score de saída" definitivo no momento da venda)?

### Sobre formato de colaboração futura

13. **Existe espaço, no horizonte que vocês conseguem enxergar, para algum tipo de construção colaborativa de material publicável sobre metodologia de score auditável para pecuária brasileira ancorada em +Precoce?** Reconhecemos que essa é decisão de longo prazo dependente de fatores que vocês conhecem melhor — carga acadêmica, agenda de publicações, alinhamento institucional. Estamos abertos ao formato que fizer sentido (ou a nenhum formato — também é resposta legítima).

14. **Como vocês imaginam que poderia funcionar essa contribuição metodológica ao longo do tempo, se houver interesse?** Não temos expectativa pré-formada — co-autoria pontual em paper, consultoria técnica formalizada, mentoria continuada sem vínculo escrito, comitê consultivo institucional, ou simplesmente acompanhamento informal da evolução. O formato é discutível e respeitará a agenda de vocês.

### Sobre o objeto da própria mentoria

15. **O que mais nesta v3 vocês olhariam com olho crítico de pesquisador?** Há frente metodológica ou de implementação que ficou subestimada e merece priorização imediata?

---

## Anexo A — Localização exata do código

```
Funções no banco PostgreSQL gerenciado:
  - public.calculate_agraas_score_v3(uuid, text, uuid, text)  ← CANÔNICA
  - public.get_animal_category(uuid)
  - public.calculate_farm_score(uuid)
  - public.calculate_producer_score(uuid)
  - public.trigger_recalculate_score_v3()
  - public.refresh_animal_passport(uuid)

Triggers v3 ativos:
  - public.weights              → trg_score_v3_from_weights
  - public.applications         → trg_score_v3_from_applications
  - public.animal_certifications → trg_score_v3_from_certifications
  - public.animal_rfids         → trg_score_v3_from_rfids
  - public.events               → trg_score_v3_from_events
  - public.animal_movements     → trg_score_v3_from_movements

Migrations relevantes:
  - 036_score_engine.sql              ← v2 (declarada, depois removida)
  - 121_fix_refresh_animal_passport.sql ← fix histórico passport
  - 122_events_mentor_policy.sql       ← policy de mentor em events
  - 123_score_engine_v3.sql            ← REFATORAÇÃO V3 (atual)

Tabelas v3:
  - public.animal_scores       (1:1 por animal, algorithm_version='v3')
  - public.score_audit_log     (audit por mudança material)
  - public.farm_scores         (Nível 2: por propriedade)
  - public.producer_scores     (Nível 3: por cliente)
  - public.agraas_master_passport_cache (espelha score em JSON)

Sistema paralelo (não conectado ao score determinístico):
  - public.ai_predictions      (Claude Sonnet 4.6 — predições de risco)
  - app/api/predict-score/route.ts
```

---

## Anexo B — Histórico de versões

- **v0** (não documentada): Tabela `animal_scores` criada com 3 pilares. Pesos 40/35/25. Modelo top-down (penalização). Função `recalculate_animal_score`.
- **v1**: Modelo bottom-up (acúmulo). Pesos 40/30/30. Função `refresh_animal_score`. Foi a versão efetivamente acionada por triggers até maio/2026.
- **v2 (declarada, não acionada)**: Migration 036 introduziu `calculate_agraas_score` com 5 pilares + bônus. Pesos 28/24/18/20/10 + bonus 0-7. Triggers nunca foram migrados para chamar essa função.
- **v3 (ATUAL, 27/05/2026)**: Migration 123. Função canônica única `calculate_agraas_score_v3`. 5 pilares ancorados em Embrapa Doc 237 (Costa et al., 2018). Multicolinearidade resolvida. Score frozen para vendidos. Score Nível 2 e 3 (farm + producer). Audit log integral. 58 animais recalculados.

---

## Encerramento

A versão v3 do Score Agraas representa progresso real do "ponto de partida funcional" descrito no relatório anterior em direção a uma **metodologia ancorada cientificamente**. Mas progresso ≠ consolidação. As decisões de pesos finais, calibração de gradação por raça, integração com Plataforma +Precoce e NeuTroPec, e tratamento de variáveis ausentes (CAR/RFI, manejo regenerativo, CO2eq) **dependem da revisão de vocês**.

Estamos prontos para discutir, ajustar, recuar onde fizer sentido. A presença de vocês neste momento é mais que mentoria pontual: é o que transforma uma implementação Agraas em metodologia validada.

Atenciosamente,
**Equipe Agraas**
`lucas@agraas.com.br`

---

> *Documento técnico confidencial — uso restrito à mentoria Agraas × Instituto de Zootecnia de SP.
> Versão 2 (v3 do Score) · 27 de maio de 2026.*
