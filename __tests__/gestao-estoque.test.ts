/**
 * Tests: lib/gestao/estoque.ts e lib/gestao/estoque-entrada.ts — Onda 1 do
 * estoque gerencial.
 *
 * O que se protege: (1) custo médio e baixa proporcional conservam o valor
 * comprado; (2) saldo, alertas e conferência de tanque batem com a conta à
 * mão; (3) "Outros" nunca vira categoria — e o SQL da 181 usa as MESMAS
 * regras e a MESMA taxonomia do app; (4) a nota só entra como compra do
 * ponto de vista do cliente; (5) a conversão lembrada só vale na mesma
 * unidade da nota.
 */

import fs from "node:fs";
import path from "node:path";
import {
  PADROES_CATEGORIA_GENERICA, TAXONOMIA_SUGERIDA, alertaEstoque, categoriaGerencialSugerida, categoriasFaltando,
  conferenciaTanque, custoMedioPonderado, escolherDieselDoTanque, faltaParaMinimo, idDaCategoria, lerQuantidade,
  nomeCategoriaGenerico, produtoEhDiesel, ratearSaida, rotuloMovimento, saldoPorProduto, saldosPorAlmoxarifado,
  sinalDoMovimento, totaisDeMovimentos, validarNomeCategoria, valorPorCategoria,
} from "@/lib/gestao/estoque";
import {
  custoUnitarioDaEntrada, fatorDaEntrada, fatorImplicito, notaEhCompra, quantidadeNaUnidadeDoProduto, tpNfPorCfops,
} from "@/lib/gestao/estoque-entrada";

const SQL_181 = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "181_estoque_gerencial.sql"), "utf8");

// ── Categoria gerencial ──────────────────────────────────────────────────────

describe("nome genérico de categoria", () => {
  it.each(["Outros", "outras", "  OUTROS  ", "Outro", "Outros gastos", "Outras despesas", "Diversos", "Despesas gerais",
    "Gastos diversos", "Materiais diversos", "Sem categoria", "A classificar", "Não classificado", "Geral", "Demais custos"])(
    "rejeita %p", (nome) => {
      expect(nomeCategoriaGenerico(nome)).toBe(true);
      expect(validarNomeCategoria(nome)).toMatch(/não diz para onde vai o dinheiro/);
    });

  it.each(["Peças", "Defensivos", "Outorga de água", "Material de escritório", "Óleos e graxas", "Diesel", "Serviços de manutenção"])(
    "aceita %p", (nome) => {
      expect(nomeCategoriaGenerico(nome)).toBe(false);
      expect(validarNomeCategoria(nome)).toBeNull();
    });

  it("valida tamanho e diz qual campo", () => {
    expect(validarNomeCategoria("A")).toMatch(/O nome precisa/);
    expect(validarNomeCategoria("x".repeat(61), "grupo")).toMatch(/O grupo pode ter no máximo 60/);
  });

  it("o SQL da 181 usa exatamente os mesmos padrões", () => {
    for (const p of PADROES_CATEGORIA_GENERICA) expect(SQL_181).toContain(`'${p}'`);
  });
});

