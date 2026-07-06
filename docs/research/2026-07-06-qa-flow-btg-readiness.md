# QA de Fluxo End-to-End — Prontidão para Demo BTG (André Esteves)

- **Data:** 2026-07-06
- **Release testado:** `main` @ `f817375`
- **Produção:** https://www.agraas.com.br (Next.js 16 / Supabase / Vercel)
- **Método:** READ-ONLY. Leitura de código de cada rota + `curl` contra produção (sem sessão). Nenhum código modificado.
- **Escopo:** jornadas de todas as personas (produtor / frigorífico / banco / contador / admin) + APIs críticas.

---

## Veredito

**A plataforma NÃO tem risco de crash ao vivo (nenhum 500 em página de persona, nenhuma tela em branco).** Todas as rotas autenticadas redirecionam corretamente para `/login` (307, nunca 500), todas as públicas retornam 200, e o código é defensivo (queries devolvem `{data,error}` sem lançar exceção, empty states graciosos, `?? []` / `?? 0` em toda parte).

**PORÉM, há 1 defeito que envergonha na frente de um banqueiro e DEVE ser corrigido antes da demo:** o filtro `algorithm_version = 'v3'` está desatualizado em 9 lugares (a migration 138 gravou `'v3.1'`). Consequência: **`/scores`, `/comprador/oportunidades`, o dossiê do banco e o PDF podem mostrar Score 0 / ranking vazio** para qualquer animal recalculado após a migration 138 — parece que o rebanho inteiro é "Crítico" (vermelho). É um bug de 1 linha por arquivo, silencioso, sem crash, mas visualmente catastrófico para um analista de crédito.

**Recomendação:** corrigir os P1 abaixo (essencialmente o `algorithm_version` e o botão dead-end de oportunidades) antes de mostrar as telas de Score/Banco/Frigorífico. Sem isso, o resto está sólido para demo.

---

## Tabela de rotas testadas (curl em produção, sem sessão)

| Rota | Esperado | Achado | Sev |
|---|---|---|---|
| `/` | 200 | 200 | OK |
| `/sobre` | 200 | 200 | OK |
| `/planos` | 200 | 200 | OK |
| `/login` | 200 | 200 | OK |
| `/cadastro` | 200 | 200 | OK |
| `/cadastro/confirmacao` | 200 | 200 | OK |
| `/passaporte/BER-001` | 200 (animal real) | 200, renderiza Nelore + pesos | OK |
| `/passaporte/{inexistente}` | 404 gracioso | 200 c/ tela "não encontrado · Voltar" (not-found dentro da página, sem erro) | OK |
| `/painel` | 307→/login | 307→/login | OK |
| `/animais` | 307→/login | 307→/login | OK |
| `/propriedades` | 307→/login | 307→/login | OK |
| `/lotes` | 307→/login | 307→/login | OK |
| `/scores` | 307→/login | 307→/login | OK |
| `/controladoria` (+ notas, contas, cash-flow, estoque) | 307→/login | 307→/login (todas) | OK |
| `/banco` (+ produtores, analytics) | 307→/login | 307→/login (todas) | OK |
| `/comprador` (+ oportunidades, produtores) | 307→/login | 307→/login (todas) | OK |
| `/contador` (+ obrigacoes) | 307→/login | 307→/login | OK |
| `/admin/saude` | 307→/login | 307→/login | OK |
| `/status` | 307→/login | 307→/login (admin-only — NÃO mostrar ao banqueiro, é doc interna) | OK/atenção |
| `GET /api/self-heal` | 200 saudável | 200 `{ok:true, overall:"ok"}` — cotação/market/insights todos "OK" | OK |
| `GET /api/fiscal/export-lcdpr` | 307/401 | 307→/login (protegido) | OK |
| `GET /api/insights/produtor` | 401 sem sessão | 401 `{"error":"Unauthorized"}` | OK |
| `GET /api/export/dossie-banco-pdf` (sem clientId) | 400 | 400 `clientId obrigatório` (gracioso) | OK |
| `GET /api/export/lcdpr` | 401 sem sessão | 401 `Nao autenticado` | OK |
| `POST /api/export/herd-pdf` / `lot-pdf` | 401 | 401 (protegidos) | OK |
| `POST /api/export-report` (sem body/sessão) | 400/401 | **500** (throw em `req.json()` antes do auth) | P2 |

APIs de export referenciadas na UI (`herd-pdf`, `lot-pdf`, `dossie-banco-pdf`, `lcdpr`) **existem todas** em disco (`.tsx`/`.ts`) — nenhum botão aponta para rota inexistente.

