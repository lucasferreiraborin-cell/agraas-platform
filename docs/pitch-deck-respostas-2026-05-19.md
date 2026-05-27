# Pitch Deck — Respostas aos blocos A-H

> Documento gerado 19/05/2026 para repassar ao Claude AI Web que está montando o deck.
> Convenções:
> - **[PÚBLICO]** = pode entrar no deck como está
> - **[CONFIDENCIAL]** = só para calibrar a checagem do outro Claude, não publicar
> - **[LUCAS CONFIRMAR]** = preciso da sua resposta antes de o outro Claude usar
> - **[VERIFICAR PUBLICAMENTE]** = outro Claude deve cruzar com fonte oficial (MAPA, IBGE, etc.)
> - **[CORRIGIR NO DECK]** = afirmação atual do deck tem erro, precisa ajuste

---

## Bloco A — Plataforma e Tração (slide 7)

### A1. Números técnicos atualizados (queries rodadas ao vivo contra produção em 19/05/2026)

**[PÚBLICO]** Os números do deck conferem:

| Métrica | Deck | Realidade hoje |
|---|---|---|
| Tabelas public | 86 | **86** ✅ |
| Policies RLS | 327 | **327** ✅ |
| Triggers | 88 | **88** ✅ |
| Funções PL/pgSQL | 68 | **68** ✅ |
| Migrations | 121 | **121** ✅ |
| Commits | 470+ | **474** ✅ |
| Views materializadas | — | 3 |

Dados operacionais ao vivo (que podem complementar o slide):
- Clientes cadastrados: **8** (4 admin, 3 client, 1 buyer pausado)
- Animais no sistema: **63** (cross-client)
- Propriedades: **14**
- Lotes: **10**

### A2. Métricas de negócio substitutas/complementares

**[CONFIDENCIAL — não publicar absolutos sem disclosure]** Minha opinião honesta:

- **Tempo médio de onboarding**: hoje é manual (seed via migration). Não temos onboarding self-service ainda — **não usar como métrica**.
- **Latência média**: não temos APM/Sentry tracking formal de p95 latency. **Não usar até instrumentarmos**.
- **Cobertura de testes**: Jest existe mas cobertura ainda baixa — **não publicar como métrica**.
- **Uptime beta**: Vercel em produção sem incidents conhecidos desde abr/2026, mas sem monitoring formal. Risco de afirmar "99,X%" sem evidência.

**Recomendação**: trocar "470+ commits" por uma métrica narrativa: *"Plataforma em produção desde abr/2026 · 121 migrations versionadas · 8 perfis ativos (FSJBE piloto + 3 perfis Mentoria IZ-SP + admins fundadores)"*. Conta uma história mais clara que números brutos de commit.

### A3. Piloto FSJBE em maio/2026

**[PÚBLICO com cautela — ver regra FSJBE-guard]**

- **Status real**: piloto MVP rodando. **Fazenda de cria** em Jandaia-GO. **Sem exportação confirmada. Sem certificação SIF. Sem rota Halal/Jeddah.** Não publicar nenhum desses claims.
- **Animais no sistema hoje**: 5 (BER-001 a BER-005, ilustrativos pré-tombamento real Multbovinos → Agraas).
- **Q3 2026 tombamento concluído**: **[LUCAS CONFIRMAR cronograma]** — per CLAUDE.md, tombamento é tratado em segundo plano, fora do caminho crítico. Manter no deck só se Q3 2026 estiver realmente firme. Caso contrário, suavizar para *"tombamento técnico em desenvolvimento durante 2026"*.
- **3 perfis ativos desde mai/2026**: minha leitura é **(1) Fazenda Mentoria IZ-SP**, **(2) Frigorífico Mentoria IZ-SP**, **(3) mentor_externo espelho FSJBE** (Renata + César logam compartilhado). Os 3 foram provisionados 18/05/2026. Mensurabilidade: existem em produção, com login funcional e RBAC validado. Não confundir com "3 fazendas piloto comerciais".

### A4. Pipeline "15-40 fazendas não relacionadas até dez/2026"

**[LUCAS RESPONDER]** — não tenho visibilidade do pipeline comercial. Nomes, probabilidades e estágios estão fora do que consigo verificar pelo código. Se for projeção, sinalizar como tal.

### A5. Vale 1 slide inteiro para "Tração"?

**[OPINIÃO HONESTA]** Hoje a tração principal é **arquitetural + relacionamentos institucionais**, não clientes pagantes recorrentes. Recomendo repaginar o slide como:

