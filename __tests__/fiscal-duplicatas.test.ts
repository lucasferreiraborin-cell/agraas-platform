/**
 * Tests: nota → contas a pagar/receber.
 *
 * Duplicatas (<cobr><dup>), pagamento (<pag><detPag>), direção pagar/receber
 * e a gravação idempotente em titulos_financeiros — que nunca pode quebrar a
 * importação da nota.
 */

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: jest.fn() }));

import {
  extrairDuplicatas,
  decidirDirecao,
  direcaoDaNota,
  descreverTPag,
} from "@/lib/fiscal/duplicatas";
import { gerarTitulosDaNota } from "@/lib/gestao/titulos";
import type { SupabaseClient } from "@supabase/supabase-js";

const FORNECEDOR = "12345678000199";
const PRODUTOR = "11122233344";

function nfe(opts: {
  tpNF?: string;
  emit?: string;
  emitNome?: string;
  dest?: string;
  destNome?: string;
  vNF?: string;
  dhEmi?: string;
  cobr?: string;
  pag?: string;
  ns?: string;
}): string {
  const p = opts.ns ? `${opts.ns}:` : "";
  const doc = (d: string) => (d.length === 11 ? `<${p}CPF>${d}</${p}CPF>` : `<${p}CNPJ>${d}</${p}CNPJ>`);
  return `<?xml version="1.0"?>
<${p}nfeProc><${p}NFe><${p}infNFe Id="NFe35261112345678000199550010000012341000012345" versao="4.00">
  <${p}ide><${p}nNF>1234</${p}nNF><${p}serie>1</${p}serie><${p}dhEmi>${opts.dhEmi ?? "2026-11-10T10:00:00-03:00"}</${p}dhEmi><${p}tpNF>${opts.tpNF ?? "1"}</${p}tpNF></${p}ide>
  <${p}emit>${doc(opts.emit ?? FORNECEDOR)}<${p}xNome>${opts.emitNome ?? "AGRO INSUMOS LTDA"}</${p}xNome><${p}enderEmit><${p}UF>GO</${p}UF></${p}enderEmit></${p}emit>
  <${p}dest>${doc(opts.dest ?? PRODUTOR)}<${p}xNome>${opts.destNome ?? "JOAO PRODUTOR"}</${p}xNome><${p}enderDest><${p}UF>GO</${p}UF></${p}enderDest></${p}dest>
  <${p}total><${p}ICMSTot><${p}vNF>${opts.vNF ?? "3000.00"}</${p}vNF></${p}ICMSTot></${p}total>
  ${opts.cobr ?? ""}
  ${opts.pag ?? ""}
</${p}infNFe></${p}NFe></${p}nfeProc>`;
}

const COBR_3 = `<cobr><fat><nFat>1234</nFat><vOrig>3000.00</vOrig><vLiq>3000.00</vLiq></fat>
  <dup><nDup>003</nDup><dVenc>2027-01-09</dVenc><vDup>1000.00</vDup></dup>
  <dup><nDup>001</nDup><dVenc>2026-11-10</dVenc><vDup>1000.00</vDup></dup>
  <dup><nDup>002</nDup><dVenc>2026-12-10</dVenc><vDup>1000.00</vDup></dup>
</cobr>`;

