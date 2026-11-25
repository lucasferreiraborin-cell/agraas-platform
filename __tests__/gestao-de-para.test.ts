/**
 * Tests: lib/gestao/de-para.ts — item da nota → produto da fazenda.
 *
 * O que se protege: (1) a chave do apelido é estável para as grafias que os
 * fornecedores realmente usam; (2) só liga sozinho o que foi confirmado;
 * (3) a sugestão segue a ordem GTIN > mesmo nome > NCM+nome > NCM > nome, e
 * NCM de outra posição bloqueia casamento só por nome.
 */

import {
  CATEGORIAS, categoriaPorNcm, chaveApelido, conteudoDaEmbalagem, conversaoParaProdutoNovo, converterUnidade,
  ehCategoria, fatorParaProduto, formatarNcm, gtinValido, gtinsPorDescricao,
  indexar, mesmoNome, nomeSugerido, normalizarDoc, normalizarNcm, normalizarTexto, nucleo,
  resolverItem, rotuloCategoria, separarItens, similaridade, unidadeBase,
  type Apelido, type ItemDeNota, type ProdutoCanonico,
} from "@/lib/gestao/de-para";

// ── Normalização ────────────────────────────────────────────────────────────

describe("normalizarTexto", () => {
  it("embalagem 'SC 30KG' em todas as grafias vira a mesma chave", () => {
    const k = "sal mineral sc 30kg";
    expect(normalizarTexto("SAL MINERAL SC 30KG")).toBe(k);
    expect(normalizarTexto("Sal Mineral Saco 30 kg")).toBe(k);
    expect(normalizarTexto("SAL MINERAL SC C/ 30 KGS")).toBe(k);
    expect(normalizarTexto("SAL MINERAL SC30KG")).toBe(k);
  });

  it("volume '5L', '20 Lts', '20 LITROS'", () => {
    expect(normalizarTexto("GLIFOSATO 5L")).toBe("glifosato 5l");
    expect(normalizarTexto("ROUNDUP ORIGINAL DI 20L")).toBe("roundup original di 20l");
    expect(normalizarTexto("Roundup Original DI 20 Lts")).toBe("roundup original di 20l");
    expect(normalizarTexto("ROUNDUP ORIGINAL DI 20 LITROS")).toBe("roundup original di 20l");
  });

  it("percentual com vírgula, ponto, espaço e zero sobrando", () => {
    expect(normalizarTexto("IVERMECTINA 1%")).toBe("ivermectina 1%");
    expect(normalizarTexto("Ivermectina 1,0 %")).toBe("ivermectina 1%");
    expect(normalizarTexto("IVERMECTINA 1.0%")).toBe("ivermectina 1%");
    expect(normalizarTexto("Uréia 46,00%")).toBe("ureia 46%");
  });

  it("milhar BR, decimal com vírgula e conversão 1000 ml = 1 l", () => {
    expect(normalizarTexto("BIMECTIN 1.000 ML")).toBe("bimectin 1l");
    expect(normalizarTexto("BIMECTIN 1000ML")).toBe("bimectin 1l");
    expect(normalizarTexto("BIMECTIN 1 LT")).toBe("bimectin 1l");
    expect(normalizarTexto("ADJUVANTE 1,5 L")).toBe("adjuvante 1.5l");
    expect(normalizarTexto("SEMENTE 0,500 KG")).toBe("semente 0.5kg");
    expect(normalizarTexto("FERT 20-00-20 BAG 1000KG")).toBe("fert 20-0-20 bag 1t");
  });

  it("acento, hífen de código e multiplicador", () => {
    expect(normalizarTexto("Óleo Diesel S-10")).toBe(normalizarTexto("OLEO DIESEL S10"));
    expect(normalizarTexto("ÓLEO 2T CX 12 X 1 L")).toBe("oleo 2t cx 12x1l");
    expect(normalizarTexto("Vacina Aftosa 50 doses")).toBe(normalizarTexto("VACINA AFTOSA 50DS"));
  });

  it("embalagem diferente continua sendo apelido diferente", () => {
    expect(normalizarTexto("GLIFOSATO 20L")).not.toBe(normalizarTexto("GLIFOSATO 5L"));
  });

  it("vazio e nulo viram string vazia", () => {
    expect(normalizarTexto("   ")).toBe("");
    expect(normalizarTexto(null)).toBe("");
  });
});