> **"Maturidade de Plataforma + Roadmap de Tração"**
>
> Plataforma (já existe): 86 tabelas, 121 migrations, 16 módulos operacionais, multi-tenant validado, RBAC mentor, AI nativa em produção.
>
> Relacionamentos institucionais (ativos em mai/2026): Mentoria IZ-SP (Dra. Renata + Prof. César, 3 perfis em produção), diálogo qualificado com JBS, GPB em desenvolvimento.
>
> Próximos 6 meses: tombamento técnico FSJBE concluído + 3 fazendas piloto adicionais + integração técnica VIP Systems para captura RFID em campo.

Isso é mais honesto e mais forte do que "470+ commits".

---

## Bloco B — Validações e Parcerias (slide 9)

### B1. Dra. Renata Helena Branco Arnandes (IZ-SP, especialista em CAR/RFI em Nelore)

**[LUCAS CONFIRMAR formalização]**
- Per CLAUDE.md: mentoria quinzenal ativa. Próxima sessão 29/05/2026.
- Existe perfil técnico em produção: cliente "Fazenda Mentoria IZ-SP" + login compartilhado com Prof. César.
- Carta de aceite formal? Termo de prestação de serviço? Apenas aceite verbal? Não sei. Sem isso, usar "mentoria científica em curso", não "consultora oficial".

### B2. Prof. César Franzon (IZ-SP)

**[LUCAS CONFIRMAR]** — mesma situação. Aparece junto com Renata no perfil compartilhado. Status formal não confirmado.

### B3. IZ-SP — "3 perfis institucionais ativos desde mai/2026"

**[PÚBLICO com correção de termo]**
- Tecnicamente verdade que há 3 perfis ativos em produção desde 18/05/2026.
- **Cuidado com a leitura**: "3 perfis institucionais ativos" pode ser interpretado como "3 instituições assinaram parceria". A verdade é mais limitada: **3 contas de acesso técnicas** provisionadas para a mentoria, usadas por Renata + César de forma compartilhada.
- Sugestão de copy honesta: *"Mentoria científica em curso com Instituto de Zootecnia de SP (Dra. Renata Helena Branco Arnandes, especialista em CAR/RFI em Nelore; Prof. César Franzon) · acesso institucional ativo desde mai/2026."*

### B4. Alexandre Alves (CFO JBS Miami)

**[LUCAS CONFIRMAR]** — per memória de projeto: "conversas ativas" com Alexandre + Mourão Filho. Não há indicação de term sheet, NDA, MoU ou investimento. **"Diálogo qualificado" é o termo correto.** Não publicar "investidor", "parceiro estratégico assinado" ou similares.

### B5. Furlan (Grupo Pecuária Brasil)

**[LUCAS CONFIRMAR]** — per CLAUDE.md: "em desenvolvimento". Equivalente a B4: conversa exploratória, não compromisso. Tom honesto: *"GPB em discussão"*.

### B6. Francisco Maturro

**[LUCAS RESPONDER]** — não tenho contexto sobre quem é, cargo ou natureza do envolvimento. Sem mais info, não publicar.

### B7. Secretaria de Agricultura SP

**[LUCAS RESPONDER]** — você mencionou submissão pra Secretaria, mas não sei o contato nominal nem o tipo de relacionamento ("ativo" pode significar muitas coisas).

### B8. Agrishow 2026

**[LUCAS RESPONDER]** — sei que houve algo pós-Agrishow (decisão 17/05 de focar 100% bovinos veio dessa janela), mas não sei se participaram como expositor, visitante, ou patrocinador.

### B9. NeuTroPec

Ver B1. *"Acesso formalizado"* depende do que isso quer dizer — se for a mentoria via Renata, é o mesmo que já está respondido. Se for programa institucional separado, **[LUCAS CONFIRMAR]**.

### B10. Mourão Filho (Banco do Brasil)

**[LUCAS CONFIRMAR cargo exato]** — per memória/CLAUDE.md, aparece como parte do diálogo JBS junto com Alexandre. Não sei o cargo formal no BB. Conversa exploratória é o que parece. Não publicar como "investidor BB".

### B11. VIP Systems

**[LUCAS CONFIRMAR estágio atual]**
- Per memória: "Chip + Atividades de Campo chegando 28/04/2026 via API" — provisionamos endpoints `/api/vip/*` em preparação.
- Em 19/05/2026: **não tenho evidência de que a integração já rodou em produção**. Pode estar em desenvolvimento técnico ainda.
- Stage honesto: **"integração técnica em desenvolvimento"**, NÃO "term sheet" nem "parceria comercial assinada".

