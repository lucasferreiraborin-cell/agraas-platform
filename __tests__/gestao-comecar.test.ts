import { chaveNome, lerNumero, montarCentro, safraSugerida, semDuplicados, CENTROS_FIXOS } from "@/lib/gestao/comecar";

const base = { nome: "", cultura: "", cabecas: "", area: "", safra: "" };

describe("safraSugerida", () => {
  it("de julho em diante abre a safra do ano", () => {
    expect(safraSugerida("2026-11-24")).toBe("2026/27");
    expect(safraSugerida("2026-07-01")).toBe("2026/27");
    expect(safraSugerida("2029-12-31")).toBe("2029/30");
  });
  it("antes de julho ainda é a safra do ano anterior", () => {
    expect(safraSugerida("2027-03-10")).toBe("2026/27");
    expect(safraSugerida("2099-01-01")).toBe("2098/99");
  });
});

describe("lerNumero", () => {
  it("lê formatos BR e simples", () => {
    expect(lerNumero("1.250,5")).toBe(1250.5);
    expect(lerNumero("1.250")).toBe(1250);
    expect(lerNumero("120,5")).toBe(120.5);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNaN();
    expect(lerNumero("-3")).toBeNaN();
  });
});

describe("montarCentro", () => {
  it("pecuária exige cabeças inteiras e usa o nome da atividade se vazio", () => {
    const r = montarCentro({ ...base, codigo: "bovino_corte", cabecas: "250" });
    expect(r).toEqual({ centro: expect.objectContaining({ nome: "Bovinos de corte", tipo: "lote_animal", cabecas: 250, safra: null }) });
    expect("erro" in montarCentro({ ...base, codigo: "bovino_corte" })).toBe(true);
    expect("erro" in montarCentro({ ...base, codigo: "bovino_corte", cabecas: "10,5" })).toBe(true);
  });
  it("agricultura exige área e valida safra", () => {
    const ok = montarCentro({ ...base, codigo: "graos", nome: "Talhão 1", cultura: "Soja", area: "120,5", safra: "2026/27" });
    expect(ok).toEqual({ centro: expect.objectContaining({ nome: "Talhão 1", tipo: "talhao", area_ha: 120.5, safra: "2026/27", cabecas: null }) });
    expect("erro" in montarCentro({ ...base, codigo: "graos", area: "0" })).toBe(true);
    expect("erro" in montarCentro({ ...base, codigo: "graos", area: "10", safra: "26/27" })).toBe(true);
  });
  it("rejeita atividade fora do catálogo de escolha", () => {
    expect("erro" in montarCentro({ ...base, codigo: "geral" })).toBe(true);
    expect("erro" in montarCentro({ ...base, codigo: "xyz" })).toBe(true);
  });
});

describe("semDuplicados", () => {
  it("não repete o que existe nem repetidos na lista, sem diferenciar maiúscula", () => {
    const novos = [...CENTROS_FIXOS, { ...CENTROS_FIXOS[0], nome: "administrativo " }];
    const r = semDuplicados(novos, ["MÁQUINAS  e frota"]);
    expect(r.map((c) => c.nome)).toEqual(["Administrativo"]);
    expect(chaveNome("  A   B ")).toBe("a b");
  });
});
