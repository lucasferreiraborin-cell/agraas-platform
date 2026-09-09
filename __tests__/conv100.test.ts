/**
 * Tests: B1 — verificador do Convênio ICMS 100/97.
 *
 * A maioria destes testes existe para provar que o motor NÃO acusa. Falso
 * positivo aqui não custa um bug: custa a relação com o contador, que é o
 * canal comercial. Um "você pagou imposto a mais" que não se sustenta queima
 * a credibilidade de uma vez só.
 *
 * Os três desfechos do cuidado 5a são testados separadamente, e há um teste
 * que varre TODOS os casos garantindo que só o desfecho 1 produz valor.
 */

import {
  avaliarItem,
  avaliarNota,
  avaliarCbenef,
  classificarNcm,
  tipoDeOperacao,
  ehEntrada,
  type ItemParaAvaliar,
  type ContextoOperacao,
  type ConfigConv100,
} from "@/lib/fiscal/conv100";
import { carregarRegra } from "@/lib/rules/loader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const regra = carregarRegra("rules/icms/R-ICMS-CONV100-01.yaml") as any;

/** Config derivada da regra versionada, como o app fará. */
const CFG: ConfigConv100 = {
  mapaNcm: regra.mapa_ncm.prefixos.map((p: { prefixo: string; clausula: string; item: string }) => ({
    prefixo: p.prefixo, clausula: p.clausula as "primeira" | "segunda", item: p.item,
  })),
  foraDoConvenio: regra.fora_do_convenio.prefixos,
  mapaNcmVerificado: false, // o mapa NCM é PREMISSA — verificado_em null
  reducaoPrimeiraPct: regra.clausula_primeira.reducao_base_pct,
  reducaoSegundaPct: regra.clausula_segunda.reducao_base_pct,
};

const item = (o: Partial<ItemParaAvaliar> = {}): ItemParaAvaliar => ({
  ncm: "23099090", cfop: "6101", descricao: "RACAO BOVINOS",
  valorTotal: 10_000, cst: "20", icmsBase: 4000, icmsReducaoBasePct: 60,
  icmsAliquota: 12, icmsValor: 480, icmsDesonerado: null, beneficioCodigo: "",
  ...o,
});

const INTERESTADUAL: ContextoOperacao = { ufEmitente: "SP", ufDestinatario: "GO" };
const INTERNA: ContextoOperacao = { ufEmitente: "GO", ufDestinatario: "GO" };

// ── A regra veio da fonte ───────────────────────────────────────────────────

describe("a regra está ancorada no texto oficial", () => {
  it("cita o CONFAZ e está verificada", () => {
    expect(regra.fonte.url).toContain("confaz.fazenda.gov.br");
    expect(regra.fonte.verificado_em).toBe("2026-09-09");
    expect(regra.vigencia.fim).toBe("2027-12-31"); // Conv. 79/2025
  });

  it("cláusula primeira reduz 60%, segunda reduz 30%", () => {
    expect(regra.clausula_primeira.reducao_base_pct).toBe(60);
    expect(regra.clausula_segunda.reducao_base_pct).toBe(30);
  });

  it("o mapa NCM é PREMISSA — não é o texto da norma", () => {
    // O Convênio classifica por DESCRIÇÃO. O NCM é inferência nossa.
    expect(regra.mapa_ncm.classe).toBe("PREMISSA");
    expect(regra.mapa_ncm.verificado_em).toBeNull();
    expect(regra.mapa_ncm.rota_de_obtencao).toBeTruthy();
  });

  it("registra que o sêmen BOVINO está fora do item IX", () => {
    const ix = regra.clausula_primeira.itens.find((i: { num: string }) => i.num === "IX");
    expect(ix.descricao).toMatch(/EXCETO O DE BOVINO/i);
    expect(regra.fora_do_convenio.prefixos.some((p: { prefixo: string }) => p.prefixo === "0511")).toBe(true);
  });

  it("registra que o milho é condicionado à destinação", () => {
    const ii = regra.clausula_segunda.itens.find((i: { num: string }) => i.num === "II");
    expect(ii.atencao).toMatch(/destinação/i);
  });
});

// ── Classificação ───────────────────────────────────────────────────────────

