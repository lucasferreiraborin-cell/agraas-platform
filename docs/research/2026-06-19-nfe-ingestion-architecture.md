# Arquitetura de Ingestão de NF-e Multimodal — Agraas Controladoria Fiscal

> Documento técnico de arquitetura para o KILLER FEATURE pós-pivot 2026-06-19.
> Autor: agraas-controladoria-fiscal (interno).
> Status: proposta arquitetural — pendente de aprovação Lucas antes de implementação.
> Premissa-chave: **ZERO ERROS em produção**. IA é braço direito do contador, não substitui.

---

## 0. Escopo e princípios

Cinco canais de entrada (`input_channel`) que o sistema precisa aceitar:

| ID | Canal | Volume esperado | Custo médio (R$/NF) |
|---|---|---|---|
| `xml` | Upload XML NFe canônico SEFAZ | Alto | 0,02-0,08 |
| `pdf` | Upload PDF DANFE (OCR + Claude vision) | Médio | 0,15-0,40 |
| `audio` | Áudio ditado (contador/produtor) | Baixo | 0,18-0,55 |
| `csv` | CSV em lote (planilha do contador) | Médio | 0,03-0,08 / linha |
| `chave` | Apenas 44 dígitos da chave NFe | Médio | 0,15-1,20 |

Princípios não-negociáveis:
1. **Toda extração tem `confidence_score` (0-1) por campo crítico.**
2. **Toda NF entra em `nf_review_queue` com status `pending_review` até aprovação humana.**
3. **Audit trail imutável (`nf_audit_log`)** com user_id, role, action, before/after JSON.
4. **Validações fiscais são camada determinística (não-IA)** — IA sugere, regra valida.
5. **Idempotência por chave NFe (44 dígitos):** ingestão dupla nunca duplica lançamento.

---

## 1. Pipeline geral

```
                  +-------------------+
                  |  Upload / Trigger |
                  | (XML | PDF | WAV  |
                  |  | CSV | Chave44) |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | 1. Tipo Detector  |  -> magic bytes, extensão, regex /\d{44}/
                  +---------+---------+
                            |
            +---------------+---------------+
            |       |       |       |       |
            v       v       v       v       v
        [xml-p] [pdf-p] [aud-p] [csv-p] [chv-p]      Parsers específicos
            |       |       |       |       |
            +---------------+---------------+
                            |
                            v
                  +-------------------+
                  | 2. Normalizador   |  -> { chave, emitente, destinatario,
                  | NFeCanonical{}    |     itens[], totais, impostos, _meta }
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | 3. Validador      |  determinístico:
                  | Fiscal (regras)   |  - DV modulo-11
                  | severity:         |  - soma itens == total
                  | crit|warn|info    |  - ICMS/IPI/PIS/COFINS check
                  +---------+---------+  - FUNRURAL auto-calc
                            |             - duplicidade (UPSERT chave)
                            |             - CFOP/NCM coerencia
                            v
                  +-------------------+
                  | 4. Sugestor IA    |  Claude Sonnet 4.6:
                  | (Claude)          |  - sugere CFOP, NCM, conta_debito,
                  +---------+---------+    conta_credito por item
                            |             - flags needs_human_review=true
                            |               quando confidence<0.85
                            v
                  +-------------------+
                  | 5. Fila Revisão   |  status:
                  | nf_review_queue   |  pending_review -> in_review ->
                  +---------+---------+  approved | rejected | corrected
                            |
                            v
                  +-------------------+
                  | 6. Aprovacao      |  contador clica aprovar
                  | humana            |  (1-click se confidence>=0.95
                  +---------+---------+   e sem warnings)
                            |
                            v
                  +-------------------+
                  | 7. Lancamento     |  INSERT em:
                  | Contabil          |  - fiscal_documents
                  +---------+---------+  - stock_batches (entrada FEFO)
                            |             - accounting_entries (D/C)
                            |             - animal_cost_summary (se ração)
                            v
                  +-------------------+
                  | 8. Audit Log      |  toda mutacao -> nf_audit_log
                  | (imutavel)        |  (append-only, RLS read-only)
                  +-------------------+
```

