# Proposta — Reorganização da SidebarNav

> Baseada no audit em `agraas-audit-completo.md`.
> **Não modifica nada** — apenas justifica o que mudar e por quê.

---

## Análise do agrupamento atual

A sidebar tem **8 grupos visíveis + 2 comentados (pausados)**. Funciona, mas tem 3 problemas reais:

### Problema 1 — Mega-grupo "Operações" (12 itens)
"Operações" virou um caixote: Aplicações, Pesagens, Estoque, Metas, Calendário Sanitário, Fornecedores, Produtos, Produção, Insumos, Eventos, Movimentações + um item literal "Operações". Mistura **rotinas sanitárias** com **performance produtiva** com **cadastros comerciais** com **dados operacionais soltos** (eventos). Sem hierarquia mental.

### Problema 2 — Badges "PIF" em 3 grupos
Itens marcados como "PIF" (Exportação, Painel Financeiro, Marketplace) sugerem que o produto está sob lente de exportação institucional. Pós-decisão 17/05 (foco 100% bovinos, Multbovinos em segundo plano), essas frentes **não devem ter destaque visual** na navegação principal — viram ruído pra produtores reais.

### Problema 3 — Reprodutivo dentro de "Rebanho"
A rota `/reprodutivo` (que já existe, 330 linhas) está dentro de "Rebanho". Faz sentido por proximidade temática, mas após as migrations 108–110 (coverings, diagnósticos, partos, bull soundness, semen batches, agregação automática), **Reprodução é grupo próprio**, com vida operacional distinta de "Animais cadastrados".

---

## Proposta (alinhada ao spec do usuário + ajustes)

8 grupos enxutos, sem mega-grupos, sem badges PIF.

```
🏠 INÍCIO  (2 itens — não 3)
├ Painel                  /painel
└ Inteligência            /inteligencia

🐂 REBANHO  (4 itens)
├ Animais                 /animais
├ Lotes                   /lotes
├ Propriedades            /propriedades
└ Movimentações           /movimentacoes

🧬 REPRODUÇÃO  (NOVO — 1 item por enquanto)
└ Reprodutivo             /reprodutivo
   [futuro: Coberturas, Diagnósticos, Partos, Sêmen — quando UI Eixo A subir]

⚕️ SANIDADE  (4 itens)
├ Aplicações              /aplicacoes
├ Dashboard Sanitário     /estoque/dashboard
├ Calendário              /calendario-sanitario
└ Estoque                 /estoque

📊 PERFORMANCE  (4 itens)
├ Pesagens                /pesagens
├ Metas de Peso           /metas
├ Scores                  /scores
└ Eventos                 /eventos

💰 FINANCEIRO  (4 itens)
├ Custos                  /custos
├ Vendas                  /vendas
├ Abates                  /abates
└ Fiscal                  /fiscal

🤝 COMERCIAL  (6 itens)
├ Compradores             /compradores
├ Fornecedores            /fornecedores
├ Produtos                /produtos
├ Insumos                 /insumos
├ Produção                /producao
└ Operações               /operacoes

🛠️ FERRAMENTAS  (2 itens)
├ Importar animais        /migrar-dados
└ Planos                  /planos

📈 RELATÓRIOS  (7 itens)
├ Market                  /market
├ Relatórios              /relatorios
├ Auditoria               /auditoria
├ Alertas                 /alertas
├ Certificações           /certificacoes
├ Histórico               /historico
└ Cadeia                  /cadeia
```

---

## Justificativa por movimento

### Adições / mudanças vs. spec original do usuário

1. **REPRODUÇÃO é grupo próprio** (não em REBANHO nem em SANIDADE). Razão: o que era “1 página de relatório” agora tem 11 tabelas operacionais + triggers de agregação + Dra. Renata vai ter login `mentor_externo` (migration 116). Empurrar pra dentro de "Rebanho" volta a esconder no monte.

2. **INÍCIO com 2 itens, não 3**. O "Dashboard Executivo" do spec não existe como rota separada — `/dashboard` é redirect 301 para `/painel`. Adicionar item duplicado confunde. Quando você refatorar `/painel` em "dashboard executivo consolidado" (Eixo C do queue), continua sendo o **mesmo Painel** com mais profundidade — não item separado.

3. **Movimentações em REBANHO, não em COMERCIAL**. Movimentações são fluxo do rebanho (entrada, saída, transferência entre fazendas, abate). Não são “comerciais”.

4. **Operações em COMERCIAL, não item solto**. `/operacoes` é vista operacional consolidada — comercial é o melhor caixote dado o conteúdo atual.

5. **Eventos em PERFORMANCE, não em SANIDADE**. Tabela `events` unificada cobre tudo (pesagem, nascimento, aplicação, GTA, etc.) — é dado bruto consultivo de performance, não rotina sanitária.

### Esconder (do spec, conforme decisão 17/05)

| Item escondido      | Por quê |
|---|---|
| Exportação (grupo)  | Cadeia PIF/Halal/Jeddah pausada; rotas `/exportacao` e `/tracking` continuam funcionando, só saem da sidebar |
| Marketplace PIF     | Mantém `/marketplace` como item solto **sem** badge PIF |
| Painel Financeiro PIF | Mantém `/financeiro` em FINANCEIRO **sem** highlight PIF |
| Pecuária Expandida  | Já comentado no código — apenas confirma decisão |
| Agricultura         | Já comentado no código — apenas confirma decisão |

