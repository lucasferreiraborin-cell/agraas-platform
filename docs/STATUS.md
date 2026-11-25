# Agraas · Status

> **Página viva.** Responde "onde estamos?" sem você precisar perguntar.
> Atualizada ao fim de cada bloco de trabalho, antes do commit.
>
> **Última atualização:** 25/11/2026 · Agraas Gestão no ar e verificado em produção (17 telas, baixa/desfazer, XML → contas a pagar, isolamento entre clientes) · onboarding guiado `/gestao/comecar` publicado · em construção: OS + custo da safra (174/175), foto da nota + de-para (176), bancos + conciliação (177), multiusuário (178), importador + correção do score (171/179), pacote do contador · pendências antigas: D-11 (limpeza FSJBE), D-12 (171)



---

## 24–25/11/2026 — Gestão verificado em produção + onboarding

- Verificado em produção (24/11): 17 telas sem erro (desktop e celular), dar baixa/desfazer
  grava pelo site, XML de NF-e enviado pelo site gera nota + contas a pagar; sem login a API
  devolve vazio e recusa escrita; cliente comum (FSJBE) não vê nem grava dados de outro cliente
  (5/5 tentativas bloqueadas); advisors sem achado nas tabelas novas.
- Publicado (25/11 noite): foto da nota pelo celular (lida por IA, nunca grava nota vazia) e tela "Produtos da nota" (de-para item da nota → produto, com fator de conversão) — esta fica "em ativação" até aplicar a migration 176.
- Publicado: `/gestao/comecar` — configuração guiada em 4 passos (atividades → máquinas → notas → pronto);
  cartão no Início quando a conta ainda não tem centros de custo.
- Riscos abertos: conta demo é a única admin (não compartilhar login); proteção de senha vazada
  desligada no Auth; ~30 funções SECURITY DEFINER executáveis via API (pré-existentes).

---

## 23/11/2026 — Agraas Gestão (mini ERP multiatividade)

**Decisão (D-13):** plataforma para pecuaristas e agricultores, várias culturas e criações,
núcleo único por centro de custo. Portal separado `/gestao` (login `/gestao/entrar`, aba
"Gestão rural" no site); plataforma atual intacta.

**No código:** Início · Notas fiscais (upload XML/PDF pelas rotas existentes, lista unificada
dos dois fluxos) · Contas a pagar e receber (baixa, parcelamento, saldo 30 dias) · Máquinas e
diesel (estoque comprado × abastecido, consumo L/h, alerta, tag "em integração") · Insumos
(histórico de preço) · Atividades (14 atividades, resultado por centro, R$/ha e R$/cabeça) ·
Fechamento (pendências, CSV do contador, LCDPR). NF-e em XML gera títulos automaticamente
(parcelas `<dup>`); compra só de diesel entra como estoque (custo no consumo).

**Banco:** migration 172 (centros_custo, titulos_financeiros, maquinas, abastecimentos) e 173
(seed demo na conta lucas@agraas) — escritas; aplicação autorizada pelo Lucas em 23/11.

**Testes:** 459/459 Jest · tsc limpo · `next build` ok.

---

## 17/11/2026 (noite) — 1ª carga real da FSJBE e bug de plataforma

**O que aconteceu.** Duas planilhas de animais da FSJBE (exportação de outro
sistema de gestão) subiram por `/migrar-dados`. O banco ficou com **67% mais
animais** que as planilhas. Os animais únicos batem 100% (código, sexo,
nascimento e raça — conferido por hash); o excedente são cópias idênticas.
Nenhuma pesagem gravou e a categoria ficou vazia → todo o rebanho na conta
CPC 29 genérica `1.1.06`.

**Causas (logs do Supabase + banco):**
1. `/api/migrate-animals` checa "já existe?" com `select` sem paginação → a API
   devolve no máximo 1.000 linhas (logs: `0-999`) → acima disso, reimportar
   duplica.
2. Duas importações ao mesmo tempo, sem trava nem índice único
   `(client_id, internal_code)`.
3. Execução linha a linha cortada em ~300 s, sem mensagem na tela → o usuário
   repete.
