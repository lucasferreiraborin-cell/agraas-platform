/**
 * Tests: lib/fiscal/nfe-parser.ts  (B0)
 *
 * O que está sendo protegido aqui não é o parsing feliz — é a colisão de nomes
 * de tag. O parser anterior usava `<vICMS[^>]*>`, que casa com `<vICMSST>`,
 * `<vICMSDeson>` e `<vICMSMonoRet>`. Numa nota de combustível (CST 61) isso faz
 * o B2 ler o campo errado, e numa nota com substituição tributária faz o B1
 * comparar ICMS próprio com ICMS-ST. Os dois erros são silenciosos.
 */

import {
  extractTag,
  extractBlock,
  parseDetItem,
  parseNfeItems,
  parseNfeHeader,
  toInvoiceItemRow,
  decodeXmlEntities,
} from "@/lib/fiscal/nfe-parser";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Insumo agropecuário com base reduzida — o caso central do Convênio 100/97. */
const DET_INSUMO = `
<det nItem="1">
  <prod>
    <cProd>FERT-01</cProd>
    <xProd>ADUBO NPK 20-05-20</xProd>
    <NCM>31052000</NCM>
    <CFOP>6101</CFOP>
    <uCom>TON</uCom>
    <qCom>10.0000</qCom>
    <vUnCom>3000.0000</vUnCom>
    <vProd>30000.00</vProd>
  </prod>
  <imposto>
    <ICMS>
      <ICMS20>
        <orig>0</orig>
        <CST>20</CST>
        <modBC>3</modBC>
        <pRedBC>60.00</pRedBC>
        <vBC>12000.00</vBC>
        <pICMS>12.00</pICMS>
        <vICMS>1440.00</vICMS>
        <vICMSDeson>2160.00</vICMSDeson>
        <motDesICMS>9</motDesICMS>
        <cBenef>GO000123</cBenef>
      </ICMS20>
    </ICMS>
    <IPI><IPITrib><vIPI>0.00</vIPI></IPITrib></IPI>
    <PIS><PISAliq><CST>01</CST><vPIS>495.00</vPIS></PISAliq></PIS>
  </imposto>
</det>`;

/** Diesel com ICMS monofásico retido — a base do B2. Não tem vICMS. */
const DET_DIESEL = `
<det nItem="2">
  <prod>
    <cProd>DIESEL-S10</cProd>
    <xProd>OLEO DIESEL S10</xProd>
    <NCM>27101921</NCM>
    <CFOP>1653</CFOP>
    <uCom>LT</uCom>
    <qCom>5000.0000</qCom>
    <vUnCom>6.2000</vUnCom>
    <vProd>31000.00</vProd>
  </prod>
  <imposto>
    <ICMS>
      <ICMS61>
        <orig>0</orig>
        <CST>61</CST>
        <qBCMonoRet>5000.0000</qBCMonoRet>
        <adRemICMSRet>1.1700</adRemICMSRet>
        <vICMSMonoRet>5850.00</vICMSMonoRet>
      </ICMS61>
    </ICMS>
    <PIS><PISNT><CST>04</CST></PISNT></PIS>
  </imposto>
</det>`;

/** Item com ICMS próprio E substituição — o caso que quebrava o parser antigo. */
const DET_COM_ST = `
<det nItem="3">
  <prod>
    <cProd>RACAO</cProd><xProd>RACAO BOVINOS</xProd>
    <NCM>23099090</NCM><CFOP>6403</CFOP><uCom>SC</uCom>
    <qCom>100.0000</qCom><vUnCom>80.0000</vUnCom><vProd>8000.00</vProd>
  </prod>
  <imposto>
    <ICMS>
      <ICMS10>
        <orig>0</orig><CST>10</CST>
        <vBC>8000.00</vBC><pICMS>7.00</pICMS><vICMS>560.00</vICMS>
        <vBCST>10400.00</vBCST><pICMSST>18.00</pICMSST><vICMSST>1312.00</vICMSST>
      </ICMS10>
    </ICMS>
  </imposto>
</det>`;

const NFE_COMPLETA = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc><NFe><infNFe Id="NFe52250912345678000199550010000012341000012345" versao="4.00">
  <ide><nNF>1234</nNF><serie>1</serie><dhEmi>2026-08-15T10:30:00-03:00</dhEmi></ide>
  <emit><CNPJ>12345678000199</CNPJ><xNome>AGRO INSUMOS LTDA</xNome><enderEmit><UF>SP</UF></enderEmit></emit>
  <dest><CNPJ>98765432000111</CNPJ><xNome>FAZENDA SAO JOSE</xNome><enderDest><UF>GO</UF></enderDest></dest>
  ${DET_INSUMO}
  ${DET_DIESEL}
  <total><ICMSTot><vBC>20000.00</vBC><vICMS>2000.00</vICMS><vNF>61000.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

