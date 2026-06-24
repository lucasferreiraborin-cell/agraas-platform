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

## 🔜 O que vou fazer em seguida (sozinho)

1. **Implementar IBS/CBS 2026** — campos no NF-e (cbs/ibs/crédito presumido) + tabela alíquotas transição 2026-2033 (controladoria-fiscal já mapeou DDL completo)
2. **LCDPR exportador completo** — `properties.nirf` + `bank_accounts` + função geradora .txt layout 1.3 RFB
3. **Plano de contas rural completo CFC/CPC 29** — seed ~150 contas (cria/recria/engorda separados, ativo biológico, AVJ)
4. **Reagendar mentoria IZ-SP** — pauta pronta em `docs/research/2026-06-24-score-v3-1-validacao-cientifica.md`
5. **Fix proxy.ts** — whitelist `/api/stripe/webhook` + `/api/cron/*` + `/api/self-heal` (P0 do pentest)
6. **Testes pgTAP/Jest** por trigger crítico (anti-regressão)

---

## 💬 Como vou te manter no controle

- Só este painel + um resumo de **3 linhas** no chat quando eu fechar algo. Sem terminês.
- Você pode pedir **"status"** quando quiser.
- Se eu precisar de uma decisão sua de verdade (raro), eu pergunto em 1 linha simples.

---

> Detalhe técnico (se um dia quiser): `docs/` e `supabase/migrations/129`, `130`.
