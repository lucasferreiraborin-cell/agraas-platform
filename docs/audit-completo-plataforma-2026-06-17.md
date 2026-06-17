# Audit Completo da Plataforma Agraas — 17/06/2026

> Consolidação de findings de 5 audits paralelos: LP pública, Marketplace, Áreas logadas, Triangulação fiscal-estoque-animal, Cotação/data flow externo.
> Material para Lucas priorizar fixes pré-próximo pitch institucional.

---

## Resumo executivo

| Área | Findings 🔴 críticos | 🟡 importantes | 🟢 observações |
|---|---|---|---|
| LP pública (Sobre/Planos/Portos) | 2 | 3 | 3 |
| Marketplace | 3 | 3 | 4 |
| Áreas logadas | 2 | 4 | 4 |
| **Triangulação fiscal-estoque-animal** | **6** | **6** | **5** |
| Cotação/data flow externo | 4 | 4 | 3 |

**Total: 17 itens críticos**. A área mais comprometida é **triangulação fiscal-estoque-animal** — exatamente onde Lucas declarou querer 100% de funcionalidade.

---

## 🔴 TIER 0 — BUGS QUE PODEM QUEBRAR PRODUÇÃO

Estes 4 podem afetar Lucas durante demo se algum dado for inserido. Priorizar.

### T0.1 · Score legacy v1 órfão em `applications` (e weights, events)
**Origem**: Migration `036_score_engine.sql:196` cria `trg_score_on_application` chamando `_trg_score_from_application()` → `calculate_agraas_score(uuid)`. Migration `123_score_engine_v3.sql:52` faz `DROP FUNCTION calculate_agraas_score(uuid) CASCADE` mas **não** dropa o trigger nem a função wrapper.

**Risco**: Próximo INSERT em `applications` (ou `weights`, `events`) pode `RAISE EXCEPTION` por função inexistente. Fluxo "aplicar sanitário em campo" fica quebrado.

**Fix proposto** (migration 124):
```sql
DROP TRIGGER IF EXISTS trg_score_on_application ON applications;
DROP TRIGGER IF EXISTS trg_score_on_application_delete ON applications;
DROP TRIGGER IF EXISTS trg_score_on_weight ON weights;
DROP TRIGGER IF EXISTS trg_score_on_weight_delete ON weights;
DROP TRIGGER IF EXISTS trg_score_on_event ON events;
DROP TRIGGER IF EXISTS trg_score_on_event_delete ON events;
DROP FUNCTION IF EXISTS _trg_score_from_application,
                        _trg_score_from_application_delete,
                        _trg_score_from_weight, _trg_score_from_weight_delete,
                        _trg_score_from_event, _trg_score_from_event_delete CASCADE;
```

**Esforço**: 15 min. **Risco do fix**: zero (apenas remove código morto).

### T0.2 · Possível duplo débito de estoque
**Origem**: `_trg_application_stock_debit` (`073:35`) existe nas migrations. Outra suspeita: `application_stock_trigger` chamando `register_application_stock()` — não aparece em nenhum `.sql` mas pode existir em produção (criado via dashboard Supabase).

**Risco**: Se ambos existem, cada aplicação sanitária **debita estoque 2× do necessário**. Estoque vai negativo, custos inflacionam, ROI dispara erro.

**Fix proposto**: query de verificação primeiro, depois drop do redundante.
```sql
-- Auditar
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'applications';

-- Se 2 triggers debitam estoque:
DROP TRIGGER IF EXISTS application_stock_trigger ON applications;
DROP FUNCTION IF EXISTS register_application_stock() CASCADE;
```

**Esforço**: 30 min (verificar + decidir). **Risco do fix**: baixo (drop do redundante).

### T0.3 · Bug FEFO em `_trg_application_stock_debit`
**Origem**: `073_connect_pillars.sql:21-22`:
```sql
SET quantity_available = COALESCE(quantity_available, quantity) - NEW.dose
```

**Problema**: se `quantity_available` já foi decrementado anteriormente, `COALESCE` retorna valor já decrementado. Se for NULL (primeira vez), pega `quantity` (também possivelmente já decrementada). Resultado: **dupla subtração progressiva**.

