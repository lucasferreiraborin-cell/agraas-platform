/**
 * Parser de NF-e — módulo PURO, sem I/O.
 *
 * Extraído de `app/api/fiscal/parse-xml/route.ts` em 05/09/2026 (B0) para ser
 * fonte única entre o upload ao vivo e o backfill de reprocessamento. Duplicar
 * essa lógica criaria duas verdades sobre o mesmo XML — exatamente o problema
 * que a migration 139 tentou resolver no banco.
 *
 * Escopo: leitura. Este módulo NÃO emite, assina nem transmite NF-e.
 *
 * Referências de layout: Manual de Orientação do Contribuinte NF-e (grupo N,
 * ICMS) e NT 2023.001 (monofasia de combustíveis, LC 192/2022).
 */

// ---------------------------------------------------------------------------
// Extração de tags
// ---------------------------------------------------------------------------

/**
 * Extrai o conteúdo de uma tag.
 *
 * O nome da tag precisa terminar em `>` ou em espaço — sem isso, `vICMS`
 * casaria com `<vICMSST>`, `<vICMSDeson>` e `<vICMSMonoRet>`, e a alíquota
 * de um item viria do campo errado. Esse era um bug real do parser anterior:
 * a monofasia (`vICMSMonoRet`) e a substituição (`vICMSST`) colidiam com
 * `vICMS` na mesma nota.
 */
