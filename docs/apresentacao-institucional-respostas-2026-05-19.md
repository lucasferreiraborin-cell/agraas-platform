# Apresentação Institucional — Respostas e diretrizes

> Documento gerado 19/05/2026 para auxiliar a montagem da Apresentação Institucional da Agraas.
> Diferença fundamental vs Pitch Deck: público diferente, tom diferente, claims diferentes.
>
> **Pitch deck** fala com investidor → ênfase em moat, TAM, unit economics, captação.
> **Apresentação institucional** fala com governo / academia / cadeia / sociedade → ênfase em **infraestrutura pública de confiança**, compliance regulatório, ciência, inclusão produtiva, ESG e competitividade do agro brasileiro.
>
> Convenções (idem doc pitch deck):
> - **[PÚBLICO]** = pode entrar na apresentação como está
> - **[CONFIDENCIAL]** = só para calibrar conteúdo, não publicar
> - **[LUCAS CONFIRMAR]** = preciso da sua resposta antes de imprimir
> - **[VERIFICAR PUBLICAMENTE]** = cruzar com fonte oficial (MAPA, IBGE, ABIEC, Embrapa)
> - **[GUARD]** = atenção, regra interna FSJBE / posicionamento exige cuidado

---

## Quem é o público desta apresentação?

**[LUCAS CONFIRMAR primeiro de tudo]** — o tom muda dramaticamente conforme o público. Identifique antes de finalizar:

| Audiência | Ênfase principal | Cuidado |
|---|---|---|
| **Secretaria de Agricultura SP** | Competitividade do agro paulista, política pública, EUDR, PNIB | Não politizar; não cravar Halal/exportação |
| **IZ-SP / NeuTroPec** | Rigor científico, validação acadêmica, score auditável, dados abertos | Citar Renata + César só se autorizado |
| **JBS / Marfrig / Minerva** | Cadeia integrada, mandato de fornecedores, redução de risco EUDR | Conversa exploratória — não cravar "parceria" |
| **Banco do Brasil / Sicredi / BRDE** | Score como insumo de crédito rural, redução inadimplência | Não publicar tese de "Serasa do agro" sem checar com banco |
| **ABIEC / CNA / SNA** | Defensabilidade Brasil-mundo, padrão BR de rastreabilidade | Atributo, não confronto a concorrentes |
| **Embrapa / USP / ESALQ** | Open data, peer review, ciência reproduzível | Idem IZ-SP |
| **Imprensa / mídia setorial** | Narrativa "ativo digital do agro BR", visão de Brasil | Cautela com dados sensíveis FSJBE |

**Recomendação default**: se for apresentação multi-audiência, **calibrar para Secretaria SP + IZ-SP + cadeia produtiva** como denominador comum. Isso já força tom institucional sério.

---

## Bloco A — Identidade Institucional

### A1. Frase-mãe (uma linha que deve abrir a apresentação)

**[PÚBLICO]** Recomendo:

> **"A Agraas é a infraestrutura digital de confiança do agronegócio brasileiro — onde cada animal, lote e propriedade vira um ativo digital rastreável, auditável e mensurável, do pasto ao porto."**

Variação mais curta para slide cover:

> **"Cada animal, um ativo digital. Auditável. Em tempo real."**

Por que essa formulação:
- **"Infraestrutura"** em vez de "plataforma" — posiciona como camada estrutural pública, não SaaS comercial
- **"Confiança"** em vez de "rastreabilidade" — palavra-chave universal (governo, banco, frigorífico, comprador)
- **"Auditável"** — atributo técnico defensável (vs "transparente" que é vago)
- **"Pasto ao porto"** — mostra cobertura ponta-a-ponta sem cravar exportação

### A2. Missão, visão, valores

**[LUCAS CONFIRMAR / OPCIONAL]** Sugestão de redação para discussão:

- **Missão**: "Dar a cada elo da cadeia agropecuária brasileira uma camada única de dados verificáveis, para que produção, sanidade, comercialização e exportação operem sobre o mesmo padrão de verdade."
- **Visão**: "Ser a infraestrutura de confiança do agro brasileiro até 2030 — começando pela pecuária bovina, expandindo para todas as cadeias críticas (suíno, ave, leite, grãos)."
- **Valores**: rastreabilidade individual, dados abertos auditáveis, inclusão produtiva, rigor científico, posicionamento por atributo (não por confronto).

