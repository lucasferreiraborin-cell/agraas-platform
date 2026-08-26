/**
 * Tests: lib/planos-acao.ts
 *
 * O plano de 90 dias é dado estruturado que alimenta o digest semanal dos
 * sócios. Um erro aqui não quebra build — manda e-mail errado para os 5
 * fundadores, que é pior. Os testes cobrem:
 *
 *  1. Consistência com o catálogo de sócios (`socios-digest.ts`) — o único
 *     acoplamento que não é verificado pelo compilador, porque os dois módulos
 *     são deliberadamente desacoplados para evitar import circular
 *  2. Integridade do plano (ids únicos, prazos dentro do ciclo, todo sócio alocado)
 *  3. Aritmética de datas — atraso, vencimento e fase corrente
 */

import {
  CICLO,
  DECISOES_SEMANA_ZERO,
  PLANOS_90D,
  SOCIO,
  cenariosBloqueados,
  decisoesPendentes,
  diasAte,
  faseCorrente,
  hojeISO,
  planoQueLidera,
  planosDoSocio,
  progressoDoPlano,
  tarefasAtrasadas,
  tarefasDoSocio,
  tarefasVencendo,
} from "@/lib/planos-acao";
import { SOCIOS_AGRAAS } from "@/lib/socios-digest";

const TODAS_TAREFAS = PLANOS_90D.flatMap(p =>
  p.fases.flatMap(f => f.tarefas.map(t => ({ ...t, plano: p.cenario, fase: f }))),
);

// ── 1. Consistência entre catálogos ──────────────────────────────────────────

describe("consistência com o catálogo de sócios", () => {
  const emailsCatalogo = new Set(SOCIOS_AGRAAS.map(s => s.email));

  it("todo e-mail em SOCIO existe em SOCIOS_AGRAAS", () => {
    for (const email of Object.values(SOCIO)) {
      expect(emailsCatalogo.has(email)).toBe(true);
    }
  });

  it("todo sócio do catálogo tem entrada em SOCIO", () => {
    const emailsPlano = new Set<string>(Object.values(SOCIO));
    for (const s of SOCIOS_AGRAAS) {
      expect(emailsPlano.has(s.email)).toBe(true);
    }
  });

  it("todo dono, apoio e dono de tarefa é um sócio conhecido", () => {
    for (const plano of PLANOS_90D) {
      expect(emailsCatalogo.has(plano.dono)).toBe(true);
      for (const a of plano.apoio) expect(emailsCatalogo.has(a)).toBe(true);
    }
    for (const t of TODAS_TAREFAS) expect(emailsCatalogo.has(t.dono)).toBe(true);
    for (const d of DECISOES_SEMANA_ZERO) expect(emailsCatalogo.has(d.dono)).toBe(true);
  });
});

// ── 2. Integridade do plano ──────────────────────────────────────────────────

describe("integridade do plano de 90 dias", () => {
  it("os 3 cenários estão presentes, sem duplicata", () => {
    expect(PLANOS_90D.map(p => p.cenario).sort()).toEqual([1, 2, 3]);
  });

  it("ids de tarefa são únicos", () => {
    const ids = TODAS_TAREFAS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo sócio aparece em pelo menos um plano", () => {
    for (const s of SOCIOS_AGRAAS) {
      expect(planosDoSocio(s.email).length).toBeGreaterThan(0);
    }
  });

  it("todo sócio tem pelo menos uma tarefa atribuída", () => {
    for (const s of SOCIOS_AGRAAS) {
      expect(tarefasDoSocio(s.email).length).toBeGreaterThan(0);
    }
  });

  it("ninguém é dono de mais de um plano", () => {
    const donos = PLANOS_90D.map(p => p.dono);
    expect(new Set(donos).size).toBe(donos.length);
  });

  it("dono de um plano não aparece como apoio do próprio plano", () => {
    for (const plano of PLANOS_90D) {
      expect(plano.apoio).not.toContain(plano.dono);
    }
  });

  it("todo prazo de tarefa cai dentro do ciclo", () => {
    for (const t of TODAS_TAREFAS) {
      expect(t.ate >= CICLO.inicio).toBe(true);
      expect(t.ate <= CICLO.fim).toBe(true);
    }
  });

  it("prazo de tarefa nunca ultrapassa o fim da própria fase", () => {
    for (const t of TODAS_TAREFAS) {
      expect(t.ate <= t.fase.ate).toBe(true);
    }
  });

  it("as fases são contíguas e ordenadas em todo plano", () => {
    for (const plano of PLANOS_90D) {
      for (let i = 1; i < plano.fases.length; i++) {
        expect(plano.fases[i].inicio > plano.fases[i - 1].ate).toBe(true);
      }
    }
  });

  it("todo plano declara métricas e fora-de-escopo", () => {
    for (const plano of PLANOS_90D) {
      expect(plano.metricas.length).toBeGreaterThan(0);
      expect(plano.foraDeEscopo.length).toBeGreaterThan(0);
    }
  });

  it("Lucas lidera o Cenário 1 e apoia o Cenário 3", () => {
    expect(planoQueLidera(SOCIO.LUCAS)?.cenario).toBe(1);
    const papeis = planosDoSocio(SOCIO.LUCAS);
    expect(papeis.find(p => p.plano.cenario === 3)?.papel).toBe("apoio");
  });
});

// ── 3. Aritmética de datas ───────────────────────────────────────────────────

