/**
 * Tests: exports do Agraas Gestão — pacote do contador (.xlsx e CSV) e
 * "seus dados são seus" (.zip de CSVs). Cobre o que a revisão apontou: zero à
 * esquerda em CPF/CNPJ e códigos, \r solto no CSV, número/chave da nota, e
 * que os totais da planilha batem com a conta da tela de Fechamento.
 */

jest.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { csvTexto, resultadoPorCentro, resumoCaixa } from "@/lib/gestao/resultado";
import {
  chaveDeAcesso, csvCodigo, csvDado, csvDocumento, csvNumeroDado, dataHoraSP, documentoNota, formatarDocumento,
} from "@/lib/gestao/exportar-formatos";
import {
  ABAS, diaDaNota, montarPacoteCsv, montarPacoteXlsx, unificarNotas,
  type AbastecimentoExport, type CentroExport, type DadosPacote, type LinhaNotaAnterior, type LinhaNotaPrincipal,
  type NotaMes, type TituloExport,
} from "@/lib/gestao/pacote-contador";
import { montarMeusDados, type DadosMeusDados } from "@/lib/gestao/meus-dados";
import { colunaAusente, lerTodas } from "@/lib/gestao/exportar-leitura";
import { gerarXlsx, type Celula, type CelulaRica, type PlanilhaXlsx } from "@/lib/planilha/xlsx-writer";
import { gerarZip } from "@/lib/planilha/zip";
import { lerXlsx, lerZip } from "@/lib/planilha/xlsx";

// Chaves de acesso no formato da NF-e (44 posições), montadas por partes para não errar a conta.
const CHAVE1 = "52" + "2611" + "01963040006132" + "55" + "001" + "000018452" + "1" + "00018452" + "0";
const CHAVE2 = "52260201963040006132550020000151291355962127";
const PERIODO = { inicio: "2026-11-01", fim: "2026-11-30" };

/* ───────────────────────────── Formatos ───────────────────────────── */

