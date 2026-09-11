/**
 * Reset de cliente — apaga TODO o dado operacional de um client_id, preserva a
 * conta.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 * 11/09/2026: o Lucas decidiu trocar o seed da FSJBE por NF-e e animais reais.
 * Não há acesso ao banco a partir deste ambiente (MCP sem autenticação, chave
 * de serviço fora do chat por regra), e o ledger de migrations está
 * dessincronizado — logo nada aqui é migration nem SQL manual. É uma rota
 * admin que roda com a service key que a Vercel já tem, em dois tempos:
 * inventário (só conta) e execução (apaga, depois conta de novo).
 *
 * ── O que NUNCA apaga ────────────────────────────────────────────────────────
 * `clients` (login), `chart_of_accounts` (plano de contas padrão que a 148
 * só recria em cliente NOVO), vínculos de conta (mentoria, tipo de produtor,
 * assinatura, intake, banco, contador) e qualquer tabela global.
 *
 * ── Por que é tolerante ──────────────────────────────────────────────────────
 * O repositório não é fonte de verdade do esquema (tabelas base anteriores à
 * migration 001, tabelas criadas no dashboard). Cada passo trata "tabela não
 * existe", "é view" e "coluna não existe" como informação, não como falha, e
 * "violação de FK" como bloqueio a repetir numa segunda passada depois que os
 * filhos caíram. Nada aqui lança: o resultado por tabela é o relatório.
 */

export type Filtro =
  | { coluna: string; valor: string }
  | { coluna: string; valores: string[] };

export type ErroDb = { code?: string; message: string; details?: string };

export type ClienteResumo = { id: string; name: string; email: string; role: string };

/** Adaptador mínimo sobre o banco — injetável para teste. */
export interface AdaptadorDb {
  cliente(id: string): Promise<ClienteResumo | null>;
  selecionar(tabela: string, coluna: string, filtro: Filtro): Promise<{ valores: string[]; erro?: ErroDb }>;
  contar(tabela: string, filtro: Filtro): Promise<{ total: number; erro?: ErroDb }>;
  apagar(tabela: string, filtro: Filtro): Promise<{ apagados: number; erro?: ErroDb }>;
  listarArquivos(bucket: string, prefixo: string): Promise<{ caminhos: string[]; erro?: ErroDb }>;
  removerArquivos(bucket: string, caminhos: string[]): Promise<{ removidos: number; erro?: ErroDb }>;
}

export type Passo =
  | { tabela: string; via: "client_id" }
  | { tabela: string; via: "pai"; pai: string; coluna: string };

/** Máximo de ids por filtro IN — cabe na query string do PostgREST com folga. */
export const LOTE_IN = 200;

export const BUCKET_FOTOS = "animal-photos";

/**
 * Tabelas que a limpeza NÃO toca. Fica exportado para o teste garantir que
 * nenhuma delas entra no plano por descuido.
 */
export const PRESERVADAS = [
  "clients",
  "chart_of_accounts",
  "mentor_assignments",
  "client_producer_types",
  "subscription_events",
  "onboarding_intake",
  "bank_producer_relationships",
  "partners_accountants",
  "platform_settings",
  "platform_jobs_log",
  "market_signals",
  "ibs_cbs_config",
  "livestock_score_config",
  "mapa_carencias",
  "producer_types",
  "slaughterhouses",
] as const;

const c = (tabela: string): Passo => ({ tabela, via: "client_id" });
const p = (tabela: string, pai: string, coluna: string): Passo => ({ tabela, via: "pai", pai, coluna });

/**
 * Ordem: filhos antes de pais. A regra que o teste verifica: todo passo `pai`
 * aparece ANTES do passo que apaga o pai, e toda tabela que referencia outra
 * do plano (pelo grafo de FKs conhecido das migrations) vem antes dela.
 */
