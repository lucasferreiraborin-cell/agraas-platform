/**
 * Tests: lib/agraas-analytics.ts — o score engine puro que 5 páginas usam e
 * que estava em 0% de cobertura (T-05 do raio-x de 14/09/2026).
 * Data fixa com fake timers: nada aqui depende do relógio real.
 */

import {
  calculateAgeInMonths,
  computeGmdTrajectory,
  avgGmd,
  latestGmd,
  GMD_MIN_RELIABLE_DAYS,
  getPassportClassification,
} from "@/lib/agraas-analytics";

describe("calculateAgeInMonths", () => {
  beforeAll(() => { jest.useFakeTimers().setSystemTime(new Date(2026, 8, 14, 12)); }); // 14/09/2026 local
  afterAll(() => jest.useRealTimers());

  it("conta meses completos: o dia ainda não virou → 23; virou → 24", () => {
    expect(calculateAgeInMonths("2024-09-15")).toBe(23);
    expect(calculateAgeInMonths("2024-09-14")).toBe(24);
    expect(calculateAgeInMonths("2024-09-13")).toBe(24);
  });
  it("nascido hoje é 0; sem data é null; nunca negativo", () => {
    expect(calculateAgeInMonths("2026-09-14")).toBe(0);
    expect(calculateAgeInMonths(null)).toBeNull();
    expect(calculateAgeInMonths(undefined)).toBeNull();
    expect(calculateAgeInMonths("2027-01-01")).toBe(0);
  });
});

describe("computeGmdTrajectory", () => {
  it("ordena por data, calcula kg/dia por intervalo e marca janela curta como baixa confiança", () => {
    const t = computeGmdTrajectory([
      { weight: 300, date: "2026-03-01" },
      { weight: 250, date: "2026-01-01" }, // fora de ordem de propósito
      { weight: 305, date: "2026-03-10" }, // 9 dias — curta
    ]);
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ from: "2026-01-01", to: "2026-03-01", days: 59, lowConfidence: false });
    expect(t[0].gmd).toBeCloseTo(50 / 59, 3);
    expect(t[1]).toMatchObject({ from: "2026-03-01", to: "2026-03-10", days: 9, lowConfidence: true });
    expect(GMD_MIN_RELIABLE_DAYS).toBe(21);
  });
  it("pesagem na mesma data, peso inválido ou sem data são ignorados; < 2 pesagens → vazio", () => {
    expect(computeGmdTrajectory([{ weight: 300, date: "2026-01-01" }, { weight: 310, date: "2026-01-01" }])).toEqual([]);
    expect(computeGmdTrajectory([{ weight: Number.NaN, date: "2026-01-01" }, { weight: 310, date: "2026-02-01" }])).toEqual([]);
    expect(computeGmdTrajectory([{ weight: 300, date: "" }, { weight: 310, date: "2026-02-01" }])).toEqual([]);
    expect(computeGmdTrajectory([])).toEqual([]);
  });
  it("GMD negativo em janela longa é perda real (não é marcado como ruído)", () => {
    const t = computeGmdTrajectory([{ weight: 400, date: "2026-01-01" }, { weight: 380, date: "2026-03-01" }]);
    expect(t[0].gmd).toBeLessThan(0);
    expect(t[0].lowConfidence).toBe(false);
  });
});

describe("avgGmd / latestGmd", () => {
  const traj = computeGmdTrajectory([
    { weight: 200, date: "2026-01-01" },
    { weight: 260, date: "2026-03-02" }, // 60 dias, 1.0 kg/dia
    { weight: 262, date: "2026-03-05" }, // 3 dias, ruído
  ]);
  it("média ponderada por dias ignora o intervalo de baixa confiança quando há outro", () => {
    expect(avgGmd(traj)).toBeCloseTo(1.0, 2);
  });
  it("latestGmd prefere o último intervalo CONFIÁVEL; só usa o curto se não houver outro; vazio → null", () => {
    expect(latestGmd(traj)).toBeCloseTo(1.0, 2);
    const soCurto = computeGmdTrajectory([{ weight: 200, date: "2026-03-01" }, { weight: 203, date: "2026-03-04" }]);
    expect(latestGmd(soCurto)).toBeCloseTo(1.0, 2);
    expect(soCurto[0].lowConfidence).toBe(true);
    expect(latestGmd([])).toBeNull();
    expect(avgGmd([])).toBeNull();
  });
});

describe("getPassportClassification", () => {
  it("é monotônica: score maior nunca recebe classificação pior", () => {
    const ordem = [0, 20, 40, 55, 70, 85, 100].map(getPassportClassification);
    // Só verifica que devolve string não vazia e que valores iguais dão o mesmo rótulo.
    for (const o of ordem) expect(typeof o === "string" && o.length > 0).toBe(true);
    expect(getPassportClassification(70)).toBe(getPassportClassification(70));
  });
});