describe("extrairDuplicatas", () => {
  it("3 duplicatas: lê, ordena por vencimento e confere com vNF", () => {
    const r = extrairDuplicatas(nfe({ cobr: COBR_3, pag: `<pag><detPag><indPag>1</indPag><tPag>15</tPag><vPag>3000.00</vPag></detPag></pag>` }));
    expect(r.origem).toBe("duplicatas");
    expect(r.parcelas).toEqual([
      { numero: "001", vencimento: "2026-11-10", valor: 1000 },
      { numero: "002", vencimento: "2026-12-10", valor: 1000 },
      { numero: "003", vencimento: "2027-01-09", valor: 1000 },
    ]);
    expect(r.fatura).toEqual({ numero: "1234", valorOriginal: 3000, valorLiquido: 3000 });
    expect(r.somaParcelas).toBe(3000);
    expect(r.divergencia).toBeNull();
    expect(r.formaPagamento).toBe("Boleto");
    expect(r.pagamentos[0].indPag).toBe(1);
  });

  it("sem <cobr>: uma parcela à vista na emissão com o valor da nota", () => {
    const r = extrairDuplicatas(nfe({ vNF: "1530.45", pag: `<pag><detPag><indPag>0</indPag><tPag>17</tPag><vPag>1530.45</vPag></detPag></pag>` }));
    expect(r.origem).toBe("a_vista");
    expect(r.parcelas).toEqual([{ numero: "1", vencimento: "2026-11-10", valor: 1530.45 }]);
    expect(r.formaPagamento).toBe("PIX");
    expect(r.divergencia).toBeNull();
  });

  it("sem vNF: à vista usa a soma de detPag menos troco", () => {
    const xml = nfe({ pag: `<pag><detPag><tPag>01</tPag><vPag>500.00</vPag></detPag><vTroco>20.00</vTroco></pag>` })
      .replace(/<vNF>[^<]*<\/vNF>/, "");
    const r = extrairDuplicatas(xml);
    expect(r.parcelas).toEqual([{ numero: "1", vencimento: "2026-11-10", valor: 480 }]);
  });

  it("detPag múltiplo: forma predominante é a de maior valor", () => {
    const r = extrairDuplicatas(nfe({
      vNF: "1000.00",
      pag: `<pag>
        <detPag><tPag>01</tPag><vPag>200.00</vPag></detPag>
        <detPag><tPag>03</tPag><vPag>800.00</vPag></detPag>
      </pag>`,
    }));
    expect(r.pagamentos.map(p => p.tPag)).toEqual(["01", "03"]);
    expect(r.formaPagamento).toBe("Cartão de crédito");
    expect(r.parcelas).toHaveLength(1);
    expect(r.parcelas[0].valor).toBe(1000);
  });

  it("tPag 90 sem duplicatas: nenhuma parcela (remessa/bonificação)", () => {
    const r = extrairDuplicatas(nfe({ pag: `<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>` }));
    expect(r.origem).toBe("sem_pagamento");
    expect(r.parcelas).toHaveLength(0);
  });

  it("valores divergentes: registra a diferença contra vNF", () => {
    const cobr = `<cobr><dup><nDup>1</nDup><dVenc>2026-12-01</dVenc><vDup>1500.00</vDup></dup>
      <dup><nDup>2</nDup><dVenc>2027-01-01</dVenc><vDup>1400.50</vDup></dup></cobr>`;
    const r = extrairDuplicatas(nfe({ vNF: "3000.00", cobr }));
    expect(r.somaParcelas).toBe(2900.5);
    expect(r.divergencia).toEqual({ somaParcelas: 2900.5, valorNota: 3000, diferenca: -99.5 });
  });

  it("ignora parcela com valor ≤ 0 e avisa", () => {
    const cobr = `<cobr><dup><nDup>1</nDup><dVenc>2026-12-01</dVenc><vDup>0.00</vDup></dup>
      <dup><nDup>2</nDup><dVenc>2027-01-01</dVenc><vDup>3000.00</vDup></dup></cobr>`;
    const r = extrairDuplicatas(nfe({ cobr }));
    expect(r.parcelas.map(p => p.numero)).toEqual(["2"]);
    expect(r.avisos.some(a => a.includes("Parcela 1 ignorada"))).toBe(true);
  });

  it("nDup repetido ou ausente não colide", () => {
    const cobr = `<cobr><dup><dVenc>2026-12-01</dVenc><vDup>1000.00</vDup></dup>
      <dup><nDup>1</nDup><dVenc>2027-01-01</dVenc><vDup>1000.00</vDup></dup>
      <dup><nDup>1</nDup><dVenc>2027-02-01</dVenc><vDup>1000.00</vDup></dup></cobr>`;
    const nums = extrairDuplicatas(nfe({ cobr })).parcelas.map(p => p.numero);
    expect(new Set(nums).size).toBe(3);
  });

  it("entidades XML e prefixo de namespace", () => {
    const xml = nfe({ ns: "nfe", emitNome: "ADUBOS A&amp;B LTDA", cobr: "", pag: "" });
    const withCobr = xml.replace(
      "</nfe:total>",
      "</nfe:total><nfe:cobr><nfe:dup><nfe:nDup>A&amp;1</nfe:nDup><nfe:dVenc>2026-12-01</nfe:dVenc><nfe:vDup>3000.00</nfe:vDup></nfe:dup></nfe:cobr>",
    );
    const r = extrairDuplicatas(withCobr);
    expect(r.parcelas).toEqual([{ numero: "A&1", vencimento: "2026-12-01", valor: 3000 }]);
    expect(direcaoDaNota(withCobr).emitente.nome).toBe("ADUBOS A&B LTDA");
  });

  it("vencimento inválido cai na data de emissão", () => {
    const cobr = `<cobr><dup><nDup>1</nDup><dVenc>2026-13-40</dVenc><vDup>3000.00</vDup></dup></cobr>`;
    const r = extrairDuplicatas(nfe({ cobr }));
    expect(r.parcelas[0].vencimento).toBe("2026-11-10");
  });

  it("descreverTPag não inventa código desconhecido", () => {
    expect(descreverTPag("15")).toBe("Boleto");
    expect(descreverTPag("77")).toBe("Código 77");
  });
});

