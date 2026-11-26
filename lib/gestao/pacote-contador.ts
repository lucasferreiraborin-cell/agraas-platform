/**
 * Pacote do contador do mês — monta as abas do .xlsx e o CSV. Puro (sem I/O):
 * quem lê o banco é lib/gestao/exportar-leitura.ts.
 *
 * Abas (o que o contador pede para escriturar sem redigitar):
 * - Resumo: caixa do mês, em aberto, notas, diesel e resultado por centro.
 *   Caixa, em aberto, notas e diesel são FÓRMULAS ligadas às outras abas
 *   (corrigiu um valor, o resumo acompanha). O resultado por centro usa a
 *   mesma conta da tela de Fechamento (`resultadoPorCentro`) para os números
 *   baterem com o que o produtor viu.
 * - Títulos pagos e recebidos: regime de caixa, pela data da baixa, com
 *   entrada e saída em colunas separadas (formato de livro caixa).
 * - Em aberto: sem baixa, vencidos ou com vencimento até o fim do mês.
 * - Notas do mês: fiscal_invoices + fiscal_notes sem duplicar.
 * - Diesel e máquinas: abastecimentos, total por linha como fórmula.
 */

import {
  CSV_BOM, arred, csvLinha, csvNumero, csvTexto, noPeriodo, resultadoPorCentro, toNum, valorDiesel,
  type CentroRow, type Periodo,
} from "./resultado";
import { dataBR, diasEntre, mesPorExtenso } from "./format";
import {
  DIRECAO, FONTE_NOTA, MEDIDOR, MOVIMENTO, ORIGEM, STATUS_NOTA, STATUS_TITULO, TIPO_MAQUINA, TIPO_TITULO,
  chaveDeAcesso, contaBancariaRotulo, csvCodigo, csvDocumento, diaSP, documentoNota, formatarDocumento, momentoBR,
  naturezaTitulo, nomeAtividade, rotulo, type ContaBancariaRef, type NotaRef,
} from "./exportar-formatos";
import {
  colunaLetra, criterioIgual, faixa, linhasDaPlanilha, textoFormula,
  type Celula, type Formato, type PlanilhaXlsx,
} from "@/lib/planilha/xlsx-writer";

/* ───────────────────────────── Tipos ───────────────────────────── */

export const COLUNAS_TITULO =
  "id, tipo, descricao, contraparte_nome, contraparte_doc, numero_parcela, valor, vencimento, status, data_baixa, valor_baixa, forma_pagamento, bank_account_id, centro_custo_id, fiscal_invoice_id, fiscal_note_id, origem, natureza, notas";

export type TituloExport = {
  id: string;
  tipo: string;
  descricao: string;
  contraparte_nome: string | null;
  contraparte_doc: string | null;
  numero_parcela: string | null;
  valor: number | string;
  vencimento: string;
  status: string;
  data_baixa: string | null;
  valor_baixa: number | string | null;
  forma_pagamento: string | null;
  bank_account_id: string | null;
  centro_custo_id: string | null;
  fiscal_invoice_id: string | null;
  fiscal_note_id: string | null;
  origem: string;
  natureza: string | null;
  notas: string | null;
};

export const COLUNAS_ABASTECIMENTO = "id, data, maquina_id, litros, preco_litro, medidor_leitura, operador, centro_custo_id, origem, notas";

export type AbastecimentoExport = {
  id: string;
  data: string;
  maquina_id: string;
  litros: number | string;
  preco_litro: number | string | null;
  medidor_leitura: number | string | null;
  operador: string | null;
  centro_custo_id: string | null;
  origem: string;
  notas: string | null;
};

export type MaquinaExport = { id: string; nome: string; tipo: string | null; placa_ou_serie: string | null; medidor: string | null };
export type CentroExport = CentroRow & { ativo: boolean };
export type ContaExport = ContaBancariaRef & { id: string };

/** Nota do mês já unificada (fiscal_invoices = "principal"; fiscal_notes = "anterior"). */
export type NotaMes = {
  id: string;
  tabela: "principal" | "anterior";
  data: string | null;
  direcao: string | null;
  numero: string | null;
  serie: string | null;
  modelo: string | number | null;
  emitente: string | null;
  emitenteDoc: string | null;
  destinatario: string | null;
  destinatarioDoc: string | null;
  valor: number | string | null;
  icms: number | string | null;
  ipi: number | string | null;
  status: string | null;
  fonte: string | null;
  chave: string | null;
};

export const COLUNAS_NOTA_PRINCIPAL =
  "id, access_key, number, series, model, direction, issued_at, received_at, created_at, issuer_cnpj, issuer_name, recipient_cnpj, recipient_name, gross_value, icms_value, ipi_value, status, source";
