# GitHub Highlights para a Agraas — OSS que agrega ao projeto

> Varredura de 6 frentes (pesquisa web, repos reais e verificáveis) em **22 de junho de 2026**.
> Legenda: **adotar** (pegar agora) · **testar** (prototipar) · **observar** (futuro) · ⚠️ licença com risco.
> Regra de ouro de licença: **MIT/Apache** = seguro embutir; **LGPL/MPL** = ok se rodar isolado/sem forkar; **GPL/AGPL** = só como CLI/serviço separado por processo, **nunca** linkar no código do SaaS.

---

## 1. Fiscal / NF-e Brasil — alimenta DIRETO o backend de ingestão NF-e

| Repo | Licença | O quê | Onde encaixa | Rec. |
|---|---|---|---|---|
| **akretion/nfelib** | MIT | Parser/serializer de NF-e gerado dos **XSD oficiais SEFAZ** (Python) | Parse XML mod. 55/65 → objeto tipado p/ validação determinística. Microserviço Python | **adotar** |
| **vmarchesin/br-validate-dfe-access-key** | MIT | Valida chave-44 (estrutura + DV módulo-11), zero-dep, npm | Canal "chave-44" no backend TS, antes de consultar SEFAZ | **adotar** |
| **leogregianin/siscomex-ncm** | MIT | Consulta tabela **NCM oficial** via Siscomex (cache local) | Valida/auto-completa NCM dos itens (não JSON estático que envelhece) | **adotar** |
| **jansenfelipe/cfop** | MIT | Dataset CFOP (CSV/npm) | Seed de tabela CFOP de referência | observar |
| **Engenere/BrazilFiscalReport** | LGPL-3.0 | Gera **DANFE** PDF a partir do XML | Render da DANFE na fila de revisão (isolar como serviço Python) | testar |
| ~~nfewizard-org/nfewizard-io~~ | ⚠️ GPL-3.0 | Validação XSD + status SEFAZ (Node) | Mais completo em Node, mas **copyleft forte** — só como serviço isolado | observar |

> **GAP que fica in-house:** nenhum OSS cobre a **validação fiscal BR** completa (DV chave, NCM/CFOP/CST coerência, leiaute SEFAZ). Essa é a **camada determinística proprietária da Agraas** — o diferencial. Os repos acima são motores de parsing/dado, não substituem a regra fiscal.

**Arquitetura sugerida:** microserviço Python (nfelib + BrazilFiscalReport) para o caminho oficial/DANFE + validação de chave-44/CFOP/NCM no backend TS. Parte MIT carrega o caminho crítico; LGPL fica isolada.

---

## 2. Supabase / RLS + segurança de banco — arma o `security-rls-auditor` e a premissa zero-erros

| Repo | Licença | O quê | Rec. |
|---|---|---|---|
| **supabase/splinter** | Apache-2.0 | Linter SQL = motor dos Security/Performance Advisors. Detecta `rls_enabled_no_policy`, `rls_disabled_in_public`, `auth_users_exposed` | **adotar** (roda no CI, falha build se faltar policy) |
| **usebasejump/supabase-test-helpers** | MIT | pgTAP p/ Supabase: `authenticate_as()`, `rls_enabled()` — **prova que tenant A não lê tenant B** | **adotar** |
| **theory/pgtap** | BSD-like | Unit test de Postgres (RLS, triggers, **validação fiscal determinística** no banco) | **adotar** |
| **supabase/cli** | MIT | Gera **tipos TS** do schema + migrations + `db test`/`db lint` | **adotar** |
| **ariga/atlas** | Apache-2.0 | Migrations schema-as-code + análise que barra mudança que afrouxa RLS | testar |

---

## 3. DevSecOps — CI/CD, pre-commit e candidatos a hook `PreToolUse`

| Repo | Licença | O quê | Rec. |
|---|---|---|---|
| **gitleaks/gitleaks** | MIT | Secret scanning offline (Supabase/Stripe/Anthropic/Resend keys) | **adotar** (pre-commit + PreToolUse) |
| **semgrep/semgrep** + **semgrep-rules** | LGPL/rules-license | SAST com **regras custom**: proibir `service_role` no client, exigir filtro de tenant antes de insert fiscal | **adotar** |
| **aquasecurity/trivy** | Apache-2.0 | CVE em deps npm + SBOM + scan de licença contaminante | **adotar** |
| **google/osv-scanner** | Apache-2.0 | 2ª fonte de SCA (complementa Trivy) | testar |
| **trufflesecurity/trufflehog** | ⚠️ AGPL (só CLI) | **Verifica** se segredo vazado ainda está ativo | testar |

> Headers/CSP no Next.js 16: **não** usar repos OSS parados (next-secure-headers) — usar a abordagem nativa (CSP com nonce via middleware) + o Security Advisor nativo do Supabase.

---