describe("nucleo", () => {
  it("tira embalagem, quantidade e palavra de ligação; mantém código", () => {
    expect(nucleo(normalizarTexto("GLIFOSATO NORTOX 480 SL BB 20 LT"))).toEqual(["glifosato", "nortox", "sl"]);
    expect(nucleo(normalizarTexto("Óleo diesel S10"))).toEqual(["oleo", "diesel", "s10"]);
    expect(nucleo(normalizarTexto("Sal mineral para bovinos SC 30KG"))).toEqual(["sal", "mineral", "bovinos"]);
  });
});

describe("mesmoNome", () => {
  it("ignora caixa, acento e espaço", () => {
    expect(mesmoNome("Ração Engorda", "racao  ENGORDA")).toBe(true);
    expect(mesmoNome("Glifosato", "Glifosato 20L")).toBe(false);
    expect(mesmoNome("", "")).toBe(false);
  });
});

describe("normalizarDoc", () => {
  it("CNPJ numérico, CNPJ alfanumérico e CPF", () => {
    expect(normalizarDoc("11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizarDoc("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(normalizarDoc("123.456.789-09")).toBe("12345678909");
  });
  it("lixo e vazio viram null", () => {
    expect(normalizarDoc("123")).toBeNull();
    expect(normalizarDoc("")).toBeNull();
    expect(normalizarDoc(null)).toBeNull();
    expect(normalizarDoc("12.ABC.345/01DE-3X")).toBeNull(); // DV do CNPJ é sempre numérico
  });
});

describe("NCM", () => {
  it("normaliza para 8 dígitos e formata para exibição", () => {
    expect(normalizarNcm("3808.93.24")).toBe("38089324");
    expect(normalizarNcm("3808")).toBeNull();
    expect(formatarNcm("38089324")).toBe("3808.93.24");
  });
});

describe("gtinValido", () => {
  it("aceita GTIN-13 e GTIN-8 com dígito verificador certo, em 14 posições", () => {
    expect(gtinValido("4006381333931")).toBe("04006381333931");
    expect(gtinValido("96385074")).toBe("00000096385074");
  });
  it("recusa DV errado, 'SEM GTIN', zeros e tamanho fora do padrão", () => {
    expect(gtinValido("4006381333932")).toBeNull();
    expect(gtinValido("SEM GTIN")).toBeNull();
    expect(gtinValido("00000000")).toBeNull();
    expect(gtinValido("1234567")).toBeNull();
    expect(gtinValido(null)).toBeNull();
  });
});

describe("gtinsPorDescricao", () => {
  it("lê o cEAN de cada <det> pela descrição normalizada; ignora 'SEM GTIN'", () => {
    const xml = `<NFe><infNFe><det nItem="1"><prod><cProd>1</cProd><cEAN>4006381333931</cEAN><xProd>HERBICIDA X 20 LT</xProd></prod></det>`
      + `<det nItem="2"><prod><cProd>2</cProd><cEAN>SEM GTIN</cEAN><xProd>SAL MINERAL SC 30KG</xProd></prod></det></infNFe></NFe>`;
    const m = gtinsPorDescricao(xml);
    expect(m.get("herbicida x 20l")).toBe("04006381333931");
    expect(m.has("sal mineral sc 30kg")).toBe(false);
  });
});

describe("nomeSugerido", () => {
  it("tira embalagem e quantidade e desfaz a CAIXA ALTA", () => {
    expect(nomeSugerido("ROUNDUP ORIGINAL DI 20L")).toBe("Roundup Original DI");
    expect(nomeSugerido("SAL MINERAL BOVINOS SC 30KG")).toBe("Sal Mineral Bovinos");
    expect(nomeSugerido("IVERMECTINA 1% 500ML")).toBe("Ivermectina 1%");
    expect(nomeSugerido("VACINA AFTOSA 50 DOSES")).toBe("Vacina Aftosa");
    expect(nomeSugerido("GLIFOSATO 480 SL BB 20 LT")).toBe("Glifosato 480 SL");
    expect(nomeSugerido("OLEO DIESEL S10")).toBe("Oleo Diesel S10");
  });
  it("texto que já vem bem escrito fica como está", () => {
    expect(nomeSugerido("Óleo diesel S10")).toBe("Óleo diesel S10");
    expect(nomeSugerido("Ureia agrícola 46% N")).toBe("Ureia agrícola 46% N");
  });
  it("se sobrar nada, devolve o original; vazio continua vazio", () => {
    expect(nomeSugerido("20L")).toBe("20L");
    expect(nomeSugerido("  ")).toBe("");
  });
});

// ── Unidade e fator de conversão ────────────────────────────────────────────

describe("conteudoDaEmbalagem", () => {
  it("lê o conteúdo de uma unidade comercial na descrição", () => {
    expect(conteudoDaEmbalagem("GLIFOSATO GL 20L")).toEqual({ quantidade: 20, unidade: "l" });
    expect(conteudoDaEmbalagem("SAL MINERAL SC 30 KGS")).toEqual({ quantidade: 30, unidade: "kg" });
    expect(conteudoDaEmbalagem("BIMECTIN 500ML")).toEqual({ quantidade: 500, unidade: "ml" });
    expect(conteudoDaEmbalagem("VACINA AFTOSA 50 DOSES")).toEqual({ quantidade: 50, unidade: "dose" });
    expect(conteudoDaEmbalagem("ADJUVANTE 1,5 LT")).toEqual({ quantidade: 1.5, unidade: "l" });
    expect(conteudoDaEmbalagem("FERT 20-00-20 BAG 1.000 KG")).toEqual({ quantidade: 1000, unidade: "kg" });
  });

  it("caixa com várias unidades multiplica; concentração antes do conteúdo não engana", () => {
    expect(conteudoDaEmbalagem("ÓLEO 2T CX 12 X 1 L")).toEqual({ quantidade: 12, unidade: "l" });
    expect(conteudoDaEmbalagem("GLIFOSATO 480 G/L SL BB 20L")).toEqual({ quantidade: 20, unidade: "l" });
  });

  it("sem medida, ou '2T' de óleo dois tempos: nada", () => {
    expect(conteudoDaEmbalagem("UREIA AGRICOLA 46% N")).toBeNull();
    expect(conteudoDaEmbalagem("ÓLEO MOTOR 2T")).toBeNull();
    expect(conteudoDaEmbalagem("OLEO DIESEL S10")).toBeNull();
  });
});

describe("unidadeBase e converterUnidade", () => {
  it("medida vira base; embalagem não", () => {
    expect(unidadeBase("L")).toBe("l");
    expect(unidadeBase("Litro")).toBe("l");
    expect(unidadeBase("KG")).toBe("kg");
    expect(unidadeBase("T")).toBe("t");
    expect(unidadeBase("PÇ")).toBe("un");
    expect(unidadeBase("GL")).toBeNull();
    expect(unidadeBase("SC")).toBeNull();
    expect(unidadeBase(null)).toBeNull();
  });
  it("SI dentro da grandeza; grandezas diferentes não convertem", () => {
    expect(converterUnidade(1, "t", "kg")).toBe(1000);
    expect(converterUnidade(500, "ml", "l")).toBe(0.5);
    expect(converterUnidade(1, "m3", "l")).toBe(1000);
    expect(converterUnidade(20, "l", "kg")).toBeNull();
  });
});

describe("fatorParaProduto (ligar a produto existente)", () => {
  const f = (descricao: string, unidade: string | null, unidadeProduto: string | null) =>
    fatorParaProduto({ descricao, unidade }, unidadeProduto);

  it("embalagem com conteúdo na descrição: o exemplo do pedido, GL 20L → 20 L", () => {
    expect(f("GLIFOSATO GL 20L", "GL", "L")).toBe(20);
    expect(f("GLIFOSATO GL 20L", "GL", "ml")).toBe(20000);
    expect(f("SAL MINERAL SC 30KG", "SC", "KG")).toBe(30);
    expect(f("BIMECTIN 500ML", "FR", "L")).toBe(0.5);
  });

  it("nota já em unidade de medida converte direto", () => {
    expect(f("Óleo diesel S10", "L", "L")).toBe(1);
    expect(f("UREIA 46%", "T", "KG")).toBe(1000);
  });

  it("mesma embalagem dos dois lados é 1; o resto fica em branco (não chuta)", () => {
    expect(f("SEMENTE SOJA BRS", "SC", "SC")).toBe(1);
    expect(f("FILTRO DE OLEO", "UN", "UN")).toBe(1);
    expect(f("GLIFOSATO GL 20L", "GL", "KG")).toBeNull();
    expect(f("SEMENTE SOJA BRS", "SC", "KG")).toBeNull();
    expect(f("VACINA AFTOSA 50 DOSES", "FR", "ml")).toBeNull();
    expect(f("QUALQUER", "L", null)).toBeNull();
  });
});

describe("conversaoParaProdutoNovo", () => {
  it("produto novo nasce na unidade de medida, não na embalagem", () => {
    expect(conversaoParaProdutoNovo({ descricao: "GLIFOSATO GL 20L", unidade: "GL" })).toEqual({ unidade: "L", fator: 20 });
    expect(conversaoParaProdutoNovo({ descricao: "SAL MINERAL 30KG", unidade: "UN" })).toEqual({ unidade: "KG", fator: 30 });
    expect(conversaoParaProdutoNovo({ descricao: "Óleo diesel S10", unidade: "L" })).toEqual({ unidade: "L", fator: 1 });
  });
  it("sem medida na descrição, fica na unidade da nota com fator 1; sem unidade, em branco", () => {
    expect(conversaoParaProdutoNovo({ descricao: "SEMENTE SOJA BRS", unidade: "sc" })).toEqual({ unidade: "SC", fator: 1 });
    expect(conversaoParaProdutoNovo({ descricao: "FILTRO DE OLEO", unidade: "UN" })).toEqual({ unidade: "UN", fator: 1 });
    expect(conversaoParaProdutoNovo({ descricao: "ALGO", unidade: "" })).toEqual({ unidade: null, fator: null });
  });
  it("o fator do produto novo é o mesmo que o servidor recalcula ao gravar", () => {
    for (const it of [
      { descricao: "GLIFOSATO GL 20L", unidade: "GL" }, { descricao: "SAL MINERAL 30KG", unidade: "UN" },
      { descricao: "SEMENTE SOJA BRS", unidade: "SC" }, { descricao: "BIMECTIN 500ML", unidade: "FR" },
    ]) {
      const c = conversaoParaProdutoNovo(it);
      expect(fatorParaProduto(it, c.unidade)).toBe(c.fator);
    }
  });
});

// ── Categoria por NCM ───────────────────────────────────────────────────────

describe("categoriaPorNcm", () => {
  const cat = (n: string | null) => categoriaPorNcm(n)?.categoria ?? null;

  it("regras pedidas: diesel, fertilizante, defensivo, ração, medicamento, peça", () => {
    expect(categoriaPorNcm("2710.19.21")).toMatchObject({ categoria: "diesel", base: "FATO" });
    expect(cat("31021010")).toBe("fertilizante");
    expect(cat("38089299")).toBe("defensivo");
    expect(cat("23099090")).toBe("racao");
    expect(cat("30049099")).toBe("medicamento");
    expect(cat("87089990")).toBe("peca");
    expect(cat("84339090")).toBe("peca");
  });

  it("usa o vocabulário de products: vacina (30.02) e suplemento (sal mineral em 23.09, sal comum)", () => {
    expect(categoriaPorNcm("30024200")).toMatchObject({ categoria: "vacina", base: "PREMISSA" });
    expect(categoriaPorNcm("23099090", "SAL MINERAL BOVINOS SC 30KG")).toMatchObject({ categoria: "suplemento", base: "PREMISSA" });
    expect(categoriaPorNcm("23099090", "RAÇÃO ENGORDA 22% PB")).toMatchObject({ categoria: "racao", base: "FATO" });
    expect(cat("25010019")).toBe("suplemento");
  });

  it("semente só na subposição de semeadura; grão e máquina inteira não", () => {
    expect(categoriaPorNcm("12011000")).toMatchObject({ categoria: "semente", base: "FATO" });
    expect(categoriaPorNcm("10051000")).toMatchObject({ categoria: "semente", base: "FATO" });
    expect(categoriaPorNcm("12019000")).toMatchObject({ categoria: "outro", base: "PREMISSA" });
    expect(categoriaPorNcm("10059010")).toMatchObject({ categoria: "racao", base: "PREMISSA" });
    expect(categoriaPorNcm("84335100")).toMatchObject({ categoria: "outro", base: "PREMISSA" });
  });

  it("desinfetante (3808.94) não é defensivo; serviço é NCM 00", () => {
    expect(cat("38089419")).toBe("outro");
    expect(categoriaPorNcm("00")).toMatchObject({ categoria: "servico", base: "FATO" });
  });

  it("toda regra diz se é FATO ou PREMISSA e devolve categoria válida", () => {
    for (const n of ["27101921", "27102000", "31", "3808", "1201", "1005", "2309", "2501", "3002", "3004", "8708", "843290", "4011"]) {
      const r = categoriaPorNcm(n)!;
      expect(["FATO", "PREMISSA"]).toContain(r.base);
      expect(ehCategoria(r.categoria)).toBe(true);
      expect(r.motivo.length).toBeGreaterThan(10);
    }
    expect(CATEGORIAS).toHaveLength(14);
  });

  it("rótulo de qualquer products.category, inclusive valor fora da lista", () => {
    expect(rotuloCategoria("peca")).toBe("Peça");
    expect(rotuloCategoria("vermifugo")).toBe("Vermífugo");
    expect(rotuloCategoria("hormonio")).toBe("Hormonio");
    expect(rotuloCategoria(null)).toBe("Sem categoria");
  });

  it("sem regra ou sem NCM: null", () => {
    expect(categoriaPorNcm("99999999")).toBeNull();
    expect(categoriaPorNcm(null)).toBeNull();
    expect(categoriaPorNcm("")).toBeNull();
  });
});

// ── Similaridade ────────────────────────────────────────────────────────────

describe("similaridade", () => {
  it("nome curto contido no nome do fornecedor é muito parecido", () => {
    expect(similaridade("Glifosato", "GLIFOSATO NORTOX 480 SL BB 20 LT")).toBeGreaterThanOrEqual(0.8);
    expect(similaridade("Óleo diesel S10", "OLEO DIESEL B S10 ADITIVADO")).toBeGreaterThanOrEqual(0.7);
  });

  it("código que não bate (S10 × S500) derruba a nota: produto irmão, não o mesmo", () => {
    const s = similaridade("Óleo diesel S10", "OLEO DIESEL S500");
    expect(s).toBeLessThan(0.7);
    expect(s).toBeGreaterThan(0.4);
  });

  it("prefixo comum não engana; nomes sem relação dão perto de zero", () => {
    expect(similaridade("Sal", "Salinomicina 12%")).toBeLessThan(0.45);
    expect(similaridade("Ureia", "Vacina aftosa")).toBeLessThan(0.2);
    expect(similaridade("", "Ureia")).toBe(0);
  });
});

// ── Casamento ───────────────────────────────────────────────────────────────

const FORN_A = "11222333000181";
const FORN_B = "99888777000166";

const PRODUTOS: ProdutoCanonico[] = [
  { id: "p-gli", nome: "Glifosato", ncm: "38089324" },
  { id: "p-die", nome: "Óleo diesel S10", ncm: "27101921" },
  { id: "p-sal", nome: "Sal mineral", ncm: "23099090" },
];
const APELIDOS: Apelido[] = [
  {
    id: "a1", produtoId: "p-gli", texto: normalizarTexto("GLIFOSATO NORTOX 480 SL BB 20 LT"),
    fornecedorDoc: FORN_A, ncm: "38089324", gtin: "04006381333931",
  },
  // Apelido de produto que não está mais na lista (inativo): não liga nada.
  { id: "a-orfao", produtoId: "p-inativo", texto: normalizarTexto("UREIA 46%"), fornecedorDoc: FORN_A, ncm: null, gtin: null },
];

describe("resolverItem", () => {
  const indice = indexar(PRODUTOS, APELIDOS);

  it("liga sozinho SÓ com o apelido confirmado (mesmo texto, mesmo fornecedor)", () => {
    const r = resolverItem({ descricao: "Glifosato Nortox 480 SL bb 20 Lt", fornecedorDoc: "11.222.333/0001-81" }, indice);
    expect(r).toEqual({ ligado: true, produtoId: "p-gli", apelidoId: "a1" });
  });

  it("mesmo texto de OUTRO fornecedor é sugestão alta, não ligação automática", () => {
    const r = resolverItem({ descricao: "GLIFOSATO NORTOX 480 SL BB 20 LT", fornecedorDoc: FORN_B }, indice);
    expect(r.ligado).toBe(false);
    if (r.ligado) return;
    expect(r.sugestoes[0]).toMatchObject({ produtoId: "p-gli", via: "mesmo_nome", confianca: "alta" });
  });

  it("GTIN igual vem primeiro, com confiança alta — e ainda pede o clique", () => {
    const r = resolverItem({ descricao: "HERBICIDA XPTO 20L", gtin: "4006381333931", fornecedorDoc: FORN_B }, indice);
    expect(r.ligado).toBe(false);
    if (r.ligado) return;
    expect(r.sugestoes[0]).toMatchObject({ produtoId: "p-gli", via: "gtin", confianca: "alta" });
  });

  it("'ROUNDUP' sem nada em comum no nome casa com 'Glifosato' pelo NCM (único com esse NCM → média)", () => {
    const r = resolverItem({ descricao: "ROUNDUP ORIGINAL DI 20L", ncm: "3808.93.24", fornecedorDoc: FORN_B }, indice);
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes).toHaveLength(1);
    expect(r.sugestoes[0]).toMatchObject({ produtoId: "p-gli", nome: "Glifosato", via: "ncm", confianca: "media" });
  });

  it("NCM igual + nome parecido é a sugestão mais forte depois de GTIN e mesmo nome", () => {
    const r = resolverItem({ descricao: "OLEO DIESEL B S10 ADITIVADO", ncm: "27101921", fornecedorDoc: FORN_B }, indice);
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes[0]).toMatchObject({ produtoId: "p-die", via: "ncm_nome", confianca: "alta" });
  });

  it("NCM dividido por dois produtos, sem nome em comum: confiança baixa", () => {
    const idx = indexar([...PRODUTOS, { id: "p-gli2", nome: "Herbicida pós-emergente", ncm: "38089324" }], APELIDOS);
    const r = resolverItem({ descricao: "ROUNDUP ORIGINAL DI 20L", ncm: "38089324" }, idx);
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes.map((s) => s.confianca)).toEqual(["baixa", "baixa"]);
  });

  it("NCM de outra posição bloqueia casamento só por nome", () => {
    const r = resolverItem({ descricao: "SAL MINERAL PARA PISCINA", ncm: "25010090" }, indice);
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes.find((s) => s.produtoId === "p-sal")).toBeUndefined();
  });

  it("sem NCM no item, nome muito parecido vira sugestão por nome", () => {
    const r = resolverItem({ descricao: "SAL MINERAL BOVINOS SC 30KG" }, indice);
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes[0]).toMatchObject({ produtoId: "p-sal", via: "nome", confianca: "media" });
  });

  it("no máximo 3 sugestões, da mais forte para a mais fraca", () => {
    const muitos = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, nome: `Fungicida ${"ABCDE"[i]}`, ncm: "38089299" }));
    const r = resolverItem({ descricao: "FUNGICIDA MANCOZEBE 800 WP", ncm: "38089299" }, indexar(muitos, []));
    if (r.ligado) throw new Error("não deveria ligar sozinho");
    expect(r.sugestoes).toHaveLength(3);
    for (let i = 1; i < r.sugestoes.length; i++) expect(r.sugestoes[i - 1].pontos).toBeGreaterThanOrEqual(r.sugestoes[i].pontos);
  });

  it("apelido de produto inativo não liga; descrição vazia não sugere nada", () => {
    const r = resolverItem({ descricao: "UREIA 46%", fornecedorDoc: FORN_A }, indice);
    expect(r.ligado).toBe(false);
    expect(resolverItem({ descricao: "  " }, indice)).toEqual({ ligado: false, sugestoes: [] });
  });

  it("sem nenhum produto cadastrado, nenhuma sugestão", () => {
    expect(resolverItem({ descricao: "UREIA 46%", ncm: "31021010" }, indexar([], []))).toEqual({ ligado: false, sugestoes: [] });
  });
});

