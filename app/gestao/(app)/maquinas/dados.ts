import type { GestaoContexto } from "@/lib/gestao/contexto";
import { tabelaAusente } from "@/lib/gestao/contexto";
import {
  itemEhDiesel, litrosDoItem,
  type Abastecimento, type CompraDiesel, type Medidor,
} from "@/lib/gestao/diesel";

export type Maquina = {
  id: string;
  nome: string;
  tipo: string;
  placa_ou_serie: string | null;
  medidor: Medidor;
  ativo: boolean;
};

export type AbastecimentoLinha = Abastecimento & {
  id: string;
  operador: string | null;
  origem: string;
};

export type Centro = { id: string; nome: string };

export const TIPO_MAQUINA: Record<string, string> = {
  trator: "Trator",
  caminhonete: "Caminhonete",
  caminhao: "Caminhão",
  colheitadeira: "Colheitadeira",
  pulverizador: "Pulverizador",
  moto: "Moto",
  outro: "Outro",
};

export const ORIGEM_NOME: Record<string, string> = { manual: "Manual", tag: "Tag", planilha: "Planilha" };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Supabase = GestaoContexto["supabase"];

const num = (v: unknown): number => {
  const x = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

export async function carregarMaquinas(supabase: Supabase, clientId: string) {
  const { data, error } = await supabase
    .from("maquinas")
    .select("id, nome, tipo, placa_ou_serie, medidor, ativo")
    .eq("client_id", clientId)
    .order("nome");
  return { maquinas: (data ?? []) as unknown as Maquina[], error, ausente: tabelaAusente(error) };
}

export async function carregarCentros(supabase: Supabase, clientId: string): Promise<Centro[]> {
  const { data } = await supabase
    .from("centros_custo")
    .select("id, nome")
    .eq("client_id", clientId)
    .eq("ativo", true)
    .order("nome");
  return (data ?? []) as unknown as Centro[];
}

/** Devolve do mais recente ao mais antigo (até 3000 linhas). */
export async function carregarAbastecimentos(supabase: Supabase, clientId: string, maquinaId?: string) {
  let q = supabase
    .from("abastecimentos")
    .select("id, maquina_id, data, litros, preco_litro, medidor_leitura, operador, centro_custo_id, origem")
    .eq("client_id", clientId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);
  if (maquinaId) q = q.eq("maquina_id", maquinaId);
  const { data, error } = await q;
  const linhas = ((data ?? []) as unknown as Record<string, unknown>[]).map((r): AbastecimentoLinha => ({
    id: String(r.id),
    maquina_id: String(r.maquina_id),
    data: String(r.data),
    litros: num(r.litros),
    preco_litro: r.preco_litro == null ? null : num(r.preco_litro),
    medidor_leitura: r.medidor_leitura == null ? null : num(r.medidor_leitura),
    operador: (r.operador as string | null) ?? null,
    centro_custo_id: (r.centro_custo_id as string | null) ?? null,
    origem: String(r.origem ?? "manual"),
  }));
  return { abastecimentos: linhas, error, ausente: tabelaAusente(error) };
}

type ItemNota = {
  ncm: string | null;
  description: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  total_price: number | string | null;
  fiscal_invoices: { issued_at: string | null; received_at: string | null; direction: string; status: string }
    | { issued_at: string | null; received_at: string | null; direction: string; status: string }[]
    | null;
};

/**
 * Compras de diesel = itens de NF-e de entrada com NCM 2710.19.21 (ou descrição
 * "diesel" quando o NCM falta). Notas rejeitadas/arquivadas ficam de fora.
 * Falha de leitura não derruba a tela: devolve `falhou` para o aviso.
 */
export async function carregarComprasDiesel(
  supabase: Supabase,
  clientId: string,
): Promise<{ compras: CompraDiesel[]; falhou: boolean }> {
  const { data, error } = await supabase
    .from("fiscal_invoice_items")
    .select("ncm, description, quantity, unit, unit_price, total_price, fiscal_invoices!inner(issued_at, received_at, direction, status, client_id)")
    .eq("fiscal_invoices.client_id", clientId)
    .eq("fiscal_invoices.direction", "entrada")
    .not("fiscal_invoices.status", "in", "(rejected,archived)")
    .or("ncm.ilike.2710%,description.ilike.%diesel%")
    .limit(2000);
  if (error) return { compras: [], falhou: true };

  const compras: CompraDiesel[] = [];
  for (const it of (data ?? []) as unknown as ItemNota[]) {
    if (!itemEhDiesel(it.ncm, it.description)) continue;
    const litros = litrosDoItem(it.quantity, it.unit);
    if (litros == null) continue;
    const nota = Array.isArray(it.fiscal_invoices) ? it.fiscal_invoices[0] : it.fiscal_invoices;
    const dia = (nota?.issued_at ?? nota?.received_at ?? "").slice(0, 10);
    if (!dia) continue;
    const total = it.total_price != null ? num(it.total_price) : num(it.quantity) * num(it.unit_price);
    compras.push({ data: dia, litros, valor: total });
  }
  return { compras, falhou: false };
}