---

## 2. Especificação por canal de entrada

### 2a. XML upload (canal `xml`)

**Biblioteca:** `fast-xml-parser` v4.x — escolhido sobre `xml2js` por:
- ~3-5x mais rápido (relevante p/ CSV lote);
- zero dependências runtime;
- API síncrona retorna POJO direto (sem callbacks);
- handles XML de 100MB+ sem stress de memória.

**Pipeline:**
1. Validar extensão `.xml` e magic bytes (`<?xml`).
2. Parser:
   ```ts
   import { XMLParser, XMLValidator } from 'fast-xml-parser';
   const validation = XMLValidator.validate(rawXml);
   if (validation !== true) throw new InvalidXmlError(validation.err);
   const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
   const doc = parser.parse(rawXml);
   ```
3. Validação contra schema NFe 4.00 (PL_009_V4) — opcional em MVP, obrigatório em Sprint 2. Schemas oficiais em `https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D`.
4. Extração estruturada para `NFeCanonical` (ver §3).
5. `confidence_score = 1.0` (XML canônico = ground truth).

**Casos de erro:**
- `INVALID_XML_SYNTAX` (crit)
- `MISSING_ROOT_NFE` (crit)
- `SCHEMA_VERSION_NOT_SUPPORTED` (warn — log + segue se for 3.10/4.00)
- `SIGNATURE_INVALID` (warn — não bloqueia em MVP, bloqueia em Sprint 2)

**Custo:** R$ 0,02-0,08 (1k-5k tokens p/ validação IA opcional do contexto).

---

### 2b. PDF DANFE (canal `pdf`)

**Decisão arquitetural:** **Claude Sonnet 4.6 com vision nativa** como caminho principal. Tesseract.js como fallback offline.

Por quê não Tesseract direto:
- Tesseract.js em Vercel serverless tem problemas conhecidos com WASM file resolution;
- DANFE tem layout variável entre emitentes — regex frágil;
- Claude vision aceita PDF nativo (até 100 páginas / 32MB) e devolve JSON estruturado em uma chamada.

**Pipeline:**
1. Upload PDF para Supabase Storage (`nf-uploads/{client_id}/{uuid}.pdf`).
2. Enviar PDF para Claude via Messages API:
   ```ts
   const msg = await anthropic.messages.create({
     model: 'claude-sonnet-4-6',
     max_tokens: 4096,
     messages: [{
       role: 'user',
       content: [
         { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
         { type: 'text', text: DANFE_EXTRACTION_PROMPT }  // ver §3
       ]
     }]
   });
   ```
3. Parse JSON da resposta. Cada campo crítico vem com `{ value, confidence }`.
4. Se `chave` extraída tem confidence < 0.95, validar via canal `chave` (busca SEFAZ).
5. Cross-check: total declarado pelo OCR vs soma de itens — se divergente, severity = warn.

**Campos críticos extraídos:**
- `chave_acesso` (44 dígitos)
- `cnpj_emitente` / `cnpj_destinatario`
- `numero_nfe` / `serie` / `data_emissao`
- `valor_total` / `valor_produtos` / `valor_icms` / `valor_ipi` / `valor_pis` / `valor_cofins`
- `itens[]`: `{ cprod, xprod, ncm, cfop, qcom, vunit, vprod }`

**Custo:** R$ 0,15-0,40 por PDF (PDF de 2-4 páginas = ~15k tokens input * US$ 3/M = ~US$ 0,045 = R$ ~0,25 ao câmbio 5,5).

**Fallback Tesseract:** rodar via Edge Function dedicada (não em route handler Vercel) com binários nativos pré-empacotados em container, OU rodar no cliente (browser) e fazer upload do texto extraído. Para MVP, **não implementar fallback** — Claude vision é suficiente.

---

### 2c. Áudio ditado (canal `audio`)

