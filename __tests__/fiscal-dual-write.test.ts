/**
 * Tests: B0b — escrita dupla fiscal (legado + canônica).
 *
 * Cobre as derivações puras e o invariante de segurança do modo 'dual':
 * uma falha na escrita canônica NUNCA pode derrubar o upload, porque é o
 * fluxo que o piloto usa todo dia.
 *
 * O mapeamento de status e a direção da operação são exatamente onde os dois
 * schemas divergem (PT × EN, `pendente` × `pending_review`) — um erro ali
 * apareceria só no relatório do contador, meses depois.
 */

import {
  mapLegacyStatus,
  deriveDirection,
  deriveAccessKey,
  itemsFingerprint,
  writeCanonicalInvoice,
  updateCanonicalStatus,
  deleteCanonicalInvoice,
} from "@/lib/fiscal/invoice-writer";
import type { NfeItemFiscal } from "@/lib/fiscal/nfe-parser";

// ── Fake client mínimo, no shape do supabase-js ─────────────────────────────

type Call = { table: string; op: string; payload?: unknown };

function fakeDb(failOn: Record<string, string> = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, op: "insert", payload });
          return Promise.resolve({ error: failOn[table] ? { message: failOn[table] } : null });
        },
        update(payload: unknown) {
          calls.push({ table, op: "update", payload });
          return {
            eq: () => Promise.resolve({ error: failOn[table] ? { message: failOn[table] } : null }),
          };
        },
        delete() {
          calls.push({ table, op: "delete" });
          return {
            eq: () => Promise.resolve({ error: failOn[table] ? { message: failOn[table] } : null }),
          };
        },
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls };
}

function item(over: Partial<NfeItemFiscal> = {}): NfeItemFiscal {
  return {
    sequencia: 1, codigoProduto: "P1", descricao: "ADUBO", ncm: "31052000",
    cfop: "1101", unidade: "TON", quantidade: 1, valorUnitario: 100, valorTotal: 100,
    cst: "20", icmsBase: 40, icmsReducaoBasePct: 60, icmsAliquota: 12, icmsValor: 4.8,
    icmsDesonerado: null, icmsMotDesoneracao: "", beneficioCodigo: "",
    icmsMonoQtdBc: null, icmsMonoAdRem: null, icmsMonoValor: null,
    icmsMonoQtdBcRet: null, icmsMonoAdRemRet: null, icmsMonoValorRet: null,
    ipiValor: null, ...over,
  };
}

// ── Mapeamento de status ────────────────────────────────────────────────────

describe("mapLegacyStatus", () => {
  it("mapeia os três status do schema legado", () => {
    expect(mapLegacyStatus("pendente")).toBe("pending_review");
    expect(mapLegacyStatus("validada")).toBe("reviewed");
    expect(mapLegacyStatus("erro")).toBe("rejected");
  });

  it("erro vira rejected, nunca archived — precisa de revisão, não de arquivo", () => {
    expect(mapLegacyStatus("erro")).not.toBe("archived");
  });

  it("desconhecido, vazio e nulo caem no estado mais conservador", () => {
    expect(mapLegacyStatus("qualquer")).toBe("pending_review");
    expect(mapLegacyStatus("")).toBe("pending_review");
    expect(mapLegacyStatus(null)).toBe("pending_review");
    expect(mapLegacyStatus(undefined)).toBe("pending_review");
  });

  it("tolera caixa e espaço", () => {
    expect(mapLegacyStatus("  VALIDADA ")).toBe("reviewed");
  });
});

// ── Direção da operação ─────────────────────────────────────────────────────

