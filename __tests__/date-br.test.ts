/**
 * Tests: lib/date-br.ts — o off-by-one que o raio-x contou 72 vezes.
 */

import { formatarDataIso, partesDataIso, hojeBR } from "@/lib/date-br";

describe("formatarDataIso", () => {
  it("não desloca o dia 1 (a meia-noite UTC virava dia 28/30 em BRT)", () => {
    expect(formatarDataIso("2026-03-01")).toBe("01/03/2026");
    expect(formatarDataIso("2026-03-01T00:00:00Z")).toBe("01/03/2026");
    expect(formatarDataIso("2026-09-14T10:00:00-03:00")).toBe("14/09/2026");
  });
  it("vazio e lixo viram o marcador", () => {
    expect(formatarDataIso(null)).toBe("—");
    expect(formatarDataIso("")).toBe("—");
    expect(formatarDataIso("ontem", "?")).toBe("?");
  });
});

describe("partesDataIso", () => {
  it("separa ano/mês/dia sem fuso", () => {
    expect(partesDataIso("2026-03-01")).toEqual({ ano: 2026, mes: 3, dia: 1 });
    expect(partesDataIso("x")).toBeNull();
  });
});

describe("hojeBR", () => {
  it("22h30 BRT ainda é o mesmo dia (em UTC já seria o seguinte)", () => {
    expect(hojeBR(new Date("2026-09-14T22:30:00-03:00"))).toBe("2026-09-14");
    expect(new Date("2026-09-14T22:30:00-03:00").toISOString().slice(0, 10)).toBe("2026-09-15"); // o bug
  });
});