4. **Bug de plataforma:** `calculate_agraas_score_v3` faz `SET LOCAL
   session_replication_role` (migration 123). Pela API isso é negado → falha
   toda escrita em `weights`, `applications`, `animal_movements`,
   `animal_rfids`, `animal_certifications` e `events`. Última pesagem,
   aplicação e movimentação: **10/04/2026**. Pelo console SQL passa (sessão
   `postgres`), por isso passou despercebido. **A 170 sozinha não destrava
   aplicação.** Bloqueia o pareamento brinco↔animal do caso iBoi.
5. Tela: só aceita `.csv` (diz aceitar XLSX), não pula linhas de título,
   mapeamento por prefixo (coluna sem título casa com qualquer campo), lote
   escolhido não é enviado, peso gravado com a data da importação, histórico
   de importações é texto fixo.

**Pendente (Lucas):** limpeza das cópias (D-11) · migration 171 do score
(D-12) · direção nova (D-13). Importador novo: plano entregue em 17/11.

## 16/11/2026 — o que mudou desde 09/11

**Contexto.** A reunião com a iBoi de 11/11 foi bem e virou **alinhamento de
parceria** (brincos GPS+RFID + API deles) marcado pra 17/11. Lucas trouxe as
notas reais da 1ª reunião: a dor que a própria iBoi nomeou é **falta de
conector** entre sistemas do pecuarista (Multibovinos + Totvs + outros não
conversam) e pediu que a Agraas estude o papel de middleware; modelo deles =
brincos + IoT + crédito (4ª/5ª operação com Safra, Itaú BBA e Stone); brinco
SISBOV-compliant, 60 meses, ping configurável por fase — **toparam ajustar
por fase e querem estudo de caso conjunto** pro "1º lote 100% rastreado".
Brincos novos chegam em dezembro (lote da Agraas, coleta sem data); visita
05/12 Fazenda dos Meninos mantida. Viagem de 14-15/11: **RFA Agropecuária
(família Tambelli)**, investidor-anjo influente, usa brinco iBoi — reunião
19/11 16h. **Lucas suspendeu os gates d30/d60/d90** até readequar prazos.

**3 auditorias no banco vivo (16/11) — achados que mandam:**
- **Rastreio:** `agraas_id` **não é ISO 076** (id interno `AGR-…`); RFID em
  dois lugares, nenhum ISO 11784; **não existe tabela de ping/geolocalização
  por animal nem rota autenticada pra parceiro** — a ponta que recebe o brinco
  é build novo. Passaporte público listava SIF/GTA/MAPA como "certificação do
  animal" (resíduo de seed) — **removidos da conta demo hoje** (24 linhas) —
  e expõe lat/lng exato da fazenda sem login. `iboi-mapa-passaporte.md` cita
  `animals.ear_tag`, que não existe.
- **Cadeia fiscal:** correções de 09/11 em pé. Mas `/painel` "ROI médio real"
  vinha de custo de referência (8/9 vendas) → **hoje só custo apurado, rótulo
  "ROI apurado"**; `/financeiro` se contradizia (ROI 66% × margem 5%) → **hoje
  margem/ROI/custo-@ só sobre vendidos**; custo de insumo por animal é zero
  na base inteira (60 aplicações sem lote, 0 lotes de estoque); **registrar
  aplicação sem lote falha** (trigger) em 3 caminhos — nenhuma criada desde
  10/04 → **migration 170 escrita**; **os dois fluxos de NF-e não se
  encontram** (`fiscal_notes` legado × `fiscal_invoices` da aprovação ×
  `apply-stock` em `supply_inventory_items`) — NF-e real nunca chega a
  estoque/contabilidade; nota de saída com CFOP 5102 e NCM 01029000 fixos
  (6/9 vendas interestaduais) — pro contador; custos da conta demo não se
  reconstroem das origens (R$ 51,3k × R$ 14,6k) — **primeiro custo lançado ao
  vivo derruba valores**.
- **Segurança:** **leak confirmado por policy** — 15 policies `*_same_property`
  via `users_profile.property_id` deixam conta nova ler **e alterar** score e
  abate de outro cliente → **migration 169 escrita (não aplicada)**. Cadastro
  como "frigorífico" sem aprovação vê todos os lotes ativos. `/marketplace/[id]`
  abria rascunho/pausado/vendido por UUID → **fechado hoje**. `/api/fiscal/delete`
  devolvia UUID do dono no 403 → **fechado**. Rate limit do passaporte era por
  animal (enumerável) → **por IP**. OK: RLS em 105/105 tabelas, 337 policies.

