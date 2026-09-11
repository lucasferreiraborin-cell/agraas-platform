/**
 * Tests: lib/admin/reset-cliente.ts
 *
 * Não há banco aqui. O que se protege é o que faria a limpeza errar em
 * produção: ordem (filho antes de pai), o que NUNCA entra no plano, a
 * tolerância a tabela inexistente / view, a segunda passada para FK, o lote
 * de 200 ids no IN, e os ids dos pais lidos ANTES de qualquer delete.
 */

import {
  PLANO,
  PRESERVADAS,
  REFERENCIAS,
  LOTE_IN,
  classificarErro,
  paisDoPlano,
  inventariar,
  executar,
  type AdaptadorDb,
  type Filtro,
  type Passo,
} from "@/lib/admin/reset-cliente";

const CLIENTE = "00000000-0000-0000-0003-000000000001";

// ── Fake em memória ──────────────────────────────────────────────────────────

type Linha = Record<string, string>;
type Opcoes = {
  tabelas: Record<string, Linha[]>;
  inexistentes?: string[];
  views?: string[];
  /** tabela -> tabela filha que a bloqueia enquanto tiver linhas */
  bloqueiosFk?: Record<string, string>;
};

function fake(o: Opcoes) {
  const dados: Record<string, Linha[]> = {};
  for (const [t, ls] of Object.entries(o.tabelas)) dados[t] = ls.map(l => ({ ...l }));
  const chamadas: { op: string; tabela: string; filtro?: Filtro }[] = [];
  const fotosRemovidas: string[] = [];

  const casa = (l: Linha, f: Filtro) =>
    "valores" in f ? f.valores.includes(l[f.coluna]) : l[f.coluna] === f.valor;

  const erroTabela = (t: string) => {
    if (o.inexistentes?.includes(t)) return { code: "42P01", message: `relation "${t}" does not exist` };
    return undefined;
  };

  const db: AdaptadorDb = {
    async cliente(id) {
      return id === CLIENTE ? { id, name: "Bernardo", email: "fsjdbe@gmail.com", role: "client" } : null;
    },
    async selecionar(tabela, coluna, filtro) {
      chamadas.push({ op: "selecionar", tabela, filtro });
      const e = erroTabela(tabela);
      if (e) return { valores: [], erro: e };
      return { valores: (dados[tabela] ?? []).filter(l => casa(l, filtro)).map(l => l[coluna]).filter(Boolean) };
    },
    async contar(tabela, filtro) {
      chamadas.push({ op: "contar", tabela, filtro });
      const e = erroTabela(tabela);
      if (e) return { total: 0, erro: e };
      return { total: (dados[tabela] ?? []).filter(l => casa(l, filtro)).length };
    },
    async apagar(tabela, filtro) {
      chamadas.push({ op: "apagar", tabela, filtro });
      const e = erroTabela(tabela);
      if (e) return { apagados: 0, erro: e };
      if (o.views?.includes(tabela)) return { apagados: 0, erro: { code: "42809", message: `cannot delete from view "${tabela}"` } };
      const filha = o.bloqueiosFk?.[tabela];
      if (filha && (dados[filha] ?? []).length > 0) {
        return { apagados: 0, erro: { code: "23503", message: `update or delete on table "${tabela}" violates foreign key constraint on "${filha}"` } };
      }
      const antes = (dados[tabela] ?? []).length;
      dados[tabela] = (dados[tabela] ?? []).filter(l => !casa(l, filtro));
      return { apagados: antes - dados[tabela].length };
    },
    async listarArquivos(_bucket, prefixo) {
      return { caminhos: prefixo.startsWith("lots/") ? [`${prefixo}/foto.jpg`] : [] };
    },
    async removerArquivos(_bucket, caminhos) {
      fotosRemovidas.push(...caminhos);
      return { removidos: caminhos.length };
    },
  };
  return { db, dados, chamadas, fotosRemovidas };
}

function ids(n: number, prefixo: string) {
  return Array.from({ length: n }, (_, i) => `${prefixo}-${String(i).padStart(4, "0")}`);
}

// ── Plano ────────────────────────────────────────────────────────────────────

describe("PLANO", () => {
  const indice = new Map(PLANO.map((p, i) => [p.tabela, i]));

  it("nenhuma tabela preservada entra no plano", () => {
    for (const t of PRESERVADAS) expect(indice.has(t)).toBe(false);
  });

  it("não repete tabela", () => {
    expect(new Set(PLANO.map(p => p.tabela)).size).toBe(PLANO.length);
  });

  it("todo passo via pai vem antes do passo que apaga o pai", () => {
    for (const p of PLANO) {
      if (p.via !== "pai") continue;
      const iPai = indice.get(p.pai);
      expect(iPai).toBeDefined();
      expect(indice.get(p.tabela)!).toBeLessThan(iPai!);
    }
  });

  it("toda tabela vem antes das que ela referencia (grafo de FKs das migrations)", () => {
    const violacoes: string[] = [];
    for (const [filha, pais] of Object.entries(REFERENCIAS)) {
      const iFilha = indice.get(filha);
      if (iFilha === undefined) continue;
      for (const pai of pais) {
        const iPai = indice.get(pai);
        if (iPai !== undefined && iPai < iFilha) violacoes.push(`${filha} depois de ${pai}`);
      }
    }
    expect(violacoes).toEqual([]);
  });

  it("as raízes fecham o plano", () => {
    const ultimas = PLANO.slice(-3).map(p => p.tabela);
    expect(ultimas).toEqual(["animals", "lots", "properties"]);
  });

  it("pais do plano são só os que têm client_id", () => {
    const comClientId = new Set(PLANO.filter(p => p.via === "client_id").map(p => p.tabela));
    for (const pai of paisDoPlano()) expect(comClientId.has(pai)).toBe(true);
  });
});