describe("decidirDirecao", () => {
  it("compra: fornecedor emite saída para o cliente → pagar", () => {
    const d = decidirDirecao({ tpNF: "1", documentoEmitente: FORNECEDOR, documentoDestinatario: PRODUTOR, documentoCliente: PRODUTOR });
    expect(d).toMatchObject({ tipo: "pagar", papelCliente: "destinatario", confianca: "alta" });
  });

  it("venda: cliente emite saída → receber", () => {
    const d = decidirDirecao({ tpNF: 1, documentoEmitente: "111.222.333-44", documentoDestinatario: FORNECEDOR, documentoCliente: PRODUTOR });
    expect(d).toMatchObject({ tipo: "receber", papelCliente: "emitente", confianca: "alta" });
  });

  it("contranota: frigorífico emite entrada do gado do cliente → receber", () => {
    const d = decidirDirecao({ tpNF: "0", documentoEmitente: FORNECEDOR, documentoDestinatario: PRODUTOR, documentoCliente: PRODUTOR });
    expect(d).toMatchObject({ tipo: "receber", papelCliente: "destinatario" });
  });

  it("nota de entrada própria do cliente → pagar", () => {
    const d = decidirDirecao({ tpNF: "0", documentoEmitente: PRODUTOR, documentoDestinatario: FORNECEDOR, documentoCliente: PRODUTOR });
    expect(d.tipo).toBe("pagar");
  });

  it("sem documento do cliente: CPF emitente × CNPJ destino → venda (média)", () => {
    const d = decidirDirecao({ tpNF: "1", documentoEmitente: PRODUTOR, documentoDestinatario: FORNECEDOR });
    expect(d).toMatchObject({ tipo: "receber", confianca: "media" });
  });

  it("sem documento do cliente e duas empresas: supõe compra (baixa)", () => {
    const d = decidirDirecao({ tpNF: "1", documentoEmitente: FORNECEDOR, documentoDestinatario: "98765432000111" });
    expect(d).toMatchObject({ tipo: "pagar", confianca: "baixa" });
  });

  it("direcaoDaNota lê tpNF e documentos do XML", () => {
    const d = direcaoDaNota(nfe({ tpNF: "1", emit: PRODUTOR, dest: FORNECEDOR, emitNome: "JOAO", destNome: "FRIGORIFICO SA" }), PRODUTOR);
    expect(d.tipo).toBe("receber");
    expect(d.destinatario).toEqual({ nome: "FRIGORIFICO SA", doc: FORNECEDOR });
  });
});

// ── gerarTitulosDaNota com client falso ─────────────────────────────────────

type Erro = { code?: string; message: string } | null;