export const PLANO: Passo[] = [
  // ── netos e tabelas sem client_id (escopo pelo pai) ──────────────────────
  p("semen_batch_applications",  "coverings",            "covering_id"),
  p("marketplace_offers",        "marketplace_listings", "listing_id"),
  p("marketplace_transactions",  "marketplace_listings", "listing_id"),
  p("lot_buyer_access",          "lots",                 "lot_id"),
  p("fiscal_invoice_items",      "fiscal_invoices",      "fiscal_invoice_id"),
  p("fiscal_notes_alerts_legacy","fiscal_notes",         "note_id"),
  p("events",                    "animals",              "animal_id"),
  p("weights",                   "animals",              "animal_id"),
  p("weight_records",            "animals",              "animal_id"),
  p("applications",              "animals",              "animal_id"),
  p("animal_certifications",     "animals",              "animal_id"),
  p("animal_rfids",              "animals",              "animal_id"),
  p("animal_lot_assignments",    "animals",              "animal_id"),
  p("animal_movements",          "animals",              "animal_id"),
  p("animal_scores",             "animals",              "animal_id"),

  // ── filhos com client_id ─────────────────────────────────────────────────
  c("fiscal_alerts"),
  c("fiscal_note_items"),
  c("sales"),
  c("agraas_master_passport_cache"),
  c("animal_photos"),
  c("ai_predictions"),
  c("animal_cost_summary"),
  c("carbon_footprint_estimates"),
  c("feed_efficiency_records"),
  c("score_audit_log"),
  c("births"),
  c("pregnancy_diagnostics"),
  c("bull_breeding_soundness"),
  c("animal_goals"),
  c("marketplace_listings"),
  c("shipment_tracking"),
  c("gta"),
  c("stock_movements"),
  c("sanitary_calendar"),
  c("cash_flow_projections"),
  c("accounting_entries"),
  c("lcdpr_exports"),
  c("bank_accounts"),
  c("cost_records"),
  c("production_calf_entries"),
  c("production_mortality"),
  c("production_sales_history"),
  c("production_stock_snapshot"),
  c("production_weight_distribution"),
  c("slaughter_records"),
  c("supply_financials"),
  c("supply_inventory_items"),
  c("vaccination_schedules"),
  c("farm_scores"),
  c("producer_scores"),
  c("audit_snapshot"),
  c("daily_insights"),
  c("coverings"),
  c("reproductive_ia_services"),
  c("reproductive_stock_summary"),
  c("reproductive_seasons"),
  c("semen_batches"),
  c("fiscal_notes"),
  c("fiscal_invoices"),
  c("stock_batches"),
  c("products"),
  c("suppliers"),
  c("buyers"),

  // ── domínios pausados (mantidos no esquema; o cliente pode ter seed) ──────
  c("livestock_applications"),
  c("livestock_certifications"),
  c("livestock_events"),
  c("livestock_weights"),
  c("pre_shipment_quarantine"),
  c("livestock_species"),
  c("poultry_batch_events"),
  c("poultry_batches"),
  c("crop_certifications"),
  c("crop_inputs"),
  c("crop_quality_reports"),
  c("crop_shipment_tracking"),
  c("crop_storage_movements"),
  c("crop_shipments"),
  c("crop_storage"),
  c("crop_fiscal_note_items"),
  c("crop_fiscal_notes"),
  c("crop_fields"),
  c("farms_agriculture"),

  // ── raízes ───────────────────────────────────────────────────────────────
  c("animals"),
  c("lots"),
  c("properties"),
];

/**
 * Grafo de FKs conhecido (tabela -> tabelas que ela referencia), lido das
 * migrations em 11/09/2026. Usado só pelo teste de ordem. Não precisa ser
 * completo — precisa estar certo.
 */