describe("taxonomia sugerida", () => {
  it("é a mesma lista de semear_categorias_gerenciais() na 181", () => {
    const bloco = SQL_181.split("-- TAXONOMIA:INICIO")[1].split("-- TAXONOMIA:FIM")[0];
    const linhas = [...bloco.matchAll(/\('([^']+)', '([^']+)', '([a-z]+)', (\d+), (?:NULL(?:::text)?|'([^']+)')\)/g)]
      .map((m) => ({ grupo: m[1], nome: m[2], tipo: m[3], ordem: Number(m[4]), conta: m[5] ?? null }));
    expect(linhas).toEqual(TAXONOMIA_SUGERIDA);
    expect(linhas).toHaveLength(39);
  });

  it("nenhuma categoria sugerida é genérica e os nomes não se repetem", () => {
    expect(TAXONOMIA_SUGERIDA.filter((c) => nomeCategoriaGenerico(c.nome) || nomeCategoriaGenerico(c.grupo))).toEqual([]);
    expect(new Set(TAXONOMIA_SUGERIDA.map((c) => c.nome.toLowerCase())).size).toBe(TAXONOMIA_SUGERIDA.length);
  });

  it("categoriasFaltando ignora caixa e acento", () => {
    const faltam = categoriasFaltando(["diesel", "PECAS", "Defensivos"]);
    expect(faltam.find((c) => c.nome === "Diesel")).toBeUndefined();
    expect(faltam.find((c) => c.nome === "Peças")).toBeUndefined();
    expect(faltam).toHaveLength(36);
  });
});

describe("categoriaGerencialSugerida", () => {
  it("histórico do cliente vence: mesmo NCM, depois mesma posição", () => {
    const hist = [
      { ncm: "31021010", categoriaNome: "Adubos e fertilizantes" },
      { ncm: "31021010", categoriaNome: "Adubos e fertilizantes" },
      { ncm: "31021010", categoriaNome: "Corretivos de solo" },
      { ncm: "38089299", categoriaNome: "Defensivos" },
    ];
    expect(categoriaGerencialSugerida({ ncm: "3102.10.10" }, hist)).toMatchObject({ nome: "Adubos e fertilizantes", base: "historico" });
    expect(categoriaGerencialSugerida({ ncm: "38089111" }, hist)).toMatchObject({ nome: "Defensivos", base: "historico" });
  });

  it("sem histórico, separa o que o catálogo junta", () => {
    expect(categoriaGerencialSugerida({ ncm: "27101921" })?.nome).toBe("Diesel");
    expect(categoriaGerencialSugerida({ ncm: "27101932", descricao: "OLEO LUBRIFICANTE 15W40" })?.nome).toBe("Óleos e graxas");
    expect(categoriaGerencialSugerida({ ncm: "40117000", descricao: "PNEU TRATOR 18.4-34" })?.nome).toBe("Pneus e câmaras");
    expect(categoriaGerencialSugerida({ ncm: "84212300", descricao: "FILTRO DE OLEO" })?.nome).toBe("Filtros");
    expect(categoriaGerencialSugerida({ ncm: "31021010", descricao: "ARLA 32 BALDE 20L" })?.nome).toBe("ARLA 32");
    expect(categoriaGerencialSugerida({ ncm: "31021010", descricao: "Ureia agrícola 46% N" })?.nome).toBe("Adubos e fertilizantes");
    expect(categoriaGerencialSugerida({ ncm: "25210000", descricao: "CALCARIO DOLOMITICO" })?.nome).toBe("Corretivos de solo");
    expect(categoriaGerencialSugerida({ ncm: "01022990", descricao: "BEZERRO NELORE" })?.nome).toBe("Compra de animais");
  });

  it("cai na regra do de-para (sal mineral, vacina, peça)", () => {
    expect(categoriaGerencialSugerida({ ncm: "23099090", descricao: "Sal mineral 80P saco 30kg" })?.nome).toBe("Sal mineral e suplementos");
    expect(categoriaGerencialSugerida({ ncm: "30023000", descricao: "VACINA AFTOSA" })?.nome).toBe("Vacinas e medicamentos");
    expect(categoriaGerencialSugerida({ ncm: "87089990", descricao: "CRUZETA" })?.nome).toBe("Peças");
  });

  it("sem base não chuta (serviço, NCM desconhecido, vazio)", () => {
    expect(categoriaGerencialSugerida({ ncm: "00", descricao: "MAO DE OBRA" })).toBeNull();
    expect(categoriaGerencialSugerida({ ncm: "22029900", descricao: "ENERGETICO" })).toBeNull();
    expect(categoriaGerencialSugerida({})).toBeNull();
  });

  it("idDaCategoria acha pelo nome sem caixa nem acento e ignora inativa", () => {
    const cats = [
      { id: "a", nome: "Sal mineral e suplementos" },
      { id: "b", nome: "Oleos e graxas", ativo: false },
    ];
    expect(idDaCategoria(cats, "SAL MINERAL E SUPLEMENTOS")).toBe("a");
    expect(idDaCategoria(cats, "Óleos e graxas")).toBeNull();
    expect(idDaCategoria(cats, null)).toBeNull();
  });
});

// ── Custo médio e baixa ──────────────────────────────────────────────────────

describe("custoMedioPonderado", () => {
  it("pondera pelo saldo e ignora lote zerado ou sem custo", () => {
    expect(custoMedioPonderado([
      { id: "1", quantidade: 4737, custoUnit: 6.09 },
      { id: "2", quantidade: 3000, custoUnit: 6.29 },
      { id: "3", quantidade: 0, custoUnit: 99 },
      { id: "4", quantidade: 10, custoUnit: null },
    ])).toBeCloseTo((4737 * 6.09 + 3000 * 6.29) / 7737, 9);
  });
  it("null sem lote com custo", () => {
    expect(custoMedioPonderado([{ id: "1", quantidade: 5, custoUnit: null }])).toBeNull();
    expect(custoMedioPonderado([])).toBeNull();
  });
});

describe("ratearSaida", () => {
  const lotes = [{ id: "a", quantidade: 4737 }, { id: "b", quantidade: 3000 }];

  it("baixa proporcional: a soma bate e o custo médio do que fica não muda", () => {
    const { baixas, excesso } = ratearSaida(lotes, 1000);
    expect(excesso).toBe(0);
    expect(baixas.reduce((s, b) => s + b.quantidade, 0)).toBeCloseTo(1000, 6);
    const custo = { a: 6.09, b: 6.29 } as Record<string, number>;
    const antes = custoMedioPonderado(lotes.map((l) => ({ ...l, custoUnit: custo[l.id] })))!;
    const depois = custoMedioPonderado(lotes.map((l) => ({
      id: l.id, custoUnit: custo[l.id], quantidade: l.quantidade - (baixas.find((b) => b.id === l.id)?.quantidade ?? 0),
    })))!;
    expect(depois).toBeCloseTo(antes, 5);
  });

  it("valor das saídas + valor que fica = valor comprado", () => {
    const custo = { a: 6.09, b: 6.29 } as Record<string, number>;
    const medio = custoMedioPonderado(lotes.map((l) => ({ ...l, custoUnit: custo[l.id] })))!;
    const { baixas } = ratearSaida(lotes, 2500.5);
    const fica = lotes.reduce((s, l) => s + (l.quantidade - (baixas.find((b) => b.id === l.id)?.quantidade ?? 0)) * custo[l.id], 0);
    expect(fica + 2500.5 * medio).toBeCloseTo(4737 * 6.09 + 3000 * 6.29, 2);
  });

  it("arredondamento em terços não perde nem sobra quantidade", () => {
    const r = ratearSaida([{ id: "x", quantidade: 1 }, { id: "y", quantidade: 1 }, { id: "z", quantidade: 1 }], 1);
    expect(r.baixas.reduce((s, b) => s + b.quantidade, 0)).toBeCloseTo(1, 9);
    for (const b of r.baixas) expect(b.quantidade).toBeLessThanOrEqual(1);
  });

  it("pedir tudo zera os lotes; pedir mais devolve o excesso", () => {
    expect(ratearSaida(lotes, 7737).baixas).toEqual([{ id: "a", quantidade: 4737 }, { id: "b", quantidade: 3000 }]);
    expect(ratearSaida(lotes, 8000)).toEqual({ baixas: [{ id: "a", quantidade: 4737 }, { id: "b", quantidade: 3000 }], excesso: 263 });
    expect(ratearSaida([], 5)).toEqual({ baixas: [], excesso: 5 });
    expect(ratearSaida([{ id: "n", quantidade: -10 }], 5)).toEqual({ baixas: [], excesso: 5 });
  });
});

// ── Saldos e alertas ─────────────────────────────────────────────────────────

describe("saldos", () => {
  const lotes = [
    { productId: "diesel", almoxarifadoId: "tanque", quantidade: 1000, custoUnit: 6.09 },
    { productId: "diesel", almoxarifadoId: "tanque", quantidade: 968, custoUnit: 6.29 },
    { productId: "ureia", almoxarifadoId: "insumos", quantidade: 16, custoUnit: 3240 },
    { productId: "ureia", almoxarifadoId: null, quantidade: 2, custoUnit: null },
    { productId: "sal", almoxarifadoId: "insumos", quantidade: -40, custoUnit: 98 },
    { productId: "zerado", almoxarifadoId: "insumos", quantidade: 0, custoUnit: 1 },
  ];

  it("agrupa por produto e almoxarifado, com custo médio e valor", () => {
    const s = saldosPorAlmoxarifado(lotes);
    const diesel = s.find((x) => x.productId === "diesel")!;
    expect(diesel.saldo).toBe(1968);
    expect(diesel.valor).toBeCloseTo(1000 * 6.09 + 968 * 6.29, 2);
    expect(diesel.custoMedio).toBeCloseTo((1000 * 6.09 + 968 * 6.29) / 1968, 9);
    expect(s.find((x) => x.productId === "ureia" && x.almoxarifadoId === null)?.valorParcial).toBe(true);
    expect(s.find((x) => x.productId === "sal")).toMatchObject({ saldo: -40, valor: 0 });
    expect(s.find((x) => x.productId === "zerado")).toBeUndefined();
  });

  it("soma por produto e valor por categoria", () => {
    const s = saldosPorAlmoxarifado(lotes);
    expect(saldoPorProduto(s).get("ureia")).toEqual({ saldo: 18, valor: 51840 });
    const cat = valorPorCategoria(s, new Map([["diesel", "c-diesel"], ["ureia", "c-adubo"], ["sal", "c-sal"]]));
    expect(cat[0]).toEqual({ categoriaId: "c-adubo", valor: 51840, produtos: 1 });
    expect(cat.find((c) => c.categoriaId === "c-sal")).toBeUndefined(); // saldo negativo não é imobilizado
  });

  it("alertas de mínimo e máximo", () => {
    expect(alertaEstoque(1968, 2500, 15000)).toBe("abaixo");
    expect(alertaEstoque(16, 2, 12)).toBe("acima");
    expect(alertaEstoque(5, 2, 12)).toBeNull();
    expect(alertaEstoque(0, 20, null)).toBe("abaixo");
    expect(alertaEstoque(100, null, undefined)).toBeNull();
    expect(alertaEstoque(5, 0, 0)).toBeNull();
    expect(faltaParaMinimo(1968, 2500)).toBe(532);
    expect(faltaParaMinimo(3000, 2500)).toBe(0);
  });
});

// ── Conferência de tanque ────────────────────────────────────────────────────

describe("conferenciaTanque", () => {
  const base = { entradas: 7800, saidas: 5832 };

  it("esperado = comprado − saídas; sem contagem não julga", () => {
    expect(conferenciaTanque({ ...base, contagem: null })).toMatchObject({ esperado: 1968, situacao: "sem_contagem", diferenca: null });
  });

  it("falta além da tolerância é perda/desvio a explicar", () => {
    const c = conferenciaTanque({ ...base, contagem: 1850 });
    expect(c.diferenca).toBe(-118);
    expect(c.percentual).toBeCloseTo(-118 / 7800, 9);
    expect(c.situacao).toBe("perda");
  });

  it("até 1% do comprado é medição", () => {
    expect(conferenciaTanque({ ...base, contagem: 1900 }).situacao).toBe("dentro_da_tolerancia"); // −68 L ≤ 78 L
    expect(conferenciaTanque({ ...base, contagem: 2100 }).situacao).toBe("sobra");
  });

  it("usa o saldo do sistema quando informado e confere a capacidade", () => {
    expect(conferenciaTanque({ ...base, saldoSistema: 1900, contagem: 1900 })).toMatchObject({ esperado: 1900, diferenca: 0, situacao: "dentro_da_tolerancia" });
    expect(conferenciaTanque({ ...base, contagem: 16000, capacidade: 15000 }).situacao).toBe("acima_da_capacidade");
    expect(conferenciaTanque({ ...base, contagem: -1 }).situacao).toBe("contagem_invalida");
  });

  it("sem nenhuma entrada, qualquer diferença conta", () => {
    expect(conferenciaTanque({ entradas: 0, saidas: 0, contagem: 50 })).toMatchObject({ percentual: null, situacao: "sobra" });
  });
});

// ── Movimentos e números ─────────────────────────────────────────────────────

describe("movimentos", () => {
  it("sinal pelo destino (181) ou pelo tipo legado", () => {
    expect(sinalDoMovimento({ destinoTipo: "entrada", movementType: "adjustment" })).toBe(1);
    expect(sinalDoMovimento({ destinoTipo: "abastecimento", movementType: "application" })).toBe(-1);
    expect(sinalDoMovimento({ destinoTipo: null, movementType: "entry" })).toBe(1);
    expect(sinalDoMovimento({ movementType: "application" })).toBe(-1);
  });

  it("rótulos e totais", () => {
    expect(rotuloMovimento({ destinoTipo: "entrada", movementType: "entry" })).toBe("Entrada de nota");
    expect(rotuloMovimento({ destinoTipo: "entrada", movementType: "adjustment" })).toBe("Entrada sem nota");
    expect(rotuloMovimento({ destinoTipo: "ajuste" })).toBe("Ajuste de inventário");
    expect(rotuloMovimento({ movementType: "entry" })).toBe("Entrada");
    expect(totaisDeMovimentos([
      { quantidade: 4800, destinoTipo: "entrada" }, { quantidade: 63, destinoTipo: "abastecimento" },
      { quantidade: 3000, movementType: "entry" }, { quantidade: 5, destinoTipo: "ajuste" },
    ])).toEqual({ entradas: 7800, saidas: 68 });
  });

  it("lerQuantidade aceita formato BR", () => {
    expect(lerQuantidade("1.234,5")).toBe(1234.5);
    expect(lerQuantidade("1.500")).toBe(1500);
    expect(lerQuantidade("0,5")).toBe(0.5);
    expect(lerQuantidade("12.75")).toBe(12.75);
    expect(lerQuantidade("abc")).toBeNull();
    expect(lerQuantidade("")).toBeNull();
  });
});

describe("diesel do tanque", () => {
  const diesel = { id: "d", nome: "Óleo diesel S10", ncm: "27101921", ativo: true, almoxarifadoPadraoId: "t1" };
  const tanques = [{ id: "t1", tipo: "combustivel", ativo: true }, { id: "p", tipo: "pecas", ativo: true }];

  it("reconhece diesel por NCM, nome ou categoria — e não lubrificante", () => {
    expect(produtoEhDiesel(diesel)).toBe(true);
    expect(produtoEhDiesel({ nome: "Diesel comum", ncm: null })).toBe(true);
    expect(produtoEhDiesel({ nome: "Combustível", ncm: "27102000" })).toBe(true);
    expect(produtoEhDiesel({ nome: "Óleo motor diesel 15W40", ncm: "27101932" })).toBe(false);
    expect(produtoEhDiesel({ nome: "S10", ncm: null, categoriaNome: "Diesel" })).toBe(true);
  });

  it("escolhe o tanque padrão do produto; sem diesel ou sem tanque, nada", () => {
    expect(escolherDieselDoTanque([diesel], tanques, () => 0)).toEqual({ produtoId: "d", almoxarifadoId: "t1" });
    expect(escolherDieselDoTanque([], tanques, () => 0)).toBeNull();
    expect(escolherDieselDoTanque([diesel], [{ id: "p", tipo: "pecas", ativo: true }], () => 0)).toBeNull();
    expect(escolherDieselDoTanque([{ ...diesel, ativo: false }], tanques, () => 0)).toBeNull();
  });

  it("com dois tanques e produto sem padrão, vence o que tem saldo", () => {
    const semPadrao = { ...diesel, almoxarifadoPadraoId: null };
    const dois = [{ id: "t1", tipo: "combustivel", ativo: true }, { id: "t2", tipo: "combustivel", ativo: true }];
    expect(escolherDieselDoTanque([semPadrao], dois, (_p, a) => (a === "t2" ? 500 : 0))).toEqual({ produtoId: "d", almoxarifadoId: "t2" });
  });
});

// ── Entrada da nota ──────────────────────────────────────────────────────────

describe("notaEhCompra (ponto de vista do cliente)", () => {
  it("títulos decididos pelo XML mandam", () => {
    expect(notaEhCompra({ tiposTitulos: ["pagar"], cfops: ["5102"] })).toBe(true);
    expect(notaEhCompra({ tiposTitulos: ["receber"], cfops: ["5102"] })).toBe(false);
  });

  it("venda antiga sem NF-e nunca é compra", () => {
    expect(notaEhCompra({ numero: "VENDA-BACKFILL-cfd83167", tiposTitulos: ["pagar"] })).toBe(false);
  });

  it("sem título: CFOP 5xxx do fornecedor = compra do produtor (não usa direction)", () => {
    expect(notaEhCompra({ cfops: ["5102"], emitenteDoc: "99999999000280" })).toBe(true);
    expect(notaEhCompra({ cfops: [null], emitenteDoc: "99999999000280" })).toBe(true);
  });

  it("produtor emitente (CPF) vendendo é venda; contranota do frigorífico é venda", () => {
    expect(notaEhCompra({ cfops: ["5101"], emitenteDoc: "12345678901", destinatarioDoc: "02916265000160" })).toBe(false);
    expect(notaEhCompra({ cfops: ["1101"], emitenteDoc: "02916265000160", destinatarioDoc: "12345678901" })).toBe(false);
  });

  it("tpNF aproximado pelos CFOPs", () => {
    expect(tpNfPorCfops(["1102", "5102"])).toBe(1);
    expect(tpNfPorCfops(["1102"])).toBe(0);
    expect(tpNfPorCfops([null, ""])).toBeNull();
  });
});

describe("conversão de unidade na entrada", () => {
  it("fator lembrado só vale na mesma unidade da nota", () => {
    const apelido = { unidadeNota: "GL", fatorConversao: 20 };
    expect(fatorDaEntrada({ descricao: "GLIFOSATO 480", unidade: "gl" }, "L", apelido)).toEqual({ fator: 20, origem: "lembrado" });
    expect(fatorDaEntrada({ descricao: "GLIFOSATO 480 BB 5L", unidade: "BB" }, "L", apelido)).toEqual({ fator: 5, origem: "calculado" });
  });

  it("calcula pelo conteúdo da embalagem e pelas unidades SI", () => {
    expect(fatorDaEntrada({ descricao: "Sal mineral 80P saco 30kg", unidade: "SC" }, "KG")).toEqual({ fator: 30, origem: "calculado" });
    expect(fatorDaEntrada({ descricao: "Ureia agrícola 46% N", unidade: "T" }, "KG")).toEqual({ fator: 1000, origem: "calculado" });
    expect(fatorDaEntrada({ descricao: "Óleo diesel S10", unidade: "L" }, "L")).toEqual({ fator: 1, origem: "calculado" });
    expect(fatorDaEntrada({ descricao: "BRINCO BOTTON", unidade: "PC" }, "KG")).toEqual({ fator: null, origem: "desconhecido" });
  });

  it("quantidade e custo convertidos preservam o valor da nota", () => {
    const q = quantidadeNaUnidadeDoProduto(40, 30)!;
    expect(q).toBe(1200);
    expect(custoUnitarioDaEntrada(3920, q)! * q).toBeCloseTo(3920, 3);
    expect(quantidadeNaUnidadeDoProduto(40, null)).toBeNull();
    expect(custoUnitarioDaEntrada(0, 10)).toBeNull();
    expect(fatorImplicito(40, 1200)).toBe(30);
    expect(fatorImplicito(0, 1200)).toBeNull();
  });
});