export function extractTag(xml: string, tag: string): string {
  const m = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

/**
 * Extrai blocos completos de uma tag (abertura + conteúdo + fechamento).
 *
 * Mesma proteção de fronteira do `extractTag`: sem ela, `det` casaria com
 * `<detExport>` e `<detPag>`, que são tags legítimas da NF-e.
 */
export function extractBlock(xml: string, tag: string): string[] {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`,
    "gi",
  );
  return xml.match(re) ?? [];
}

/** Converte texto de tag em número, tolerando vazio e vírgula decimal. */
function num(raw: string): number | null {
  if (!raw) return null;
  const v = parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

/** Primeira tag não-vazia da lista. Usado onde o layout varia por UF. */
function firstTag(xml: string, tags: string[]): string {
  for (const t of tags) {
    const v = extractTag(xml, t);
    if (v) return v;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type NfeItemFiscal = {
  // Identificação do produto
  sequencia:     number | null;
  codigoProduto: string;
  descricao:     string;
  ncm:           string;
  cfop:          string;
  unidade:       string;
  quantidade:    number | null;
  valorUnitario: number | null;
  valorTotal:    number | null;

  // ICMS — CST/CSOSN e grupo normal
  cst:                string;
  icmsBase:           number | null;
  icmsReducaoBasePct: number | null;
  icmsAliquota:       number | null;
  icmsValor:          number | null;
  icmsDesonerado:     number | null;
  icmsMotDesoneracao: string;
  beneficioCodigo:    string;

  // ICMS monofásico de combustíveis (CST 61 e correlatos)
  icmsMonoQtdBc:     number | null;
  icmsMonoAdRem:     number | null;
  icmsMonoValor:     number | null;
  icmsMonoQtdBcRet:  number | null;
  icmsMonoAdRemRet:  number | null;
  icmsMonoValorRet:  number | null;

  // Outros tributos
  ipiValor: number | null;
};

// ---------------------------------------------------------------------------
// Parsing de item
// ---------------------------------------------------------------------------

/**
 * Extrai os campos fiscais de um bloco `<det>`.
 *
 * O CST é lido de dentro do grupo `<ICMS>`, nunca do `<det>` inteiro: PIS e
 * COFINS também têm `<CST>`, e ler do escopo errado traria o CST do PIS como
 * se fosse o do ICMS.
 */
export function parseDetItem(det: string, sequencia: number): NfeItemFiscal {
  const prod = extractBlock(det, "prod")[0] ?? det;
  // Grupo ICMS dentro de <imposto>. A fronteira estrita do extractBlock evita
  // casar com <ICMSTot> (que vive no total, não no item) e <ICMSUFDest>.
  const icms = extractBlock(det, "ICMS")[0] ?? "";

  return {
    sequencia,
    codigoProduto: extractTag(prod, "cProd"),
    descricao:     extractTag(prod, "xProd"),
    ncm:           extractTag(prod, "NCM"),
    cfop:          extractTag(prod, "CFOP"),
    unidade:       extractTag(prod, "uCom"),
    quantidade:    num(extractTag(prod, "qCom")),
    valorUnitario: num(extractTag(prod, "vUnCom")),
    valorTotal:    num(extractTag(prod, "vProd")),

    // CSOSN aparece no lugar do CST quando o emitente é do Simples Nacional.
    cst:                firstTag(icms, ["CST", "CSOSN"]),
    icmsBase:           num(extractTag(icms, "vBC")),
    icmsReducaoBasePct: num(extractTag(icms, "pRedBC")),
    icmsAliquota:       num(extractTag(icms, "pICMS")),
    icmsValor:          num(extractTag(icms, "vICMS")),
    icmsDesonerado:     num(extractTag(icms, "vICMSDeson")),
    icmsMotDesoneracao: extractTag(icms, "motDesICMS"),
    // cBenef aparece ora no grupo ICMS, ora em <prod>, conforme a UF.
    beneficioCodigo:    firstTag(det, ["cBenef"]),

    icmsMonoQtdBc:    num(extractTag(icms, "qBCMono")),
    icmsMonoAdRem:    num(extractTag(icms, "adRemICMS")),
    icmsMonoValor:    num(extractTag(icms, "vICMSMono")),
    icmsMonoQtdBcRet: num(extractTag(icms, "qBCMonoRet")),
    icmsMonoAdRemRet: num(extractTag(icms, "adRemICMSRet")),
    icmsMonoValorRet: num(extractTag(icms, "vICMSMonoRet")),

    ipiValor: num(extractTag(det, "vIPI")),
  };
}

/** Extrai todos os itens de uma NF-e. */
export function parseNfeItems(xml: string): NfeItemFiscal[] {
  return extractBlock(xml, "det").map((det, i) => parseDetItem(det, i + 1));
}

// ---------------------------------------------------------------------------
// Cabeçalho
// ---------------------------------------------------------------------------

export type NfeHeader = {
  chaveAcesso:  string;
  numeroNota:   string;
  serie:        string;
  emitenteCnpj: string;
  emitenteNome: string;
  emitenteUf:   string;
  destinatarioUf: string;
  dataEmissao:  string;
  valorTotal:   number | null;
};

/**
 * Extrai o cabeçalho.
 *
 * As UFs importam para B1: o Convênio 100/97 isenta a operação INTERNA e
 * apenas reduz a base na INTERESTADUAL. Sem saber as duas pontas não dá para
 * dizer qual regra se aplica.
 */
export function parseNfeHeader(xml: string): NfeHeader {
  const emit = extractBlock(xml, "emit")[0] ?? "";
  const dest = extractBlock(xml, "dest")[0] ?? "";
  const ide  = extractBlock(xml, "ide")[0]  ?? xml;

  // A chave vive no atributo Id de <infNFe Id="NFe3512...">.
  const chave = xml.match(/<infNFe[^>]*\bId="(?:NFe)?(\d{44})"/i)?.[1] ?? "";

  return {
    chaveAcesso:    chave,
    numeroNota:     extractTag(ide, "nNF"),
    serie:          extractTag(ide, "serie"),
    emitenteCnpj:   firstTag(emit, ["CNPJ", "CPF"]),
    emitenteNome:   firstTag(emit, ["xNome", "xFant"]),
    emitenteUf:     extractTag(emit, "UF"),
    destinatarioUf: extractTag(dest, "UF"),
    dataEmissao:    firstTag(ide, ["dhEmi", "dEmi"]).slice(0, 10),
    valorTotal:     num(firstTag(xml, ["vNF"])),
  };
}

/**
 * Mapeia um item parseado para as colunas de `fiscal_invoice_items`
 * (migration 159). Mantido aqui para que o upload ao vivo e o backfill
 * gravem exatamente o mesmo shape.
 */
export function toInvoiceItemRow(
  item: NfeItemFiscal,
  fiscalInvoiceId: string,
  parseSource: "xml_reparse" | "legacy_items" | "live_parse",
) {
  return {
    fiscal_invoice_id: fiscalInvoiceId,
    sequence:      item.sequencia,
    product_code:  item.codigoProduto || null,
    ncm:           item.ncm || null,
    cfop:          item.cfop || null,
    cst:           item.cst || null,
    description:   item.descricao || null,
    quantity:      item.quantidade,
    unit:          item.unidade || null,
    unit_price:    item.valorUnitario,
    total_price:   item.valorTotal,

    icms_base:             item.icmsBase,
    icms_reducao_base_pct: item.icmsReducaoBasePct,
    icms_aliquota:         item.icmsAliquota,
    icms_valor:            item.icmsValor,
    icms_desonerado:       item.icmsDesonerado,
    icms_mot_desoneracao:  item.icmsMotDesoneracao || null,
    beneficio_codigo:      item.beneficioCodigo || null,

    icms_mono_qtd_bc:     item.icmsMonoQtdBc,
    icms_mono_ad_rem:     item.icmsMonoAdRem,
    icms_mono_valor:      item.icmsMonoValor,
    icms_mono_qtd_bc_ret: item.icmsMonoQtdBcRet,
    icms_mono_ad_rem_ret: item.icmsMonoAdRemRet,
    icms_mono_valor_ret:  item.icmsMonoValorRet,

    ipi_valor:           item.ipiValor,
    fiscal_parsed_at:    new Date().toISOString(),
    fiscal_parse_source: parseSource,
  };
}