### A3. Razão social / governança

**[LUCAS RESPONDER]** — preciso da info formal para due diligence institucional:
- CNPJ ativo da Agraas
- Razão social vs nome fantasia
- Sócios e participações (cap table simplificado)
- Conselho consultivo formal (se existe)
- Endereço sede / SP / GO?

### A4. Slogan público vs slogan interno

**[GUARD]** Reforço da regra interna (skill agraas-fsjbe-guard):
- Slogan **público**: tom Terminal Industries — quieto, editorial, sem AI startup feel
- Slogan **interno** pode ser mais técnico ("AI nativa", "RBAC mentor", "score engine")

Para apresentação institucional, **usar slogan público SEMPRE**. Mesmo em slides de tecnologia.

---

## Bloco B — Plataforma & Tecnologia (framing institucional)

### B1. Os números que importam (mesmos do pitch, framing diferente)

**[PÚBLICO]** — confirmados ao vivo contra produção em 19/05/2026:

| O que | Quantidade | O que isso significa institucionalmente |
|---|---|---|
| Tabelas Postgres | 86 | Profundidade do modelo de dados — não é wireframe |
| Políticas RLS (Row-Level Security) | 327 | Isolamento multi-tenant validado em camada de banco |
| Triggers automatizados | 88 | Cadeia de eventos auditável sem intervenção manual |
| Funções PL/pgSQL | 68 | Lógica de negócio versionada e replicável |
| Migrations versionadas | 121 | Histórico íntegro de toda mudança de esquema |
| Tempo em produção | abr/2026 → hoje | Plataforma viva, não protótipo |

**Framing institucional**: substituir "plataforma" por "**infraestrutura de dados**". Substituir "users" por "**perfis institucionais**". Substituir "tabelas" por "**modelo de dados auditável**". A diferença de tom é decisiva.

### B2. Stack técnico — o que dizer (e o que não dizer)

**[GUARD]** Per regra interna: evitar "stack flex" tipo logos de Vercel/Supabase/Anthropic na frente.

**[PÚBLICO se necessário, em slide secundário]** Se a audiência for técnica (IZ-SP, Embrapa):
- **Banco de dados**: PostgreSQL 17 + RLS multi-tenant
- **Autenticação**: SSO + RBAC (mentor_externo, admin, producer, buyer)
- **Hospedagem**: nuvem Vercel + Supabase managed
- **IA assistente**: Claude Sonnet 4.6 (Anthropic)
- **Segurança**: LGPD compliant by design, audit log em todas as escritas
- **Mobile**: React Native (Expo) — apps Android/iOS

Se a audiência for governo/cadeia, omitir nomes de fornecedores. Apenas: "**stack open-source e padrões internacionais (PostgreSQL, OAuth 2.0, OpenAPI)**".

### B3. AI nativa — como vender sem cara de AI startup

**[GUARD]** Não chamar de "AI-powered". Não usar selo "Claude Inside". Posicionar como:

> **"Inteligência artificial assistiva integrada — para apoiar produtor, mentor científico e comprador na leitura de dados operacionais. A decisão é sempre humana; a IA acelera o diagnóstico."**

Diferença sutil mas crítica: **assistive AI**, não autonomous AI. Para audiência institucional brasileira, isso responsabiliza melhor.

### B4. Segurança & LGPD

**[LUCAS CONFIRMAR formalização]**
- LGPD: temos política de privacidade publicada?
- DPO designado? Encarregado de dados?
- Audit log: sim, existe — toda mutação grava em `audit_logs`
- Backup / disaster recovery: Supabase managed (Point-in-Time Recovery)
- Certificações: nenhuma formal ainda (ISO 27001 seria caminho institucional natural)

Sugestão: se ainda não tem política LGPD escrita, **fazer antes da apresentação**. Frase no slide: *"Operação LGPD-compliant by design — minimização, finalidade, audit trail."*

---

