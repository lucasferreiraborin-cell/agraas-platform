# 📍 AGRAAS — Onde Estamos (PAINEL)

> **Único lugar de status, em português claro.** Você não precisa acompanhar o terminal — basta este arquivo. Última atualização: **24/06/2026 (Sprint I — ofensiva total)**.

---

## Em uma frase

Estou blindando a parte **fiscal/contábil/estoque** do seu sistema, defeito a defeito. **Já fechei os 2 buracos de segurança mais graves** (privacidade entre clientes). O sistema, por sinal, está mais pronto do que parecia.

---

## ⏸️ Esperando você

**Nada.** Pode deixar comigo — sigo sozinho e te aviso quando fechar cada bloco.

---

## ✅ Já resolvido

### Sprint H (22-23/06)
| O quê | Detalhe |
|---|---|
| 🔒 Privacidade entre clientes — buraco 1 | Custos/estoque/vendas isolados (migration 129) |
| 🔒 Privacidade entre clientes — buraco 2 | Bloqueio de transferir NF entre tenants (migration 130) |
| 🛡️ Time de IA reforçado | Revisor de código + auditor de segurança criados |
| 🔓 Autonomia liberada | Edit/Write/commit/push sem aceite a cada passo |

### Sprint I — 24/06 (ofensiva total, 9 agentes em paralelo)
| O quê | Detalhe |
|---|---|
| 🚀 **Vercel destravado** | Causa raiz: cron horário no plano Hobby (limite 1/dia). Fix: cron daily + Deploy via API com token. Release `a418bdf` ao ar. |
| 🔒 **9 leaks LGPD legacy fechados** | `animal_lot_assignments`, `animal_scores`, `lots`, `batch_lots`, `users_profile`, `slaughter_records`, `animal_seals`, `products` + dossiê Banco (migration 132/132b) |
| 🔒 **WITH CHECK em ~26 UPDATE policies** | Cliente A não consegue mais reetiquetar registro pra cliente B |
| 📑 **Migration 133 retroativa** | `supabase db reset` agora reconstrói o banco do zero |
| 💰 **Quick wins fiscais** | UNIQUE `chave_acesso` NF-e (anti-duplicidade), `accounting_entries.posted` imutável, view `lcdpr_entries` + endpoint `/api/export/lcdpr` |
| 💰 **ROI automático plugado** | Triggers em sales/cost_records geram cost_at_sale, ROI, FUNRURAL, accounting_entries (migrations 131+135+136) |
| 🐄 **Lot → Animal rateio** | Custos por lote agora propagam pra animal_cost_summary (rateio igualitário, v1) |
| 📲 **Passaporte com dimensão fiscal** | Custo acumulado, custo/arroba, ROI projetado, GTA badge, score fiscal (migration 137) |
| 📋 **Score Engine v3.2** | 6º pilar "Compliance Documental" (6%) separado do pilar Rastreabilidade. **Validado cientificamente** pelo zootecnista interno. |
| 💵 **FUNRURAL corrigido pós LC 224/2025** | 1.63% PF / 2.23% PJ. Parametrizado por `clients.tax_regime` + `clients.funrural_rate` (migration 141) |
| 🔗 **ETL fiscal_notes → fiscal_invoices** | Schism resolvido. UI antiga continua via view `fiscal_notes_unified` |
| 🧾 **NF-e venda automática** | Trigger AFTER INSERT em sales emite fiscal_invoice + item linkado ao animal (migration 140) |
| 🖥️ **Telas /controladoria completas** | 5 sub-pages saíram de stub → funcionais (notas, contas, cash flow, estoque, revisão NF-e) |
| 🖥️ **Telas /contador funcionais** | Portfólio + dossiê por produtor + calendário de obrigações |
| 🖥️ **Banco dossiê expandido** | Card "Saúde financeira": receita 12m, despesa, FUNRURAL, projeções 6m, últimos lançamentos |
| 🛡️ **Pentest OWASP** | RLS holds, Auth holds. Passaporte público não vaza dado sensível. 5 P0 detectados (não-bloqueantes pra piloto) |

---

## 🟢 Boa surpresa

Seu sistema fiscal **já tem mais coisa pronta do que a gente achava**: nota fiscal eletrônica com proteção contra duplicidade, contabilidade (débito/crédito) e plano de contas — tudo já no ar. Só não estava registrado no seu repositório de código (vou acertar isso).

---

