/**
 * Tests: lib/fiscal/documento.ts e lib/fiscal/nota-parse.ts — a parte pura
 * da ingestão (parse-doc para os formulários; parse-xml/PDF para o fiscal).
 */

import { documentoDeXml, documentoDeExtracao, documentoVazio } from "@/lib/fiscal/documento";
import { parseXml, tipoDoArquivo, mensagemUpload, notaDeExtracao, parsePdfTextoCru } from "@/lib/fiscal/nota-parse";
import { validarExtracao } from "@/lib/fiscal/pdf-extract";

/** NF-e de produção: nfeProc, namespace, detPag (o bug antigo virava item fantasma). */
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe52260901234567000189550010000004561234567890" versao="4.00">
<ide><nNF>456</nNF><serie>1</serie><dhEmi>2026-08-20T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>01234567000189</CNPJ><xNome>AGROPECUARIA GOIAS LTDA</xNome><enderEmit><UF>GO</UF></enderEmit></emit>
<dest><CPF>12345678901</CPF><xNome>FAZENDA SAO JOAO</xNome><enderDest><UF>GO</UF></enderDest></dest>
<det nItem="1"><prod><cProd>1</cProd><xProd>SAL MINERAL 30KG</xProd><NCM>23099090</NCM><CFOP>5102</CFOP><uCom>SC</uCom><qCom>50.0000</qCom><vUnCom>95.00</vUnCom><vProd>4750.00</vProd></prod>
<imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><vBC>4750.00</vBC><pICMS>17.00</pICMS><vICMS>807.50</vICMS></ICMS00></ICMS></imposto></det>
<det nItem="2"><prod><cProd>2</cProd><xProd>VERMIFUGO 1L</xProd><NCM>30049099</NCM><CFOP>5102</CFOP><uCom>FR</uCom><qCom>10.0000</qCom><vUnCom>120.00</vUnCom><vProd>1200.00</vProd></prod>
<imposto><ICMS><ICMS40><orig>0</orig><CST>40</CST></ICMS40></ICMS></imposto></det>
<total><ICMSTot><vNF>5950.00</vNF></ICMSTot></total>
<pag><detPag><tPag>01</tPag><vPag>5950.00</vPag></detPag></pag>
</infNFe></NFe></nfeProc>`;

describe("documentoDeXml (parse-doc)", () => {
  const d = documentoDeXml(XML);
  it("cabeçalho com emitente E destinatário", () => {
    expect(d.header).toEqual({
      numero_nota: "456",
      emitente_cnpj: "01234567000189",
      emitente_nome: "AGROPECUARIA GOIAS LTDA",
      data_emissao: "2026-08-20",
      valor_total: 5950,
      destinatario_nome: "FAZENDA SAO JOAO",
      destinatario_cnpj: "12345678901",
    });
    expect(d.extracao).toBe("xml");
  });
  it("<detPag> NÃO vira item — o parser antigo produzia um terceiro item vazio", () => {
    expect(d.items).toHaveLength(2);
    expect(d.items[0]).toEqual({ descricao: "SAL MINERAL 30KG", quantidade: 50, unidade: "SC", valor_unitario: 95, valor_total: 4750 });
  });
});

describe("documentoDeExtracao / documentoVazio", () => {
  const dados = validarExtracao(JSON.stringify({
    numero_nota: "77", emitente_cnpj: "01.234.567/0001-89", emitente_nome: "X", data_emissao: "2026-09-01", valor_total: 10,
    destinatario_nome: "Y", destinatario_cnpj: "12.345.678/0001-90",
    itens: [{ descricao: "A", quantidade: 1, unidade: "UN", valor_unitario: 10, valor_total: 10 }],
    confianca: 0.95,
  }))!;
  it("mapeia a resposta do Claude no shape do formulário", () => {
    const d = documentoDeExtracao(dados, "claude-sonnet-5");
    expect(d.header.destinatario_cnpj).toBe("12345678000190");
    expect(d.items[0].valor_total).toBe(10);
    expect(d.ia_failed).toBe(false);
    expect(d.extracao_modelo).toBe("claude-sonnet-5");
  });
  it("confiança baixa marca ia_failed mas mantém os dados", () => {
    const d = documentoDeExtracao({ ...dados, confianca: 0.4, observacoes: "borrado" }, "m");
    expect(d.ia_failed).toBe(true);
    expect(d.extracao_motivo).toMatch(/0.40.*borrado/);
    expect(d.header.numero_nota).toBe("77");
  });
  it("sem IA: formulário vazio, não verificado, com o motivo", () => {
    const d = documentoVazio("ANTHROPIC_API_KEY não configurada");
    expect(d.ia_failed).toBe(true);
    expect(d.extracao).toBe("fallback");
    expect(d.extracao_motivo).toMatch(/ANTHROPIC/);
    expect(d.items).toEqual([]);
  });
});

describe("nota-parse", () => {
  it("parseXml usa o nfe-parser e carrega destinatário e chave", () => {
    const n = parseXml(XML);
    expect(n.header.chaveAcesso).toBe("52260901234567000189550010000004561234567890");
    expect(n.header.destinatarioNome).toBe("FAZENDA SAO JOAO");
    expect(n.items).toHaveLength(2);
    expect(n.items[0].icmsAliq).toBe(17);
    expect(n.richItems[1].cst).toBe("40");
    expect(n.extracao.origem).toBe("xml");
  });

  it("tipoDoArquivo: assinatura vence extensão", () => {
    expect(tipoDoArquivo("nota.xml")).toBe("xml");
    expect(tipoDoArquivo("nota.PDF")).toBe("pdf");
    expect(tipoDoArquivo("nota.txt", Buffer.from("%PDF-1.4 x"))).toBe("pdf");
    expect(tipoDoArquivo("nota.csv", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toBe("xlsx");
    expect(tipoDoArquivo("nota.csv")).toBe("csv");
    expect(tipoDoArquivo("planilha.xlsx")).toBe("xlsx");
    expect(tipoDoArquivo("sem-extensao", Buffer.from("  <?xml version"))).toBe("xml");
    expect(tipoDoArquivo("foto.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
  });

  it("mensagemUpload cobre os quatro caminhos", () => {
    expect(mensagemUpload({ numero_nota: "1", total_items: 1, alerts_count: 0, extracao: "xml" })).toBe("NF-e 1 · 1 item · 0 alertas · XML");
    expect(mensagemUpload({ numero_nota: "2", total_items: 3, alerts_count: 1, extracao: "claude", extracao_modelo: "claude-sonnet-5" })).toBe("NF-e 2 · 3 itens · 1 alerta · lido por IA (claude-sonnet-5)");
    expect(mensagemUpload({ numero_nota: "", total_items: 0, alerts_count: 1, extracao: "fallback", extracao_motivo: "timeout" })).toBe("NF-e S/N · 0 itens · 1 alerta · IA indisponível: timeout — leitura básica");
    expect(mensagemUpload({ numero_nota: "3", total_items: 2, alerts_count: 0, extracao: "planilha" })).toBe("NF-e 3 · 2 itens · 0 alertas · planilha");
  });

  it("notaDeExtracao e parsePdfTextoCru mantêm o shape comum", () => {
    const dados = validarExtracao(JSON.stringify({ numero_nota: "9", emitente_cnpj: "01.234.567/0001-89", data_emissao: "2026-09-01", valor_total: 1, itens: [], confianca: 0.9 }))!;
    const n = notaDeExtracao(dados, Buffer.from("%PDF"), "m");
    expect(n.header.emitenteCnpj).toBe("01234567000189");
    expect(n.extracao).toEqual({ origem: "claude", modelo: "m" });
    expect(n.iaFailed).toBe(false);

    const cru = parsePdfTextoCru("", Buffer.from("%PDF"));
    expect(cru.iaFailed).toBe(true);
    expect(cru.header.numeroNota).toBe("PDF importado");
    expect(cru.extracao.origem).toBe("fallback");
  });
});
