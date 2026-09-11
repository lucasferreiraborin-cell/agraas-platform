/**
 * Regressão: o parser sobrevive a um XML com a ESTRUTURA REAL de produção.
 *
 * Origem: 11/09/2026 — upload das NF-e da fazenda dos Malulis parou de
 * funcionar depois do B0. As fixtures anteriores eram fragmentos limpos; este
 * arquivo reproduz o que a SEFAZ devolve de verdade: envelope `nfeProc`,
 * `xmlns` no `<NFe>`, `<Signature>` com `<Reference URI="#NFe...">`,
 * `<protNFe>` com `<chNFe>`, `<detPag>` dentro de `<pag>`, dois itens com
 * grupos ICMS diferentes (ICMS00 e ICMS40), PIS/COFINS com `<CST>` próprio.
 *
 * Se qualquer coisa aqui quebrar, o upload em produção quebra junto.
 */

import { parseNfeHeader, parseNfeItems } from "@/lib/fiscal/nfe-parser";

const XML_PRODUCAO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe Id="NFe52260901234567000189550010000004561234567890" versao="4.00">
<ide><cUF>52</cUF><cNF>23456789</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>55</mod><serie>1</serie><nNF>456</nNF><dhEmi>2026-08-20T09:15:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>5212303</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>1</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>4.0</verProc></ide>
<emit><CNPJ>01234567000189</CNPJ><xNome>AGROPECUARIA GOIAS LTDA</xNome><xFant>AGRO GOIAS</xFant><enderEmit><xLgr>ROD GO 070</xLgr><nro>KM 12</nro><xBairro>ZONA RURAL</xBairro><cMun>5212303</cMun><xMun>JUSSARA</xMun><UF>GO</UF><CEP>76270000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>105678901</IE><CRT>3</CRT></emit>
<dest><CPF>12345678901</CPF><xNome>FAZENDA SAO JOSE</xNome><enderDest><xLgr>FAZ SAO JOSE</xLgr><nro>SN</nro><xBairro>ZONA RURAL</xBairro><cMun>5212303</cMun><xMun>JUSSARA</xMun><UF>GO</UF><CEP>76270000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderDest><indIEDest>9</indIEDest></dest>
<det nItem="1"><prod><cProd>0001</cProd><cEAN>SEM GTIN</cEAN><xProd>SAL MINERAL BOVINOS 30KG</xProd><NCM>23099090</NCM><CFOP>5102</CFOP><uCom>SC</uCom><qCom>50.0000</qCom><vUnCom>95.0000000000</vUnCom><vProd>4750.00</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>SC</uTrib><qTrib>50.0000</qTrib><vUnTrib>95.0000000000</vUnTrib><indTot>1</indTot></prod><imposto><vTotTrib>722.00</vTotTrib><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>4750.00</vBC><pICMS>17.00</pICMS><vICMS>807.50</vICMS></ICMS00></ICMS><PIS><PISNT><CST>06</CST></PISNT></PIS><COFINS><COFINSNT><CST>06</CST></COFINSNT></COFINS></imposto></det>
<det nItem="2"><prod><cProd>0002</cProd><cEAN>SEM GTIN</cEAN><xProd>VERMIFUGO 1L</xProd><NCM>30049099</NCM><CFOP>5102</CFOP><uCom>FR</uCom><qCom>10.0000</qCom><vUnCom>120.0000000000</vUnCom><vProd>1200.00</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>FR</uTrib><qTrib>10.0000</qTrib><vUnTrib>120.0000000000</vUnTrib><indTot>1</indTot></prod><imposto><ICMS><ICMS40><orig>0</orig><CST>40</CST><vICMSDeson>204.00</vICMSDeson><motDesICMS>9</motDesICMS></ICMS40></ICMS><PIS><PISNT><CST>06</CST></PISNT></PIS><COFINS><COFINSNT><CST>06</CST></COFINSNT></COFINS></imposto></det>
<total><ICMSTot><vBC>4750.00</vBC><vICMS>807.50</vICMS><vICMSDeson>204.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vProd>5950.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>5950.00</vNF></ICMSTot></total>
<transp><modFrete>9</modFrete></transp>
<pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>5950.00</vPag></detPag></pag>
</infNFe>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#NFe52260901234567000189550010000004561234567890"><DigestValue>abc=</DigestValue></Reference></SignedInfo><SignatureValue>xyz=</SignatureValue></Signature>
</NFe>
<protNFe versao="4.00"><infProt><tpAmb>1</tpAmb><verAplic>GO_2026</verAplic><chNFe>52260901234567000189550010000004561234567890</chNFe><dhRecbto>2026-08-20T09:15:30-03:00</dhRecbto><nProt>352260000000001</nProt><digVal>abc=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>
</nfeProc>`;

describe("parser contra XML com estrutura real de produção", () => {
  const h = parseNfeHeader(XML_PRODUCAO);
  const itens = parseNfeItems(XML_PRODUCAO);

  it("acha os dois itens — nem mais (detPag não é det), nem menos", () => {
    expect(itens).toHaveLength(2);
  });

  it("cabeçalho: número, série, data, chave, total", () => {
    expect(h.numeroNota).toBe("456");
    expect(h.serie).toBe("1");
    expect(h.dataEmissao).toBe("2026-08-20");
    expect(h.chaveAcesso).toBe("52260901234567000189550010000004561234567890");
    expect(h.valorTotal).toBe(5950);
  });

  it("emitente vem do <emit>, não do <dest> nem da Signature", () => {
    expect(h.emitenteCnpj).toBe("01234567000189");
    expect(h.emitenteNome).toBe("AGROPECUARIA GOIAS LTDA");
    expect(h.emitenteUf).toBe("GO");
    expect(h.destinatarioUf).toBe("GO");
  });

  it("item 1 — ICMS00 tributado integralmente", () => {
    const i = itens[0];
    expect(i.ncm).toBe("23099090");
    expect(i.cfop).toBe("5102");
    expect(i.descricao).toBe("SAL MINERAL BOVINOS 30KG");
    expect(i.quantidade).toBe(50);
    expect(i.valorTotal).toBe(4750);
    expect(i.cst).toBe("00");         // do ICMS, não o "06" do PIS
    expect(i.icmsBase).toBe(4750);
    expect(i.icmsAliquota).toBe(17);
    expect(i.icmsValor).toBe(807.5);
    expect(i.icmsDesonerado).toBeNull();
  });

  it("item 2 — ICMS40 isento com desoneração", () => {
    const i = itens[1];
    expect(i.ncm).toBe("30049099");
    expect(i.cst).toBe("40");
    expect(i.icmsValor).toBeNull();   // ICMS40 não tem vICMS
    expect(i.icmsDesonerado).toBe(204);
    expect(i.icmsMotDesoneracao).toBe("9");
  });

  it("o vICMS do total (ICMSTot) não vaza para nenhum item", () => {
    // Se extractBlock(det,"ICMS") pegasse <ICMSTot>, o item 2 ganharia 807.50.
    expect(itens[1].icmsValor).not.toBe(807.5);
  });
});