describe("deriveDirection", () => {
  it("CFOP 1/2/3 é entrada — compra de insumo", () => {
    expect(deriveDirection(["1101"])).toBe("entrada");
    expect(deriveDirection(["2101"])).toBe("entrada");
    expect(deriveDirection(["3101"])).toBe("entrada");
  });

  it("CFOP 5/6/7 é saída — venda de gado", () => {
    expect(deriveDirection(["5101"])).toBe("saida");
    expect(deriveDirection(["6101"])).toBe("saida");
    expect(deriveDirection(["7101"])).toBe("saida");
  });

  it("qualquer item de saída torna a nota inteira saída", () => {
    expect(deriveDirection(["1101", "6101"])).toBe("saida");
  });

  it("sem CFOP classificável assume entrada, o caso dominante no produtor", () => {
    expect(deriveDirection([])).toBe("entrada");
    expect(deriveDirection([null, undefined, ""])).toBe("entrada");
  });

  it("usa a mesma regra do ETL da migration 139 — nota reprocessada não muda de direção", () => {
    const cfops = ["1653", "1101"];
    expect(deriveDirection(cfops)).toBe(deriveDirection([...cfops].reverse()));
  });
});

// ── Chave de acesso ─────────────────────────────────────────────────────────

describe("deriveAccessKey", () => {
  const id = "11111111-2222-3333-4444-555555555555";

  it("usa a chave real de 44 dígitos quando existe", () => {
    const chave = "5".repeat(44);
    expect(deriveAccessKey(chave, id)).toBe(chave);
  });

  it("cai no id da nota quando a chave falta ou é inválida", () => {
    expect(deriveAccessKey(null, id)).toBe(id);
    expect(deriveAccessKey("", id)).toBe(id);
    expect(deriveAccessKey("123", id)).toBe(id);
  });

  it("limpa formatação antes de medir o comprimento", () => {
    const chave = "5".repeat(44);
    expect(deriveAccessKey(chave.replace(/(.{4})/g, "$1 "), id)).toBe(chave);
  });
});

// ── Assinatura de itens ─────────────────────────────────────────────────────

describe("itemsFingerprint", () => {
  const a = [{ ncm: "31052000", cfop: "1101", total: 100 }, { ncm: "27101921", cfop: "1653", total: 50 }];

  it("independe da ordem — o ETL gravou os itens em ordem de UUID", () => {
    expect(itemsFingerprint(a)).toBe(itemsFingerprint([...a].reverse()));
  });

  it("muda quando um valor muda", () => {
    const b = [{ ncm: "31052000", cfop: "1101", total: 101 }, a[1]];
    expect(itemsFingerprint(a)).not.toBe(itemsFingerprint(b));
  });

  it("codifica a contagem no prefixo", () => {
    expect(itemsFingerprint(a).startsWith("2#")).toBe(true);
    expect(itemsFingerprint([]).startsWith("0#")).toBe(true);
  });

  it("normaliza casas decimais — 100 e 100.00 são o mesmo item", () => {
    expect(itemsFingerprint([{ ncm: "1", cfop: "2", total: 100 }]))
      .toBe(itemsFingerprint([{ ncm: "1", cfop: "2", total: 100.0 }]));
  });
});

// ── Escrita canônica ────────────────────────────────────────────────────────