describe("diasAte", () => {
  it("conta dias no futuro e no passado", () => {
    expect(diasAte("2026-09-01", "2026-08-26")).toBe(6);
    expect(diasAte("2026-08-20", "2026-08-26")).toBe(-6);
    expect(diasAte("2026-08-26", "2026-08-26")).toBe(0);
  });

  it("atravessa virada de mês e de ano sem erro", () => {
    expect(diasAte("2026-10-01", "2026-09-30")).toBe(1);
    expect(diasAte("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("retorna NaN para data inválida em vez de um número enganoso", () => {
    expect(Number.isNaN(diasAte("data-ruim", "2026-08-26"))).toBe(true);
  });
});

describe("hojeISO", () => {
  it("formata como YYYY-MM-DD", () => {
    expect(hojeISO(new Date("2026-08-26T15:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("usa o fuso de São Paulo, não UTC", () => {
    // 02:00 UTC do dia 27 ainda é dia 26 em São Paulo (UTC-3).
    expect(hojeISO(new Date("2026-08-27T02:00:00Z"))).toBe("2026-08-26");
  });
});

describe("tarefasAtrasadas e tarefasVencendo", () => {
  it("no início do ciclo nada está atrasado", () => {
    for (const s of SOCIOS_AGRAAS) {
      expect(tarefasAtrasadas(s.email, CICLO.inicio)).toHaveLength(0);
    }
  });

  it("depois do fim do ciclo tudo que é pendente está atrasado", () => {
    const atrasadas = tarefasAtrasadas(SOCIO.LUCAS, "2026-12-01");
    const pendentes = tarefasDoSocio(SOCIO.LUCAS, { status: "pendente", hoje: "2026-12-01" });
    expect(atrasadas.length).toBe(pendentes.length);
    expect(atrasadas.length).toBeGreaterThan(0);
  });

  it("as decisões de Semana 0 aparecem para o Lucas nos primeiros 14 dias", () => {
    const proximas = tarefasVencendo(SOCIO.LUCAS, 14, CICLO.inicio);
    expect(proximas.some(t => t.id === "P1-F1-01")).toBe(true);
  });

  it("o gate dos números da iBoi entra na janela de 14 dias do Maluli", () => {
    const proximas = tarefasVencendo(SOCIO.MALULI, 14, CICLO.inicio);
    expect(proximas.some(t => t.id === "P3-F1-01")).toBe(true);
  });

  it("atrasadas e vencendo são conjuntos disjuntos", () => {
    const hoje = "2026-10-01";
    for (const s of SOCIOS_AGRAAS) {
      const a = new Set(tarefasAtrasadas(s.email, hoje).map(t => t.id));
      for (const t of tarefasVencendo(s.email, 14, hoje)) {
        expect(a.has(t.id)).toBe(false);
      }
    }
  });

  it("vêm ordenadas por prazo, mais urgente primeiro", () => {
    const t = tarefasDoSocio(SOCIO.LUCAS, { hoje: CICLO.inicio });
    const prazos = t.map(x => x.ate);
    expect([...prazos].sort()).toEqual(prazos);
  });

  it("filtra por dono — tarefa do Frederico não aparece para o Eduardo", () => {
    const doEduardo = tarefasDoSocio(SOCIO.EDUARDO).map(t => t.id);
    expect(doEduardo).not.toContain("P1-F1-06");
  });
});

describe("faseCorrente", () => {
  const plano1 = PLANOS_90D[0];

  it("resolve a fase pela data", () => {
    expect(faseCorrente(plano1, "2026-09-01").nome).toBe("Tornar vendável");
    expect(faseCorrente(plano1, "2026-10-01").nome).toBe("Primeiros pagantes");
    expect(faseCorrente(plano1, "2026-11-01").nome).toBe("Provar retenção e canal");
  });

  it("antes do ciclo cai na primeira fase; depois, na última", () => {
    expect(faseCorrente(plano1, "2026-01-01").nome).toBe("Tornar vendável");
    expect(faseCorrente(plano1, "2027-01-01").nome).toBe("Provar retenção e canal");
  });

  it("resolve nas bordas exatas de cada fase", () => {
    expect(faseCorrente(plano1, CICLO.fase1.ate).nome).toBe("Tornar vendável");
    expect(faseCorrente(plano1, CICLO.fase2.inicio).nome).toBe("Primeiros pagantes");
  });
});

describe("progressoDoPlano", () => {
  it("começa em zero, com denominador igual ao total de tarefas", () => {
    for (const plano of PLANOS_90D) {
      const p = progressoDoPlano(plano);
      expect(p.feitas).toBe(0);
      expect(p.pct).toBe(0);
      expect(p.total).toBe(plano.fases.flatMap(f => f.tarefas).length);
    }
  });
});

describe("decisões de Semana 0", () => {
  it("todas pendentes hoje e todas do Lucas", () => {
    expect(decisoesPendentes()).toHaveLength(DECISOES_SEMANA_ZERO.length);
    for (const d of DECISOES_SEMANA_ZERO) expect(d.dono).toBe(SOCIO.LUCAS);
  });

  it("bloqueiam os três cenários enquanto estiverem pendentes", () => {
    expect(cenariosBloqueados()).toEqual([1, 2, 3]);
  });

  it("toda decisão bloqueia ao menos um cenário existente", () => {
    const cenarios = new Set(PLANOS_90D.map(p => p.cenario));
    for (const d of DECISOES_SEMANA_ZERO) {
      expect(d.bloqueia.length).toBeGreaterThan(0);
      for (const c of d.bloqueia) expect(cenarios.has(c)).toBe(true);
    }
  });
});
