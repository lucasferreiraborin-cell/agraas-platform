# Relatório Técnico Completo — Score Engine Agraas

> **Documento preparatório para a mentoria IZ-SP / NeuTroPec — sessão 29/05/2026**
>
> **Para**: Dra. Renata Tieko Nassu · Prof. César Gonçalves de Lima
> **De**: Equipe Agraas
> **Postura editorial**: honestidade total. Onde a metodologia é frágil, intuitiva ou arbitrária, está marcado explicitamente. O propósito desta sessão é revisão científica, e revisão científica só funciona com transparência.

---

## Aviso introdutório (precisa ser dito antes de qualquer outra coisa)

Durante o levantamento deste documento, identifiquei que **três funções distintas de cálculo do Score Agraas coexistem em produção** no banco de dados, com pesos diferentes, fórmulas diferentes e níveis de sofisticação diferentes. Apenas uma delas é efetivamente acionada pelos triggers de atualização automática. As outras duas existem como artefatos de evolução não consolidada do algoritmo.

A coluna `algorithm_version` da tabela `animal_scores` declara, por padrão, o valor `'v2'`. Mas na prática, o cálculo que roda automaticamente é o da função **v1**, mais simples. **A versão v2 (mais sofisticada) existe no banco mas não é invocada por nenhum trigger ativo.**

Este é o tipo de débito que justifica exatamente a mentoria de vocês — antes de tentar evoluir, precisamos consolidar uma única fonte de verdade. O documento abaixo descreve **as três versões honestamente**, marcando qual é a efetivamente em uso hoje.

---

## Seção 1 — Visão Geral do Score

**O que é o Score Agraas em uma frase:**
Uma pontuação numérica multidimensional de 0 a 100 atribuída a cada bovino individual, que agrega indicadores de sanidade, gestão operacional, continuidade de cadeia e (na versão v2) desempenho produtivo e idade, com o objetivo de fornecer um número auditável de confiança e maturidade de rastreabilidade do animal.

**Problema que resolve:**

O agronegócio brasileiro hoje opera com indicadores informais e proprietários para qualificar animais — "boi gordo de fulano é bom porque eu conheço o fulano". O Score Agraas tenta substituir essa heurística social por uma **métrica auditável**, derivada de eventos verificáveis no sistema (pesagens, aplicações sanitárias, eventos reprodutivos, certificações). A intenção é que três atores consigam ler o mesmo número e tomar decisões compatíveis a partir dele.

**Quem consome:**

| Consumidor | Como usa |
|---|---|
| **Produtor** | Diagnóstico do próprio rebanho — quais animais estão com gaps, quais estão prontos para venda premium |
| **Comprador institucional (frigorífico, trader)** | Pré-qualificação de lote antes de embarque — reduz custo de auditoria |
| **Banco / sistema financeiro** | Tese de futuro: score como insumo de crédito rural — quanto maior o score do rebanho, menor o risco de inadimplência percebido |
| **Mentor científico (vocês)** | Validação cruzada — o score reflete o que a literatura zootécnica considera importante? |

**Range numérico:** 0 a 100 (inteiro arredondado a 2 casas decimais na tabela, mas exibido como inteiro na UI).

**Atualização:** Sob demanda via trigger de banco. Toda vez que um evento operacional (aplicação sanitária, pesagem, alteração em certificação) é inserido/atualizado/excluído, o trigger `trg_refresh_from_*` chama uma cadeia de funções que recalcula o score e atualiza o cache do passaporte. **Não é tempo real em sentido estrito** — é eventually consistent dentro de milissegundos após a transação.

---

## Seção 2 — Arquitetura Técnica

### Tabelas envolvidas

```
animals                        (entidade-raiz do animal)
  ↓
animal_scores                  (score consolidado por animal — 1:1)
  ├ sanitary_score        (numeric 0-100)
  ├ operational_score     (numeric 0-100)
  ├ continuity_score      (numeric 0-100)
  ├ productive_score      (numeric 0-100, populado apenas em v2)
  ├ total_score           (numeric 0-100, composição ponderada)
  ├ score_status          (text 'current' / outros)
  ├ score_version         (text — v1 ou v2)
  ├ algorithm_version     (text, default 'v2')
  ├ updated_at            (timestamptz)
  └ last_updated          (timestamp)

  Tabelas de entrada (lidas pelas funções de score):
    weights                (pesagens — usadas em v2)
    applications           (aplicações sanitárias com período de carência)
    events                 (eventos do ciclo de vida do animal)
    animal_rfids           (presença ou não de identificação eletrônica)
    animal_certifications  (certificações ativas)

  Tabelas auxiliares para apresentação:
    agraas_master_passport_cache (passaporte materializado em JSON — espelha o score)
```