export const REFERENCIAS: Record<string, string[]> = {
  semen_batch_applications: ["coverings", "semen_batches"],
  marketplace_offers: ["marketplace_listings"],
  marketplace_transactions: ["marketplace_listings", "fiscal_notes"],
  lot_buyer_access: ["lots"],
  fiscal_invoice_items: ["fiscal_invoices", "animals", "stock_batches"],
  fiscal_notes_alerts_legacy: ["fiscal_notes"],
  events: ["animals"],
  weights: ["animals"],
  applications: ["animals", "suppliers"],
  animal_certifications: ["animals"],
  animal_lot_assignments: ["animals", "lots"],
  fiscal_alerts: ["fiscal_invoices", "fiscal_notes"],
  fiscal_note_items: ["fiscal_notes"],
  sales: ["buyers", "fiscal_invoices", "fiscal_notes"],
  agraas_master_passport_cache: ["animals", "lots"],
  animal_photos: ["animals"],
  ai_predictions: ["animals"],
  animal_cost_summary: ["animals"],
  carbon_footprint_estimates: ["animals"],
  feed_efficiency_records: ["animals"],
  score_audit_log: ["animals"],
  births: ["animals", "coverings"],
  pregnancy_diagnostics: ["coverings"],
  bull_breeding_soundness: ["animals"],
  marketplace_listings: ["animals", "lots"],
  shipment_tracking: ["lots"],
  gta: ["lots", "properties"],
  sanitary_calendar: ["products"],
  cash_flow_projections: ["accounting_entries", "properties"],
  coverings: ["animals", "reproductive_seasons", "semen_batches"],
  reproductive_ia_services: ["reproductive_seasons"],
  reproductive_stock_summary: ["reproductive_seasons"],
  reproductive_seasons: ["properties"],
  fiscal_notes: ["suppliers"],
  fiscal_invoices: ["properties"],
  stock_batches: ["suppliers"],
  products: ["suppliers"],
  livestock_applications: ["livestock_species"],
  livestock_certifications: ["livestock_species"],
  livestock_events: ["livestock_species"],
  livestock_weights: ["livestock_species"],
  pre_shipment_quarantine: ["livestock_species"],
  livestock_species: ["properties"],
  poultry_batch_events: ["poultry_batches"],
  poultry_batches: ["properties"],
  crop_certifications: ["crop_fields"],
  crop_inputs: ["crop_fields"],
  crop_quality_reports: ["crop_shipments"],
  crop_shipment_tracking: ["crop_shipments"],
  crop_storage_movements: ["crop_fields", "crop_storage"],
  crop_shipments: ["crop_fields", "crop_storage"],
  crop_fiscal_note_items: ["crop_fiscal_notes"],
  crop_fiscal_notes: ["farms_agriculture"],
  crop_fields: ["farms_agriculture"],
  farm_scores: ["properties"],
  lots: ["properties"],
};

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

export type StatusTabela =
  | "ok"          // contou / apagou
  | "inexistente" // tabela não existe neste banco — informação, não erro
  | "view"        // é view, não se apaga
  | "sem_pai"     // passo `pai` cujo pai não existe
  | "bloqueada"   // FK: outra tabela ainda referencia estas linhas
  | "erro";       // qualquer outra coisa — mensagem em detalhe

export type ResultadoTabela = {
  tabela: string;
  via: string;
  linhas: number;
  status: StatusTabela;
  detalhe?: string;
};

export type Inventario = {
  cliente: ClienteResumo | null;
  tabelas: ResultadoTabela[];
  total: number;
  preservadas: readonly string[];
};

export type Execucao = {
  cliente: ClienteResumo | null;
  tabelas: ResultadoTabela[];
  total_apagado: number;
  passadas: number;
  restantes: ResultadoTabela[];
  arquivos: { encontrados: number; removidos: number; erro?: string };
};

// ---------------------------------------------------------------------------
// Classificação de erro do PostgREST/Postgres
// ---------------------------------------------------------------------------

export function classificarErro(erro: ErroDb): StatusTabela {
  const m = (erro.message ?? "").toLowerCase();
  if (erro.code === "42P01" || erro.code === "PGRST205" || /relation .* does not exist/.test(m) || /could not find the table/.test(m)) {
    return "inexistente";
  }
  if (erro.code === "42809" || /cannot delete from view/.test(m) || /is a view/.test(m) || /cannot delete from relation/.test(m)) {
    return "view";
  }
  if (erro.code === "23503" || /violates foreign key/.test(m)) return "bloqueada";
  return "erro";
}

function detalheDe(erro: ErroDb): string {
  return [erro.message, erro.details].filter(Boolean).join(" — ").slice(0, 300);
}

function lotes<T>(xs: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += tamanho) out.push(xs.slice(i, i + tamanho));
  return out;
}