describe("separarItens", () => {
  const indice = indexar(PRODUTOS, APELIDOS);
  const item = (p: Partial<ItemDeNota>): ItemDeNota => ({ descricao: "x", fornecedorDoc: FORN_A, ...p });

  const itens: ItemDeNota[] = [
    item({ descricao: "Óleo diesel S10", ncm: "27101921", preco: 6.09, data: "2026-09-30", notaId: "n1", fornecedorNome: "Posto A" }),
    item({ descricao: "ÓLEO DIESEL S10", ncm: "27101921", preco: 6.29, data: "2026-11-10", notaId: "n2", fornecedorNome: "Posto A" }),
    item({ descricao: "OLEO DIESEL S10", ncm: "27101921", preco: 6.15, data: "2026-10-20", notaId: "n3", fornecedorDoc: FORN_B }),
    item({ descricao: "Ureia agrícola 46% N", ncm: "31021010", data: "2026-10-08", notaId: "n4" }),
    item({ descricao: "GLIFOSATO NORTOX 480 SL BB 20 LT", notaId: "n5" }), // já ligado (a1)
    item({ descricao: "   ", notaId: "n6" }), // sem descrição: fora
  ];
  const r = separarItens(itens, indice);

  it("conta analisados e ligados", () => {
    expect(r.analisados).toBe(5);
    expect(r.ligados).toBe(1);
    expect(r.porProduto.get("p-gli")).toBe(1);
  });

  it("agrupa por texto + fornecedor: uma confirmação liga todas as ocorrências", () => {
    expect(r.pendentes).toHaveLength(3);
    const [primeiro] = r.pendentes;
    expect(primeiro.ocorrencias).toBe(2);
    expect(primeiro.fornecedorDoc).toBe(FORN_A);
    expect(primeiro.notaIds.sort()).toEqual(["n1", "n2"]);
    // A nota mais recente representa o grupo.
    expect(primeiro).toMatchObject({ descricao: "ÓLEO DIESEL S10", ultimoPreco: 6.29, ultimaData: "2026-11-10" });
    expect(primeiro.chave).toBe(chaveApelido(normalizarTexto("Óleo diesel S10"), FORN_A));
  });

  it("mesmo texto de outro fornecedor é outro grupo, com a sugestão do produto", () => {
    const outro = r.pendentes.find((g) => g.fornecedorDoc === FORN_B)!;
    expect(outro.ocorrencias).toBe(1);
    expect(outro.sugestoes[0]).toMatchObject({ produtoId: "p-die", via: "mesmo_nome" });
  });
});