### Triggers ativos hoje

Quando uma das tabelas abaixo recebe `INSERT`, `UPDATE` ou `DELETE`, dispara recálculo:

| Tabela | Trigger | Função invocada |
|---|---|---|
| `applications` | `trg_refresh_from_applications` | `trigger_refresh_animal_passport_from_animal_id()` |
| `weight_records` *(legado)* | `trg_refresh_from_weight_records` | mesma |
| `animal_certifications` | `trg_refresh_from_animal_certifications` | mesma |

Cadeia de chamadas:

```
trigger → trigger_refresh_animal_passport_from_animal_id()
       → refresh_animal_derived_data(animal_id)
            ├── refresh_animal_score(animal_id)           ← cálculo
            ├── refresh_animal_certifications(animal_id)  ← deriva selos
            └── refresh_animal_passport(animal_id)        ← atualiza cache JSON
```

### As três funções de score que coexistem (estado real do banco)

| Função | Status | Quem chama | Pesos da composição |
|---|---|---|---|
| **`refresh_animal_score(uuid)`** | ✅ **EM USO PELOS TRIGGERS** | `refresh_animal_derived_data` | sanitary × 0.4 + operational × 0.3 + continuity × 0.3 |
| **`recalculate_animal_score(uuid)`** | 🟡 Existe, ninguém chama (legado) | Nenhum trigger ativo | sanitary × 0.4 + operational × 0.35 + continuity × 0.25 |
| **`calculate_agraas_score(uuid)`** | ⚠️ **Existe, declara `v2`, nenhum trigger chama** | Apenas invocação manual | productive × 0.28 + sanitary × 0.24 + operational × 0.18 + continuity × 0.20 + age_factor × 0.10 + trace_bonus (0-7) |

**Isso é exatamente o tipo de débito técnico que precisa ser revisado com vocês.** O documento abaixo descreve as 3, mas a **v1 (`refresh_animal_score`)** é a que produz os números visíveis no sistema hoje.

### Performance

Tempo médio de recálculo individual: **~5–20 ms** por animal em banco quente. O recálculo de toda a base FSJBE (pré-reset, 5 animais) levou menos de 100 ms. O recálculo de toda a base do administrador (Lucas, 23 animais) leva menos de 300 ms. **Performance não é gargalo.**

---

## Seção 3 — Pilares do Score

Esta seção descreve cada pilar nas **três versões coexistentes**, marcando qual é a versão em uso (v1).

### Pilar 1 — Sanitary Score (Sanidade)

**O que mede conceitualmente:**
Quão bem o animal foi acompanhado em termos de aplicações sanitárias (vacinas, vermífugos, tratamentos veterinários) e se está livre de períodos de carência ativos que impediriam comercialização imediata.

#### Versão v1 (em uso pelos triggers — `refresh_animal_score`)

```sql
v_sanitary := 50;                                       -- base
if v_app_count > 0 then v_sanitary += 30; end if;       -- "tem aplicação registrada?"
if v_active_withdrawal_count = 0 then v_sanitary += 20; -- "carência ativa?"
v_sanitary := least(100, greatest(0, v_sanitary));
```

**Comentário em português natural:**
> Todo animal começa com 50 pontos só por existir. Se tem **pelo menos uma** aplicação sanitária registrada na história, ganha +30. Se **não tem** carência ativa hoje, ganha +20. Resultado fica entre 50 e 100.

**Range efetivo na prática:** 50, 80, ou 100. **Apenas três valores distintos possíveis.**

**Decisões arbitrárias documentadas:**
- A base de 50 não foi derivada de pesquisa científica — foi escolhida para que animais novos sem histórico não comecem em zero (péssimo UX).
- O +30 para "tem aplicação registrada" é binário: 1 ou 100 aplicações dão o mesmo bônus.
- O +20 para "sem carência ativa" é binário também.

#### Versão v0 (`recalculate_animal_score`, antiga, sem trigger ativo)

```sql
sanitary := 100;                                    -- começa em 100
if latest_withdrawal >= current_date then
  sanitary -= 20;                                    -- penaliza carência ativa
end if;
```

Modelo de **penalização** (top-down) em vez de modelo de **acúmulo** (bottom-up).

#### Versão v2 (`calculate_agraas_score`, declarada mas não acionada)

```sql
v_sanitary := least(100, 50 + coalesce(v_app_count, 0) * 5);
```