// ── Fronteira de tag: o bug que o B0 corrige ────────────────────────────────

describe("extractTag — fronteira de nome", () => {
  it("não confunde vICMS com vICMSST", () => {
    const xml = "<vICMS>560.00</vICMS><vICMSST>1312.00</vICMSST>";
    expect(extractTag(xml, "vICMS")).toBe("560.00");
    expect(extractTag(xml, "vICMSST")).toBe("1312.00");
  });

  it("não confunde vICMS com vICMSMonoRet quando vICMS nem existe", () => {
    const xml = "<qBCMonoRet>5000</qBCMonoRet><vICMSMonoRet>5850.00</vICMSMonoRet>";
    expect(extractTag(xml, "vICMS")).toBe("");
    expect(extractTag(xml, "vICMSMonoRet")).toBe("5850.00");
  });

  it("não confunde pICMS com pICMSST nem pRedBC com vBC", () => {
    const xml = "<pRedBC>60.00</pRedBC><vBC>12000.00</vBC><pICMS>12.00</pICMS><pICMSST>18.00</pICMSST>";
    expect(extractTag(xml, "pICMS")).toBe("12.00");
    expect(extractTag(xml, "pICMSST")).toBe("18.00");
    expect(extractTag(xml, "vBC")).toBe("12000.00");
  });

  it("aceita tag com atributo", () => {
    expect(extractTag('<vProd unid="X">10.00</vProd>', "vProd")).toBe("10.00");
  });

  it("retorna string vazia quando a tag não existe", () => {
    expect(extractTag("<a>1</a>", "vICMS")).toBe("");
  });
});

describe("extractBlock — fronteira de nome", () => {
  it("não confunde det com detExport nem detPag", () => {
    const xml = "<det nItem=\"1\"><detExport><nDraw>1</nDraw></detExport></det><detPag><vPag>10</vPag></detPag>";
    const dets = extractBlock(xml, "det");
    expect(dets).toHaveLength(1);
    expect(dets[0]).toContain("detExport");
    expect(dets[0]).not.toContain("detPag");
  });

  it("não confunde ICMS com ICMSTot", () => {
    const blocos = extractBlock(NFE_COMPLETA, "ICMSTot");
    expect(blocos).toHaveLength(1);
    expect(blocos[0]).toContain("61000.00");
  });
});

// ── Item de insumo — o caso do Convênio 100/97 ──────────────────────────────

describe("parseDetItem — insumo com base reduzida", () => {
  const item = parseDetItem(DET_INSUMO, 1);

  it("extrai identificação do produto", () => {
    expect(item.ncm).toBe("31052000");
    expect(item.cfop).toBe("6101");
    expect(item.descricao).toBe("ADUBO NPK 20-05-20");
    expect(item.quantidade).toBe(10);
    expect(item.valorTotal).toBe(30000);
  });

  it("extrai os campos que o Convênio 100/97 altera", () => {
    expect(item.icmsReducaoBasePct).toBe(60);
    expect(item.icmsBase).toBe(12000);
    expect(item.icmsAliquota).toBe(12);
    expect(item.icmsValor).toBe(1440);
  });

  it("extrai desoneração e código de benefício", () => {
    expect(item.icmsDesonerado).toBe(2160);
    expect(item.icmsMotDesoneracao).toBe("9");
    expect(item.beneficioCodigo).toBe("GO000123");
  });

  it("lê o CST do grupo ICMS, não o do PIS", () => {
    // O PIS deste item tem CST 01. Ler do escopo errado traria "01".
    expect(item.cst).toBe("20");
  });

  it("não inventa campos de monofasia num item que não é combustível", () => {
    expect(item.icmsMonoValorRet).toBeNull();
    expect(item.icmsMonoQtdBcRet).toBeNull();
  });
});

// ── Diesel — a base do B2 ───────────────────────────────────────────────────