export type LinhaNotaPrincipal = {
  id: string; access_key: string | null; number: string | null; series: string | null; model: string | null;
  direction: string | null; issued_at: string | null; received_at: string | null; created_at: string | null;
  issuer_cnpj: string | null; issuer_name: string | null; recipient_cnpj: string | null; recipient_name: string | null;
  gross_value: number | string | null; icms_value: number | string | null; ipi_value: number | string | null;
  status: string | null; source: string | null;
};

export const COLUNAS_NOTA_ANTERIOR =
  "id, chave_acesso, numero_nota, serie, modelo_nf, emitente_cnpj, emitente_nome, data_emissao, created_at, valor_total, status";
export type LinhaNotaAnterior = {
  id: string; chave_acesso: string | null; numero_nota: string | null; serie: string | null; modelo_nf: number | string | null;
  emitente_cnpj: string | null; emitente_nome: string | null; data_emissao: string | null; created_at: string | null;
  valor_total: number | string | null; status: string | null;
};

/**
 * Dia de emissão da nota. Timestamp com hora vira o dia de Brasília (nota das
 * 22h de 30/11 é de novembro). Meia-noite UTC exata é data sem hora gravada
 * como timestamp (registro migrado): vale o dia como está, senão voltaria um dia.
 */
export function diaDaNota(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ]00:00:00(?:\.0+)?(?:Z|[+-]00(?::?00)?))?$/.exec(ts.trim());
  return m ? m[1] : diaSP(ts);
}

/**
 * Notas do período nas duas tabelas, sem duplicar: a nota do fluxo anterior
 * (fiscal_notes) que já existe em fiscal_invoices — mesmo id ou mesma chave —
 * fica de fora, como na tela de Notas.
 */
export function unificarNotas(principais: LinhaNotaPrincipal[], anteriores: LinhaNotaAnterior[], periodo: Periodo): NotaMes[] {
  const vistos = new Set<string>();
  const saida: NotaMes[] = [];
  for (const r of principais) {
    if (vistos.has(r.id)) continue;
    vistos.add(r.id);
    const data = diaDaNota(r.issued_at) ?? diaDaNota(r.received_at) ?? diaDaNota(r.created_at);
    if (!noPeriodo(data, periodo)) continue;
    saida.push({
      id: r.id, tabela: "principal", data, direcao: r.direction, numero: r.number, serie: r.series, modelo: r.model,
      emitente: r.issuer_name, emitenteDoc: r.issuer_cnpj, destinatario: r.recipient_name, destinatarioDoc: r.recipient_cnpj,
      valor: r.gross_value, icms: r.icms_value, ipi: r.ipi_value, status: r.status, fonte: r.source, chave: r.access_key,
    });
  }
  const chaves = new Set(principais.map((r) => (r.access_key ?? "").trim()).filter(Boolean));
  for (const r of anteriores) {
    if (vistos.has(r.id) || (r.chave_acesso && chaves.has(r.chave_acesso.trim()))) continue;
    vistos.add(r.id);
    const data = r.data_emissao ? r.data_emissao.slice(0, 10) : diaSP(r.created_at);
    if (!noPeriodo(data, periodo)) continue;
    saida.push({
      id: r.id, tabela: "anterior", data, direcao: null, numero: r.numero_nota, serie: r.serie, modelo: r.modelo_nf,
      emitente: r.emitente_nome, emitenteDoc: r.emitente_cnpj, destinatario: null, destinatarioDoc: null,
      valor: r.valor_total, icms: null, ipi: null, status: r.status, fonte: null, chave: r.chave_acesso,
    });
  }
  return saida;
}

export type DadosPacote = {
  clientName: string;
  periodo: Periodo;
  /** Data de geração (yyyy-mm-dd, Brasília): base dos "dias em atraso". */
  hoje: string;
  geradoEm: Date;
  /** Títulos com vencimento OU baixa no mês, inclusive cancelados (o CSV mostra a situação). */
  titulosMes: TituloExport[];
  /** Sem baixa e com vencimento até o fim do mês (inclui vencidos de meses anteriores). */
  emAberto: TituloExport[];
  abastecimentos: AbastecimentoExport[];
  maquinas: MaquinaExport[];
  /** Todos os centros, ativos e inativos: título antigo pode apontar para centro desativado. */
  centros: CentroExport[];
  contas: ContaExport[];
  /** Número, série e chave das notas ligadas aos títulos (de qualquer mês), por id. */
  notasRef: Map<string, NotaRef>;
  notasMes: NotaMes[];
};

export const ABAS = {
  resumo: "Resumo",
  titulos: "Títulos pagos e recebidos",
  aberto: "Em aberto",
  notas: "Notas do mês",
  diesel: "Diesel e máquinas",
} as const;

/* ───────────────────────────── Apoio ───────────────────────────── */

type Def<K extends string> = { readonly chave: K; readonly titulo: string; readonly formato: Formato };

