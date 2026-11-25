# Agraas Gestão — especificação do mini ERP gerencial (v1, 25/11/2026)

> Fonte: direção definida em 24/11/2026 (back office primeiro). Documento vivo.
> Princípio: **tudo começa na nota fiscal**. Sistema → processo → pessoas.
> Não é contabilidade oficial, folha nem ponto. Simples, não simplório; sem tailor-made.

## Escada de entrega

| Onda | Módulo | Entra no MVP? |
|---|---|---|
| 1 | Estoque (cadastros, entrada por NF, saídas, mínimo/máximo) | sim |
| 2 | Financeiro gerencial (pagar primeiro, títulos sem nota, relatórios, contador) | sim |
| 3 | Frota (cadastro, abastecimento, preventiva por horas, aplicação direta, custo/hora) | sim |
| 4 | Produção (saídas para talhão/piquete/operação, DRE operacional) | não — depois |
| 5 | Compras (cotação, pedido), integração bancária, automação de máquina, IA | não — depois |

Integração bancária **só** quando o processo interno fechar (todas as NFs, títulos sem nota
e baixas lançados, relatório batendo com o extrato). Antes disso a conciliação quebra.

## Transversal (vale para todos os módulos)

- **Categoria gerencial** (`categorias_gerenciais`): taxonomia de nomes que o produtor
  reconhece, editável por cliente, com sugestão inicial. **Não existe categoria "Outros".**
  Cada categoria aponta opcionalmente para uma conta do plano de contas contábil
  (`chart_of_accounts`) — é a ponte para o contador/IR sem virar contabilidade formal.
- **Responsável por cada ação**: toda tabela nova grava `criado_por` (auth.uid()); baixas,
  estornos, entradas e saídas geram evento em `auditoria_eventos` (quem, quando, o quê,
  antes/depois).
- **Isolamento**: toda tabela com `client_id` + RLS padrão (`is_admin() OR client_id =
  get_my_client_id()`, WITH CHECK amarrando referências ao mesmo cliente); toda query do
  app filtra `client_id` explicitamente.
- **Captura flexível**: digitação, upload (XML/PDF/foto), planilha; app/WhatsApp depois.

### Taxonomia sugerida (editável)

| Grupo | Categorias |
|---|---|
| Insumos agrícolas | Adubos e fertilizantes · Corretivos de solo · Defensivos · Sementes e mudas |
| Insumos pecuários | Sal mineral e suplementos · Rações e concentrados · Vacinas e medicamentos · Reprodução (sêmen, IATF) · Compra de animais |
| Combustíveis e lubrificantes | Diesel · Gasolina e etanol · Óleos e graxas · ARLA 32 |
| Máquinas e frota | Peças · Pneus e câmaras · Serviços de manutenção · Filtros |
| Mão de obra | Salários e encargos · Diaristas e empreitas · Prestadores de serviço |
| Estrutura | Cercas e currais · Construções e reformas · Energia elétrica · Água e irrigação |
| Administrativo | Contabilidade e jurídico · Telefone e internet · Software · Material de escritório · Impostos e taxas · Seguros |
| Financeiro | Juros · Tarifas bancárias |
| Investimentos | Máquinas e equipamentos · Terras e benfeitorias |
| Receitas | Venda de gado · Venda de grãos · Venda de leite · Arrendamentos recebidos · Serviços prestados |

## Onda 1 — Estoque (o coração)

**Cadastros obrigatórios antes de qualquer movimento**
- Almoxarifado: vários por cliente (ex.: Diesel, Peças, Insumos; ou "Almoxarifado 1/2/3"),
  com tipo opcional (tanque de combustível tem capacidade em litros).
- Produto: nome, unidade, NCM (referência), categoria gerencial (obrigatória), almoxarifado
  padrão, estoque mínimo e máximo. Importável (planilha) e criável a partir do item da nota.
- Fornecedor: nome, CPF/CNPJ, contato; criado automaticamente a partir da nota.

**Entrada por nota fiscal**
1. A nota chega (XML/PDF/foto) e fica "a conferir".
2. Conferência: cada item é ligado a um produto (sugestão automática por GTIN/NCM/nome;
   confirmação em 1 clique; o vínculo é lembrado) e a um destino:
   - **Estoque** (almoxarifado; padrão do produto), ou
   - **Aplicação direta** (máquina ou centro de custo — peça/serviço que já tem destino).
3. Confirmar gera: entrada no almoxarifado (quantidade, custo unitário da nota), título(s) a
   pagar pela condição de pagamento da nota, e evento de auditoria.

**Saídas** (sem saída não há gestão)
- Tipos: abastecimento (diesel → máquina), manutenção (peça/óleo → máquina), aplicação
  (insumo → centro/talhão/lote), consumo de atividade, ajuste de inventário (com motivo).
- Custo da saída = custo médio do produto no almoxarifado.
- Abastecimento registrado na frota gera a saída de diesel do almoxarifado de diesel.

**Controle**
- Saldo por produto e almoxarifado; alerta abaixo do mínimo e acima do máximo.
- Conferência de tanque: comprado − saídas = saldo esperado; contagem física informada →
  diferença = perda/desvio a explicar.
- Relatórios: gasto por categoria, por fornecedor, imobilizado em estoque por categoria.

## Onda 2 — Financeiro gerencial

- Pagar primeiro: a condição de pagamento da NF gera títulos (à vista, 30/60/90, parcelas).
- **Título sem nota**: fornecedor/prestador, valor, descrição, **categoria obrigatória**,
  vencimento; centro de custo opcional. Sem "outros".
- Baixa (data, valor, forma, conta), estorno com motivo — tudo com responsável.
- Visões: pagar hoje · próximos 15 dias · por fornecedor · por categoria · projeção de caixa.
- Receber manual (venda de lote, arrendamento, serviço).
- Contador/IR: pacote mensal (títulos pagos, entradas de NF, despesas por categoria → conta
  contábil) em planilha; exportação completa dos dados a qualquer momento.

## Onda 3 — Frota

- Cadastro: tipo (trator, caminhão, leve, pesado, implemento), marca, modelo, placa/série,
  medidor (horímetro/odômetro).
- Abastecimento: máquina, litros, leitura (ou "encheu até a boca"), foto do painel opcional,
  operador. Gera saída de diesel.
- Preventiva por horas: plano por máquina (ex.: filtro de óleo a cada 100 h); próxima revisão
  por horímetro; alerta; agrupar revisões próximas; checar peças no estoque e marcar
  "precisa comprar".
- Aplicação direta: peça/serviço/mão de obra da nota direto na máquina.
- Custo da máquina no mês = diesel + peças + serviços + mão de obra → custo por hora;
  comparar máquinas iguais e operadores.

## Fora do MVP (registrado para não dispersar)
Produção detalhada (DRE operacional, amortização), compras com cotação, integração bancária,
integração com automação de máquina e sensores, nutrição, manejo, descarte de embalagens,
marketplace, IA.
