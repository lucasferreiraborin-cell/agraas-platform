import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  // Busca dados reais da fazenda do usuário logado
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: clientData } = await supabase
    .from("clients")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single();

  const clientId = clientData?.id;

  // Coleta dados do rebanho
  const [
    { data: animals },
    { data: weights },
    { data: applications },
    { data: properties },
    { data: events },
  ] = await Promise.all([
    supabase.from("animals")
      .select("id, internal_code, nickname, sex, breed, birth_date, status, blood_type, sire_animal_id, dam_animal_id")
      .limit(50),
    supabase.from("weights")
      .select("animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false })
      .limit(200),
    supabase.from("applications")
      .select("animal_id, application_date, withdrawal_date")
      .order("application_date", { ascending: false })
      .limit(100),
    supabase.from("properties").select("id, name, state, status").limit(20),
    supabase.from("events").select("animal_id, event_type, event_date").order("event_date", { ascending: false }).limit(100),
  ]);

  // Processa dados para o contexto
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weightByAnimal = new Map<string, { weight: number; date: string | null }>();
  for (const w of (weights ?? [])) {
    if (!weightByAnimal.has(w.animal_id)) {
      weightByAnimal.set(w.animal_id, { weight: Number(w.weight), date: w.weighing_date });
    }
  }

  const appByAnimal = new Map<string, number>();
  for (const a of (applications ?? [])) {
    appByAnimal.set(a.animal_id, (appByAnimal.get(a.animal_id) ?? 0) + 1);
  }

  const totalAnimais = animals?.length ?? 0;
  const animaisSemPesagem = (animals ?? []).filter(a => {
    const w = weightByAnimal.get(a.id);
    if (!w?.date) return true;
    return new Date(w.date) < thirtyDaysAgo;
  });

  const totalPeso = Array.from(weightByAnimal.values()).reduce((s, w) => s + w.weight, 0);
  const pesoMedio = weightByAnimal.size > 0 ? Math.round(totalPeso / weightByAnimal.size) : 0;

  const carenciasAtivas = (applications ?? []).filter(a => {
    if (!a.withdrawal_date) return false;
    return new Date(a.withdrawal_date) > today;
  });

  const context = `
Você é o assistente inteligente da plataforma Agraas — sistema de rastreabilidade pecuária.
Você tem acesso aos dados reais da fazenda do usuário ${clientData?.name ?? user.email}.

DADOS ATUAIS DA OPERAÇÃO (${new Date().toLocaleDateString("pt-BR")}):
- Total de animais: ${totalAnimais}
- Propriedades: ${(properties ?? []).map(p => `${p.name} (${p.state})`).join(", ") || "nenhuma"}
- Peso médio do rebanho: ${pesoMedio > 0 ? `${pesoMedio} kg` : "sem dados de pesagem"}
- Animais sem pesagem há +30 dias: ${animaisSemPesagem.length}
- Animais com carência sanitária ativa: ${carenciasAtivas.length}
- Animais com genealogia mapeada: ${(animals ?? []).filter(a => a.sire_animal_id || a.dam_animal_id).length}
- Animais com tipo sanguíneo: ${(animals ?? []).filter(a => a.blood_type).length}

LISTA DE ANIMAIS (primeiros 20):
${(animals ?? []).slice(0, 20).map(a => {
  const w = weightByAnimal.get(a.id);
  const apps = appByAnimal.get(a.id) ?? 0;
  return `- ${a.nickname ?? a.internal_code ?? a.id.slice(0,8)} | ${a.sex === "Male" ? "Macho" : a.sex === "Female" ? "Fêmea" : "?"} | ${a.breed ?? "raça n/d"} | Peso: ${w ? `${w.weight}kg` : "sem pesagem"} | Aplicações: ${apps}`;
}).join("\n")}

Responda em português, de forma direta e objetiva. Use os dados reais acima para responder perguntas sobre o rebanho.
Quando não souber uma informação, diga claramente. Não invente dados.
`.trim();

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: context,
    messages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  return Response.json({ reply: text });
}
