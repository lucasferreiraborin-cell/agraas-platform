# Validação Científica — Score Engine v3.1 + Migration 131 ROI + Pauta Mentoria IZ-SP

> Entregue por `agraas-cientifico-zootecnista` em 24/06/2026 (rodada paralela autônoma).
> Documento de referência para mentoria IZ-SP (Dra. Renata Helena Branco Arnandes + Prof. César Franzon) e para decisões metodológicas do Score Engine.

---

## Resumo executivo das recomendações

### 1. Migration 138 (fiscal_score no pilar Rastreabilidade): **REVERTER**

Cientificamente impróprio incluir `NF-e de venda` e `accounting_entries` (atributos do produtor, não do animal) dentro do score zootécnico.

**Solução proposta:** criar **6º pilar separado** "Compliance Documental" com peso 6% no total, redistribuindo proporcionalmente dos 4 pilares existentes:

```
total = produtivo × 0.34
      + sanidade × 0.24
      + rastreabilidade × 0.27   (sem fiscal_score)
      + certificações × 0.09
      + compliance_documental × 0.06  (NOVO)
```

Compliance Documental interno: GTA 50% + NF-e venda 30% + regularidade contábil 20%.

### 2. Migration 131 FUNRURAL: **HARDCODE DESATUALIZADO**

A `_fn_sales_compute_roi()` usa 1,5% PF — está errado desde 01/04/2026 (LC 224/2025).

| Tipo | Alíquota até 31/03/2026 | A partir de 01/04/2026 |
|---|---|---|
| PF | 1,50% | **1,63%** |
| PJ | 2,05% | **2,23%** |
| Segurado Especial | 1,20% | **1,50%** |

**Ação:** criar `clients.tax_regime` ('pf','pj','segurado_especial') + `clients.funrural_rate` parametrizável. Backfill das 12 vendas existentes.

### 3. ROI contábil

Fórmula `(receita - custo) / custo` correta para lucro contábil — alinhada com ICAP/Scot Consultoria. Documentar no painel que custo de capital (TMA = Selic+prêmio) não está incluído. Suficiente pra produtor e frigorífico; banco vai demandar ROI econômico no futuro.

### 4. GTA e score zootécnico

- **GTA é compliance regulatório, não indicador produtivo.**
- Manter dentro do pilar Rastreabilidade como **confirmação de evento de movimentação** (já contemplado).
- Animais sem GTA em movimentações registradas devem ser **penalizados (inconsistência documental)**.
- GTA recente **não gera score extra** — apenas confirma completude do histórico de eventos.

---

## Análise técnica detalhada

### Embrapa Doc 237 — Rastreabilidade documental no framework

O Embrapa Doc 237 (Costa et al., 2018, Plataforma +Precoce) estrutura indicadores em três dimensões:
- **Produtivos** — GMD, produtividade rebanho, eficiência reprodutiva
- **Econômicos** — custo de produção, margem, receita
- **Ambientais** — sustentabilidade

A rastreabilidade aparece como **componente de suporte** ao sistema produtivo — o rastreio individual (RFID, brinco, genealogia) é pré-condição para mensurar os indicadores produtivos com confiabilidade, **não como pilar de pontuação autônomo**.

Ponto crítico: a Plataforma +Precoce **não incorpora documentação fiscal** (GTA, NF-e, lançamentos contábeis) como variável de score zootécnico. A documentação fiscal existe no contexto regulatório-sanitário, **metodologicamente separada** da avaliação de desempenho animal.

O próprio PNIB (Plano Nacional de Identificação de Bovinos e Búfalos, MAPA 2024, meta 2032) reforça essa separação:
- Rastreio zootécnico = identidade e performance do animal
- GTA e NF-e = conformidade regulatória do trânsito

### Tabela de pertinência metodológica do fiscal_score (migration 138)

| Sub-pilar proposto | Natureza real | Pertinência no score do ANIMAL |
|---|---|---|
| GTA (50 pts) | Compliance sanitário-regulatório | **Parcialmente sim** — como confirmação de evento de movimentação |
| NF-e de venda (30 pts) | Compliance fiscal-tributário | **Não** — reflete a transação comercial, não o desempenho do animal |
| accounting_entries (20 pts) | Contabilidade gerencial interna | **Definitivamente não** — é dado do produtor, não do animal |

**Risco de poluição interpretativa:** um produtor que regulariza toda a NF-e mas tem animais com GMD fraco receberia score alto de rastreabilidade — o que distorceria a sinalização de valor para o frigorífico/banco.

### Como Renata Arnandes (CAR/RFI) avaliaria