describe("writeCanonicalInvoice", () => {
  const base = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    clientId: "client-1",
    chaveAcesso: "9".repeat(44),
    numero: "1234", serie: "1",
    emitenteCnpj: "12345678000199", emitenteNome: "AGRO LTDA",
    dataEmissao: "2026-08-15", valorTotal: 100,
    legacyStatus: "pendente",
    source: "xml_upload" as const,
    rawXml: "<xml/>",
    items: [item()],
  };

  it("grava nota e itens com o mesmo id nas duas tabelas", async () => {
    const { client, calls } = fakeDb();
    const res = await writeCanonicalInvoice(client, base);

    expect(res.ok).toBe(true);
    expect(res.invoiceId).toBe(base.id);
    expect(res.itemsWritten).toBe(1);
    expect(calls.map(c => c.table)).toEqual(["fiscal_invoices", "fiscal_invoice_items"]);

    const inv = calls[0].payload as Record<string, unknown>;
    expect(inv.id).toBe(base.id);
    expect(inv.status).toBe("pending_review");
    expect(inv.direction).toBe("entrada");
    expect(inv.access_key).toBe(base.chaveAcesso);
    expect(inv.needs_human_review).toBe(true);
  });

  it("propaga os campos de ICMS do B0 para os itens", async () => {
    const { client, calls } = fakeDb();
    await writeCanonicalInvoice(client, base);
    const rows = calls[1].payload as Array<Record<string, unknown>>;
    expect(rows[0].icms_reducao_base_pct).toBe(60);
    expect(rows[0].icms_valor).toBe(4.8);
    expect(rows[0].fiscal_parse_source).toBe("live_parse");
  });

  it("nota sem item grava só o cabeçalho, sem erro", async () => {
    const { client, calls } = fakeDb();
    const res = await writeCanonicalInvoice(client, { ...base, items: [] });
    expect(res.ok).toBe(true);
    expect(res.itemsWritten).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it("NUNCA lança quando a nota falha — devolve ok:false", async () => {
    const { client } = fakeDb({ fiscal_invoices: "duplicate key value violates unique constraint" });
    const res = await writeCanonicalInvoice(client, base);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("duplicate key");
  });

  it("NUNCA lança quando os itens falham — devolve ok:false", async () => {
    const { client } = fakeDb({ fiscal_invoice_items: "column does not exist" });
    const res = await writeCanonicalInvoice(client, base);
    expect(res.ok).toBe(false);
    expect(res.itemsWritten).toBe(0);
  });

  it("NUNCA lança nem quando o cliente explode", async () => {
    const boom = { from: () => { throw new Error("conexão caiu"); } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await writeCanonicalInvoice(boom as any, base);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("conexão caiu");
  });

  it("nota de venda vira saída na canônica", async () => {
    const { client, calls } = fakeDb();
    await writeCanonicalInvoice(client, { ...base, items: [item({ cfop: "5101" })] });
    expect((calls[0].payload as Record<string, unknown>).direction).toBe("saida");
  });
});

// ── Status e delete ─────────────────────────────────────────────────────────

describe("updateCanonicalStatus e deleteCanonicalInvoice", () => {
  it("apply-stock leva validada para reviewed", async () => {
    const { client, calls } = fakeDb();
    const res = await updateCanonicalStatus(client, "inv-1", "validada");
    expect(res.ok).toBe(true);
    expect((calls[0].payload as Record<string, unknown>).status).toBe("reviewed");
  });

  it("nota com alerta crítico vira rejected", async () => {
    const { client, calls } = fakeDb();
    await updateCanonicalStatus(client, "inv-1", "erro");
    expect((calls[0].payload as Record<string, unknown>).status).toBe("rejected");
  });

  it("delete remove da canônica e não lança em falha", async () => {
    const { client, calls } = fakeDb();
    expect((await deleteCanonicalInvoice(client, "inv-1")).ok).toBe(true);
    expect(calls[0]).toEqual({ table: "fiscal_invoices", op: "delete" });

    const { client: bad } = fakeDb({ fiscal_invoices: "fk violation" });
    const res = await deleteCanonicalInvoice(bad, "inv-1");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("fk violation");
  });
});

// ── Ida e volta do ciclo de vida ────────────────────────────────────────────

describe("ciclo upload → analyze → apply-stock → delete", () => {
  it("o status atravessa os dois schemas sem perder equivalência", async () => {
    const { client, calls } = fakeDb();

    await writeCanonicalInvoice(client, {
      id: "n1", clientId: "c1", chaveAcesso: null, numero: "1", serie: "1",
      emitenteCnpj: null, emitenteNome: null, dataEmissao: "2026-09-01",
      valorTotal: 10, legacyStatus: "pendente", source: "xml_upload",
      rawXml: "<x/>", items: [item()],
    });
    await updateCanonicalStatus(client, "n1", "validada");
    await deleteCanonicalInvoice(client, "n1");

    const statuses = calls
      .filter(c => c.op === "insert" || c.op === "update")
      .map(c => (c.payload as Record<string, unknown>)?.status)
      .filter(Boolean);

    expect(statuses).toEqual(["pending_review", "reviewed"]);
    expect(calls.at(-1)?.op).toBe("delete");
  });
});