function tabela<K extends string>(defs: readonly Def<K>[]) {
  return {
    colunas: defs.map(({ titulo, formato }) => ({ titulo, formato })),
    indice: (k: K) => defs.findIndex((d) => d.chave === k),
    linha: (v: Partial<Record<K, Celula>>): Celula[] => defs.map((d) => v[d.chave] ?? null),
  };
}

const umaLinha = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const compara = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").localeCompare(b ?? "", "pt-BR");
const valorPago = (t: TituloExport) => (t.valor_baixa != null ? toNum(t.valor_baixa) : toNum(t.valor));
const negrito = (v: string): Celula => ({ v, formato: "texto", negrito: true });
const dinheiro = (v: number, f?: string, emNegrito = false): Celula =>
  f ? { f, v: arred(v), formato: "decimal2", negrito: emNegrito } : { v: arred(v), formato: "decimal2", negrito: emNegrito };
const inteiro = (v: number, f?: string): Celula => (f ? { f, v, formato: "inteiro" } : { v, formato: "inteiro" });
const nota = (v: string): Celula[] => [{ v, estilo: "nota" }];

function referencias(d: DadosPacote) {
  const centros = new Map(d.centros.map((c) => [c.id, c]));
  const contas = new Map(d.contas.map((c) => [c.id, c]));
  const maquinas = new Map(d.maquinas.map((m) => [m.id, m]));
  return {
    centro: (id: string | null) => (id ? centros.get(id)?.nome ?? "" : ""),
    atividade: (id: string | null) => (id && centros.has(id) ? nomeAtividade(centros.get(id)!.atividade) : ""),
    conta: (id: string | null) => (id ? contaBancariaRotulo(contas.get(id)) : ""),
    maquina: (id: string) => maquinas.get(id),
    nota: (t: TituloExport): NotaRef | null =>
      (t.fiscal_invoice_id ? d.notasRef.get(t.fiscal_invoice_id) : undefined)
      ?? (t.fiscal_note_id ? d.notasRef.get(t.fiscal_note_id) : undefined)
      ?? null,
  };
}

