# O que já existe na plataforma Agraas

> Inventário técnico levantado do código, não de memória nem de deck.
> Insumo da **página anti-cópia do Cenário 3** e do material da iBoi.
> Levantado em 05/09/2026 · repositório em `b54ac13` · 161 migrations · 168 testes.
>
> Classificação: **FATO** = verificado no código, com caminho de arquivo.
> **PREMISSA** = estimativa nossa, com justificativa.
> Nada aqui é para uso externo sem revisão humana.

---

## Por que este documento existe

A pergunta que a iBoi (ou qualquer parceiro, ou qualquer investidor) faz é
sempre a mesma: *"o que exatamente vocês têm, e quanto tempo eu levaria para
construir isso?"*

Este documento responde a primeira metade com precisão de arquivo. A segunda
metade — custo de reposição — está na seção final, e é **PREMISSA**.

---

## 1. Rastreabilidade e ciência

| O que | Estado | Onde |
|---|---|---|
| Passaporte digital público por animal | **FATO** — no ar, sem autenticação, QR code, PT/EN/AR | `app/passaporte/[agraas_id]/` · `lib/passport-i18n.ts` |
| Score Agraas — índice 0 a 100 por animal, fazenda e produtor | **FATO** — motor em SQL | migrations `036` (v2), `123` (v3), `138` (v3.1) |
| Sub-pilar fiscal dentro de Rastreabilidade | **FATO** — Rastreabilidade = 0,8 × legado + 0,2 × fiscal | migration `138` |
| Curva de crescimento peso × tempo com GMD | **FATO** | `lib/agraas-analytics.ts` |
| Timeline de eventos, pesagens, aplicações sanitárias | **FATO** | `app/animais/[id]/` · `app/pesagens/` · `app/aplicacoes/` |
| GTA digital | **FATO** | migration `157` · `app/gta/` |
| Tracking de embarques | **FATO** | `app/tracking/` |

**Ressalva de governança (regra 7):** o repositório versiona até **v3.1**, mas a
produção roda **v3.2**, gravada por caminho não versionado. Isso está registrado
em `06 - Aprendizados/Dívida técnica do banco Agraas` e precisa ser reconciliado
antes de qualquer afirmação externa sobre a versão do Score.

---

## 2. Fiscal, contábil e controladoria — a porta de entrada

Este é o bloco que mais pesa numa conversa de parceria, porque é o que uma
empresa de hardware não constrói.

| O que | Estado | Onde |
|---|---|---|
| Parser de NF-e por item, com ICMS completo | **FATO** — `vBC`, `pRedBC`, `pICMS`, `vICMS`, `vICMSDeson`, `motDesICMS`, `cBenef` | `lib/fiscal/nfe-parser.ts` |
| Monofasia de combustível (CST 61) | **FATO** — `qBCMonoRet`, `adRemICMSRet`, `vICMSMonoRet` | idem |
| Ingestão multimodal de nota | **FATO** — XML, PDF, áudio, CSV, manual | `app/api/fiscal/parse-xml` · `app/api/parse-doc` · migration `133` |
| FUNRURAL parametrizado por cliente | **FATO** — PF 1,63% · PJ 2,23% · Segurado Especial 1,50% | `lib/funrural.ts` · migrations `131`, `141` |
| LCDPR com geração do arquivo | **FATO** — `generate_lcdpr_txt()` | migrations `144`, `147` · `app/api/export/lcdpr` |
| Controladoria: contas, cash-flow, estoque FEFO | **FATO** | `app/controladoria/*` |
| Custo de produção e ROI por animal | **FATO** | `app/custo-producao/` · `app/custos/` |
| Campos de IBS/CBS por nota | **FATO** — `cbs_value`, `ibs_value`, créditos presumidos, flag de contribuinte, receita bruta anual | migration `143` |
| Livro de regras versionado com trava de verificação | **FATO** — `verificado_em` obrigatório | `rules/` · `lib/rules/loader.ts` |
| Lint que impede colisão de schema | **FATO** — roda no CI e no Jest | `scripts/migration-lint.ts` |

**O que NÃO existe, e é importante dizer:** a plataforma **lê** nota fiscal, não
**emite**. Zero SEFAZ de saída, zero certificado digital, zero DANFE gerado, zero
integração com emissor. Seis caminhos de entrada, nenhum de saída.

---

## 3. Financeiro e mercado

| O que | Estado | Onde |
|---|---|---|
| Hedge — trava de preço e margem, rebanho e lote | **FATO** — curva BGI de referência, break-even, piso via put | `app/hedge/` |
| Marketplace | **FATO** — publicação e negociação | `app/marketplace/` |
| Cotação de arroba integrada | **FATO** — cron diário | `app/api/cron/cotacao` |
| Cobrança recorrente | **FATO** — Stripe ativo, 3 planos publicados | `app/api/stripe/*` · `app/planos/` |

**Ressalva:** a taxa de 2% do marketplace está **publicada** na página de planos e
**não existe no código**. Termo comercial no ar sem produto atrás.

---

## 4. As cinco personas sobre o mesmo dado

Este é o ativo arquitetural, e é o mais difícil de copiar: não são cinco produtos,
é um dado com cinco leituras, cada uma com RLS própria.

| Persona | O que enxerga | Estado |
|---|---|---|
| Produtor | gestão, custo, fiscal, hedge | **FATO** — em produção |
| Contador | carteira de produtores, obrigações | **FATO** — em produção, **somente leitura** |
| Frigorífico / comprador | lotes disponíveis, compliance de origem | **FATO** — flag ligada |
| Banco | dossiê de crédito, dados sensíveis mascarados | **FATO** — flag ligada, PDF gerado |
| Admin | operação | **FATO** |

