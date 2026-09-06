# Agraas · Status

> **Página viva.** Responde "onde estamos?" sem você precisar perguntar.
> Atualizada ao fim de cada bloco de trabalho, antes do commit.
>
> **Última atualização:** 05/09/2026 · `3a741a8` · 201 testes verdes · tsc limpo

---

## Semáforo

| | Estado |
|---|---|
| 🟢 **Código** | 201 testes passando, typecheck limpo, árvore limpa, tudo em `origin/main` |
| 🔴 **Banco** | **Nenhuma migration aplicada.** 159, 160 e 161 escritas e paradas |
| 🔴 **Acesso** | Sem MCP autenticado, sem `.env.local`, sem backup. Bloqueia 6 frentes |
| 🟡 **Pista B** | Bloqueada: os arquivos da seção 8 do handoff não estão no repositório |
| 🟢 **Produção** | Landing com 0 erro e 0 warning de console, todas as requisições 200 |

---

## Datas que mandam

| Prazo | Faltam | O que é |
|---|---:|---|
| **12/09** | **7 dias** | Dados da FSJBE (Ico + contador). Sem eles, B4 sai do ciclo |
| **25/09** | 20 dias | Gate d30 — pacote vendável · 3 contadores treinados · 20 conversas |
| **30/09** | 25 dias | DITR 2026 — o contador assina o relatório |
| 25/10 | 50 dias | Gate d60 — ≥3 fazendas via contadores · ≥2 pagantes. Destrava o C2 |
| 24/11 | 80 dias | Gate d90 — 5 pagantes retidas · churn <2/5 |

---

## Pista A · Plataforma

### No ar hoje

| Item | O que é | Commit |
|---|---|---|
| **B0** | Parser de NF-e puro com ICMS completo + monofasia (CST 61). Corrigiu bug real de colisão de tag | `c70c885` |
| **B0 backfill** | Reprocessa `raw_xml`, casa por 6 campos, reporta ambiguidade em vez de escolher | `6eed008` |
| **B0b** | Escrita dupla legado+canônica atrás de `FISCAL_WRITE_MODE` (default `legacy`) + job de consistência | `56d219e` |
| **B0c** | Alertas no schema EN, taxonomia namespaced, lint que impede a causa-raiz | `0cf9062` |
| **rules/** | Livro de regras YAML com `verificado_em` como trava dura | `b54ac13` |
| **B4** | Relatório de DITR. Tabela de alíquotas lida célula a célula do anexo oficial | `4e4ce14` |
| **Compliance** | 10 claims de emissão de NF-e removidos + Halal/SIF fora do cadastro + bug do frigorífico | `3a741a8` |

### Em andamento

- Revisão adversarial do parser e do backfill (agente `code-reviewer`, rodando)
- **B1** — Convênio ICMS 100/97, motor puro. Próximo item da fila

### Na fila

`B2` diesel · `B6` IBS/CBS · skills fiscais · scripts a seco para quando o acesso vier

### Bloqueado por acesso

`backup` · `inventário do schema real` · `migrations 159/160/161` · `backfill dry-run` · `B5 FUNRURAL`

---

## Pista B · Estratégia

| Item | Estado |
|---|---|
| Inventário "o que já existe" | ✅ `docs/estrategia/inventario-plataforma.md` — insumo da página anti-cópia do C3 |
| Livro-razão único | 🔴 depende dos arquivos da seção 8, que não estão no repositório |
| Padronização do C2 | 🔴 depende do xlsx do C2 |
| Kit da iBoi | 🔴 não sai antes do mandato dos sócios e do onboarding testado |

---

## Achados abertos que precisam de decisão

Estes vieram do raio-x e **não** foram corrigidos porque exigem schema ou decisão comercial.

| # | Achado | Por que importa |
|---|---|---|
| **A-1** | **Não existe perfil "Contador" no cadastro**, e `role` é hardcoded `"client"`. Quem escolhe "Frigorífico" vira produtor | O canal comercial nº1 dos 90 dias não tem porta de entrada. Cada contador exigiria mexer no banco à mão — inviabiliza o teste de canal do d60 |
| **A-2** | O cadastro **coleta e descarta** nome da fazenda, estado, tamanho do rebanho e espécie | Todo lead perde o contexto que o comercial precisaria para follow-up |
| **A-3** | Primeira tela pós-cadastro é o painel de **rebanho zerado**, sem ponte para o módulo fiscal | Contradiz o wedge no primeiro minuto de uso |
| **A-4** | Persona Contador é **read-only** — nenhuma ação sobre NF-e, convite só por `mailto`, busca desabilitada | É relatório, não ferramenta de trabalho |
| **A-5** | Taxa de 2% do marketplace publicada, **sem implementação** | Termo comercial no ar sem produto. Suavizei para "prevista"; decidir se implementa ou sai |
| **A-6** | `/cadastro` tem warning de *password field not contained in a form* | Quebra o gerenciador de senha do navegador |
| **A-7** | Score **78 hardcoded** em `/planos` como "score médio FSJBE"; o valor real registrado é 53 | Divergência entre página pública e plataforma, achável em DD |
| **A-8** | Produção roda Score **v3.2** sem migration versionada | O repositório não é fonte de verdade do banco |

Decisões formais e padrões assumidos: `docs/decisoes/pendentes.md`.

---

## Depende de você — 5 minutos

1. `/mcp` para autenticar o Supabase, **ou** aprovar a leitura do `.env.local`
2. Supabase → Database → Backups: existe backup automático? (sim/não)
3. Cobrar Ico e contador: dados da FSJBE até **12/09**
4. Copiar os arquivos da seção 8 para `docs/estrategia/2026-09-05/` — destrava a Pista B inteira
5. O item 5d do handoff cortou no meio (*"Item 2 do Convênio — rações, farelos, milho, base"*) — é a faixa de 30%, o grosso da nota de pecuária

---

*Como manter: a skill `pauta` abre a sessão lendo esta página; todo bloco de trabalho a atualiza antes do commit.*