**Decisão arquitetural:** OpenAI Whisper API (`whisper-1` ou `gpt-4o-mini-transcribe`) — Claude ainda não tem áudio nativo na Messages API (confirmado em junho/2026, recurso anunciado como roadmap).

**Pipeline:**
1. Upload áudio (`.wav`, `.mp3`, `.m4a`, `.webm`) para Supabase Storage.
2. Transcrever via Whisper:
   ```ts
   const transcription = await openai.audio.transcriptions.create({
     file: audioStream,
     model: 'gpt-4o-mini-transcribe',  // $0.003/min
     language: 'pt',
     prompt: 'Termos técnicos: NFe, CFOP, NCM, ração, bezerro, novilho, arroba, hectare, IBAMA, CAR, GTA.'
   });
   ```
3. Enviar transcrição para Claude com prompt de extração estruturada (ver §3 — `AUDIO_EXTRACTION_PROMPT`).
4. Claude retorna `NFeCanonical` parcial — quase sempre faltam campos (impostos, chave).
5. Se contador mencionou número de NFe ou chave, **invocar canal `chave`** para busca real na SEFAZ.
6. Caso contrário, marca como `partial_record` — entra em fila com warning "Apenas dados ditados, sem ancoragem SEFAZ".

**Exemplo de input:**
> "Comprei 50 sacos de ração da Nutron, NF doze mil trezentos e quarenta e cinco, por cinco mil reais, ontem."

**Output esperado (Claude):**
```json
{
  "tipo_operacao": "compra",
  "fornecedor_razao_social": { "value": "Nutron", "confidence": 0.95 },
  "numero_nfe": { "value": "12345", "confidence": 0.90 },
  "valor_total": { "value": 5000.00, "confidence": 0.95 },
  "data_emissao_aproximada": { "value": "2026-06-18", "confidence": 0.70 },
  "itens": [{ "xprod": "Ração", "qcom": 50, "unit": "saco", "confidence": 0.85 }],
  "needs_sefaz_lookup": true
}
```

**Custo:** Whisper ~R$ 0,02/min (30s ditado ~R$ 0,01) + Claude extração ~R$ 0,12 + busca SEFAZ R$ 0,15-1,00 = **R$ 0,28-1,13**. Conservador: R$ 0,40.

---

### 2d. CSV em lote (canal `csv`)

**Biblioteca:** `papaparse` v5.x — streaming + header inference robusto.

**Estrutura mínima esperada (colunas obrigatórias):**
```
chave_nfe,numero_nfe,data_emissao,cnpj_emitente,valor_total,cfop,observacao
```

**Pipeline:**
1. Upload CSV para Supabase Storage.
2. Criar `nf_batch` (row pai) e enfileirar jobs por linha via Supabase Queue (`pgmq`) ou tabela `nf_batch_items` com `status=pending`.
3. Worker (Edge Function `process-nf-batch-item` rodando em cron 1min) consome 1 linha por vez:
   - Se tem `chave_nfe` → invoca canal `chave` (lookup SEFAZ).
   - Senão → tenta consolidar com CNPJ + número + data (busca direta na tabela `fiscal_documents` por duplicidade, depois SEFAZ).
4. Status por linha: `pending | processing | resolved | failed | needs_review`.
5. Dashboard mostra progresso `(resolved + failed) / total`.

**Custo:** R$ 0,03-0,08 por linha (assumindo 80% via XML/chave + 20% só com dados mínimos).

---

### 2e. Apenas chave NFe (canal `chave`)

**Decisão arquitetural:** Camada de abstração `SefazLookupProvider` com 2 implementações (Plug Notas + NFE.io como failover). **Não bater direto no portal nacional** — webservice oficial exige certificado A1/A3 do destinatário, complexo de gerenciar em SaaS multi-tenant.

**Providers avaliados (junho/2026):**