**Ressalva:** a persona Contador não escreve nada — zero mutações em
`app/contador/`. Para o canal contador funcionar como distribuição, ela precisa
ganhar poder de ação.

---

## 5. Infraestrutura e disciplina de engenharia

Isso raramente entra em deck e é o que separa protótipo de produto.

- **Multi-tenant com RLS por linha** — `get_my_client_id()` resolvendo via
  `auth.uid()`; toda tabela operacional com `client_id` e política. **FATO**
- **161 migrations versionadas** com rollbacks separados em `supabase/rollbacks/`. **FATO**
- **168 testes automatizados**, incluindo isolamento de RLS entre tenants. **FATO**
- **Feature flags** que escondem funcionalidade inteira sem remover código —
  ovinos, caprinos, aves, agricultura e portal do comprador continuam íntegros. **FATO**
- **Hooks de CI**: typecheck bloqueante por arquivo, lint de migrations,
  guard de compliance de copy pública. **FATO**
- **IA em 7 rotas** (Claude), com custo medido por rota. **FATO**

---

## 6. Calendário regulatório 2026–2033

O que empurra a adoção, com a classificação honesta de cada linha.

| Vigência | O que muda | Classificação |
|---|---|---|
| 05/01/2026 | NFP-e obrigatória para todos os produtores | **FATO** — Ajuste SINIEF 27/2024 (CONFAZ) |
| 01/04/2026 | FUNRURAL: PF 1,63% · PJ 2,23% · Seg. Especial 1,50% | **FATO** — LC 224/2025 + IN RFB 2.305/2025, confirmado pela RFB em 12/02/2026 |
| 2026 | IBS/CBS em fase de testes — 1% **compensável** (CBS 0,9 + IBS 0,1). Não é cobrança líquida | **FATO** — LC 214/2025 art. 343 |
| até 31/05/2026 | LCDPR obrigatório para PF com receita bruta > R$ 4,8 mi | **FATO** — Receita Federal |
| até 30/09/2026 | DITR 2026 | **FATO** — Lei 9.393/96 |
| até 31/12/2027 | Convênio ICMS 100/97 prorrogado (isenção interna; base reduzida 60% e 30% nas interestaduais) | **FATO** — Conv. ICMS 79/25 |
| 2027 | CBS plena. Limiar de R$ 3,6 mi define contribuinte regular | **FATO** — LC 214/2025 |
| 2027–2032 | PNIB — identificação individual obrigatória em ondas | **A CONFIRMAR** — Portaria SDA/MAPA 1.331/2025, texto não verificado |
| 2029–2033 | IBS em transição | **FATO** — EC 132/2023 |
| dez/2026 | EUDR (adiado) | **FATO** — Regulamento UE 2023/1115 |

**Leitura para o C3:** entre 2026 e 2033 há **nove marcos regulatórios** que
mexem em nota fiscal, tributo ou identificação animal. Cada um deles é
manutenção contínua de regra — não é um produto que se constrói e congela.
É esse fluxo que a camada de software absorve e o hardware não.

---

## 7. Custo de reposição — quanto custaria reconstruir

**PREMISSA.** Estimativa nossa a partir do que está inventariado acima. Não é
avaliação de empresa e não é preço.

| Bloco | Esforço estimado | Justificativa |
|---|---|---|
| Multi-tenant + RLS + auth | 2–3 meses/dev | 161 migrations, política por tabela, testes de isolamento |
| Parser de NF-e + ingestão multimodal | 2–3 meses/dev | o parser cobre armadilhas reais (colisão `vICMS`/`vICMSST`, monofasia, CST por grupo) |
| Motor fiscal (FUNRURAL, LCDPR, controladoria, custo por animal) | 4–6 meses/dev | é domínio, não código: exige contador junto |
| Score com lastro metodológico | 3–4 meses + mentoria científica | não se compra pronto; a validação é institucional |
| Cinco personas com RLS distinta | 2–3 meses/dev | o difícil não são as telas, é o modelo de acesso |
| Passaporte público + QR + i18n | 1 mês/dev | — |
| Hedge, marketplace, cotação | 2 meses/dev | — |
| **Total** | **16 a 22 meses/dev** | sem contar o tempo de descobrir o domínio |

**A parte que não se compra com meses/dev:** o conhecimento de que
`CREATE TABLE IF NOT EXISTS` gera erro silencioso, de que o CHECK de severidade
derruba insert sem avisar, de que o ETL descarta coluna que o destino não tem.
Isso são três meses de bug em produção transformados em teste automatizado.

**Referência externa para calibrar:** a Aegro levou **12 anos** e **R$ 18 mi**
captados para chegar a 5.000 fazendas — e é gestão agrícola, não fiscal-pecuária.
**BENCHMARK** — AgFeed, abr/2026.

---

## 8. O que este documento NÃO afirma

- Que a plataforma tem cliente pagante. **Não tem.** Base 100% demo.
- Que o onboarding funciona ponta a ponta. **Nunca foi percorrido por terceiro.**
- Que emitimos nota fiscal. **Não emitimos.**
- Que o Score v3.2 da produção está versionado. **Não está.**
- Qualquer número da iBoi. **Nenhum dado deles é público para nós.**

Frase que resume o estado, e que deve ser dita antes que alguém descubra sozinho:
**produto construído que nunca foi vendido.**

---

*Fonte: leitura direta do repositório em 05/09/2026. Para uso interno e como
insumo de material externo — nunca copiado direto para fora sem revisão humana.*
