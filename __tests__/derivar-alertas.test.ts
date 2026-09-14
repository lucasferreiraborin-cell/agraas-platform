/**
 * Tests: derivarAlertas — os alertas estruturais que o gravador aplica a
 * toda nota. Achado F1 do raio-x de 14/09/2026: a regra antiga rejeitava
 * CFOP 5xxx/6xxx, ou seja, toda nota de compra real virava "erro".
 */

import { derivarAlertas, parseXml, CFOP_RE } from "@/lib/fiscal/nota-parse";

const XML_COMPRA = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe52260901234567000189550010000004561234567890">
<ide><nNF>456</nNF><serie>1</serie><dhEmi>2026-08-20T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>01234567000189</CNPJ><xNome>FORNECEDOR</xNome><enderEmit><UF>GO</UF></enderEmit></emit>
<dest><CPF>12345678901</CPF><xNome>PRODUTOR</xNome><enderDest><UF>GO</UF></enderDest></dest>
<det nItem="1"><prod><xProd>SAL MINERAL</xProd><NCM>23099090</NCM><CFOP>5102</CFOP><uCom>SC</uCom><qCom>50</qCom><vUnCom>95.00</vUnCom><vProd>4750.00</vProd></prod><imposto><ICMS><ICMS00><CST>00</CST><vBC>4750.00</vBC><pICMS>17.00</pICMS><vICMS>807.50</vICMS></ICMS00></ICMS></imposto></det>
<det nItem="2"><prod><xProd>VERMIFUGO</xProd><NCM>30049099</NCM><CFOP>6102</CFOP><uCom>FR</uCom><qCom>10</qCom><vUnCom>120.00</vUnCom><vProd>1200.00</vProd></prod><imposto><ICMS><ICMS40><CST>40</CST></ICMS40></ICMS></imposto></det>
<total><ICMSTot><vNF>5950.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

describe("CFOP_RE", () => {
  it("aceita entradas (1,2,3) e saídas (5,6,7) com 4 dígitos", () => {
    for (const ok of ["1102", "2102", "3102", "5102", "6108", "7101", "5933"]) expect(CFOP_RE.test(ok)).toBe(true);
  });
  it("rejeita 4xxx, 8xxx, 0xxx e tamanho errado", () => {
    for (const ruim of ["4102", "8102", "0102", "510", "51020", "abcd", ""]) expect(CFOP_RE.test(ruim)).toBe(false);
  });
});

describe("derivarAlertas", () => {
  it("nota de compra real (CFOP 5102 e 6102 do fornecedor) entra SEM alerta", () => {
    const nota = parseXml(XML_COMPRA);
    const alerts = derivarAlertas(nota, "n1", "c1");
    expect(alerts).toEqual([]);
  });

  it("CFOP inválido e NCM curto são críticos; descrição vazia é info", () => {
    const nota = parseXml(XML_COMPRA);
    nota.items[0] = { ...nota.items[0], cfop: "4102", ncm: "2309" };
    nota.items[1] = { ...nota.items[1], descricao: "" };
    const tipos = derivarAlertas(nota, "n1", "c1").map(a => [a.tipo, a.severidade]);
    expect(tipos).toEqual([["ncm_incorreto", "critico"], ["cfop_divergente", "critico"], ["item_incompleto", "info"]]);
  });

  it("CFOP vazio (PDF sem a coluna) não gera alerta", () => {
    const nota = parseXml(XML_COMPRA);
    nota.items = nota.items.map(it => ({ ...it, cfop: "" }));
    expect(derivarAlertas(nota, "n1", "c1")).toEqual([]);
  });

  it("valor divergente é aviso e menciona frete/desconto; nota sem itens não compara", () => {
    const nota = parseXml(XML_COMPRA);
    nota.header.valorTotal = 6000;
    const a = derivarAlertas(nota, "n1", "c1");
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ tipo: "valor_divergente", severidade: "aviso" });
    expect(a[0].descricao).toMatch(/frete/);
    nota.items = [];
    expect(derivarAlertas(nota, "n1", "c1")).toEqual([]);
  });

  it("iaFailed vira aviso de revisão manual com o motivo", () => {
    const nota = { ...parseXml(XML_COMPRA), iaFailed: true, iaMotivo: "confiança 0.40" };
    const a = derivarAlertas(nota, "n1", "c1");
    expect(a.map(x => x.tipo)).toEqual(["pdf_revisao_manual"]);
    expect(a[0].descricao).toMatch(/0\.40/);
  });
});