describe("parseDetItem — diesel monofásico (CST 61)", () => {
  const item = parseDetItem(DET_DIESEL, 2);

  it("extrai litros, ad rem e ICMS retido", () => {
    expect(item.cst).toBe("61");
    expect(item.icmsMonoQtdBcRet).toBe(5000);
    expect(item.icmsMonoAdRemRet).toBe(1.17);
    expect(item.icmsMonoValorRet).toBe(5850);
  });

  it("o crédito potencial é litros × ad rem e bate com o valor destacado", () => {
    const calculado = (item.icmsMonoQtdBcRet ?? 0) * (item.icmsMonoAdRemRet ?? 0);
    expect(calculado).toBeCloseTo(item.icmsMonoValorRet ?? 0, 2);
  });

  it("não preenche ICMS normal — a nota não tem vICMS", () => {
    expect(item.icmsValor).toBeNull();
    expect(item.icmsAliquota).toBeNull();
  });

  it("a ad rem bate com o Conv. ICMS 112/2025 para diesel em 2026", () => {
    expect(item.icmsMonoAdRemRet).toBe(1.17);
  });
});

// ── Substituição tributária — a colisão em contexto real ────────────────────

describe("parseDetItem — item com ICMS próprio e ST", () => {
  const item = parseDetItem(DET_COM_ST, 3);

  it("pega o ICMS próprio, nunca o ICMS-ST", () => {
    expect(item.icmsValor).toBe(560);
    expect(item.icmsAliquota).toBe(7);
    expect(item.icmsBase).toBe(8000);
  });
});

// ── Nota completa ───────────────────────────────────────────────────────────

describe("parseNfeItems e parseNfeHeader", () => {
  it("extrai os dois itens da nota", () => {
    const itens = parseNfeItems(NFE_COMPLETA);
    expect(itens).toHaveLength(2);
    expect(itens[0].ncm).toBe("31052000");
    expect(itens[1].ncm).toBe("27101921");
    expect(itens.map(i => i.sequencia)).toEqual([1, 2]);
  });

  it("extrai a chave de acesso do atributo Id", () => {
    const h = parseNfeHeader(NFE_COMPLETA);
    expect(h.chaveAcesso).toBe("52250912345678000199550010000012341000012345");
    expect(h.chaveAcesso).toHaveLength(44);
  });

  it("extrai as duas UFs — B1 precisa saber se é interna ou interestadual", () => {
    const h = parseNfeHeader(NFE_COMPLETA);
    expect(h.emitenteUf).toBe("SP");
    expect(h.destinatarioUf).toBe("GO");
    expect(h.emitenteUf === h.destinatarioUf).toBe(false);
  });

  it("extrai cabeçalho sem confundir emitente com destinatário", () => {
    const h = parseNfeHeader(NFE_COMPLETA);
    expect(h.emitenteCnpj).toBe("12345678000199");
    expect(h.emitenteNome).toBe("AGRO INSUMOS LTDA");
    expect(h.numeroNota).toBe("1234");
    expect(h.dataEmissao).toBe("2026-08-15");
    expect(h.valorTotal).toBe(61000);
  });

  it("sobrevive a XML vazio ou inválido sem lançar", () => {
    expect(parseNfeItems("")).toEqual([]);
    expect(parseNfeItems("<lixo/>")).toEqual([]);
    expect(() => parseNfeHeader("")).not.toThrow();
  });
});

// ── Mapeamento para o banco ─────────────────────────────────────────────────

describe("toInvoiceItemRow", () => {
  const row = toInvoiceItemRow(parseDetItem(DET_DIESEL, 2), "inv-1", "xml_reparse");

  it("mapeia para as colunas da migration 159", () => {
    expect(row.fiscal_invoice_id).toBe("inv-1");
    expect(row.cst).toBe("61");
    expect(row.icms_mono_qtd_bc_ret).toBe(5000);
    expect(row.icms_mono_ad_rem_ret).toBe(1.17);
    expect(row.icms_mono_valor_ret).toBe(5850);
    expect(row.fiscal_parse_source).toBe("xml_reparse");
    expect(row.fiscal_parsed_at).toBeTruthy();
  });

  it("converte string vazia em null — não polui o banco com ''", () => {
    const insumo = toInvoiceItemRow(parseDetItem(DET_DIESEL, 2), "inv-1", "live_parse");
    expect(insumo.icms_mot_desoneracao).toBeNull();
    expect(insumo.beneficio_codigo).toBeNull();
  });
});

// ── Achados da revisão adversarial de 05/09/2026 ────────────────────────────