### Renomear nada
Por enquanto, **mantenho todos os labels existentes**. Renomes ("Reprodutivo" → "Reprodução", "Operações" → "Operacional", etc.) ficam pra um PR separado de copy review — não misturar com restruturação.

---

## Mockup textual da nova sidebar

```
┌─────────────────────────────────┐
│           [ Agraas ]            │
│      Plataforma do agro         │
├─────────────────────────────────┤
│  🏠 Painel               •      │
│  🧠 Inteligência                │
│                                 │
│  REBANHO ─────────              │
│  🐂 Animais                     │
│  📦 Lotes                       │
│  🗺️ Propriedades                │
│  ⇄ Movimentações               │
│                                 │
│  REPRODUÇÃO ─────────           │
│  🧬 Reprodutivo                 │
│                                 │
│  SANIDADE ─────────             │
│  💉 Aplicações                  │
│  📊 Dashboard Sanitário         │
│  📅 Calendário                  │
│  🏥 Estoque                     │
│                                 │
│  PERFORMANCE ─────────          │
│  ⚖️ Pesagens                    │
│  🎯 Metas de Peso               │
│  ⭐ Scores                       │
│  📌 Eventos                     │
│                                 │
│  FINANCEIRO ─────────           │
│  💵 Custos                      │
│  💰 Vendas                      │
│  ✂️ Abates                      │
│  🧾 Fiscal                      │
│                                 │
│  COMERCIAL ─────────            │
│  🤝 Compradores                 │
│  🚚 Fornecedores                │
│  📦 Produtos                    │
│  📦 Insumos                     │
│  📈 Produção                    │
│  🗂️ Operações                   │
│                                 │
│  FERRAMENTAS ─────────          │
│  📤 Importar animais            │
│  ✅ Planos                      │
│                                 │
│  RELATÓRIOS ─────────           │
│  📊 Market                      │
│  📄 Relatórios                  │
│  📋 Auditoria                   │
│  🔔 Alertas                     │
│  ✅ Certificações               │
│  🕐 Histórico                   │
│  🔗 Cadeia                      │
└─────────────────────────────────┘
```

---

## Riscos da mudança

### 1. Rotas que NÃO existem ainda
- "Dashboard Executivo" do spec → não há rota. Sugerido remover (vide acima).
- Coberturas/Diagnósticos/Partos/Sêmen do REPRODUÇÃO → ficam pra commit posterior quando Eixo A subir UI.

### 2. Sub-itens removidos
A sidebar atual tem 8 sub-itens (Histórico Aplicações, Histórico Pesagens, Dashboard Sanitário, Histórico Estoque, Calendário Sanitário recuado, Histórico Custos, Custo de Produção, Histórico Movimentações, Relatório Fiscal, Dashboard Aves recuado, Dashboard Ovinos recuado, Assinatura recuada).

**Risco**: rotas como `/aplicacoes/historico`, `/pesagens/historico`, `/custos/historico` deixam de aparecer no menu lateral. Acessíveis via deep-link ou através de aba interna da página principal (Histórico vira tab dentro de cada página).

**Mitigação**: cada página primária precisa receber **uma aba "Histórico"** que renderiza o conteúdo de `/{rota}/historico`. Refactor menor por página, mas espalhado por ~7 páginas. **Trabalho de ~2-3h** se feito junto com a reorganização.

### 3. Componentes que linkam internamente
- `app/painel/page.tsx` tem alguns `<Link href="/...">` que apontam para sub-rotas — verificar se sobrevivem.
- `app/components/AgroAssistant.tsx` e `app/components/QuickActions.tsx` podem ter atalhos para rotas.

**Mitigação**: grep `<Link href="` antes de mover. Não bloqueador.

### 4. `BuyerSidebarNav` não muda
A sidebar de buyer (`app/components/BuyerSidebarNav.tsx`) é separada — só renderizada se `clients.role === 'buyer'` e a rota `/comprador` está pausada. **Sem ação necessária**.

### 5. Mobile drawer
`app/components/MobileDrawer.tsx` provavelmente reaproveita `SidebarNav` — verificar antes de implementar. Se sim, a mudança propaga automaticamente.

---

## Sugestão de execução em 3 commits

1. **Commit 1** — refactor SidebarNav: nova estrutura de grupos, sem mexer em sub-itens nem renomear nada. Sub-itens caem para 0. (~80 linhas alteradas.)
2. **Commit 2** — limpar tags PIF dos labels de "Marketplace", "Financeiro", "Exportação", remover grupo "Exportação" inteiro. (~30 linhas.)
3. **Commit 3** — adicionar tabs "Histórico" nas 7 páginas afetadas (`/aplicacoes`, `/pesagens`, `/custos`, `/movimentacoes`, `/fiscal`, `/estoque`, `/configuracoes/assinatura`). Maior risco — pode ser feito incremental.

**Estimativa total**: 3-5h, escalonável em commits independentes.