## Bloco C — Compliance & Regulatório

### C1. Mapa regulatório que a Agraas se posiciona

**[VERIFICAR PUBLICAMENTE]** — outro Claude deve cruzar com fontes oficiais:

| Norma | O que exige | Como Agraas se posiciona |
|---|---|---|
| **PNIB** (MAPA, IN 18/2024 ou sucessoras) | Identificação individual eletrônica progressiva do rebanho BR | Plataforma já pronta — IDs únicos `agraas_id`, integração RFID em desenvolvimento via VIP Systems |
| **EUDR** (Reg UE 2023/1115) | Rastreabilidade geo-referenciada da cadeia para 7 commodities, incl. **gado bovino** | Conformidade nativa: `properties.lat/lng`, histórico de movimentações, audit trail |
| **MAPA Lista TRACES / APTAS** | Habilitação sanitária para exportação | Apoio à preparação documental — não substitui MAPA |
| **Reforma Tributária (EC 132/2023 + LC 214/2025)** | Digitalização fiscal (IBS/CBS), nota eletrônica simplificada produtor rural | Módulo fiscal Agraas pronto para SPED + NF-e integradas |
| **LGPD (Lei 13.709/2018)** | Proteção de dados pessoais | Compliant by design, RLS multi-tenant, audit log |

### C2. EUDR — corrigir percepções erradas comuns

**[PÚBLICO]** Pontos que aparecem mal interpretados em decks institucionais:
- **EUDR cobre 7 commodities**: gado bovino, soja, óleo de palma, madeira, café, cacau, borracha. **Frango/suíno NÃO estão** na lista. (Erro presente no deck atual — ver bloco G3 do doc pitch deck).
- **Adiamento**: regulamento teve adiamento oficial (out/2024). Verificar data exata atualizada 2026 antes de imprimir.
- **Pequeno produtor**: tem prazo extra (geralmente 6 meses adicionais). Citar como inclusão.

### C3. PNIB — o que cravar e o que suavizar

**[LUCAS CONFIRMAR fonte legal exata]**
- **Fase 1 (2027)**: identificação eletrônica em manejos sanitários — **suposto IN MAPA 18/2024**, confirmar
- **Fase 2 (2030)**: 100% do rebanho — **suposto IN complementar**, confirmar
- **"2033 movimentação não identificada proibida"**: **não conheço fonte legal específica**. Suavizar para *"horizonte 2030+"* ou pedir fonte interna antes de cravar.

### C4. SISBOV — o histórico que importa contar

**[PÚBLICO]** Contexto institucional poderoso para apresentação:
- SISBOV (2002) foi a primeira tentativa de rastreabilidade individual bovina no Brasil
- **Adesão estruturalmente baixa** (~3-5% do rebanho nacional) por ser voluntário e desconectado de incentivo comercial
- PNIB (2027+) corrige: **identificação obrigatória, ligada a incentivos comerciais (EUDR, Halal, premium markets)**
- **Agraas se posiciona como camada que opera entre obrigação regulatória e incentivo comercial**

Frase para o slide:
> *"Onde o SISBOV foi voluntário e isolado, o PNIB é obrigatório e conectado. A Agraas é a camada que une obrigação regulatória, incentivo comercial e dado verificável — produtor, comprador, mercado externo."*

---

## Bloco D — Ciência & Validação Acadêmica

### D1. Mentoria Científica IZ-SP

**[LUCAS CONFIRMAR autorização para citação nominal]**
- **Dra. Renata Helena Branco Arnandes** (Instituto de Zootecnia de SP, especialista em CAR/RFI em Nelore) — mentoria quinzenal ativa
- **Prof. César Franzon** (Instituto de Zootecnia de SP) — mentoria conjunta com Dra. Renata
- Mentoria iniciada com sessão Agrishow 2026, próxima sessão 29/05/2026
- Três perfis institucionais provisionados na plataforma desde 18/05/2026

**[GUARD]** Ética acadêmica brasileira é sensível a uso de nome de pesquisador em material institucional sem aceite expresso. **Pedir autorização escrita antes de imprimir o nome dos dois**.

### D2. Score Engine — publicação científica como diferencial

