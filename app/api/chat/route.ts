import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Wrapper que nunca joga exceção — retorna [] em caso de erro
async function safeQuery<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data } = await promise;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Não autenticado", { status: 401 });

    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, role")
      .eq("auth_user_id", user.id)
      .single();

    // ── Todas as queries em paralelo, cada uma isolada ─────────────────────────
    const [
      animals, weights, applications, properties,
      scores, certifications,
      reproSeasons, reproIA, reproStock,
      prodSnapshot, prodCalves, prodSales, prodMortality,
      supplyFinancials, supplyItems,
      auditSnapshot,
    ] = await Promise.all([
      safeQuery(supabase.from("animals").select("id, internal_code, nickname, sex, breed, birth_date, status").limit(100)),
      safeQuery(supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }).limit(300)),
      safeQuery(supabase.from("applications").select("animal_id, product_name, application_date, withdrawal_date").order("application_date", { ascending: false }).limit(200)),
      safeQuery(supabase.from("properties").select("id, name, state, status").limit(20)),
      safeQuery(supabase.from("agraas_master_passport_cache").select("animal_id, score_json").limit(100)),
      safeQuery(supabase.from("animal_certifications").select("animal_id, certification_name, status, expires_at").neq("status", "expired").limit(300)),
      safeQuery(supabase.from("reproductive_seasons").select("*").order("inicio", { ascending: false }).limit(5)),
      safeQuery(supabase.from("reproductive_ia_services").select("*").limit(20)),
      safeQuery(supabase.from("reproductive_stock_summary").select("*").limit(20)),
      safeQuery(supabase.from("production_stock_snapshot").select("*").limit(20)),
      safeQuery(supabase.from("production_calf_entries").select("*").order("mes", { ascending: false }).limit(12)),
      safeQuery(supabase.from("production_sales_history").select("*").order("data", { ascending: false }).limit(20)),
      safeQuery(supabase.from("production_mortality").select("*").limit(10)),
      safeQuery(supabase.from("supply_financials").select("*").limit(10)),
      safeQuery(supabase.from("supply_inventory_items").select("*").limit(50)),
      safeQuery(supabase.from("audit_snapshot").select("*").limit(5)),
    ]);

    // ── Processamento ──────────────────────────────────────────────────────────
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const weightByAnimal = new Map<string, { weight: number; date: string }>();
    for (const w of weights as any[]) {
      if (!weightByAnimal.has(w.animal_id))
        weightByAnimal.set(w.animal_id, { weight: Number(w.weight), date: w.weighing_date ?? "" });
    }

    const scoreByAnimal = new Map<string, number>();
    for (const s of scores as any[]) {
      const total = (s.score_json as Record<string, number> | null)?.total_score;
      if (total != null) scoreByAnimal.set(s.animal_id, Number(total));
    }

    const certsByAnimal = new Map<string, string[]>();
    for (const c of certifications as any[]) {
      const list = certsByAnimal.get(c.animal_id) ?? [];
      list.push(c.certification_name);
      certsByAnimal.set(c.animal_id, list);
    }

    const carenciasAtivas = (applications as any[]).filter((a: any) =>
      a.withdrawal_date && a.withdrawal_date > todayStr
    );
    const carenciasByAnimal = new Map<string, string>();
    for (const a of carenciasAtivas)
      carenciasByAnimal.set(a.animal_id, a.withdrawal_date ?? "");

    const totalAnimais = animals.length;
    const machos  = (animals as any[]).filter((a: any) => a.sex === "Male").length;
    const femeas  = (animals as any[]).filter((a: any) => a.sex === "Female").length;
    const pesoMedio = weightByAnimal.size > 0
      ? Math.round(Array.from(weightByAnimal.values()).reduce((s, w) => s + w.weight, 0) / weightByAnimal.size)
      : 0;
    const semPesagem30d = (animals as any[]).filter((a: any) => {
      const w = weightByAnimal.get(a.id);
      if (!w?.date) return true;
      return new Date(w.date) < new Date(today.getTime() - 30 * 86400000);
    }).length;
    const aptosExportacao = (animals as any[]).filter((a: any) => {
      const score = scoreByAnimal.get(a.id) ?? 0;
      return score >= 75 && !carenciasByAnimal.has(a.id) && (certsByAnimal.get(a.id)?.includes("Halal") ?? false);
    });
    let maiorScore = 0; let animalMaiorScore = "";
    for (const a of animals as any[]) {
      const s = scoreByAnimal.get(a.id) ?? 0;
      if (s > maiorScore) { maiorScore = s; animalMaiorScore = a.nickname ?? a.internal_code ?? a.id.slice(0, 8); }
    }

    const estacaoAtiva = (reproSeasons as any[])[0];
    const estoqueTotal   = (prodSnapshot   as any[]).reduce((s, r) => s + (r.quantidade   ?? r.balance ?? 0), 0);
    const totalDesmamados = (prodCalves    as any[]).reduce((s, r) => s + (r.total        ?? 0), 0);
    const totalObitos     = (prodMortality as any[]).reduce((s, r) => s + (r.obitos       ?? r.deaths ?? 0), 0);
    const receitaTotal    = (prodSales     as any[]).reduce((s, r) => s + (r.receita_total ?? 0), 0);
    const gpdDesmameMedio = (prodCalves as any[]).length > 0
      ? ((prodCalves as any[]).reduce((s, r) => s + (r.gmd_pos_desmame ?? 0), 0) / (prodCalves as any[]).length).toFixed(3)
      : "n/d";
    const totalInsumos = (supplyFinancials as any[]).reduce((s, r) => s + (r.valor ?? r.balance_value ?? 0), 0);
    const saldoInsumos = (supplyFinancials as any[]).find((r: any) =>
      typeof (r.categoria ?? r.period_label ?? "") === "string" &&
      (r.categoria ?? r.period_label ?? "").toLowerCase().includes("saldo")
    );

    // ── System prompt (limitado a 8000 chars) ─────────────────────────────────
    const animalLines = (animals as any[]).slice(0, 30).map((a: any) => {
      const w = weightByAnimal.get(a.id);
      const score = scoreByAnimal.get(a.id);
      const certs = certsByAnimal.get(a.id) ?? [];
      const carencia = carenciasByAnimal.get(a.id);
      const nome = a.nickname ?? a.internal_code ?? a.id.slice(0, 8);
      const sexo = a.sex === "Male" ? "M" : a.sex === "Female" ? "F" : "?";
      return `- ${nome}|${sexo}|${a.breed ?? "?"}|Peso:${w ? `${w.weight}kg` : "—"}|Score:${score ?? "—"}|Certs:${certs.join(",") || "—"}|Car.:${carencia ? carencia : "livre"}`;
    }).join("\n");

    const fullContext = [
      `Você é o assistente da Agraas. Fazenda: ${clientData?.name ?? user.email}. Hoje: ${today.toLocaleDateString("pt-BR")}. Responda em português, use só dados abaixo, nunca invente.`,
      `\n## REBANHO\nTotal: ${totalAnimais} (${machos}M/${femeas}F) | Peso médio: ${pesoMedio > 0 ? `${pesoMedio}kg` : "—"} | Sem pesagem 30d: ${semPesagem30d} | Carência ativa: ${carenciasAtivas.length} | Aptos exportação: ${aptosExportacao.length} | Maior score: ${animalMaiorScore || "—"} (${maiorScore || "—"})`,
      `\n${animalLines}`,
      estacaoAtiva
        ? `\n## REPRODUTIVO\nEstação: ${estacaoAtiva.name ?? estacaoAtiva.season_name ?? "atual"} | Prenhez: ${estacaoAtiva.taxa_prenhez ?? estacaoAtiva.pregnancy_rate ?? "n/d"}% | Concepção IA: ${estacaoAtiva.taxa_concepcao_ia ?? estacaoAtiva.avg_conception_rate ?? "n/d"}% | Aptas: ${estacaoAtiva.aptas ?? estacaoAtiva.apt_count ?? "n/d"} | Prenhas: ${estacaoAtiva.prenhas ?? "n/d"} | Vazias: ${estacaoAtiva.vazias ?? "n/d"}`
        : "\n## REPRODUTIVO\nSem dados.",
      (reproIA as any[]).length > 0
        ? (reproIA as any[]).map((r: any) => `IA ${r.service_number ?? r.touro_nome ?? "?"}: ${r.conception_rate ?? r.concepcao_pct ?? "n/d"}% concepção`).join(" | ")
        : "",
      estoqueTotal > 0
        ? `\n## PRODUÇÃO\nEstoque total: ${estoqueTotal} | Desmamados: ${totalDesmamados} | GPD desmame: ${gpdDesmameMedio}kg/dia | Óbitos: ${totalObitos} | Receita vendas: R$${receitaTotal.toLocaleString("pt-BR")}`
        : "\n## PRODUÇÃO\nSem dados.",
      totalInsumos > 0 || (supplyFinancials as any[]).length > 0
        ? `\n## INSUMOS\n${(supplyFinancials as any[]).map((r: any) => `${r.categoria ?? r.period_label ?? "item"}: R$${Number(r.valor ?? r.balance_value ?? 0).toLocaleString("pt-BR")}`).join(" | ")} | Total: R$${totalInsumos.toLocaleString("pt-BR")}`
        : "\n## INSUMOS\nSem dados.",
      (supplyItems as any[]).length > 0
        ? (supplyItems as any[]).slice(0, 15).map((r: any) => `${r.product_name ?? r.produto ?? "?"} (${r.category ?? r.categoria ?? "?"}): ${r.head_count ?? r.estoque ?? 0} ${r.unit ?? r.unidade ?? "un"}`).join(" | ")
        : "",
      (auditSnapshot as any[]).length > 0
        ? `\n## AUDITORIA\n${Object.entries((auditSnapshot as any[])[0]).filter(([k]) => !["id","client_id","created_at"].includes(k)).map(([k,v]) => `${k}:${v}`).join(" | ")}`
        : "\n## AUDITORIA\nSem dados.",
    ].join("\n");

    // Trunca se passar de 8000 chars
    const context = fullContext.length > 8000 ? fullContext.slice(0, 8000) + "\n[contexto truncado]" : fullContext;

    const msgs: Anthropic.MessageParam[] = [
      ...(history ?? []),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: context,
      messages: msgs,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return Response.json({ reply: text });

  } catch (err) {
    console.error("[agroassistant]", err);
    return Response.json({ reply: "Erro interno ao consultar os dados da fazenda. Tente novamente." }, { status: 500 });
  }
}