function fakeDb(opts: { existentes?: string[]; selErr?: Erro; insErr?: Erro; insRowErr?: (row: Record<string, unknown>) => Erro } = {}) {
  const inserts: unknown[] = [];
  const db = {
    from() {
      return {
        select() {
          return { eq: () => Promise.resolve({ data: (opts.existentes ?? []).map(n => ({ numero_parcela: n })), error: opts.selErr ?? null }) };
        },
        insert(payload: unknown) {
          inserts.push(payload);
          if (Array.isArray(payload)) return Promise.resolve({ error: opts.insErr ?? null });
          return Promise.resolve({ error: opts.insRowErr?.(payload as Record<string, unknown>) ?? null });
        },
      };
    },
  };
  return { db: db as unknown as SupabaseClient, inserts };
}

describe("gerarTitulosDaNota", () => {
  const base = { clientId: "c1", xml: nfe({ cobr: COBR_3 }), fiscalNoteId: "n1" };

  it("insere uma linha por parcela, tipo pagar, origem nfe", async () => {
    const { db, inserts } = fakeDb();
    const r = await gerarTitulosDaNota(db, base);
    expect(r).toMatchObject({ ok: true, tipo: "pagar", inseridos: 3, existentes: 0 });
    const rows = inserts[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      client_id: "c1", tipo: "pagar", origem: "nfe", numero_parcela: "001", valor: 1000,
      vencimento: "2026-11-10", fiscal_note_id: "n1", fiscal_invoice_id: null,
      contraparte_nome: "AGRO INSUMOS LTDA", contraparte_doc: FORNECEDOR, status: "aberto",
    });
    expect(rows[0].descricao).toBe("NF-e 1234 · AGRO INSUMOS LTDA · parcela 001");
  });

  it("reimportação: só insere as parcelas que faltam", async () => {
    const { db, inserts } = fakeDb({ existentes: ["001", "002"] });
    const r = await gerarTitulosDaNota(db, base);
    expect(r).toMatchObject({ ok: true, inseridos: 1, existentes: 2 });
    expect((inserts[0] as unknown[]).length).toBe(1);
  });

  it("tudo já gravado: nenhum insert", async () => {
    const { db, inserts } = fakeDb({ existentes: ["001", "002", "003"] });
    const r = await gerarTitulosDaNota(db, base);
    expect(r).toMatchObject({ ok: true, inseridos: 0, existentes: 3 });
    expect(inserts).toHaveLength(0);
  });

  it("corrida (23505): cai para linha a linha ignorando repetidas", async () => {
    const { db } = fakeDb({
      insErr: { code: "23505", message: "duplicate key" },
      insRowErr: row => (row.numero_parcela === "002" ? { code: "23505", message: "duplicate key" } : null),
    });
    const r = await gerarTitulosDaNota(db, base);
    expect(r).toMatchObject({ ok: true, inseridos: 2, existentes: 1 });
  });

  it("tabela ausente (172 não aplicada) → tabela_ausente, sem lançar", async () => {
    const { db } = fakeDb({ selErr: { code: "PGRST205", message: "Could not find the table in the schema cache" } });
    await expect(gerarTitulosDaNota(db, base)).resolves.toEqual({ ok: false, motivo: "tabela_ausente" });
  });

  it("sem vínculo com nota → sem_vinculo", async () => {
    const { db } = fakeDb();
    const r = await gerarTitulosDaNota(db, { clientId: "c1", xml: base.xml });
    expect(r).toEqual({ ok: false, motivo: "sem_vinculo" });
  });

  it("client que lança não propaga", async () => {
    const db = { from() { throw new Error("boom"); } } as unknown as SupabaseClient;
    await expect(gerarTitulosDaNota(db, base)).resolves.toMatchObject({ ok: false, motivo: "erro", detalhe: "boom" });
  });

  it("divergência vai para notas da última parcela", async () => {
    const cobr = `<cobr><dup><nDup>1</nDup><dVenc>2026-12-01</dVenc><vDup>1000.00</vDup></dup></cobr>`;
    const { db, inserts } = fakeDb();
    const r = await gerarTitulosDaNota(db, { ...base, xml: nfe({ cobr }) });
    expect(r.ok && r.divergencia?.diferenca).toBe(-2000);
    expect((inserts[0] as Array<Record<string, unknown>>)[0].notas).toMatch(/difere do total/);
  });
});
