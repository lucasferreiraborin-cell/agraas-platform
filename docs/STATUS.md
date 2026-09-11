# Agraas · Status

> **Página viva.** Responde "onde estamos?" sem você precisar perguntar.
> Atualizada ao fim de cada bloco de trabalho, antes do commit.
>
> **Última atualização:** 05/09/2026 · `182a306` · 209 testes verdes · tsc limpo

---

## Semáforo

| | Estado |
|---|---|
| 🟢 **Código** | 320 testes passando, typecheck limpo, árvore limpa, tudo em `origin/main` |
| 🔴 **Banco** | **Nenhuma migration aplicada.** 159, 160, 161 e 162 escritas e paradas |
| 🔴 **Acesso** | Sem MCP autenticado, sem `.env.local`, sem backup. Bloqueia 6 frentes |
| 🟡 **Pista B** | Bloqueada: os arquivos da seção 8 do handoff não estão no repositório |
| 🟢 **Produção** | Landing com 0 erro e 0 warning de console, todas as requisições 200 |

---

## Datas que mandam

| Prazo | Faltam | O que é |
|---|---:|---|
| **12/09** | **1 dia** | Dados da FSJBE (Ico + contador). Sem eles, B4 sai do ciclo |
| **25/09** | 14 dias | Gate d30 — pacote vendável · 3 contadores treinados · 20 conversas |
| **30/09** | 19 dias | DITR 2026 — o contador assina o relatório |
| 25/10 | 44 dias | Gate d60 — ≥3 fazendas via contadores · ≥2 pagantes. Destrava o C2 |
| 24/11 | 74 dias | Gate d90 — 5 pagantes retidas · churn <2/5 |

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
| **Revisão** | 8 achados adversariais corrigidos antes da primeira execução do backfill | `08e37cc` |
| **B4 PDF** | O documento que o contador confere e assina. Rota `/api/export/itr-pdf` | `7a4c444` |
| **A-1 + A-2** | Perfil de contador no cadastro, role correta e intake persistido. Migration 162 escrita | `846bc5e` |
| **B1** | Verificador do Convênio 100/97 — motor puro, 49 testes. Texto lido na fonte do CONFAZ | `60871d3` |
| **Upload** | Regressão no upload de NF-e (11/09): parser provado limpo em XML real; `randomUUID` importado; erro passa a dizer destino e modo | `b3c1348` |
| **PDF→IA** | DANFE em PDF volta a ser extraído — Claude como documento nativo, sem `pdf-parse`. Causa: `31b3e64` removeu a IA junto com a lib | `55ca060` |
| **PDF→IA v2** | Sem retry do SDK (orçamento de 30 s do cliente), fallback para `claude-sonnet-4-6` se a chave não tiver o Sonnet 5, e o card de upload **mostra qual extração rodou e por quê** | 11/09 |

### Em andamento

- ✅ **Upload de NF-e — causa encontrada e corrigida (11/09).** Não era o B0.
  O upload gravava a nota; o que falhava era a **extração de PDF**. O commit
  `31b3e64` (jun/2026) removeu o `pdf-parse` por incompatibilidade com
  serverless e levou junto a chamada ao Claude — sobrou uma varredura de texto
  que não lê DANFE comprimido. Toda nota em PDF entrava como casca vazia
  (CNPJ vazio, R$ 0,00, 0 itens) com o aviso "preencha manualmente".
  **Fix:** o PDF vai ao Claude como documento nativo (`lib/fiscal/pdf-extract.ts`),
  JSON validado por zod, varredura crua só como fallback. Nunca lança; confiança
  < 0,7 mantém o aviso de revisão. Modelo `claude-sonnet-5` (Etapa 1).
  **Segunda tentativa do Lucas ainda vazia (11/09, tarde).** Não consigo chamar o
  Claude nem ler os logs da Vercel daqui (sem credencial, CLI sem login). O que
  fiz: (1) `maxRetries: 0` — o retry do SDK estourava os 30 s do cliente e a
  nota era gravada depois de o usuário desistir; (2) fallback automático para
  `claude-sonnet-4-6` se a chave da conta devolver 404 para o Sonnet 5 — os
  outros modelos em produção são 4.6 e comprovadamente aceitos; (3) **o card de
  sucesso do upload agora diz "lido por IA (modelo)" ou "IA indisponível: motivo"**.
  A próxima tentativa fecha o diagnóstico na própria tela, sem log.
- **B2** — crédito de ICMS do diesel. Próximo item da fila