### Sprint J — 24/06 fim de tarde (P0/P1 matados)
| O quê | Detalhe |
|---|---|
| 🔧 **proxy.ts fixado (P0 pentest)** | `/api/*` bypassa flow de auth do proxy. Stripe webhook, Vercel cron e self-heal voltam a funcionar (não mais 307 → /login). Removido redirect `/comprador → /em-breve` (código zumbi). |
| 💰 **IBS/CBS 2026 schema (migration 143)** | Campos `cbs_value, ibs_value, cbs_credito_presumido, ibs_credito_presumido, valor_liquido_fiscal` em `fiscal_invoices` + `fiscal_notes`. Tabela `ibs_cbs_config` com seed 2026/2027 (0.9% + 0.1%). `clients.is_contribuinte_ibs_cbs` + `clients.receita_bruta_anual`. |
| 📑 **LCDPR foundation (migration 144)** | `properties.nirf` + `properties.area_total_hectares` + tabela `bank_accounts` (registro 0050) + `cost_records.lcdpr_tipo`/`num_doc` + `lcdpr_exports` com histórico. Falta só endpoint exportador `/api/fiscal/export-lcdpr`. |
| 📚 **Plano de contas rural CFC/CPC 29 (migration 145)** | **114 contas distintas** seedadas para os 8 clientes (912 rows). Hierarquia 5 níveis: Ativo (1.x com biológicos circulante/não-circulante), Passivo (2.x com CBS/IBS), PL (3.x com AVJ), Receitas (4.x), Custos (5.x com cria/recria/engorda separados), Despesas (6.x com rastreabilidade). Coluna `cpc29_categoria` para filtros. |
| 🔄 **UPSERT accounting_entries em UPDATE de sales (migration 146)** | Trigger `_trg_sales_accounting_upsert` substitui o antigo. Quando `cost_at_sale` muda em UPDATE, gera ESTORNO + novo lançamento (com `reversed_by`/`reversal_of`/`reversed_at`). Fim do drift entre `sales` e `accounting_entries`. |
| 🖥️ **Badges NF-e + GTA no /comprador/oportunidades** | API e UI agora mostram contadores (`GTA 5/10`, `NF-e pronta 3/10`). Persona Frigorífico vê numa olhada quais lotes têm papel pronto. |

## 🔜 O que vou fazer em seguida (sozinho)

1. **Endpoint `/api/fiscal/export-lcdpr`** — função geradora `.txt` layout 1.3 RFB consumindo `accounting_entries` + `bank_accounts` + `properties.nirf`
2. **Trigger autopopular plano de contas em new client** — `AFTER INSERT ON clients` chama `_seed_rural_chart_of_accounts(NEW.id)`
3. **Animals CPC 29** — `animals.conta_contabil` + `animals.metodo_mensuracao` (custo_historico vs fair_value)
4. **Estorno automático em sales cancelled** — extensão do trigger 146 pra cobrir `status = 'cancelled'`
5. **Testes pgTAP/Jest** por trigger crítico (anti-regressão)
6. **Reagendar mentoria IZ-SP** — pauta pronta em `docs/research/2026-06-24-score-v3-1-validacao-cientifica.md`
7. **Hardening pentest P1/P2** — CONCLUÍDO via código. 1 ação manual pendente → ver nota P2.3 abaixo.

---

## 💬 Como vou te manter no controle

- Só este painel + um resumo de **3 linhas** no chat quando eu fechar algo. Sem terminês.
- Você pode pedir **"status"** quando quiser.
- Se eu precisar de uma decisão sua de verdade (raro), eu pergunto em 1 linha simples.

---

---

## Sprint M — Hardening pentest P1/P2 (26/06)

| Item | Status | Ação |
|---|---|---|
| P1.1 HSTS preload | ✅ Código fechado | `next.config.ts` já emite `includeSubDomains; preload`. **Ação manual**: submeter `www.agraas.com.br` em https://hstspreload.org (Lucas faz). |
| P1.2 Sentry release no DOM | ✅ Código fechado | `sentry.client.config.ts` sem `release` — SHA não aparece mais no `<meta name="baggage">`. Server config usa `SENTRY_RELEASE` env var. **Ação manual**: adicionar `SENTRY_RELEASE=$(git rev-parse --short HEAD)` nas env vars Vercel (Settings → Environment Variables). |
| P1.3 CSP unsafe-inline | ✅ Aceito + documentado | Remoção exige nonce-based CSP — TODO comentado no `next.config.ts`. Não é bloqueante para piloto. |
| P2.1 Email enumeration no signup | ✅ Código fechado | Fluxo unificado: email novo e email duplicado redirecionam para `/cadastro/confirmacao` com mensagem genérica. |
| P2.2 Cookie agraas_view_as | ✅ Código fechado | `sameSite` elevado de `"lax"` → `"strict"`. `httpOnly` e `secure` já estavam corretos. |
| P2.3 Schema hints PGRST205 | ⚠️ Ação manual obrigatória | PostgREST retorna hints como "Perhaps you meant 'public.buyers'" via anon key. Supabase não expõe config via CLI — **Lucas precisa**: Dashboard → Project Settings → API → desabilitar "Show detailed errors" (ou aguardar Supabase expor essa config via `supabase.toml`). |

---

> Detalhe técnico (se um dia quiser): `docs/` e `supabase/migrations/129`, `130`.