// ── Classificação ────────────────────────────────────────────────────────────

describe("classificarErro", () => {
  it("tabela inexistente por código ou mensagem", () => {
    expect(classificarErro({ code: "42P01", message: "x" })).toBe("inexistente");
    expect(classificarErro({ code: "PGRST205", message: "Could not find the table 'public.foo'" })).toBe("inexistente");
    expect(classificarErro({ message: 'relation "public.foo" does not exist' })).toBe("inexistente");
  });
  it("view, FK e o resto", () => {
    expect(classificarErro({ code: "42809", message: "cannot delete from view" })).toBe("view");
    expect(classificarErro({ code: "23503", message: "violates foreign key" })).toBe("bloqueada");
    expect(classificarErro({ code: "42703", message: "column client_id does not exist" })).toBe("erro");
  });
});

// ── Inventário ───────────────────────────────────────────────────────────────

describe("inventariar", () => {
  it("conta por client_id e por pai, sem escrever nada", async () => {
    const { db, chamadas } = fake({
      tabelas: {
        animals: [{ id: "a1", client_id: CLIENTE }, { id: "a2", client_id: CLIENTE }, { id: "z9", client_id: "outro" }],
        weights: [{ id: "w1", animal_id: "a1" }, { id: "w2", animal_id: "a2" }, { id: "w3", animal_id: "z9" }],
        fiscal_notes: [{ id: "n1", client_id: CLIENTE }],
      },
    });
    const inv = await inventariar(db, CLIENTE);
    expect(inv.cliente?.email).toBe("fsjdbe@gmail.com");
    const por = Object.fromEntries(inv.tabelas.map(t => [t.tabela, t]));
    expect(por.animals.linhas).toBe(2);
    expect(por.weights.linhas).toBe(2);          // só as dos animais do cliente
    expect(por.fiscal_notes.linhas).toBe(1);
    expect(inv.total).toBe(5);
    expect(chamadas.some(c => c.op === "apagar")).toBe(false);
  });

  it("tabela inexistente é informação, não falha", async () => {
    const { db, chamadas } = fake({ tabelas: {}, inexistentes: ["fiscal_notes", "crop_fields"] });
    const inv = await inventariar(db, CLIENTE);
    const por = Object.fromEntries(inv.tabelas.map(t => [t.tabela, t]));
    expect(por.fiscal_notes.status).toBe("inexistente");
    expect(por.crop_fields.status).toBe("inexistente");
    // filha de um pai sem linhas não consulta o banco — ok com zero
    expect(por.animal_rfids).toMatchObject({ status: "ok", linhas: 0 });
    expect(chamadas.some(c => c.tabela === "animal_rfids")).toBe(false);
    // pai inexistente propaga para a filha como sem_pai
    expect(por.fiscal_notes_alerts_legacy.status).toBe("sem_pai");
    expect(inv.total).toBe(0);
  });
});

// ── Execução ─────────────────────────────────────────────────────────────────