| Provider | Modelo de cobrança | Cobertura | Latência | Recomendação |
|---|---|---|---|---|
| Plug Notas | Por consulta (~R$ 0,15-0,40) | Nacional | ~2-5s | **Primário** |
| NFE.io | Plano + por consulta (~R$ 0,20-0,60) | Nacional | ~2-4s | **Failover** |
| Focus NFe | Mensalidade + emissão | Foco emissão | n/a | Não-fit |
| Infosimples | Por consulta (~R$ 0,80-1,20) | Nacional | ~3-6s | Premium |
| SERPRO direto | Por volume (oficial) | Nacional | ~1-3s | Avaliar Sprint 4 |

**Pipeline:**
1. Validar chave: regex `^\d{44}$` + algoritmo módulo 11 (DV no 44º dígito).
2. Cache hit em `fiscal_documents.chave_nfe` — se já existe, retorna sem custo.
3. Cache hit em `nf_sefaz_cache` (TTL 90 dias) — retorna se hit.
4. Chamada provider primário (Plug Notas). Timeout 8s.
5. Em caso de erro 5xx/timeout → failover NFE.io.
6. Persistir em `nf_sefaz_cache` (chave → XML completo) + processar via canal `xml`.

**Validação módulo 11 (determinística, sem rede):**
```ts
function validarChaveNFe(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  const base = chave.slice(0, 43);
  const dvEsperado = parseInt(chave[43], 10);
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += parseInt(base[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === dvEsperado;
}
```

**Custo:** R$ 0,15-0,80 com Plug Notas como primário.

---

## 3. Camada de inteligência (Claude)

### 3a. Schema canônico interno

```ts
type ConfidenceField<T> = { value: T; confidence: number; source: 'xml'|'ocr'|'audio'|'api'|'manual' };

type NFeCanonical = {
  chave_acesso: ConfidenceField<string>;
  numero_nfe: ConfidenceField<string>;
  serie: ConfidenceField<string>;
  data_emissao: ConfidenceField<string>;  // ISO8601
  natureza_operacao: ConfidenceField<string>;
  emitente: {
    cnpj: ConfidenceField<string>;
    razao_social: ConfidenceField<string>;
    ie: ConfidenceField<string>;
    uf: ConfidenceField<string>;
  };
  destinatario: { /* idem */ };
  itens: Array<{
    cprod: ConfidenceField<string>;
    xprod: ConfidenceField<string>;
    ncm: ConfidenceField<string>;
    cfop: ConfidenceField<string>;
    qcom: ConfidenceField<number>;
    vunit: ConfidenceField<number>;
    vprod: ConfidenceField<number>;
    suggested_conta_debito?: ConfidenceField<string>;   // sugestão IA
    suggested_conta_credito?: ConfidenceField<string>;  // sugestão IA
  }>;
  totais: {
    vprod: ConfidenceField<number>;
    vicms: ConfidenceField<number>;
    vipi: ConfidenceField<number>;
    vpis: ConfidenceField<number>;
    vcofins: ConfidenceField<number>;
    vnf: ConfidenceField<number>;
  };
  _meta: {
    input_channel: 'xml'|'pdf'|'audio'|'csv'|'chave';
    raw_storage_path: string;
    extracted_at: string;
    extracted_by: 'parser'|'claude_vision'|'whisper_claude'|'sefaz_api';
    overall_confidence: number;  // weighted avg dos campos críticos
    needs_human_review: boolean;
    validation_results: ValidationResult[];
  };
};
```

### 3b. Prompts (resumo)

**`DANFE_EXTRACTION_PROMPT`** — instrui Claude a devolver o JSON acima, **sempre** com `confidence` por campo. Marca `confidence: 0.5` quando campo está parcialmente ilegível, `0.0` quando ausente. Reforça: "Se você não tem certeza, declare baixa confiança. NUNCA invente valores."

**`AUDIO_EXTRACTION_PROMPT`** — recebe transcrição PT-BR e retorna estrutura parcial. Reforça: "É comum que o falante omita campos. Liste o que foi dito. Marque `needs_sefaz_lookup: true` se mencionou número de NFe."

