# 📍 AGRAAS — Onde Estamos (PAINEL)

> **Único lugar de status.** Eu mantenho este arquivo atualizado a cada passo. Última atualização: **23/06/2026**.

---

## ⏸️ Esperando VOCÊ (1 coisa só)

| O quê | Por quê | Como |
|---|---|---|
| **Autorizar o Supabase** | Destrava o fix fiscal — preciso ler o banco real pra corrigir sem introduzir erro | Abrir o link de OAuth que te mandei no chat (~30s) |

Enquanto isso não acontece, o programa fiscal fica parado no banco vivo. Todo o resto está feito ou pode seguir.

---

## 🎯 Foco ativo agora

**Deixar a camada contábil-fiscal-controladoria-estoque 100% sem erros.**
Estado: auditoria **concluída** → defeitos mapeados → **bloqueado** na conexão do banco pra executar as correções.

---

## ✅ Feito nesta sessão

| Frente | Resultado |
|---|---|
| **Autonomia** | Modo "Alta" — edito/rodo sem pedir; deny-list barra catástrofe |
| **Time de IA blindado** | `model:` nos 10 agentes · criados `code-reviewer` + `security-rls-auditor` · colisão fiscal resolvida · commit `d5edc2c` |
| **Auditoria do time** | `docs/agraas-ai-team-audit-2026-06-22.md` |
| **Highlights GitHub** | `docs/agraas-github-highlights-2026-06-22.md` (38 repos curados) |
| **Auditoria fiscal verificada** | `docs/agraas-fiscal-zero-errors-backlog-2026-06-23.md` (defeitos + roadmap 127→135) |
| **Saúde da plataforma** | `tsc` 0 erros · 27/27 testes passando · dev server no ar |

---

## 🔴 O que está errado na camada fiscal (resumo)

- **2 possíveis leaks cross-tenant** (`stock_movements`, `cost_records` sem RLS versionada) — confirmar no banco
- **UPDATE fiscal sem `WITH CHECK`** (cliente pode injetar NF-e em outro tenant)
- **`db reset` quebra** (5 tabelas criadas no dashboard, nunca versionadas)
- **Sem contabilidade real** (partida dobrada), **sem idempotência** (re-upload duplica), **sem trilha imutável**
- **ROI exibido é ficcional** (custo digitado à mão, não vem da NF-e)
- ✅ Já corrigido antes: os 3 bugs Tier-1 (score órfão, duplo débito, FEFO) — pela migration 124

> Detalhe completo e plano de correção: `docs/agraas-fiscal-zero-errors-backlog-2026-06-23.md`.

---

## 🔄 Próximos passos (na ordem, assim que o banco conectar)

1. Confirmar/corrigir os 2 leaks (maior risco primeiro)
2. Migration **127** — canonicalizar as 5 tabelas órfãs (schema real do banco)
3. Migrations **128-135** — idempotência, contabilidade, cadeia NF→estoque→custo→ROI
4. Suite **pgTAP** travando cada correção · re-auditar até limpo
5. Aplicar em produção só com rollback + seu OK

---

## 🧭 Decisões abertas (quando chegarmos lá)

| Decisão | Recomendação minha |
|---|---|
| Schema do backend NF-e | §5a canônico, reconciliado com `fiscal_notes` existente |
| Ligar envio real do digest de sócios | hoje travado em `dryRun` |
| Alíquota FUNRURAL (1,63%) | **validar com contador** antes de codar |

---

## 📁 Mapa dos documentos (onde está o detalhe)

- **Este arquivo** = resumo de tudo, sempre atual
- `docs/agraas-fiscal-zero-errors-backlog-2026-06-23.md` — defeitos fiscais + roadmap
- `docs/agraas-ai-team-audit-2026-06-22.md` — auditoria do time de IA
- `docs/agraas-github-highlights-2026-06-22.md` — OSS recomendado
- `docs/agraas-operating-model-2026-06-17.md` — como o time opera
- `CLAUDE.md` — guia técnico

---

> 💬 **Como vou te manter atualizado daqui pra frente:** atualizo este `STATUS.md` a cada passo e te dou um resumo de **3 linhas** no chat (feito / fazendo / esperando de você). Sem mais updates longos espalhados. Você pode pedir "status" a qualquer momento.