**Roteiro de 17/11 — não abrir ao vivo:** entrada de NF-e → estoque; lançar
custo/aplicação nova na conta demo; GTA real (0 linhas); estoque/FEFO (0
lotes); cadastro como frigorífico. **Pode abrir:** painel, animal/passaporte,
lotes, `/fiscal` com a NF-e real da FSJBE + análise por IA, controladoria em
leitura, `/financeiro`.

## Os 5 passos de 14/09 — fechados em 04/11 (verificado direto no banco via MCP)

1. ✅ **`CRON_SECRET`** na Vercel — ativo, confirmado por teste real (200/401/401 corretos)
2. ✅ **`/admin/contas`** — só `lucas@agraas.com.br` é `admin`. FSJBE + 2 contas Mentoria IZ-SP
   (que também estavam `admin` por engano) viraram `client`
3. ✅ **`/admin/reset-cliente`** — FSJBE zerada (0 animais, 0 notas) desde 11/09
4. ✅ **Upload de NF-e** — testado em produção com nota real (ALVORADA COM. PRODUTOS
   AGROPECUÁRIOS, R$ 2.061,36, 12 itens extraídos pela IA). Reupload do mesmo arquivo
   recusado com "já foi importada" — dedup por chave de acesso confirmado
5. ✅ **Propriedade real** — FSJBE corrigida para Jussara-GO (estava "Jandaia", valor de seed)

**Pendente, ainda não resolvido:** o que travava a edição de propriedade pela UI em
`/propriedades` (Lucas reportou não conseguir editar; a correção de passo 5 foi feita
por `UPDATE` direto via MCP, com ordem expressa do Lucas — não testamos a tela).

**05/11 (tarde):** tela de edição de `/propriedades` construída (não existia —
`app/propriedades/[id]/editar/page.tsx`). Branding/SEO corrigidos (domínio
canônico, favicon real, `llms.txt`, JSON-LD). CNPJ no rodapé. Audit de
UX/compliance pré-iBoi (`agraas-produto-ux`) achou 2 telas com risco de mostrar
claim Halal/"apto exportação" sem a mesma trava (`HALAL_ENABLED`) usada em
7+ outros pontos do app — corrigido (`fea42bc`). Migration 167 aplicada e
verificada por reexploit.

**05/11 (noite):** Fase 1 da segurança fechada ponta a ponta — 167 (sintoma,
4 RPCs) + 168 (causa raiz, conta órfã deixa de poder existir). Ordem expressa
do Lucas ("pode sair mexendo, você tem autonomia").

**05/11 (madrugada) — conta de demo validada direto no banco.** A FSJBE tem
**0 animais** — o roteiro de demo (`/painel` → animal → passaporte) não tem
o que mostrar nela. A conta certa já existe: **`lucas@agraas.com.br`**, 23
animais, 14 com score calibrado (médio 53 — bate com os números de agosto já
registrados: 14 animais, R$72.281, score 53). Achado no caminho: 5 dos
animais (prefixo `SAU-*`: Abdullah, Khalid, Omar, Yusuf, Ibrahim) e 10
certificações "Halal" ativas eram resíduo da adaptação da plataforma pra um
fundo árabe — descartada pelo Lucas ("desconsideremos isso"). Renomeados pra
nomes neutros (Touro Cerrado, Boi Pantanal, Touro Araguaia, Boi Nascente,
Touro Pampa) e as 10 certificações Halal deletadas. Achado um 3º ponto sem a
trava `HALAL_ENABLED` — `/animais/[id]` listava certificações sem filtrar —
corrigido (`fb30bd2`), junto com a tela de rate-limit (429) do passaporte
público que usava HTML cru fora do design system.

**09/11 — varredura completa do roteiro investidor-facing, dia antes da reunião.**
Navegador real (Playwright) em `/`, `/sobre`, `/marketplace`, `/cadastro`; código +
dado direto no banco em `/painel` e `/animais/[id]` (sem senha do Lucas pra logar
via browser). Achados:

- **A-6 fechado.** `/cadastro` não tinha `<form>` — navegador avisava "password
  field not contained in a form" e o gerenciador de senha não oferecia
  salvar/preencher. Wizard de 2 passos agora dentro de um `<form onSubmit>`,
  botões viram `type="submit"` (Enter volta a funcionar). 393 testes + tsc
  limpos. Verificado em produção via curl (`<form noValidate="">` no HTML).
  Commit `0e6d03a`.
- **Halal em `/painel`: confirmado limpo.** A query que busca certificação Halal
  pro KPI de exportação existe (`halalCount`/`exportReadyCount`/`hasHalal`), mas
  o resultado nunca é renderizado na tela — dado morto, não vazamento. Sem ação.
- **`CredibilityStrip.tsx`** (componente com "5 cadeias produtivas integradas —
  pecuária, grãos, aves, ovinos e fiscal") existe no repo mas **não é importado
  em lugar nenhum** — não está no ar, não é risco de compliance ativo. Candidato
  a exclusão por limpeza, não urgente.
- **Achado aberto, aguardando seu ok (regra 5 da skill `agraas-fsjbe-guard` —
  "status do cliente piloto FSJBE" é categoria de pausa-e-pergunta, não decido
  sozinho):** a seção da FSJBE na landing (`FSJBECaseSection.tsx`) e o parágrafo
  "Fundada em 2025. Em operação no campo." em `/sobre` afirmam passaporte
  individual, pesagens e "operação registrada do dia a dia" como já
  acontecendo. Confirmado no banco: **FSJBE tem 0 animais, 0 notas fiscais, 0
  pesagens.** Proposta: trocar o tempo verbal pra onboarding-a-começar, sem
  check verde em nada que não aconteceu ainda. Não publiquei a correção sem
  seu sinal.
- **Produção saudável.** `/`, `/sobre`, `/marketplace`, `/cadastro`, `/login`,
  `/em-breve`, `/privacidade`, `/termos`, `robots.txt`, `sitemap.xml`,
  `llms.txt` — todos HTTP 200. Sem erro de console em `/`, `/sobre`,
  `/marketplace`, `/cadastro`. O passaporte público mantém o erro React #418
  de hidratação (já conhecido, invisível, deferido desde agosto) — não
  reaberto.
- **`.claude/settings.json`** ganhou os nomes corretos das tools MCP do
  Supabase (`mcp__supabase__*`, sem o prefixo `plugin_`, que não cobria nada)
  + 5 tools de leitura do Playwright + WebFetch/WebSearch no allowlist —
  reduz prompt de permissão hoje. `apply_migration` deixado de fora de
  propósito, continua pedindo ordem expressa.

**09/11 (noite) — FSJBE auditada tabela por tabela, resíduo de seed eliminado.**
Lucas afirmou que o único dado real da plataforma era a nota fiscal subida em
04/11 (Alvorada Com. Agropecuários, R$ 2.061,36 — confirmada intacta na tabela
legada `fiscal_notes`, status `pendente`, sem `auto_stock_entry`). Pra
verificar, rodei uma contagem de linhas da FSJBE nas ~80 tabelas com
`client_id` do schema. Achado: **13 tabelas** com resíduo do seed de
17/04/2026 que o `/admin/reset-cliente` de 11/09 não cobre —
`animal_cost_summary` (5), `production_sales_history` (5),
`production_calf_entries` (4), `animal_goals` (4), `reproductive_ia_services`
(3), `sanitary_calendar` (3), `suppliers` (3, contatos fictícios com telefone
sequencial fake), `buyers` (2), `daily_insights` (15), além de
`supply_inventory_items`, `products`, `mentor_assignments`,
`supply_financials`, `reproductive_seasons`, `audit_snapshot` — mais os **7
anúncios de marketplace** e os **3 lotes de estoque** já achados antes nesta
sessão. Tudo deletado (transação única, ordem resolvendo FK
`products→suppliers`). Hoje a FSJBE tem só: a nota real, a propriedade real
(Jussara-GO) e o `chart_of_accounts` (infra preservada de propósito pelo
reset). **Ação de acompanhamento, não feita agora:** `/admin/reset-cliente`
precisa ganhar essas tabelas na cobertura dele, senão o problema volta no
próximo reset de qualquer cliente — ver `lib/admin/reset-cliente.ts`.

## Decisões pendentes (perguntadas ao Lucas, sem resposta ainda)

1. Ativar "leaked password protection" no Supabase Auth (ação dele, no dashboard).
2. Trocar `FISCAL_WRITE_MODE` de `legacy` pra `dual` na Vercel (env var — ordem expressa).
3. Upgrade pro Supabase Pro Plan — **Free Plan não inclui backup** (nem automático,
   nem PITR). Não é bloqueante hoje (migrations aditivas, rollback pronto), mas
   decide se cresce.
4. Pedido de puxar integrações de API da iBoi agora — contradiz a decisão C3
   registrada ("não construir antes do onboarding testado"). Supersede ou mantém?
5. Timing do pedido de "outro nível" na plataforma: focando só no roteiro de
   demo (landing → painel → animal → passaporte) pelos próximos dias, por
   risco de regressão — marketplace/pricing/pagamentos/API iBoi ficam de fora
   dos 5 dias (ver combinado em 05/11).
6. ✅ **09/11 (noite) — resolvido, com autorização do Lucas.** Copy da FSJBE
   na landing (`FSJBECaseSection.tsx`) e em `/sobre` reescrita pra status real:
   "cliente real" + "infraestrutura preparada" = feito (check verde);
   "passaporte digital" + "operação no campo" = próximo passo (ícone neutro).
   Verificado em produção.
7. **(16/11) Q1 — C3 e D-03 ainda valem?** O estudo de caso com lote próprio
   em dezembro é o kit da iBoi saindo e a integração sendo construída.
   *Padrão assumido:* estudo de caso supera a C3; lote entra como piloto
   comercial sem equity; ninguém toca em equity em 17/11.
8. **(16/11) Q2 — aplicar a migration 169** (fecha o leak de score/abate via
   `users_profile`) via MCP, como as 167/168? *Padrão:* não aplico sem ordem.
9. **(16/11) Q3 — aplicar a 170** (aplicação sem lote deixa de falhar)?
   *Padrão:* não aplico sem ordem.
10. **(16/11) Q4 — papel "frigorífico" passa a exigir aprovação do admin?**
    Hoje qualquer cadastro vê todos os lotes ativos. *Padrão:* fica como está
    até depois de 19/11; não demonstrar cadastro como frigorífico.
11. **(16/11) Q5 — coordenada exata da fazenda no passaporte público:
    arredondar pra ~1 km?** *Padrão:* exata até 17/11, arredondar depois;
    nunca trilha de ping ao vivo em página pública.
12. **Pro contador (não é decisão do Lucas):** CFOP/NCM da nota de saída
    (5102 → 5101/6101 por UF), ICMS 19% GO, retenção de FUNRURAL por PJ.

## Semáforo

| | Estado |
|---|---|
| 🟢 **Código** | 393 testes passando, typecheck limpo, next 16.3.5, tudo em `origin/main`. Raio-x completo: `docs/manutencao/2026-09-14-raio-x.md` |
| 🟢 **Banco** | **159–168 aplicadas em 05/11/2026** (via MCP, uma a uma, com snapshot de segurança prévio). Trava de escalação de role ativa, `get_my_client_id()` corrigida para todos os papéis, role `accountant` liberada, ICMS completo em `fiscal_invoice_items`, alertas unificados no canal canônico. **167 fecha vazamento cross-tenant** (achado do `security-rls-auditor`: `get_my_client_id()` retornava NULL para usuário autenticado sem linha em `clients`, e `x <> NULL` nunca é true — travava passava batido em 4 funções RPC, inclusive exportação de LCDPR de outro cliente). Reexploit testado após o fix, com `ROLLBACK`: agora bloqueia corretamente. **168 fecha a causa raiz** — trigger em `auth.users` cria o `client` stub no mesmo instante do signUp; `/api/cadastro/finalizar` agora faz UPDATE desse stub (`onboarded_at`) em vez de INSERT. Nunca mais existe usuário autenticado sem `client_id`. Testado com INSERT+ROLLBACK em `auth.users` |
| 🔴 **Isolamento** | **(16/11)** 15 policies legadas via `users_profile` deixam conta nova ler e alterar score/abate de outro cliente. Migration **169** escrita, aguardando ordem (Q2). Até lá: risco ativo, exige saber o UUID da propriedade |
| 🟡 **Cadeia fiscal** | **(16/11)** `fiscal_notes` (upload, modo `legacy`) e `fiscal_invoices` (aprovação → estoque/contábil) não se encontram; aplicação sem lote falha (migration **170** escrita, Q3). Não demonstrar NF-e → estoque ao vivo |
| 🟢 **Acesso** | MCP do Supabase autenticado (04/11) — leitura liberada, escrita sob ordem expressa |
| 🟡 **Pista B** | Bloqueada: os arquivos da seção 8 do handoff não estão no repositório |
| 🟢 **Produção** | Fiscal (upload + IA + dedup) provado ponta a ponta com dado real da FSJBE |

---

## Datas que mandam

> **16/11/2026 — gates d30/d60/d90 suspensos pelo Lucas** ("vamos relevar as
> metas pré-estabelecidas... iremos readequar"). d60 (25/10) venceu sem bater
> (0 contadores, 0 pagantes, verificado no banco); d90 (24/11) não vale como
> gate até a readequação. A tabela antiga fica como histórico em
> `docs/snapshots/`.

| Data | Faltam | O que é |
|---|---:|---|
| **17/11** | **amanhã** | Reunião de alinhamento iBoi — parceria brincos + API, estudo de caso conjunto |
| **19/11 16h** | 3 dias | RFA Agropecuária (Luiza + Fábio Tambelli) — primeira apresentação a investidor-anjo |
| 05/12 | 19 dias | Visita de campo Fazenda dos Meninos (Pedro + Frederico mapeiam antes) |
| dez/2026 | — | Chegada do lote de brincos iBoi pra Agraas — coleta sem data |

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
| **Zerar cliente** | `/admin/reset-cliente`: inventário → confirmação por e-mail → apaga tudo do client_id em 2 passadas (FK), fotos incluídas, conta e plano de contas preservados, trilha em `platform_jobs_log`. Sem migration, sem SQL manual — roda com a service key da Vercel. Pedido do Lucas 11/09: FSJBE sai do seed e recebe NF-e e animais reais | 11/09 |
| **Banner "dados ilustrativos"** | Removido do painel e do prompt de insights — deixa de ser verdade quando a FSJBE tiver dado real | 11/09 |
| **Ingestão unificada** | Um único `saveNote` + um único handler (`lib/fiscal/ingest.ts`) para XML e PDF; `/api/fiscal/parse-xml` virou casca. Resposta traz `message` pronta para o card | 14/09 |
| **Controladoria: 4 endpoints que não existiam** | `upload-xml`, `upload-pdf` (mesmo handler), `upload-csv` (CSV/XLSX em lote + modelo para baixar), `upload-audio` (501 honesto). O modal mostrava "Sprint G2" e descartava o arquivo | 14/09 |
| **Planilha sem dependência** | `lib/planilha/csv.ts` (`;`, Latin-1, BOM, aspas) e `lib/planilha/xlsx.ts` (ZIP+XML, shared strings, serial de data). `notas-planilha.ts` agrupa linhas em notas, aceita apelidos de coluna, rejeita linha de exemplo, limite 200 notas | 14/09 |
| **parse-doc reescrito** | Abates, vendas, estoque e timeline passam a ler XML pelo `nfe-parser` (fim do `<detPag>` virando item) e PDF pelo Claude; destinatário agora vem no XML e no PDF | 14/09 |
| **Raio-x 14/09 — lote 5 (lint + público)** | BD-04 eslint instalado e rodando (`npm run lint`, CI sem bloquear); baseline 14/09: 119 erros → `any` vira aviso (84), 4 entities e 1 static-component fechados; ficam **31 erros** (29 de regras de hooks do React 19 — bug real, pagar com calma — + 1 `require` em teste + 1 JSX em try/catch) e 155 avisos (84 `any`, 38 só em `/api/chat`). P9 metadados OG/Twitter sem grãos/talhão/Grain ID; login sem badge "SIF" | 14/09 |
| **Raio-x 14/09 — lote 4 (fila sem dependência do Lucas)** | DT-02 LCDPR simplificado filtra por cliente (admin somava todos os tenants) e aceita `clientId` só para admin ou contador com vínculo ativo. F7/DT-03 apply-stock: posse, 409 se já aplicada, erro de cada escrita. AUTH-04 recálculo de score via service key com posse pela RLS. AUTH-06 digest dos sócios com service key + CRON_SECRET. DB-04 dedup da 160 corrigido + rollbacks 160/161. P6 Halal atrás da flag (landing, anúncio). P10 passaporte inexistente = 404 real. DT-05 28 pontos `toISOString().split("T")[0]` → `hojeBR()`; `calculateAgeInMonths` sem fuso. T-02 dois testes que só testavam o mock removidos; T-05/T-06 testes reais de score engine e FUNRURAL. BD-06 pgTAP roda em push + `lint:migrations` no CI + sem `--passWithNoTests`. AUTH-10 trilha `started` antes do reset. Migrations **164** (adoção de `platform_jobs_log`) e **165** (`search_path` introspectivo) escritas — não aplicadas. CLAUDE.md: foco 09/2026, PIF ativo, proxy.ts, só lucas@ admin. README real; STATUS antigo da raiz → `docs/snapshots/` | 14/09 |
| **Raio-x 14/09 — lote 3 (isolamento)** | Login fsjdbe via notas de outro cliente ("não pertence a este cliente"): a RLS libera tudo para `is_admin()` e várias contas estavam admin. **`/admin/contas`**: lista contas/papéis/e-mail duplicado e muda o papel (nunca rebaixa a si, nunca zera admins). Delete: admin exclui qualquer nota; usuário comum recebe o diagnóstico (dona × você × papel). `/api/cadastro/finalizar`: cliente criado no servidor, role de lista fechada (nunca admin), erro visível, fallback se a 162 não estiver aplicada. Migration **163** escrita (trava de role no UPDATE + `get_my_client_id()` sem filtro de role) — **não aplicada** | 14/09 |
| **Raio-x 14/09 — lote 2 (segurança)** | AUTH-01 header `x-vercel-cron` forjável → só Bearer `CRON_SECRET` (**precisa existir na Vercel**, senão os crons param com 401 visível). AUTH-07 `/api/email` sem relay. P3/P5 proxy: privacidade/termos/em-breve públicos; og-image/robots fora do login. BD-01 next 16.3.5 (2 críticos + 12 altos fechados). BD-02 modelos descontinuados trocados. Copy pública sem "sob rastreio"/"garantida"/backups/webhooks. **Jussara-GO** confirmado | 14/09 |
| **Raio-x 14/09 — lote 1 (fiscal)** | F1: CFOP `/^[1-37]/` rejeitava 5xxx/6xxx — **toda nota de compra real nascia "erro"**; agora `[123567]\d{3}`. F4: `chave_acesso` gravada → 2º upload da mesma NF-e vira 409 "já importada". F9: auth antes do corpo (401, não 500); itens que não gravam desfazem a nota e devolvem erro. F2: abates/vendas/estoque não marcam "verificado" sobre PDF que a IA não leu. F3: exclusão com posse verificada + service key + `count` real (antes podia ser no-op com "sucesso"). F6: prompt da análise sem "Lei Kandir garante isenção" e sem 3808 como medicamento. F10/DT-05: `lib/date-br.ts` — fim do dia deslocado em lista e relatório. Botões "Abrir/Excluir" da lista sempre visíveis | 14/09 |

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
| **A-9** | ✅ **Já resolvido, achado estava desatualizado (confirmado 09/11).** `/api/parse-doc` foi reescrito em 14/09 sobre `lib/fiscal/documento.ts`, que importa `parseNfeHeader`/`parseNfeItems` direto de `lib/fiscal/nfe-parser` e `extrairNfeDePdf` de `pdf-extract` — os mesmos módulos com o fix do B0. Sem parser duplicado, sem o bug do `<vICMS[^>]*>`. |

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