### B12. Eraldo de Paola

**[LUCAS RESPONDER]** — não tenho info. Conselheiro formal exige Conselho Consultivo formalizado em estatuto. Equity? Service contract? Verbal? Cada um tem implicação de governança diferente.

### B-bonus. Sobre slide 11 (riscos) — mandato de comprador

**[CRÍTICO]** O argumento *"mandato de comprador (frigorífico) converte pull em push"* é **hipótese**, não compromisso assinado. Hoje **zero frigorífico** integrado via API com mandato vinculante. Se em algum momento houver carta de intenção de JBS/Marfrig/Minerva exigindo Agraas dos fornecedores, esse vira o ativo mais valioso do deck (worth its own slide). Hoje, manter como tese, não como tração.

---

## Bloco C — Competição (slide 10)

### C1. JetBov

**[VERIFICAR PUBLICAMENTE]** Não consigo checar features em real time. Pelo que conheço do mercado:
- Forte em: gestão operacional pecuária, mobile-first, app de campo
- Fraco em: rastreabilidade individual por animal, compliance EUDR, score multidimensional
- **Score multidimensional não tem** (gestão de manejo é diferente de score auditável)

### C2. iRancho

**[VERIFICAR PUBLICAMENTE]** Similar a JetBov mas mais focado em gestão financeira pecuária. Não rastreabilidade individual.

### C3. Ecotrace

**[VERIFICAR PUBLICAMENTE]** Forte em rastreabilidade ESG/EUDR via lote/talhão. "Parcial" em passaporte individual provavelmente significa: **eles fazem identificação coletiva (lote/talhão), não individual permanente do animal**. Esse é o diferencial Agraas. A leitura no slide está coerente.

### C4. MF Rural

**[VERIFICAR PUBLICAMENTE]** Marketplace agro (vende tudo) + classificados. Sem rastreabilidade individual estruturada. "Parcial" em EUDR provavelmente é só tracking básico de embarque, não conformidade EUDR full.

### C5. Outros concorrentes monitorados

**[LUCAS VALIDAR lista]** Sugiro o outro Claude também olhar:
- **Boi de Confiança** (rastreabilidade premium, foco SP)
- **SmartCare / Allflex** (RFID hardware + software, multinacional)
- **Conexa Rural** (gestão integrada)
- **Datacarne** (rastreabilidade frigorífico)
- **Cogtive** (gestão financeira + indicadores)
- **AgroSmart** (IoT + monitoramento)
- **Solineu** (frigorífico SaaS)

Tom honesto no deck: **não confrontar por nome** (regra interna). Posicionar por atributo: *"Combinação única de identidade individual permanente + score auditável + marketplace integrado em uma única camada de dados."*

### C6. "Custo de troca em ambas as pontas" (efeitos de rede)

**[CRÍTICO — corrigir se ainda for hipótese]** Hoje:
- Zero frigorífico integrado via API com Agraas (PIF/comprador está **pausado** per CLAUDE.md)
- Marketplace é "Mercado Livre do agro" (vende tudo: ração, sêmen, máquinas, RFID, serviços, revendas) — não restringido a pecuária

Efeito de rede bilateral em frigorífico hoje é **tese**, não materializado. Honesto: descrever como "thesis de defensabilidade" no Bloco 10, não como tração no Bloco 7.

---

## Bloco D — Modelo de Negócio (relevante para slide 12)

### D1. Pricing SaaS Produtor

**[LUCAS RESPONDER]** — per CLAUDE.md: "assinatura recorrente (em definição via piloto)". Não tenho ticket-alvo. Por fazenda? Por animal? Por hectare? Cada um tem implicação de unit economics diferente.

### D2. Fee transacional frigoríficos

**[LUCAS RESPONDER]** — R$/cabeça rastreada? % do valor da operação? Modelo binário (rastreado/não)?

### D3. Marketplace take-rate

**[LUCAS RESPONDER]** — take-rate %? Leilão fee? Lead fee? Modelo escolhido define muito o pitch.

### D4. Números VBP suinocultura/avicultura/leite

**[VERIFICAR PUBLICAMENTE]** Fontes oficiais para o outro Claude:
- **IBGE PPM 2024** (Produção da Pecuária Municipal) — confere ovinos 21,9M, caprinos 13,3M, leite 35,7Bi L (já validados)
- **ABIEC** — pecuária de corte
- **ABIPECS / ABCS** — suínos
- **ABPA** — aves e ovos
- **Embrapa Gado de Leite** — leiteiro
- **CEPEA-Esalq** — VBP setorial