**[LUCAS DECIDIR estratégia]** Recomendação:
- Submeter o algoritmo do score engine + metodologia para periódico setorial (Revista Brasileira de Zootecnia, Pesquisa Agropecuária Brasileira / Embrapa)
- Co-autoria com IZ-SP daria peer review formal + validação institucional
- Tempo: 6-12 meses do submission ao publication

**Por que importa para a apresentação institucional**: poder dizer *"Score Agraas é metodologia auditável submetida ao peer review científico junto com o Instituto de Zootecnia de SP"* é dramaticamente mais forte do que *"score proprietário"*. Diferencial defensável vs concorrentes.

Para a apresentação atual: posicionar como **"score em validação científica conjunta com IZ-SP"** se ainda for verdade.

### D3. Embrapa, USP, ESALQ — pipeline futuro

**[LUCAS RESPONDER]** Existem conversas em curso com:
- Embrapa Gado de Corte (Campo Grande)?
- Embrapa Pecuária Sudeste (São Carlos)?
- USP-Pirassununga (FZEA)?
- ESALQ (LSO Animal Science)?

Se houver qualquer contato, **mesmo informal**, vale citar como "diálogos iniciais com instituições científicas brasileiras". Se ainda não, omitir e listar como roadmap.

### D4. Programa NeuTroPec — esclarecer o que é

**[LUCAS CONFIRMAR descrição precisa]** — para que a apresentação cite corretamente:
- NeuTroPec é programa do IZ-SP voltado a **neutralidade tropical em pecuária** (manejo regenerativo, baixo carbono, eficiência hídrica)?
- Encaixe Agraas no NeuTroPec: rastreabilidade de manejo regenerativo verificável + score de sustentabilidade auditável

---

## Bloco E — Parcerias Institucionais & Cadeia de Valor

### E1. Diagrama do papel da Agraas na cadeia

**[PÚBLICO]** Sugestão de diagrama para slide:

```
PRODUTOR ─ FRIGORÍFICO ─ TRADER ─ COMPRADOR INSTITUCIONAL
   │              │           │              │
   └──────────────┴─── AGRAAS ─┴──────────────┘
                  Camada única de dados
                  Identidade · Score · Cadeia
```

Mensagem: Agraas não substitui ninguém da cadeia. Conecta. É **infraestrutura horizontal**, não competidor vertical.

### E2. Parcerias mencionáveis (com cautela)

**[LUCAS REVISAR antes de imprimir]**

| Parceiro | Status real | Como citar na apresentação institucional |
|---|---|---|
| **IZ-SP / Dra. Renata / Prof. César** | Mentoria quinzenal ativa | "Mentoria científica em curso" — só com autorização nominal |
| **NeuTroPec** | Acesso institucional ativo | "Diálogo com programa NeuTroPec" |
| **JBS (Alexandre Alves, Mourão Filho)** | Conversa exploratória | "Diálogo qualificado com cadeia industrial" — **não nomear pessoas** sem autorização |
| **GPB / Furlan** | Em desenvolvimento | "Diálogos com grupos pecuários" — **não nomear** sem autorização |
| **Banco do Brasil (Mourão Filho)** | Conversa exploratória | "Diálogos com sistema financeiro rural" — não nomear |
| **VIP Systems** | Integração técnica em desenvolvimento | "Parceria técnica para captura de dados via RFID em campo" |
| **Secretaria de Agricultura SP** | A confirmar | **[LUCAS RESPONDER]** — natureza e contato |
| **Agrishow 2026** | Participação a confirmar | **[LUCAS RESPONDER]** — expositor / visitante / patrocinador |

**[GUARD]** Regra de ouro institucional: **não imprimir nome de pessoa física sem autorização escrita**. Citar instituição genérica é seguro; nominar é arriscado.

### E3. O que NÃO citar como parceria

Para evitar problemas reputacionais:
- Não citar empresas/pessoas com quem houve apenas e-mail/LinkedIn message
- Não inflar "diálogo" para "parceria"
- Não usar logo de terceiros sem autorização de uso de marca
- Não posicionar IZ-SP como "validador oficial" antes de carta acadêmica formal

---