**Comentário:** começa em 50, ganha +5 por cada aplicação registrada, capa em 100. Implica que **10 aplicações** levam o score sanitário ao máximo. **Gradação real**, mas linear ingênua.

**Range efetivo:** 50 + (0 a 50) = 50 a 100 (50 a 50 se nenhuma aplicação, 100 se 10+ aplicações).

---

### Pilar 2 — Operational Score (Operacional / Gestão)

**O que mede conceitualmente:**
Maturidade da gestão operacional do animal — se tem identificação eletrônica (RFID), se tem pesagens registradas, se há histórico de manejo documentado.

#### Versão v1 (em uso)

```sql
v_operational := 40;                                  -- base
if v_has_rfid then v_operational += 20; end if;       -- tem RFID?
if v_weight_count > 0 then v_operational += 20; end if; -- tem alguma pesagem?
if v_app_count > 0 then v_operational += 20; end if;  -- tem alguma aplicação?
```

**Comentário em português natural:**
> Base 40. +20 se tem RFID. +20 se tem pelo menos uma pesagem. +20 se tem pelo menos uma aplicação. Range efetivo: 40, 60, 80 ou 100.

**Observação crítica:** o "tem aplicação?" aparece tanto no pilar sanitário (+30) quanto aqui (+20). **A mesma variável de entrada contribui duas vezes para o total — uma vez como sanidade, outra como operação.** Isso é multicolinearidade contábil.

#### Versão v2

```sql
v_operational := least(100, 40 + coalesce(v_event_count, 0) * 3);
```

Conta **eventos genéricos** (qualquer evento no log de timeline do animal) em vez de aplicações. Cada evento vale +3 pontos. **20 eventos** zeram a margem.

---

### Pilar 3 — Continuity Score (Continuidade de Cadeia)

**O que mede conceitualmente:**
Quão preservada está a "linhagem de propriedade" do animal — se nasceu na fazenda atual, se foi transferido entre lotes/propriedades de forma documentada, se ainda não foi vendido (vendido = perdemos a continuidade).

#### Versão v1 (em uso)

```sql
v_continuity := 50;                                       -- base
if v_birth_count > 0 then v_continuity += 20; end if;     -- tem evento de nascimento?
if v_transfer_count > 0 then v_continuity += 10; end if;  -- tem transferência de lote/propriedade?
if v_sale_count = 0 then v_continuity += 20; end if;      -- ainda não foi vendido?
```

**Comentário em português natural:**
> Base 50. +20 se tem registro de nascimento. +10 se tem alguma transferência (LOT_ENTRY, OWNERSHIP_TRANSFER). +20 se NÃO foi vendido. Range efetivo: 50, 60, 70, 80, 90 ou 100.

**Decisões arbitrárias:**
- "Não vendido" dá pontos — implica que animal vendido tem score baixo. **Isso é estranho conceitualmente.** Um animal pode ter sido vendido com altíssima qualidade — a venda em si não compromete a confiabilidade do dado histórico.
- "Tem transferência" dá +10 — o oposto também é estranho. Um animal estável na mesma propriedade pode ser mais consistente em manejo. Por que mover é melhor que não mover?

---

### Pilar 4 — Productive Score (apenas em v2)

**Exclusivo da versão v2 (`calculate_agraas_score`), não populado em produção via triggers.**

```sql
v_productive := case
  when v_last_weight > 0
    then least(100, 35 + round(v_last_weight / 10))
  else 35
end;
```

**Comentário:** base 35. Ganha **+1 ponto a cada 10 kg de peso**. Animal de 650 kg ganha +65, totalizando 100.

**Problema zootécnico óbvio:** isso premia **peso absoluto** sem considerar **idade, raça, sexo, categoria** (bezerro, novilha, boi gordo terminado). Um animal Nelore terminado de 480 kg é excelente; um animal Nelore aos 30 meses ainda em 480 kg é abaixo do esperado. **A fórmula trata os dois da mesma forma.**

---

### Pilar 5 — Age Factor (apenas em v2)

```sql
v_age_factor := case
  when v_age_months is not null
    then least(100, 40 + round(v_age_months / 2.0))
  else 50
end;
```

**Comentário:** base 40. **+0,5 ponto por mês de idade**. Animal de 5 anos (60 meses) ganha +30, totalizando 70.

**Problema zootécnico óbvio:** isso **premia animal velho**. Zootecnicamente, score deveria **normalizar por categoria**, não recompensar idade. Um bezerro recém-desmamado deveria poder ter score alto se está em manejo correto — não baixo só porque ainda é jovem.

---

### Pilar 6 — Traceability Bonus (apenas em v2)

