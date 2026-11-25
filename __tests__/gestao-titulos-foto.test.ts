/**
 * Tests: lib/gestao/titulos-foto.ts — foto da nota → contas a pagar/receber.
 *
 * Regra do pedido: duplicatas lidas viram títulos; sem duplicatas, UM título
 * "a conferir" SOMENTE com valor total e data; senão nenhum. Nunca "pago".
 */

// titulos-foto importa lib/gestao/contexto (redirect + cliente SSR) só pelo
// `tabelaAusente`; os mocks evitam carregar Next e cookies no Jest.
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: jest.fn() }));

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  gravarTitulosDaFoto, planejarTitulosDaFoto,
  type EntradaTitulosFoto, type LinhaTituloFoto,
} from "@/lib/gestao/titulos-foto";

const BASE: EntradaTitulosFoto = {
  clientId: "c1",
  fiscalNoteId: "n1",
  fiscalInvoiceId: "n1",
  numeroNota: "456",
  dataEmissao: "2026-11-20",
  valorTotal: 5950,
  emitente: { nome: "AGROPECUARIA GOIAS LTDA", doc: "01234567000189" },
  destinatario: { nome: "FAZENDA BOA VISTA", doc: "12345678909" },
  tipoOperacao: "1",
  duplicatas: [],
  ncms: ["23099090", "30049099"],
};
const entrada = (p: Partial<EntradaTitulosFoto>): EntradaTitulosFoto => ({ ...BASE, ...p });

describe("planejarTitulosDaFoto — duplicatas lidas", () => {
  const plano = planejarTitulosDaFoto(entrada({
    duplicatas: [
      { numero: "002", vencimento: "2027-01-20", valor: 2975 },
      { numero: "001", vencimento: "2026-12-20", valor: 2975 },
    ],
  }));

  it("uma linha por duplicata, em ordem de vencimento, sempre em aberto", () => {
    expect(plano.modo).toBe("duplicatas");
    expect(plano.linhas.map((l) => [l.numero_parcela, l.vencimento, l.valor, l.status])).toEqual([
      ["001", "2026-12-20", 2975, "aberto"],
      ["002", "2027-01-20", 2975, "aberto"],
    ]);
  });

  it("compra de empresa para produtor PF: a pagar, contraparte é o emitente, ligada à nota", () => {
    const [l] = plano.linhas;
    expect(l).toMatchObject({
      tipo: "pagar", contraparte_nome: "AGROPECUARIA GOIAS LTDA", contraparte_doc: "01234567000189",
      fiscal_note_id: "n1", fiscal_invoice_id: "n1", origem: "nfe", natureza: "custo", client_id: "c1",
    });
    expect(l.descricao).toBe("NF-e 456 · AGROPECUARIA GOIAS LTDA · parcela 001");
    expect(l.notas).toMatch(/^Lido da foto do DANFE: confira valor e vencimento\./);
  });

  it("ignora duplicata sem valor ou com vencimento inválido", () => {
    const p = planejarTitulosDaFoto(entrada({
      duplicatas: [
        { numero: "1", vencimento: "2026-12-20", valor: null },
        { numero: "2", vencimento: "20/12/2026", valor: 100 },
        { numero: "3", vencimento: "2026-12-20", valor: 0 },
        { numero: "4", vencimento: "2026-12-20", valor: 5950 },
      ],
    }));
    expect(p.linhas.map((l) => l.numero_parcela)).toEqual(["4"]);
    expect(p.linhas[0].descricao).toBe("NF-e 456 · AGROPECUARIA GOIAS LTDA");
  });

  it("número repetido não quebra a unicidade (nota, parcela)", () => {
    const p = planejarTitulosDaFoto(entrada({
      duplicatas: [
        { numero: "001", vencimento: "2026-12-20", valor: 2975 },
        { numero: "001", vencimento: "2027-01-20", valor: 2975 },
      ],
    }));
    expect(p.linhas.map((l) => l.numero_parcela)).toEqual(["001", "001-2"]);
  });

  it("soma das parcelas diferente do total vira aviso na última", () => {
    const p = planejarTitulosDaFoto(entrada({
      duplicatas: [{ numero: "1", vencimento: "2026-12-20", valor: 2000 }, { numero: "2", vencimento: "2027-01-20", valor: 2000 }],
    }));
    expect(p.linhas[0].notas).not.toMatch(/difere/);
    expect(p.linhas[1].notas).toMatch(/Soma das parcelas lidas \(4000\.00\) difere do total da nota \(5950\.00\)/);
  });
});