---

## Bloco E — Regulatório (slide 4)

### E1. PNIB Fase 1 (2027)

**[VERIFICAR PUBLICAMENTE]** PNIB = Programa Nacional de Identificação Bovina (MAPA). Fase 1 cobre manejos sanitários. Base regulatória: IN MAPA recente (2024-2025) instituindo identificação individual eletrônica progressiva. **Outro Claude precisa cruzar com IN específica do MAPA (provavelmente IN 18/2024 ou sucessoras).**

### E2. PNIB Fase 2 (2030)

**[VERIFICAR PUBLICAMENTE]** Ampliação para totalidade do rebanho até 2030. Mesmo IN ou IN complementar.

### E3. EUDR — Dez/2026 e Jun/2027

**[VERIFICAR PUBLICAMENTE]** Regulamento UE 2023/1115. Teve **adiamento de 1 ano** anunciado em out/2024 (originalmente dez/2024 → dez/2025 grandes empresas → adiamento adicional possível). Outro Claude **deve checar Reg UE 2023/1115 + atualizações 2025/2026** para confirmar datas exatas.

### E4. 2033 — Proibição de movimentação não identificada

**[LUCAS CONFIRMAR fonte legal]** — eu não conheço lei específica com data 2033. Pode ser projeção lógica do PNIB Fase 2 (se 100% identificado em 2030, em 2033 movimentação não identificada seria inviável de facto). **Se não houver IN/portaria com essa data, sugiro suavizar para "horizonte 2030+"**, não cravar 2033.

### E5. Reforma Tributária — gancho específico

**[LUCAS CONFIRMAR]** EC 132/2023 + LC 214/2025 (IBS/CBS). Toca produtor rural via:
- Nota Fiscal eletrônica simplificada para produtor rural
- Regime monofásico em certos insumos
- Crédito presumido em cadeias específicas
- Digitalização SPED Fiscal

Gancho mais limpo para o deck: **digitalização fiscal acelerada na cadeia rural com a transição IBS/CBS 2026-2033**. Agraas se posiciona como camada de dados pronta para SPED + nota eletrônica integrada.

---

## Bloco F — Riscos (slide 11)

### F1. "Mandato de comprador converte pull em push"

**[CRÍTICO — ver Bloco B-bonus e C6]** Hipótese, não compromisso. Não tem frigorífico assinado mandato. Se houver carta de intenção até o pitch, isso vira o slide mais valioso do deck.

### F2. "Piloto inicial em fazenda relacionada"

**[LUCAS RESPONDER COM CUIDADO]**
- FSJBE = Fazenda São João da Boa Esperança em Jandaia-GO
- Per memória: vinculação à família fundadora não está explicitamente registrada em código, mas o tombamento Multbovinos → Agraas sugere relação prévia
- **Recomendação**: transparência total no deck de Riscos. Investidor vai descobrir em due diligence. Apple começou com Wozniak vendendo Apple I pra amigos da homebrew club — é narrativa normal de pre-seed/seed. **Não esconder, mas descrever bem**: *"Piloto inicial em fazenda da família fundadora (FSJBE/Jandaia-GO) — escolha proposital para alinhar incentivos e iterar produto antes de expandir para clientes não relacionados."*

### F3. Contratação dev sêniores H2 2026

**[LUCAS RESPONDER]** — orçamento alocado? Quantos? Já tem JD/sourcing começando? Pre-seed sem captação fechada não consegue contratar sênior, então o sinal é: depende de fechar a rodada.

---

## Bloco G — Visão de Expansão (slide 12)

### G1. Bovino = ponto de entrada ✅

OK manter. Combina com slide 14.

### G2. Suinocultura 2028-29

**[LUCAS CONFIRMAR conversas]** ABIPECS/ABCS conversaram? Sem isso, é roadmap especulativo. Manter no deck como "roadmap" não como "tração futura".

### G3. **Avicultura sob EUDR — ERRO TÉCNICO NO DECK [CORRIGIR]**

**EUDR (Reg UE 2023/1115) cobre 7 commodities: gado bovino, soja, óleo de palma, madeira, café, cacau, borracha.** **Frango NÃO está na lista.**

Se o deck afirma "avicultura sob EUDR 2028-29", está incorreto. Avicultura tem outras regulações sanitárias internacionais (gripe aviária, NCD) e padrões de welfare (RSPCA, GAP), mas não EUDR.