## Bloco F — Caso Piloto FSJBE

### F1. Como tratar FSJBE em apresentação institucional

**[GUARD CRÍTICO]** Per skill agraas-fsjbe-guard, regras inegociáveis:
- **NUNCA** afirmar Halal / Jeddah / Q2 2026 export / SIF certificado / "apto exportação"
- **NUNCA** chamar de "case fechado" ou "operação em escala"
- **SIM** chamar de "piloto MVP", "fazenda de cria", "rastreabilidade ativa em campo", "fase de validação"

### F2. Copy aceitável para FSJBE em apresentação institucional

**[PÚBLICO]** Modelo de redação que respeita o guard:

> **"Piloto Fazenda São João da Boa Esperança (FSJBE) — Jandaia, GO**
>
> Fazenda de cria em fase de validação operacional da plataforma. Tombamento técnico Multbovinos → Agraas em desenvolvimento durante 2026. Acesso institucional ativo do Instituto de Zootecnia de SP via perfil de mentor científico — três perfis técnicos provisionados em produção desde maio de 2026."

### F3. Transparência sobre vinculação familiar

**[LUCAS DECIDIR + RESPONDER]**
- FSJBE é da família fundadora? Per memória de projeto, há indícios mas não está cravado em código
- **Para apresentação INSTITUCIONAL (não pitch a investidor)**: vinculação familiar **não precisa ser tema central**. É detalhe operacional.
- **Para pitch a investidor**: precisa ser transparente (ver doc pitch deck F2)
- **Recomendação**: em apresentação institucional, descrever FSJBE como "piloto interno escolhido propositalmente para iterar produto antes de expandir" sem entrar em vínculo familiar, a menos que pergunte.

### F4. O que o piloto FSJBE prova (e o que não prova)

**[PÚBLICO]**

| O que prova | O que NÃO prova |
|---|---|
| Plataforma funciona em fazenda real | Escala comercial |
| Modelo de dados cobre ciclo de cria | Cobertura do ciclo abate-frigorífico |
| RLS multi-tenant validado | Adoção por produtor não relacionado |
| Mentor externo (IZ-SP) consegue acessar como espelho read-only | Adesão por frigorífico industrial |

Honestidade institucional importa. Não inflar.

---

## Bloco G — Impacto, ESG, Inclusão Produtiva

### G1. Narrativa de impacto para apresentação institucional

**[PÚBLICO]** Três eixos de impacto que ressoam em Secretaria, ABIEC e bancos:

1. **Competitividade Brasil-mundo**:
   - Brasil é maior produtor e exportador de carne bovina do mundo
   - Mas perde acesso a mercados premium por gaps de rastreabilidade
   - Agraas é camada que prepara o Brasil para EUDR + mercados Halal + Ásia-Pacífico **sem aumentar custo regulatório do pequeno e médio produtor**

2. **Inclusão produtiva**:
   - Marketplace Agraas (Mercado Livre do agro) abre canal para revendas regionais, fornecedores menores, transportadores autônomos
   - Score Agraas auditável pode virar insumo de crédito rural — produtor com gestão verificada paga menos juros
   - Pequeno produtor entra no sistema sem ter que escolher entre 5 ERPs caros

3. **Sustentabilidade verificável**:
   - Manejo regenerativo só vira incentivo comercial se for verificável
   - Carbono (CO2eq) por cabeça em desenvolvimento como métrica futura
   - Selo de sustentabilidade Agraas auditável vs selos opacos

### G2. ESG framing — onde ter cautela

**[GUARD]** Tom institucional brasileiro tem grande sensibilidade a ESG "performativo". Evitar:
- Selos próprios sem critério científico (i.e., não inventar "Selo Verde Agraas" antes de validar com IZ-SP/Embrapa)
- Métricas absolutas de carbono sem metodologia auditável
- Promessas vagas de "sustentabilidade"

Preferível:
- *"Rastreabilidade verificável que habilita futuras certificações de manejo regenerativo"*
- *"Camada de dados pronta para integração com programas oficiais de sustentabilidade (NeuTroPec, ABIEC Boi Verde, etc.)"*

### G3. Carbono — o que prometer e o que não prometer

