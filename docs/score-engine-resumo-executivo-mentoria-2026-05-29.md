# Score Agraas — Resumo Executivo para a Mentoria

> **Para**: Dra. Renata Helena Branco Arnandes · Prof. César Franzon
> **De**: Equipe Agraas
> **Sessão**: 29 de maio de 2026
> **Leitura estimada**: 5 minutos. Material técnico completo disponível em documento anexo de mesma data.

---

## Contexto

A Agraas é uma plataforma brasileira em construção desde 2025, voltada à criação de uma camada digital de confiança para o agronegócio nacional. Começamos pela pecuária bovina — cadeia mais regulada (PNIB, EUDR), maior valor agregado por unidade rastreável, e modelo de dados extensível para as outras cadeias críticas. Nosso compromisso editorial é construir métricas **auditáveis** em vez de proprietárias. Por isso buscamos vocês.

## O que é o Score Engine

Pontuação numérica de 0 a 100 atribuída a cada bovino individualmente, recalculada automaticamente sempre que dados operacionais mudam (aplicações sanitárias, pesagens, certificações), buscando consolidar em um único número a maturidade de rastreabilidade e qualidade de gestão do animal — para uso conjunto de produtor, comprador institucional e (no futuro) sistema financeiro.

## Os 3 achados mais críticos da auditoria interna

Durante o levantamento técnico que preparamos para esta sessão, identificamos três fragilidades estruturais que justificam — sozinhas — a presença de vocês neste momento:

**1. Coexistência de três algoritmos diferentes em produção.**
O banco de dados tem três funções de cálculo do Score Agraas, com pesos e fórmulas distintas. Apenas uma é efetivamente acionada pelos triggers automáticos; as outras existem como artefatos não consolidados. O sistema declara usar a versão mais sofisticada, mas na prática executa a mais simples. **Antes de evoluir, precisamos consolidar uma única fonte de verdade — com pesos defensáveis.**

**2. Pesos arbitrários sem base científica.**
A composição final do score (40% sanidade + 30% operacional + 30% continuidade, na versão em uso) foi escolhida por intuição da equipe, não derivada de literatura zootécnica brasileira. Não temos hoje justificativa metodológica para essas proporções — e este é exatamente o tipo de decisão que precisa do rigor de pesquisadores como vocês.

**3. Ausência completa de variáveis-chave da zootecnia.**
O score atual não considera ganho médio diário (GMD), peso esperado para idade da categoria, raça, sexo, eficiência reprodutiva, eficiência alimentar (RFI/CAR) nem certificações ativas. Essas são exatamente as variáveis que distinguem manejo bom de manejo apenas registrado. A infraestrutura suporta incorporá-las; o que falta é o desenho metodológico correto.

## As 3 perguntas mais importantes para a discussão de 29/05

Selecionadas das 15 questões do documento técnico — são as que mais destravam o caminho metodológico:

**A. Existe literatura zootécnica brasileira que sustente alguma ponderação justificada entre os pilares de manejo bovino que estamos tentando combinar?** Embrapa, IZ-SP, ESALQ — há referências consagradas (CIQ, Boi Verde, gabaritos de categoria) que possamos ancorar?

**B. Como deveriam ser tratadas, no score, as variáveis de desempenho zootécnico — particularmente GMD, peso × idade, e indicadores reprodutivos para fêmeas?** A normalização por categoria (bezerro, recria, terminação) é viável com gabarito padrão, ou precisaria de curvas customizadas por raça e região?

**C. Como integrar manejo regenerativo e métricas ambientais (alinhadas ao NeuTroPec) ao score de forma auditável?** Quais sinais o produtor já registra ou poderia registrar — rotação de pasto, taxa de lotação, suplementação, captura de carbono — que validem manejo regenerativo sem custo cognitivo proibitivo?

## O que pedimos

Para que a contribuição de vocês não fique abstrata, listamos com franqueza o que mais valorizamos como aporte concreto — sem ordem de prioridade, todos importam:

- **Correções diretas.** Onde o que construímos está errado ou ingênuo, queremos ouvir. Score errado é score corrigível; metodologia frágil é metodologia que pode ser refeita.

- **Indicação de literatura zootécnica brasileira aplicável**, ou referência internacional adaptada ao contexto BR, que sustente decisões metodológicas (pesos, normalizações, escolha de variáveis).

- **Apontamento de variáveis-chave ausentes** que deveriam compor o score — particularmente em desempenho zootécnico, eficiência reprodutiva, eficiência alimentar e manejo regenerativo.

- **Calibração com práticas de mercado consagradas** (CIQ, Boi Verde · ABIEC, GAP, programas oficiais brasileiros) — para que o Score Agraas não nasça desconectado do vocabulário e dos padrões já em uso na cadeia.

- **Diálogo sobre roadmap conjunto** — em que sequência faz mais sentido evoluir o que está construído, o que pode esperar, o que precisa ser refeito antes de qualquer outra coisa.

Não temos expectativa de resposta completa em uma sessão. Algumas dessas frentes podem evoluir ao longo de meses. O que pedimos é que a porta fique aberta — e que nos avisem honestamente quando algo do que apresentarmos precisar ser questionado.

---

## Convite

A oportunidade desta sessão é começar a transformar o Score Agraas de **ponto de partida funcional** em **metodologia cientificamente defensável**. O documento técnico anexo descreve com transparência total tudo que está construído, tudo que é frágil, e tudo que pode evoluir — exatamente para colocar a conversa em condições de produtividade real.

Estamos prontos para discutir, ajustar, recuar onde fizer sentido. A presença de vocês neste momento é mais que mentoria pontual: é constitutiva da forma como a metodologia vai existir daqui em diante.

Obrigado pela disponibilidade.

— **Equipe Agraas** · `lucas@agraas.com.br`

---

> *Documento de abertura · Mentoria IZ-SP × Agraas · 29 de maio de 2026.*