describe("classificarNcm", () => {
  it("ração cai na cláusula primeira, farelo de soja e milho na segunda", () => {
    expect(classificarNcm("23099090", CFG)).toMatchObject({ clausula: "primeira" });
    expect(classificarNcm("23040010", CFG)).toMatchObject({ clausula: "segunda" });
    expect(classificarNcm("10059010", CFG)).toMatchObject({ clausula: "segunda" });
  });

  it("sêmen bovino e combustível estão expressamente fora", () => {
    expect(classificarNcm("05111000", CFG)).toBe("fora");
    expect(classificarNcm("27101921", CFG)).toBe("fora");
  });

  it("NCM desconhecido devolve null — não chuta cláusula", () => {
    expect(classificarNcm("84388000", CFG)).toBeNull();
    expect(classificarNcm("", CFG)).toBeNull();
  });

  it("prefixo mais específico ganha", () => {
    // "35079" (enzimas, item X) é mais específico que qualquer "3507".
    expect(classificarNcm("35079040", CFG)).toMatchObject({ item: "X" });
  });
});

describe("tipoDeOperacao e ehEntrada", () => {
  it("mesma UF é interna, UFs diferentes é interestadual", () => {
    expect(tipoDeOperacao(INTERNA)).toBe("interna");
    expect(tipoDeOperacao(INTERESTADUAL)).toBe("interestadual");
  });

  it("usa as UFs, não o CFOP", () => {
    // CFOP 6101 é interestadual, mas as UFs mandam.
    expect(tipoDeOperacao({ ufEmitente: "GO", ufDestinatario: "GO" })).toBe("interna");
  });

  it("CFOP 1/2/3 é entrada, 5/6/7 é saída", () => {
    expect(ehEntrada("1101")).toBe(true);
    expect(ehEntrada("6101")).toBe(false);
  });
});

// ── FIXTURE 1: interestadual com base reduzida CORRETA ─────────────────────

describe("interestadual com redução correta — não acusa", () => {
  const a = avaliarItem(item({ icmsReducaoBasePct: 60, icmsValor: 480 }), INTERESTADUAL, CFG);

  it("desfecho é benefício aplicado", () => {
    expect(a.desfecho).toBe("beneficio_aplicado");
  });

  it("NÃO produz valor de imposto pago a mais", () => {
    expect(a.icmsPagoAMais).toBeNull();
  });

  it("severidade info, nunca warning", () => {
    expect(a.severidade).toBe("info");
  });
});

// ── FIXTURE 2: interestadual com BASE CHEIA (o erro que importa) ────────────

describe("interestadual com base cheia — o achado", () => {
  // Ração, cláusula primeira (60%). Base cheia: R$ 10.000 × 12% = R$ 1.200.
  // Com o benefício: 10.000 × 40% × 12% = R$ 480. Diferença: R$ 720.
  const a = avaliarItem(
    item({ cst: "00", icmsReducaoBasePct: 0, icmsBase: 10_000, icmsValor: 1200 }),
    INTERESTADUAL, CFG,
  );

  it("identifica o benefício ausente", () => {
    expect(a.desfecho).toBe("beneficio_ausente");
    expect(a.clausula).toBe("primeira");
    expect(a.reducaoEsperadaPct).toBe(60);
  });

  it("calcula o ICMS devido com o benefício e a diferença", () => {
    expect(a.icmsDevidoComBeneficio).toBe(480);
    expect(a.icmsPagoAMais).toBe(720);
  });

  it("CST 00 num item com direito à redução vira achado de incoerência", () => {
    expect(a.alertType).toBe("icms.cst_incoerente");
    expect(a.motivo).toMatch(/CST 00/);
  });

  it("o texto remete ao contador e diz ESTIMADA — nunca afirma direito", () => {
    expect(a.motivo).toMatch(/contador/i);
    expect(a.motivo).toMatch(/estimada/i);
    expect(a.motivo).not.toMatch(/você tem direito|recuperação/i);
  });

  it("NÃO é apresentável ao produtor enquanto o mapa NCM for premissa", () => {
    expect(a.confiavelParaCobranca).toBe(false);
  });

  it("vira apresentável quando o mapa for conferido pelo contador", () => {
    const b = avaliarItem(
      item({ cst: "00", icmsReducaoBasePct: 0, icmsValor: 1200 }),
      INTERESTADUAL, { ...CFG, mapaNcmVerificado: true },
    );
    expect(b.confiavelParaCobranca).toBe(true);
    expect(b.icmsPagoAMais).toBe(720);
  });
});

// ── FIXTURE 3: interna — depende da UF ter internalizado ───────────────────