---

## P0 — Quebra na demo

**Nenhum P0 confirmado.** Nenhuma página de persona dá 500, nenhuma tela em branco, nenhum crash de runtime verificável no código. O item que o subagente marcou como P0 (link LCDPR do contador) foi rebaixado para P1 após verificação: é bug de correção, não crash (ver P1 abaixo).

---

## P1 — Parece bug / mostra dado errado

### P1-1 — Filtro `algorithm_version = 'v3'` desatualizado (grava-se `'v3.1'`) — CRÍTICO PRO SCORE/BANCO
- **Causa raiz:** `supabase/migrations/138_score_v3_1_fiscal_subpillar.sql:263` — o recálculo grava `algorithm_version = 'v3.1'` via `ON CONFLICT DO UPDATE`. A migration 123 gravava `'v3'`. Qualquer animal recalculado após a 138 tem `'v3.1'`.
- **Impacto:** o filtro `.eq("algorithm_version", "v3")` exclui silenciosamente esses animais → `scoreMap` vazio → Score médio 0 → cards vermelhos "Crítico", rankings vazios, KPIs zerados. Sem crash, mas parece que o rebanho inteiro vale zero. Pior lugar possível para acontecer: na frente do BTG.
- **Ocorrências (9):**
  - `app/scores/page.tsx:73` — ranking de animais (**demo direta**)
  - `app/comprador/oportunidades/page.tsx:73` — score médio dos lotes no marketplace (**demo direta**)
  - `app/banco/[clientId]/page.tsx:164` — amostra top-10 no dossiê do banco (**demo direta BTG**)
  - `app/api/export/dossie-banco-pdf/route.tsx:100` — PDF do dossiê
  - `app/api/frigorifico/lotes-disponiveis/route.ts:98` — API de lotes
  - `app/animais/[id]/page.tsx:256` — score fiscal do animal
  - `app/api/digest/daily/route.ts:54`, `app/api/digest/socios/route.ts:56`, `app/api/self-heal/route.ts:273` — jobs internos (menos visível)
- **Correção sugerida:** trocar `.eq("algorithm_version", "v3")` por `.in("algorithm_version", ["v3", "v3.1"])` nos 9 arquivos (ou remover o filtro e pegar o mais recente por animal). Antes da demo, confirmar no banco (`SELECT algorithm_version, count(*) FROM animal_scores GROUP BY 1`) qual string domina em produção. **NÃO existe `'v3.2'` no schema** — a preocupação com v3.2 do briefing é falsa; o valor real é `'v3.1'`.

### P1-2 — Botão "Solicitar contato com produtor" sem handler (dead-end)
- **Causa raiz:** `app/comprador/oportunidades/page.tsx:278-281` — `<button className="ag-button-primary">` sem `onClick`, sem form, sem link. É Server Component; o botão é puramente visual.
- **Impacto:** na demo, se alguém clicar, nada acontece. Frigorífico é jornada mostrável.
- **Correção sugerida:** ou remover o botão para a demo, ou ligar a um `mailto:` / handler client-component real.

### P1-3 — Link "Exportar LCDPR" do contador ignora o produtor selecionado
- **Causa raiz:** `app/contador/produtores/[id]/page.tsx:143` — href `/api/export/lcdpr?clientId=${producerId}`. O handler `app/api/export/lcdpr/route.ts` lê **apenas `?year=`** (linha 53) e consulta a view `lcdpr_entries` com SECURITY INVOKER (RLS do usuário logado). O `clientId` da URL é **ignorado**.
- **Impacto:** um contador (ou admin) abrindo o dossiê de um produtor e clicando "Exportar LCDPR" baixa o **próprio** LCDPR (provavelmente vazio), não o do produtor. Bug de correção, não crash. Baixa probabilidade de ser clicado numa demo de banco, mas alta se a jornada contador for mostrada.
- **Correção sugerida:** decidir a semântica. Se contador deve exportar o livro do produtor, o endpoint precisa aceitar `clientId` e usar service-role com verificação de vínculo `partners_accountants` ativo (cuidado com RLS/LGPD). Se não, remover o `?clientId=` enganoso do href.

### P1-4 — Botão "Convidar produtor" do contador sem handler
- **Causa raiz:** `app/contador/page.tsx:160-169` — `<button type="button">` sem `onClick`.
- **Impacto:** dead-end. Não crasheia. "Ver lista" ao lado (`Link href="/contador/produtores"`) funciona.
- **Correção sugerida:** remover ou ligar a um fluxo de convite real antes de mostrar a persona contador.

---

## P2 — Polish / credibilidade

