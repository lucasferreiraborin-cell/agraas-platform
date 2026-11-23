import {
  analisarDiesel, avisoDeLeitura, conferirEstoque, custoDe, estoqueTeorico, itemEhDiesel,
  lerNumero, litrosDoItem, litrosPorCentro, precoMedioPonderado, resumirMaquina,
  type Abastecimento,
} from "@/lib/gestao/diesel";

const ab = (data: string, litros: number, leitura: number | null, extra: Partial<Abastecimento> = {}): Abastecimento => ({
  maquina_id: "m1", data, litros, preco_litro: 6, medidor_leitura: leitura, ...extra,
});

describe("compras de diesel", () => {
  test("NCM 2710.19.21 com ou sem pontos", () => {
    expect(itemEhDiesel("2710.19.21", "OLEO")).toBe(true);
    expect(itemEhDiesel("27101921", null)).toBe(true);
  });
  test("NCM de lubrificante não conta mesmo com 'diesel' na descrição", () => {
    expect(itemEhDiesel("27101932", "LUBRIFICANTE MOTOR DIESEL")).toBe(false);
  });
  test("sem NCM vale a descrição", () => {
    expect(itemEhDiesel(null, "Óleo Diesel S10")).toBe(true);
    expect(itemEhDiesel("", "Ração")).toBe(false);
  });
  test("unidade em litros ou m3", () => {
    expect(litrosDoItem(1000, "L")).toBe(1000);
    expect(litrosDoItem("2", "M3")).toBe(2000);
    expect(litrosDoItem(10, "UN")).toBeNull();
    expect(litrosDoItem(0, "L")).toBeNull();
  });
});

describe("estoque e preço", () => {
  const compras = [
    { data: "2026-11-01", litros: 1000, valor: 6000 },
    { data: "2026-11-10", litros: 3000, valor: 20400 },
  ];
  test("preço médio ponderado por litros", () => {
    expect(precoMedioPonderado(compras)).toBeCloseTo(6.6, 4);
    expect(precoMedioPonderado([])).toBeNull();
  });
  test("estoque = comprado − abastecido", () => {
    const e = estoqueTeorico(compras, [ab("2026-11-02", 300, 10), ab("2026-11-03", 200, 20)]);
    expect(e).toEqual({ comprado: 4000, abastecido: 500, saldo: 3500 });
  });
  test("conferência", () => {
    expect(conferirEstoque({ comprado: 0, abastecido: 50, saldo: -50 }).situacao).toBe("sem_compras");
    expect(conferirEstoque({ comprado: 1000, abastecido: 980, saldo: 20 }).situacao).toBe("conciliado");
    expect(conferirEstoque({ comprado: 1000, abastecido: 1200, saldo: -200 })).toEqual({ situacao: "abastecido_acima", litros: 200 });
    expect(conferirEstoque({ comprado: 1000, abastecido: 500, saldo: 500 })).toEqual({ situacao: "sobra", litros: 500 });
  });
});

describe("custo", () => {
  test("usa preço gravado, cai no de referência, ou deixa fora", () => {
    const abs = [ab("2026-11-01", 100, null), ab("2026-11-02", 100, null, { preco_litro: null })];
    expect(custoDe(abs, 7)).toEqual({ litros: 200, custo: 600 + 700, litrosSemPreco: 0, estimado: true });
    expect(custoDe(abs, null)).toEqual({ litros: 200, custo: 600, litrosSemPreco: 100, estimado: false });
  });
  test("litros por centro, '' = sem centro", () => {
    const m = litrosPorCentro([
      ab("2026-11-01", 100, null, { centro_custo_id: "c1" }),
      ab("2026-11-02", 50, null, { centro_custo_id: "c1" }),
      ab("2026-11-03", 30, null),
    ]);
    expect(m.get("c1")?.litros).toBe(150);
    expect(m.get("")?.litros).toBe(30);
  });
});