```sql
v_trace_bonus :=
    (case when v_blood_type is not null then 3 else 0 end)
  + (case when v_has_genealogy            then 4 else 0 end);
```

**Comentário:** +3 se tem tipo sanguíneo registrado, +4 se tem pai OU mãe registrados (genealogia parcial conta). Bônus máximo: 7 pontos absolutos (somados ao total, não ponderados).

**Observação:** é o único componente que se soma ao total **fora da média ponderada**, alterando o range efetivo do total para até 107 (mas com `LEAST(100, …)` a cap volta para 100).

---

### Composição final do total_score

#### Versão v1 (em uso pelos triggers)

```
total = sanitary × 0.4 + operational × 0.3 + continuity × 0.3
```

| Pilar | Peso |
|---|---|
| Sanitário | **40%** |
| Operacional | 30% |
| Continuidade | 30% |
| **Produtivo** | não existe |
| **Idade** | não existe |
| **Genealogia** | não existe |

#### Versão v2 (declarada, não acionada)

```
total = least(100,
    productive   × 0.28
  + sanitary     × 0.24
  + operational  × 0.18
  + continuity   × 0.20
  + age_factor   × 0.10
  + trace_bonus  (somado fora da média)
)
```

| Pilar | Peso |
|---|---|
| Produtivo | 28% |
| Sanitário | 24% |
| Operacional | 18% |
| Continuidade | 20% |
| Idade | 10% |
| Bônus rastreabilidade | até +7 pontos absolutos |

**Decisões arbitrárias dos pesos (ambas as versões):**

Os pesos das duas versões **não vêm de literatura zootécnica brasileira**. Eles foram escolhidos por intuição da equipe, priorizando o que "parecia importante" no momento da implementação. Esta é uma das perguntas mais importantes da revisão científica com vocês.

---

## Seção 4 — Variáveis / Features Utilizadas

Lista exaustiva de todas as variáveis lidas pelas três funções:

### Variáveis em uso pela v1 (efetivamente acionada)

| Variável | Tabela origem | Tipo | Pilar | Tratamento se nulo |
|---|---|---|---|---|
| Existência de RFID | `animal_rfids` | boolean | Operacional | tratado como `false` |
| Contagem de aplicações | `applications` | integer | Sanitário + Operacional | tratado como `0` |
| Contagem de carências ativas | `applications.withdrawal_end_date >= current_date` | integer | Sanitário | tratado como `0` |
| Contagem de pesagens | `weights` | integer | Operacional | tratado como `0` |
| Contagem de eventos `sale`/`slaughter` | `events.event_type` | integer | Continuidade | tratado como `0` |
| Contagem de eventos `birth`/`nascimento` | `events.event_type` | integer | Continuidade | tratado como `0` |
| Contagem de eventos `ownership_transfer`/`lot_entry`/`transferencia` | `events.event_type` | integer | Continuidade | tratado como `0` |

### Variáveis adicionais usadas por v2 (não acionadas em produção)

| Variável | Tabela origem | Tipo | Pilar | Tratamento se nulo |
|---|---|---|---|---|
| Peso mais recente | `weights.weight` | numeric | Produtivo | tratado como ausência → score base 35 |
| Data de nascimento | `animals.birth_date` | date | Idade | score base 50 |
| Tipo sanguíneo registrado | `animals.blood_type` | text | Bônus rastreabilidade | sem bônus |
| Genealogia (pai OU mãe) | `animals.sire_animal_id`, `animals.dam_animal_id` | uuid | Bônus rastreabilidade | sem bônus |
| Contagem de pesagens últimos 90d | `weights.weighing_date` | integer | Continuidade (v2) | tratado como `0` |
| Contagem total de eventos | `events` | integer | Operacional (v2) | tratado como `0` |

### Variáveis que **nenhuma das três versões** considera (mas talvez devesse)

- Raça (`animals.breed`)
- Sexo (`animals.sex`)
- Status atual do animal (`animals.status`: ativo, morto, vendido)
- Propriedade atual (`animals.current_property_id`)
- **GMD — Ganho Médio Diário** (calculável a partir de `weights` mas não usado)
- **Idade × Peso** (peso esperado para idade da categoria)
- **Intervalo entre partos** (para vacas, vem de `events` reprodutivos)
- **Taxa de prenhez histórica do lote**
- **Certificações ativas** (Boi Verde, Rastreabilidade BR, GAP) — não entram no cálculo do score apesar de existirem na tabela `animal_certifications`
- **Carbono / footprint ambiental** (não capturamos ainda)
- **CAR/RFI** (eficiência alimentar) — não capturamos
- **Histórico de movimentações intra-propriedade** (rotação de pasto)