describe("documentos e notas", () => {
  it("CPF e CNPJ com pontuação, inclusive zero à esquerda e CNPJ alfanumérico", () => {
    expect(CHAVE1).toHaveLength(44);
    expect(formatarDocumento("01234567890")).toBe("012.345.678-90");
    expect(formatarDocumento("01963040006132")).toBe("01.963.040/0061-32");
    expect(formatarDocumento("01.963.040/0061-32")).toBe("01.963.040/0061-32");
    expect(formatarDocumento("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatarDocumento("123")).toBe("123");
    expect(formatarDocumento(null)).toBe("");
  });

  it("chave de acesso: só o formato da NF-e passa", () => {
    expect(chaveDeAcesso(CHAVE1)).toBe(CHAVE1);
    expect(chaveDeAcesso(CHAVE1.replace(/(.{4})/g, "$1 "))).toBe(CHAVE1);
    expect(chaveDeAcesso("522611" + "12ABC34501DE35" + "550010000184521000184520")).not.toBeNull();
    expect(chaveDeAcesso("DEMO-GESTAO-NF03")).toBeNull();
    expect(chaveDeAcesso("f66d81204737492b8a1c3d5e7f90a1b2c3d4e5f6a7b8")).toBeNull();
    expect(chaveDeAcesso(null)).toBeNull();
  });

  it("documento da nota como o contador procura", () => {
    expect(documentoNota({ numero: "18452", serie: "1", modelo: "55" })).toBe("NF-e 18452 série 1");
    expect(documentoNota({ numero: "9", serie: null, modelo: 65 })).toBe("NFC-e 9");
    expect(documentoNota({ numero: "NFE-900009", serie: null, modelo: "55" })).toBe("NFE-900009");
    expect(documentoNota({ numero: "VENDA-BACKFILL-12", serie: null, modelo: null })).toBe("Venda registrada sem nota");
    expect(documentoNota(null)).toBe("");
  });

  it("dia da nota: hora vira dia de Brasília; meia-noite UTC é data sem hora", () => {
    expect(diaDaNota("2026-11-05T13:00:00+00:00")).toBe("2026-11-05");
    expect(diaDaNota("2026-12-01T01:30:00+00:00")).toBe("2026-11-30");
    expect(diaDaNota("2026-08-10T00:00:00+00:00")).toBe("2026-08-10");
    expect(diaDaNota("2026-08-10")).toBe("2026-08-10");
    expect(diaDaNota(null)).toBeNull();
    expect(dataHoraSP("2026-11-23T19:52:10.123+00:00")).toBe("2026-11-23 16:52:10");
  });
});

describe("CSV — zero à esquerda e \\r solto (P2 da revisão)", () => {
  it("csvTexto: CR solto, CRLF e LF viram espaço; controle sai", () => {
    expect(csvTexto("a\rb")).toBe("a b");
    expect(csvTexto("a\r\n\r\nb\nc")).toBe("a b c");
    expect(csvTexto("x\u0000y\u0007")).toBe("xy");
    expect(csvTexto("=1+1")).toBe("'=1+1");
  });
  it("csvCodigo protege código que o Excel estragaria", () => {
    expect(csvCodigo("001")).toBe('="001"');
    expect(csvCodigo("1/3")).toBe('="1/3"');
    expect(csvCodigo(CHAVE1)).toBe(`="${CHAVE1}"`);
    expect(csvCodigo("2026/27")).toBe('="2026/27"');
    expect(csvCodigo("ABC1D23")).toBe("ABC1D23");
    expect(csvCodigo("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCodigo('1"; drop')).toBe('"1""; drop"');
    expect(csvCodigo(null)).toBe("");
  });
  it("csvDocumento: CPF/CNPJ com pontuação; fora do padrão, protegido", () => {
    expect(csvDocumento("01963040006132")).toBe("01.963.040/0061-32");
    expect(csvDocumento("01234567890")).toBe("012.345.678-90");
    expect(csvDocumento("0123")).toBe('="0123"');
    expect(csvDocumento("")).toBe("");
  });
  it("csvDado (export completo): preserva quebra entre aspas, neutraliza fórmula", () => {
    expect(csvDado("linha 1\rlinha 2")).toBe('"linha 1\nlinha 2"');
    expect(csvDado('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvDado("Agro; Insumos")).toBe('"Agro; Insumos"');
    expect(csvDado("simples")).toBe("simples");
    expect(csvNumeroDado(1234.5)).toBe("1234,5");
    expect(csvNumeroDado("1234.5", 2)).toBe("1234,50");
    expect(csvNumeroDado(null)).toBe("");
  });
});

/* ───────────────────────────── Pacote do mês ───────────────────────────── */

const titulo = (o: Partial<TituloExport> & Pick<TituloExport, "id">): TituloExport => ({
  tipo: "pagar", descricao: "Lançamento", contraparte_nome: null, contraparte_doc: null, numero_parcela: null,
  valor: 100, vencimento: "2026-11-10", status: "aberto", data_baixa: null, valor_baixa: null, forma_pagamento: null,
  bank_account_id: null, centro_custo_id: null, fiscal_invoice_id: null, fiscal_note_id: null, origem: "manual",
  natureza: "custo", notas: null, ...o,
});
const centro = (o: Partial<CentroExport> & Pick<CentroExport, "id" | "nome" | "atividade">): CentroExport => ({
  tipo: "talhao", cultura: null, safra: null, area_ha: null, cabecas: null, ativo: true, ...o,
});
const abastecimento = (o: Partial<AbastecimentoExport> & Pick<AbastecimentoExport, "id" | "maquina_id" | "data">): AbastecimentoExport => ({
  litros: 10, preco_litro: null, medidor_leitura: null, operador: null, centro_custo_id: null, origem: "manual", notas: null, ...o,
});
const nota = (o: Partial<NotaMes> & Pick<NotaMes, "id">): NotaMes => ({
  tabela: "principal", data: "2026-11-05", direcao: "entrada", numero: null, serie: null, modelo: "55", emitente: null,
  emitenteDoc: null, destinatario: null, destinatarioDoc: null, valor: 0, icms: null, ipi: null, status: "reviewed",
  fonte: "xml_upload", chave: null, ...o,
});

const T1 = titulo({
  id: "t1", status: "pago", vencimento: "2026-11-05", data_baixa: "2026-11-05", valor: 1000, valor_baixa: "1000.00",
  contraparte_nome: "Agro Insumos Ltda", contraparte_doc: "01963040006132", numero_parcela: "001",
  fiscal_invoice_id: "inv1", bank_account_id: "b1", centro_custo_id: "c1", origem: "nfe", descricao: "NF-e 18452",
  forma_pagamento: "Boleto",
});
const T2 = titulo({
  id: "t2", tipo: "receber", status: "pago", vencimento: "2026-11-10", data_baixa: "2026-11-10", valor: "5000",
  contraparte_nome: "Frigorífico Boa Carne", contraparte_doc: "01234567890", centro_custo_id: "c2",
  descricao: "Venda de bezerros\r\nlote 3", forma_pagamento: "Pix",
});
const T3 = titulo({ id: "t3", vencimento: "2026-11-20", valor: 300, centro_custo_id: "c1", numero_parcela: "1/3" });
const T4 = titulo({ id: "t4", status: "cancelado", vencimento: "2026-11-12", valor: 999, centro_custo_id: "c1" });
const T5 = titulo({ id: "t5", status: "pago", natureza: "estoque", vencimento: "2026-11-03", data_baixa: "2026-11-03", valor: 2000, valor_baixa: 2000, descricao: "Diesel S10" });
const T6 = titulo({ id: "t6", status: "pago", vencimento: "2026-11-02", data_baixa: "2026-10-30", valor: 400, valor_baixa: 400 });
const T7 = titulo({ id: "t7", tipo: "receber", vencimento: "2026-10-15", valor: 800, centro_custo_id: "c2" });
const T8 = titulo({ id: "t8", status: "pago", vencimento: "2026-11-15", data_baixa: "2026-11-16", valor: 200, valor_baixa: 210, centro_custo_id: "c3" });

const DADOS: DadosPacote = {
  clientName: "Fazenda Teste",
  periodo: PERIODO,
  hoje: "2026-11-25",
  geradoEm: new Date("2026-11-25T13:32:00Z"),
  titulosMes: [T1, T2, T3, T4, T5, T6, T8],
  emAberto: [T3, T7],
  abastecimentos: [
    abastecimento({ id: "a1", maquina_id: "m1", data: "2026-11-04", litros: 100, preco_litro: "6.1234", centro_custo_id: "c1", medidor_leitura: 1520.5, operador: "João" }),
    abastecimento({ id: "a2", maquina_id: "m2", data: "2026-11-06", litros: 50 }),
    abastecimento({ id: "a3", maquina_id: "m1", data: "2026-10-28", litros: 999, preco_litro: 6 }),
  ],
  maquinas: [
    { id: "m1", nome: "Trator 7200", tipo: "trator", placa_ou_serie: "ABC1D23", medidor: "horimetro" },
    { id: "m2", nome: "Trator *", tipo: "caminhonete", placa_ou_serie: null, medidor: "odometro" },
  ],
  centros: [
    centro({ id: "c1", nome: "Soja 26/27", atividade: "graos", area_ha: 100 }),
    centro({ id: "c2", nome: "Engorda", atividade: "bovino_corte", tipo: "lote_animal", cabecas: 50 }),
    centro({ id: "c3", nome: "Antigo", atividade: "outra", tipo: "outro", ativo: false }),
  ],
  contas: [{ id: "b1", banco_nome: "Sicredi", agencia: "0101", conta: "12345-6", descricao: null }],
  notasRef: new Map([["inv1", { numero: "18452", serie: "1", modelo: "55", chave: CHAVE1 }]]),
  notasMes: [
    nota({ id: "n1", numero: "18452", serie: "1", emitente: "Agro Insumos Ltda", emitenteDoc: "01963040006132", destinatarioDoc: "12345678901", valor: 1000, icms: 120, chave: CHAVE1 }),
    nota({ id: "n2", data: "2026-11-10", direcao: "saida", numero: "77", valor: "5000", status: "pending_review", fonte: "manual", chave: "DEMO-GESTAO-NF03" }),
    nota({ id: "n3", data: "2026-11-12", numero: "88", valor: 700, status: "rejected" }),
    nota({ id: "n4", tabela: "anterior", data: "2026-11-20", direcao: null, numero: "15129", serie: "2", valor: 120, status: "pendente", fonte: null, chave: CHAVE2 }),
  ],
};

const rica = (c: Celula): CelulaRica => (typeof c === "object" && c !== null ? c : { v: c });
const valor = (c: Celula) => rica(c).v ?? null;
/** Linha da aba como objeto { título da coluna: célula }. */
function registro(p: PlanilhaXlsx, linha: Celula[]): Record<string, Celula> {
  return Object.fromEntries((p.colunas ?? []).map((c, i) => [c.titulo, linha[i] ?? null]));
}
/** Linha do Resumo cujo primeiro texto é `rotulo` (a partir de `depois`, se dado). */
function linhaResumo(p: PlanilhaXlsx, rotulo: string, depois?: string): Celula[] {
  const inicio = depois ? p.linhas.findIndex((l) => valor(l[0]) === depois) : 0;
  const l = p.linhas.slice(Math.max(0, inicio)).find((x) => valor(x[0]) === rotulo);
  if (!l) throw new Error(`linha "${rotulo}" não encontrada no Resumo`);
  return l;
}

describe("montarPacoteXlsx", () => {
  const abas = montarPacoteXlsx(DADOS);
  const [resumo, pagos, abertos, notas, diesel] = abas;

  it("cinco abas, Resumo primeiro", () => {
    expect(abas.map((a) => a.nome)).toEqual([ABAS.resumo, ABAS.titulos, ABAS.aberto, ABAS.notas, ABAS.diesel]);
  });

  it("títulos pagos e recebidos: só baixa no mês, em ordem de data, com o que o contador pede", () => {
    expect(pagos.linhas.map((l) => valor(l[0]))).toEqual(["2026-11-03", "2026-11-05", "2026-11-10", "2026-11-16"]);
    const t1 = registro(pagos, pagos.linhas[1]);
    expect(t1["CPF/CNPJ"]).toBe("01.963.040/0061-32");
    expect(t1["Documento"]).toBe("NF-e 18452 série 1");
    expect(t1["Parcela"]).toBe("001");
    expect(t1["Saída (R$)"]).toBe(1000);
    expect(t1["Entrada (R$)"]).toBeNull();
    expect(t1["Conta bancária"]).toBe("Sicredi · ag. 0101 · conta 12345-6");
    expect(t1["Chave de acesso"]).toBe(CHAVE1);
    expect(t1["Centro de custo"]).toBe("Soja 26/27");
    expect(t1["Atividade"]).toBe("Grãos");
    expect(t1["Natureza"]).toBe("Custo");
    expect(t1["Movimento"]).toBe("Pagamento");
    expect(t1["Origem"]).toBe("Nota fiscal");

    const t2 = registro(pagos, pagos.linhas[2]);
    expect(t2["Entrada (R$)"]).toBe(5000);
    expect(t2["Natureza"]).toBe("Receita");
    expect(t2["CPF/CNPJ"]).toBe("012.345.678-90");
    expect(t2["Descrição"]).toBe("Venda de bezerros lote 3");

    expect(registro(pagos, pagos.linhas[0])["Natureza"]).toBe("Compra para estoque");
    const t8 = registro(pagos, pagos.linhas[3]);
    expect(t8["Saída (R$)"]).toBe(210);
    expect(t8["Valor do título (R$)"]).toBe(200);
    expect(t8["Centro de custo"]).toBe("Antigo"); // centro desativado continua com nome
  });

  it("totais da aba de caixa são fórmulas e batem com o resumo de caixa da tela", () => {
    const caixa = resumoCaixa(DADOS.titulosMes, PERIODO);
    const [total, saldo] = pagos.rodape!;
    expect(rica(total[7])).toMatchObject({ f: "SUM(H2:H5)", v: caixa.entradas });
    expect(rica(total[8])).toMatchObject({ f: "SUM(I2:I5)", v: caixa.saidas });
    expect(rica(saldo[7])).toMatchObject({ f: "H7-I7", v: caixa.saldo });
    expect(caixa).toEqual({ entradas: 5000, saidas: 3210, saldo: 1790 });
  });

  it("em aberto: vencidos de antes e do mês, com dias de atraso e totais por tipo", () => {
    const linhas = abertos.linhas.map((l) => registro(abertos, l));
    expect(linhas.map((l) => l["Situação"])).toEqual(["Vencido há 41 dias", "Vencido há 5 dias"]);
    expect(linhas[0]["Tipo"]).toBe("A receber");
    expect(linhas[1]["Parcela"]).toBe("1/3");
    const [pagar, receber] = abertos.rodape!;
    expect(rica(pagar[8])).toMatchObject({ f: 'SUMIFS(I2:I3,B2:B3,"A pagar")', v: 300 });
    expect(rica(receber[8])).toMatchObject({ f: 'SUMIFS(I2:I3,B2:B3,"A receber")', v: 800 });
  });

  it("notas do mês: chave só quando é chave; rejeitada fora do total; fluxo anterior sem direção", () => {
    const l = notas.linhas.map((x) => registro(notas, x));
    expect(l[0]["CPF/CNPJ do emitente"]).toBe("01.963.040/0061-32");
    expect(l[0]["Chave de acesso"]).toBe(CHAVE1);
    expect(l[1]["Chave de acesso"]).toBeNull();
    expect(l[1]["Direção"]).toBe("Saída");
    expect(l[3]["Direção"]).toBe("Não informada");
    expect(l[3]["Entrou por"]).toBe("Registro anterior");
    expect(l[3]["Documento"]).toBe("NF-e 15129 série 2");
    const entradas = rica(notas.rodape![0][7]);
    expect(entradas.v).toBe(1000);
    expect(entradas.f).toContain('"<>Rejeitada"');
    expect(rica(notas.rodape![1][7]).v).toBe(5000);
  });

  it("diesel: só o mês, total por linha como fórmula, sem preço não vira custo", () => {
    expect(diesel.linhas).toHaveLength(2);
    const a1 = registro(diesel, diesel.linhas[0]);
    expect(rica(a1["Total (R$)"])).toMatchObject({ f: "ROUND(E2*F2,2)", v: 612.34 });
    expect(a1["Preço por litro (R$)"]).toBe(6.1234);
    expect(a1["Medidor"]).toBe("Horímetro (h)");
    expect(registro(diesel, diesel.linhas[1])["Total (R$)"]).toBeNull();
    const [total, aviso] = diesel.rodape!;
    expect(rica(total[4])).toMatchObject({ f: "SUM(E2:E3)", v: 150 });
    expect(rica(total[6])).toMatchObject({ f: "SUM(G2:G3)", v: 612.34 });
    expect(String(valor(aviso[0]))).toContain("sem preço");
  });

  it("resumo: caixa, em aberto e notas ligados às abas por fórmula", () => {
    expect(rica(linhaResumo(resumo, "Recebido")[1])).toMatchObject({ f: "SUM('Títulos pagos e recebidos'!H2:H5)", v: 5000 });
    expect(rica(linhaResumo(resumo, "Pago")[1]).v).toBe(3210);
    expect(rica(linhaResumo(resumo, "Saldo")[1]).v).toBe(1790);
    expect(rica(linhaResumo(resumo, "Baixas registradas")[1])).toMatchObject({ f: "COUNTA('Títulos pagos e recebidos'!A2:A5)", v: 4 });
    expect(rica(linhaResumo(resumo, "A pagar")[1])).toMatchObject({ f: "SUMIFS('Em aberto'!I2:I3,'Em aberto'!B2:B3,\"A pagar\")", v: 300 });
    expect(rica(linhaResumo(resumo, "A receber")[1]).v).toBe(800);
    const entradas = linhaResumo(resumo, "Entradas (compras)");
    expect([rica(entradas[1]).v, rica(entradas[2]).v]).toEqual([1, 1000]);
    const semDirecao = linhaResumo(resumo, "Sem direção informada");
    expect([rica(semDirecao[1]).v, rica(semDirecao[2]).v]).toEqual([1, 120]);
  });

  it("resumo: diesel por máquina com critério exato (nome com * não vira curinga)", () => {
    const coringa = linhaResumo(resumo, "Trator *");
    expect(rica(coringa[1]).f).toContain('"=Trator ~*"');
    expect(rica(coringa[1]).v).toBe(50);
    expect(rica(coringa[2]).v).toBe(0);
    expect(rica(linhaResumo(resumo, "Trator 7200")[2]).v).toBe(612.34);
    expect(rica(linhaResumo(resumo, "Total", "Diesel abastecido no mês")[1]).v).toBe(150);
  });

  it("resumo: resultado por centro é o mesmo da tela de Fechamento", () => {
    const tela = resultadoPorCentro(DADOS.centros.filter((c) => c.ativo), DADOS.titulosMes, DADOS.abastecimentos, PERIODO);
    const soja = linhaResumo(resumo, "Soja 26/27");
    expect(rica(soja[2]).v).toBe(tela.linhas.find((l) => l.centro.id === "c1")!.custo);
    expect(rica(soja[2]).v).toBe(1912.34);
    expect(rica(linhaResumo(resumo, "Engorda")[3]).v).toBe(5000);
    expect(rica(linhaResumo(resumo, "Sem centro de custo")[2]).v).toBe(tela.semCentro.custo);
    const total = linhaResumo(resumo, "Total", "Resultado por centro — contas pelo vencimento no mês, diesel pelo abastecimento");
    expect([rica(total[2]).v, rica(total[3]).v, rica(total[4]).v]).toEqual([tela.total.custo, tela.total.receita, tela.total.margem]);
    expect(rica(total[2]).f).toMatch(/^SUM\(C\d+:C\d+\)$/);
  });

  it("vira .xlsx válido; a aba de caixa volta pelo leitor com CPF/CNPJ, parcela e chave intactos", () => {
    const z = lerZip(gerarXlsx(abas));
    expect(z.get("xl/worksheets/sheet1.xml")!.toString("utf8"))
      .toContain(`<f>SUMIFS('Em aberto'!I2:I3,'Em aberto'!B2:B3,"A pagar")</f><v>300</v>`);
    const t = lerXlsx(gerarXlsx([pagos]));
    expect(t.cabecalho.slice(0, 6)).toEqual(["Data da baixa", "Movimento", "Contraparte", "CPF/CNPJ", "Documento", "Parcela"]);
    const l = t.linhas[1];
    expect(l[3]).toBe("01.963.040/0061-32");
    expect(l[5]).toBe("001");
    expect(l[t.cabecalho.indexOf("Chave de acesso")]).toBe(CHAVE1);
  });

  it("mês sem movimento ainda gera planilha (totais zerados, sem fórmula de faixa vazia)", () => {
    const vazio = montarPacoteXlsx({ ...DADOS, titulosMes: [], emAberto: [], abastecimentos: [], notasMes: [] });
    const total = rica(vazio[1].rodape![0][7]);
    expect(total.f).toBeUndefined();
    expect(total.v).toBe(0);
    expect(() => gerarXlsx(vazio)).not.toThrow();
  });
});

describe("montarPacoteCsv", () => {
  const csv = montarPacoteCsv(DADOS);
  const linhas = csv.replace(/^\u{FEFF}/u, "").split("\r\n");

  it("BOM, CRLF e nenhum CR solto", () => {
    expect(csv.startsWith("\u{FEFF}")).toBe(true);
    expect(csv.replace(/\r\n/g, "").includes("\r")).toBe(false);
  });
  it("traz documento, chave e conta; CPF/CNPJ e códigos sem perder zero", () => {
    const t1 = linhas.find((l) => l.includes("Agro Insumos Ltda"))!;
    expect(t1.split(";")).toHaveLength(18);
    expect(t1).toContain(";01.963.040/0061-32;NF-e 18452 série 1;=\"001\";");
    expect(t1).toContain(`="${CHAVE1}"`);
    expect(t1).toContain("Sicredi · ag. 0101 · conta 12345-6");
    expect(linhas.find((l) => l.includes("Frigorífico"))).toContain("Venda de bezerros lote 3;");
    expect(linhas.some((l) => l.includes('="1/3"'))).toBe(true);
    expect(linhas.some((l) => l.includes("Cancelado"))).toBe(true);
  });
  it("abastecimentos só do mês", () => {
    const i = linhas.indexOf("ABASTECIMENTOS DE DIESEL");
    const abast = linhas.slice(i + 2).filter(Boolean);
    expect(abast).toHaveLength(2);
    expect(abast[0]).toContain("612,34");
  });
});

describe("unificarNotas", () => {
  const p = (id: string, issued_at: string | null, access_key: string | null = null, created_at: string | null = null): LinhaNotaPrincipal => ({
    id, access_key, number: id, series: null, model: "55", direction: "entrada", issued_at, received_at: null, created_at,
    issuer_cnpj: null, issuer_name: null, recipient_cnpj: null, recipient_name: null, gross_value: 1, icms_value: null,
    ipi_value: null, status: "reviewed", source: "xml_upload",
  });
  const a = (id: string, data_emissao: string | null, chave_acesso: string | null = null, created_at: string | null = null): LinhaNotaAnterior => ({
    id, chave_acesso, numero_nota: id, serie: null, modelo_nf: null, emitente_cnpj: null, emitente_nome: null, data_emissao,
    created_at, valor_total: 1, status: "pendente",
  });

  it("corta pelo dia de Brasília e não duplica entre as tabelas", () => {
    const r = unificarNotas(
      [
        p("p1", "2026-11-05T13:00:00+00:00"),
        p("p2", "2026-12-01T01:30:00+00:00"),            // 22h30 de 30/11 em Brasília
        p("p3", "2026-11-01T00:00:00+00:00", CHAVE1),    // data sem hora (migrada)
        p("p4", "2026-11-01T02:00:00+00:00"),            // 23h de 31/10 em Brasília
        p("p5", null, null, "2026-11-10T12:00:00+00:00"),
        p("p1", "2026-11-05T13:00:00+00:00"),            // repetida
      ],
      [a("p1", "2026-11-05"), a("f2", "2026-11-06", CHAVE1), a("f3", "2026-11-20"), a("f4", null, null, "2026-11-21T15:00:00+00:00"), a("f5", "2026-10-31")],
      PERIODO,
    );
    expect(r.map((n) => n.id)).toEqual(["p1", "p2", "p3", "p5", "f3", "f4"]);
    expect(r.find((n) => n.id === "p2")!.data).toBe("2026-11-30");
    expect(r.find((n) => n.id === "f3")!.tabela).toBe("anterior");
  });
});

/* ───────────────────────────── Leitura paginada ───────────────────────────── */

describe("lerTodas", () => {
  const banco = Array.from({ length: 2345 }, (_, i) => ({ i }));
  /** Servidor que limita a 600 linhas por chamada, como um max-rows abaixo do pedido. */
  const pagina = (de: number, ate: number, contar: boolean) =>
    Promise.resolve({ data: banco.slice(de, Math.min(ate + 1, de + 600)), error: null, count: contar ? banco.length : null });

  it("lê tudo mesmo quando o servidor devolve menos que o pedido", async () => {
    const r = await lerTodas<{ i: number }>(pagina);
    expect(r.linhas).toHaveLength(2345);
    expect(r.linhas[2344].i).toBe(2344);
    expect(r.truncado).toBe(false);
  });
  it("respeita o limite e avisa que truncou", async () => {
    const r = await lerTodas<{ i: number }>(pagina, { limite: 1000 });
    expect(r.truncado).toBe(true);
    expect(r.linhas.length).toBeGreaterThanOrEqual(1000);
  });
  it("tabela ausente é diferente de coluna ausente", async () => {
    const semTabela = await lerTodas(() => Promise.resolve({ data: null, error: { code: "42P01", message: 'relation "maquinas" does not exist' } }));
    expect(semTabela.ausente).toBe(true);
    const semColuna = { code: "42703", message: "column fiscal_invoices.cbs_value does not exist" };
    const r = await lerTodas(() => Promise.resolve({ data: null, error: semColuna }));
    expect(r.ausente).toBe(false);
    expect(colunaAusente(semColuna)).toBe(true);
  });
});

/* ───────────────────────────── Seus dados ───────────────────────────── */

describe("montarMeusDados", () => {
  const criado = "2026-11-23T19:52:10.123+00:00";
  const d: DadosMeusDados = {
    clientName: "Fazenda Teste",
    geradoEm: new Date("2026-11-25T13:32:00Z"),
    centros: { ausente: false, linhas: [{ id: "c1", client_id: "cli", nome: "Soja 26/27", tipo: "talhao", atividade: "graos", cultura: "Soja", safra: "2026/27", area_ha: 100, cabecas: null, property_id: null, crop_field_id: null, ativo: true, created_at: criado, campo_novo: "0123" }] },
    titulos: { ausente: false, linhas: [{ id: "t1", client_id: "cli", tipo: "pagar", descricao: '=HYPERLINK("x")', contraparte_nome: "Agro; Insumos", contraparte_doc: "01963040006132", numero_parcela: "001", valor: 1000, vencimento: "2026-11-05", status: "pago", data_baixa: "2026-11-05", valor_baixa: 1000, forma_pagamento: "Pix", bank_account_id: "b1", centro_custo_id: "c1", conta_contabil_id: null, fiscal_invoice_id: "n1", fiscal_note_id: null, origem: "nfe", natureza: "custo", notas: "linha 1\rlinha 2", created_at: criado, updated_at: criado }] },
    contas: { ausente: false, linhas: [{ id: "b1", client_id: "cli", banco_codigo: "001", banco_nome: "Banco do Brasil", agencia: "0101", conta: "12345-6", tipo: "corrente", descricao: null, ativo: true, created_at: criado }] },
    maquinas: { ausente: true, linhas: [] },
    abastecimentos: { ausente: false, linhas: [{ id: "a1", client_id: "cli", maquina_id: "m1", data: "2026-11-04", litros: 100, preco_litro: 6.1234, medidor_leitura: 1520.5, operador: "João", centro_custo_id: "c1", origem: "manual", fiscal_invoice_id: null, notas: null, created_at: criado }] },
    notas: { ausente: false, linhas: [{ id: "n1", access_key: CHAVE1, number: "18452", series: "1", model: "55", direction: "entrada", issued_at: "2026-11-05T13:00:00+00:00", issuer_cnpj: "01963040006132", issuer_name: "Agro Insumos", gross_value: 1000, status: "reviewed", source: "xml_upload", needs_human_review: false, created_at: criado, updated_at: criado }] },
    notasItens: { ausente: false, linhas: [{ id: "i1", fiscal_invoice_id: "n1", sequence: 1, product_code: "000123", description: "Óleo diesel S10", ncm: "27101921", cfop: "1653", cst: "060", quantity: 500, unit: "L", unit_price: 6.1234, total_price: 3061.7, linked_stock_batch_id: null, linked_animal_id: null, linked_application_id: null, created_at: criado, icms_mono_valor: 12.5, fiscal_invoices: { client_id: "cli" } }] },
    notasAnteriores: { ausente: false, linhas: [
      { id: "f1", chave_acesso: CHAVE1, numero_nota: "18452", serie: "1", emitente_cnpj: "01963040006132", emitente_nome: "Agro Insumos", data_emissao: "2026-11-05", valor_total: 1000, status: "validada", created_at: criado },
      { id: "f2", chave_acesso: CHAVE2, numero_nota: "15129", serie: "2", emitente_cnpj: "01963040006132", emitente_nome: "Casa do Campo", data_emissao: "2026-02-23", valor_total: 120, status: "pendente", created_at: criado },
    ] },
    notasAnterioresItens: { ausente: false, linhas: [{ id: "fi1", note_id: "f2", client_id: "cli", descricao: "Sal mineral", ncm: "25010090", cfop: "1102", quantidade: 10, unidade: "SC", valor_unitario: 12, valor_total: 120, icms_aliquota: null, icms_valor: null, ipi_valor: null }] },
    xmls: [
      { id: "n1", tabela: "principal", chave: CHAVE1, numero: "18452", xml: '<?xml version="1.0" encoding="ISO-8859-1"?><nfeProc><NFe/></nfeProc>' },
      { id: "f1", tabela: "anterior", chave: CHAVE1, numero: "18452", xml: "<nfeProc/>" },
      { id: "f2", tabela: "anterior", chave: CHAVE2, numero: "15129", xml: "<NFe/>" },
      { id: "x9", tabela: "principal", chave: "DEMO", numero: "7720", xml: "não é xml" },
    ],
    xmlsIncompletos: false,
  };
  const arquivos = montarMeusDados(d);
  const conteudo = (nome: string) => String(arquivos.find((a) => a.nome === nome)!.conteudo);
  const linhasDe = (nome: string) => conteudo(nome).replace(/^\u{FEFF}/u, "").split("\r\n");

  it("LEIAME primeiro, um CSV por tabela presente e os XML sem repetir", () => {
    expect(arquivos.map((a) => a.nome)).toEqual([
      "LEIAME.txt", "centros_de_custo.csv", "contas_a_pagar_e_receber.csv", "contas_bancarias.csv", "abastecimentos.csv",
      "notas_fiscais.csv", "notas_fiscais_itens.csv", "notas_fluxo_anterior.csv", "notas_fluxo_anterior_itens.csv",
      `xml/${CHAVE1}.xml`, `xml/${CHAVE2}.xml`,
    ]);
    expect(conteudo(`xml/${CHAVE1}.xml`)).toBe('<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe/></nfeProc>');
  });

  it("LEIAME conta as linhas, diz o que não entrou e descreve cada coluna", () => {
    const l = conteudo("LEIAME.txt");
    expect(l.startsWith("\u{FEFF}")).toBe(true);
    expect(l).toContain("Fazenda: Fazenda Teste");
    expect(l).toContain("Gerado em: 25/11/2026 às 10:32");
    expect(l).toContain("- centros_de_custo.csv: 1 linha");
    expect(l).toContain("- notas_fluxo_anterior.csv: 2 linhas");
    expect(l).toContain("- xml/: 2 arquivos");
    expect(l).toContain("- maquinas.csv: módulo ainda em ativação");
    expect(l).toContain("  - contraparte_doc: CPF ou CNPJ da contraparte.");
    expect(l).toContain("  - campo_novo: Coluna adicional");
    expect(l.replace(/\r\n/g, "").includes("\r")).toBe(false);
  });

  it("centros: códigos protegidos, coluna nova no fim, client_id fora", () => {
    const [cab, l1] = linhasDe("centros_de_custo.csv");
    expect(conteudo("centros_de_custo.csv").startsWith("\u{FEFF}")).toBe(true);
    expect(cab).toBe("id;nome;tipo;tipo_nome;atividade;atividade_nome;cultura;safra;area_ha;cabecas;imovel_id;talhao_id;ativo;criado_em;campo_novo");
    expect(l1).toBe('c1;Soja 26/27;talhao;Talhão;graos;Grãos;Soja;="2026/27";100,00;;;;sim;2026-11-23 16:52:10;="0123"');
  });

  it("contas a pagar e receber: CPF/CNPJ, parcela, fórmula neutralizada, quebra preservada entre aspas", () => {
    const csv = conteudo("contas_a_pagar_e_receber.csv");
    expect(csv).toContain(';01.963.040/0061-32;="001";1000,00;2026-11-05;pago;2026-11-05;1000,00;Pix;b1;Banco do Brasil · ag. 0101 · conta 12345-6;c1;Soja 26/27;');
    expect(csv).toContain('"\'=HYPERLINK(""x"")";"Agro; Insumos"');
    expect(csv).toContain('"linha 1\nlinha 2"');
    expect(csv.replace(/\r\n/g, "").includes("\r")).toBe(false);
  });

  it("bancos, abastecimentos e itens: zeros e códigos intactos, colunas de conveniência", () => {
    expect(linhasDe("contas_bancarias.csv")[1]).toContain(';="001";Banco do Brasil;="0101";="12345-6";corrente;');
    const abast = linhasDe("abastecimentos.csv");
    expect(abast[0].split(";").slice(0, 7)).toEqual(["id", "data", "maquina_id", "maquina_nome", "litros", "preco_litro", "valor_total"]);
    expect(abast[1]).toContain(";100,00;6,1234;612,34;1520,5;");
    const itens = linhasDe("notas_fiscais_itens.csv");
    expect(itens[0].endsWith(";icms_mono_valor")).toBe(true);
    expect(itens[0]).not.toContain("fiscal_invoices");
    expect(itens[1]).toContain(';="000123";Óleo diesel S10;="27101921";="1653";="060";500;L;6,1234;3061,7;');
  });

  it("notas: chave protegida, hora de Brasília, XML apontado; fluxo anterior marcado quando repete", () => {
    const n = linhasDe("notas_fiscais.csv");
    expect(n[1]).toContain(`n1;="${CHAVE1}";="18452";="1";="55";entrada;2026-11-05 10:00:00;`);
    expect(n[1].endsWith(`;xml/${CHAVE1}.xml`)).toBe(true);
    const ant = linhasDe("notas_fluxo_anterior.csv");
    expect(ant[0].split(";").slice(-2)).toEqual(["tambem_em_notas_fiscais", "xml_arquivo"]);
    const f1 = ant.find((l) => l.startsWith("f1;"))!;
    const f2 = ant.find((l) => l.startsWith("f2;"))!;
    expect(f1.endsWith(`;sim;xml/${CHAVE1}.xml`)).toBe(true);
    expect(f2.endsWith(`;não;xml/${CHAVE2}.xml`)).toBe(true);
    expect(f2).toContain(";01.963.040/0061-32;Casa do Campo;2026-02-23;120,00;");
  });

  it("vira .zip que volta inteiro", () => {
    const z = lerZip(gerarZip(arquivos, d.geradoEm));
    expect([...z.keys()]).toEqual(arquivos.map((a) => a.nome));
    for (const a of arquivos) expect(z.get(a.nome)!.toString("utf8")).toBe(a.conteudo);
  });

  it("XML além do limite: o LEIAME avisa", () => {
    const l = String(montarMeusDados({ ...d, xmlsIncompletos: true })[0].conteudo);
    expect(l).toContain("só parte dos XML");
  });
});