**`CFOP_NCM_SUGGESTOR_PROMPT`** — recebe `xprod` + contexto (cliente é fazenda bovina, operação de compra/venda) e devolve sugestão de CFOP/NCM + conta contábil (débito ração → 1.1.04.01, crédito fornecedor → 2.1.01.01) com confidence.

### 3c. Baseline de acurácia esperada

| Canal | Acurácia campos críticos | % NFs que passam direto (confidence ≥ 0.95) |
|---|---|---|
| XML | 100% | 100% (passa sem IA, só validações fiscais) |
| Chave (SEFAZ) | 100% | 100% (idem) |
| PDF DANFE | 95-98% | 70-85% — restante vai pra revisão |
| Áudio | 60-75% | 5-15% — quase sempre exige revisão |
| CSV | depende da qualidade | 60-90% |

### 3d. Aprendizado contínuo

- Toda correção humana grava `nf_correction_log` (campo, valor_ia, valor_correto, prompt_usado, model).
- **MVP:** sem fine-tuning. Usar RAG: criar tabela `cfop_ncm_examples` que aprende padrões por cliente (ex: "ração Nutron → NCM 2309.90.10, CFOP 1.101"). Few-shot examples injetados no `CFOP_NCM_SUGGESTOR_PROMPT`.
- **Sprint 4+:** avaliar fine-tune de Haiku 4.5 quando dataset ≥ 10k correções.

### 3e. Gatilhos de `needs_human_review = true`

- `overall_confidence < 0.95`
- Qualquer validação fiscal com severity = `warning` ou `critical`
- Valor total > R$ 50k (sempre revisar)
- Fornecedor novo (CNPJ nunca visto pelo cliente)
- CFOP/NCM divergente de padrão histórico do cliente
- Operação envolve produto com alíquota especial (combustível, defensivo)

---

## 4. Validações ANTI-ERRO (camada determinística)

| Validação | Severidade | Bloqueia? | Lógica |
|---|---|---|---|
| `DV_CHAVE_MODULO_11` | critical | sim | Algoritmo §2e |
| `SOMA_ITENS_VS_TOTAL` | critical | sim | `abs(sum(vprod) - vnf) > 0.02` |
| `ICMS_CALCULADO_VS_DECLARADO` | warning | não | Base × alíq vs valor declarado |
| `IPI_CALCULADO_VS_DECLARADO` | warning | não | idem |
| `PIS_COFINS_CALCULADO` | warning | não | 0,65%/3% (cumulativo) ou 1,65%/7,6% (não-cumulativo) |
| `FUNRURAL_AUTO_CALC` | info | não | 1,63% sobre receita bruta (1,43% RAT + 0,20% SENAR) a partir 01/04/2026 (LC 224/2025) |
| `DUPLICIDADE_CHAVE` | critical | sim | `UNIQUE constraint` em `fiscal_documents.chave_nfe` |
| `CFOP_VS_CNAE_EMITENTE` | warning | não | Tabela de matriz CFOP×CNAE |
| `NCM_VALIDO` | warning | não | Validar contra tabela TIPI vigente |
| `CNPJ_DV` | critical | sim | Módulo 11 dígitos 13-14 |
| `DATA_EMISSAO_FUTURA` | critical | sim | `data_emissao > now()` |
| `DATA_EMISSAO_MUITO_ANTIGA` | warning | não | `> 5 anos` |
| `EMITENTE_EM_BLOCKLIST` | critical | sim | Lista local de fornecedores bloqueados pelo cliente |

**Implementação:** cada validador é função pura `(nfe: NFeCanonical) => ValidationResult[]`. Coleção em `lib/fiscal-validators.ts`. Suite de testes Jest obrigatória — **cada regra precisa de teste com fixture real e fixture inválida**.

---

## 5. Audit trail e rastreabilidade

### 5a. Tabelas (proposta migration 107-110)