---

## Seção 5 — Cálculo Passo a Passo

Vamos calcular o score de um animal ilustrativo usando a **v1 (em uso pelos triggers)**.

**Animal hipotético — boi terminado em fazenda de cria-engorda paulista:**

- 28 meses de idade
- Tem RFID registrado
- 4 aplicações sanitárias na história (vacinação anual + vermífugos)
- Última aplicação há 60 dias, sem carência ativa
- 6 pesagens registradas
- 1 evento de nascimento na fazenda (nascido lá)
- 2 transferências de lote (recria → engorda)
- Ainda não vendido

### Cálculo do Sanitary Score (v1)

```
v_sanitary = 50 (base)
  + 30 (porque v_app_count = 4 > 0)
  + 20 (porque v_active_withdrawal_count = 0)
  = 100
```

### Cálculo do Operational Score (v1)

```
v_operational = 40 (base)
  + 20 (porque v_has_rfid = true)
  + 20 (porque v_weight_count = 6 > 0)
  + 20 (porque v_app_count = 4 > 0)
  = 100
```

### Cálculo do Continuity Score (v1)

```
v_continuity = 50 (base)
  + 20 (porque v_birth_count = 1 > 0)
  + 10 (porque v_transfer_count = 2 > 0)
  + 20 (porque v_sale_count = 0)
  = 100
```

### Total

```
v_total = round(100 × 0.4 + 100 × 0.3 + 100 × 0.3, 2)
        = round(40 + 30 + 30, 2)
        = 100
```

### O que esse cálculo revela

- Este animal já **atinge o teto de 100** com apenas 4 aplicações sanitárias na história.
- Um animal com 50 aplicações teria **exatamente o mesmo score**.
- Outro animal hipotético: 1 aplicação registrada, sem carência ativa, sem RFID, sem pesagem, sem evento de nascimento, sem transferência, sem venda. Esse animal teria:
  - Sanitário: 50 + 30 + 20 = **100**
  - Operacional: 40 + 20 = **60**
  - Continuidade: 50 + 20 = **70**
  - Total: 100 × 0.4 + 60 × 0.3 + 70 × 0.3 = 40 + 18 + 21 = **79**

**Conclusão observável:** o range efetivo do total_score na v1 é **aproximadamente de 60 a 100**. Animais sem nenhum registro caem para 60 (mínimo aritmético). Animais com qualquer histórico mínimo já chegam perto de 90. **A variância útil do score é baixa.**

---

## Seção 6 — Validações Já Aplicadas

### Regras de negócio implementadas

1. **Clamp 0-100**: todas as fórmulas usam `least(100, greatest(0, valor))` para garantir que cada subscore fique em [0, 100].
2. **Total cap 100**: na v2, `LEAST(100, …)` é aplicado no final mesmo se a soma + bônus passar de 100.
3. **Arredondamento**: total_score é arredondado a 2 casas decimais; subscores são integers ou decimais conforme cálculo.
4. **Upsert idempotente**: `INSERT … ON CONFLICT (animal_id) DO UPDATE` garante que recalcular múltiplas vezes não duplica registros.
5. **`session_replication_role = replica`** durante upsert: bypassa triggers recursivos que poderiam causar loop infinito (problema histórico, ver seção 7).

### Sanity checks operacionais

- **Existência do animal**: a função `calculate_agraas_score` retorna `NULL` se o animal não existir, sem alterar nada.
- **Coalesce em contagens**: todas as contagens são tratadas com `COALESCE(…, 0)` antes do cálculo, evitando `NULL`.
- **Cache sincronizado**: a função `refresh_animal_passport` é chamada na cadeia e atualiza o cache JSON do passaporte com o novo score.

### Casos extremos testados

| Cenário | Comportamento atual |
|---|---|
| Animal sem nenhum evento, peso ou aplicação | Score = 60 (v1), 35-40 (v2 — productive baixo) |
| Animal vendido há 2 anos | Continuidade cai 20 pontos (perde o +20 de "sem venda") |
| Animal com carência ativa | Sanitário cai 20 pontos |
| Animal com aplicação duplicada (mesma data, mesmo produto) | Conta como 2 aplicações — **bug conhecido**, nenhuma deduplicação |
| Animal com data de nascimento futura ou inválida | v2: `EXTRACT` retorna valor negativo → age_factor pode ficar abaixo do esperado |

---

## Seção 6.5 — O que já funciona bem

