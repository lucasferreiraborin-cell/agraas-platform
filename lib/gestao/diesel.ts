/**
 * Diesel do Agraas Gestão: estoque teórico, preço médio, custo e consumo por máquina.
 * Puro — sem I/O — para ser testável. Entrada vem de itens de NF-e (compras) e
 * de abastecimentos registrados (manual, planilha ou, no futuro, tag).
 *
 * Premissa de consumo (PREMISSA): método tanque a tanque. Os litros de um
 * abastecimento repõem o que a máquina gastou desde a leitura anterior. Só vale
 * se o tanque é enchido a cada registro; sem isso o consumo oscila.
 */

export type Medidor = "horimetro" | "odometro";

export type CompraDiesel = { data: string; litros: number; valor: number };

export type Abastecimento = {
  maquina_id: string;
  data: string;
  litros: number;
  preco_litro: number | null;
  medidor_leitura: number | null;
  centro_custo_id?: string | null;
};

export type DadosDiesel = { comprasDiesel: CompraDiesel[]; abastecimentos: Abastecimento[] };

export const MARGEM_ALERTA = 0.2;

const n = (v: unknown): number => {
  const x = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Lê número digitado em formato BR ("1.234,5", "120,5") ou com ponto ("120.5"). */
export function lerNumero(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/* ───────────── Compras: itens de NF-e ───────────── */

const NCM_DIESEL = "27101921";

/**
 * O item é óleo diesel? Com NCM informado, vale só o NCM 2710.19.21 (descrição
 * "diesel" em lubrificante ou filtro não conta). Sem NCM, vale a descrição.
 */
export function itemEhDiesel(ncm: string | null | undefined, descricao: string | null | undefined): boolean {
  const digitos = (ncm ?? "").replace(/\D/g, "");
  if (digitos) return digitos.startsWith(NCM_DIESEL);
  return /diesel/i.test(descricao ?? "");
}

/** Converte a quantidade do item para litros; null se a unidade não for de volume. */
export function litrosDoItem(quantidade: number | string | null | undefined, unidade: string | null | undefined): number | null {
  const q = n(quantidade);
  if (q <= 0) return null;
  const u = (unidade ?? "").trim().toUpperCase().replace(/\./g, "");
  if (["L", "LT", "LTS", "LITRO", "LITROS", "LIT"].includes(u)) return q;
  if (["M3", "M³"].includes(u)) return q * 1000;
  return null;
}

/* ───────────── Estoque e preço ───────────── */

export function precoMedioPonderado(compras: CompraDiesel[]): number | null {
  const litros = soma(compras.map((c) => n(c.litros)));
  if (litros <= 0) return null;
  return soma(compras.map((c) => n(c.valor))) / litros;
}

export type Estoque = { comprado: number; abastecido: number; saldo: number };

export function estoqueTeorico(compras: CompraDiesel[], abastecimentos: Abastecimento[]): Estoque {
  const comprado = soma(compras.map((c) => n(c.litros)));
  const abastecido = soma(abastecimentos.map((a) => n(a.litros)));
  return { comprado, abastecido, saldo: comprado - abastecido };
}

export type Conferencia = {
  situacao: "sem_compras" | "conciliado" | "abastecido_acima" | "sobra";
  litros: number;
};

/** Compara comprado × abastecido. Tolerância de 5% do comprado. */
export function conferirEstoque(e: Estoque, tolerancia = 0.05): Conferencia {
  if (e.comprado <= 0) return { situacao: "sem_compras", litros: 0 };
  if (Math.abs(e.saldo) <= e.comprado * tolerancia) return { situacao: "conciliado", litros: e.saldo };
  return e.saldo < 0
    ? { situacao: "abastecido_acima", litros: -e.saldo }
    : { situacao: "sobra", litros: e.saldo };
}

/* ───────────── Custo ───────────── */

export type Custo = { litros: number; custo: number; litrosSemPreco: number; estimado: boolean };

/** Custo dos abastecimentos. Sem preço gravado usa precoReferencia (estimado); sem nenhum, fica fora do custo. */
export function custoDe(abastecimentos: Abastecimento[], precoReferencia: number | null = null): Custo {
  let custo = 0;
  let litros = 0;
  let litrosSemPreco = 0;
  let estimado = false;
  for (const a of abastecimentos) {
    const l = n(a.litros);
    litros += l;
    if (a.preco_litro != null && n(a.preco_litro) > 0) custo += l * n(a.preco_litro);
    else if (precoReferencia != null && precoReferencia > 0) { custo += l * precoReferencia; estimado = true; }
    else litrosSemPreco += l;
  }
  return { litros, custo, litrosSemPreco, estimado };
}

/** Litros e custo por centro de custo. Chave "" = sem centro. */
export function litrosPorCentro(
  abastecimentos: Abastecimento[],
  precoReferencia: number | null = null,
): Map<string, Custo> {
  const grupos = new Map<string, Abastecimento[]>();
  for (const a of abastecimentos) {
    const k = a.centro_custo_id ?? "";
    grupos.set(k, [...(grupos.get(k) ?? []), a]);
  }
  return new Map([...grupos].map(([k, v]) => [k, custoDe(v, precoReferencia)]));
}

/* ───────────── Consumo por máquina ───────────── */

export type Intervalo = {
  data: string;
  delta: number;             // horas ou km desde a leitura anterior
  litros: number;            // litros do abastecimento que fecha o intervalo
  /** L/h (horímetro) ou km/L (odômetro) — o que o operador reconhece. */
  consumo: number;
  /** Base interna de comparação: litros por hora ou por km. */
  litrosPorUnidade: number;
  /** Quanto acima da média das outras leituras da máquina (0,25 = 25%). null sem base. */
  desvio: number | null;
  foraDoPadrao: boolean;
};

export type ResumoMaquina = {
  litros: number;
  ultimoAbastecimento: string | null;
  unidade: "L/h" | "km/L";
  intervalos: Intervalo[];
  /** Média ponderada no mesmo formato de `consumo`. null sem 2 leituras válidas. */
  consumoMedio: number | null;
  /** Leituras que voltaram ou repetiram — não entram no consumo. */
  leiturasInconsistentes: number;
  alerta: boolean;
};

const exibir = (lpu: number, medidor: Medidor) => (medidor === "horimetro" ? lpu : lpu > 0 ? 1 / lpu : 0);

function ordenar(abs: Abastecimento[]): Abastecimento[] {
  return [...abs].sort((a, b) => a.data.localeCompare(b.data) || n(a.medidor_leitura) - n(b.medidor_leitura));
}

/**
 * Consumo entre leituras consecutivas de UMA máquina. Alerta quando o consumo
 * do intervalo passa de `margem` acima da média das demais leituras da própria
 * máquina (exige ao menos 2 outras leituras válidas).
 */
export function resumirMaquina(
  abastecimentos: Abastecimento[],
  medidor: Medidor = "horimetro",
  margem = MARGEM_ALERTA,
): ResumoMaquina {
  const ord = ordenar(abastecimentos);
  const unidade = medidor === "horimetro" ? "L/h" : "km/L";

  const brutos: { data: string; delta: number; litros: number; lpu: number }[] = [];
  let inconsistentes = 0;
  let anterior: number | null = null;
  for (const a of ord) {
    if (a.medidor_leitura == null) continue;
    const leitura = n(a.medidor_leitura);
    if (anterior != null) {
      const delta = leitura - anterior;
      const litros = n(a.litros);
      if (delta > 0 && litros > 0) brutos.push({ data: a.data, delta, litros, lpu: litros / delta });
      else inconsistentes += 1;
    }
    anterior = leitura;
  }

  const somaL = soma(brutos.map((b) => b.litros));
  const somaD = soma(brutos.map((b) => b.delta));

  const intervalos: Intervalo[] = brutos.map((b) => {
    const outrosL = somaL - b.litros;
    const outrosD = somaD - b.delta;
    const temBase = brutos.length >= 3 && outrosD > 0;
    const mediaOutros = temBase ? outrosL / outrosD : null;
    const desvio = mediaOutros ? b.lpu / mediaOutros - 1 : null;
    return {
      data: b.data,
      delta: b.delta,
      litros: b.litros,
      consumo: exibir(b.lpu, medidor),
      litrosPorUnidade: b.lpu,
      desvio,
      foraDoPadrao: desvio != null && desvio > margem,
    };
  });

  return {
    litros: soma(ord.map((a) => n(a.litros))),
    ultimoAbastecimento: ord.length ? ord[ord.length - 1].data : null,
    unidade,
    intervalos,
    consumoMedio: somaD > 0 ? exibir(somaL / somaD, medidor) : null,
    leiturasInconsistentes: inconsistentes,
    alerta: intervalos.some((i) => i.foraDoPadrao),
  };
}

/* ───────────── Visão geral ───────────── */

export type AnaliseDiesel = {
  estoque: Estoque;
  conferencia: Conferencia;
  precoMedio: number | null;
  porMaquina: Map<string, ResumoMaquina>;
  porCentro: Map<string, Custo>;
  custo: Custo;
};

export function analisarDiesel(
  dados: DadosDiesel,
  medidores: Record<string, Medidor> = {},
): AnaliseDiesel {
  const estoque = estoqueTeorico(dados.comprasDiesel, dados.abastecimentos);
  const precoMedio = precoMedioPonderado(dados.comprasDiesel);

  const grupos = new Map<string, Abastecimento[]>();
  for (const a of dados.abastecimentos) grupos.set(a.maquina_id, [...(grupos.get(a.maquina_id) ?? []), a]);

  return {
    estoque,
    conferencia: conferirEstoque(estoque),
    precoMedio,
    porMaquina: new Map([...grupos].map(([id, abs]) => [id, resumirMaquina(abs, medidores[id] ?? "horimetro")])),
    porCentro: litrosPorCentro(dados.abastecimentos, precoMedio),
    custo: custoDe(dados.abastecimentos, precoMedio),
  };
}

/* ───────────── Validação de registro ───────────── */

/** Leitura nova menor que a anterior da máquina? Devolve aviso, nunca bloqueia sozinho. */
export function avisoDeLeitura(anterior: number | null, nova: number | null): string | null {
  if (anterior == null || nova == null) return null;
  if (nova < anterior) {
    return `A leitura (${nova}) é menor que a anterior (${anterior}). Troca de painel ou erro de digitação?`;
  }
  return null;
}
