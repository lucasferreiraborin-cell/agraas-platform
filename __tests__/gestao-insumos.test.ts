import {
  chaveProduto, direcaoPorCfop, historicoDePrecos, resumoEstoque, sentidoDaVariacao, variacaoPct,
  type CompraItem,
} from "@/lib/gestao/insumos";

const compra = (p: Partial<CompraItem>): CompraItem => ({
  descricao: "Ureia 45%", unidade: "SC", preco: 100, data: "2026-01-10", fornecedor: "Revenda A", notaId: "n", ...p,
});

describe("variacaoPct", () => {
  it("calcula alta e queda", () => {
    expect(variacaoPct(110, 100)).toBeCloseTo(10);
    expect(variacaoPct(90, 100)).toBeCloseTo(-10);
  });
  it("não compara com base zero, negativa ou inválida", () => {
    expect(variacaoPct(10, 0)).toBeNull();
    expect(variacaoPct(10, -5)).toBeNull();
    expect(variacaoPct(NaN, 5)).toBeNull();
  });
});

describe("sentidoDaVariacao", () => {
  it("usa limiar para estável", () => {
    expect(sentidoDaVariacao(0.3)).toBe("estavel");
    expect(sentidoDaVariacao(-0.3)).toBe("estavel");
    expect(sentidoDaVariacao(5)).toBe("alta");
    expect(sentidoDaVariacao(-5)).toBe("queda");
    expect(sentidoDaVariacao(null)).toBeNull();
  });
});

describe("chaveProduto", () => {
  it("ignora caixa, acento e espaço entre número e unidade", () => {
    expect(chaveProduto("ROUNDUP Original 20 L", "L")).toBe(chaveProduto("roundup  original 20L", "l"));
    expect(chaveProduto("Ração Nutrição", "KG")).toBe(chaveProduto("racao nutricao", "kg"));
  });
});

describe("direcaoPorCfop", () => {
  it("lê o primeiro dígito", () => {
    expect(direcaoPorCfop("1102")).toBe("entrada");
    expect(direcaoPorCfop("6102")).toBe("saida");
    expect(direcaoPorCfop(null)).toBeNull();
    expect(direcaoPorCfop("9999")).toBeNull();
  });
});

describe("historicoDePrecos", () => {
  it("pega último, anterior e variação pela data, não pela ordem de entrada", () => {
    const h = historicoDePrecos([
      compra({ preco: 120, data: "2026-03-01", fornecedor: "Revenda B" }),
      compra({ preco: 100, data: "2026-01-10" }),
      compra({ preco: 110, data: "2026-02-01" }),
    ]);
    expect(h).toHaveLength(1);
    expect(h[0].ultimo.preco).toBe(120);
    expect(h[0].ultimo.fornecedor).toBe("Revenda B");
    expect(h[0].anterior?.preco).toBe(110);
    expect(h[0].variacao).toBeCloseTo(9.09, 1);
    expect(h[0].sentido).toBe("alta");
    expect(h[0].menorPreco).toBe(100);
    expect(h[0].compras).toBe(3);
  });

  it("uma única compra não tem variação", () => {
    const [h] = historicoDePrecos([compra({})]);
    expect(h.anterior).toBeNull();
    expect(h.variacao).toBeNull();
    expect(h.sentido).toBeNull();
  });

  it("separa unidades diferentes e ignora preço inválido", () => {
    const h = historicoDePrecos([
      compra({ unidade: "SC" }),
      compra({ unidade: "KG", preco: 2 }),
      compra({ preco: 0 }),
      compra({ descricao: "  ", preco: 5 }),
    ]);
    expect(h).toHaveLength(2);
  });

  it("coloca altas primeiro, da maior para a menor", () => {
    const h = historicoDePrecos([
      compra({ descricao: "Adubo A", preco: 100, data: "2026-01-01" }),
      compra({ descricao: "Adubo A", preco: 105, data: "2026-02-01" }),
      compra({ descricao: "Adubo B", preco: 100, data: "2026-01-01" }),
      compra({ descricao: "Adubo B", preco: 130, data: "2026-02-01" }),
      compra({ descricao: "Adubo C", preco: 100, data: "2026-01-01" }),
      compra({ descricao: "Adubo C", preco: 80, data: "2026-02-01" }),
    ]);
    expect(h.map((x) => x.descricao)).toEqual(["Adubo B", "Adubo A", "Adubo C"]);
    expect(h[2].sentido).toBe("queda");
  });
});

describe("resumoEstoque", () => {
  it("soma lotes, valor e menor validade; marca valor parcial", () => {
    const r = resumoEstoque([
      { productId: "p1", nome: "Ureia", unidade: "SC", quantidade: 10, custoUnit: 100, validade: "2027-05-01" },
      { productId: "p1", nome: "Ureia", unidade: "SC", quantidade: 5, custoUnit: null, validade: "2027-01-01" },
      { productId: "p2", nome: "Vacina", unidade: "DS", quantidade: 0, custoUnit: 3, validade: null },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].saldo).toBe(15);
    expect(r[0].valor).toBe(1000);
    expect(r[0].valorParcial).toBe(true);
    expect(r[0].proximaValidade).toBe("2027-01-01");
    expect(r[0].lotes).toBe(2);
  });

  it("agrupa lotes sem produto pelo nome", () => {
    const r = resumoEstoque([
      { productId: null, nome: "Diesel S10", unidade: "L", quantidade: 100, custoUnit: 6, validade: null },
      { productId: null, nome: "DIESEL S10", unidade: "L", quantidade: 50, custoUnit: 6, validade: null },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].saldo).toBe(150);
  });
});