**Fix proposto**:
```sql
SET quantity_available = quantity_available - NEW.dose
WHERE id = NEW.batch_id AND quantity_available >= NEW.dose;
-- Se falhou (estoque insuficiente), RAISE EXCEPTION com alerta amigável
```

**Esforço**: 1h (incluir teste). **Risco do fix**: baixo, mas testar com seed.

### T0.4 · `stock_movements` e `cost_records` sem migration canônica
**Origem**: UI usa essas tabelas (`app/estoque/historico/page.tsx:50`, `app/custos/page.tsx:88`), mas **nenhuma migration as cria** no repo.

**Risco**: Ambiente local não reproduz produção. Onboarding de novo dev quebra. Próximo `npx supabase db reset` derruba tudo.

**Fix proposto**: Migration 125 canonicalizando schema + RLS + indexes a partir do que existe em produção (via `pg_dump --schema-only`).

**Esforço**: 2-3h (extrair schema + escrever migration + testar reset). **Risco**: baixo se for fielmente extraído.

---

## 🔴 TIER 1 — CONTRADIÇÕES INSTITUCIONAIS (queimam credibilidade no pitch)

### T1.1 · "Halal" residual em 6 lugares quando deck atual não menciona
**Lugares afetados** (audit cruzado):
- `app/lotes/page.tsx:241` — emoji "☪ Halal" hardcoded em form de exportação
- `app/animais/page.tsx:379-401` — KPI Hero "Halal ativos" sem disclaimer
- `app/scores/page.tsx:193` — HalalBadgeSVG renderiza no pódio sem condicional
- `app/components/marketplace/MarketplacePublicView.tsx:580-587, 893, 985` — filtro + badges
- `app/marketplace/[id]/page.tsx:194-198` — badge detalhe
- `app/components/marketplace/MarketplaceTabs.tsx:150-153` — filtro interno

**Risco**: Bradesco/SALIC/BB perguntam "qual a tese — EUDR ou Halal?". Desalinha do deck.

**Fix proposto**: Feature flag `NEXT_PUBLIC_HALAL_ENABLED=false` por default. Cada uso de Halal vira condicional. Reativável quando voltar à pauta.

**Esforço**: 1h. **Risco**: zero.

### T1.2 · "Lote ativo Jeddah" em `/planos:534`
**Origem**: Claim ambíguo na página Planos pública.

**Risco**: Investidor pergunta "lote real ativo com comprador confirmado?". Lucas responde "não, é piloto" → credibilidade cai.

**Fix proposto**: Substituir por "piloto de rastreio para simulação de exportação via Jeddah" OU remover a frase.

**Esforço**: 5 min. **Risco**: zero.

### T1.3 · Links Privacidade/Termos não clicáveis em PublicFooter
**Origem**: `PublicFooter.tsx:59-60` — `<span>` em vez de `<Link>`. Rotas `/privacidade` e `/termos` não existem.

**Risco**: Compliance/auditoria sinaliza vermelho. LGPD exige política de privacidade pública.

**Fix proposto**: Criar páginas básicas `app/privacidade/page.tsx` e `app/termos/page.tsx` com texto padrão (revisar com advogado depois).

**Esforço**: 2h. **Risco**: zero.

### T1.4 · Dados seeded do marketplace sem marcação "demo"
**Origem**: Migrations `105_marketplace_seed.sql` + `106_marketplace_focus_bovinos.sql` inserem ~8 listings fictícios sem flag.

**Risco**: Visitante público vê catálogo "ativo" que não existe. Ilusão de escala.

**Fix proposto**: Migration 126 adiciona coluna `is_demo boolean DEFAULT false` em `marketplace_listings`. Marcar seeds como `is_demo=true`. UI exibe badge "Exemplo" em cards demo.

**Esforço**: 1h. **Risco**: zero.

### T1.5 · ActivityTicker hardcoded com produtos deletados (Soja, Milho)
**Origem**: `app/components/marketplace/ActivityTicker.tsx:9-17` — `SEEDED_ACTIVITY` array fixo com "Soja convencional · 500 toneladas", "Milho..." mas migration `106` deletou todos listings de safra (foco bovino).

**Risco**: Visitante vê "Soja convencional · 500 toneladas há 3 min" → clica "Ver catálogo" → não encontra. Quebra confiança.

