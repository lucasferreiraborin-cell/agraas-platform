/**
 * Onboarding "Comece em 5 minutos" do Agraas Gestão. Lógica pura, testável.
 */
import { ATIVIDADES, type Atividade, type AtividadeCodigo, type CentroTipo } from "./atividades";

/** Safra sugerida pela data: a partir de julho, a safra que começa no ano (ex.: 2026/27). */
export function safraSugerida(hojeISO: string): string {
  const ano = Number(hojeISO.slice(0, 4));
  const mes = Number(hojeISO.slice(5, 7));
  const inicio = mes >= 7 ? ano : ano - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, "0")}`;
}

/** "1.250,5" ou "1250.5" → número; vazio → null; inválido → NaN. */
export function lerNumero(bruto: string): number | null {
  const s = bruto.trim();
  if (!s) return null;
  const limpo = s.includes(",") ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  return /^\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : Number.NaN;
}

export const chaveNome = (nome: string) => nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

/** Atividades que o produtor pode marcar no passo 1 (sem "estrutura" e "outra"). */
export const ATIVIDADES_ESCOLHA: Atividade[] = ATIVIDADES.filter((a) => a.setor !== "apoio");

export type CentroNovo = {
  nome: string;
  tipo: CentroTipo;
  atividade: AtividadeCodigo;
  cultura: string | null;
  safra: string | null;
  area_ha: number | null;
  cabecas: number | null;
};

export const CENTROS_FIXOS: CentroNovo[] = [
  { nome: "Administrativo", tipo: "administrativo", atividade: "geral", cultura: null, safra: null, area_ha: null, cabecas: null },
  { nome: "Máquinas e frota", tipo: "maquina", atividade: "geral", cultura: null, safra: null, area_ha: null, cabecas: null },
];

/** Tira da lista o que já existe (mesmo nome, sem diferenciar maiúscula) e repetidos dentro da própria lista. */
export function semDuplicados(novos: CentroNovo[], existentes: string[]): CentroNovo[] {
  const vistos = new Set(existentes.map(chaveNome));
  const saida: CentroNovo[] = [];
  for (const c of novos) {
    const k = chaveNome(c.nome);
    if (vistos.has(k)) continue;
    vistos.add(k);
    saida.push(c);
  }
  return saida;
}

export type EntradaAtividade = {
  codigo: string;
  nome: string;
  cultura: string;
  cabecas: string;
  area: string;
  safra: string;
};

/** Valida uma atividade marcada e devolve o centro a criar, ou a mensagem de erro. */
export function montarCentro(e: EntradaAtividade): { centro: CentroNovo } | { erro: string } {
  const ativ = ATIVIDADES_ESCOLHA.find((a) => a.codigo === e.codigo);
  if (!ativ) return { erro: "Atividade desconhecida. Recarregue a página." };

  const cultura = e.cultura.trim().slice(0, 60) || null;
  const nome = (e.nome.trim() || (cultura ?? ativ.nome)).replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) return { erro: `${ativ.nome}: o nome precisa ter de 2 a 80 letras.` };

  if (ativ.setor === "agricultura") {
    const safra = e.safra.trim();
    if (safra && !/^\d{4}\/\d{2}$/.test(safra)) return { erro: `${ativ.nome}: escreva a safra assim, 2026/27.` };
    const area = lerNumero(e.area);
    if (area === null) return { erro: `${ativ.nome}: informe a área em hectares.` };
    if (Number.isNaN(area) || area <= 0 || area > 9_999_999) return { erro: `${ativ.nome}: área em hectares inválida.` };
    return { centro: { nome, tipo: ativ.centroPadrao, atividade: ativ.codigo, cultura, safra: safra || null, area_ha: area, cabecas: null } };
  }

  const c = lerNumero(e.cabecas);
  if (c === null) return { erro: `${ativ.nome}: informe quantas cabeças.` };
  if (Number.isNaN(c) || !Number.isInteger(c) || c < 0 || c > 10_000_000) return { erro: `${ativ.nome}: número de cabeças inválido (use número inteiro).` };
  return { centro: { nome, tipo: ativ.centroPadrao, atividade: ativ.codigo, cultura, safra: null, area_ha: null, cabecas: c } };
}