```sql
-- 107_nf_ingestion_core.sql
create table fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  chave_nfe text not null unique,
  numero_nfe text not null,
  serie text,
  data_emissao timestamptz not null,
  cnpj_emitente text not null,
  cnpj_destinatario text not null,
  valor_total numeric(15,2) not null,
  status text not null check (status in ('pending_review','approved','rejected','annulled')),
  input_channel text not null check (input_channel in ('xml','pdf','audio','csv','chave')),
  overall_confidence numeric(4,3),
  raw_storage_path text,
  canonical_json jsonb not null,
  approved_by uuid references clients(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table nf_review_queue (
  id uuid primary key default gen_random_uuid(),
  fiscal_document_id uuid references fiscal_documents(id),
  client_id uuid not null,
  status text not null check (status in ('pending_review','in_review','approved','rejected','corrected')),
  assigned_to uuid references clients(id),
  validation_warnings jsonb,
  ai_suggestions jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table nf_audit_log (
  id bigserial primary key,
  fiscal_document_id uuid not null,
  actor_id uuid,                          -- null = sistema/IA
  actor_role text not null,               -- 'system'|'ai'|'producer'|'accountant'|'admin'
  action text not null,                   -- 'extracted'|'validated'|'suggested'|'reviewed'|'corrected'|'approved'|'rejected'|'annulled'
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz default now()
);

create table nf_correction_log (
  id bigserial primary key,
  fiscal_document_id uuid not null,
  field_path text not null,               -- ex: 'itens[0].ncm'
  ai_value jsonb,
  human_value jsonb,
  ai_confidence numeric(4,3),
  model_used text,
  corrected_by uuid not null,
  corrected_at timestamptz default now()
);

create table nf_sefaz_cache (
  chave_nfe text primary key,
  raw_xml text not null,
  provider text not null,
  fetched_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days')
);
```

### 5b. Regras de imutabilidade

- `nf_audit_log` e `nf_correction_log` são **append-only**. RLS sem `UPDATE`/`DELETE` policy — nem service role consegue alterar (via constraint adicional ou trigger).
- `fiscal_documents` aprovados **não podem ser deletados**. Anulação se dá por NF de devolução vinculada (`annulled_by_chave`).
- Triggers `before_update` que rejeitam mudanças em `chave_nfe`, `cnpj_emitente`, `valor_total` quando `status = 'approved'`.

### 5c. RLS

Padrão Agraas: `USING (client_id = get_my_client_id())`. Acrescentar role `accountant` (subset de `admin` com permissão sobre `nf_review_queue`).

---

## 6. Custos por NF-e processada

Câmbio assumido: US$ 1 = R$ 5,50 (junho/2026, ajustar). Volumes Claude Sonnet 4.6: US$ 3/M input, US$ 15/M output.

| Canal | Custo IA/API | Storage | Total estimado |
|---|---|---|---|
| XML | R$ 0,02 (validação opcional) | R$ 0,001 | **R$ 0,02-0,08** |
| PDF | R$ 0,25 (Claude vision ~15k input + 1k output) | R$ 0,002 | **R$ 0,15-0,40** |
| Áudio (30s) | R$ 0,01 Whisper + R$ 0,15 Claude + R$ 0,30 SEFAZ médio | R$ 0,001 | **R$ 0,28-0,55** |
| CSV (por linha) | 80% R$ 0,05 + 20% R$ 0,15 = R$ 0,07 | nominal | **R$ 0,03-0,08** |
| Chave | R$ 0,15-0,80 (Plug Notas) | R$ 0,001 | **R$ 0,15-0,80** |

**Mix realista por fazenda média (50 NFs/mês):**
- 30 XML (entradas eletrônicas de fornecedores) × R$ 0,05 = R$ 1,50
- 10 PDF (DANFE escaneada) × R$ 0,25 = R$ 2,50
- 5 Áudio (ditados pontuais) × R$ 0,40 = R$ 2,00
- 5 Chave (NFs perdidas/recuperadas) × R$ 0,50 = R$ 2,50

**Custo total mensal por fazenda: ~R$ 8,50.**