**Fix proposto**: Remover SEEDED_ACTIVITY ou trocar para items reais bovinos do catálogo (Nelore PO, Brincos RFID, etc.).

**Esforço**: 15 min. **Risco**: zero.

### T1.6 · `certifications_json` nunca populado em passaporte
**Origem**: `app/animais/[id]/page.tsx:582` lê `certifications_json` do cache, mas BUG 3 antigo (fix em 2025) usa query direta em `animal_certifications`. Inconsistência: painel usa fallback, animais/[id] não.

**Risco**: Pilar "Certificações" do Score v3 mostra 0 mesmo com 43 certificações do Lucas no banco. Pitch fica esquisito.

**Fix proposto**: Substituir leitura em `certifications_json` por query direta como painel faz (`animal_certifications WHERE status='active'`).

**Esforço**: 30 min. **Risco**: baixo.

---

## 🔴 TIER 1.5 — COTAÇÃO HARDCODED (Lucas explicitamente alertou sobre "infos de mercado em tempo real corretas")

### T1.7 · R$ 330/@ hardcoded em painel e MarketCalculator
**Origens**:
- `app/painel/page.tsx:336, :640` — cálculo "Valor estimado" usa `totalArrobas * 330` em vez de ler cotação atual
- `app/components/MarketCalculator.tsx:7` — `useState(330)` inicial
- Fallback silent em 5+ arquivos: `app/custo-producao/page.tsx:61`, `app/financeiro/page.tsx:48`, `app/api/analyze-animal/route.ts:60`, `app/api/cotacao/route.ts:45`, `app/propriedades/[id]/page.tsx:115` — todos usam `parseFloat(cotacaoData?.value ?? "330")`

**Risco**: Plataforma exibe valor sempre desatualizado. Dado de cotação é vista como "gaffe de mercado" pelo Lucas. Bradesco analyst pode questionar.

**Fix proposto**:
1. Painel/page.tsx: buscar `platform_settings.value WHERE key = 'cotacao_arroba'`
2. MarketCalculator: inicializar com prop, não estado hardcode
3. Adicionar timestamp "atualizada há X" em todas telas com preço
4. Badge "⚠️ Cotação indisponível — usando valor anterior" quando `updated_at > 12h`

**Esforço**: 2-3h. **Risco**: baixo (só substituir hardcode por query).

---

## 🟡 TIER 2 — IMPORTANTES (não bloqueiam, mas degradam)

### T2.1 · Triangulação fiscal-estoque gaps funcionais
- `/api/fiscal/apply-stock` grava em `supply_inventory_items` legacy (não chama `create_stock_from_fiscal_note`)
- NF-e validada NÃO cria stock_batch (trigger faltando)
- `sales.cost_at_sale` / `sales.roi` populados manualmente via seed (sem trigger)
- `cost_records.amount` NÃO entra em `animal_cost_summary.other_costs`
- `trg_cost_summary_on_application` sobrescreve `total_input_cost` sem somar

**Plano consolidado**: Migration 124 (proposta no doc do triangulação-auditor) com 8 etapas.

**Esforço**: 4-6h. **Risco**: médio (trigger novos + testes).

### T2.2 · SEO + metadata incompletos em LP
- `page.tsx`, `sobre/page.tsx` sem OG image / og:type / twitter card
- `planos/page.tsx` sem Metadata exportada

**Esforço**: 1h. **Risco**: zero.

### T2.3 · Bios founders sem detalhe na página Sobre
- Apenas initials em cards (LF, EP, PS, PM, FM) + role genérico
- Investors esperam 2-3 linhas por founder

**Esforço**: 30 min editar + revisão Lucas. **Risco**: zero (precisa autorização Lucas pra publicar bios).

### T2.4 · NewListingForm sem upload imagens
- Schema espera `images text[]` mas form não tem input file
- Cards usam ícones genéricos em vez de fotos

**Esforço**: 3-4h (upload + storage Supabase + processamento). **Risco**: baixo.

### T2.5 · Sem cross-sell + sem paginação no marketplace
- Grid retorna sem personalização
- `.select("*")` sem LIMIT — escala mal

