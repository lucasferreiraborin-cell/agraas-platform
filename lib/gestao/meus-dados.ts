/**
 * "Seus dados são seus" — monta o ZIP com tudo o que a conta registrou no
 * Agraas Gestão: um CSV por tabela (UTF-8 com BOM, ";" e vírgula decimal, o
 * que o Excel em português abre direto), o XML de cada nota como chegou e um
 * LEIAME.txt com o significado de cada coluna. Puro (sem I/O): a leitura do
 * banco está em exportar-leitura.ts.
 *
 * Coluna nova no banco não some do export: o que vier na linha e não estiver
 * descrito aqui entra no fim do CSV com o nome do banco ("coluna adicional").
 * O LEIAME é gerado das mesmas definições que montam os CSV — não descasa.
 */

import type { ArquivoZip } from "@/lib/planilha/zip";
import { CENTRO_TIPO_NOME, atividade, type CentroTipo } from "./atividades";
import { toNum } from "./resultado";
import {
  chaveDeAcesso, contaBancariaRotulo, csvCodigo, csvDado, csvDocumento, csvNumeroDado, csvSimNao, dataHoraSP, momentoBR,
  rotulo, TIPO_MAQUINA, type ContaBancariaRef,
} from "./exportar-formatos";

export type TabelaLida = { linhas: Record<string, unknown>[]; ausente: boolean };
export type XmlGuardado = { id: string; tabela: "principal" | "anterior"; chave: string | null; numero: string | null; xml: string };

export type DadosMeusDados = {
  clientName: string;
  geradoEm: Date;
  centros: TabelaLida;
  titulos: TabelaLida;
  contas: TabelaLida;
  maquinas: TabelaLida;
  abastecimentos: TabelaLida;
  notas: TabelaLida;
  notasItens: TabelaLida;
  notasAnteriores: TabelaLida;
  notasAnterioresItens: TabelaLida;
  xmls: XmlGuardado[];
  /** true quando passou do limite de XML por exportação. */
  xmlsIncompletos: boolean;
};

type Linha = Record<string, unknown>;
type Coluna = { nome: string; desc: string; campo?: string; valor: (r: Linha) => string };
type Def = {
  arquivo: string;
  titulo: string;
  tabela: keyof Pick<DadosMeusDados, "centros" | "titulos" | "contas" | "maquinas" | "abastecimentos" | "notas" | "notasItens" | "notasAnteriores" | "notasAnterioresItens">;
  colunas: Coluna[];
  ordem: (a: Linha, b: Linha) => number;
};

/** Nunca vão para o CSV: o próprio client_id, o objeto do join e conteúdo pesado (XML vira arquivo à parte). */
const OCULTOS = new Set(["client_id", "fiscal_invoices", "raw_xml", "xml_content", "ai_extraction", "reviewer_user_id", "raw_pdf_url"]);

const texto = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const ISO_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/* Construtores de coluna: (campo no banco, descrição, nome no CSV se diferente). */
const col = {
  txt: (campo: string, desc: string, nome = campo): Coluna => ({ nome, desc, campo, valor: (r) => csvDado(texto(r[campo])) }),
  cod: (campo: string, desc: string, nome = campo): Coluna => ({ nome, desc, campo, valor: (r) => csvCodigo(texto(r[campo])) }),
  doc: (campo: string, desc: string, nome = campo): Coluna => ({ nome, desc, campo, valor: (r) => csvDocumento(texto(r[campo])) }),
  num: (campo: string, desc: string, casas?: number, nome = campo): Coluna => ({
    nome, desc, campo, valor: (r) => csvNumeroDado(r[campo] as number | string | null | undefined, casas),
  }),
  dia: (campo: string, desc: string, nome = campo): Coluna => ({
    nome, desc, campo, valor: (r) => { const v = texto(r[campo]); return ISO_DIA.test(v) ? v : csvDado(v); },
  }),
  hora: (campo: string, desc: string, nome = campo): Coluna => ({ nome, desc, campo, valor: (r) => csvDado(dataHoraSP(texto(r[campo]) || null)) }),
  sn: (campo: string, desc: string, nome = campo): Coluna => ({ nome, desc, campo, valor: (r) => csvSimNao(r[campo]) }),
  calc: (nome: string, desc: string, valor: (r: Linha) => string): Coluna => ({ nome, desc, valor }),
};