/** Pais distintos referenciados pelo plano — só esses precisam de ids. */
export function paisDoPlano(plano: Passo[] = PLANO): string[] {
  const s = new Set<string>();
  for (const x of plano) if (x.via === "pai") s.add(x.pai);
  return [...s];
}

/**
 * Resolve os ids de cada pai ANTES de qualquer delete — depois que o pai cai,
 * não há mais como saber quais filhos eram dele.
 */
async function resolverPais(
  db: AdaptadorDb, clientId: string, plano: Passo[],
): Promise<Map<string, { ids: string[]; erro?: ErroDb }>> {
  const out = new Map<string, { ids: string[]; erro?: ErroDb }>();
  for (const pai of paisDoPlano(plano)) {
    const r = await db.selecionar(pai, "id", { coluna: "client_id", valor: clientId });
    out.set(pai, { ids: r.valores, erro: r.erro });
  }
  return out;
}

type Op = "contar" | "apagar";

async function executarPasso(
  db: AdaptadorDb, op: Op, passo: Passo, clientId: string,
  pais: Map<string, { ids: string[]; erro?: ErroDb }>,
): Promise<ResultadoTabela> {
  const via = passo.via === "pai" ? `${passo.pai}.${passo.coluna}` : "client_id";
  const base = { tabela: passo.tabela, via };

  let filtros: Filtro[];
  if (passo.via === "client_id") {
    filtros = [{ coluna: "client_id", valor: clientId }];
  } else {
    const pai = pais.get(passo.pai);
    if (pai?.erro) {
      const st = classificarErro(pai.erro);
      return { ...base, linhas: 0, status: st === "inexistente" ? "sem_pai" : "erro", detalhe: `pai ${passo.pai}: ${detalheDe(pai.erro)}` };
    }
    if (!pai || pai.ids.length === 0) return { ...base, linhas: 0, status: "ok" };
    filtros = lotes(pai.ids, LOTE_IN).map(valores => ({ coluna: passo.coluna, valores }));
  }

  let linhas = 0;
  for (const f of filtros) {
    const r = op === "contar" ? await db.contar(passo.tabela, f) : await db.apagar(passo.tabela, f);
    if (r.erro) {
      return { ...base, linhas, status: classificarErro(r.erro), detalhe: detalheDe(r.erro) };
    }
    linhas += op === "contar" ? (r as { total: number }).total : (r as { apagados: number }).apagados;
  }
  return { ...base, linhas, status: "ok" };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Conta o que seria apagado. Não escreve nada. */
export async function inventariar(
  db: AdaptadorDb, clientId: string, plano: Passo[] = PLANO,
): Promise<Inventario> {
  const cliente = await db.cliente(clientId);
  const pais = await resolverPais(db, clientId, plano);
  const tabelas: ResultadoTabela[] = [];
  for (const passo of plano) tabelas.push(await executarPasso(db, "contar", passo, clientId, pais));
  const total = tabelas.reduce((s, t) => s + (t.status === "ok" ? t.linhas : 0), 0);
  return { cliente, tabelas, total, preservadas: PRESERVADAS };
}

/** Remove as fotos do bucket que pertencem ao cliente. Best-effort. */
async function limparArquivos(
  db: AdaptadorDb, clientId: string, pais: Map<string, { ids: string[]; erro?: ErroDb }>,
): Promise<Execucao["arquivos"]> {
  const caminhos = new Set<string>();
  const fotos = await db.selecionar("animal_photos", "storage_path", { coluna: "client_id", valor: clientId });
  for (const c of fotos.valores) if (c) caminhos.add(c);
  for (const lotId of pais.get("lots")?.ids ?? []) {
    const l = await db.listarArquivos(BUCKET_FOTOS, `lots/${lotId}`);
    for (const c of l.caminhos) caminhos.add(c);
  }
  const lista = [...caminhos];
  if (lista.length === 0) return { encontrados: 0, removidos: 0 };
  let removidos = 0;
  let erro: string | undefined;
  for (const lote of lotes(lista, 100)) {
    const r = await db.removerArquivos(BUCKET_FOTOS, lote);
    removidos += r.removidos;
    if (r.erro) erro = detalheDe(r.erro);
  }
  return { encontrados: lista.length, removidos, erro };
}

/**
 * Apaga tudo do cliente, na ordem do plano, em até duas passadas: a segunda
 * repete só o que ficou bloqueado por FK na primeira. Depois apaga as fotos.
 * Nunca lança; o que sobrar vem em `restantes`.
 */
export async function executar(
  db: AdaptadorDb, clientId: string, plano: Passo[] = PLANO,
): Promise<Execucao> {
  const cliente = await db.cliente(clientId);
  const pais = await resolverPais(db, clientId, plano);

  // As fotos precisam dos caminhos que estão em animal_photos — antes do delete.
  const arquivos = await limparArquivos(db, clientId, pais);

  const porTabela = new Map<string, ResultadoTabela>();
  let passadas = 0;
  let pendentes = plano;
  while (pendentes.length > 0 && passadas < 2) {
    passadas++;
    const bloqueadas: Passo[] = [];
    for (const passo of pendentes) {
      const r = await executarPasso(db, "apagar", passo, clientId, pais);
      const anterior = porTabela.get(passo.tabela);
      porTabela.set(passo.tabela, { ...r, linhas: r.linhas + (anterior?.linhas ?? 0) });
      if (r.status === "bloqueada") bloqueadas.push(passo);
    }
    pendentes = bloqueadas;
  }

  const tabelas = plano.map(x => porTabela.get(x.tabela)!);
  const total_apagado = tabelas.reduce((s, t) => s + t.linhas, 0);
  const restantes = tabelas.filter(t => t.status === "bloqueada" || t.status === "erro");
  return { cliente, tabelas, total_apagado, passadas, restantes, arquivos };
}

// ---------------------------------------------------------------------------
// Adaptador real (supabase-js com service role)
// ---------------------------------------------------------------------------

// A tabela é dinâmica, então o builder tipado do supabase-js não ajuda aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = any;

function aplicar(q: Builder, f: Filtro): Builder {
  return "valores" in f ? q.in(f.coluna, f.valores) : q.eq(f.coluna, f.valor);
}

function erroDe(e: { code?: string; message: string; details?: string } | null | undefined): ErroDb | undefined {
  return e ? { code: e.code, message: e.message, details: e.details } : undefined;
}

export function adaptadorSupabase(db: Builder): AdaptadorDb {
  return {
    async cliente(id) {
      const { data } = await db.from("clients").select("id, name, email, role").eq("id", id).maybeSingle();
      return (data as ClienteResumo | null) ?? null;
    },

    async selecionar(tabela, coluna, filtro) {
      const valores: string[] = [];
      const pagina = 1000;
      for (let de = 0; ; de += pagina) {
        const { data, error } = await aplicar(db.from(tabela).select(coluna), filtro).range(de, de + pagina - 1);
        if (error) return { valores, erro: erroDe(error) };
        const linhas = (data ?? []) as Record<string, unknown>[];
        for (const r of linhas) {
          const v = r[coluna];
          if (typeof v === "string" && v) valores.push(v);
        }
        if (linhas.length < pagina) break;
      }
      return { valores };
    },

    async contar(tabela, filtro) {
      const { count, error } = await aplicar(db.from(tabela).select("*", { count: "exact", head: true }), filtro);
      return { total: count ?? 0, erro: erroDe(error) };
    },

    async apagar(tabela, filtro) {
      const { count, error } = await aplicar(db.from(tabela).delete({ count: "exact" }), filtro);
      return { apagados: count ?? 0, erro: erroDe(error) };
    },

    async listarArquivos(bucket, prefixo) {
      const { data, error } = await db.storage.from(bucket).list(prefixo, { limit: 1000 });
      if (error) return { caminhos: [], erro: erroDe(error) };
      const caminhos = ((data ?? []) as { name: string; id?: string | null }[])
        .filter(x => x.id) // pastas vêm sem id
        .map(x => `${prefixo}/${x.name}`);
      return { caminhos };
    },

    async removerArquivos(bucket, caminhos) {
      const { data, error } = await db.storage.from(bucket).remove(caminhos);
      return { removidos: (data ?? []).length, erro: erroDe(error) };
    },
  };
}