**Esforço**: 2-3h. **Risco**: baixo.

---

## 🟢 TIER 3 — OBSERVAÇÕES (melhorias quando houver tempo)

Lista resumida — ver docs originais dos audits para detalhes:

- `_trg_application_calendar_update` match por LOWER(product_name) — risco falso match entre clients
- `_trg_application_stock_debit` apenas RAISE WARNING em estoque negativo, não bloqueia
- `applications_carencia_autofill` só dispara em UPDATE OF certos campos
- `stock_movements.reference_table` sem convenção documentada
- API CEPEA scraping frágil (regex em HTML, sanity check inconsistente entre GET/POST)
- USD/BRL não implementado (futuro)

---

## ✅ O QUE ESTÁ SÓLIDO (mantém)

- **Score Engine v3 ancorado em Embrapa Doc 237** — renderiza ok em painel e passaporte
- **RLS multi-tenant** — 89 tabelas com RLS habilitado
- **Auth via Supabase Auth + cookies SSR** — sem leaks
- **Validação Zod** forte no backend (marketplace, fiscal)
- **Rate limit** em endpoints críticos
- **Tom institucional** clean (Terminal Industries)
- **Responsividade mobile** com clamp() fluid scaling
- **Conversão @ ↔ kg** consistente (1 arroba = 30 kg) em 6+ lugares
- **NF-e parseada usa valores fiscais reais** (não cotação) — sem gaffe fiscal
- **Cron CEPEA** com schedule diário 08h BRT
- **Audit trail via score_audit_log** funcional

---

## Plano consolidado de execução (recomendação Claude — Lucas decide)

### Sprint A — Pré-próximo pitch (4-6 horas)

Priorizar bloqueadores institucionais visíveis:

1. **T0.1** — Drop triggers v1 órfãos (migration 124) — 15 min
2. **T0.2** — Auditar triggers de estoque duplicados + drop se confirmado — 30 min
3. **T1.1** — Feature flag Halal + ocultar em 6 lugares — 1h
4. **T1.2** — Reescrever "Lote Jeddah" em /planos — 5 min
5. **T1.5** — Limpar ActivityTicker — 15 min
6. **T1.6** — Fix `certifications_json` em passaporte — 30 min
7. **T1.7** — Substituir hardcode R$ 330 + adicionar timestamp — 2h
8. **T1.3** — Links Privacidade/Termos clicáveis (página básica) — 1h

**Total**: ~5h. **Resultado**: pitch defensável sem gaffes visíveis.

### Sprint B — Triangulação 100% funcional (6-8 horas)

Lucas declarou prioridade. Atacar bugs Tier 0 da triangulação:

1. **T0.3** — Fix bug FEFO em `_trg_application_stock_debit` — 1h + teste
2. **T0.4** — Migration 125 canonicalizando `stock_movements` + `cost_records` — 3h
3. **T2.1** — Migration 124 consolidação triangulação (8 etapas) — 4h

**Total**: ~8h. **Resultado**: triangulação fiscal-estoque-custo-venda perfeita end-to-end.

### Sprint C — Polish institucional (4-5 horas)

Marketplace + LP + SEO:

1. **T1.4** — Marcação `is_demo` no marketplace — 1h
2. **T2.2** — SEO/OG metadata completo — 1h
3. **T2.3** — Bios founders (esperar autorização Lucas) — 30 min
4. **T2.5** — Paginação marketplace — 2h
5. **T2.4** — Upload imagens marketplace — 3-4h (opcional)

---

## Decisão necessária do Lucas

> Qual sprint atacamos primeiro?

- ✅ **A** se prioridade é próximo pitch (recomendado)
- ✅ **B** se prioridade é robustez técnica do core (Lucas declarou isso explicitamente)
- ✅ **A → B** sequencial (custo ~13h de execução técnica)

Para qualquer sprint, eu coordeno via subagents:
- `backend-engineer` executa migrations
- `frontend-engineer` faz UI/UX fixes
- `triangulacao-auditor` re-audita pós-fix
- `captacao-strategy` revisa antes do próximo pitch

---

> *Audit Completo · Agraas · 17 de junho de 2026*
> *Findings: 5 agentes paralelos · 17 itens críticos · 3 sprints propostos*