describe("executar", () => {
  it("apaga só o cliente pedido e preserva a conta", async () => {
    const { db, dados } = fake({
      tabelas: {
        animals: [{ id: "a1", client_id: CLIENTE }, { id: "z9", client_id: "outro" }],
        weights: [{ id: "w1", animal_id: "a1" }, { id: "w3", animal_id: "z9" }],
        lots: [{ id: "l1", client_id: CLIENTE }],
        properties: [{ id: "p1", client_id: CLIENTE }, { id: "p2", client_id: "outro" }],
        clients: [{ id: CLIENTE, email: "fsjdbe@gmail.com" }],
        chart_of_accounts: [{ id: "c1", client_id: CLIENTE }],
      },
    });
    const r = await executar(db, CLIENTE);
    expect(r.restantes).toEqual([]);
    expect(r.total_apagado).toBe(4);
    expect(dados.animals).toEqual([{ id: "z9", client_id: "outro" }]);
    expect(dados.weights).toEqual([{ id: "w3", animal_id: "z9" }]);
    expect(dados.properties).toEqual([{ id: "p2", client_id: "outro" }]);
    expect(dados.clients).toHaveLength(1);
    expect(dados.chart_of_accounts).toHaveLength(1);
  });

  it("lê os ids dos pais ANTES de qualquer delete", async () => {
    const { db, chamadas } = fake({
      tabelas: { animals: [{ id: "a1", client_id: CLIENTE }], weights: [{ id: "w1", animal_id: "a1" }] },
    });
    await executar(db, CLIENTE);
    const primeiroApagar = chamadas.findIndex(c => c.op === "apagar");
    const ultimoSelecionarPai = chamadas
      .map((c, i) => (c.op === "selecionar" && c.tabela === "animals" ? i : -1))
      .filter(i => i >= 0)
      .pop()!;
    expect(ultimoSelecionarPai).toBeLessThan(primeiroApagar);
  });

  it("filtro IN vai em lotes de no máximo 200 ids", async () => {
    const animais = ids(450, "a").map(id => ({ id, client_id: CLIENTE }));
    const { db, chamadas } = fake({
      tabelas: { animals: animais, weights: animais.map(a => ({ id: `w-${a.id}`, animal_id: a.id })) },
    });
    const r = await executar(db, CLIENTE);
    const lotesWeights = chamadas.filter(c => c.op === "apagar" && c.tabela === "weights");
    expect(lotesWeights).toHaveLength(3); // 200 + 200 + 50
    for (const c of lotesWeights) {
      const f = c.filtro!;
      expect("valores" in f && f.valores.length <= LOTE_IN).toBe(true);
    }
    expect(r.tabelas.find(t => t.tabela === "weights")!.linhas).toBe(450);
  });

  it("FK bloqueada na primeira passada é repetida na segunda", async () => {
    // `misterio` não está no plano; bloqueia `lots` até ser apagada — mas
    // aqui simulamos o caso real: `animal_lot_assignments` referencia lots e
    // animals; se o banco tiver uma FK que o plano não previu, a segunda
    // passada resolve quando a filha já caiu.
    const { db, dados } = fake({
      tabelas: {
        lots: [{ id: "l1", client_id: CLIENTE }],
        shipment_tracking: [{ id: "s1", client_id: CLIENTE }],
      },
      bloqueiosFk: { shipment_tracking: "lots" }, // ordem invertida de propósito
    });
    // shipment_tracking vem antes de lots no plano; com o bloqueio artificial,
    // só cai depois que lots cair → segunda passada.
    const r = await executar(db, CLIENTE);
    expect(r.passadas).toBe(2);
    expect(r.restantes).toEqual([]);
    expect(dados.shipment_tracking).toEqual([]);
    expect(dados.lots).toEqual([]);
  });

  it("o que continuar bloqueado após duas passadas vai em restantes, sem lançar", async () => {
    const { db } = fake({
      tabelas: { lots: [{ id: "l1", client_id: CLIENTE }], externa: [{ id: "x", lot_id: "l1" }] },
      bloqueiosFk: { lots: "externa" }, // `externa` não está no plano → nunca cai
    });
    const r = await executar(db, CLIENTE);
    expect(r.passadas).toBe(2);
    expect(r.restantes.map(t => t.tabela)).toEqual(["lots"]);
    expect(r.restantes[0].status).toBe("bloqueada");
  });

  it("view e tabela inexistente não param a execução", async () => {
    const { db, dados } = fake({
      tabelas: { animals: [{ id: "a1", client_id: CLIENTE }], animal_scores: [{ id: "s", animal_id: "a1" }] },
      views: ["animal_scores"],
      inexistentes: ["poultry_batches"],
    });
    const r = await executar(db, CLIENTE);
    const por = Object.fromEntries(r.tabelas.map(t => [t.tabela, t]));
    expect(por.animal_scores.status).toBe("view");
    expect(por.poultry_batches.status).toBe("inexistente");
    expect(dados.animals).toEqual([]);
    expect(r.restantes).toEqual([]);
  });

  it("remove as fotos dos animais e dos lotes antes de apagar as linhas", async () => {
    const { db, fotosRemovidas } = fake({
      tabelas: {
        animals: [{ id: "a1", client_id: CLIENTE }],
        animal_photos: [{ id: "f1", client_id: CLIENTE, storage_path: "a1/1.jpg" }, { id: "f2", client_id: "outro", storage_path: "z9/1.jpg" }],
        lots: [{ id: "l1", client_id: CLIENTE }],
      },
    });
    const r = await executar(db, CLIENTE);
    expect(fotosRemovidas.sort()).toEqual(["a1/1.jpg", "lots/l1/foto.jpg"]);
    expect(r.arquivos).toEqual({ encontrados: 2, removidos: 2 });
  });

  it("plano customizado respeita a mesma mecânica", async () => {
    const plano: Passo[] = [
      { tabela: "filha", via: "pai", pai: "mae", coluna: "mae_id" },
      { tabela: "mae", via: "client_id" },
    ];
    const { db, dados } = fake({
      tabelas: { mae: [{ id: "m1", client_id: CLIENTE }], filha: [{ id: "f1", mae_id: "m1" }] },
    });
    const r = await executar(db, CLIENTE, plano);
    expect(r.total_apagado).toBe(2);
    expect(dados.filha).toEqual([]);
  });
});