describe("entidades XML (achado 7 da revisão)", () => {
  it("decodifica as entidades nomeadas", () => {
    expect(decodeXmlEntities("ADUBO A&amp;B")).toBe("ADUBO A&B");
    expect(decodeXmlEntities("&lt;tag&gt;")).toBe("<tag>");
    expect(decodeXmlEntities("&quot;aspas&quot;")).toBe('"aspas"');
    expect(decodeXmlEntities("d&apos;agua")).toBe("d'agua");
  });

  it("decodifica entidades numéricas, decimal e hexadecimal", () => {
    expect(decodeXmlEntities("&#65;&#66;")).toBe("AB");
    expect(decodeXmlEntities("&#x41;&#X42;")).toBe("AB");
  });

  it("resolve &amp; por último — &amp;lt; não vira <", () => {
    // Se `&amp;` fosse resolvido primeiro, `&amp;lt;` viraria `&lt;` e depois `<`,
    // corrompendo texto que o emitente escapou duas vezes de propósito.
    expect(decodeXmlEntities("&amp;lt;")).toBe("&lt;");
  });

  it("descrição do produto chega decodificada — é o que alimenta o hash do backfill", () => {
    const det = `<det nItem="1"><prod><cProd>X</cProd>
      <xProd>ADUBO A&amp;B PREMIUM</xProd><NCM>31052000</NCM><CFOP>1101</CFOP>
      <uCom>TON</uCom><qCom>1</qCom><vUnCom>10</vUnCom><vProd>10</vProd></prod></det>`;
    // O schema legado gravou "ADUBO A&B PREMIUM" já decodificado. Sem decodificar
    // aqui, o hash divergiria e o backfill trataria como item novo.
    expect(parseDetItem(det, 1).descricao).toBe("ADUBO A&B PREMIUM");
  });
});

describe("prefixo de namespace (achado 8 da revisão)", () => {
  const NFE_NS = `<?xml version="1.0"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <ns2:NFe><ns2:infNFe Id="NFe52250912345678000199550010000012341000012345" versao="4.00">
    <ns2:ide><ns2:nNF>777</ns2:nNF><ns2:serie>1</ns2:serie><ns2:dhEmi>2026-08-15T10:00:00-03:00</ns2:dhEmi></ns2:ide>
    <ns2:emit><ns2:CNPJ>12345678000199</ns2:CNPJ><ns2:xNome>AGRO LTDA</ns2:xNome>
      <ns2:enderEmit><ns2:UF>SP</ns2:UF></ns2:enderEmit></ns2:emit>
    <ns2:dest><ns2:enderDest><ns2:UF>GO</ns2:UF></ns2:enderDest></ns2:dest>
    <ns2:det nItem="1"><ns2:prod><ns2:xProd>ADUBO</ns2:xProd><ns2:NCM>31052000</ns2:NCM>
      <ns2:CFOP>6101</ns2:CFOP><ns2:uCom>TON</ns2:uCom><ns2:qCom>5</ns2:qCom>
      <ns2:vUnCom>100</ns2:vUnCom><ns2:vProd>500</ns2:vProd></ns2:prod>
      <ns2:imposto><ns2:ICMS><ns2:ICMS20><ns2:CST>20</ns2:CST><ns2:pRedBC>60.00</ns2:pRedBC>
        <ns2:vBC>200.00</ns2:vBC><ns2:pICMS>12.00</ns2:pICMS><ns2:vICMS>24.00</ns2:vICMS>
      </ns2:ICMS20></ns2:ICMS></ns2:imposto></ns2:det>
  </ns2:infNFe></ns2:NFe></nfeProc>`;

  it("nota com prefixo de namespace NÃO devolve vazio", () => {
    // Sem aceitar o prefixo, toda regex ancorada em `<tag` falhava e o parser
    // devolvia zero itens — em silêncio, para a nota inteira.
    const itens = parseNfeItems(NFE_NS);
    expect(itens).toHaveLength(1);
    expect(itens[0].ncm).toBe("31052000");
  });

  it("os campos de ICMS saem corretos mesmo com prefixo", () => {
    const it = parseNfeItems(NFE_NS)[0];
    expect(it.cst).toBe("20");
    expect(it.icmsReducaoBasePct).toBe(60);
    expect(it.icmsValor).toBe(24);
  });

  it("cabeçalho e chave de acesso também aceitam prefixo", () => {
    const h = parseNfeHeader(NFE_NS);
    expect(h.chaveAcesso).toHaveLength(44);
    expect(h.numeroNota).toBe("777");
    expect(h.emitenteUf).toBe("SP");
    expect(h.destinatarioUf).toBe("GO");
  });

  it("nota SEM prefixo continua funcionando — o prefixo é opcional", () => {
    expect(parseNfeItems(NFE_COMPLETA)).toHaveLength(2);
  });
});