describe("planejarTitulosDaFoto — sem duplicatas", () => {
  it("valor + data: UM título 'a conferir', vencimento provisório = emissão", () => {
    const p = planejarTitulosDaFoto(BASE);
    expect(p.modo).toBe("a_conferir");
    expect(p.linhas).toHaveLength(1);
    expect(p.linhas[0]).toMatchObject({
      numero_parcela: null, valor: 5950, vencimento: "2026-11-20", status: "aberto",
      descricao: "NF-e 456 · AGROPECUARIA GOIAS LTDA · a conferir",
    });
    expect(p.linhas[0].notas).toMatch(/^A conferir: a foto não trouxe as parcelas\. Vencimento provisório = data de emissão/);
  });

  it("sem valor total: nenhum título", () => {
    expect(planejarTitulosDaFoto(entrada({ valorTotal: null }))).toMatchObject({ modo: "nenhum", linhas: [] });
    expect(planejarTitulosDaFoto(entrada({ valorTotal: 0 }))).toMatchObject({ modo: "nenhum", linhas: [] });
  });

  it("sem data (ou data impossível): nenhum título", () => {
    expect(planejarTitulosDaFoto(entrada({ dataEmissao: "" }))).toMatchObject({ modo: "nenhum", linhas: [] });
    expect(planejarTitulosDaFoto(entrada({ dataEmissao: "2026-13-01" }))).toMatchObject({ modo: "nenhum", linhas: [] });
  });

  it("sem vínculo com a nota: nenhum título (não haveria chave de idempotência)", () => {
    expect(planejarTitulosDaFoto(entrada({ fiscalNoteId: null, fiscalInvoiceId: null }))).toMatchObject({ modo: "nenhum", linhas: [] });
  });
});

describe("planejarTitulosDaFoto — natureza e direção", () => {
  it("compra só de diesel é estoque; diesel misturado avisa", () => {
    expect(planejarTitulosDaFoto(entrada({ ncms: ["27101921"] })).linhas[0].natureza).toBe("estoque");
    const misto = planejarTitulosDaFoto(entrada({ ncms: ["27101921", "31021010"] })).linhas[0];
    expect(misto.natureza).toBe("custo");
    expect(misto.notas).toMatch(/diesel pode contar duas vezes/);
  });

  it("produtor PF emitindo saída para empresa: a receber, contraparte é o destinatário", () => {
    const p = planejarTitulosDaFoto(entrada({
      emitente: { nome: "FAZENDA BOA VISTA", doc: "12345678909" },
      destinatario: { nome: "FRIGORIFICO REGIONAL LTDA", doc: "98765432000110" },
    }));
    expect(p.linhas[0]).toMatchObject({ tipo: "receber", contraparte_nome: "FRIGORIFICO REGIONAL LTDA" });
  });

  it("sem documentos e sem ENTRADA/SAÍDA legível: supõe a pagar e avisa", () => {
    const p = planejarTitulosDaFoto(entrada({
      emitente: { nome: "REVENDA X", doc: "" }, destinatario: { nome: "", doc: "" }, tipoOperacao: "",
    }));
    expect(p.linhas[0].tipo).toBe("pagar");
    expect(p.linhas[0].notas).toMatch(/Direção \(pagar\) suposta/);
  });
});

describe("gravarTitulosDaFoto", () => {
  const linha = planejarTitulosDaFoto(BASE).linhas[0] as LinhaTituloFoto;
  const db = (insert: () => Promise<{ error: { code?: string; message: string } | null }>) =>
    ({ from: () => ({ insert }) }) as unknown as SupabaseClient;

  it("grava e conta", async () => {
    expect(await gravarTitulosDaFoto(db(async () => ({ error: null })), [linha])).toEqual({ ok: true, inseridos: 1 });
  });

  it("sem linhas não toca o banco", async () => {
    const insert = jest.fn();
    expect(await gravarTitulosDaFoto(db(insert), [])).toEqual({ ok: true, inseridos: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  it("tabela ausente (172 não aplicada) e erro viram motivo — nunca lança", async () => {
    expect(await gravarTitulosDaFoto(db(async () => ({ error: { code: "42P01", message: "relation does not exist" } })), [linha]))
      .toEqual({ ok: false, motivo: "tabela_ausente" });
    expect(await gravarTitulosDaFoto(db(async () => ({ error: { message: "violates check constraint" } })), [linha]))
      .toMatchObject({ ok: false, motivo: "erro" });
    expect(await gravarTitulosDaFoto(db(async () => { throw new Error("rede"); }), [linha]))
      .toMatchObject({ ok: false, motivo: "erro", detalhe: "rede" });
  });
});