function situacaoAberto(vencimento: string, hoje: string): string {
  const dias = diasEntre(vencimento, hoje);
  if (dias > 0) return `Vencido há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return dias === 0 ? "Vence hoje" : "A vencer";
}

/** SUM/SUMIFS/COUNTIFS só fazem sentido com linhas: sem dados, o total é 0 fixo. */
const comDados = (n: number, f: string) => (n > 0 ? f : undefined);

const NOTA_FORA_DO_TOTAL = ["Rejeitada", "Arquivada"];
const notaConta = (n: NotaMes) => !NOTA_FORA_DO_TOTAL.includes(rotulo(STATUS_NOTA, n.status));

/* ───────────────────────────── Abas ───────────────────────────── */

const DEF_PAGOS = [
  { chave: "data", titulo: "Data da baixa", formato: "data" },
  { chave: "movimento", titulo: "Movimento", formato: "texto" },
  { chave: "contraparte", titulo: "Contraparte", formato: "texto" },
  { chave: "doc", titulo: "CPF/CNPJ", formato: "texto" },
  { chave: "documento", titulo: "Documento", formato: "texto" },
  { chave: "parcela", titulo: "Parcela", formato: "texto" },
  { chave: "descricao", titulo: "Descrição", formato: "texto" },
  { chave: "entrada", titulo: "Entrada (R$)", formato: "decimal2" },
  { chave: "saida", titulo: "Saída (R$)", formato: "decimal2" },
  { chave: "valorTitulo", titulo: "Valor do título (R$)", formato: "decimal2" },
  { chave: "forma", titulo: "Forma de pagamento", formato: "texto" },
  { chave: "conta", titulo: "Conta bancária", formato: "texto" },
  { chave: "centro", titulo: "Centro de custo", formato: "texto" },
  { chave: "atividade", titulo: "Atividade", formato: "texto" },
  { chave: "natureza", titulo: "Natureza", formato: "texto" },
  { chave: "vencimento", titulo: "Vencimento", formato: "data" },
  { chave: "origem", titulo: "Origem", formato: "texto" },
  { chave: "chave", titulo: "Chave de acesso", formato: "texto" },
  { chave: "obs", titulo: "Observações", formato: "texto" },
] as const;

const DEF_ABERTO = [
  { chave: "vencimento", titulo: "Vencimento", formato: "data" },
  { chave: "tipo", titulo: "Tipo", formato: "texto" },
  { chave: "situacao", titulo: "Situação", formato: "texto" },
  { chave: "contraparte", titulo: "Contraparte", formato: "texto" },
  { chave: "doc", titulo: "CPF/CNPJ", formato: "texto" },
  { chave: "documento", titulo: "Documento", formato: "texto" },
  { chave: "parcela", titulo: "Parcela", formato: "texto" },
  { chave: "descricao", titulo: "Descrição", formato: "texto" },
  { chave: "valor", titulo: "Valor (R$)", formato: "decimal2" },
  { chave: "centro", titulo: "Centro de custo", formato: "texto" },
  { chave: "atividade", titulo: "Atividade", formato: "texto" },
  { chave: "natureza", titulo: "Natureza", formato: "texto" },
  { chave: "origem", titulo: "Origem", formato: "texto" },
  { chave: "chave", titulo: "Chave de acesso", formato: "texto" },
  { chave: "obs", titulo: "Observações", formato: "texto" },
] as const;

const DEF_NOTAS = [
  { chave: "data", titulo: "Emissão", formato: "data" },
  { chave: "direcao", titulo: "Direção", formato: "texto" },
  { chave: "documento", titulo: "Documento", formato: "texto" },
  { chave: "emitente", titulo: "Emitente", formato: "texto" },
  { chave: "emitenteDoc", titulo: "CPF/CNPJ do emitente", formato: "texto" },
  { chave: "destinatario", titulo: "Destinatário", formato: "texto" },
  { chave: "destinatarioDoc", titulo: "CPF/CNPJ do destinatário", formato: "texto" },
  { chave: "valor", titulo: "Valor total (R$)", formato: "decimal2" },
  { chave: "icms", titulo: "ICMS destacado (R$)", formato: "decimal2" },
  { chave: "ipi", titulo: "IPI destacado (R$)", formato: "decimal2" },
  { chave: "situacao", titulo: "Situação", formato: "texto" },
  { chave: "fonte", titulo: "Entrou por", formato: "texto" },
  { chave: "chave", titulo: "Chave de acesso", formato: "texto" },
] as const;

const DEF_DIESEL = [
  { chave: "data", titulo: "Data", formato: "data" },
  { chave: "maquina", titulo: "Máquina", formato: "texto" },
  { chave: "tipo", titulo: "Tipo", formato: "texto" },
  { chave: "placa", titulo: "Placa ou série", formato: "texto" },
  { chave: "litros", titulo: "Litros", formato: "decimal2" },
  { chave: "preco", titulo: "Preço por litro (R$)", formato: "decimal4" },
  { chave: "total", titulo: "Total (R$)", formato: "decimal2" },
  { chave: "leitura", titulo: "Leitura do medidor", formato: "decimal1" },
  { chave: "medidor", titulo: "Medidor", formato: "texto" },
  { chave: "operador", titulo: "Operador", formato: "texto" },
  { chave: "centro", titulo: "Centro de custo", formato: "texto" },
  { chave: "atividade", titulo: "Atividade", formato: "texto" },
  { chave: "origem", titulo: "Origem", formato: "texto" },
  { chave: "obs", titulo: "Observações", formato: "texto" },
] as const;

/** Monta as cinco abas. A primeira (Resumo) abre selecionada. */
export function montarPacoteXlsx(d: DadosPacote): PlanilhaXlsx[] {
  const ref = referencias(d);

  /* ── Títulos pagos e recebidos (caixa) ── */
  const P = tabela(DEF_PAGOS);
  const pagos = d.titulosMes
    .filter((t) => t.status === "pago" && noPeriodo(t.data_baixa, d.periodo))
    .sort((a, b) => compara(a.data_baixa, b.data_baixa) || compara(b.tipo, a.tipo) || compara(a.contraparte_nome, b.contraparte_nome));
  const linhasPagos = pagos.map((t) => {
    const valor = valorPago(t);
    const n = ref.nota(t);
    return P.linha({
      data: t.data_baixa, movimento: rotulo(MOVIMENTO, t.tipo), contraparte: umaLinha(t.contraparte_nome),
      doc: formatarDocumento(t.contraparte_doc), documento: documentoNota(n), parcela: t.numero_parcela,
      descricao: umaLinha(t.descricao), entrada: t.tipo === "receber" ? valor : null, saida: t.tipo === "pagar" ? valor : null,
      valorTitulo: toNum(t.valor), forma: t.forma_pagamento, conta: ref.conta(t.bank_account_id),
      centro: ref.centro(t.centro_custo_id), atividade: ref.atividade(t.centro_custo_id),
      natureza: naturezaTitulo(t.tipo, t.natureza), vencimento: t.vencimento, origem: rotulo(ORIGEM, t.origem),
      chave: chaveDeAcesso(n?.chave), obs: umaLinha(t.notas),
    });
  });
  const entradas = arred(pagos.filter((t) => t.tipo === "receber").reduce((s, t) => s + valorPago(t), 0));
  const saidas = arred(pagos.filter((t) => t.tipo === "pagar").reduce((s, t) => s + valorPago(t), 0));
  const posP = linhasDaPlanilha({ colunas: P.colunas, linhas: linhasPagos });
  const [cEnt, cSai] = [P.indice("entrada"), P.indice("saida")];
  const rodapePagos: Celula[][] = [
    P.linha({
      data: negrito("Total do mês"),
      entrada: dinheiro(entradas, comDados(pagos.length, `SUM(${faixa(cEnt, posP.inicioDados, posP.fimDados)})`), true),
      saida: dinheiro(saidas, comDados(pagos.length, `SUM(${faixa(cSai, posP.inicioDados, posP.fimDados)})`), true),
    }),
    P.linha({
      data: negrito("Saldo do mês (entradas − saídas)"),
      entrada: dinheiro(entradas - saidas, `${colunaLetra(cEnt)}${posP.inicioRodape}-${colunaLetra(cSai)}${posP.inicioRodape}`, true),
    }),
  ];
  if (pagos.length === 0) rodapePagos.push(nota("Nenhum pagamento ou recebimento com baixa registrada neste mês."));

  /* ── Em aberto ── */
  const A = tabela(DEF_ABERTO);
  const abertos = [...d.emAberto]
    .filter((t) => t.status === "aberto" && t.vencimento <= d.periodo.fim)
    .sort((a, b) => compara(a.vencimento, b.vencimento) || compara(a.tipo, b.tipo) || compara(a.contraparte_nome, b.contraparte_nome));
  const linhasAbertos = abertos.map((t) => {
    const n = ref.nota(t);
    return A.linha({
      vencimento: t.vencimento, tipo: rotulo(TIPO_TITULO, t.tipo), situacao: situacaoAberto(t.vencimento, d.hoje),
      contraparte: umaLinha(t.contraparte_nome), doc: formatarDocumento(t.contraparte_doc), documento: documentoNota(n),
      parcela: t.numero_parcela, descricao: umaLinha(t.descricao), valor: toNum(t.valor),
      centro: ref.centro(t.centro_custo_id), atividade: ref.atividade(t.centro_custo_id),
      natureza: naturezaTitulo(t.tipo, t.natureza), origem: rotulo(ORIGEM, t.origem), chave: chaveDeAcesso(n?.chave),
      obs: umaLinha(t.notas),
    });
  });
  const abertoPagar = arred(abertos.filter((t) => t.tipo === "pagar").reduce((s, t) => s + toNum(t.valor), 0));
  const abertoReceber = arred(abertos.filter((t) => t.tipo === "receber").reduce((s, t) => s + toNum(t.valor), 0));
  const posA = linhasDaPlanilha({ colunas: A.colunas, linhas: linhasAbertos });
  const somaAberto = (tipo: string, aba?: string) => comDados(abertos.length,
    `SUMIFS(${faixa(A.indice("valor"), posA.inicioDados, posA.fimDados, aba)},${faixa(A.indice("tipo"), posA.inicioDados, posA.fimDados, aba)},${textoFormula(tipo)})`);
  const rodapeAberto: Celula[][] = [
    A.linha({ vencimento: negrito("Total a pagar"), valor: dinheiro(abertoPagar, somaAberto("A pagar"), true) }),
    A.linha({ vencimento: negrito("Total a receber"), valor: dinheiro(abertoReceber, somaAberto("A receber"), true) }),
    nota(`Sem baixa até ${dataBR(d.hoje)}, com vencimento até ${dataBR(d.periodo.fim)} — inclui vencidos de meses anteriores.`),
  ];

  /* ── Notas do mês ── */
  const N = tabela(DEF_NOTAS);
  const notas = [...d.notasMes].sort((a, b) => compara(a.data, b.data) || compara(a.numero, b.numero));
  const linhasNotas = notas.map((n) => N.linha({
    data: n.data, direcao: n.direcao ? rotulo(DIRECAO, n.direcao) : "Não informada", documento: documentoNota(n),
    emitente: umaLinha(n.emitente), emitenteDoc: formatarDocumento(n.emitenteDoc),
    destinatario: umaLinha(n.destinatario), destinatarioDoc: formatarDocumento(n.destinatarioDoc),
    valor: n.valor == null ? null : toNum(n.valor), icms: n.icms == null ? null : toNum(n.icms), ipi: n.ipi == null ? null : toNum(n.ipi),
    situacao: rotulo(STATUS_NOTA, n.status), fonte: n.tabela === "anterior" ? "Registro anterior" : rotulo(FONTE_NOTA, n.fonte),
    chave: chaveDeAcesso(n.chave),
  }));
  const posN = linhasDaPlanilha({ colunas: N.colunas, linhas: linhasNotas });
  const filtroNota = (direcaoRotulo: string, aba?: string) =>
    `${faixa(N.indice("direcao"), posN.inicioDados, posN.fimDados, aba)},${textoFormula(direcaoRotulo)}`
    + NOTA_FORA_DO_TOTAL.map((s) => `,${faixa(N.indice("situacao"), posN.inicioDados, posN.fimDados, aba)},${textoFormula(`<>${s}`)}`).join("");
  const somaNotas = (direcaoRotulo: string, aba?: string) => comDados(notas.length,
    `SUMIFS(${faixa(N.indice("valor"), posN.inicioDados, posN.fimDados, aba)},${filtroNota(direcaoRotulo, aba)})`);
  const contaNotas = (direcaoRotulo: string, aba?: string) => comDados(notas.length, `COUNTIFS(${filtroNota(direcaoRotulo, aba)})`);
  const totNotas = (direcao: string | null) => {
    const sel = notas.filter((n) => n.direcao === direcao && notaConta(n));
    return { qtd: sel.length, valor: arred(sel.reduce((s, n) => s + toNum(n.valor), 0)) };
  };
  const notasEntrada = totNotas("entrada");
  const notasSaida = totNotas("saida");
  const notasSemDirecao = totNotas(null);
  const rodapeNotas: Celula[][] = [
    N.linha({ data: negrito("Entradas (compras)"), valor: dinheiro(notasEntrada.valor, somaNotas("Entrada"), true) }),
    N.linha({ data: negrito("Saídas (vendas)"), valor: dinheiro(notasSaida.valor, somaNotas("Saída"), true) }),
    nota("Notas rejeitadas ou arquivadas não entram nos totais."),
  ];

  /* ── Diesel e máquinas ── */
  const D = tabela(DEF_DIESEL);
  const abast = d.abastecimentos
    .filter((a) => noPeriodo(a.data, d.periodo))
    .map((a) => ({ a, m: ref.maquina(a.maquina_id) }))
    .sort((x, y) => compara(x.a.data, y.a.data) || compara(x.m?.nome, y.m?.nome));
  const posD = linhasDaPlanilha({ colunas: D.colunas, linhas: abast });
  const [cLitros, cPreco, cTotal] = [D.indice("litros"), D.indice("preco"), D.indice("total")];
  const linhasDiesel = abast.map(({ a, m }, i) => {
    const linha = posD.inicioDados + i;
    const temPreco = a.preco_litro != null && a.preco_litro !== "";
    return D.linha({
      data: a.data, maquina: m?.nome ?? "—", tipo: rotulo(TIPO_MAQUINA, m?.tipo), placa: m?.placa_ou_serie,
      litros: toNum(a.litros), preco: temPreco ? toNum(a.preco_litro) : null,
      total: temPreco ? { f: `ROUND(${colunaLetra(cLitros)}${linha}*${colunaLetra(cPreco)}${linha},2)`, v: valorDiesel(a) } : null,
      leitura: a.medidor_leitura == null ? null : toNum(a.medidor_leitura), medidor: rotulo(MEDIDOR, m?.medidor),
      operador: umaLinha(a.operador), centro: ref.centro(a.centro_custo_id), atividade: ref.atividade(a.centro_custo_id),
      origem: rotulo(ORIGEM, a.origem), obs: umaLinha(a.notas),
    });
  });
  const litros = arred(abast.reduce((s, x) => s + toNum(x.a.litros), 0));
  const custoDiesel = arred(abast.reduce((s, x) => s + valorDiesel(x.a), 0));
  const semPreco = abast.filter((x) => x.a.preco_litro == null || x.a.preco_litro === "").length;
  const rodapeDiesel: Celula[][] = [
    D.linha({
      data: negrito("Total do mês"),
      litros: { v: litros, f: comDados(abast.length, `SUM(${faixa(cLitros, posD.inicioDados, posD.fimDados)})`), negrito: true },
      total: dinheiro(custoDiesel, comDados(abast.length, `SUM(${faixa(cTotal, posD.inicioDados, posD.fimDados)})`), true),
    }),
  ];
  if (semPreco > 0) {
    rodapeDiesel.push(nota(`${semPreco} ${semPreco === 1 ? "abastecimento sem preço por litro: os litros contam, o custo não" : "abastecimentos sem preço por litro: os litros contam, o custo não"}.`));
  }

  /* ── Resumo ── */
  const R: Celula[][] = [];
  const add = (l: Celula[]) => { R.push(l); return R.length; };
  add([{ v: `Pacote do contador — ${d.clientName}`, estilo: "titulo" }]);
  add([negrito("Período"), `${dataBR(d.periodo.inicio)} a ${dataBR(d.periodo.fim)} (${mesPorExtenso(d.periodo.inicio)})`]);
  add([negrito("Gerado em"), `${momentoBR(d.geradoEm)} (horário de Brasília)`]);
  add([]);

  add([negrito("Caixa do mês — pela data da baixa")]);
  const lRec = add(["Recebido", dinheiro(entradas, comDados(pagos.length, `SUM(${faixa(cEnt, posP.inicioDados, posP.fimDados, ABAS.titulos)})`))]);
  const lPag = add(["Pago", dinheiro(saidas, comDados(pagos.length, `SUM(${faixa(cSai, posP.inicioDados, posP.fimDados, ABAS.titulos)})`))]);
  add([negrito("Saldo"), dinheiro(entradas - saidas, `B${lRec}-B${lPag}`, true)]);
  add(["Baixas registradas", inteiro(pagos.length, comDados(pagos.length, `COUNTA(${faixa(0, posP.inicioDados, posP.fimDados, ABAS.titulos)})`))]);
  add([]);

  add([negrito(`Em aberto — sem baixa até ${dataBR(d.hoje)}, vencidos ou do mês`)]);
  add(["A pagar", dinheiro(abertoPagar, somaAberto("A pagar", ABAS.aberto))]);
  add(["A receber", dinheiro(abertoReceber, somaAberto("A receber", ABAS.aberto))]);
  add([]);

  add([negrito("Notas do mês"), negrito("Quantidade"), negrito("Valor (R$)")]);
  add(["Entradas (compras)", inteiro(notasEntrada.qtd, contaNotas("Entrada", ABAS.notas)), dinheiro(notasEntrada.valor, somaNotas("Entrada", ABAS.notas))]);
  add(["Saídas (vendas)", inteiro(notasSaida.qtd, contaNotas("Saída", ABAS.notas)), dinheiro(notasSaida.valor, somaNotas("Saída", ABAS.notas))]);
  if (notasSemDirecao.qtd > 0) {
    add(["Sem direção informada", inteiro(notasSemDirecao.qtd, contaNotas("Não informada", ABAS.notas)), dinheiro(notasSemDirecao.valor, somaNotas("Não informada", ABAS.notas))]);
  }
  add(nota("Notas rejeitadas ou arquivadas não entram nas somas."));
  add([]);

  add([negrito("Diesel abastecido no mês"), negrito("Litros"), negrito("Custo (R$)")]);
  const nomesMaquinas = [...new Set(abast.map((x) => x.m?.nome ?? "—"))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const primeiraMaquina = R.length + 1;
  for (const nome of nomesMaquinas) {
    const sel = abast.filter((x) => (x.m?.nome ?? "—") === nome);
    const crit = `${faixa(D.indice("maquina"), posD.inicioDados, posD.fimDados, ABAS.diesel)},${criterioIgual(nome)}`;
    add([
      nome,
      { v: arred(sel.reduce((s, x) => s + toNum(x.a.litros), 0)), f: `SUMIFS(${faixa(cLitros, posD.inicioDados, posD.fimDados, ABAS.diesel)},${crit})`, formato: "decimal2" },
      dinheiro(sel.reduce((s, x) => s + valorDiesel(x.a), 0), `SUMIFS(${faixa(cTotal, posD.inicioDados, posD.fimDados, ABAS.diesel)},${crit})`),
    ]);
  }
  const ultimaMaquina = R.length;
  add([
    negrito("Total"),
    { v: litros, f: comDados(nomesMaquinas.length, `SUM(B${primeiraMaquina}:B${ultimaMaquina})`), formato: "decimal2", negrito: true },
    dinheiro(custoDiesel, comDados(nomesMaquinas.length, `SUM(C${primeiraMaquina}:C${ultimaMaquina})`), true),
  ]);
  if (semPreco > 0) add(nota("Abastecimento sem preço por litro conta nos litros, não no custo."));
  add([]);

  const centrosAtivos = d.centros.filter((c) => c.ativo).sort((a, b) => compara(a.nome, b.nome));
  const resultado = resultadoPorCentro(centrosAtivos, d.titulosMes, d.abastecimentos, d.periodo);
  const comMovimento = resultado.linhas.filter((l) => l.custo > 0 || l.receita > 0);
  const temSemCentro = resultado.semCentro.custo > 0 || resultado.semCentro.receita > 0;
  add([negrito("Resultado por centro — contas pelo vencimento no mês, diesel pelo abastecimento")]);
  if (comMovimento.length === 0 && !temSemCentro) {
    add(nota("Sem movimento por centro neste mês."));
  } else {
    add([negrito("Centro"), negrito("Atividade"), negrito("Custo (R$)"), negrito("Receita (R$)"), negrito("Margem (R$)")]);
    const primeira = R.length + 1;
    for (const l of comMovimento) {
      const n = R.length + 1;
      add([l.centro.nome, nomeAtividade(l.centro.atividade), dinheiro(l.custo), dinheiro(l.receita), dinheiro(l.margem, `D${n}-C${n}`)]);
    }
    if (temSemCentro) {
      const n = R.length + 1;
      const s = resultado.semCentro;
      add(["Sem centro de custo", "", dinheiro(s.custo), dinheiro(s.receita), dinheiro(s.receita - s.custo, `D${n}-C${n}`)]);
    }
    const ultima = R.length;
    add([
      negrito("Total"), "",
      dinheiro(resultado.total.custo, `SUM(C${primeira}:C${ultima})`, true),
      dinheiro(resultado.total.receita, `SUM(D${primeira}:D${ultima})`, true),
      dinheiro(resultado.total.margem, `SUM(E${primeira}:E${ultima})`, true),
    ]);
  }
  add([]);
  add([negrito("Como ler")]);
  add(nota("Caixa: pagamentos e recebimentos com baixa registrada dentro do mês (regime de caixa)."));
  add(nota("Resultado por centro: contas pelo vencimento no mês, sem as canceladas; diesel pelo abastecimento (litros × preço). Compra de diesel para estoque não conta de novo como custo."));
  add(nota("Caixa, em aberto, notas e diesel são fórmulas ligadas às outras abas: corrigiu um valor lá, o resumo acompanha."));
  add(nota("Gerado pelo Agraas Gestão a partir dos lançamentos da fazenda. Confira antes de escriturar."));

  return [
    { nome: ABAS.resumo, linhas: R, larguras: [50, 22, 16, 16, 16] },
    { nome: ABAS.titulos, colunas: P.colunas, linhas: linhasPagos, rodape: rodapePagos },
    { nome: ABAS.aberto, colunas: A.colunas, linhas: linhasAbertos, rodape: rodapeAberto },
    { nome: ABAS.notas, colunas: N.colunas, linhas: linhasNotas, rodape: rodapeNotas },
    { nome: ABAS.diesel, colunas: D.colunas, linhas: linhasDiesel, rodape: rodapeDiesel },
  ];
}

/* ───────────────────────────── CSV (mantido) ───────────────────────────── */

/**
 * O CSV de antes, com o que faltava: documento e chave da nota (P2-7),
 * CPF/CNPJ e códigos que não perdem zero, conta bancária e natureza.
 * Contas: vencimento ou baixa no mês, com a situação (inclui canceladas).
 */
export function montarPacoteCsv(d: DadosPacote): string {
  const ref = referencias(d);
  const linhas: string[] = [];
  linhas.push(csvLinha([csvTexto(`Pacote do contador — ${d.clientName}`), `${dataBR(d.periodo.inicio)} a ${dataBR(d.periodo.fim)}`]));
  linhas.push("");
  linhas.push(csvLinha([csvTexto("CONTAS A PAGAR E A RECEBER")]));
  linhas.push(csvLinha([
    "Tipo", "Descrição", "Contraparte", "CPF/CNPJ", "Documento", "Parcela", "Vencimento", "Valor", "Situação",
    "Data da baixa", "Valor da baixa", "Forma de pagamento", "Conta bancária", "Centro de custo", "Atividade",
    "Natureza", "Origem", "Chave de acesso",
  ]));
  const titulos = [...d.titulosMes].sort((a, b) => compara(a.vencimento, b.vencimento) || compara(a.descricao, b.descricao));
  for (const t of titulos) {
    const n = ref.nota(t);
    linhas.push(csvLinha([
      csvTexto(rotulo(TIPO_TITULO, t.tipo)), csvTexto(t.descricao), csvTexto(t.contraparte_nome), csvDocumento(t.contraparte_doc),
      csvTexto(documentoNota(n)), csvCodigo(t.numero_parcela), dataBR(t.vencimento), csvNumero(t.valor),
      csvTexto(rotulo(STATUS_TITULO, t.status)), t.data_baixa ? dataBR(t.data_baixa) : "", csvNumero(t.valor_baixa),
      csvTexto(t.forma_pagamento), csvTexto(ref.conta(t.bank_account_id)), csvTexto(ref.centro(t.centro_custo_id)),
      csvTexto(ref.atividade(t.centro_custo_id)), csvTexto(naturezaTitulo(t.tipo, t.natureza)), csvTexto(rotulo(ORIGEM, t.origem)),
      csvCodigo(chaveDeAcesso(n?.chave)),
    ]));
  }
  linhas.push("");
  linhas.push(csvLinha([csvTexto("ABASTECIMENTOS DE DIESEL")]));
  linhas.push(csvLinha([
    "Data", "Máquina", "Litros", "Preço por litro", "Total", "Leitura do medidor", "Operador",
    "Centro de custo", "Atividade", "Origem",
  ]));
  const abast = d.abastecimentos
    .filter((a) => noPeriodo(a.data, d.periodo))
    .sort((a, b) => compara(a.data, b.data) || compara(ref.maquina(a.maquina_id)?.nome, ref.maquina(b.maquina_id)?.nome));
  for (const a of abast) {
    linhas.push(csvLinha([
      dataBR(a.data), csvTexto(ref.maquina(a.maquina_id)?.nome ?? ""), csvNumero(a.litros), csvNumero(a.preco_litro, 4),
      a.preco_litro != null && a.preco_litro !== "" ? csvNumero(valorDiesel(a)) : "", csvNumero(a.medidor_leitura, 1),
      csvTexto(a.operador), csvTexto(ref.centro(a.centro_custo_id)), csvTexto(ref.atividade(a.centro_custo_id)),
      csvTexto(rotulo(ORIGEM, a.origem)),
    ]));
  }
  return CSV_BOM + linhas.join("\r\n") + "\r\n";
}