Sugestão de correção: usar como gancho **"rastreabilidade sanitária de aves + compliance Halal (mercado MENA forte para frango BR)"**, não EUDR.

### G4. Ovino/Caprino 21,9M / 13,3M

**[PÚBLICO]** Confere com PPM IBGE 2024 (o próprio outro Claude validou). OK.

### G5. Leite 35,7Bi L · R$ 87,5Bi

**[PÚBLICO]** Confere com PPM IBGE 2024. OK.

### G6. Safras (soja, café, cacau) 2030+

**[LUCAS CONFIRMAR plano]** EUDR exige **georreferenciamento por talhão** para essas commodities. Isso significa data layer agronômico (KML, GeoJSON, polígono validado) que não está construído ainda. Diferimento para 2030+ faz sentido técnico — mas é roadmap, não próximo passo. Manter no deck como "horizonte de expansão multi-cadeia em 2030+".

---

## Bloco H — Transversais

### H1. Razão social / CNPJ

**[LUCAS RESPONDER]** — não está no código. Para due diligence vai precisar.

### H2. Estágio captação / valuation / ticket alvo

**[LUCAS RESPONDER — CONFIDENCIAL ATÉ CALIBRAÇÃO]** — totalmente fora do meu acesso. Definir isso antes do outro Claude finalizar tom do deck. Seed (~ R$ 3-8M @ R$ 25-50M cap)? Pre-seed (~ R$ 1-2M @ R$ 10-15M cap)? Series A muda tudo.

### H3. Investidores-alvo

**[LUCAS RESPONDER — CRÍTICO PARA TOM]** Muda totalmente o que enfatizar:
- **VC AgTech** (KaszeK, SP Ventures, Barn, Aqua Capital): enfatizar TAM + escalabilidade + tech moat
- **Family offices**: enfatizar fluxo de caixa + assets reais + governança
- **Estratégicos** (JBS, Marfrig, Cargill): enfatizar integração + sinergia operacional + opção de aquisição
- **Impacto** (Vox, Yunus Negócios Sociais): enfatizar produtor pequeno + inclusão + sustentabilidade ESG

### H4. Burn / runway

**[LUCAS RESPONDER — CONFIDENCIAL]** — não publicar no deck, mas calibra urgência interna.

### H5. NDAs / restrições de publicação

**[LUCAS REVISAR]** Pontos de atenção que identifico:
- **JBS / Alexandre / Mourão Filho**: conversa exploratória pode ter ética implícita de "não citar nominalmente em deck público". Confirmar com Alexandre antes de imprimir nome.
- **Mentoria IZ-SP / Renata / César**: idem. Ética acadêmica de não usar nome em pitch sem aceite expresso.
- **FSJBE**: por ser piloto da família, decidir nível de transparência (ver F2).
- **VIP Systems**: integração técnica em andamento — citar como "parceiro técnico de RFID" é mais seguro que cravar nome até ter MoU.

---

## Resumo: o que mais precisa de você

**Urgência ALTA (destrava slides 7, 9, 10, 11):**
1. ✅ A1, A3 (núcleo técnico) — respondidos com dados ao vivo
2. ❓ A4 — pipeline 15-40 fazendas é real ou projeção?
3. ❓ B4, B5, B10 — JBS/GPB/Mourão Filho: confirmar tom "diálogo qualificado"
4. ❓ B11 — VIP Systems: integração já rodou ou ainda em dev?
5. ❓ B-bonus / F1 — algum frigorífico assinou mandato? (se sim, é o ativo mais valioso do deck)
6. ❓ F2 — nível de transparência sobre FSJBE ser da família?

**Urgência MÉDIA (destrava slide 4):**
7. ❓ E1, E2, E4 — confirmar IN MAPA + data 2033 (se houver fonte) ou suavizar
8. ❓ E5 — gancho específico Reforma Tributária

**Urgência BAIXA (transversal):**
9. ❓ H1-H4 — razão social, captação, valuation, investidor-alvo

**CORREÇÕES DIRETAS no deck (não precisa input):**
- G3 — **avicultura sob EUDR é erro técnico**. Substituir por gancho sanitário/Halal.

---

> Doc montado a partir de: queries ao vivo Supabase (Bloco A), memória de projeto + CLAUDE.md + skill `agraas-fsjbe-guard` (B/C/F/G), e best-knowledge regulatório (E/H). Onde não tenho certeza, marquei explicitamente.
