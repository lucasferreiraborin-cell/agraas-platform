import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { calculateAgraasScore, calculateAgeInMonths, calculateDailyGain } from "@/lib/agraas-analytics";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { animalId } = await req.json();
  if (!animalId) return new Response("animalId obrigatório", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  // Coleta dados do animal
  const [
    { data: animal },
    { data: weights },
    { data: applications },
    { data: events },
    { data: cotacaoData },
  ] = await Promise.all([
    supabase.from("animals")
      .select("id, internal_code, nickname, sex, breed, birth_date, blood_type, sire_animal_id, dam_animal_id, status")
      .eq("id", animalId).single(),
    supabase.from("weights")
      .select("weight, weighing_date")
      .eq("animal_id", animalId)
      .order("weighing_date", { ascending: false })
      .limit(5),
    supabase.from("applications")
      .select("product_name, application_date, withdrawal_date")
      .eq("animal_id", animalId)
      .order("application_date", { ascending: false })
      .limit(5),
    supabase.from("events")
      .select("event_type, event_date, notes")
      .eq("animal_id", animalId)
      .order("event_date", { ascending: false })
      .limit(10),
    supabase.from("platform_settings").select("value").eq("key", "cotacao_arroba").single(),
  ]);

  if (!animal) return new Response("Animal não encontrado", { status: 404 });

  const cotacao = parseFloat(cotacaoData?.value ?? "330");
  const KG_POR_ARROBA = 15;
  const lastWeight = weights?.[0] ? Number(weights[0].weight) : null;
  const prevWeight = weights?.[1] ? Number(weights[1].weight) : null;
  const gmd = calculateDailyGain(lastWeight, prevWeight, weights?.[0]?.weighing_date, weights?.[1]?.weighing_date);
  const ageMonths = calculateAgeInMonths(animal.birth_date);
  const arrobas = lastWeight ? lastWeight / KG_POR_ARROBA : null;
  const valorEstimado = arrobas ? arrobas * cotacao : null;

  const appCount = applications?.length ?? 0;
  const evtCount = events?.length ?? 0;
  const recentWeighings = (weights ?? []).filter(w => {
    if (!w.weighing_date) return false;
    return (Date.now() - new Date(w.weighing_date).getTime()) < 90 * 24 * 60 * 60 * 1000;
  }).length;
  const sanitaryScore = Math.min(100, 50 + appCount * 5);
  const operationalScore = Math.min(100, 40 + evtCount * 3);
  const continuityScore = Math.min(100, 40 + recentWeighings * 15);

  const score = calculateAgraasScore({
    lastWeight,
    ageMonths,
    sanitaryScore,
    operationalScore,
    continuityScore,
    hasBloodType: Boolean(animal.blood_type),
    hasGenealogy: Boolean(animal.sire_animal_id || animal.dam_animal_id),
  });

  const hoje = new Date().toLocaleDateString("pt-BR");
  const carenciasAtivas = (applications ?? []).filter(a =>
    a.withdrawal_date && new Date(a.withdrawal_date) > new Date()
  );

  const contexto = `
Você é um consultor agropecuário especializado em bovinocultura de corte brasileira.
Analise os dados do animal abaixo e retorne uma recomendação de manejo estruturada.

DADOS DO ANIMAL (${hoje}):
- Identificação: ${animal.nickname ?? animal.internal_code ?? animalId.slice(0, 8)}
- Sexo: ${animal.sex === "Male" ? "Macho" : animal.sex === "Female" ? "Fêmea" : "N/D"}
- Raça: ${animal.breed ?? "N/D"}
- Idade: ${ageMonths !== null ? `${ageMonths} meses` : "N/D"}
- Peso atual: ${lastWeight ? `${lastWeight} kg` : "sem pesagem"}
- Arrobas: ${arrobas ? `${arrobas.toFixed(1)} @` : "N/D"}
- GMD recente: ${gmd !== null ? `${gmd.toFixed(3)} kg/dia` : "N/D"}
- Valor estimado: ${valorEstimado ? `R$ ${Math.round(valorEstimado).toLocaleString("pt-BR")}` : "N/D"}
- Cotação atual: R$ ${cotacao.toFixed(2)}/@
- Score Agraas: ${score}/100
- Carências sanitárias ativas: ${carenciasAtivas.length}
- Aplicações registradas: ${appCount}
- Histórico de pesagens: ${(weights ?? []).map(w => `${w.weighing_date?.slice(0, 10)}: ${w.weight}kg`).join(", ") || "nenhuma"}
- Eventos recentes: ${(events ?? []).slice(0, 5).map(e => `${e.event_type} (${e.event_date?.slice(0, 10)})`).join(", ") || "nenhum"}
`.trim();

  // Tool use para garantir resposta estruturada
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: contexto,
    messages: [{ role: "user", content: "Analise este animal e retorne sua recomendação de manejo." }],
    tools: [{
      name: "recomendacao_manejo",
      description: "Retorna recomendação estruturada de manejo do animal",
      input_schema: {
        type: "object" as const,
        properties: {
          recomendacao: {
            type: "string",
            enum: ["Vender agora", "Aguardar", "Melhorar sanitário"],
            description: "Decisão principal de manejo",
          },
          prazo_dias: {
            type: ["number", "null"],
            description: "Prazo estimado em dias caso seja Aguardar, null caso contrário",
          },
          justificativa: {
            type: "string",
            description: "Explicação direta em 2-3 frases baseada nos dados reais do animal",
          },
          risco: {
            type: "string",
            enum: ["baixo", "médio", "alto"],
            description: "Nível de risco operacional atual",
          },
          ponto_forte: {
            type: "string",
            description: "Principal ponto positivo do animal em 1 frase",
          },
          ponto_atencao: {
            type: "string",
            description: "Principal ponto de atenção em 1 frase",
          },
        },
        required: ["recomendacao", "prazo_dias", "justificativa", "risco", "ponto_forte", "ponto_atencao"],
      },
    }],
    tool_choice: { type: "any" },
  });

  const toolUse = response.content.find(c => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return Response.json({ error: "Análise indisponível" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    analise: toolUse.input,
    meta: { score, lastWeight, arrobas, valorEstimado, cotacao, gmd },
  });
}