/** Coluna que existe no banco mas não está descrita aqui (ex.: criada por migration nova). */
function colunaAdicional(campo: string): Coluna {
  return {
    nome: campo,
    desc: "Coluna adicional (nome como está no banco).",
    campo,
    valor: (r) => {
      const v = r[campo];
      if (typeof v === "boolean") return csvSimNao(v);
      if (typeof v === "number") return csvNumeroDado(v);
      const s = texto(v);
      if (ISO_HORA.test(s) && !ISO_DIA.test(s)) return csvDado(dataHoraSP(s));
      // Código só de dígitos com zero na frente (ou longo demais para número) não pode virar número no Excel.
      if (/^0\d+$/.test(s) || /^\d{16,}$/.test(s)) return csvCodigo(s);
      return csvDado(s);
    },
  };
}

const porTexto = (campo: string) => (a: Linha, b: Linha) => texto(a[campo]).localeCompare(texto(b[campo]), "pt-BR");
const porCampos = (...campos: string[]) => (a: Linha, b: Linha) => {
  for (const c of campos) {
    const x = texto(a[c]);
    const y = texto(b[c]);
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

/** Monta as definições com os mapas de nomes (centro, conta, máquina, XML) para as colunas de conveniência. */
function definicoes(d: DadosMeusDados, caminhoXml: Map<string, string>): Def[] {
  const nomeCentro = new Map(d.centros.linhas.map((r) => [texto(r.id), texto(r.nome)]));
  const nomeMaquina = new Map(d.maquinas.linhas.map((r) => [texto(r.id), texto(r.nome)]));
  const nomeConta = new Map(d.contas.linhas.map((r) => [texto(r.id), contaBancariaRotulo(r as unknown as ContaBancariaRef)]));
  const idsPrincipais = new Set(d.notas.linhas.map((r) => texto(r.id)));
  const chavesPrincipais = new Set(d.notas.linhas.map((r) => texto(r.access_key).trim()).filter(Boolean));
  const doMapa = (mapa: Map<string, string>, campo: string) => (r: Linha) => csvDado(mapa.get(texto(r[campo])) ?? "");
  const xmlDe = (r: Linha) => csvDado(caminhoXml.get(texto(r.id)) ?? "");

  const criado = col.hora("created_at", "Quando o registro foi criado (horário de Brasília).", "criado_em");
  const atualizado = col.hora("updated_at", "Última alteração do registro (horário de Brasília).", "atualizado_em");

  return [
    {
      arquivo: "centros_de_custo.csv",
      titulo: "Centros de custo: onde o custo acontece (lote de animais, talhão, galpão, máquina, administrativo).",
      tabela: "centros",
      ordem: porTexto("nome"),
      colunas: [
        col.txt("id", "Identificador do centro."),
        col.txt("nome", "Nome do centro."),
        col.txt("tipo", "Tipo (código): lote_animal, talhao, galpao, maquina, benfeitoria, administrativo, outro."),
        col.calc("tipo_nome", "Tipo por extenso.", (r) => csvDado(CENTRO_TIPO_NOME[texto(r.tipo) as CentroTipo] ?? texto(r.tipo))),
        col.txt("atividade", "Atividade (código): bovino_corte, bovino_leite, ovinos, caprinos, suinos, aves, graos, cafe, cana, hortifruti, fruticultura, florestal, geral, outra."),
        col.calc("atividade_nome", "Atividade por extenso.", (r) => csvDado(r.atividade ? atividade(texto(r.atividade)).nome : "")),
        col.txt("cultura", "Cultura, raça ou categoria."),
        col.cod("safra", "Safra (ex.: 2026/27)."),
        col.num("area_ha", "Área em hectares.", 2),
        col.num("cabecas", "Número de cabeças.", 0),
        col.txt("property_id", "Imóvel rural ligado ao centro (id).", "imovel_id"),
        col.txt("crop_field_id", "Talhão cadastrado na plataforma (id).", "talhao_id"),
        col.sn("ativo", "Centro em uso."),
        criado,
      ],
    },
    {
      arquivo: "contas_a_pagar_e_receber.csv",
      titulo: "Contas a pagar e a receber (títulos), uma linha por parcela, com vencimento e baixa.",
      tabela: "titulos",
      ordem: porCampos("vencimento", "descricao"),
      colunas: [
        col.txt("id", "Identificador do título."),
        col.txt("tipo", "pagar ou receber."),
        col.txt("descricao", "Descrição do lançamento."),
        col.txt("contraparte_nome", "Fornecedor ou cliente."),
        col.doc("contraparte_doc", "CPF ou CNPJ da contraparte."),
        col.cod("numero_parcela", "Parcela (ex.: 001, 1/3)."),
        col.num("valor", "Valor do título (R$).", 2),
        col.dia("vencimento", "Data de vencimento."),
        col.txt("status", "aberto, pago ou cancelado."),
        col.dia("data_baixa", "Data do pagamento ou recebimento."),
        col.num("valor_baixa", "Valor pago ou recebido (R$).", 2),
        col.txt("forma_pagamento", "Pix, boleto, transferência, dinheiro, cartão..."),
        col.txt("bank_account_id", "Conta bancária da baixa (id em contas_bancarias.csv).", "conta_bancaria_id"),
        col.calc("conta_bancaria", "Conta bancária por extenso.", doMapa(nomeConta, "bank_account_id")),
        col.txt("centro_custo_id", "Centro de custo (id em centros_de_custo.csv)."),
        col.calc("centro_custo_nome", "Nome do centro de custo.", doMapa(nomeCentro, "centro_custo_id")),
        col.txt("conta_contabil_id", "Conta do plano de contas (id), quando classificada."),
        col.txt("fiscal_invoice_id", "Nota de origem (id em notas_fiscais.csv).", "nota_fiscal_id"),
        col.txt("fiscal_note_id", "Nota de origem no fluxo anterior (id em notas_fluxo_anterior.csv).", "nota_fluxo_anterior_id"),
        col.txt("origem", "manual, nfe (parcela da nota) ou planilha."),
        col.txt("natureza", "custo, estoque (compra que vira estoque, como diesel), investimento ou financeiro."),
        col.txt("notas", "Observações.", "observacoes"),
        criado,
        atualizado,
      ],
    },
    {
      arquivo: "contas_bancarias.csv",
      titulo: "Contas bancárias da fazenda.",
      tabela: "contas",
      ordem: porTexto("banco_nome"),
      colunas: [
        col.txt("id", "Identificador da conta."),
        col.cod("banco_codigo", "Código do banco (ex.: 001)."),
        col.txt("banco_nome", "Nome do banco."),
        col.cod("agencia", "Agência."),
        col.cod("conta", "Número da conta."),
        col.txt("tipo", "corrente, poupanca ou rural."),
        col.txt("descricao", "Apelido da conta."),
        col.sn("ativo", "Conta em uso."),
        criado,
      ],
    },
    {
      arquivo: "maquinas.csv",
      titulo: "Máquinas e veículos.",
      tabela: "maquinas",
      ordem: porTexto("nome"),
      colunas: [
        col.txt("id", "Identificador da máquina."),
        col.txt("nome", "Nome da máquina."),
        col.txt("tipo", "Tipo (código): trator, caminhonete, caminhao, colheitadeira, pulverizador, moto, outro."),
        col.calc("tipo_nome", "Tipo por extenso.", (r) => csvDado(rotulo(TIPO_MAQUINA, texto(r.tipo)))),
        col.cod("placa_ou_serie", "Placa ou número de série."),
        col.txt("medidor", "horimetro (horas) ou odometro (km)."),
        col.sn("ativo", "Máquina em uso."),
        criado,
      ],
    },
    {
      arquivo: "abastecimentos.csv",
      titulo: "Abastecimentos de diesel por máquina.",
      tabela: "abastecimentos",
      ordem: porCampos("data", "maquina_id"),
      colunas: [
        col.txt("id", "Identificador do abastecimento."),
        col.dia("data", "Data do abastecimento."),
        col.txt("maquina_id", "Máquina (id em maquinas.csv)."),
        col.calc("maquina_nome", "Nome da máquina.", doMapa(nomeMaquina, "maquina_id")),
        col.num("litros", "Litros abastecidos.", 2),
        col.num("preco_litro", "Preço por litro (R$).", 4),
        col.calc("valor_total", "Litros × preço por litro (R$); vazio sem preço.", (r) =>
          r.preco_litro === null || r.preco_litro === undefined || r.preco_litro === ""
            ? ""
            : csvNumeroDado(Math.round(toNum(r.litros) * toNum(r.preco_litro) * 100) / 100, 2)),
        col.num("medidor_leitura", "Leitura do horímetro ou odômetro.", 1),
        col.txt("operador", "Quem abasteceu ou operou."),
        col.txt("centro_custo_id", "Centro de custo (id em centros_de_custo.csv)."),
        col.calc("centro_custo_nome", "Nome do centro de custo.", doMapa(nomeCentro, "centro_custo_id")),
        col.txt("origem", "manual, planilha ou tag (tag de abastecimento)."),
        col.txt("fiscal_invoice_id", "Nota de compra do diesel (id em notas_fiscais.csv).", "nota_fiscal_id"),
        col.txt("notas", "Observações.", "observacoes"),
        criado,
      ],
    },
    {
      arquivo: "notas_fiscais.csv",
      titulo: "Notas fiscais (NF-e e NFP-e) de compra e de venda.",
      tabela: "notas",
      ordem: porCampos("issued_at", "number"),
      colunas: [
        col.txt("id", "Identificador da nota."),
        col.cod("access_key", "Chave de acesso de 44 dígitos (registros manuais podem ter um identificador interno).", "chave_acesso"),
        col.cod("number", "Número da nota.", "numero"),
        col.cod("series", "Série.", "serie"),
        col.cod("model", "Modelo (55 = NF-e).", "modelo"),
        col.txt("direction", "entrada (compra) ou saida (venda).", "direcao"),
        col.hora("issued_at", "Data e hora de emissão (horário de Brasília).", "emitida_em"),
        col.hora("received_at", "Quando a nota entrou na plataforma.", "recebida_em"),
        col.doc("issuer_cnpj", "CNPJ ou CPF do emitente.", "emitente_cnpj"),
        col.txt("issuer_name", "Emitente.", "emitente_nome"),
        col.txt("issuer_state", "UF do emitente.", "emitente_uf"),
        col.doc("recipient_cnpj", "CNPJ ou CPF do destinatário.", "destinatario_cnpj"),
        col.txt("recipient_name", "Destinatário.", "destinatario_nome"),
        col.num("gross_value", "Valor total da nota (R$).", undefined, "valor_total"),
        col.num("net_value", "Valor líquido (R$).", undefined, "valor_liquido"),
        col.num("total_taxes", "Total de tributos (R$).", undefined, "total_tributos"),
        col.num("icms_value", "ICMS destacado (R$).", undefined, "icms"),
        col.num("ipi_value", "IPI destacado (R$).", undefined, "ipi"),
        col.num("pis_value", "PIS (R$).", undefined, "pis"),
        col.num("cofins_value", "COFINS (R$).", undefined, "cofins"),
        col.num("funrural_value", "FUNRURAL registrado pela plataforma, quando houver (estimativa: confirme com o contador).", undefined, "funrural"),
        col.num("cbs_value", "CBS destacada (R$).", undefined, "cbs"),
        col.num("ibs_value", "IBS destacado (R$).", undefined, "ibs"),
        col.num("cbs_credito_presumido", "Crédito presumido de CBS (R$)."),
        col.num("ibs_credito_presumido", "Crédito presumido de IBS (R$)."),
        col.num("valor_liquido_fiscal", "Valor líquido fiscal (R$)."),
        col.txt("status", "pending_review (a conferir), reviewed (conferida), rejected (rejeitada) ou archived (arquivada).", "situacao"),
        col.txt("source", "Como entrou: xml_upload, pdf_upload, audio_dictation, csv_import, sefaz_api, manual, legacy_migration.", "fonte"),
        col.num("ai_confidence", "Confiança da leitura automática (0 a 1), quando houve.", undefined, "confianca_leitura"),
        col.sn("needs_human_review", "Pede conferência humana.", "precisa_conferencia"),
        col.hora("reviewed_at", "Quando foi conferida.", "conferida_em"),
        col.txt("review_notes", "Observações da conferência.", "observacoes_conferencia"),
        col.txt("property_id", "Imóvel rural (id).", "imovel_id"),
        criado,
        atualizado,
        col.calc("xml_arquivo", "Arquivo do XML dentro deste ZIP, quando a nota tem XML guardado.", xmlDe),
      ],
    },
    {
      arquivo: "notas_fiscais_itens.csv",
      titulo: "Itens das notas fiscais.",
      tabela: "notasItens",
      ordem: porCampos("fiscal_invoice_id", "sequence"),
      colunas: [
        col.txt("id", "Identificador do item."),
        col.txt("fiscal_invoice_id", "Nota (id em notas_fiscais.csv).", "nota_fiscal_id"),
        col.num("sequence", "Número do item na nota.", 0, "sequencia"),
        col.cod("product_code", "Código do produto no emitente.", "codigo_produto"),
        col.txt("description", "Descrição do produto.", "descricao"),
        col.cod("ncm", "NCM."),
        col.cod("cfop", "CFOP."),
        col.cod("cst", "CST/CSOSN."),
        col.num("quantity", "Quantidade.", undefined, "quantidade"),
        col.txt("unit", "Unidade.", "unidade"),
        col.num("unit_price", "Valor unitário (R$).", undefined, "valor_unitario"),
        col.num("total_price", "Valor total do item (R$).", undefined, "valor_total"),
        col.txt("linked_stock_batch_id", "Lote de estoque criado pelo item (id).", "lote_estoque_id"),
        col.txt("linked_animal_id", "Animal ligado ao item (id).", "animal_id"),
        col.txt("linked_application_id", "Aplicação sanitária ligada ao item (id).", "aplicacao_id"),
        criado,
      ],
    },
    {
      arquivo: "notas_fluxo_anterior.csv",
      titulo: "Notas registradas pelo fluxo anterior de importação. As que também estão em notas_fiscais.csv vêm marcadas.",
      tabela: "notasAnteriores",
      ordem: porCampos("data_emissao", "numero_nota"),
      colunas: [
        col.txt("id", "Identificador da nota."),
        col.cod("chave_acesso", "Chave de acesso de 44 dígitos."),
        col.cod("numero_nota", "Número da nota.", "numero"),
        col.cod("serie", "Série."),
        col.cod("modelo_nf", "Modelo (55 = NF-e).", "modelo"),
        col.doc("emitente_cnpj", "CNPJ ou CPF do emitente."),
        col.txt("emitente_nome", "Emitente."),
        col.dia("data_emissao", "Data de emissão."),
        col.num("valor_total", "Valor total (R$).", 2),
        col.txt("status", "pendente (a conferir), validada (conferida) ou erro.", "situacao"),
        col.txt("supplier_id", "Fornecedor cadastrado (id).", "fornecedor_id"),
        col.sn("auto_stock_entry", "Itens lançados no estoque automaticamente.", "entrada_automatica_estoque"),
        col.num("cbs_value", "CBS destacada (R$).", undefined, "cbs"),
        col.num("ibs_value", "IBS destacado (R$).", undefined, "ibs"),
        criado,
        col.calc("tambem_em_notas_fiscais", "sim quando a mesma nota (id ou chave) também está em notas_fiscais.csv.", (r) =>
          csvSimNao(idsPrincipais.has(texto(r.id)) || (!!texto(r.chave_acesso).trim() && chavesPrincipais.has(texto(r.chave_acesso).trim())))),
        col.calc("xml_arquivo", "Arquivo do XML dentro deste ZIP, quando a nota tem XML guardado.", xmlDe),
      ],
    },
    {
      arquivo: "notas_fluxo_anterior_itens.csv",
      titulo: "Itens das notas do fluxo anterior.",
      tabela: "notasAnterioresItens",
      ordem: porCampos("note_id", "id"),
      colunas: [
        col.txt("id", "Identificador do item."),
        col.txt("note_id", "Nota (id em notas_fluxo_anterior.csv).", "nota_id"),
        col.txt("descricao", "Descrição do produto."),
        col.cod("ncm", "NCM."),
        col.cod("cfop", "CFOP."),
        col.num("quantidade", "Quantidade."),
        col.txt("unidade", "Unidade."),
        col.num("valor_unitario", "Valor unitário (R$)."),
        col.num("valor_total", "Valor total do item (R$).", 2),
        col.num("icms_aliquota", "Alíquota de ICMS (%)."),
        col.num("icms_valor", "ICMS (R$).", 2),
        col.num("ipi_valor", "IPI (R$).", 2),
      ],
    },
  ];
}

/** Colunas descritas + adicionais presentes nas linhas, na ordem: descritas primeiro, adicionais em ordem alfabética. */
function colunasFinais(def: Def, linhas: Linha[]): Coluna[] {
  const conhecidos = new Set(def.colunas.map((c) => c.campo).filter((c): c is string => !!c));
  const extras = new Set<string>();
  for (const r of linhas) for (const k of Object.keys(r)) if (!conhecidos.has(k) && !OCULTOS.has(k)) extras.add(k);
  return [...def.colunas, ...[...extras].sort().map(colunaAdicional)];
}

function csv(colunas: Coluna[], linhas: Linha[]): string {
  const corpo = [colunas.map((c) => c.nome).join(";"), ...linhas.map((r) => colunas.map((c) => c.valor(r)).join(";"))];
  return "\u{FEFF}" + corpo.join("\r\n") + "\r\n";
}

/** Declaração de encoding diferente de UTF-8 vira UTF-8: o arquivo é gravado em UTF-8. */
function xmlEmUtf8(xml: string): string {
  return xml.replace(/^(\u{FEFF}?\s*<\?xml[^>]*?encoding\s*=\s*["'])([^"']+)(["'])/iu, (m, a: string, enc: string, b: string) =>
    /^utf-?8$/i.test(enc) ? m : `${a}UTF-8${b}`);
}

/** Caminho de cada XML no ZIP (por id da nota): xml/<chave>.xml ou xml/nota-<número>-<id>.xml. */
function caminhosXml(xmls: XmlGuardado[]): { caminhos: Map<string, string>; arquivos: ArquivoZip[] } {
  const caminhos = new Map<string, string>();
  const arquivos: ArquivoZip[] = [];
  const usados = new Set<string>();
  const porChave = new Map<string, string>();
  // Principal primeiro: a nota do fluxo anterior com a mesma chave aponta para o
  // mesmo arquivo em vez de repeti-lo.
  const ordem = [...xmls].sort((a, b) => (a.tabela === b.tabela ? 0 : a.tabela === "principal" ? -1 : 1));
  for (const x of ordem) {
    // Mesmo id nas duas tabelas = mesma nota migrada: fica o XML da principal.
    if (caminhos.has(x.id) || !x.xml || !x.xml.replace(/^\u{FEFF}/u, "").trimStart().startsWith("<")) continue;
    const chave = chaveDeAcesso(x.chave);
    const existente = chave ? porChave.get(chave) : undefined;
    if (existente) { caminhos.set(x.id, existente); continue; }
    const numero = (x.numero ?? "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 30) || "sem-numero";
    const base = chave ?? `nota-${numero}-${x.id.slice(0, 8)}`;
    let nome = `xml/${base}.xml`;
    for (let i = 2; usados.has(nome); i++) nome = `xml/${base}-${i}.xml`;
    usados.add(nome);
    if (chave) porChave.set(chave, nome);
    caminhos.set(x.id, nome);
    arquivos.push({ nome, conteudo: xmlEmUtf8(x.xml) });
  }
  return { caminhos, arquivos };
}

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/** Os arquivos do ZIP: LEIAME.txt, um CSV por tabela e xml/. */
export function montarMeusDados(d: DadosMeusDados): ArquivoZip[] {
  const { caminhos, arquivos: xmls } = caminhosXml(d.xmls);
  const defs = definicoes(d, caminhos);

  const csvs: ArquivoZip[] = [];
  const indice: string[] = [];
  const colunasDoc: string[] = [];
  const fora: string[] = [];

  for (const def of defs) {
    const t = d[def.tabela];
    if (t.ausente) {
      fora.push(`- ${def.arquivo}: módulo ainda em ativação nesta conta (nada registrado).`);
      continue;
    }
    const linhas = [...t.linhas].sort(def.ordem);
    const colunas = colunasFinais(def, linhas);
    csvs.push({ nome: def.arquivo, conteudo: csv(colunas, linhas) });
    indice.push(`- ${def.arquivo}: ${plural(linhas.length, "linha", "linhas")}`);
    colunasDoc.push("", `${def.arquivo}`, `  ${def.titulo}`, ...colunas.map((c) => `  - ${c.nome}: ${c.desc}`));
  }
  indice.push(`- xml/: ${plural(xmls.length, "arquivo", "arquivos")} (o XML de cada nota, como foi guardado)`);
  if (d.xmlsIncompletos) fora.push("- xml/: só parte dos XML coube nesta exportação (limite por arquivo). Os demais seguem guardados na plataforma.");

  const leiame = [
    "AGRAAS GESTÃO — SEUS DADOS",
    "",
    `Fazenda: ${d.clientName}`,
    `Gerado em: ${momentoBR(d.geradoEm)} (horário de Brasília)`,
    "",
    "Tudo o que esta conta registrou no Agraas Gestão, para você guardar, levar ao",
    "contador ou usar em outro sistema. Os dados são seus: baixe quantas vezes quiser.",
    "",
    "ARQUIVOS",
    ...indice,
    ...(fora.length ? ["", "NÃO ENTROU NESTE ARQUIVO", ...fora] : []),
    "",
    "COMO ABRIR",
    "- No Excel, dois cliques no .csv. Os arquivos estão em UTF-8 (acentos certos), com",
    "  ponto e vírgula separando as colunas e vírgula decimal, o padrão do Excel em português.",
    "- Datas: AAAA-MM-DD. Data e hora: AAAA-MM-DD HH:MM:SS, no horário de Brasília.",
    "- Valores: vírgula decimal, sem separador de milhar (ex.: 1234,50). Em reais nas colunas de valor.",
    "- Sim/não: \"sim\" ou \"não\".",
    "- CPF e CNPJ vêm com pontuação (012.345.678-90, 01.234.567/0001-89) para o Excel não",
    "  apagar o zero à esquerda.",
    "- Códigos só com números (chave de acesso, número da nota, parcela, NCM, CFOP, agência,",
    "  conta, safra) vêm escritos como =\"0123\": o Excel mostra 0123, sem trocar por data nem",
    "  por 5,2E+43. Para importar em outro sistema, tire o = e as aspas.",
    "- Texto que começa com =, +, - ou @ ganha um apóstrofo (') na frente, para a planilha",
    "  não executar o texto como fórmula.",
    "- Cada linha tem um id. Coluna terminada em _id aponta para o id de outro arquivo",
    "  (ex.: centro_custo_id em contas_a_pagar_e_receber.csv = id em centros_de_custo.csv).",
    "",
    "COLUNAS",
    ...colunasDoc,
    "",
  ].join("\r\n");

  return [{ nome: "LEIAME.txt", conteudo: "\u{FEFF}" + leiame }, ...csvs, ...xmls];
}
