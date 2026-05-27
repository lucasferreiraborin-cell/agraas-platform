# Score Agraas v3 — Resumo Executivo para a Mentoria

> **Para**: Dra. Renata Helena Branco Arnandes · Prof. César Franzon
> **De**: Equipe Agraas
> **Sessão**: 29 de maio de 2026
> **Leitura estimada**: 5 minutos. Material técnico completo disponível em documento anexo de mesma data.

---

## Contexto

A Agraas é uma plataforma brasileira em construção desde 2025, voltada à criação de uma camada digital de confiança para o agronegócio nacional. Começamos pela pecuária bovina — cadeia mais regulada (PNIB, EUDR), maior valor agregado por unidade rastreável, modelo de dados extensível para as outras cadeias críticas. Nosso compromisso editorial é construir métricas **auditáveis** em vez de proprietárias. Por isso buscamos vocês.

## Ancoragem científica desta versão

A refatoração v3 do Score Engine, aplicada em produção em **27/05/2026**, foi ancorada na publicação oficial:

> **Costa, F. P.; Dias, F. R. T.; Gomes, R. C.; Pereira, M. A.** *Indicadores de desempenho na pecuária de corte: uma revisão no contexto da Plataforma +Precoce.* Embrapa Gado de Corte · Documentos 237 · 2018.
> <https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090951>

O Score Agraas v3 é apresentado como **implementação Agraas da metodologia Plataforma +Precoce**, adaptada para rastreabilidade individual.

## O que é o Score Engine v3

Pontuação 0-100 atribuída a cada bovino, agregando **5 pilares** com pesos derivados da frequência de citação dos indicadores em Embrapa Doc 237:

| Pilar | Peso v3 inicial | Status |
|---|---|---|
| Produtivo (GMD + Peso × Idade) | 36% | ATIVO |
| Sanidade (histórico + carências + recência) | 25% | ATIVO |
| Reprodutivo (IEP + taxa prenhez + idade ao parto) | — *(redistribuído)* | **PREPARADO** |
| Rastreabilidade (RFID + genealogia + eventos + nascimento) | 29% | ATIVO |
| Certificações & Compliance | 10% | ATIVO |

Score recalculado automaticamente sempre que dados operacionais mudam. Animal vendido tem score **congelado** (não penalizado, conforme metodologia Embrapa de taxa de desfrute).

## O que foi resolvido entre o relatório anterior e esta sessão

Identificamos durante auditoria interna 3 problemas estruturais críticos no Score Engine. **Todos foram resolvidos** na refatoração v3:

**1. Coexistência de três algoritmos diferentes em produção → CONSOLIDADO em função canônica única.**
O banco tinha três funções de cálculo distintas com pesos e fórmulas conflitantes. A migration 123 eliminou as três funções legacy e estabeleceu `calculate_agraas_score_v3` como única fonte de verdade. `algorithm_version = 'v3'` agora reflete a realidade.

**2. Pesos arbitrários sem base científica → ANCORADOS em Embrapa Doc 237.**
A escolha dos 5 pilares e a proporção relativa de pesos seguem agora a frequência de citação dos indicadores na revisão Embrapa. **O que ainda precisa de validação científica de vocês:** os pesos finais exatos (36/25/29/10) e a calibração das gradações por raça.

**3. Multicolinearidade contábil + variáveis-chave ausentes → CORRIGIDOS em parte.**
Aplicações sanitárias agora contam apenas no pilar Sanidade (não mais em dois pilares simultaneamente). GMD, peso × idade-categoria, gradação logarítmica de aplicações, certificações ativas — tudo entrou. **O que falta:** eventos reprodutivos estruturados (pilar PREPARADO), customização por raça, CAR/RFI, métricas de manejo regenerativo (NeuTroPec).

## Variância útil real — antes vs. depois

