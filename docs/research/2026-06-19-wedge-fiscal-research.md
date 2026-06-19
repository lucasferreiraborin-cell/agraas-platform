# Wedge Fiscal Research — Agraas (2026-06-19)

> Pesquisa profunda disparada por Lucas (CEO) **após pivot 19/06/2026**: módulo Contábil + Fiscal + Controladoria + Estoque como wedge primário. Rastreio bovino vira ATO 2.
>
> Validado por Rodrigo Iafelice dos Santos (mentor). Premissa do briefing: "Aegro levou 11 anos pra chegar a R$30mi e foi adquirida pela Syngenta" — **AMBAS PREMISSAS ESTÃO ERRADAS**, ver Seção A.
>
> Autor: agente `agraas-controladoria-fiscal`. Fontes URL inline. Estimativas marcadas `[est]`.

---

## A. Análise crítica do case Aegro

### A.1 Fundação, funding e status de propriedade

| Item | Dado | Fonte |
|---|---|---|
| Fundação | 2014, Porto Alegre. Quatro engenheiros de computação: Francisco de Borja, Pedro Dusso, Thomas Rodrigues, Paulo Silvestrin | [AgFunder News](https://agfundernews.com/aegro-farm-management-platform-scores-funding-eyes-fintech-opportunity) |
| Funding total | **US$ 3,5 milhões em 4 rodadas** (até hoje) | [Crunchbase Aegro](https://www.crunchbase.com/organization/aegro-2/financial_details) |
| Última rodada conhecida | Seed Jul/2021 — R$ 12 mi (US$ 2,22mi) lead SP Ventures + ABSeed. Participaram SLC Ventures, ADM VC, family offices (Luis Felipe Carchedi, Nizan Guanaes) | [AgFunder News](https://agfundernews.com/aegro-farm-management-platform-scores-funding-eyes-fintech-opportunity) |
| Status | **Independente. NUNCA foi adquirida pela Syngenta.** Syngenta adquiriu Strider (2018), Dipagro e Vipagro (2021) — Aegro não está nessa lista | [Syngenta Press 2018](https://www.syngenta.com/en/company/media/syngenta-news/year/2018/syngenta-acquire-strider), [EqualOcean 2024](https://equalocean.com/news/2024041120758) |
| CEO atual | **Maurício Schneider** (ex-Solubio), trazido em 2026. Co-fundador Pedro Dusso vai pra estratégia/produto/IA | [AgFeed 2026](https://agfeed.com.br/agtech/aegro-traz-mauricio-schneider-ex-solubio-para-a-cadeira-de-ceo-e-preve-crescer-30-ja-em-2026/) |

> **AÇÃO CORRETIVA URGENTE:** corrigir memory `project_pivot_wedge_fiscal_2026_06_19.md` — premissa "Aegro vendida pra Syngenta" é falsa. Isso muda o cálculo de comparable e endgame. Aegro continua **independente, em busca de growth**, e foi a [Strider](https://www.syngenta.com/en/company/media/syngenta-news/year/2018/syngenta-acquire-strider) (não Aegro) que vendeu pra Syngenta em 2018.

### A.2 Receita ano a ano e curva de growth

| Ano | Receita | Hectares sob gestão | Observação | Fonte |
|---|---|---|---|---|
| 2024 | **R$ 30 mi** | 4,2 mi ha | Fechou breakeven | [AgFeed](https://agfeed.com.br/agtech/aegro-mira-pequenos-produtores-para-cobrir-5-milhoes-de-hectares-com-seus-softwares/) |
| 2025 | **~R$ 36 mi** (+20-25%) | ~5 mi ha (anunciado em 2026) | Mudou modelo pra "SaaS ao contrário" (time externo de consultores agronômicos) | [AgFeed SaaS ao contrário](https://agfeed.com.br/agtech/aegro-muda-modelo-de-negocios-para-saas-ao-contrario-e-preve-crescer-25-neste-ano/) |
| 2026 (proj) | **R$ 47 mi** `[est, +30%]` | mira pequenos produtores (<500 ha) | Schneider assume CEO, foco em ganhar escala | [AgFeed CEO](https://agfeed.com.br/agtech/aegro-traz-mauricio-schneider-ex-solubio-para-a-cadeira-de-ceo-e-preve-crescer-30-ja-em-2026/) |

**Ticket médio implícito 2024** `[est]`: R$ 30mi / 4,2mi ha = **R$ 7,14/ha/ano**. Para uma fazenda média de grãos de 1.000ha = R$ 7.140/ano ≈ R$ 595/mês. Isso bate com o discurso "pricing por hectare" do [Capterra](https://www.capterra.com/p/216112/Aegro/) (preço sob consulta).

### A.3 O que freou a Aegro — diagnóstico

Não foram 11 anos pra chegar a R$30mi por falta de produto. Foram por **3 fatores estruturais**:

1. **SaaS puro não basta no rural** — Aegro foi obrigada a inverter o modelo: passou de "100% time em escritório" para um "time-camp" de consultores agronômicos externos rodando fazenda por fazenda. Isso é caro, não escala como SaaS clássico, mas é a única forma de fazer onboarding de produtor tradicional. Confissão pública via [AgFeed](https://agfeed.com.br/agtech/aegro-muda-modelo-de-negocios-para-saas-ao-contrario-e-preve-crescer-25-neste-ano/).
2. **Capital limitado** — US$ 3,5mi em 11 anos é pouquíssimo para Brasil. Comparar com Omie que captou R$855mi só em Set/2025 ([NeoFeed](https://neofeed.com.br/startups/omie-levanta-r-855-milhoes-a-maior-rodada-de-2025/)). Aegro cresceu organicamente, sem firepower de growth.
3. **Foco em médio/grande produtor de grãos** — só agora pivotou para pequeno produtor (<500ha). O mercado de pequeno é maior em número, menor em ticket, mas tem menos resistência tecnológica que Aegro imaginava.

**Implicação Agraas — 3 lições + 3 armadilhas:**

| Lição (copiar) | Armadilha (evitar) |
|---|---|
| 1. Inverter o modelo cedo: aceitar que rural precisa de "human-in-the-loop" — usar IA pra escalar o consultor, não substituí-lo | 1. Não tentar SaaS self-service puro no produtor tradicional — vai morrer no onboarding |
| 2. Pricing por unidade física (hectare ou cabeça) é defensável e escala com fazenda | 2. Não captar R$ 12mi e achar que vai escalar — o ciclo agtech BR exige capital paciente E firepower |
| 3. Canal contador rural / cooperativa é a única forma de pular a barreira de confiança | 3. Não brigar de cara com Aegro no produtor de grão — é território deles. Entrar por pecuária + contábil onde Aegro é fraca |

---

## B. APIs e infraestrutura de NF-e BR 2026

### B.1 Limite e regra do SEFAZ direto

**Rate limit consulta NFe via webservice SEFAZ:**
- **20 consultas por hora por CNPJ** (não por aplicação). Bloqueio automático de 1 hora ao estourar (rejeição 656 — Consumo Indevido) — [FSist](https://www.fsist.com.br/ajuda/artigos/limite-de-20-consultas-por-hora/), [Focus NFe Rejeição 656](https://focusnfe.com.br/blog/rejeicao-656/).
- Para baixar XML por chave: **necessário certificado digital A1** (e-CNPJ ou e-CPF padrão ICP-Brasil) + automação técnica.
- Manifestação do Destinatário Eletrônica (MDe) está disponível desde 2020 para PF; novas regras vigem até 03/08/2026 pelo Ajuste SINIEF 49/2025 ([Portal SPED MG](https://portalsped.fazenda.mg.gov.br/spedmg/nfe/Manifestacao-do-Destinataro/)).
- Existe **NT 2026.004** — chave de acesso aceita caracteres alfanuméricos (A-Z + 0-9) para suportar CNPJ Alfanumérico que vem em 2026/2H ([ConsultaDanfe](https://consultadanfe.com/)).

**Implicação Agraas:** consulta direta SEFAZ não escala. Para 1.000 fazendas com 50 NFe/mês cada = 50k consultas/mês — vs limite SEFAZ de 480/mês por CNPJ. Resposta: **camada de cache + API paga** (Focus/PlugNotas) + ingestão alternativa (PDF/áudio/manual).

### B.2 Comparativo de APIs pagas (2026)

| Provedor | Posição | Diferencial | Volume público | Preço público |
|---|---|---|---|---|
| **Focus NFe** | Líder em volume desenvolvedor | API REST, planos Solo/Start/Growth/Enterprise, 30 dias grátis, sem fidelidade | 860mi+ notas processadas, 33k empresas | Plano Solo a partir de ~R$ 50/mês `[est, sob consulta]` — [Focus NFe planos](https://focusnfe.com.br/precos/) |
| **PlugNotas (TecnoSpeed)** | Líder histórico em software house | Atende 2k+ software houses, 200 colaboradores especialistas | n/d | Sob consulta — [PlugNotas](https://plugnotas.com.br/nfe/) |
| **NFe.io** | Pioneira | Antecipa mudanças regulatórias, performance em volume | n/d | Sob consulta — [NFe.io](https://nfe.io/docs/) |
| **eNotas** | PJ digital | Foco PJ digital | n/d | Planos em [enotas.com.br](https://enotass.com.br/notas) |
| **Nuvem Fiscal** | **SAIRÁ DO MERCADO** — desativada em 31/07/2026 | — | — | n/a |

**Custo médio estimado por NFe processada via API paga** `[est]`: R$ 0,05 a R$ 0,20/nota dependendo do volume e do plano. Para 50k NFe/mês = **R$ 2.500 a R$ 10.000/mês** de custo fiscal de infra. Negociável em volume alto.

**DANFE:** geração PDF a partir da chave/XML é commodity, várias libs Node/.NET fazem; sem custo significativo.

### B.3 Como acessar NF-e SÓ pelo número (44 dígitos)

**Caminhos viáveis (do mais barato pro mais caro):**
1. **Portal nfe.fazenda.gov.br** — manual, sem cadastro, gera DANFE PDF mas não retorna XML estruturado. Não escala para automação.
2. **API paga Focus/PlugNotas** — `GET /v2/nfe/{chave_44}` retorna XML completo + protocolo. Requer certificado A1 vinculado a quem está consultando (manifestação como destinatário ou autorização legal).
3. **Cliente envia XML pela MDe** — a partir do momento que o produtor é configurado como destinatário e dá ciência via Manifestação Eletrônica, a SEFAZ libera o XML. Esse é o caminho **legítimo e escalável**.

> **Ação Agraas:** integração com Focus NFe + automação de manifestação MDe por procuração eletrônica. Sem A1 vinculado, "só com o número" é manual.

---

## C. Estado da arte IA contábil para PME/rural

### C.1 Conta Azul (Conta AI)

- Produto **Conta AI Captura** (2026): documento via WhatsApp / e-mail / upload / DDA → leitura por IA → lançamento automático no ERP. Caso de uso: comercial fotografa nota em viagem, sistema cataloga sozinho.
- Reports com IA: 50+ relatórios customizáveis (cash flow, DRE, contas a pagar/receber).
- Fonte: [Conta Azul blog Conta AI Captura](https://contaazul.com/blog/conta-ai-captura/), [Conta Azul IA contabilidade](https://contaazul.com/blog/parceiros/inteligencia-artificial-na-contabilidade/).

### C.2 Omie.IA Fiscal

- Módulo nativo do ERP. Classificação fiscal de mercadorias automatizada, sugestão de tributação correta, **preparado para IBS/CBS da Reforma Tributária**.
- Foco em "monitor fiscal" — varre lançamentos e identifica divergências/risco.
- Fonte: [Omie Store IA Fiscal](https://store.omie.com.br/apps/omie-ia-fiscal), [Omie blog IA contabilidade](https://www.omie.com.br/blog/como-a-inteligencia-artificial-esta-transformando-a-contabilidade/).

### C.3 Bling / NotaSimples / outros

- Bling: foco em emissão automática NFe/NFSe/NFCe para e-commerce, sem IA forte de leitura.
- OCR + IA específico para captura de NFSe (modelo brasileiro especializado): Qive Lite e similares.
- Fonte: [Bling NFe](https://www.bling.com.br/funcionalidades/nota-fiscal-eletronica), [Qive OCR](https://qive.com.br/blog/consulta-nfse-via-ocr).

### C.4 Custo de processamento via LLM (estimativa Agraas)

**Cenário base:** ingestão multimodal de 1 NFe (XML estruturado ~5KB, ~3.000 tokens em prompt).

| Modelo | Input ($/Mtok) | Output ($/Mtok) | Custo por NFe (in 3k + out 1k tokens) | Para 50k NFe/mês |
|---|---|---|---|---|
| Claude Sonnet 4.6 | $3,00 | $15,00 | ~$0,024 (~R$ 0,13) | ~R$ 6.500/mês |
| Claude Haiku 4.5 `[est]` | $1,00 `[est]` | $5,00 `[est]` | ~$0,008 (~R$ 0,04) | ~R$ 2.000/mês |
| Sabiá-3 (Maritaca) | R$ 5/Mtok in | R$ 10/Mtok out | R$ 0,025 | ~R$ 1.250/mês |
| Whisper (áudio) | $0,006/min | — | $0,006 por nota oral de 1min | ~R$ 1.500/mês `[se 50k áudios]` |

Fontes: [Claude API pricing 2026](https://www.cloudzero.com/blog/claude-api-pricing/), [Maritaca Sabiá-3](https://www.guilhermefavaron.com.br/p/sabia-2-o-novo-modelo-de-linguagem-em-portugues-que-rivaliza-com-gpt-4-maritaca-ai), [Whisper pricing](https://tokenmix.ai/blog/whisper-api-pricing).

**Implicação Agraas:**
- Sonnet 4.6 já dá pra rodar produção (R$ 6,5k/mês a 50k NFe é menor que 1 ticket Avançado Conta Azul). Com prompt caching cai 90% no input cacheado.
- Sabiá-3 é competitivo em R$/token e roda em português nativo — **vale POC** mas Claude tem advantage em tool use estruturado.
- Whisper para ingestão de áudio ("manda áudio pro WhatsApp do contador Agraas") = USP único.

### C.5 Forças e limitações do Claude para parsing NFe

**Forças:**
- XML estruturado é leitura quase perfeita (NF-e tem XSD bem definido, schema previsível).
- Tool use estruturado: pode emitir JSON com débito/crédito direto.
- Multimodal nativo: PDF, imagem, áudio (via Whisper antes), texto, XML.

**Limitações:**
- Não substitui validação determinística de schema (use lib específica antes do LLM para validar XSD).
- Custo escala com volume — necessário cache + batch (50% off) para volumes altos.
- Alucinação em campos numéricos: SEMPRE confirmar valores extraídos contra fonte original (XPath direto no XML).

---

## D. Plano de contas rural BR 2026

### D.1 LCDPR (PF rural)

- **Obrigatoriedade 2026:** receita bruta anual ≥ R$ 4,8 milhões (CY 2025 entregue até 30/04/2026).
- Cada lançamento exige: conta bancária específica + propriedade rural registrada CAEPF.
- Conta bancária separada da atividade é **essencial**.
- Mesmo no Lucro Presumido (20% da receita), se obrigado ao LCDPR, detalhar tudo no arquivo digital.
- Fonte: [Virtual Compliance LCDPR](https://virtualcompliancecontabil.com.br/ir-e-lcdpr-livro-caixa-digital-do-produtor-rural-em-2026/), [Senior LCDPR](https://www.senior.com.br/blog/livro-caixa-digital-produtor-rural).

### D.2 Plano de contas PJ rural (ECD)

Estrutura padrão CPC 29 (Ativo Biológico) para pecuária:

| Classe | Subgrupo | Conta exemplo |
|---|---|---|
| Ativo Circulante | Ativo Biológico Maduro | Bovinos para abate (24-36 meses, prontos venda) |
| Ativo Circulante | Ativo Biológico Imaturo | Bezerros 0-12m, garrotes 13-23m, novilhos 24-36m em engorda |
| Ativo Não Circulante | Imobilizado / Permanente | Matrizes (vacas reprodutoras), reprodutores, semoventes de trabalho |
| Custo | Custos cria | Ração, sal mineral, vacinas, mão de obra rateada |
| Custo | Custos recria | Pastagem, vermífugos, mão de obra |
| Custo | Custos engorda | Ração de terminação, suplementação, sanidade |
| Receita | Venda animal | Boi gordo, vaca gorda, bezerro desmama, reprodutor |
| Despesa | Depreciação | Cercas, currais, máquinas, benfeitorias |

Fonte: [Núcleo do Conhecimento — Tratamento contábil bovino](https://www.nucleodoconhecimento.com.br/contabilidade/setor-bovino), [Tese USP planejamento cria/recria/engorda](https://teses.usp.br/teses/disponiveis/11/11132/tde-20190821-124020/publico/GuedesTerezaMatildeMarsicano.pdf).

### D.3 Regimes de apuração IRPF Atividade Rural 2026

- **Lucro Real** — Livro Caixa rural com receitas, despesas custeio, investimentos. Tributação sobre o resultado real.
- **Lucro Presumido 20%** — sem necessidade de Livro Caixa se receita anual ≤ R$ 56.000. Acima, precisa LCDPR.
- **Arbitramento 20%** — quando não há escrituração obrigatória, fisco arbitra 20% da receita bruta.
- Fonte: [Portal Tributário IRPF Atividade Rural](https://www.portaltributario.com.br/artigos/irpfatividaderural.htm), [Receita Federal IRPF Atividade Rural PDF](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/auditoria-fiscal/arquivos/irpf-atividade-rural.pdf).

### D.4 Reforma Tributária 2026 — IBS/CBS no rural

- **Vigência:** 01/01/2026 com transição até 2033 (LC 214/2025).
- Produtor (PF/PJ) com receita < R$ 3,6 mi/ano **pode optar** por NÃO ser contribuinte IBS/CBS.
- Produtos in natura: **redução 60%** da alíquota. Hortifruti/ovos: **redução 100%**.
- **CNPJ Alfanumérico** previsto até 2H2026 para cada produtor rural — PF não vira PJ por isso.
- **FUNRURAL** elevado: 1,5% → 1,63% sobre receita bruta a partir de 01/04/2026 (LC 224/2025).
- Notas fiscais já têm campos IBS/CBS desde 01/2026 — indicar se contribuinte ou não.
- Fonte: [ConJur IBS/CBS rural](https://www.conjur.com.br/2026-jan-17/diferimento-de-ibs-e-cbs-de-insumos-agricolas-a-conta-vai-ficar-para-o-produtor-rural/), [Aegro blog IBS CBS](https://aegro.com.br/blog/ibs-e-cbs/), [Trad Cavalcanti 2026](https://www.tradecavalcanti.com.br/publicacoes/reforma-tributaria-agronegocio-2026).

**Implicação Agraas:** o módulo fiscal **PRECISA** suportar:
1. Decisão de optar/não optar pelo regime IBS-CBS (calculadora de break-even por fazenda).
2. Cálculo das alíquotas reduzidas in natura por NCM.
3. CNPJ Alfanumérico (NT 2026.004) — antecipar.
4. Nova alíquota FUNRURAL a partir de 04/2026.

---

## E. Cash flow management para fazenda

### E.1 Particularidades do ciclo

| Característica | Pecuária corte | Grãos | Impacto cash flow |
|---|---|---|---|
| Sazonalidade receita | Concentrada em abate (24-36m do nascimento ou compra) | Concentrada em colheita (safra) | Receita irregular — meses sem entrada |
| Sazonalidade custo | Distribuída ao longo do ano (ração, sanidade, mão de obra) | Concentrada em plantio + manejo | Despesa contínua vs receita pontual |
| Ciclo produtivo | 24-36 meses (ciclo completo); 8-12m (recria/engorda) | 90-180 dias por safra | Capital de giro grande exigido |
| Frequência de monitoramento | Mensal/semanal para confinamento e leiteira | Mensal/trimestral para grão grande | Sistema precisa adaptar granularidade |

Fonte: [Aegro Fluxo de Caixa Rural](https://aegro.com.br/blog/fluxo-de-caixa-rural/), [Pecuária de Precisão — Além do Fluxo de Caixa](https://apecuariadeprecisao.com.br/blog/gestao-financeira-fazenda-mais-que-fluxo-de-caixa/).

### E.2 Ferramentas concorrentes para cash flow rural

- **Aegro** — módulo nativo "Gestão Financeira da Propriedade Rural" + LCDPR + DRE.
- **JetBov** — planilha Excel/Google Sheets de fluxo de caixa pecuária + módulo na plataforma.
- **MyFarm, Agrare, Pecuária de Precisão** — soluções verticais menores.
- **PowerBI customizado** — várias consultorias agro (Rehagro, Pecuária de Precisão) entregam dashboards para grandes propriedades.

### E.3 IA para projeção de cash flow rural

**Estado da arte hoje:**
- Ninguém faz bem projeção animal-a-animal × cotação @ futura × custo unitário.
- JetBov e Aegro entregam projeção de peso/abate, mas a integração com cash flow é manual.

**Gap óbvio Agraas:** projeção determinística **mês a mês por animal** = ganho médio diário (GMD) × idade × cotação @ projetada → entrada de caixa esperada por animal. Cruzar com despesa rateada por cabeça → margem unitária em tempo real. Isso já alimenta dashboard banco/frigorífico/produtor.

---

## F. Monetização Aegro vs Conta Azul vs Omie

### F.1 Pricing

| Player | Ticket entry | Ticket avançado | Modelo de cobrança | Volume clientes | Fonte |
|---|---|---|---|---|---|
| **Aegro** | Sob consulta (~R$ 595/mês para 1.000ha `[est]`) | Sob consulta | **Por hectare**, sob proposta | n/d (4,2mi ha em 2024) | [Capterra](https://www.capterra.com/p/216112/Aegro/) |
| **Conta Azul** | R$ 119,90/mês (Essencial anual) | R$ 539,90/mês (Performance anual) | Por plano | 100k+ clientes (estimado público) | [Conta Azul preços 2026](https://www.compararsoftware.com.br/contabilidade/articulos/conta-azul-precos-planos) |
| **Omie** | Omie.Fit gratuito (até R$180k AR + 10 NFe/mês), Full a partir de R$ 99/mês | Variável | Por receita / por módulo | 180k clientes em 2026 | [Clareza Gestão](https://clarezagestao.com/omie-precos-planos-2026) |

### F.2 ARR e crescimento comparativo

| Player | ARR 2025 | Crescimento | Clientes |
|---|---|---|---|
| Omie | R$ 600 mi (~US$ 100mi) | Cash-positive desde Jun/2023 | 180k |
| Conta Azul | n/d (R$ 200mi+ ARR estimado público) | n/d | 100k+ |
| Aegro | ~R$ 36 mi (proj 2025) | +20-25% a.a. | 4,2-5mi ha |

### F.3 Pricing power — lições para Agraas

- **Omie** ganha em **canal contador** (27k contadores parceiros = exército de venda recorrente). Cliente paga R$ 99-700/mês, contador é gratuito mas é quem leva o cliente.
- **Conta Azul** ganha em **upsell vertical** (Essencial → Avançado → Performance), tickets podem 5x conforme PME cresce.
- **Aegro** ganha em **integração field-to-office** mas com escala lenta — falta canal de growth.

**Pricing power score** `[est]`: Omie > Conta Azul > Aegro.

**Ticket Agraas sugerido `[est]`:**
- Plano Cria (até 500 cabeças): R$ 99-149/mês
- Plano Recria/Engorda (500-2.000 cabeças): R$ 299-499/mês
- Plano Ciclo Completo (2.000+ cabeças ou grãos+pecuária): R$ 799-1.499/mês
- Contador parceiro: 0 R$. Receberia % do ticket por indicação ativa (5-15%).

Ticket alvo final (CY2028) `[est]`: ~R$ 350/mês × 5.000 produtores = **R$ 21 mi ARR** — meta agressiva mas factível.

---

## G. Roadmap MVP fiscal em 3-6 meses

### G.1 MVP 90 dias (Fase 0)

**Objetivo:** validar com 3-5 fazendas piloto a hipótese "Agraas faz o trabalho do contador rural sem erros".

**Inclui:**
1. **Ingestão NFe XML** — upload manual + integração Focus NFe (manifestação destinatário). Parse com lib determinística + validação Claude para campos incertos.
2. **Plano de contas pecuária** — CPC 29 com classes biológico maduro/imaturo + cria/recria/engorda hardcoded.
3. **Cash flow básico** — D-30 a D+90 mês a mês, entrada/saída categorizadas.
4. **Estoque animal** — 1 animal = 1 ativo biológico; transição entre fases gera lançamento contábil.
5. **Export LCDPR / Livro Caixa** — gerar arquivo .txt no layout Receita Federal.

**Exclui (próximas ondas):**
- Emissão NFP-e (deixar para Fase 2)
- Multimodal áudio/PDF (Fase 1)
- Reforma Tributária IBS/CBS calculadora (Fase 2)
- Crédito rural / risco bancário (Ato 2/3)

### G.2 Fase 1 (90-180 dias) — diferencial multimodal

1. **Áudio WhatsApp** — produtor manda áudio "vendi 30 bois a R$340 a arroba pra fulano", IA gera draft de NF e pergunta confirmação.
2. **PDF DANFE** — IA extrai dados de PDF impresso/scanneado (forças do Claude multimodal).
3. **Consulta por chave 44 dígitos** — quando produtor passa chave WhatsApp/voz, Agraas busca XML via API Focus.
4. **Conciliação bancária** — Open Finance para puxar extrato e bater com NFe automaticamente.

### G.3 Fase 2 (180-270 dias) — escala via canal contador

1. **Portal Contador Agraas** — contador parceiro acessa todos os clientes em uma view, faz revisão, sinaliza erros, valida lançamentos.
2. **Emissão NFP-e** — integrar Focus NFe para emissão dentro da plataforma.
3. **IBS/CBS Calculator** — comparar regime Cumulativo vs Não-Cumulativo por produtor.
4. **EFD-Reinf e DCTFWeb** — automatizar para produtor PJ.

### G.4 Validação dos 3-5 pilotos

**Critérios go/no-go para escalar:**
- Tempo médio de fechamento contábil mensal: **redução ≥ 50%** vs processo atual do contador.
- Acurácia de classificação fiscal automática: **≥ 95%** (validado por contador).
- NPS produtor: **≥ 50**. NPS contador: **≥ 30** (contador é mais cético).
- Churn em 90 dias: **< 10%**.

---

## INSIGHTS COMPETITIVOS (5)

1. **Aegro tem cash flow mas não tem fiscal real** — Aegro entrega "fluxo de caixa rural" + DRE básico, mas LCDPR é um módulo pago à parte e a integração com NFe rural ainda é manual. **Gap: Agraas pode entrar com fiscal nativo + NFe ingestão automática + LCDPR completo.**
2. **Omie tem fiscal completo mas zero contexto agro** — não conhece estoque biológico (CPC 29), não classifica cria/recria/engorda, não calcula FUNRURAL no padrão produtor PF/PJ rural. **Gap: vertical agro.**
3. **Conta Azul investiu em "Conta AI Captura" via WhatsApp** — mas é genérico (qualquer setor). **Gap: Agraas faz captura WhatsApp ESPECIALIZADA em vocabulário rural (cabeças, arroba, GTA, NFP-e, talhão, safra)** — vocabulário que IA generalista erra mais.
4. **Ninguém faz multimodal áudio para rural** — produtor brasileiro usa WhatsApp áudio 10x mais que texto. Quem entregar "manda áudio que eu lanço" vence onboarding de produtor de 50+ anos. Whisper + Claude resolve essa stack a R$ 0,02-0,05/nota.
5. **Canal contador rural é greenfield** — Omie tem 27k contadores parceiros mas quase nenhum é especialista rural. **Existe um nicho de ~3.000 contadores rurais ativos no Brasil** `[est, validar]` que estão ávidos por ferramenta que entenda LCDPR + IBS/CBS rural. Recrutar 200-500 contadores rurais parceiros = canal de growth defensável.

## RISCOS (3)

1. **Reforma Tributária 2026-2033 é movediça** — campos IBS/CBS na NFe estão sendo ajustados em tempo real; uma NT publicada errado pelo time Agraas vira passivo fiscal pro cliente. **Mitigação:** consultoria fiscal de plantão + delay deliberado de 90 dias após publicação SEFAZ.
2. **Dependência de API paga (Focus/PlugNotas)** — se Focus subir preço ou cair, Agraas para. **Mitigação:** abstração de driver desde dia 1 (Driver pattern: `NFeProvider.fetchByChave()`); contratar 2 provedores em paralelo após escala.
3. **LLM hallucination em valor monetário/CNPJ** — Claude pode "ler" R$ 3.400 quando o XML diz R$ 34.000. Cliente perde dinheiro, Agraas perde reputação. **Mitigação:** pipeline obrigatória: 1) parse XSD determinístico, 2) LLM SÓ para campos não-numéricos (descrição, NCM sugestão), 3) double-check com regra hardcoded antes de gravar.

## RECOMENDAÇÕES ARQUITETURAIS (2)

### Rec 1 — Pipeline de ingestão NFe multimodal com 3 camadas (Determinístico → LLM → Confirmação humana)

```
INPUT (XML / PDF / Imagem / Áudio / Chave / CSV)
   │
   ▼
[Camada 1 — Determinística]
  • XML: parse com lib (xml2js + XSD validate)
  • PDF: pdf-parse + tabular extraction
  • Áudio: Whisper transcribe (pt-BR)
  • Chave: Focus NFe API consulta
   │
   ▼
[Camada 2 — Claude Sonnet 4.6 com tool use estruturado]
  • Recebe: dados extraídos + plano de contas Agraas
  • Tool: classify_account(item, ncm) → conta D/C
  • Tool: detect_anomaly(value, vendor, history) → flag
  • Tool: suggest_correction(field, value) → review
   │
   ▼
[Camada 3 — Confirmação contador / produtor]
  • Items high-confidence (>95%): auto-aprovado
  • Items medium (80-95%): aprovação 1-click
  • Items low (<80%): revisão obrigatória
   │
   ▼
LANÇAMENTO CONTÁBIL no Supabase
  • Tabela: ledger_entries (immutable, append-only)
  • Trigger: atualiza stock_batches, animal_cost_summary, cash_flow_projection
```

**Por que escala sem erros:**
- Camada 1 é zero-risco (lib determinística).
- Camada 2 só age em campo ambíguo, com tool use forçando JSON estruturado.
- Camada 3 cria audit trail + confiança contador.
- Prompt caching corta custo Claude 90% para plano de contas repetido.
- Reversibilidade total: ledger append-only, qualquer correção é nova entry com referência.

### Rec 2 — Schema Supabase: separar `raw_documents` de `accounting_entries` desde o dia 1

```sql
-- Camada de origem (qualquer fonte, sem validação)
CREATE TABLE raw_documents (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients(id),
  source_type text CHECK (source_type IN ('xml_nfe','pdf','audio','image','manual','api_focus','whatsapp')),
  source_payload jsonb,       -- conteúdo original
  source_hash text UNIQUE,    -- dedup
  received_at timestamptz DEFAULT now(),
  ingestion_status text       -- pending / parsed / failed / duplicate
);

-- Camada de extração (resultado do parsing, antes do contábil)
CREATE TABLE parsed_documents (
  id uuid PRIMARY KEY,
  raw_document_id uuid REFERENCES raw_documents(id),
  doc_type text,              -- nfe, nfse, recibo, gta, conta_bancaria
  chave_nfe text,             -- 44 dígitos quando aplicável
  emitter_cnpj text,
  receiver_cnpj text,
  total_value numeric(14,2),
  items jsonb,                -- array de itens
  ai_confidence numeric(3,2), -- 0.00-1.00 do Claude
  ai_flags jsonb,             -- anomalias detectadas
  reviewed_by uuid,           -- contador que validou
  reviewed_at timestamptz
);

-- Camada contábil (immutable, append-only, audit-ready)
CREATE TABLE accounting_entries (
  id uuid PRIMARY KEY,
  parsed_document_id uuid REFERENCES parsed_documents(id),
  client_id uuid REFERENCES clients(id),
  entry_date date NOT NULL,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount numeric(14,2) NOT NULL,
  history text,
  reversed_by uuid REFERENCES accounting_entries(id), -- reversão = nova entry, não UPDATE
  created_at timestamptz DEFAULT now()
);

-- RLS: client_id em tudo. Contador parceiro tem role 'accountant'
-- que vê N clientes via tabela accountant_client_mappings.
```

**Por que escala sem erros:**
- `raw_documents` é evidência forense (cliente pode pedir "me mostra o áudio original").
- `parsed_documents` é zona de revisão (contador trabalha aqui, ainda não tocou o contábil).
- `accounting_entries` é immutable — qualquer estorno é nova entry. Audit trail perfeito.
- Dedup automático por hash impede que NFe enviada 2x (XML + chave) duplique lançamento.
- Separação faz com que: reprocesso de IA (Claude v2 melhor) NÃO destrói o contábil — só gera novo `parsed_document` candidato, contador revisa.

---

## Resumo executivo (≤ 700 palavras)

### Premissa do briefing — corrigir

A premissa de que "Aegro foi vendida pra Syngenta e levou 11 anos pra R$30mi" está parcialmente errada. **Aegro NÃO foi adquirida pela Syngenta** (Syngenta comprou a Strider em 2018, não Aegro). Aegro segue **independente**, captou apenas US$ 3,5 mi em 4 rodadas, fechou 2024 com R$ 30 mi (4,2 mi ha) e projeta R$ 47 mi em 2026 sob novo CEO Maurício Schneider (ex-Solubio). Isso muda 2 coisas pra Agraas: (i) Aegro continua mercado contestável, não fortaleza Syngenta; (ii) o "gargalo de 11 anos" foi capital escasso + recusa em inverter modelo SaaS — não falta de produto. **Ação:** atualizar memory `project_pivot_wedge_fiscal_2026_06_19.md`.

### 5 Insights Competitivos
1. **Aegro tem cash flow mas zero fiscal nativo.** LCDPR é módulo separado, NFe rural ingere manual. Espaço pra Agraas entrar com fiscal-first.
2. **Omie tem fiscal completo mas zero contexto agro.** Não conhece CPC 29 (ativo biológico), nem regime IRPF Atividade Rural, nem cria/recria/engorda.
3. **Conta Azul lançou "Conta AI Captura" via WhatsApp** mas é genérico. Vocabulário rural (cabeça, @, GTA, talhão, safra) é gap explícito.
4. **Multimodal áudio é greenfield no rural.** Produtor brasileiro vive no WhatsApp áudio. Whisper (R$ 0,03/min) + Claude Sonnet 4.6 (R$ 0,13/NFe) torna "manda áudio que eu lanço" economicamente viável.
5. **Canal contador rural é desocupado.** Omie tem 27k contadores parceiros mas quase nenhum especialista rural. Existem ~3k contadores rurais ativos no Brasil `[est, validar]` — recrutar 200-500 dá moat defensável.

### 3 Riscos do pivot wedge fiscal
1. **Reforma Tributária 2026-2033 é movediça.** NT errada vira passivo fiscal do cliente. Mitigação: consultoria fiscal de plantão + delay deliberado 90d após publicação SEFAZ.
2. **Dependência crítica de API NFe paga (Focus/PlugNotas).** Se cair, Agraas para. Mitigação: Driver pattern com fallback de 2+ provedores.
3. **LLM hallucination em valor monetário / CNPJ.** Cliente perde dinheiro. Mitigação: pipeline 3 camadas — parse determinístico XSD primeiro, LLM só em campo ambíguo, double-check hardcoded antes do ledger.

### 2 Recomendações Arquiteturais
1. **Pipeline ingestão multimodal 3 camadas:** Determinístico (XML/PDF/Áudio parsed) → Claude com tool use estruturado (classificação contábil + detecção anomalia) → Confirmação humana (auto-aprovado >95% confiança, 1-click 80-95%, revisão <80%). Escala porque o LLM nunca toca campo numérico sem validação hardcoded e prompt cache corta custo 90%.
2. **Schema Supabase com 3 camadas isoladas:** `raw_documents` (evidência forense, qualquer fonte) → `parsed_documents` (zona de revisão do contador) → `accounting_entries` (immutable, append-only, audit-ready, reversão = nova entry). Dedup por hash impede duplicação; reprocesso de IA não destrói contábil.

### Roadmap em uma frase
- **MVP 90d:** ingestão NFe XML + plano de contas pecuária CPC 29 + cash flow básico + estoque animal + LCDPR export.
- **Fase 1 (90-180d):** áudio WhatsApp + PDF + chave 44 dígitos via Focus + conciliação bancária Open Finance.
- **Fase 2 (180-270d):** portal contador parceiro + emissão NFP-e + calculadora IBS/CBS + EFD-Reinf.

### Endgame possível pra Lucas mostrar pro Rodrigo
Se Agraas atingir 5.000 produtores em 36 meses a ticket médio R$ 350/mês = **R$ 21 mi ARR** com vertical agro + IA multimodal + canal contador rural. Em SaaS BR com Rule of 40 > 50, multiplier 7-9x ARR ([SaaS multiples 2026](https://aventis-advisors.com/saas-valuation-multiples/)) = **valuation R$ 150-190 mi**. Acima de Aegro hoje (R$ 36 mi ARR sem multimodal + agro+fiscal). Endgame natural: aquisição estratégica por Conta Azul/Omie buscando vertical agro, ou por Marfrig/JBS buscando relacionamento direto com cadeia.
