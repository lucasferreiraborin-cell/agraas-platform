# iBoi × Agraas — o animal no mapa abre o passaporte

> Entrada do **B9** (integração iBoi — desenho, não código). Registrado em
> 11/09/2026 a partir de um print da tela "Monitoramento dos animais" da iBoi
> que o Lucas enviou. **Print de demonstração, imagem baixa resolução: o que
> está abaixo é o que dá para LER, não o que sabemos do produto deles.**
> Nenhum dado da iBoi aqui é FATO sobre o produto — é observação de tela.

## O que o print mostra (observação, não fato)

Mapa satélite com marcadores por animal. Ao clicar num animal, painel lateral com:

- Tag iBoi (número longo, formato compatível com ISO 11784/11785)
- Tipo, raça
- Peso em kg e em @
- Última visualização (data/hora)
- Bateria (%)
- Tempo de brincagem (dias)
- Filtros de período (24h / semana / mês / definir data)
- Abas: Localização · Passado do animal · Eventos · Alertas
- Mini-mapa com o rastro do animal

## A leitura estratégica

O painel deles responde **onde o animal está, se o brinco está vivo e quanto
pesa**. Não responde **quem é o animal, o que aconteceu com ele, quanto custou
e quanto vale**. Sanitário, GTA, fiscal, custo por animal, score, lote de
venda — nada disso está na tela.

Esse vazio é, literalmente, o passaporte Agraas. É a tese do C3 tornada
visível numa única tela: **sensor deles + registro nosso, no mesmo clique.**

Argumento para a página anti-cópia: a iBoi tem o hardware e a telemetria; o
que falta a eles é exatamente o que leva 16 a 22 meses/dev para construir
(ver `inventario-plataforma.md`) e que muda a cada marco regulatório.

## Forma técnica mínima (para o B9 estimar)

O passaporte público já existe e é público: `/passaporte/[agraas_id]`.
A chave de junção é o brinco: `animals.ear_tag` de um lado, a tag iBoi do
outro — mesmo padrão ISO. Então a versão 1 não precisa de modelo de dados novo:

1. **Deep link** — o painel da iBoi abre `/passaporte/{agraas_id}` resolvido
   pela tag. Zero integração de dados; só um resolver `tag → agraas_id`.
2. **Embed** — o mesmo passaporte renderizado dentro do painel deles (iframe
   ou componente), com o QR e a linguagem PT/EN/AR que já existem.
3. **Só depois, e só se o piloto justificar:** eventos de telemetria deles
   virando eventos no passaporte (entrada, pesagem, movimentação, saída) — o
   conector descrito no B9 original.

A ordem importa: 1 e 2 são demo em dias e não expõem o onboarding não testado.
O 3 é o que exige a API deles e semanas de trabalho.

## O que NÃO fazer

- Não construir nada disto antes do onboarding ser percorrido por terceiro
  (regra do C3: caixa fechada até lá).
- Não usar número do print como fato em material externo.
- Não prometer à iBoi que os eventos deles alimentam o score — o score tem
  lastro metodológico específico e não aceita qualquer sinal.

## Relacionado

`docs/estrategia/inventario-plataforma.md` · backlog B9 · `AGRAAS-BRIEF-iBOI.md` (local)