**[LUCAS DECIDIR]** Posicionamento sugerido:
- **Hoje**: capturamos eventos de manejo (rotação de pastagem, suplementação, vacinação)
- **Curto prazo**: estimar CO2eq por animal usando metodologia Embrapa / IPCC Tier 2
- **Médio prazo**: integração com mercado de crédito de carbono via parceiro científico

Sem cravar datas. Sem prometer "neutralidade".

---

## Bloco H — Roadmap Institucional & Visão Multi-cadeia

### H1. Roadmap em fases (institucional)

**[PÚBLICO com calibração]**

| Fase | Horizonte | Foco | Status |
|---|---|---|---|
| **0 — Base de confiança** | 2026 | Pecuária bovina, FSJBE piloto, mentoria IZ-SP, integração VIP RFID | Em execução |
| **1 — Adesão de cadeia** | 2026 H2 | 5-15 fazendas piloto, primeira integração frigorífico, score público | Em planejamento |
| **2 — Compliance regulatório** | 2027 | PNIB Fase 1, EUDR-ready, SPED integrado, primeiro release oficial v1.0 | Em planejamento |
| **3 — Multi-cadeia** | 2028-2029 | Expansão suíno, ave (compliance sanitário/Halal, **não EUDR**), bovino leite, ovino | Roadmap |
| **4 — Internacionalização** | 2030+ | Camada Brasil-padrão exportável para outras geografias produtoras | Visão |

**Notas críticas**:
- **G3** já indicava: avicultura **não está sob EUDR**. Corrigir narrativa multi-cadeia.
- Não usar palavras como "explosão", "disrupção" — vocabulário inadequado para audiência institucional.

### H2. Visão de expansão multi-cadeia (numeros confirmados)

**[PÚBLICO]** Fontes IBGE PPM 2024 / Embrapa / ABIEC:
- Bovinocultura corte: ~234 milhões cabeças, base
- Bovinocultura leiteira: 35,7 Bi L · R$ 87,5 Bi VBP ✅ confirmado PPM 2024
- Suinocultura: ~46 milhões cabeças, R$ 66,2 Bi VBP (**[VERIFICAR PUBLICAMENTE]** com ABIPECS)
- Avicultura: VBP ~R$ 111 Bi (**[VERIFICAR PUBLICAMENTE]** com ABPA)
- Ovinos: 21,9 M cabeças ✅ confirmado PPM 2024
- Caprinos: 13,3 M cabeças ✅ confirmado PPM 2024

### H3. Por que "começamos pelo bovino" é a tese certa institucionalmente

**[PÚBLICO]** Argumentação institucional:
- Bovino é cadeia mais regulada (PNIB direto, EUDR cobertura)
- Maior valor agregado por unidade rastreável
- Cadeia industrial mais concentrada (10 frigoríficos = 70% do abate) → ponto de alavancagem
- Brasil é #1 mundial em exportação bovina → urgência competitiva real
- Modelo de dados bovino é extensível a outras cadeias (mesma estrutura aplica a suíno, ovino, leite)

Frase para slide:
> *"O bovino não é uma escolha tática. É a porta de entrada que abre, em seguida, toda a infraestrutura de dados do agro brasileiro."*

---

## Bloco I — Equipe, Governança, Transversais

### I1. Time fundador

**[LUCAS RESPONDER]** — bios completas a definir. Para apresentação institucional, sugiro:
- Foto editorial em PB ou em cenário rural (não headshot corporativo)
- Cargo + 1 linha sobre background (não currículo)
- Mencionar conexão com agro brasileiro / experiência relevante

**[GUARD]** Per regra interna, **pausar antes de publicar bios** — confirmar com Lucas + Pedro + Paulo + Bernardo + Ico antes de imprimir.

### I2. Mentoria científica

Ver Bloco D — Renata + César com autorização. NeuTroPec / IZ-SP institucional sem precisar autorização nominal.

### I3. Conselho consultivo / advisors

**[LUCAS RESPONDER]**
- Eraldo de Paola: confirmado como conselheiro formal?
- Outros conselheiros / advisors?
- Equity vesting / service contract?
- Estatuto da Agraas tem Conselho formalizado?

