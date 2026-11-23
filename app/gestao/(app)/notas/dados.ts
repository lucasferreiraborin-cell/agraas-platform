import { tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";

type Db = GestaoContexto["supabase"];

export type TomSelo = "neutro" | "verde" | "alerta" | "perigo";

export type NotaUnificada = {
  id: string;
  origem: "canonica" | "legado";
  numero: string | null;
  serie: string | null;
  chave: string | null;
  emitente: string | null;
  emitenteCnpj: string | null;
  data: string | null; // yyyy-mm-dd
  valor: number | null;
  statusRotulo: string;
  statusTom: TomSelo;
  aConferir: boolean;
  funrural: number | null;
};

export type TitulosDaNota = { qtd: number; valor: number; abertos: number };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_CANONICO: Record<string, { rotulo: string; tom: TomSelo; aConferir: boolean }> = {
  pending_review: { rotulo: "A conferir", tom: "alerta", aConferir: true },
  reviewed: { rotulo: "Conferida", tom: "verde", aConferir: false },
  rejected: { rotulo: "Rejeitada", tom: "perigo", aConferir: false },
  archived: { rotulo: "Arquivada", tom: "neutro", aConferir: false },
};
const STATUS_LEGADO: Record<string, { rotulo: string; tom: TomSelo; aConferir: boolean }> = {
  pendente: { rotulo: "A conferir", tom: "alerta", aConferir: true },
  validada: { rotulo: "Conferida", tom: "verde", aConferir: false },
  erro: { rotulo: "Com erro", tom: "perigo", aConferir: true },
};

export function statusDaNota(origem: "canonica" | "legado", status: string | null) {
  const mapa = origem === "canonica" ? STATUS_CANONICO : STATUS_LEGADO;
  return mapa[status ?? ""] ?? { rotulo: status ?? "—", tom: "neutro" as TomSelo, aConferir: false };
}

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);
const numOuNull = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

type LinhaCanonica = {
  id: string; number: string | null; series: string | null; access_key: string | null;
  issuer_name: string | null; issuer_cnpj: string | null; issued_at: string | null;
  gross_value: number | string | null; status: string | null; funrural_value: number | string | null;
};
type LinhaLegado = {
  id: string; numero_nota: string | null; serie: string | null; chave_acesso?: string | null;
  emitente_nome: string | null; emitente_cnpj: string | null; data_emissao: string | null;
  valor_total: number | string | null; status: string | null; created_at: string | null;
};

export type ListaNotas = {
  notas: NotaUnificada[];
  /** Uma das tabelas falhou por motivo que não é "ausente" — a lista pode estar incompleta. */
  parcial: boolean;
  /** Nenhuma das duas tabelas existe. */
  ausente: boolean;
};

/** Notas do cliente em fiscal_invoices e fiscal_notes, sem duplicar (id compartilhado ou chave de acesso). */
export async function listarNotas(supabase: Db, clientId: string, limite = 300): Promise<ListaNotas> {
  const canon = await supabase
    .from("fiscal_invoices")
    .select("id, number, series, access_key, issuer_name, issuer_cnpj, issued_at, gross_value, status, funrural_value")
    .eq("client_id", clientId)
    .order("issued_at", { ascending: false, nullsFirst: false })
    .limit(limite);

  const colunasLegado = "id, numero_nota, serie, emitente_nome, emitente_cnpj, data_emissao, valor_total, status, created_at";
  let leg = await supabase
    .from("fiscal_notes")
    .select(`${colunasLegado}, chave_acesso`)
    .eq("client_id", clientId)
    .order("data_emissao", { ascending: false, nullsFirst: false })
    .limit(limite);
  if (leg.error && !tabelaAusente(leg.error) && /chave_acesso/.test(leg.error.message)) {
    leg = await supabase
      .from("fiscal_notes")
      .select(colunasLegado)
      .eq("client_id", clientId)
      .order("data_emissao", { ascending: false, nullsFirst: false })
      .limit(limite) as unknown as typeof leg;
  }

  const canonAusente = tabelaAusente(canon.error);
  const legAusente = tabelaAusente(leg.error);
  const parcial = (!!canon.error && !canonAusente) || (!!leg.error && !legAusente);
  if (parcial) console.error("[gestao/notas] leitura parcial:", canon.error?.message, leg.error?.message);

  const doCanon = (canon.error ? [] : ((canon.data ?? []) as unknown as LinhaCanonica[])).map<NotaUnificada>((r) => {
    const s = statusDaNota("canonica", r.status);
    return {
      id: r.id, origem: "canonica", numero: r.number, serie: r.series, chave: r.access_key,
      emitente: r.issuer_name, emitenteCnpj: r.issuer_cnpj, data: dia(r.issued_at), valor: numOuNull(r.gross_value),
      statusRotulo: s.rotulo, statusTom: s.tom, aConferir: s.aConferir, funrural: numOuNull(r.funrural_value),
    };
  });

  const ids = new Set(doCanon.map((n) => n.id));
  const chaves = new Set(doCanon.map((n) => n.chave).filter((c): c is string => !!c));

  const doLegado = (leg.error ? [] : ((leg.data ?? []) as unknown as LinhaLegado[]))
    .filter((r) => !ids.has(r.id) && !(r.chave_acesso && chaves.has(r.chave_acesso)))
    .map<NotaUnificada>((r) => {
      const s = statusDaNota("legado", r.status);
      return {
        id: r.id, origem: "legado", numero: r.numero_nota, serie: r.serie, chave: r.chave_acesso ?? null,
        emitente: r.emitente_nome, emitenteCnpj: r.emitente_cnpj, data: dia(r.data_emissao) ?? dia(r.created_at),
        valor: numOuNull(r.valor_total), statusRotulo: s.rotulo, statusTom: s.tom, aConferir: s.aConferir, funrural: null,
      };
    });

  const notas = [...doCanon, ...doLegado].sort((a, b) => ((b.data ?? "") > (a.data ?? "") ? 1 : (b.data ?? "") < (a.data ?? "") ? -1 : 0));
  return { notas, parcial, ausente: canonAusente && legAusente };
}

/** Títulos gerados por nota (chave = id da nota). `null` quando a tabela de títulos ainda não existe. */
export async function titulosPorNota(supabase: Db, clientId: string): Promise<Map<string, TitulosDaNota> | null> {
  const { data, error } = await supabase
    .from("titulos_financeiros")
    .select("fiscal_invoice_id, fiscal_note_id, valor, status")
    .eq("client_id", clientId)
    .or("fiscal_invoice_id.not.is.null,fiscal_note_id.not.is.null")
    .neq("status", "cancelado")
    .limit(3000);
  if (error) {
    if (!tabelaAusente(error)) console.error("[gestao/notas] titulos:", error.message);
    return null;
  }
  const mapa = new Map<string, TitulosDaNota>();
  for (const t of (data ?? []) as unknown as Array<{ fiscal_invoice_id: string | null; fiscal_note_id: string | null; valor: number | string; status: string }>) {
    const id = t.fiscal_invoice_id ?? t.fiscal_note_id;
    if (!id) continue;
    const atual = mapa.get(id) ?? { qtd: 0, valor: 0, abertos: 0 };
    atual.qtd += 1;
    atual.valor += Number(t.valor) || 0;
    if (t.status === "aberto") atual.abertos += 1;
    mapa.set(id, atual);
  }
  return mapa;
}