describe("operação interna", () => {
  it("sem regra verificada da UF, é DESCONHECIDO — nunca 'pago a mais'", () => {
    // A cláusula terceira apenas AUTORIZA o Estado. Sem a regra dele, não dá
    // para afirmar isenção nem redução.
    const a = avaliarItem(item({ cst: "00", icmsReducaoBasePct: 0, icmsValor: 1200 }), INTERNA, CFG);
    expect(a.desfecho).toBe("desconhecido");
    expect(a.icmsPagoAMais).toBeNull();
    expect(a.severidade).toBe("info");
    expect(a.motivo).toMatch(/AUTORIZA/);
  });

  it("com isenção verificada e nota isenta, está conforme", () => {
    const a = avaliarItem(
      item({ cst: "40", icmsValor: 0, icmsReducaoBasePct: null }),
      { ...INTERNA, tratamentoInterno: { tipo: "isencao" } }, CFG,
    );
    expect(a.desfecho).toBe("beneficio_aplicado");
    expect(a.icmsPagoAMais).toBeNull();
  });

  it("com isenção verificada mas ICMS destacado, acusa o valor inteiro", () => {
    const a = avaliarItem(
      item({ cst: "00", icmsValor: 1200, icmsReducaoBasePct: 0 }),
      { ...INTERNA, tratamentoInterno: { tipo: "isencao" } }, CFG,
    );
    expect(a.desfecho).toBe("beneficio_ausente");
    expect(a.icmsPagoAMais).toBe(1200);
  });

  it("UF que REDUZ em vez de isentar usa o percentual dela", () => {
    const a = avaliarItem(
      item({ icmsReducaoBasePct: 0, icmsValor: 1200 }),
      { ...INTERNA, tratamentoInterno: { tipo: "reducao", reducaoPct: 30 } }, CFG,
    );
    // 10.000 × 70% × 12% = 840. Diferença: 360.
    expect(a.icmsDevidoComBeneficio).toBe(840);
    expect(a.icmsPagoAMais).toBe(360);
  });

  it("a regra registra GO e SP como DESCONHECIDO, à espera do RICMS", () => {
    expect(regra.clausula_terceira.por_uf.GO.tratamento).toBe("DESCONHECIDO");
    expect(regra.clausula_terceira.por_uf.SP.verificado_em).toBeNull();
  });
});

// ── FIXTURE 4: CST sem benefício ───────────────────────────────────────────

describe("CST fora do alcance do Convênio", () => {
  it.each([
    ["51", "diferimento"],
    ["50", "suspensão"],
    ["41", "não tributada"],
  ])("CST %s (%s) não é caso do Convênio e não acusa", (cst) => {
    const a = avaliarItem(item({ cst, icmsReducaoBasePct: 0, icmsValor: 0 }), INTERESTADUAL, CFG);
    expect(a.desfecho).toBe("nao_aplicavel");
    expect(a.icmsPagoAMais).toBeNull();
    expect(a.severidade).toBe("info");
  });
});

// ── FIXTURE 5: diesel CST 61 ───────────────────────────────────────────────

describe("diesel com CST 61", () => {
  const a = avaliarItem(
    item({ ncm: "27101921", cst: "61", descricao: "OLEO DIESEL S10", icmsReducaoBasePct: null, icmsValor: null }),
    INTERESTADUAL, CFG,
  );

  it("é encaminhado ao B2, não acusado aqui", () => {
    expect(a.desfecho).toBe("nao_aplicavel");
    expect(a.motivo).toMatch(/crédito de diesel|monofásico/i);
    expect(a.icmsPagoAMais).toBeNull();
  });
});

// ── Produto fora da lista ──────────────────────────────────────────────────

describe("produto fora do alcance", () => {
  it("máquina agrícola não gera achado de imposto pago a mais", () => {
    const a = avaliarItem(
      item({ ncm: "84388000", descricao: "MISTURADOR DE RACAO", cst: "00", icmsReducaoBasePct: 0, icmsValor: 1800 }),
      INTERESTADUAL, CFG,
    );
    expect(a.desfecho).toBe("desconhecido");
    expect(a.icmsPagoAMais).toBeNull();
    expect(a.motivo).toMatch(/verificar com o contador/i);
  });

  it("sêmen bovino é fora por exclusão expressa do item IX", () => {
    const a = avaliarItem(
      item({ ncm: "05111000", descricao: "SEMEN BOVINO", cst: "00", icmsReducaoBasePct: 0, icmsValor: 600 }),
      INTERESTADUAL, CFG,
    );
    expect(a.desfecho).toBe("nao_aplicavel");
    expect(a.icmsPagoAMais).toBeNull();
  });
});

// ── Redução maior que a prevista ───────────────────────────────────────────

describe("redução MAIOR que a prevista", () => {
  it("não vira 'pago a mais' — é achado do contador, não crédito nosso", () => {
    const a = avaliarItem(
      item({ ncm: "23040010", icmsReducaoBasePct: 60, icmsValor: 480 }), // farelo é 30%
      INTERESTADUAL, CFG,
    );
    expect(a.desfecho).toBe("beneficio_divergente");
    expect(a.icmsPagoAMais).toBeNull();
    expect(a.motivo).toMatch(/maior que a prevista/i);
  });
});

// ── Dado insuficiente ──────────────────────────────────────────────────────

