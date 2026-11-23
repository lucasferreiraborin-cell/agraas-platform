import {
  alertaDiesel, classificarVencimentos, csvNumero, csvTexto, mesDaQuery, mesVizinho,
  resultadoPorCentro, resumoCaixa, saudacao, type CentroRow, type TituloRow,
} from "@/lib/gestao/resultado";

const P = { inicio: "2026-11-01", fim: "2026-11-30" };
const centro = (o: Partial<CentroRow>): CentroRow => ({
  id: "c1", nome: "Talhão 1", tipo: "talhao", atividade: "graos", cultura: "Soja",
  safra: "2026/27", area_ha: 100, cabecas: null, ...o,
});
const titulo = (o: Partial<TituloRow>): TituloRow => ({
  tipo: "pagar", valor: 100, status: "aberto", vencimento: "2026-11-10",
  data_baixa: null, valor_baixa: null, centro_custo_id: "c1", ...o,
});

describe("resultadoPorCentro", () => {
  it("soma custos, diesel e receitas por centro e calcula custo por ha", () => {
    const r = resultadoPorCentro(
      [centro({})],
      [titulo({ valor: 1000 }), titulo({ tipo: "receber", valor: "4000.50" }), titulo({ status: "cancelado", valor: 999 })],
      [{ data: "2026-11-05", litros: 100, preco_litro: 6, centro_custo_id: "c1" }],
      P,
    );
    const l = r.linhas[0];
    expect(l.custoTitulos).toBe(1000);
    expect(l.custoDiesel).toBe(600);
    expect(l.custo).toBe(1600);
    expect(l.receita).toBe(4000.5);
    expect(l.margem).toBe(2400.5);
    expect(l.porBase).toEqual({ unidade: "ha", valor: 16 });
  });

  it("usa custo por cabeça na pecuária e null sem base", () => {
    const r = resultadoPorCentro(
      [centro({ id: "b", atividade: "bovino_corte", area_ha: null, cabecas: 50 }), centro({ id: "g", atividade: "geral", area_ha: null })],
      [titulo({ centro_custo_id: "b", valor: 500 }), titulo({ centro_custo_id: "g", valor: 80 })],
      [], P,
    );
    expect(r.linhas[0].porBase).toEqual({ unidade: "cabeça", valor: 10 });
    expect(r.linhas[1].porBase).toBeNull();
  });

  it("separa o que não tem centro (ou centro desconhecido) e ignora fora do período", () => {
    const r = resultadoPorCentro(
      [centro({})],
      [titulo({ centro_custo_id: null, valor: 70 }), titulo({ centro_custo_id: "x", valor: 30 }), titulo({ vencimento: "2026-12-01", valor: 5000 })],
      [{ data: "2026-10-31", litros: 10, preco_litro: 6, centro_custo_id: null }],
      P,
    );
    expect(r.semCentro.custo).toBe(100);
    expect(r.total.custo).toBe(100);
    expect(r.total.margem).toBe(-100);
  });

  it("não divide por zero e trata preço de diesel ausente", () => {
    const r = resultadoPorCentro(
      [centro({ area_ha: 0 })], [],
      [{ data: "2026-11-02", litros: 50, preco_litro: null, centro_custo_id: "c1" }], P,
    );
    expect(r.linhas[0].porBase).toBeNull();
    expect(r.linhas[0].custoDiesel).toBe(0);
  });
});

describe("resumoCaixa", () => {
  it("considera só pagos com baixa no período, usando valor_baixa quando existe", () => {
    const r = resumoCaixa([
      titulo({ status: "pago", data_baixa: "2026-11-03", valor: 100, valor_baixa: 95 }),
      titulo({ tipo: "receber", status: "pago", data_baixa: "2026-11-04", valor: 300 }),
      titulo({ status: "pago", data_baixa: "2026-10-30", valor: 999 }),
      titulo({ status: "aberto", valor: 999 }),
    ], P);
    expect(r).toEqual({ entradas: 300, saidas: 95, saldo: 205 });
  });
});

describe("classificarVencimentos", () => {
  it("separa vencidos e próximos 7 dias por lado", () => {
    const v = classificarVencimentos([
      titulo({ vencimento: "2026-11-20", valor: 10 }),
      titulo({ vencimento: "2026-11-23", valor: 20 }),
      titulo({ vencimento: "2026-11-30", valor: 30 }),
      titulo({ vencimento: "2026-12-01", valor: 40 }),
      titulo({ tipo: "receber", vencimento: "2026-11-01", valor: 50 }),
      titulo({ status: "pago", vencimento: "2026-11-01", valor: 60 }),
    ], "2026-11-23");
    expect(v.pagar.vencidos).toEqual({ qtd: 1, total: 10 });
    expect(v.pagar.aVencer).toEqual({ qtd: 2, total: 50 });
    expect(v.receber.vencidos).toEqual({ qtd: 1, total: 50 });
    expect(v.receber.aVencer.qtd).toBe(0);
  });
});

describe("alertaDiesel", () => {
  it("alerta quando a semana passa de 1,5x a média das 4 semanas anteriores", () => {
    const ab = (data: string, litros: number) => ({ data, litros, preco_litro: 6, centro_custo_id: null });
    const base = [ab("2026-10-20", 100), ab("2026-10-27", 100), ab("2026-11-03", 100), ab("2026-11-10", 100)];
    expect(alertaDiesel([...base, ab("2026-11-20", 200)], "2026-11-23").acima).toBe(true);
    expect(alertaDiesel([...base, ab("2026-11-20", 120)], "2026-11-23").acima).toBe(false);
    expect(alertaDiesel([ab("2026-11-20", 500)], "2026-11-23").acima).toBe(false);
  });
});

describe("mês", () => {
  it("valida o parâmetro e navega entre meses", () => {
    expect(mesDaQuery("2026-09", "2026-11-23")).toBe("2026-09-01");
    expect(mesDaQuery("2026-13", "2026-11-23")).toBe("2026-11-01");
    expect(mesDaQuery(undefined, "2026-11-23")).toBe("2026-11-01");
    expect(mesVizinho("2026-01-01", -1)).toBe("2025-12");
    expect(mesVizinho("2026-12-01", 1)).toBe("2027-01");
  });
});

describe("saudação", () => {
  it("segue o horário de São Paulo", () => {
    expect(saudacao(new Date("2026-11-23T12:00:00Z"))).toBe("Bom dia");
    expect(saudacao(new Date("2026-11-23T18:00:00Z"))).toBe("Boa tarde");
    expect(saudacao(new Date("2026-11-23T23:30:00Z"))).toBe("Boa noite");
  });
});

describe("CSV", () => {
  it("usa vírgula decimal e escapa texto", () => {
    expect(csvNumero(1234.5)).toBe("1234,50");
    expect(csvNumero(null)).toBe("");
    expect(csvNumero("12.3456", 4)).toBe("12,3456");
    expect(csvTexto('Adubo; "NPK"')).toBe('"Adubo; ""NPK"""');
    expect(csvTexto("=1+1")).toBe("'=1+1");
    expect(csvTexto(null)).toBe("");
  });
});