## 4. IA / extração de documentos — canais PDF/áudio/imagem + Sugestor IA

| Repo | Licença | O quê | Rec. |
|---|---|---|---|
| **docling-project/docling** | MIT | IBM: PDF/imagem → estrutura de **tabela** (reduz alucinação do LLM dando geometria pronta) | **adotar** (canal PDF/DANFE) |
| **567-labs/instructor-js** | MIT | Output estruturado p/ LLM em **TS + Zod**, com retry de validação | **adotar** (guardrail do Sugestor IA — fit perfeito de stack) |
| **getomni-ai/zerox** | MIT | OCR/vision → JSON, **SDK Node nativo**, suporta Claude | testar |
| **google/langextract** | Apache-2.0 | Extração com **source grounding** (cada campo → trecho exato = trilha de auditoria) | testar |
| **ocrmypdf/OCRmyPDF** | MPL-2.0 | OCR determinístico em PDF escaneado, antes do LLM | testar |

> **outlines** (constrained decoding) não se aplica — Claude via API não expõe logits; por isso **instructor-js** (validação + retry, agnóstico) é a escolha pragmática.

---

## 5. Next.js 16 / React 19 — funcionalidade de produto (controladoria/contador + campo)

| Repo | Licença | O quê | Rec. |
|---|---|---|---|
| **shadcn-ui/ui** | MIT | data-table, forms, command palette, dialog (código entra no repo, sem lock-in) | **adotar** |
| **TanStack/table** | MIT | Grid headless da **fila de revisão de NF-e** (filtro por status, seleção em massa, virtualização) | **adotar** |
| **react-hook-form** + **zod** | MIT | Form denso de correção/aprovação fiscal (mesmo schema Zod no servidor e no cliente) | **adotar** |
| **TanStack/query** | MIT | Server-state + `persistQueryClient` (offline leve de leitura no campo) | **adotar** |
| **react-dropzone** | MIT | Upload multimodal (XML/PDF/áudio/CSV) → Supabase Storage | **adotar** |
| **powersync-ja/powersync-js** | Apache-2.0 | Offline-first real (SQLite local ↔ Postgres) p/ produtor em campo sem sinal | testar (esforço alto) |

> Escada offline: começar com **TanStack Query persist** (baixo esforço, já na stack) e só subir para **PowerSync** se escrita offline robusta virar requisito duro. ElectricSQL descartado (API em movimento).

---

## 6. Agro / rastreabilidade / EUDR / geo — arma o `rastreabilidade-auditor`

| Repo | Licença | O quê | Rec. |
|---|---|---|---|
| **Turfjs/turf** | MIT | Geo em TS: point-in-polygon, overlap com desmatamento, **cut-off EUDR (31/12/2020)** client+server | **adotar** |
| **urbanogilson/SICAR** | MIT | Baixa polígono **CAR** da fazenda (origem exigida pela EUDR), com OCR de captcha | testar |
| **mfrntic/eudr-api-client** | ⚠️ AGPL | Submete **DDS no TRACES** (UE) em Node | observar (isolar/reimplementar) |
| **mapbiomas / INPE-DETER** | GPL/verificar | Dados oficiais de desmatamento BR | observar (**consumir** dado/API, não clonar) |
| **openepcis/epcis-repository-ce** | Apache-2.0 | Padrão **GS1 EPCIS 2.0** de rastreabilidade (modelo de eventos do passaporte) | observar (referência) |

> GFW: **consumir a Data API hospedada** (aceita GeoJSON, retorna alertas), não clonar o repo de infra.
> Espinha dorsal geo-EUDR sugerida: **CAR(SICAR) → GeoJSON → Turf (cut-off vs MapBiomas) → DDS**.

---

## Top 10 de maior alavancagem imediata (transversal)

1. **instructor-js + zod** — guardrail do Sugestor IA (zero-erros estrutural). *MIT, baixo esforço.*
2. **nfelib** — parse oficial SEFAZ (fonte de verdade do XML). *MIT.*
3. **br-validate-dfe-access-key** — valida chave-44 na borda. *MIT, trivial.*
4. **supabase-test-helpers + pgTAP** — testa isolamento multi-tenant (hoje há só 1 test de RLS). *MIT/BSD.*
5. **splinter** — linter de RLS no CI (alimenta o `security-rls-auditor`). *Apache.*
6. **gitleaks** — barra segredo antes do commit/push automático. *MIT.*
7. **docling** — extração de tabela de DANFE antes do LLM. *MIT.*
8. **TanStack Table + shadcn/ui** — fila de revisão de NF-e de verdade. *MIT.*
9. **siscomex-ncm** — NCM oficial (anti-erro de classificação). *MIT.*
10. **Turf** — núcleo do geo-compliance EUDR. *MIT.*

> *Highlights GitHub · Agraas · 22 de junho de 2026 · entrada para decisões de build do wedge fiscal + hardening de segurança.*
