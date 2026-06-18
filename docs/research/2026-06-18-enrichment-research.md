# Enrichment Research — Agraas (2026-06-18)

> Pesquisa profunda disparada por Lucas (CEO) para enriquecer racional, plataforma e tese da Agraas
> no contexto da expansão para "Omie do Agro" — wedge controladoria + fiscal + contábil aplicado
> a pecuária bovina e safras de grãos.
>
> Autor: agente `agraas-controladoria-fiscal`. Fontes citadas inline.

---

## A. Benchmark ERP/Contábil BR para PME e rural

### A.1 Omie (Marcelo Lombardo)

**Fundadores e história**
- Fundada em 2013 por Marcelo Lombardo como spin-off de empresa anterior (ERP para grandes indústrias) que ele vendeu para grupo americano.
- Lombardo foi parte da "primeira geração de ERPs brasileiros" antes de virar a tese para SMB cloud.

**Métricas públicas (2025 → 2026)**
- ARR R$ 600 milhões em 2025, projetando US$ 100 milhões ainda em 2025.
- Cash-positive desde junho/2023.
- 180.000 clientes ativos (+50% vs base de 125k citada em 2024).
- 27.000 escritórios contábeis parceiros — o canal de growth chave.
- R$ 35 bilhões em notas fiscais processadas por mês = ~3,5% do PIB brasileiro.
- Meta 2031: US$ 1 bilhão de receita + 1 milhão de clientes.
  - Fontes: [NeoFeed — Omie R$855mi](https://neofeed.com.br/startups/omie-levanta-r-855-milhoes-a-maior-rodada-de-2025/), [Endeavor](https://old.endeavor.org.br/historia-de-empreendedores/omie/), [Experience Club](https://experienceclub.com.br/tres-segredos-do-sucesso-da-omie-que-projeta-faturar-r-1-bilhao-em-2030/).

**Rodada Set/2025 — Série D**
- R$ 855 milhões (a maior rodada de startup BR em 2025).
- Liderada por Partners Group (PE suíço, US$ 170bi AUM) com cheque de R$ 570mi — primeiro growth equity em BR do fundo.
- Valuation pré-money US$ 700 milhões (+70% sobre rodada anterior).
- Rodada majoritariamente SECUNDÁRIA: deu saída parcial a Softbank, Riverwood, Astella, Tencent, Dynamo, HIX, Bogari, Brasil Capital.
- Implicação: estágio "consolidação líder", não growth puro.

**Arquitetura de produto**
- Arquitetura API-first ("aberta") — `Omie.Store` é marketplace de apps integrados.
- 70+ módulos. Núcleo: NF-e/NFS-e, contas a pagar/receber, conciliação bancária, estoque/compras, CRM funil, PDV, certificado digital, BI, cobrança, despesas, força de vendas, monitor fiscal automático.

**Canal contadores — o "segredo"**
- Tese contraintuitiva validada: cliente do Omie não é a PME — é o **contador**. Quando contador recomenda, churn cai e LTV sobe.
- Cliente que usa Omie reduz custo do contador em 80% (proposta de valor explícita).
- Resultado: 27k escritórios contábeis = exército de canal.
  - Fonte: [Like a Boss — Marcelo Lombardo](https://www.likeaboss.com.br/episodios/marcelo-lombardo-ceo-da-omie/).

**Implicação Agraas**
- O canal não é o produtor. É **contador rural + cooperativa + revenda de insumos** — agentes que já têm relacionamento de confiança recorrente com produtor.
- Replicar tese Omie em vertical agro = "contador rural como canal" + módulo fiscal nativo (LCDPR, IRPF Atividade Rural, FUNRURAL, EFD-Reinf, NFP-e).
- **Ação sugerida:** memory permanente — "Canal contador rural é o vetor de growth da Agraas Controladoria, não venda direta."

### A.2 Conta Azul, Nibo, Bling, Tiny — comparativo

| ERP | Foco | Preço base 2026 | Diferencial |
|---|---|---|---|
| **Conta Azul** | Gestão financeira + contábil | R$ 159,90/mês (MEI) até R$ 719,90/mês (médio porte) | Forte em DRE, contas a pagar/receber, integração contador |
| **Nibo** | Tesouraria PME | — | Fluxo de aprovação de pagamentos robusto, usabilidade |
| **Bling** | E-commerce/marketplace | — | NF-e ilimitada em todos os planos, integração com plataformas de venda |
| **Tiny** | E-commerce | R$ 50 a R$ 500/mês | Integração marketplaces |
| **Omie** | Gestão fiscal + contábil completa | — | Canal contador, módulos amplos, monitor fiscal |
  - Fonte: [Clareza Gestão comparativo](https://clarezagestao.com/comparativo-bling-tiny-omie-contaazul), [Multise](https://multise.com.br/conta-azul-omie-nibo-ou-bling-comparativo-entre-os-erps-mais-usados-por-pmes/).

**Gap claro:** nenhum desses tem módulo agro/rural nativo (LCDPR, FUNRURAL, NFP-e, GTA, ITR). É o **wedge fiscal da Agraas**.

### A.3 ERP vertical agro BR

- **Aegro** — gestão de fazenda (plantio, colheita, fluxo de caixa, contas a pagar/receber, custos). Apple do agro UX. Foco em grãos. Não consolidado em pecuária bovina. [aegro.com.br](https://aegro.com.br/).
- **Siagri (grupo Aliare)** — ERP de revenda de insumos, lojas agropecuárias, armazéns, agroindústrias. Foco B2B trade, NÃO no produtor direto. [siagri.com.br](https://www.siagri.com.br/).
- **Strider** — não retornou em busca brasileira recente. Suspeita: pivotou ou foi absorvida (originalmente Syngenta-owned, era plataforma de monitoramento de pragas/safras).
- **Solinftec** — agronomia em tempo real, IoT, ALICE plataforma. Foco em produtor de grão grande, maquinário, conexão com tratores. Brasileira com expansão US. [solinftec.com](https://www.solinftec.com/en-us/).

**Implicação Agraas**
- Nenhum desses cobre **controladoria contábil-fiscal integrada com rastreio bovino individual**. Aegro tem gestão de custo mas não passaporte digital + Score Engine v3. Ecotrace tem rastreio + frigorífico mas não controladoria.
- Wedge competitivo: cruzar (rastreio individual + Score) × (controladoria fiscal + LCDPR + NF-e Produtor) = produto inédito no Brasil.

---

## B. Modelagem de custo agro com dados reais (2026)

### B.1 Pecuária bovina

**Cotações arroba — 15/06/2026 (recorde histórico)**
- SP R$ 347,00/@
- MS R$ 344,00/@
- MT R$ 345,00/@
- GO R$ 327,00/@
- MG R$ 325,00/@
- Pico abril/2026: R$ 365,00/@ em SP.
  - Fonte: [Pecuaria.com.br cotações](https://www.pecuaria.com.br/cotacoes.php), [CEPEA](https://cepea.org.br/br/diarias-de-mercado/boi-cepea-boi-gordo-se-valoriza-mais-que-vaca-em-2026.aspx), [Agropecfuturo](https://agropecfuturo.com.br/boi-gordo-bate-recorde-historico-em-2026/).

**Custos por sistema (CNA Campo Futuro + Embrapa CiCarne 2026)**
- **Cria** — COE médio R$ 120/@ vendida. Em São Félix do Xingu (PA) caso de R$ 60/@ — variação imensa por região e escala.
- **Recria intensiva + terminação** — ano de aperto. Preço da reposição (bezerro/novilha) é o item determinante da viabilidade em 2026. Margem operacional sob pressão.
- **Custo de reposição:** o boletim CiCarne (Embrapa) mapeia retenção de fêmeas + alta do bezerro como vetor crítico do ciclo atual.
  - Fonte: [Sistema Faperon — Campo Futuro CNA pecuária 2024 (PDF)](https://sistemafaperon.org.br/wp-content/uploads/2024/12/Campo-futuro-CNA-Painel-Pecuaria-de-corte-Recria-e-Engorda-Colorado-do-Oeste-RO-2024.vf_.pdf), [Broto — CiCarne 2026](https://noticias.broto.com.br/pecuaria/boletim-cicarne-retencao-femeas-custos-2026/).

**Implicação Agraas**
- Score Engine v3 já tem pilar "produtividade", mas o **custo operacional** não está modelado animal-a-animal hoje.
- Gap: precisamos de um **custo unitário por animal** (rateio de COE pelo rebanho) → permite ROI real por boi vendido → KPI direto para frigorífico (oferta de prêmio) e banco (risco de inadimplência).

### B.2 Safras (grãos)

**Soja 2025/26**
- Custo médio Conab: R$ 6.115,83/ha (+1,9% vs 2024/25).
- MT (IMEA): R$ 7.761,74/ha — Mato Grosso é teto.
- Preço da soja: queda de 13,3% no preço médio. Fertilizantes: +17,7%. Defensivos: -6,1%. Sementes: -9,3%.
- Resultado: margem espremida.
  - Fonte: [AgroReceita custo safra 25/26](https://agroreceita.com.br/safra-2025-26-custo-de-producao-agricola/), [AgroAdvance soja](https://agroadvance.com.br/blog-custo-de-producao-da-soja-2025-2026/), [Conab custos de produção](https://portaldeinformacoes.conab.gov.br/custos-de-producao.html).

**Milho 2ª safra 2025/26**
- Margem bruta MT/PR/GO em queda de ~48%: R$ 2.325,50/ha (24/25) → R$ 1.219,60/ha (25/26).
- Aprosoja MS publica custos detalhados de milho 2ª safra anualmente.
  - Fonte: [Aprosoja MS — custo milho safra 24/25](https://aprosojams.org.br/sites/default/files/boletins/custo%20milho%2024_25_0.pdf).

### B.3 Custo de rastreio (brinco RFID)

- Brinco eletrônico RFID FDX-B (ISO 11784/11785), reutilizável, vendido em caixas de 25-50 unidades.
- Mercado pulverizado: Polite, Allflex, Alltags, IDtex/Okey, Animall, Rural Center.
- Preço de mercado 2026 (estimado): R$ 8-25/brinco no varejo + leitor RFID portátil R$ 1.500-4.000.
- SISBOV ainda usa brinco oficial + manejador credenciado. PNIB vai mudar isso.
  - Fonte: [Loja Polite — brinco eletrônico](https://www.polite.com.br/brinco-eletronico-boton-rfid-pr-1103-168429.htm), [IDtex/Okey](https://www.okey.com.br/idtex/index.htm).

**Implicação Agraas**
- O wedge "rastreio + fiscal" precisa **abstrair o hardware** (qualquer brinco RFID/biométrico funciona). Não competir com fabricante — competir no software/score/compliance.
- Pesquisa promissora: identificação biométrica por focinho (substitui RFID). Vale monitorar.
  - Fonte: [Canal do Criador — biometria focinho](https://canaldocriador.com.br/noticias/tecnologia-biometrica-identifica-gado-pelo-focinho/).

---

## C. Obrigações fiscais rurais 2026 — calendário e mudanças

### C.1 NF-e Produtor (NFP-e Mod. 55)

**Marco crítico — Ajuste SINIEF 27/2024 CONFAZ**
- **05/01/2026** — NFP-e (modelo 55) torna-se obrigatória para **TODOS** os produtores rurais, independente de faturamento.
- Fim definitivo do "talão modelo 4" (papel).
- Faturamento >R$ 360k já era obrigado desde 03/02/2025.
  - Fonte: [Avalara — NFP-e](https://www.avalara.com/br/pt/blog/2025/07/nota-fiscal-eletronica-produtor-rural-nfp-e.html), [IOB](https://noticias.iob.com.br/produtor-rural-nf-e-nfc-e/), [Consisa](https://www.consisa.com.br/nota-fiscal-eletronica-produtores-rurais-2026/).

**Implicação Agraas**
- Janela de captura imensa: ~5 milhões de produtores rurais BR precisam migrar para NFP-e em 2026.
- **Ação imediata:** módulo "emissor NFP-e" precisa estar no roadmap como **wedge de aquisição** (não diferencial — é commodity, mas é a porta de entrada).

### C.2 GTA digital e PNIB/SISBOV

- GTA continua estadual (cada UF gerencia), mas MAPA exige diretrizes nacionais.
- **PNIB cronograma:** 2026 = "adequação e integração dos sistemas estaduais (interoperabilidade)". 2032 = identificação individual obrigatória antes da primeira movimentação.
- SISBOV permanece para protocolos de exportação, sobre a mesma camada de dados que o PNIB.
- ECA Digital (Lei nº 15.211/2025) NÃO proibiu GTA — informação que circulou é fake news.
  - Fonte: [Mesa Brasileira Pecuária Sustentável](https://pecuariasustentavel.org.br/noticias/rastreabilidade-total-ate-2032-o-horizonte-da-pecuaria-brasileira-e-o-papel-estrategico-da-rastreabilidade-individual/), [Radarbov PNIB](https://radarbov.com/blog/pnib-tudo-o-que-voce-precisa-saber/), [Exame GTA ECA Digital](https://exame.com/pop/gta-proibido-no-brasil-veja-o-que-diz-o-eca-digital/).

### C.3 SPED — ECD, ECF, EFD-Reinf

- **ECD** entrega 30/06/2026 (ano-base 2025). Obrigatório Lucro Real.
- **ECF** entrega 31/07/2026. Obrigatório Lucro Real + Presumido + Arbitrado.
- **EFD-Reinf** — IN RFB 2.321/2026 exige distinguir categorias (PF/segurado especial) de produtor rural.
  - Fonte: [SPED Receita Federal](http://sped.rfb.gov.br/), [JUDIT ECD/ECF 2026](https://judit.io/blog/guias-e-materiais/ecd-e-ecf-2026-data-de-entrega-prazo-do-sped-contabil-download-e-como-evitar-multas/), [Contabilizei EFD-Reinf 2026](https://www.contabilizei.com.br/contabilidade-online/efd-reinf-2026/).

### C.4 FUNRURAL — Lei Complementar 224/2025

- A partir de **01/04/2026**:
  - PF: 1,50% → **1,63%**
  - PJ: 2,05% → **2,23%**
- FUNRURAL é dedutível do IRPF Atividade Rural.
- Não é alterado pela Reforma Tributária (IBS/CBS) — segue paralelo.
  - Fonte: [FarmPlus FUNRURAL 2026](https://www.farmplus.com.br/aprenda/funrural-2026-o-que-e-quem-paga-aliquotas-como-calcular), [Aegro blog FUNRURAL](https://aegro.com.br/blog/funrural-2026/), [FAESP](https://faespsenar.com.br/alteracao-nas-aliquotas-do-funrural-entra-em-vigor-a-partir-de-abril/).

### C.5 Reforma Tributária — IBS/CBS LC 214/2025

- **01/01/2026** — produtores rurais contribuintes precisam destacar IBS/CBS em documentos fiscais (sem cobrança neste ano — só shadow accounting).
- **2027** — CBS começa a ser cobrada.
- **2029** — IBS começa a ser cobrado.
- Produtor PF/PJ com faturamento **< R$ 3,6 milhões/ano** NÃO é contribuinte (mas pode optar).
- Insumos agropecuários: alíquota com redutor de **60%** (Anexo IX LC 214).
  - Fonte: [Planalto LCP 214](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm), [Senado — 2026 marca implementação](https://www12.senado.leg.br/noticias/materias/2026/01/02/ano-de-2026-marca-implementacao-da-reforma-tributaria), [Receita — Orientações 2026](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-consumo/orientacoes-2026), [APET regime diferenciado agro](https://apet.org.br/artigos/reforma-tributaria-cria-regime-diferenciado-de-cbs-ibs-ao-agronegocio/).

### C.6 LCDPR + IRPF Atividade Rural

- **LCDPR (Livro Caixa Digital Produtor Rural)** — obrigatório se receita bruta ≥ R$ 4,8 milhões. Entrega até 31/05/2026 junto com DIRPF.
- **Livro Caixa comum** — entre R$ 56k e R$ 4,8mi.
- **CNPJ alfanumérico** — a partir do **2º semestre/2026** produtor PF terá CNPJ alfanumérico como identificador fiscal único (mesmo continuando PF). Substitui inscrição estadual.
  - Fonte: [Receita Federal LCDPR](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/lcdpr-livro-caixa-digital-do-produtor-rural/perguntas-e-respostas-livro-caixa-digital-do-produtor-rural-lcdpr.pdf), [Lucro Rural 2026](https://lucrorural.com.br/blog-lucro-rural/guia-para-o-livro-caixa-digital-do-produtor-rural-2026), [Aegro LCDPR](https://blog.aegro.com.br/livro-caixa-digital-do-produtor-rural/).

**Implicação Agraas (consolidada)**
- O ano 2026 é uma **tempestade perfeita regulatória**: NFP-e + IBS/CBS + FUNRURAL novo + CNPJ alfanumérico + PNIB interoperabilidade. Cada produtor precisa de software para sobreviver.
- A janela de 12-24 meses (junho/2026 a junho/2028) é o pico de demanda por controladoria rural digitalizada. **A Agraas precisa estar pronta com módulo fiscal ainda em 2026.**

---

## D. Estado da arte regulatório agro

### D.1 EUDR — Regulamento UE 2023/1115

**Status atualizado**
- Adiado UMA VEZ por Reg. UE 2024/3234 (vigência saiu de 30/12/2024 para **30/12/2025**).
- **Novembro/2025:** Parlamento Europeu aprovou NOVO adiamento de 1 ano → vigência:
  - Grandes operadores e comerciantes: **30/12/2026**.
  - Pequenas e microempresas: **30/06/2027**.
- Regulamento aplica-se a: óleo de palma, soja, madeira, café, cacau, borracha, **carne bovina** e derivados.
- Marco temporal: produtos não podem vir de terras desmatadas após 31/12/2020.
- Exige: rastreabilidade ponta-a-ponta + due diligence + georreferenciamento.
  - Fonte: [ClimaInfo Parlamento Europeu adiamento](https://climainfo.org.br/2025/11/27/parlamento-europeu-aprova-adiamento-de-lei-antidesmatamento-para-o-fim-de-2026/), [Brasil Florestal EUDR adiamento](https://brasilflorestal.org/regulamento-da-uniao-europeia-para-produtos-livres-de-desmatamento-eudr/), [Conjur rastreabilidade UE](https://www.conjur.com.br/2025-abr-30/rastreabilidade-sustentabilidade-e-direito-do-regulamento-europeu-nas-exportacoes-de-carne-bovina/).

**Implicação Agraas**
- Janela maior do que se imaginava (até dez/2026), mas a aposta segue: **frigorífico-first** precisa de rastreio EUDR-compliant.
- Compete diretamente com **Ecotrace** (já rastreia 40% da carne exportada do BR, clientes JBS/Marfrig/Minerva/BRF/Frigol).
- Diferencial Agraas: integrar EUDR + Halal + IBS/CBS + LCDPR num único passaporte digital. Ecotrace é só rastreio (não toca fiscal nem controladoria).

### D.2 PNIB/SISBOV — Resumido (detalhe em C.2)

- 2026: integração de sistemas estaduais.
- 2032: rastreabilidade individual obrigatória.
- Janela: 6 anos para construir base de animais identificados.

### D.3 Plano Safra 2026/27

- Volume estimado: **R$ 568-570 bilhões** (+10% vs 25/26 que foi R$ 516,2bi).
- Juros: meta de **redução de 2 p.p.** vs ciclo anterior; agricultura empresarial em faixa de **6%-11% a.a.**
- Lançamento oficial previsto para junho/julho de 2026 (ainda pendente).
  - Fonte: [aRede Plano Safra 26/27](https://arede.info/a-forca-do-agro/646188/plano-safra-202627-tera-r-570-bilhoes-e-juros-menores), [PowerMix](https://www.powermix.com.br/agronegocios/plano-safra-202627-deve-chegar-a-r-570-bilhoes-e-prever-juros-menores-para-produtores/54302).

**Implicação Agraas (banco persona /banco)**
- Crise agro 2026 — inadimplência BB no agro >90 dias = **6,22%** (+3,5 p.p. ano-a-ano). Itaú BBA projeta provisão R$ 73bi em 2026 do BB.
- Bancos estão **subindo garantia real para 69%** (era 31%) das novas concessões. Vão exigir mais dado de risco operacional.
- Esse é exatamente o vácuo onde Score Engine v3 + controladoria operacional cabem. **A persona Banco da Agraas é mais quente em 2026 do que se imaginava — crise do agro está abrindo demanda por dados granulares.**
  - Fonte: [Seu Dinheiro — Itaú BBA corta BB](https://www.seudinheiro.com/2026/empresas/itau-bba-corta-projecoes-para-o-banco-do-brasil-bbas3-e-avisa-o-pior-do-agronegocio-ainda-esta-por-vir-miql/), [Agência Brasil — lucro BB cai 54%](https://agenciabrasil.ebc.com.br/economia/noticia/2026-05/lucro-do-banco-do-brasil-cai-54-com-avanco-da-crise-no-agro).

### D.4 MBPS — Mesa Brasileira da Pecuária Sustentável

- Webinars 2026: rastreabilidade (fev/26), reinserção de produtor à cadeia formal (jan/26).
- 6º Fórum Nacional MBPS: **02-03/julho/2026** durante Pantanal Tech MS — tema "Da prática ao debate".
- GT Bem-Estar Animal publicou guia em 2025 (45 reuniões entre ago/23 e dez/24).
- Posicionamento: rastreio individual = ativo valorizado antes de 2032.
  - Fonte: [MBPS noticias](https://pecuariasustentavel.org.br/noticias/), [O Presente Rural — MBPS bem-estar](https://opresenterural.com.br/mbps-propoe-melhorias-nas-condicoes-de-bem-estar-bovino-na-pecuaria-brasileira/).

**Implicação Agraas:** mapear membros do GT MBPS e tentar **observer status** nos GTs (rastreabilidade + BEA) — relacionamento sectorial é mais barato que pitch frio para JBS/Marfrig.

---

## E. Cooperativas de crédito rural e bancos agro

### E.1 Sicredi, Cresol, Unicred (cooperativas)

- **Sicredi** — liderança Pronaf (44,85% market share) e Pronamp (45%). Liberou R$ 14,4bi no RS no Plano Safra 25/26 (jul/25 a jan/26). Maior cooperativa de crédito BR.
- **Cresol** — meta de R$ 17-18bi liberados no Plano Safra 25/26. 70% crédito subsidiado, 30% linhas livres. R$ 10bi já operacionalizados (jan/26).
- **Unicred** — atua mais B2B (médicos, profissionais liberais), pouco rural puro.
- Plano Safra 25/26 destinou: **R$ 78,2bi Pronaf** (familiar) + **R$ 516,2bi Pronamp** (empresarial).
- **2026 mudança:** juros sobem 1,5-2,5 p.p. em quase todas as linhas de crédito rural. Inovação: Pronaf Conectividade (crédito para infraestrutura de conectividade rural).
  - Fonte: [Sicredi Pronaf](https://www.sicredi.com.br/site/credito/para-agronegocio/custeio/pronaf/), [Cresol Plano Safra 25/26](https://blog.cresol.com.br/novo-plano-safra-e-recursos-de-credito-rural/), [Gaz — Sicredi líder RS](https://www.gaz.com.br/sicredi-lidera-liberacoes-de-credito-rural/), [MundoCoop cooperativas](https://mundocoop.com.br/agronegocio/cooperativas-de-credito-reforcam-proximidade-com-produtores-diante-de-juros-altos/).

### E.2 Bancos comerciais — BB, Bradesco, Itaú BBA

**Banco do Brasil — crise visível**
- Lucro 1T26 caiu 54% (vs 1T25), agro foi causa principal.
- Inadimplência rural >90d: 6,22% (+3,5 p.p. YoY).
- BB virou exigência: garantia imobiliária + fiduciária = 69% das novas concessões (era 31%).
- Itaú BBA reduziu projeção BB 2026: lucro líquido R$ 21,2bi → R$ 18,4bi.
- Provisão estimada 2026: R$ 73bi (~quase todo agro).

**Bradesco Agronegócio**
- Linha integrada com CRA + CPR + financiamento custeio + investimento.
- Participou de rodada R$ 90mi (Agrofy/grain digital) com Kaszek e SLC — sinaliza apetite por agtechs com tração comprovada.

**Itaú BBA** — maior banco privado em crédito corporativo agro. Atua mais com grande produtor + frigorífico + trading.
  - Fonte: [Banco Bradesco agronegócio](https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/agronegocio/producao-rural/index.shtm), [FEEB-SC BB](https://feebsc.org.br/banco-do-brasil-bbas3-ainda-vai-enfrentar-o-pior-do-agro-alerta-itau-bba/).

### E.3 Mercado de capitais agro — CPR + CRA + LCA

- **CPR (Cédula Produto Rural)** — R$ 560bi registrados em março/2026 (+17% YoY). 402 mil cédulas em estoque. Safra 25/26: R$ 283bi registrados (-5% vs ciclo anterior).
- **CRA (Certificado de Recebíveis do Agronegócio)** — R$ 175,7bi em maio/2026 (+12% YoY). Mercado total estimado em R$ 350bi em 2026.
- **LCA** — R$ 583bi em março/2026 (+6% YoY).
  - Fonte: [MAPA CPR março/26](https://www.gov.br/agricultura/pt-br/assuntos/noticias/registros-de-emissao-de-cpr-chegam-a-r-560-bilhoes-em-marco), [Canal Rural CPR](https://www.canalrural.com.br/agricultura/estoque-de-cedulas-de-produto-rural-registra-aumento-de-13/).

**Implicação Agraas**
- CPR/CRA = mercado de R$ 1+ trilhão em renda fixa agro. Cada CPR depende de validar:
  1. Quem é o produtor (CNPJ alfanumérico, regularidade fiscal)
  2. Capacidade produtiva (custo, produtividade, rebanho)
  3. Garantia (terra, animal, safra futura)
- Score Engine v3 + controladoria fiscal Agraas = **dados auditáveis** que servem CPR/CRA. Persona **Banco/Securitizadora** ganha caso de uso.
- **Ação imediata:** explorar parceria com securitizadora (Vert, Eco Securitizadora, Opea) para Agraas virar "due diligence as a service" para emissão de CPR.

---

## F. Comparáveis internacionais agtech

| Empresa | Origem | Foco | Status 2026 |
|---|---|---|---|
| **Bushel** | Fargo, ND (US) — 2011 | Grain trading + farm mgmt + payments (absorveu FarmLogs) | US$ 104mi captados. Série C de US$ 47mi liderada por Continental Grain. "Premier digital grain infrastructure". Lançou Bushel Business Account (banking via The Bancorp) em 2025. |
| **Granular (Corteva)** | US — acquired by DuPont/Corteva | Farm mgmt + analytics | Integrado ao portfólio Corteva. Granular Insights = camada de insights para Corteva customers. |
| **Conservis** | US | Farm mgmt para row crop large-scale | Mainstream em fazendas >2k acres US. Custo dados + agronomia + finance. |
| **FarmLogs** | US | Farm mgmt SaaS | Adquirida pela Bushel; rebranded "Bushel Farm". |
| **xFarm Technologies** | Suíça/Itália — 2017 | Farm mgmt EU com IoT, sensores, integração maquinário | Forte em coop EU + grandes inputs (Bayer, Syngenta). Modelo white-label. |
| **Connecterra** | Holanda | IoT bovino + AI (Ida) | Wearables vacas leiteiras. Pivotou de produto direto para enterprise dairy. |
| **Solinftec** | Brasil/US — 2007 | IoT agricultura, robô autônomo (Solix) | Brasileira de Araçatuba expandindo nos EUA. Foco em fazendas grandes + tratores conectados. |
  - Fonte: [Bushel](https://www.bushelpowered.com/), [Solinftec](https://www.solinftec.com/en-us/), [Crunchbase Bushel](https://www.crunchbase.com/organization/bushel-26e6).

**Padrão observado**
- Comparáveis US/EU **focam em grão**, não em pecuária bovina rastreada. Bushel é o mais próximo do "Omie agro" mas é grain-trading-first.
- Nenhum tem combinação **rastreio individual + Score Engine ancorado em ciência + controladoria fiscal BR**.
- Pecuária bovina rastreada é vertical relativamente **virgem globalmente** porque US/EU não tem o pé que o Brasil tem (BR é 25% do rebanho mundial).

**Implicação Agraas**
- Comparável defensável no pitch: "Agraas = Bushel para pecuária bovina BR, com camada fiscal." Bushel valida o modelo "infra digital + payments + farm software" mas Bushel não cobre pecuária e não cobre fiscal BR.

---

## G. Insights tangentes — M&A, aceleração, mapeamento

### G.1 Radar AgTech Brasil 2025 (Embrapa + SP Ventures + Homo Ludens)
- Mapeamento anual de startups + investidores + ambientes de inovação no agro BR.
- Incubadoras agro cresceram **+224%** entre 2017-2024. Aceleradoras +90%.
  - Fonte: [Radar AgTech 2025 PDF](https://radaragtech.com.br/wp-content/uploads/2026/03/Radar-Agtech-2025-Embrapa-SP-Ventures-Homo-Ludens.pdf), [Embrapa — número de incubadoras](https://www.embrapa.br/en/busca-de-noticias/-/noticia/99266318/numero-de-incubadoras-do-agro-cresceu-224-e-de-aceleradoras-90-registra-o-radar-agtech-brasil).

### G.2 Fundos ativos BR para agtech (2025-2026)
- **SP Ventures** — LATAM agfood-climate tech leader. Liderou Produzindo Certo R$ 20,7mi (2S/2025).
- **Bradesco AGTECH Garage** — corporate venture do banco; portfólio amplo, ticket inicial.
- **Indicator Capital** — early stage seed/Series A em SP + Califórnia.
- **Kaszek** — participou de rodada de R$ 90mi (grain digital) em 2025 com Bradesco/SLC.
- **Arar Capital, Yield Lab, SLC Ventures, Agroven** — co-investidores ativos.

### G.3 Sentimento mercado 2026
- AgFeed (jan/26): "Após retomada seletiva em 2025, agtechs entram em 2026 com mais fundamento e menos euforia." Capital existe, mas exige **tração + impacto mensurável + aderência clara à realidade do produtor**.
  - Fonte: [AgFeed perspectiva 2026](https://agfeed.com.br/economia/perspectiva-2026/apos-retomada-seletiva-em-2025-mercado-de-agtechs-entra-em-2026-com-mais-fundamento-e-menos-euforia/).

### G.4 Ecotrace — concorrente direto a monitorar de perto
- Fundada 2018 (Vinhedo SP). Foco rastreabilidade ESG com blockchain + visão computacional + IA + IoT.
- **40% da carne exportada do BR é rastreada por Ecotrace.** Clientes: JBS, Frigol, Minerva, BRF, Lar, Avenorte, Rio Maria, SulBeef, Frigosul, Barra Mansa, Astra.
- 2025: monitorou 16,1mi de bovinos em frigorífico (+25% YoY de 12,9mi em 2024).
- Mira acordo Mercosul-UE.
  - Fonte: [Ecotrace](https://ecotrace.info/), [Portal DBO — Ecotrace UE Mercosul](https://portaldbo.com.br/ecotrace-amplia-rastreabilidade-e-mira-acordo-uniao-europeia-e-mercosul/).

**Diferencial Agraas vs Ecotrace**
- Ecotrace = lente do **frigorífico** olhando cadeia para trás. Agraas = lente do **produtor** olhando cadeia para frente + camada fiscal. Não competem direto — complementam.
- Ecotrace não tem módulo de controladoria fiscal, IRPF, LCDPR, FUNRURAL, NFP-e, IBS/CBS.
- Atenção: monitorar se Ecotrace aproxima-se de produtor (movimento natural pós tração frigorífico).

---

## CONSOLIDAÇÃO FINAL

### 5 TOP INSIGHTS (candidatos a memory permanente)

1. **Janela regulatória 2026 = tempestade perfeita para wedge fiscal Agraas.**
   NFP-e obrigatório p/ todos (jan/26) + FUNRURAL +0,13 p.p. (abr/26) + IBS/CBS shadow (jan/26 → real 2027/2029) + CNPJ alfanumérico (2S/26) + PNIB interoperabilidade (2026). Cada produtor precisa migrar para digital em 12 meses ou para de operar.

2. **Canal contador rural = vetor de growth replicando Omie.**
   Omie atingiu 180k clientes e R$ 855mi de captação Série D em 2025 montando 27k escritórios contábeis como canal. A Agraas precisa montar canal análogo: contador rural especializado + cooperativa de crédito + revenda de insumos como front-end de aquisição.

3. **Crise do agro 2026 → persona BANCO mais quente que persona produtor.**
   BB tem inadimplência rural 6,22% (+3,5 p.p. YoY), Itaú BBA projeta provisão R$ 73bi em 2026, BB subiu garantia real 31%→69%. Bancos PRECISAM de dado granular operacional. Score Engine v3 + controladoria Agraas é o produto certo no momento certo.

4. **Mercado CPR + CRA + LCA = R$ 1+ trilhão em renda fixa agro precisando de due diligence auditável.**
   CPR R$ 560bi, CRA R$ 175bi, LCA R$ 583bi (mar/26). Cada papel precisa validar produtor, capacidade e garantia. Agraas pode virar "DD-as-a-Service" para securitizadoras (Vert, Eco, Opea).

5. **Ecotrace cobre o frigorífico. Bushel cobre grão US. Aegro cobre fazenda BR. Ninguém cobre o cruzamento (rastreio bovino individual + Score Engine ciência + controladoria fiscal).**
   É o whitespace defensável da Agraas. Comparáveis ajudam no pitch sem entregar a tese.

### 3 GAPS no projeto Agraas (que descobri faltando)

1. **Custo unitário por animal (rateio operacional).**
   Score Engine v3 mede produtividade mas não custo. Modelo CNA Campo Futuro R$ 120/@ COE pode virar baseline. Ganho: ROI real por boi → KPI direto para frigorífico (oferta de prêmio) e banco (risco de inadimplência).

2. **Módulo fiscal-tributário rural (LCDPR + NFP-e + FUNRURAL + IRPF Atividade Rural + IBS/CBS shadow).**
   É o wedge "Omie do Agro" que falta materializar. Sem isso, a tese expandida 18/06 fica teórica. Primeiro candidato: **emissor NFP-e** (obrigatório 05/01/2026 para 100% dos produtores).

3. **Camada "compliance pronto para CPR" / parceria com securitizadora.**
   Persona Banco hoje na Agraas é genérica. Faltam: (a) export para template Bradesco/BB/Sicredi de análise de risco, (b) integração com B3 registro CPR, (c) relatórios EUDR-ready para frigorífico-exportador.

### 2 AÇÕES IMEDIATAS RECOMENDADAS

1. **Acelerar módulo "Emissor NFP-e" + LCDPR para sprint Q3/2026.**
   Obrigatoriedade para 100% dos produtores em 05/01/2026 é evento de aquisição massivo. Agraas precisa estar pronta. Custo: 4-6 semanas de backend. Ganho: wedge fiscal viabilizado + lock-in via dado fiscal recorrente.

2. **Abrir conversa com Sicredi (cooperativas) ou Bradesco AGTECH Garage para parceria de canal.**
   Sicredi tem 44% Pronaf market share. Cooperativa = canal de baixo CAC + acesso a base de produtor pequeno-médio. Bradesco já invest agtech (R$ 90mi rodada 2025 com Kaszek). Faz sentido tanto para tração quanto para captação pré-seed.