| Métrica | v1 (até 26/05) | v3 (27/05) |
|---|---|---|
| Score mínimo observado | ~50 | **25.68** |
| Score máximo observado | ~100 (saturado) | **71.58** |
| Score médio dos 58 animais | ~80 (inflacionado) | **43.2** |
| Range útil | 50-100 | **25-72** (discriminação real) |

A v3 deixou de ser "selo verde" superficial e passou a discriminar qualidade efetiva de gestão.

## As 3 perguntas mais importantes para a discussão de 29/05

**A. Os pesos finais entre pilares (Produtivo 36%, Sanidade 25%, Rastreabilidade 29%, Certificações 10%) refletem proporção defensável zootecnicamente?** A escolha dos pilares e a hierarquia relativa estão ancoradas em Embrapa Doc 237 (frequência de citação). Os pesos exatos foram decisão de equipe Agraas. Existe referência específica que valide ou ajuste essa calibração?

**B. Como evoluir o pilar Reprodutivo (PREPARADO) e o gabarito de peso × idade por raça?** Hoje usamos curva Nelore para todos os animais e o pilar reprodutivo está integralmente preparado mas inativo (sem dados estruturados). Qual conjunto mínimo de eventos reprodutivos faz sentido capturar primeiro? Existe gabarito oficial brasileiro de peso × idade por raça (Nelore, Angus, Brangus)?

**C. Como integrar Plataforma +Precoce e NeuTroPec sem desrespeitar escopo institucional?** O Score Agraas v3 pode ser apresentado como **adaptação Agraas da metodologia +Precoce**? Que sinais práticos de manejo regenerativo (rotação de pasto, lotação ajustada, CO2eq estimado) o produtor brasileiro pode capturar hoje sem custo cognitivo proibitivo?

## O que pedimos

Para que a contribuição de vocês não fique abstrata, listamos com franqueza o que mais valorizamos como aporte concreto — sem ordem de prioridade, todos importam:

- **Correções diretas.** Onde a v3 está errada ou ingênua, queremos ouvir. Score errado é score corrigível; metodologia frágil é metodologia que pode ser refeita.

- **Validação dos pesos finais entre pilares**, ou indicação de literatura zootécnica brasileira que ancore proporções diferentes das que adotamos.

- **Gabaritos zootécnicos por raça** (curvas de crescimento Nelore × Angus × Brangus × mestiços) para refinar o subindicador Peso × Idade.

- **Conjunto mínimo de eventos reprodutivos auditáveis** que faça sentido capturar no manejo brasileiro real, ativando o pilar reprodutivo de forma gradual.

- **Calibração com Plataforma +Precoce e NeuTroPec** para que o Score Agraas v3 não nasça desconectado dos programas oficiais Embrapa.

- **Diálogo sobre roadmap conjunto** — em que sequência faz mais sentido evoluir o que está construído, o que pode esperar.

Não temos expectativa de resposta completa em uma sessão. Algumas dessas frentes podem evoluir ao longo de meses. O que pedimos é que a porta fique aberta — e que nos avisem honestamente quando algo do que apresentarmos precisar ser questionado.

---

## Convite

A oportunidade desta sessão é continuar transformando o Score Agraas v3 — já ancorado em Embrapa Doc 237 e tecnicamente consolidado — em **metodologia cientificamente validada por revisão externa**. O documento técnico anexo descreve com transparência total tudo que está construído, tudo que ainda é decisão de equipe Agraas pendente de validação, e tudo que pode evoluir.

Estamos prontos para discutir, ajustar, recuar onde fizer sentido. A presença de vocês neste momento é mais que mentoria pontual: é o que diferencia uma implementação Agraas de uma metodologia validada cientificamente.

Obrigado pela disponibilidade.

— **Equipe Agraas** · `lucas@agraas.com.br`

---

> *Documento de abertura · Mentoria IZ-SP × Agraas · 29 de maio de 2026.
> Score Engine v3 · Migration 123 aplicada em produção em 27/05/2026.*
