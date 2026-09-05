# Decisões paradas na mesa do Lucas

> Lista viva. Enquanto uma decisão não vier, o **padrão assumido** vale e o trabalho
> segue — nada aqui bloqueia entrega. Repetir ao Lucas só quando fizer diferença
> para a próxima entrega, sem cobrar tom.
>
> Origem: passagem de bastão de 05/09/2026, seção 6.
> Última revisão: 2026-09-05.

---

## Como usar

Cada linha tem **decisão**, **padrão assumido** e **o que muda quando ela vier**.
Ao decidir, mover para `## Decididas` com a data e propagar onde o padrão foi usado.

---

## Abertas

### D-01 · O que foi decidido em 03/09
D1–D6 do C1, as seis premissas do C2, e a ordem piloto → equity no C3.
**Padrão assumido:** tudo tratado como *proposto*, não ratificado.
**Muda quando vier:** o material externo pode citar como decisão da companhia.

### D-02 · Pró-labore
As três frentes assumem times diferentes, e nenhuma curva cobre cinco pró-labores
antes de 2028.
**Padrão assumido:** modelos mostram **com e sem** pró-labore, lado a lado.
**Muda quando vier:** o caixa mínimo do C3 sai de R$ 0,69 mi ou R$ 1,15 mi para um
número só, e o vale de caixa do C1 fecha.

### D-03 · Mandato de equity com a iBoi
Opção A: iBoi entra com ~30% já. Opção B: comercial primeiro, equity depois.
**Padrão assumido:** **B** para todo material externo. Cria e canal contador
**fora** de exclusividade.
**Muda quando vier:** define se o kit da iBoi leva LOI ou term sheet.

### D-04 · Premissas-padrão do livro-razão
ICP 201–1.000 cabeças, preços 699/499/1.500, churn 3%, grade de opex.
**Padrão assumido:** os valores propostos na consolidação de 05/09.
**Muda quando vier:** o livro-razão em `rules/` deixa de ser PREMISSA e vira base
fixa dos modelos.

### D-05 · Subir arquivos ao Drive
Árvore proposta na aba 4 da consolidação.
**Padrão assumido:** **não subido**. Tudo permanece local e no repositório.
**Muda quando vier:** os sócios passam a ler a mesma versão.

### D-06 · O que entra da revisão imparcial
**Padrão assumido:** "adotar agora" = apenas itens apoiados em **lei ou preço
público**. O resto segue como hipótese.
**Muda quando vier:** libera os itens de julgamento para o material externo.

### D-07 · Fazendas-tipo da auditoria
PF de 500 cabeças; PJ de 5 mil cabeças/ano.
**Padrão assumido:** mantidas como estão.
**Muda quando vier:** o número fundador é recalculado sobre outra base.

### D-08 · Ficha da FSJBE
PF ou PJ, IE, regime, receita 2025, empregados, vendas fora de GO, quem declara a DITR.
**Padrão assumido:** **PJ** (PREMISSA).
**Muda quando vier:** define FUNRURAL (1,63% × 2,23%), aplicabilidade do
Lei 12.058/2009 art. 32, e o limiar de IBS/CBS.
**Consequência se PJ se confirmar:** o teste de imposto **PF** fica sem fazenda —
será preciso uma PF entre as primeiras das 20 conversas.

### D-09 · "O que R$ 100 mil comprariam para o C1 em 90 dias?"
**Padrão assumido:** nada além do piloto. Hardware é barreira do C2/C3, não do C1.
**Muda quando vier:** redefine o ask do C2.

### D-10 · Regra de casa do banco *(acrescentada em 05/09)*
Ninguém altera o banco de produção por fora; toda mudança por migration versionada,
com **um único caminho de aplicação**.
**Padrão assumido:** tratada como vigente. O lint de migrations já está no CI e
nenhuma migration foi aplicada sem ordem.
**Muda quando vier:** vira regra escrita no `CLAUDE.md`, oponível a qualquer sessão.

---

## Pendências operacionais que só o Lucas resolve

Entregar como lista de 5 minutos quando ele tiver janela. Origem: seção 7.

1. **Acesso ao banco** — autenticar o MCP do Supabase (`/mcp`) **ou** aprovar a
   leitura do `.env.local`. Nunca colar a service key em chat.
2. **Backup** — painel do Supabase → Database → Backups. Informar se há automático;
   se não houver, autorizar `pg_dump` via cliente Postgres (sem Docker).
3. **Confirmar a regra de casa** (D-10).
4. **Dados da FSJBE até 12/09** + a ficha da fazenda (D-08).
5. **Variável na Vercel** — já **não** é bloqueante (default `legacy`).
   `FISCAL_WRITE_MODE=dual` só depois da migration 159 aplicada.

---

## Decididas

_(vazio — mover para cá com a data quando vierem)_
