import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: clientData } = await supabase
    .from("clients")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single();

  const clientId = clientData?.id;

  // ── Todas as queries em paralelo ───────────────────────────────────────────
  const [
    { data: animals },
    { data: weights },
    { data: applications },
    { data: properties },
    { data: scores },
    { data: certifications },
    { data: reproSeasons },
    { data: reproIA },
    { data: reproStock },
    { data: prodSnapshot },
    { data: prodCalves },
    { data: prodSales },
    { data: prodMortality },
    { data: supplyFinancials },
    { data: supplyItems },
    { data: auditSnapshot },
  ] = await Promise.all([
    supabase.from("animals")
      .select("id, internal_code, nickname, sex, breed, birth_date, status")
      .limit(100),
    supabase.from("weights")
      .select("animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false })
      .limit(300),
    supabase.from("applications")
      .select("animal_id, product_name, application_date, withdrawal_date")
      .order("application_date", { ascending: false })
      .limit(200),
    supabase.from("properties").select("id, name, state, status").limit(20),
    supabase.from("agraas_master_passport_cache")
      .select("animal_id, score_json")
      .limit(100),
    supabase.from("animal_certifications")
      .select("animal_id, certification_name, status, expires_at")
      .neq("status", "expired")
      .limit(300),
    supabase.from("reproductive_seasons")
      .select("*")
      .order("inicio", { ascending: false })
      .limit(5),
    supabase.from("reproductive_ia_services")
      .select("*")
      .limit(20),
    supabase.from("reproductive_stock_summary")
      .select("*")
      .limit(20),
    supabase.from("production_stock_snapshot")
      .select("*")
      .limit(20),
    supabase.from("production_calf_entries")
      .select("*")
      .order("mes", { ascending: false })
      .limit(12),
    supabase.from("production_sales_history")
      .select("*")
      .order("data", { ascending: false })
      .limit(20),
    supabase.from("production_mortality")
      .select("*")
      .limit(10),
    supabase.from("supply_financials")
      .select("*")
      .limit(10),
    supabase.from("supply_inventory_items")
      .select("*")
      .limit(50),
    supabase.from("audit_snapshot")
      .select("*")
      .limit(5),
  ]);

  // ── Processamento ──────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Pesagens: última por animal
  const weightByAnimal = new Map<string, { weight: number; date: string }>();
  for (const w of (weights ?? [])) {
    if (!weightByAnimal.has(w.animal_id)) {
      weightByAnimal.set(w.animal_id, { weight: Number(w.weight), date: w.weighing_date ?? "" });
    }
  }

  // Scores
  const scoreByAnimal = new Map<string, number>();
  for (const s of (scores ?? [])) {
    const total = (s.score_json as Record<string, number> | null)?.total_score;
    if (total != null) scoreByAnimal.set(s.animal_id, Number(total));
  }

  // Certificações por animal
  const certsByAnimal = new Map<string, string[]>();
  for (const c of (certifications ?? [])) {
    const list = certsByAnimal.get(c.animal_id) ?? [];
    list.push(c.certification_name);
    certsByAnimal.set(c.animal_id, list);
  }

  // Carências ativas
  const carenciasAtivas = (applications ?? []).filter(a =>
    a.withdrawal_date && a.withdrawal_date > todayStr
  );
  const carenciasByAnimal = new Map<string, string>();
  for (const a of carenciasAtivas) {
    carenciasByAnimal.set(a.animal_id, a.withdrawal_date ?? "");
  }

  // KPIs rebanho
  const totalAnimais = animals?.length ?? 0;
  const machos = (animals ?? []).filter(a => a.sex === "Male").length;
  const femeas = (animals ?? []).filter(a => a.sex === "Female").length;
  const pesoMedio = weightByAnimal.size > 0
    ? Math.round(Array.from(weightByAnimal.values()).reduce((s, w) => s + w.weight, 0) / weightByAnimal.size)
    : 0;

  const semPesagem30d = (animals ?? []).filter(a => {
    const w = weightByAnimal.get(a.id);
    if (!w?.date) return true;
    return new Date(w.date) < new Date(today.getTime() - 30 * 86400000);
  }).length;

  // Animais aptos para exportação (score >= 75, sem carência, com Halal)
  const aptosExportacao = (animals ?? []).filter(a => {
    const score = scoreByAnimal.get(a.id) ?? 0;
    const semCarencia = !carenciasByAnimal.has(a.id);
    const temHalal = certsByAnimal.get(a.id)?.includes("Halal") ?? false;
    return score >= 75 && semCarencia && temHalal;
  });

  // Maior score
  let maiorScore = 0;
  let animalMaiorScore = "";
  for (const a of (animals ?? [])) {
    const s = scoreByAnimal.get(a.id) ?? 0;
    if (s > maiorScore) {
      maiorScore = s;
      animalMaiorScore = a.nickname ?? a.internal_code ?? a.id.slice(0, 8);
    }
  }

  // Resumo reprodutivo
  const estacaoAtiva = (reproSeasons ?? [])[0];

  // Produção: estoque total
  const estoqueTotal = (prodSnapshot ?? []).reduce((s, r: any) => s + (r.quantidade ?? 0), 0);

  // Insumos: totais financeiros
  const totalInsumos = (supplyFinancials ?? []).reduce((s, r: any) => s + (r.valor ?? 0), 0);
  const saldoInsumos = (supplyFinancials ?? []).find((r: any) =>
    typeof r.categoria === "string" && r.categoria.toLowerCase().includes("saldo")
  );

  // Desmame acumulado (todos os meses)
  const totalDesmamados = (prodCalves ?? []).reduce((s, r: any) => s + (r.total ?? 0), 0);
  const gpdDesmameMedio = (prodCalves ?? []).length > 0
    ? ((prodCalves ?? []).reduce((s: number, r: any) => s + (r.gmd_pos_desmame ?? 0), 0) / (prodCalves ?? []).length).toFixed(3)
    : "n/d";

  // Mortalidade total
  const totalObitos = (prodMortality ?? []).reduce((s: number, r: any) => s + (r.obitos ?? 0), 0);

  // Vendas: receita total
  const receitaTotal = (prodSales ?? []).reduce((s: number, r: any) => s + (r.receita_total ?? 0), 0);

  // ── System prompt ──────────────────────────────────────────────────────────
  const context = `
Você é o assistente inteligente da plataforma Agraas — sistema de rastreabilidade pecuária.
Você tem acesso aos dados reais da fazenda ${clientData?.name ?? user.email}.
Data de hoje: ${today.toLocaleDateString("pt-BR")}.
Responda sempre em português, de forma direta e objetiva. Use os dados abaixo para responder.
Quando uma informação não estiver disponível, diga claramente. Nunca invente dados.

═══════════════════════════════════════════════════════
REBANHO — RESUMO GERAL
═══════════════════════════════════════════════════════
Total de animais: ${totalAnimais} (${machos} machos, ${femeas} fêmeas)
Propriedades: ${(properties ?? []).map((p: any) => `${p.name} (${p.state})`).join(", ") || "nenhuma"}
Peso médio do rebanho: ${pesoMedio > 0 ? `${pesoMedio} kg` : "sem dados"}
Animais sem pesagem há +30 dias: ${semPesagem30d}
Animais com carência ativa: ${carenciasAtivas.length}
Animais aptos para exportação (score ≥75 + Halal + sem carência): ${aptosExportacao.length}
Animal com maior Agraas Score: ${animalMaiorScore || "n/d"} (${maiorScore > 0 ? maiorScore : "sem score"})

LISTA DE ANIMAIS (score, peso, certificações):
${(animals ?? []).map(a => {
  const w = weightByAnimal.get(a.id);
  const score = scoreByAnimal.get(a.id);
  const certs = certsByAnimal.get(a.id) ?? [];
  const carencia = carenciasByAnimal.get(a.id);
  const nome = a.nickname ?? a.internal_code ?? a.id.slice(0, 8);
  const sexo = a.sex === "Male" ? "M" : a.sex === "Female" ? "F" : "?";
  const idadeMeses = a.birth_date
    ? Math.floor((today.getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  return `- ${nome} | ${sexo} | ${a.breed ?? "raça n/d"} | ${idadeMeses != null ? `${idadeMeses}m` : "idade n/d"} | Peso: ${w ? `${w.weight}kg` : "s/pesagem"} | Score: ${score ?? "n/d"} | Certs: ${certs.length > 0 ? certs.join(", ") : "nenhuma"} | Carência: ${carencia ? `até ${carencia}` : "livre"}`;
}).join("\n")}

═══════════════════════════════════════════════════════
REPRODUTIVO
═══════════════════════════════════════════════════════
${estacaoAtiva ? `Estação de monta: ${estacaoAtiva.name ?? "atual"} (${estacaoAtiva.inicio ?? "?"} → ${estacaoAtiva.fim ?? "?"})
Taxa de prenhez: ${estacaoAtiva.taxa_prenhez != null ? `${estacaoAtiva.taxa_prenhez}%` : "n/d"}
Taxa de concepção IA: ${estacaoAtiva.taxa_concepcao_ia != null ? `${estacaoAtiva.taxa_concepcao_ia}%` : "n/d"}
Vacas elegíveis: ${estacaoAtiva.vacas_elegiveis ?? "n/d"} | APTAS: ${estacaoAtiva.aptas ?? "n/d"} | Prenhas: ${estacaoAtiva.prenhas ?? "n/d"} | Vazias: ${estacaoAtiva.vazias ?? "n/d"}` : "Sem estação reprodutiva registrada."}

Serviços de IA:
${(reproIA ?? []).map((r: any) => `- ${r.touro_nome ?? "touro n/d"} (${r.raca ?? "raça n/d"}) | Sêmen: ${r.semen_tipo ?? "n/d"} | Serviços: ${r.servicos ?? 0} | Concepção: ${r.concepcao_pct ?? "n/d"}%`).join("\n") || "Sem registros."}

Estoque de reprodutores:
${(reproStock ?? []).map((r: any) => `- ${r.categoria ?? "categoria n/d"}: ${r.quantidade ?? 0} (${r.observacao ?? ""})`).join("\n") || "Sem registros."}

═══════════════════════════════════════════════════════
PRODUÇÃO
═══════════════════════════════════════════════════════
Estoque total em pasto: ${estoqueTotal} animais
Detalhamento por categoria:
${(prodSnapshot ?? []).map((r: any) => `- ${r.categoria ?? "n/d"}: ${r.quantidade ?? 0} animais | Peso médio: ${r.peso_medio_kg ?? "n/d"} kg | GMD: ${r.gmd_kg ?? "n/d"} kg/dia`).join("\n") || "Sem dados."}

Distribuição por peso:
${(() => {
  const dist = ([] as any[]);
  // prodWeightDist not fetched separately — infer from snapshot if needed
  return "Ver distribuição detalhada na página de Produção.";
})()}

Desmame (histórico mensal):
${(prodCalves ?? []).map((r: any) => `- ${r.mes ?? "?"}: ${r.total ?? 0} bezerros (${r.machos ?? 0}M / ${r.femeas ?? 0}F) | GPD pós-desmame: ${r.gmd_pos_desmame ?? "n/d"} kg/dia`).join("\n") || "Sem registros."}
Total desmamados (histórico): ${totalDesmamados}
GPD médio pós-desmame: ${gpdDesmameMedio} kg/dia

Mortalidade:
${(prodMortality ?? []).map((r: any) => `- ${r.faixa_etaria ?? "n/d"}: ${r.obitos ?? 0} óbitos (${r.pct_rebanho ?? "n/d"}% do rebanho) | Causa: ${r.causa_principal ?? "n/d"}`).join("\n") || "Sem registros."}
Total de óbitos: ${totalObitos}

Vendas (histórico):
${(prodSales ?? []).map((r: any) => `- ${r.data ?? "?"}: ${r.quantidade ?? 0} ${r.categoria ?? "animais"} | Peso médio: ${r.peso_medio ?? "n/d"} kg | R$/${r.preco_arroba != null ? `${r.preco_arroba}/@` : "n/d"} | Receita: R$ ${r.receita_total != null ? Number(r.receita_total).toLocaleString("pt-BR") : "n/d"}`).join("\n") || "Sem registros."}
Receita total histórica: R$ ${receitaTotal.toLocaleString("pt-BR")}

═══════════════════════════════════════════════════════
INSUMOS
═══════════════════════════════════════════════════════
Posição financeira:
${(supplyFinancials ?? []).map((r: any) => `- ${r.categoria ?? "n/d"}: R$ ${r.valor != null ? Number(r.valor).toLocaleString("pt-BR") : "n/d"}`).join("\n") || "Sem dados."}
${saldoInsumos ? `Saldo disponível: R$ ${Number((saldoInsumos as any).valor).toLocaleString("pt-BR")}` : `Total de insumos: R$ ${totalInsumos.toLocaleString("pt-BR")}`}

Estoque de produtos:
${(supplyItems ?? []).map((r: any) => `- ${r.produto ?? "n/d"} (${r.categoria ?? "n/d"}): ${r.estoque ?? 0} ${r.unidade ?? "un"} | Dose média: ${r.dose_media ?? "n/d"} | Custo unitário: R$ ${r.custo_unitario ?? "n/d"}`).join("\n") || "Sem itens."}

═══════════════════════════════════════════════════════
AUDITORIA
═══════════════════════════════════════════════════════
${(auditSnapshot ?? []).length > 0 ? (auditSnapshot ?? []).map((r: any) => {
  const entries = Object.entries(r)
    .filter(([k]) => !["id", "client_id", "created_at"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
  return entries;
}).join("\n") : "Sem dados de auditoria."}
`.trim();

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
}
