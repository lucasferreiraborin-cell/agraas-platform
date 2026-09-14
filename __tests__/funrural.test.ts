/**
 * Tests: lib/funrural.ts — alíquotas da LC 224/2025 (vigência 01/04/2026) e
 * a precedência entre override explícito, regime e fallback.
 * Já houve regressão aqui (migration 131 com 1,5% fixo; corrigida na 141).
 */

import {
  funruralRate,
  FUNRURAL_RATE_PF, FUNRURAL_RATE_PJ, FUNRURAL_RATE_SEGURADO_ESPECIAL, FUNRURAL_RATE_DEFAULT,
} from "@/lib/funrural";

describe("constantes LC 224/2025", () => {
  it("PF 1,63% · PJ 2,23% · segurado especial 1,50% · default = PF", () => {
    expect(FUNRURAL_RATE_PF).toBe(0.0163);
    expect(FUNRURAL_RATE_PJ).toBe(0.0223);
    expect(FUNRURAL_RATE_SEGURADO_ESPECIAL).toBe(0.015);
    expect(FUNRURAL_RATE_DEFAULT).toBe(FUNRURAL_RATE_PF);
  });
});

describe("funruralRate", () => {
  it("override explícito em funrural_rate vence o regime", () => {
    expect(funruralRate({ funrural_rate: 0.0223, tax_regime: "pf" })).toBe(0.0223);
    expect(funruralRate({ funrural_rate: 0.01, tax_regime: "pj" })).toBe(0.01);
  });
  it("regime PJ em qualquer grafia", () => {
    for (const r of ["pj", "PJ", "Pessoa Jurídica", "pessoa juridica"]) {
      expect(funruralRate({ funrural_rate: null, tax_regime: r })).toBe(FUNRURAL_RATE_PJ);
    }
  });
  it("segurado especial em qualquer grafia", () => {
    for (const r of ["segurado_especial", "SE", "Segurado Especial"]) {
      expect(funruralRate({ funrural_rate: null, tax_regime: r })).toBe(FUNRURAL_RATE_SEGURADO_ESPECIAL);
    }
  });
  it("regime desconhecido, nulo ou cliente ausente cai no default PF", () => {
    expect(funruralRate({ funrural_rate: null, tax_regime: "xpto" })).toBe(FUNRURAL_RATE_DEFAULT);
    expect(funruralRate({ funrural_rate: null, tax_regime: null })).toBe(FUNRURAL_RATE_DEFAULT);
    expect(funruralRate(null)).toBe(FUNRURAL_RATE_DEFAULT);
    expect(funruralRate(undefined)).toBe(FUNRURAL_RATE_DEFAULT);
  });
  it("zero é override explícito (isento); negativo e NaN caem para o regime", () => {
    expect(funruralRate({ funrural_rate: 0, tax_regime: "pj" })).toBe(0);
    expect(funruralRate({ funrural_rate: -1, tax_regime: "pj" })).toBe(FUNRURAL_RATE_PJ);
    expect(funruralRate({ funrural_rate: Number.NaN, tax_regime: "pf" })).toBe(FUNRURAL_RATE_PF);
  });
});