### I4. Governança da plataforma (não governança societária)

**[PÚBLICO]** Pontos a explicar institucionalmente:
- **Multi-tenant com isolamento de banco** — cada cliente tem seus dados isolados por RLS
- **Audit trail integral** — toda mutação é registrada
- **Acesso de mentor externo controlado** — pode ler, não pode escrever (modelo Renata/César)
- **Política de dados** — produtor é dono dos próprios dados, Agraas é depositária

Esse último ponto é diferencial gigante para audiência institucional. Concorrentes silenciosamente apropriam dados do produtor. Agraas posiciona produtor como dono.

---

## Bloco J — Como engajar com a Agraas (CTA institucional)

### J1. Canais de engajamento por audiência

**[PÚBLICO]** Diferente do pitch que termina em "captação", apresentação institucional termina em **convite a colaborar**:

| Audiência | CTA específico |
|---|---|
| **Governo (Secretaria SP, MAPA)** | "Convidamos a Agraas a participar como referência técnica em consultas públicas de identificação bovina e compliance EUDR" |
| **Academia (IZ-SP, Embrapa, USP)** | "Convidamos pesquisadores a validar metodologias e publicar resultados conjuntos" |
| **Cadeia (frigoríficos, traders)** | "Convidamos a desenhar pilotos de integração técnica para reduzir risco regulatório e melhorar acesso a mercados premium" |
| **Bancos / sistema financeiro** | "Convidamos a explorar o uso do score Agraas como insumo de avaliação de crédito rural" |
| **Produtores** | "Convidamos fazendas a entrar no piloto institucional ampliado em 2026 H2" |
| **Imprensa setorial** | "Disponíveis para entrevistas sobre infraestrutura digital do agro brasileiro" |

### J2. Contato institucional

**[LUCAS DEFINIR]**:
- E-mail institucional único (institucional@agraas.com.br?)
- Telefone? WhatsApp Business?
- Endereço físico?
- Quem responde? Quem assina?

---

## Resumo: o que mais precisa de você para finalizar a apresentação

### Urgência ALTA (estrutural):
1. ❓ **Público específico** — Secretaria SP? IZ-SP? JBS? Multi? Define o tom inteiro
2. ❓ **Autorização nominal Renata + César** — sem isso, citar só como "IZ-SP"
3. ❓ **Autorização nominal JBS / GPB / pessoas físicas** — risco reputacional alto
4. ❓ **Razão social + CNPJ + governança** (Bloco A3)

### Urgência MÉDIA (conteúdo):
5. ❓ **Decisão FSJBE — transparência familiar** (F3)
6. ❓ **Status real VIP Systems, Banco do Brasil, Secretaria SP, Agrishow**
7. ❓ **Política LGPD escrita** — se não existe, fazer antes (Bloco B4)
8. ❓ **Confirmar fontes regulatórias** — PNIB IN exata, EUDR data atualizada (Bloco C)

### Urgência BAIXA (refinamento):
9. ❓ **Bios fundadores** para slide de equipe (I1)
10. ❓ **Conselho consultivo formal** (I3)
11. ❓ **Posicionamento carbono** — quanto prometer (G3)

### Decisões editoriais que recomendo tomar:
- **Slogan**: usar a versão A1 ("Cada animal, um ativo digital. Auditável. Em tempo real.") como capa
- **Não citar concorrentes por nome** em apresentação institucional (regra mantida)
- **Cita FSJBE só uma vez**, no Bloco F. Não martelar.
- **Avicultura: corrigir vínculo EUDR** (ver pitch deck G3)
- **Diagrama da cadeia** (E1) merece slide próprio — vai ser printed em release
- **Bovino é porta de entrada** (H3) — frase potente, pode virar slide separado

---

> Doc montado para complementar `docs/pitch-deck-respostas-2026-05-19.md`. Use os dois juntos: pitch deck para investidor, apresentação institucional para governo/academia/cadeia/sociedade. Onde regras se sobrepõem (FSJBE-guard, números técnicos), as duas devem dizer o mesmo. Onde diferem (tom, narrativa, CTA), respeitar a audiência.