describe("consumo por máquina", () => {
  test("horímetro: L/h entre leituras e média ponderada", () => {
    const r = resumirMaquina([ab("2026-11-01", 0.01, 100), ab("2026-11-05", 50, 110), ab("2026-11-09", 60, 120)], "horimetro");
    expect(r.unidade).toBe("L/h");
    expect(r.intervalos.map((i) => i.consumo)).toEqual([5, 6]);
    expect(r.consumoMedio).toBeCloseTo(5.5, 4);
    expect(r.ultimoAbastecimento).toBe("2026-11-09");
  });
  test("odômetro: km/L", () => {
    const r = resumirMaquina([ab("2026-11-01", 40, 1000), ab("2026-11-05", 50, 1500)], "odometro");
    expect(r.unidade).toBe("km/L");
    expect(r.intervalos[0].consumo).toBeCloseTo(10, 4);
  });
  test("alerta quando passa de 20% acima da média das outras leituras", () => {
    const r = resumirMaquina([
      ab("2026-11-01", 1, 100), ab("2026-11-02", 50, 110), ab("2026-11-03", 50, 120),
      ab("2026-11-04", 50, 130), ab("2026-11-05", 80, 140),
    ]);
    expect(r.intervalos.map((i) => i.foraDoPadrao)).toEqual([false, false, false, true]);
    expect(r.intervalos[3].desvio).toBeCloseTo(0.6, 4);
    expect(r.alerta).toBe(true);
  });
  test("exatamente 20% acima não alerta; sem base suficiente não alerta", () => {
    const r = resumirMaquina([
      ab("2026-11-01", 1, 100), ab("2026-11-02", 50, 110), ab("2026-11-03", 50, 120), ab("2026-11-04", 60, 130),
    ]);
    expect(r.alerta).toBe(false);
    const pouco = resumirMaquina([ab("2026-11-01", 1, 100), ab("2026-11-02", 50, 110), ab("2026-11-03", 200, 120)]);
    expect(pouco.alerta).toBe(false);
  });
  test("leitura que volta é inconsistente e não vira consumo", () => {
    const r = resumirMaquina([ab("2026-11-01", 10, 500), ab("2026-11-02", 50, 400), ab("2026-11-03", 50, 410)]);
    expect(r.leiturasInconsistentes).toBe(1);
    expect(r.intervalos).toHaveLength(1);
  });
  test("sem leituras: sem consumo, sem alerta", () => {
    const r = resumirMaquina([ab("2026-11-01", 30, null)]);
    expect(r.consumoMedio).toBeNull();
    expect(r.alerta).toBe(false);
    expect(r.litros).toBe(30);
  });
  test("aceita dados fora de ordem", () => {
    const r = resumirMaquina([ab("2026-11-09", 60, 120), ab("2026-11-01", 1, 100), ab("2026-11-05", 50, 110)]);
    expect(r.intervalos).toHaveLength(2);
  });
});

describe("analisarDiesel", () => {
  test("junta estoque, preço médio, máquinas e centros", () => {
    const a = analisarDiesel({
      comprasDiesel: [{ data: "2026-11-01", litros: 1000, valor: 6500 }],
      abastecimentos: [ab("2026-11-02", 200, 10, { preco_litro: null, centro_custo_id: "c1" })],
    });
    expect(a.estoque.saldo).toBe(800);
    expect(a.precoMedio).toBeCloseTo(6.5, 4);
    expect(a.custo.custo).toBeCloseTo(1300, 4);
    expect(a.porMaquina.get("m1")?.litros).toBe(200);
    expect(a.porCentro.get("c1")?.litros).toBe(200);
  });
});

describe("entrada do usuário", () => {
  test("lerNumero aceita BR e ponto", () => {
    expect(lerNumero("1.234,5")).toBe(1234.5);
    expect(lerNumero("120,5")).toBe(120.5);
    expect(lerNumero("120.5")).toBe(120.5);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
  });
  test("aviso só quando a leitura é menor", () => {
    expect(avisoDeLeitura(100, 90)).toMatch(/menor/);
    expect(avisoDeLeitura(100, 100)).toBeNull();
    expect(avisoDeLeitura(null, 5)).toBeNull();
  });
});