**Margem em ticket R$ 200/mês:** R$ 191,50 (95,75%). **Confortável.** Mesmo dobrando o uso (100 NFs/mês), custo ficaria em ~R$ 17 = 91,5% margem.

---

## 7. Pilha de bibliotecas

**Já existentes (manter):**
- `@anthropic-ai/sdk` — vision PDF, sugestões CFOP/NCM
- `@supabase/supabase-js` — storage, RLS, Postgres
- Next.js 16 App Router — API routes + Server Actions

**Adicionar ao `package.json`:**
```json
{
  "fast-xml-parser": "^4.5.0",
  "papaparse": "^5.4.1",
  "@types/papaparse": "^5.3.14",
  "openai": "^4.60.0",                  // SOMENTE para Whisper, não para LLM
  "zod": "^3.23.0",                     // schema validation NFeCanonical
  "pg-boss": "^10.0.0"                  // OR usar Supabase pgmq via SQL
}
```

**NÃO adicionar (avaliados e descartados):**
- `xml2js` — mais lento que fast-xml-parser
- `tesseract.js` — problemas em Vercel serverless, Claude vision basta
- `pdf-parse` — Claude vision elimina necessidade
- Bibliotecas brasileiras "sped-nfe" PHP — não-fit pro stack TS

---

## 8. Plano de implementação MVP (3 sprints, 6 semanas)

### Sprint 1 (semana 1-2) — desbloqueia piloto FSJBE
**Meta:** processar XML upload end-to-end com revisão humana.
- [ ] Migration 107: `fiscal_documents`, `nf_review_queue`, `nf_audit_log`, `nf_correction_log`
- [ ] `lib/nfe/parser-xml.ts` — fast-xml-parser + NFeCanonical
- [ ] `lib/nfe/validators.ts` — DV módulo 11, soma itens, duplicidade
- [ ] `lib/nfe/canonical.ts` — schema Zod + tipos
- [ ] `app/api/nfe/upload/route.ts` — POST XML, retorna `nf_review_queue.id`
- [ ] `app/controladoria/revisao/page.tsx` — listagem fila pendente
- [ ] `app/controladoria/revisao/[id]/page.tsx` — review + 1-click approve
- [ ] Lançamento contábil básico: criar `stock_batches` na aprovação
- [ ] Testes Jest: 10 fixtures XML reais + casos de erro
- [ ] **Entregável:** contador FSJBE consegue subir XML, validar e aprovar

### Sprint 2 (semana 3-4) — robustez fiscal
**Meta:** PDF DANFE + validações fiscais completas + audit trail produção.
- [ ] `lib/nfe/parser-pdf.ts` — Claude vision com prompt versionado
- [ ] `app/api/nfe/upload-pdf/route.ts` (multipart)
- [ ] Validações ICMS/IPI/PIS/COFINS/FUNRURAL (LC 224/2025)
- [ ] Triggers de imutabilidade em `fiscal_documents`
- [ ] Dashboard `nf_audit_log` com filtros (quem, quando, ação)
- [ ] `nf_sefaz_cache` + idempotência forte por chave
- [ ] Confidence-score-aware UI (highlight visual em campos < 0.85)
- [ ] **Entregável:** sistema aceita PDF, valida fiscal, audita tudo

### Sprint 3 (semana 5-6) — multimodal completo
**Meta:** áudio + CSV + número-só + RAG para sugestões.
- [ ] `lib/nfe/parser-audio.ts` — Whisper + Claude extração
- [ ] `lib/nfe/parser-csv.ts` — papaparse streaming + `nf_batch`
- [ ] `lib/nfe/sefaz-lookup.ts` — Plug Notas primário + NFE.io failover
- [ ] Edge Function `process-nf-batch-item` (cron 1min)
- [ ] `cfop_ncm_examples` + RAG few-shot
- [ ] Dashboard CSV batch progress
- [ ] **Entregável:** 5 canais operando, contador FSJBE em produção