Antes de mergulharmos nas limitações, é justo registrar o que está **sólido** no estado atual do sistema. A revisão científica é mais produtiva quando se sabe o que preservar.

**Do ponto de vista de engenharia**, a arquitetura é robusta: o cálculo é determinístico, reproduzível, idempotente e dispara automaticamente quando dados de entrada mudam — o que garante que o número exibido sempre reflete o estado real do animal no banco, sem desincronizações. O isolamento multi-tenant (RLS) garante que dados de uma fazenda nunca contaminem score de outra. O cache materializado em JSON (`agraas_master_passport_cache`) torna a leitura do passaporte rápida mesmo com milhões de animais. A performance de recálculo é da ordem de milissegundos por animal. Em outras palavras: **a infraestrutura suporta a metodologia que vocês ajudarem a desenhar**, qualquer que seja a complexidade dela.

**Do ponto de vista conceitual**, a divisão em pilares (sanidade, gestão operacional, continuidade de cadeia, e em v2 também desempenho produtivo e idade) é um esqueleto razoável. Esses são, de fato, eixos que a literatura zootécnica brasileira reconhece como dimensões legítimas de qualidade animal. **O que precisa de revisão é a fórmula dentro de cada pilar, não a divisão em pilares em si.** Da mesma forma, a escolha de manter o score em escala 0-100 (em vez de inventar escala proprietária) facilita comparabilidade com outros indicadores do setor. E o fato de o score ser **estatecal e auditável** (sempre derivável dos dados de entrada, sem caixa-preta) é o que cria a possibilidade real de validação científica externa que estamos buscando com vocês.

---

## Seção 7 — Limitações Conhecidas

Esta é a seção mais importante para a revisão científica. Estou listando **todas as fragilidades estruturais** que identifico no estado atual.

### 7.1. Coexistência de três algoritmos em produção

Como descrito no aviso introdutório: `refresh_animal_score` (v1), `recalculate_animal_score` (v0 legado), e `calculate_agraas_score` (v2). **A primeira é a única efetivamente acionada.** As outras são código órfão. O banco declara `algorithm_version = 'v2'` por padrão, mas a versão executada é a v1. **Inconsistência grave, prioridade 0 de resolução.**

### 7.2. Thresholds binários produzem score com baixa variância útil

Na v1, **a maioria dos componentes do score são binários** (tem ou não tem). Resultado: animais com dados mínimos já saturam o teto. Um animal com 1 vacinação tem mesmo score sanitário que um animal com 50 vacinações. **Não distingue qualidade de gestão**, só presença vs ausência.

### 7.3. Pesos arbitrários sem base científica

Nem `40/30/30` da v1, nem `28/24/18/20/10/7` da v2 vêm de literatura zootécnica. Foram escolhas de equipe. **A pergunta científica concreta**: a literatura brasileira (Embrapa, IZ-SP, ESALQ) sugere alguma ponderação justificada para componentes de manejo bovino de corte? Existe alguma metodologia consagrada (CIQ, Boi Verde, Hilton Beef) que possamos referenciar?

### 7.4. Multicolinearidade contábil

Na v1, **a contagem de aplicações sanitárias contribui para dois pilares ao mesmo tempo** (sanitário +30, operacional +20). Significa que um animal com aplicações registradas ganha 50 pontos em pilares conceitualmente distintos. **Há double counting.**

### 7.5. Ausência completa de variáveis-chave da zootecnia

O score atual **não considera**:

- **GMD (ganho médio diário)** — pode ser calculado de `weights` mas não é usado
- **Peso à desmama / Peso aos 12 / Peso aos 18 meses** — gabaritos padrão da zootecnia
- **Idade × Peso** (gabarito de categoria — desmama, recria, terminação)
- **Raça** — Nelore, Angus, Brangus têm curvas de crescimento distintas
- **Sexo** — fêmea vs macho não devem ter mesma régua
- **Eficiência reprodutiva** (taxa de prenhez, intervalo entre partos)
- **Eficiência alimentar (RFI, CAR)** quando disponível
- **Status (vivo/morto/vendido)** não normaliza o cálculo
- **Carbono / footprint ambiental** — não capturamos
- **Pastoreio rotacionado / manejo regenerativo** — não capturamos

### 7.6. Idade como bônus, não como contexto (v2)

A v2 dá **mais pontos a animal mais velho**. Zootecnicamente, isso é incorreto. **Score deveria normalizar por categoria**, não premiar idade absoluta. Um bezerro Nelore desmamado com peso e GMD adequados deveria ter score igual ou maior que um boi adulto sem essa qualidade.

### 7.7. "Não vendido" como bônus (v1)