> **B1 entregue.** O Convênio classifica por DESCRIÇÃO de produto, não por NCM —
> só um item cita código. O mapa NCM → cláusula é inferência nossa, e por isso
> vive numa seção separada da regra, marcada como PREMISSA com `verificado_em`
> null. Enquanto não for conferido por contador, todo achado sai como
> "verificar", nunca como "imposto pago a mais": `totalPagoAMais` fica zerado e
> o valor vai para `totalAVerificar`.
>
> Os três desfechos do cuidado 5a são separados e há um teste que varre 8 casos
> garantindo que **só** o desfecho "benefício aplicável e ausente" produz valor.

> **B4 fechado como entregável.** O motor tinha objeto, não documento. Agora tem PDF de
> duas páginas com o carimbo NÃO PUBLICÁVEL enquanto índice de lotação e conversão UA
> não forem verificados, pastagem declarada × comprovada lado a lado, e espaço de
> assinatura do contador com CRC. Roda sobre mock — quando o dado da FSJBE chegar,
> é troca de fonte, não construção.

### Revisão adversarial concluída — 4 bloqueantes corrigidos

O `code-reviewer` leu o parser e o backfill e deu veredito de **bloquear push**.
O backfill nunca rodou, então nenhum dado foi corrompido — as correções vieram
antes da primeira execução.

**Descartado:** testou todos os pares de tag com prefixo comum e não achou
colisão nova. A correção anterior cobre a classe inteira.

| # | Achado | Correção |
|---|---|---|
| 1 | Chave que não casa era tratada como item novo → INSERT duplicado, com os vínculos numa linha e o fiscal noutra | Se sobrou linha existente na nota, é ambiguidade: **a nota inteira é pulada** |
| 2 | Fingerprint omitia a monofasia própria, `product_code` e `sequence` → dois diesels com ad rem diferente passavam como idênticos | Assinatura cobre **tudo** que o UPDATE escreve |
| 3 | SELECT sem `ORDER BY` → `bucket[i]` arbitrário, gravava `sequence` na linha errada de forma irreproduzível | `.order("id")` |
| 4 | Erro no meio do lote deixava linhas gravadas e reportava zero | Contadores incrementam ao acontecer; o erro reporta `itens_ja_gravados` |
| 5 | Paginação sem desempate podia pular notas com `remaining: 0` | `.order("created_at").order("id")` |
| 6 | UPDATE gravava nulos → XML truncado apagaria valor bom | Campos nulos são **omitidos** do UPDATE |
| 7 | Sem decodificar entidades XML → `&amp;` literal, e hash divergente alimentando o achado 1 | `decodeXmlEntities` |
| 8 | Prefixo de namespace (`<ns2:det`) fazia o parser devolver **vazio em silêncio** — afetava o caminho ao vivo, não só o backfill | Todas as regex aceitam prefixo opcional |

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

✅ **A-1 e A-2 resolvidos em 08/09** — ver abaixo. Os demais seguem abertos.

> **A-1 era pior do que "falta opção no cadastro".** O `clients_role_check`
> aceitava só `admin/client/buyer/bank`: **`'accountant'` era rejeitado pelo
> banco**. O `roleToPersona` mapeava um valor que nunca pôde existir, e o
> comentário em `app/contador/page.tsx:9` já admitia — *"contador quando a role
> existir no banco"*. **Nunca existiu um contador de verdade**; as telas só
> foram vistas por admin em modo *viewing as*. Migration 162 corrige as três
> camadas de uma vez.

Estes vieram do raio-x e **não** foram corrigidos porque exigem decisão comercial.

| # | Achado | Por que importa |
|---|---|---|
| **A-3** | Primeira tela pós-cadastro é o painel de **rebanho zerado**, sem ponte para o módulo fiscal | Contradiz o wedge no primeiro minuto de uso |
| **A-4** | Persona Contador é **read-only** — nenhuma ação sobre NF-e, convite só por `mailto`, busca desabilitada | É relatório, não ferramenta de trabalho |
| **A-5** | Taxa de 2% do marketplace publicada, **sem implementação** | Termo comercial no ar sem produto. Suavizei para "prevista"; decidir se implementa ou sai |
| **A-6** | `/cadastro` tem warning de *password field not contained in a form* | Quebra o gerenciador de senha do navegador |
| **A-7** | Score **78 hardcoded** em `/planos` como "score médio FSJBE"; o valor real registrado é 53 | Divergência entre página pública e plataforma, achável em DD |
| **A-8** | Produção roda Score **v3.2** sem migration versionada | O repositório não é fonte de verdade do banco |
| **A-9** | `/api/parse-doc` (usado por abates, estoque, vendas, timeline) tem o **mesmo caminho cru de PDF** e o **bug antigo do `<vICMS[^>]*>`** que o B0 corrigiu no parser fiscal | Mesma classe de erro silencioso em quatro telas. Apontar para `lib/fiscal/nfe-parser` + `pdf-extract` |

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
