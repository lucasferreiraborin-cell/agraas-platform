# Reforma Tributária Rural BR 2026-2033 — Análise Técnica para Agraas

> Entregue por `agraas-controladoria-fiscal` em 24/06/2026.
> Documento READ-ONLY de referência. Backend implementa migrations baseadas no DDL aqui.

---

## Resumo executivo

**3 ações URGENTES para conformidade 2026:**

1. **FUNRURAL — alíquotas LC 224/2025 desde 01/04/2026** (PF 1.63% / PJ 2.23%) — Migration 141 cobriu o cálculo dinâmico
2. **IBS/CBS — cobrança REAL desde 01/01/2026 a 1% total** (CBS 0.9% + IBS 0.1%) — NF-e precisa de campos novos
3. **LCDPR — NIRF + bank_accounts + exportador .txt** — captura o contador como canal (modelo Omie)

---

## MISSÃO 1: IBS/CBS Shadow 2026

### Calendário transição

| Período | CBS | IBS | Situação |
|---|---|---|---|
| **2026-2027** | **0,9%** | **0,1%** | Cobrança REAL (não consultivo) |
| 2028 | Sobe | Sobe | Transição acelerada |
| 2029-2032 | Sobe gradual | Sobe gradual | ICMS/ISS/PIS/COFINS reduzem |
| 2033 | ~8-9% | ~8-9% | Substituição total |

### Contribuinte IBS/CBS

- **Contribuinte:** receita bruta anual ACIMA R$ 3,6M (PF ou PJ)
- **Não-contribuinte:** abaixo de R$ 3,6M ou integrado verticalmente

### Crédito presumido (art. 168 LC 214/2025)

Quando contribuinte compra de não-contribuinte, comprador tem crédito presumido. NF-e do produtor não-contribuinte DEVE discriminar:
- (a) valor da operação
- (b) valor do crédito presumido
- (c) valor líquido fiscal (a - b)

### Diferimento de insumos (art. 138 + Anexo IX)

Insumos agropecuários têm IBS/CBS reduzido em 60% + diferimento. O valor diferido é descontado do crédito presumido na venda do produto final.

### Implementação requerida (Agraas)

| Necessidade | Prioridade |
|---|---|
| `clients.is_contribuinte_ibs_cbs` + `clients.receita_bruta_anual` | URGENTE |
| `fiscal_invoices.cbs_credito_presumido`, `ibs_credito_presumido`, `valor_liquido_fiscal` | URGENTE |
| Tabela `ibs_cbs_config` com alíquotas por ano-calendário | ALTA |
| Mapeamento NCM → Anexo IX | ALTA |
| Parser NF-e XML atualizado | ALTA |

---

## MISSÃO 2: FUNRURAL pós LC 224/2025 (já implementado migration 141)

### Alíquotas vigentes desde 01/04/2026

| Modalidade | INSS | RAT | SENAR | TOTAL |
|---|---|---|---|---|
| **PF rural** | 1.32% | 0.11% | 0.20% | **1.63%** |
| **PJ rural** | 1.87% | 0.11% | 0.25% | **2.23%** |
| **Segurado especial** | isento | — | — | **isento** |

### Substituição tributária

| Comprador | Vendedor | Quem recolhe |
|---|---|---|
| Frigorífico/Coop/Agroindústria | PF | Comprador retém 1.63% |
| Outro produtor PF | PF | Produtor PF vendedor recolhe |
| Qualquer | PJ rural | PJ rural recolhe 2.23% diretamente |

### Opção folha (PJ)

PJ rural pode optar por previdência sobre folha (20% INSS patronal). Compensa quando folha/comercialização proporcional baixa.

### Tabela alíquotas DDL (já incluído migration 141)

```sql
CREATE TABLE funrural_aliquotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_ini date NOT NULL,
  vigencia_fim date,
  modalidade text NOT NULL CHECK (modalidade IN ('pf','pj','segurado_especial')),
  inss_pct numeric(6,4) NOT NULL,
  rat_pct numeric(6,4) NOT NULL DEFAULT 0,
  senar_pct numeric(6,4) NOT NULL DEFAULT 0,
  total_pct numeric(6,4) GENERATED ALWAYS AS (inss_pct + rat_pct + senar_pct) STORED,
  fonte_legal text,
  created_at timestamptz DEFAULT now()
);
```

---

## MISSÃO 3: LCDPR layout 1.3

### Obrigatoriedade
- Produtor rural **PF** com receita bruta acima de **R$ 4.800.000** no ano-calendário anterior
- Prazo LCDPR 2027 (dados 2026): março-maio/2027

### Estrutura do arquivo

| Bloco | Registros | Conteúdo |
|---|---|---|
| 0 | 0000, 0010, 0040, 0045, 0050, 0990 | Identificação + cadastros |
| Q | Q100 | Lançamentos receita/despesa |
| 9 | 9990, 9999 | Encerramento |