A área de especialidade da Dra. Renata é **CAR (Consumo Alimentar Residual) e RFI (Residual Feed Intake) em Nelore** — eficiência de conversão alimentar, que hoje ainda não está modelada no Score Engine.

Avaliação esperada:
- RFI e CAR medem o que o animal faz com o alimento — isso é **pilar produtivo puro**, score deve evoluir nessa direção
- Misturar NF-e e accounting_entries com rastreio zootécnico **dilui a credibilidade científica** do score, especialmente quando apresentado para instituições como IZ-SP e Embrapa
- Recomendação provável: **mantenha o score zootécnico limpo; crie camada separada para compliance fiscal/operacional**

---

## Pauta da Mentoria IZ-SP (próxima reunião)

**Duração:** 90 minutos
**Participantes:** Lucas Ferreira (Agraas), Dra. Renata Helena Branco Arnandes, Prof. César Franzon

### Bloco 1 — Contextualização (10 min)
- Evolução desde última mentoria: 58 animais ativos (FSJBE), passaporte com dimensão fiscal, persona Banco destravada
- Demanda concreta JBS por ROI por cabeça e custo por arroba — validar alinhamento
- Pivot wedge fiscal: Agraas = Plataforma +Precoce + camada fiscal (ERP bovino vertical)

### Bloco 2 — Consulta científica Score v3.1 → v3.2 (40 min)
- **Q1**: Literatura justifica incluir compliance documental (GTA, NF-e) no pilar de rastreabilidade zootécnica? Ou prática científica recomenda pilares separados?
- **Q2**: Proposta Agraas — 6º pilar "Compliance Documental" (6% do score). Pesos internos: GTA 50%, NF-e 30%, contábil 20%. Feedback metodológico?
- **Q3**: Faixas de GMD (0.3 / 0.5 / 0.8 / 1.2 kg/dia) usadas no pilar Produtivo — representam Nelore em cria/recria/engorda no cerrado? Dados IZ-SP atualizados 2023-2026?
- **Q4**: Integração CAR/RFI — quando incluir eficiência alimentar no Score Engine? Dados mínimos que o produtor precisa coletar hoje?

### Bloco 3 — Resultados piloto FSJBE (20 min)
- Distribuição de scores dos 58 animais ativos
- ROI médio por categoria (vaca de cria vs bezerro)
- Custo por arroba calculado vs cotação atual
- Pedir feedback: "esses números parecem plausíveis para uma fazenda de cria em Jandaia-GO?"

### Bloco 4 — Agenda científica e colaboração (20 min)
- Solicitar referências bibliográficas atualizadas (2023-2026) — ESALQ, ABZ, IZ-SP
- Solicitar validação das faixas de normalização por peer group (categoria + região + raça)
- **Proposta formal**: convidar Dra. Renata como advisora científica do Score Engine Agraas
  - Escopo: revisão trimestral de metodologia, crédito explícito no relatório técnico público
  - Condicionar à vontade da Renata e aprovação institucional IZ-SP
  - **NÃO usar nome em material público antes de aceite formal por escrito**

---

## Literatura científica relevante

1. Costa, F.P. et al. *Indicadores de desempenho na pecuária de corte.* Embrapa Doc 237. 2018. [link](https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090951)
2. Embrapa Gado de Corte. *Sistema PPS — Precocidade, Produtividade e Sustentabilidade.* 2024. [link](https://www.embrapa.br/en/busca-de-solucoes-tecnologicas/-/produto-servico/11170/producao-intensiva-de-bovinos-de-corte-sistema-pps)
3. Embrapa Gado de Corte. *Anuário Cicarne 2024-2025.* [link](https://www.embrapa.br/en/busca-de-publicacoes/-/publicacao/1174114/anuario-cicarne-da-cadeia-produtiva-da-carne-bovina-2024---2025)
4. UFMG/CSR. *Indicadores de Rentabilidade — Cenários para a Pecuária.* [link](https://csr.ufmg.br/pecuaria/portfolio-item/rentabilidade/)
5. Scot Consultoria. *Confinamento bovino: custo de aquisição e eficiência econômica.* 2025. [link](https://www.scotconsultoria.com.br/noticias/artigos/58970/)
6. Aegro. *FUNRURAL 2026 — alíquotas LC 224/2025.* [link](https://aegro.com.br/blog/funrural-2026/)

---

> *Validação científica · Agraas · 24/06/2026 · zootecnista interno → backend implementa migrations 141 (FUNRURAL fix) + 142 (Score v3.2 com 6º pilar)*