describe("nota incompleta", () => {
  it("sem alíquota, não inventa número", () => {
    const a = avaliarItem(item({ icmsAliquota: null, icmsReducaoBasePct: 0 }), INTERESTADUAL, CFG);
    expect(a.desfecho).toBe("desconhecido");
    expect(a.icmsDevidoComBeneficio).toBeNull();
    expect(a.icmsPagoAMais).toBeNull();
  });

  it("sem valor do item, não inventa número", () => {
    const a = avaliarItem(item({ valorTotal: null, icmsReducaoBasePct: 0 }), INTERESTADUAL, CFG);
    expect(a.icmsPagoAMais).toBeNull();
  });
});

// ── cBenef ─────────────────────────────────────────────────────────────────

describe("cBenef", () => {
  it("UF que exige e nota sem o código gera achado PRÓPRIO, sem valor", () => {
    const a = avaliarCbenef(item({ beneficioCodigo: "" }), { ...INTERESTADUAL, ufExigeCbenef: true }, true);
    expect(a?.alertType).toBe("icms.cbenef_ausente");
    expect(a?.icmsPagoAMais).toBeNull(); // não infla o valor apurado
  });

  it("UF que não exige, ou nota com o código, não gera nada", () => {
    expect(avaliarCbenef(item(), INTERESTADUAL, true)).toBeNull();
    expect(avaliarCbenef(item({ beneficioCodigo: "GO123" }), { ...INTERESTADUAL, ufExigeCbenef: true }, true)).toBeNull();
  });
});

// ── A invariante que protege a credibilidade ───────────────────────────────

describe("INVARIANTE — só o desfecho 1 produz valor", () => {
  const casos: Array<[string, ItemParaAvaliar, ContextoOperacao]> = [
    ["diesel CST 61",        item({ ncm: "27101921", cst: "61" }), INTERESTADUAL],
    ["diferimento CST 51",   item({ cst: "51" }), INTERESTADUAL],
    ["ncm desconhecido",     item({ ncm: "84388000", cst: "00", icmsReducaoBasePct: 0 }), INTERESTADUAL],
    ["semen bovino",         item({ ncm: "05111000", cst: "00", icmsReducaoBasePct: 0 }), INTERESTADUAL],
    ["interna sem regra UF", item({ cst: "00", icmsReducaoBasePct: 0 }), INTERNA],
    ["reducao correta",      item(), INTERESTADUAL],
    ["reducao maior",        item({ ncm: "23040010", icmsReducaoBasePct: 60 }), INTERESTADUAL],
    ["sem aliquota",         item({ icmsAliquota: null }), INTERESTADUAL],
  ];

  it.each(casos)("%s NUNCA produz icmsPagoAMais", (_nome, it_, ctx) => {
    const a = avaliarItem(it_, ctx, CFG);
    expect(a.desfecho).not.toBe("beneficio_ausente");
    expect(a.icmsPagoAMais).toBeNull();
  });
});

// ── Nota inteira ───────────────────────────────────────────────────────────

describe("avaliarNota", () => {
  const itens = [
    item({ ncm: "23099090", cst: "00", icmsReducaoBasePct: 0, icmsValor: 1200 }), // achado
    item({ ncm: "27101921", cst: "61" }),                                          // diesel
    item({ ncm: "84388000", cst: "00", icmsReducaoBasePct: 0, icmsValor: 900 }),   // desconhecido
    item(),                                                                        // conforme
  ];

  it("separa o valor apurado do valor a verificar", () => {
    const r = avaliarNota(itens, INTERESTADUAL, CFG);
    // Mapa NCM ainda é premissa: tudo cai em "a verificar".
    expect(r.totalPagoAMais).toBe(0);
    expect(r.totalAVerificar).toBe(720);
    expect(r.apresentavelAoProdutor).toBe(false);
  });

  it("com o mapa conferido, o valor migra para apurado", () => {
    const r = avaliarNota(itens, INTERESTADUAL, { ...CFG, mapaNcmVerificado: true });
    expect(r.totalPagoAMais).toBe(720);
    expect(r.totalAVerificar).toBe(0);
    expect(r.apresentavelAoProdutor).toBe(true);
  });

  it("conta os itens fora do alcance e os desconhecidos", () => {
    const r = avaliarNota(itens, INTERESTADUAL, CFG);
    expect(r.itensForaDoAlcance).toBe(1);   // diesel
    expect(r.itensDesconhecidos).toBe(1);   // máquina
  });

  it("nota sem item nenhum não quebra", () => {
    const r = avaliarNota([], INTERESTADUAL, CFG);
    expect(r.totalPagoAMais).toBe(0);
    expect(r.avaliacoes).toEqual([]);
  });
});