Animal não vendido ganha +20 em continuidade. Implica que um animal premium vendido com sucesso tem score baixo após a venda. **Comercialização não deveria penalizar o score histórico** — deveria, no máximo, congelar o último valor antes da saída.

### 7.8. Certificações não entram no cálculo

A plataforma armazena `animal_certifications` (Boi Verde, Rastreabilidade BR, Bem-Estar Animal · GAP), mas **nenhuma das três versões do score considera certificações ativas como input**. Elas são apenas exibidas no passaporte, sem impacto numérico.

### 7.9. Genealogia tratada como bônus binário (v2)

Em v2, "tem pai OU mãe registrado" dá +4 pontos absolutos. **Não diferencia** se ambos estão registrados, se a linhagem é conhecida em múltiplas gerações, ou se a genealogia inclui touros de mérito genético.

### 7.10. Histórico não é considerado

Score atual é **stateless**: ignora a trajetória do animal no tempo. Um animal que tinha score 80 e caiu para 60 conta igual a um animal que sempre teve 60. **Não há derivada temporal.**

### 7.11. Falta normalização por peer group

Não há comparação com **rebanho do mesmo cliente, mesma região, mesma raça, mesma categoria**. Score de 80 em Nelore terminado em Mato Grosso significa o mesmo que 80 em Angus de leite em Minas Gerais. **Não deveria.**

### 7.12. Ausência de auditoria de mudanças

Quando um score muda, o sistema **não registra** o "porquê" — qual evento causou a mudança, quanto cada componente subiu/desceu. Para uma plataforma que se posiciona como "auditável", isso é gap importante.

### 7.13. Predições de IA (Claude) e score determinístico são desconectados

A plataforma tem dois sistemas de pontuação rodando em paralelo: o **score determinístico** (PL/pgSQL) descrito aqui, e as **predições de IA** (Claude Sonnet 4.6) na tabela `ai_predictions` que estimam um `predicted_score_30d`. **Nenhum dos dois alimenta o outro.** A IA é caixa-preta para o score, e o score é input nada cego para a IA.

---

## Seção 8 — Perguntas para a Revisão Científica

Lista de questões concretas que esperamos discutir com vocês. Não esperamos resposta de todas hoje — algumas vão evoluir ao longo das próximas sessões.

### Sobre fundamentos metodológicos

1. **Existe literatura zootécnica brasileira que sustente ponderação entre pilares de manejo bovino?** A Embrapa Gado de Corte, IZ-SP ou ESALQ teriam alguma referência metodológica equivalente ao que estamos tentando fazer aqui?

2. **Como deveríamos ponderar sanidade vs. produção?** A v1 dá 40% para sanidade e 0% para produção (nem mede). A v2 dá 24% sanidade e 28% produção. **Qual razão é defensável zootecnicamente?**

3. **Que indicadores reprodutivos deveriam ter peso maior?** Hoje o score nem considera variáveis reprodutivas. Para fêmeas, isso é especialmente grave. Como incorporar IEP (intervalo entre partos), taxa de prenhez, idade ao primeiro parto?

### Sobre variáveis a incorporar

4. **GMD e peso × idade são essenciais — como deveriam ser normalizados?** Existe gabarito padrão por raça/categoria/sexo que poderíamos referenciar? Ou cada cliente teria que cadastrar suas próprias curvas?

5. **CAR/RFI (eficiência alimentar) — quando o produtor coleta, faz sentido entrar no score?** Como tratar quando os dados são esparsos (poucos clientes coletam)?

6. **Como integrar genealogia de forma mais rica que binário?** Pai conhecido + mãe conhecida + avós conhecidos (gerações registradas) — devemos pontuar gradualmente?

7. **Certificações ativas (Boi Verde, Rastreabilidade BR, GAP) — entram como variável ou como modificador (multiplicador)?**

### Sobre construção do score

8. **Score deveria ser score absoluto ou relativo ao peer group?** Animal Nelore em pastoreio em GO vs. Angus confinado em SP — devem ser comparáveis pelo mesmo número, ou cada categoria tem sua própria régua?

9. **Score deveria ter componente temporal (derivada)?** Animal subindo de 60 para 80 em 6 meses deveria ter "score" mais valioso que animal estável em 80?

10. **Como tratar venda — deve "congelar" o score ou afetá-lo?** Hoje vender derruba 20 pontos. É correto?

### Sobre integração com sustentabilidade (NeuTroPec)

11. **Como capturar manejo regenerativo de forma auditável?** Rotação de pasto, lotação ajustada, suplementação otimizada — quais sinais o produtor registra que validam manejo regenerativo?