| # | Local | Achado | Correção |
|---|---|---|---|
| P2-1 | `app/controladoria/page.tsx:125,131,137` | Renderiza literal **"Em construção · Sprint G2"** nos cards de atalho (Plano de contas / Cash flow / Estoque) — mas as páginas ESTÃO construídas e funcionais. Texto contradiz a realidade. | Remover/ajustar a copy "Em construção" — as subpáginas existem. |
| P2-2 | `app/banco/produtores/page.tsx:79`, `app/comprador/produtores/page.tsx:95` | Input de busca `disabled` com placeholder **"Buscar... (futuro)"** — "(futuro)" aparece pro usuário, lê como inacabado. | Esconder o input para a demo. |
| P2-3 | FUNRURAL hardcoded `* 0.015` (1,5%) em `controladoria/page.tsx:102,188`, `notas/[id]/page.tsx:108`, `contador/page.tsx:104,113`, `contador/obrigacoes/page.tsx:153`, `contador/produtores/[id]:113`, `banco/[clientId]/page.tsx:126` | Alíquota 1,5% desatualizada. Memória do projeto: LC 224/2025 (vig. 01/04/2026) = PF 1,63% / PJ 2,23%, parametrizável via `clients.funrural_rate`. Um banqueiro fiscal-savvy pode pegar o número errado. Não crasheia. | Ler `clients.funrural_rate` / `tax_regime`. |
| P2-4 | `POST /api/export-report` | Retorna **500** quando chamado sem body JSON (throw em `req.json()` na linha 14, antes do check de auth na linha 19). Só afeta chamada malformada; o botão real da UI envia body. | Envolver `req.json()` em try/catch → 400. Baixo risco (não é acionável via UI normal). |
| P2-5 | `/status` | Página admin-only que renderiza `STATUS.md` (doc interno de dev). Redireciona não-admin pra `/painel`. **Não mostrar ao banqueiro** — pode conter notas sensíveis. | Não incluir na demo. |
| P2-6 | `app/painel/page.tsx:154` | Sentinel hardcoded do piloto FSJBE (UUID `...0003-000000000001`) para badge "dados ilustrativos". Cosmético. | — |
| P2-7 | `app/lotes/page.tsx` | Objetivo "Exportação" removido do dropdown mas branch de UI de exportação ainda gated nele → código morto inalcançável. | Limpeza, sem risco. |

---

## Verificações que passaram (categorias limpas)

- **`.single()` que crasheia:** nenhuma. Todas destruturam `{data}` e checam null (`if (!x) notFound()` / fallback). Supabase `.single()` devolve erro em `{error}`, não lança.
- **`Promise.all` que derruba a página:** o dossiê do banco (`banco/[clientId]`) usa **`Promise.allSettled`** + try/catch na saúde financeira — bem blindado. Demais páginas usam `Promise.all` só sobre query builders (que resolvem, não rejeitam) — risco SSR normal, aceitável.
- **Tabela renomeada `fiscal_notes`→`fiscal_invoices`:** todo o módulo controladoria/contador já usa `fiscal_invoices` corretamente. Nenhuma referência stale a `fiscal_notes` encontrada.
- **Crash da cotação no `/admin/saude`:** FALSO ALARME. `lib/cotacao.ts` garante `value: number` em todos os caminhos (FALLBACK nas linhas 34/48 + catch na 54). `cotacao.value.toFixed(2)` é seguro.
- **Passaporte público:** ID inexistente mostra tela "não encontrado" graciosa; ID real (`BER-001`) renderiza dados reais. Rate-limit por IP funciona.
- **Empty states:** todas as páginas de banco/frigorífico/contador têm empty states explícitos e graciosos com 0 linhas (nunca ficam em branco/quebradas).
- **Proteção de auth:** 100% das rotas autenticadas → 307 `/login`. Nenhum 500 exposto sem sessão.

---

## Ações mínimas antes da demo (ordem de prioridade)

1. **Corrigir `algorithm_version` (P1-1)** nos 9 arquivos → `.in(["v3","v3.1"])`. Sem isso, Score/Banco/Frigorífico podem mostrar zeros. **Mais importante.**
2. **Neutralizar os 2 botões dead-end (P1-2, P1-4)** se as jornadas frigorífico/contador forem mostradas.
3. **Decidir o link LCDPR do contador (P1-3)** ou removê-lo se a persona contador não entrar na demo.
4. **Remover "Em construção · Sprint G2" e "(futuro)" (P2-1, P2-2)** — cosmético mas visível.
5. **Não abrir `/status`** durante a demo.