### Q100 — formato

```
|Q100|DATA|NIRF|TIPO|CNPJ_CPF_TERCEIRO|NOME|HISTORICO|VALOR|CONTA|NUM_DOC|
```
- TIPO: 1=receita, 2=despesa
- NIRF: liga lançamento a imóvel (campo 0040 obrigatório)

### Implementação requerida

| Necessidade | Prioridade |
|---|---|
| `properties.nirf` + `properties.area_total_hectares` | URGENTE |
| `bank_accounts` (registro 0050) | MÉDIA |
| `cost_records.lcdpr_tipo` + `cost_records.num_doc` | ALTA |
| `lcdpr_exports` (histórico) + API `/api/fiscal/export-lcdpr?year=` | ALTA |

### Multa por atraso
- R$ 100/mês ou fração (R$ 50/mês se regularizado antes intimação)

---

## MISSÃO 4: ECD/ECF Rural

### Prazos 2026
- **ECD (dados 2025):** até **30/06/2026**
- **ECF (dados 2025):** até **31/07/2026**
- ECD precede ECF — se ECD atrasar, ECF fica bloqueada (multa dupla)

### Bloco L (atividade rural — só Lucro Real)
- `0020.IND_ATIV_RURAL = 'S'` ativa Bloco L
- **L210**: demonstrativo resultado atividade rural
- Atividades mistas: lucro/prejuízo segregado por atividade

### CPC 29 (NBC TG 29) — diferenças críticas

| Aspecto | Genérica | Rural (CPC 29) |
|---|---|---|
| Rebanho | Imobilizado custo histórico | **Ativo biológico** (circulante engorda / não-circulante reprodutor) |
| Mensuração | Custo histórico | Fair value menos custo venda (ou custo se VJ não confiável) |
| Variação VJ | Sem | Resultado: "Ganho/Perda variação VJ ativos biológicos" → afeta IRPJ/CSLL |
| Depreciação rebanho | Sim | Não aplica para rebanho mensurado fair value |

A Agraas já tem cotação arroba em `platform_settings` — **pode calcular fair value automaticamente** (diferencial vs Aegro/Omie).

---

## MISSÃO 5: Plano de Contas Rural completo (DDL pronto)

DDL completo de `chart_of_accounts` + seeds (~150 linhas) está no arquivo original. Inclui hierarquia 5 níveis para:
- **1 Ativo** (caixa, créditos, estoques, ativos biológicos circulantes/não-circulantes, imobilizado)
- **2 Passivo** (fornecedores, obrigações fiscais incluindo CBS/IBS, financiamentos)
- **3 Patrimônio Líquido** (capital, reservas, AVJ ativos biológicos)
- **4 Receitas** (venda bovinos, outras, variação VJ, deduções)
- **5 Custos** (cria, recria, engorda separados + custos comuns + aquisição animais)
- **6 Despesas** (administrativas, financeiras, rastreabilidade)

CPC 29 mapeado via coluna `cpc29_categoria` (ativo_biologico_circulante / nao_circulante / produto_agricola).

---

## Gap analysis consolidado

| Obrigação | Tem | Falta | Prioridade |
|---|---|---|---|
| FUNRURAL alíquota atualizada | ✅ Migration 141 | — | — |
| FUNRURAL modalidade produtor | — | clients.funrural_modalidade | ALTA |
| IBS/CBS campos NF-e | — | cbs_credito_presumido, ibs_credito_presumido, valor_liquido_fiscal | URGENTE |
| IBS/CBS contribuinte cadastro | — | is_contribuinte_ibs_cbs + receita_bruta_anual | URGENTE |
| IBS/CBS alíquotas transição | — | Tabela ibs_cbs_config | ALTA |
| LCDPR NIRF imóvel | — | properties.nirf | URGENTE |
| LCDPR contas bancárias | — | bank_accounts | MÉDIA |
| LCDPR exportador .txt | — | /api/fiscal/export-lcdpr | ALTA |
| ECD/ECF plano de contas rural | ⚠️ chart_of_accounts (8 contas seed) | DDL ~150 linhas (este doc) | ALTA |
| ECD/ECF ativo biológico | — | animals.conta_contabil + metodo_mensuracao | ALTA |
| ECD/ECF segregação rural | — | atividade_rural em cost_records + sales | MÉDIA |
| ECD/ECF fair value rebanho | ✅ platform_settings.cotacao_arroba | Função cálculo AVJ | MÉDIA |

---

> *Reforma Tributária Rural · Agraas · 24/06/2026 · controladoria-fiscal → backend implementa migrations 143+ (IBS/CBS + LCDPR + plano de contas completo)*

Documento original com 100% das fontes URL + DDL completo do plano de contas (~150 linhas SQL): vide output do agente em `tasks/a398f725eb59040c9.output`.