12. **Estimativa de CO2eq por animal — qual metodologia recomendam?** IPCC Tier 2? Embrapa? Existe consenso brasileiro?

13. **Score Agraas e selo de neutralidade tropical — como deveriam interagir?** Score alto = pré-requisito para selo? Selo é dimensão do score? Selo é independente?

### Sobre formato de colaboração futura

14. **Existe espaço, no horizonte que vocês conseguem enxergar, para algum tipo de construção colaborativa de material publicável sobre metodologia de score auditável para pecuária brasileira?** Reconhecemos que essa é uma decisão de longo prazo, que depende de fatores que vocês conhecem melhor que nós — carga acadêmica, agenda de publicações próprias, alinhamento com objetivos do NeuTroPec, sensibilidade institucional sobre vínculo com empresa privada. Estamos abertos ao formato que fizer sentido (ou a nenhum formato — também é uma resposta legítima).

15. **Como vocês imaginam que poderia funcionar essa contribuição metodológica ao longo do tempo, se houver interesse?** Não temos expectativa pré-formada — co-autoria pontual em paper, consultoria técnica formalizada, mentoria continuada sem vínculo escrito, comitê consultivo institucional, ou simplesmente acompanhamento informal da evolução metodológica via sessões como esta. O que mais nos importa é que a metodologia evolua com rigor científico; o formato é discutível e respeitará o que fizer sentido para a agenda de vocês.

---

## Anexo A — Localização exata do código

Para vocês conseguirem auditar diretamente o código se quiserem:

```
Funções no banco PostgreSQL gerenciado:
  - public.refresh_animal_score(uuid)        ← em uso
  - public.recalculate_animal_score(uuid)    ← legado
  - public.calculate_agraas_score(uuid)      ← v2 declarada, não acionada
  - public.refresh_animal_certifications(uuid)
  - public.refresh_animal_passport(uuid)
  - public.refresh_animal_derived_data(uuid)

Triggers acionadores:
  - public.applications        → trg_refresh_from_applications
  - public.weight_records      → trg_refresh_from_weight_records
  - public.animal_certifications → trg_refresh_from_animal_certifications

Migrations relevantes:
  - 036_score_engine.sql        ← v2 (declarada)
  - 048_farm_score.sql          ← score por fazenda
  - 054_livestock_score_engine.sql  ← extensões
  - 067_score_triggers_delete.sql  ← triggers de DELETE
  - 121_fix_refresh_animal_passport.sql ← fix histórico (passport apontava para tabela removida)

Tabelas do score:
  - public.animal_scores (1 linha por animal)
  - public.agraas_master_passport_cache (espelha score em JSON)

Predições IA (Claude Sonnet 4.6) — sistema paralelo:
  - public.ai_predictions
  - app/api/predict-score/route.ts
```

---

## Anexo B — Histórico de decisões do score (contexto)

- **Inicial (não documentado)**: Tabela `animal_scores` criada com 3 pilares: sanitário, operacional, continuidade. Pesos 40/35/25.
- **Migration 036** (introdução do v2): Adicionou `productive_score`, `algorithm_version`, função `calculate_agraas_score` com 5 pilares + bônus. Pesos 28/24/18/20/10 + bonus 0-7. **Mas os triggers nunca foram migrados** para chamar essa função.
- **Migration 121 (mai/2026, hoje)**: Corrigiu `refresh_animal_passport` que apontava para tabela legada `animal_events` (removida). Esse fix expôs o débito da coexistência das três funções.
- **Reset FSJBE (mai/2026, hoje)**: Limpamos dados ilustrativos da FSJBE preparando para o tombamento real Multbovinos → Agraas. Funções legadas referenciando `animal_events` foram dropadas (12 triggers + funções órfãs). Criamos VIEW de compatibilidade `animal_events → events` para preservar funções de leitura ainda usadas.

---

## Encerramento

Este documento foi preparado com transparência máxima, exatamente porque a contribuição de vocês depende de termos colocado tudo na mesa — inclusive (e principalmente) o que está fraco. O Score Engine atual da Agraas é um **ponto de partida funcional, não uma metodologia consolidada**. A oportunidade da mentoria é justamente transformá-lo em algo cientificamente defensável.

Estamos prontos para discutir, ajustar, refatorar — e, idealmente, publicar em conjunto.

Atenciosamente,
**Equipe Agraas**
`lucas@agraas.com.br`

---

> *Documento técnico confidencial — uso restrito à mentoria Agraas × Instituto de Zootecnia de SP.
> Versão 1 · 26 de maio de 2026.*