### Pós-MVP (Sprint 4+, fora deste documento)
- Schema XSD validation NFe 4.00 estrita
- Assinatura digital A1/A3 validação
- Fine-tune Haiku 4.5 quando ≥10k correções
- Conciliação bancária cruzada
- Webhook SEFAZ para NFs emitidas contra CNPJ do cliente

---

## 9. Riscos arquiteturais e mitigação

### Risco 1 — IA alucina valor monetário e contador aprova no 1-click
**Probabilidade:** média. **Impacto:** crítico (lançamento contábil errado, retrabalho, perda de confiança).

**Mitigação:**
- 1-click approve **só liberado** quando `overall_confidence ≥ 0.95` E **zero validações com severity ≥ warning**.
- Validação determinística `SOMA_ITENS_VS_TOTAL` é crítica e bloqueia — independente da IA.
- Cross-check obrigatório PDF → SEFAZ quando confidence da chave < 0.95.
- Toda aprovação > R$ 50k cai em revisão dupla (2 contadores) — configurável por cliente.

### Risco 2 — Dependência de provider externo (Plug Notas / NFE.io / Whisper) cair
**Probabilidade:** média. **Impacto:** alto (CSV lote para, canal `chave` para, áudio para).

**Mitigação:**
- Camada de abstração `SefazLookupProvider` com failover NFE.io.
- Cache local `nf_sefaz_cache` 90 dias — reduz dependência.
- Fila assíncrona (`nf_batch_items`) com retry exponencial — outage curto não perde dados.
- Whisper: fallback para Claude transcript futuro (quando lançar áudio nativo) — código já isolado em `parser-audio.ts`.
- SLA mensal monitorado — se algum provider < 99%, swap.

### Risco 3 — Volume de revisão humana inviabiliza o serviço
**Probabilidade:** alta nos primeiros 3 meses. **Impacto:** alto (proposta de valor é "automatizar contador", não "duplicar trabalho").

**Mitigação:**
- Métrica de norte: **% NFs auto-aprovadas sem toque humano** (target inicial 40%, sprint 6: 70%, ano 1: 85%).
- RAG `cfop_ncm_examples` melhora sugestão por cliente — após 20 NFs revisadas, padrão se consolida.
- Bulk-approve: contador pode aprovar 20 NFs do mesmo fornecedor com mesmo CFOP em 1 ação.
- Telemetria: dashboard interno mostra `confidence × taxa_correção_humana` por modelo/prompt. Itera prompts toda semana baseado nos campos mais corrigidos.
- Decisão de produto: piloto FSJBE absorve revisão manual por 2-3 meses como fase de aprendizado supervisionado — não cobrar full price nesse período.

---

## Apêndice A — Referências consultadas

- Portal NFe oficial: https://www.nfe.fazenda.gov.br
- Schemas XSD NFe 4.00 (PL_009_V4): repositório nfephp-org/sped-nfe
- Whisper API pricing: US$ 0,003-0,006/min (gpt-4o-mini-transcribe / whisper-1)
- Claude Sonnet 4.6 pricing: US$ 3/M input, US$ 15/M output. PDF nativo até 100 páginas / 32MB.
- LC 224/2025 (FUNRURAL): IN RFB 2.321/2026 — alíquotas 1,63% (1,43% previdência+RAT + 0,20% SENAR) a partir 01/04/2026.
- fast-xml-parser vs xml2js: 3-5x mais rápido em payloads NFe típicos (~50-200KB).
- Vercel + Tesseract.js: incompatibilidade conhecida WASM resolution — motivo para preferir Claude vision.

## Apêndice B — Decisões adiadas (revisitar Sprint 4)

- SERPRO direto vs Plug Notas (custo unitário menor mas operacional mais pesado).
- Fine-tune Haiku 4.5 para CFOP/NCM (avaliar quando ≥10k correções rotuladas).
- Validação assinatura digital XMLDSig na ingestão XML (atualmente apenas warning).
- Integração com contabilidade externa (Domínio, Alterdata) via export SPED.
